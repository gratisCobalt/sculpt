/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../../lib/db'

// Exercise API Routes for Cloudflare Pages Functions
// Handles: GET /api/exercises, GET /api/exercises/:id, GET /api/exercises/search

interface RequestContext {
  request: Request
  env: Env
  url: URL
  params: Record<string, string>
}

// GET /api/exercises - List exercises with filters
async function handleListExercises(ctx: RequestContext): Promise<Response> {
  const { env, url } = ctx

  try {
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    const bodyPart = url.searchParams.get('bodyPart')
    const equipment = url.searchParams.get('equipment')
    const exerciseType = url.searchParams.get('type')
    const search = url.searchParams.get('search')

    let query = `
      SELECT e.id, e.external_id, e.name, e.name_de, e.image_url, e.video_url, MIN(bp.code) as body_part, MIN(bp.name_de) as body_part_name
      FROM exercise e
      LEFT JOIN exercise_body_part ebp ON e.id = ebp.exercise_id
      LEFT JOIN body_part bp ON ebp.body_part_id = bp.id
      LEFT JOIN exercise_equipment ee ON e.id = ee.exercise_id
      LEFT JOIN equipment eq ON ee.equipment_id = eq.id
      LEFT JOIN exercise_type et ON e.exercise_type_id = et.id
      WHERE 1=1
    `
    const params: unknown[] = []
    let paramIndex = 1

    if (bodyPart && bodyPart !== 'all') {
      query += ` AND LOWER(bp.code) = LOWER(?${paramIndex})`
      params.push(bodyPart)
      paramIndex++
    }

    if (equipment && equipment !== 'all') {
      query += ` AND LOWER(eq.code) = LOWER(?${paramIndex})`
      params.push(equipment)
      paramIndex++
    }

    if (exerciseType && exerciseType !== 'all') {
      query += ` AND LOWER(et.code) = LOWER(?${paramIndex})`
      params.push(exerciseType)
      paramIndex++
    }

    if (search) {
      query += ` AND (LOWER(e.name) LIKE LOWER(?${paramIndex}) OR LOWER(e.name_de) LIKE LOWER(?${paramIndex + 1}))`
      params.push(`%${search}%`, `%${search}%`)
      paramIndex += 2
    }

    query += ` GROUP BY e.id ORDER BY e.name LIMIT ?${paramIndex} OFFSET ?${paramIndex + 1}`
    params.push(limit, offset)

    // Build the query with positional parameters for D1
    const finalQuery = query.replace(/\?\d+/g, '?')
    const result = await env.database.prepare(finalQuery).bind(...params).all()

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT e.id) as count
      FROM exercise e
      LEFT JOIN exercise_body_part ebp ON e.id = ebp.exercise_id
      LEFT JOIN body_part bp ON ebp.body_part_id = bp.id
      LEFT JOIN exercise_equipment ee ON e.id = ee.exercise_id
      LEFT JOIN equipment eq ON ee.equipment_id = eq.id
      LEFT JOIN exercise_type et ON e.exercise_type_id = et.id
      WHERE 1=1
    `
    const countParams = params.slice(0, -2) // Remove limit and offset

    if (bodyPart && bodyPart !== 'all') {
      countQuery += ' AND LOWER(bp.code) = LOWER(?)'
    }
    if (equipment && equipment !== 'all') {
      countQuery += ' AND LOWER(eq.code) = LOWER(?)'
    }
    if (exerciseType && exerciseType !== 'all') {
      countQuery += ' AND LOWER(et.code) = LOWER(?)'
    }
    if (search) {
      countQuery += ' AND (LOWER(e.name) LIKE LOWER(?) OR LOWER(e.name_de) LIKE LOWER(?))'
    }

    const countResult = await env.database.prepare(countQuery).bind(...countParams).first<{ count: number }>()

    return jsonResponse({
      exercises: result.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('List exercises error:', error)
    return errorResponse('Failed to list exercises', 500)
  }
}

// GET /api/exercises/:id - Get exercise details
async function handleGetExercise(ctx: RequestContext): Promise<Response> {
  const { env, url } = ctx
  
  // Extract ID from path
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]
  
  if (!id || isNaN(parseInt(id))) {
    return errorResponse('Invalid exercise ID', 400)
  }

  try {
    const exerciseId = parseInt(id)
    
    // Get main exercise data
    const exercise = await env.database.prepare(`
      SELECT e.*, et.code as exercise_type_code, et.name_de as exercise_type_name_de
      FROM exercise e
      LEFT JOIN exercise_type et ON e.exercise_type_id = et.id
      WHERE e.id = ?
    `).bind(exerciseId).first()

    if (!exercise) {
      return errorResponse('Exercise not found', 404)
    }

    // Get body parts
    const bodyParts = await env.database.prepare(`
      SELECT bp.* FROM body_part bp
      JOIN exercise_body_part ebp ON bp.id = ebp.body_part_id
      WHERE ebp.exercise_id = ?
    `).bind(exerciseId).all()

    // Get equipment
    const equipment = await env.database.prepare(`
      SELECT eq.* FROM equipment eq
      JOIN exercise_equipment ee ON eq.id = ee.equipment_id
      WHERE ee.exercise_id = ?
    `).bind(exerciseId).all()

    // Get target muscles
    const targetMuscles = await env.database.prepare(`
      SELECT m.* FROM muscle m
      JOIN exercise_target_muscle etm ON m.id = etm.muscle_id
      WHERE etm.exercise_id = ?
    `).bind(exerciseId).all()

    // Get secondary muscles
    const secondaryMuscles = await env.database.prepare(`
      SELECT m.* FROM muscle m
      JOIN exercise_secondary_muscle esm ON m.id = esm.muscle_id
      WHERE esm.exercise_id = ?
    `).bind(exerciseId).all()

    // Get instructions
    const instructions = await env.database.prepare(`
      SELECT * FROM exercise_instruction
      WHERE exercise_id = ?
      ORDER BY step_number
    `).bind(exerciseId).all()

    // Get tips
    const tips = await env.database.prepare(`
      SELECT * FROM exercise_tip
      WHERE exercise_id = ?
      ORDER BY tip_number
    `).bind(exerciseId).all()

    // Get radar chart attributes
    const attributes = await env.database.prepare(`
      SELECT eat.*, eav.value
      FROM exercise_attribute_value eav
      JOIN exercise_attribute_type eat ON eav.attribute_type_id = eat.id
      WHERE eav.exercise_id = ?
    `).bind(exerciseId).all()

    return jsonResponse({
      ...exercise,
      body_parts: bodyParts.results || [],
      equipments: equipment.results || [],
      target_muscles: targetMuscles.results || [],
      secondary_muscles: secondaryMuscles.results || [],
      instructions: instructions.results || [],
      tips: tips.results || [],
      attributes: (attributes.results || []).map((a: Record<string, unknown>) => ({
        type: { code: a.code, name_de: a.name_de },
        value: a.value,
      })),
    })
  } catch (error) {
    console.error('Get exercise error:', error)
    return errorResponse('Failed to get exercise', 500)
  }
}

// GET /api/body-parts - List all body parts
async function handleListBodyParts(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(
      'SELECT * FROM body_part ORDER BY name_en'
    ).all()
    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('List body parts error:', error)
    return errorResponse('Failed to list body parts', 500)
  }
}

// GET /api/equipment - List all equipment
async function handleListEquipment(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(
      'SELECT * FROM equipment ORDER BY name_en'
    ).all()
    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('List equipment error:', error)
    return errorResponse('Failed to list equipment', 500)
  }
}

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url, params: params as Record<string, string> }

  // Route matching
  if (request.method === 'GET') {
    if (path === '/api/exercises') {
      return handleListExercises(ctx)
    }

    if (path === '/api/body-parts') {
      return handleListBodyParts(ctx)
    }

    if (path === '/api/equipment') {
      return handleListEquipment(ctx)
    }

    // Match /api/exercises/:id
    const exerciseMatch = path.match(/^\/api\/exercises\/(\d+)$/)
    if (exerciseMatch) {
      return handleGetExercise(ctx)
    }
  }

  return errorResponse('Not found', 404)
}
