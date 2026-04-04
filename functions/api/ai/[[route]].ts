/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import type { AIMessage } from '../../lib/ai/types'
import { jsonResponse, errorResponse, corsResponse, generateUUID, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'
import { getProvider } from '../../lib/ai/provider'
import { encrypt, decrypt } from '../../lib/ai/encryption'

// AI API Routes
// Handles: POST /api/ai/chat, GET /api/ai/conversations,
//          GET /api/ai/conversations/:id, DELETE /api/ai/conversations/:id,
//          POST /api/ai/generate-plan

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

const SYSTEM_PROMPT = 'Du bist ein erfahrener Fitness-Coach in der Sculpt App. Du hilfst Nutzern mit Trainingstipps, Ernährungsberatung und Motivation. Antworte auf Deutsch, freundlich und motivierend. Halte Antworten kompakt und praxisnah. Wenn du dir bei medizinischen Fragen unsicher bist, empfehle den Besuch eines Arztes.'

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_SECONDS = 60
const MAX_MESSAGE_LENGTH = 2000
const MAX_CONVERSATIONS = 50
const MAX_HISTORY_MESSAGES = 100

// POST /api/ai/chat - Streaming AI chat
async function handleChat(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as {
      messages?: AIMessage[]
      conversationId?: string
    }

    // Validate exactly 1 user message
    const messages = body.messages
    if (!messages || !Array.isArray(messages) || messages.length !== 1) {
      return errorResponse('Exactly 1 message is required', 400)
    }

    const userMessage = messages[0]
    if (userMessage.role !== 'user' || !userMessage.content) {
      return errorResponse('Message must have role "user" and non-empty content', 400)
    }

    if (userMessage.content.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`, 400)
    }

    // Rate limiting: check recent messages from this user
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()
    const recentCount = await env.database.prepare(
      `SELECT COUNT(*) as count FROM ai_message
       WHERE conversation_id IN (SELECT id FROM ai_conversation WHERE user_id = ?)
       AND role = 'user' AND created_at > ?`
    ).bind(userId, windowStart).first<{ count: number }>()

    if (recentCount && recentCount.count >= RATE_LIMIT_MAX) {
      return errorResponse('Rate limit exceeded. Please wait a moment before sending another message.', 429)
    }

    const now = nowISO()
    let conversationId = body.conversationId

    // Get or create conversation
    if (conversationId) {
      const conv = await env.database.prepare(
        'SELECT id FROM ai_conversation WHERE id = ? AND user_id = ?'
      ).bind(conversationId, userId).first()

      if (!conv) {
        return errorResponse('Conversation not found', 404)
      }
    } else {
      conversationId = generateUUID()
      const title = userMessage.content.substring(0, 100)

      await env.database.prepare(
        `INSERT INTO ai_conversation (id, user_id, title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(conversationId, userId, title, now, now).run()

      // Enforce max conversations per user
      const convCount = await env.database.prepare(
        'SELECT COUNT(*) as count FROM ai_conversation WHERE user_id = ?'
      ).bind(userId).first<{ count: number }>()

      if (convCount && convCount.count > MAX_CONVERSATIONS) {
        const excess = convCount.count - MAX_CONVERSATIONS
        await env.database.prepare(
          `DELETE FROM ai_conversation WHERE id IN (
            SELECT id FROM ai_conversation WHERE user_id = ?
            ORDER BY updated_at ASC LIMIT ?
          )`
        ).bind(userId, excess).run()
      }
    }

    // Load conversation history (last 100 messages)
    const historyResult = await env.database.prepare(
      `SELECT role, content_encrypted, iv FROM (
        SELECT role, content_encrypted, iv, created_at
        FROM ai_message WHERE conversation_id = ?
        ORDER BY created_at DESC LIMIT ?
      ) sub ORDER BY created_at ASC`
    ).bind(conversationId, MAX_HISTORY_MESSAGES).all()

    const history: AIMessage[] = []
    for (const row of (historyResult.results || []) as Record<string, unknown>[]) {
      const content = await decrypt(
        row.content_encrypted as string,
        row.iv as string,
        env.AI_CHAT_ENCRYPTION_KEY
      )
      history.push({ role: row.role as AIMessage['role'], content })
    }

    // Persist user message (encrypted)
    const userMsgId = generateUUID()
    const userEncrypted = await encrypt(userMessage.content, env.AI_CHAT_ENCRYPTION_KEY)

    await env.database.prepare(
      `INSERT INTO ai_message (id, conversation_id, role, content_encrypted, iv, created_at)
       VALUES (?, ?, 'user', ?, ?, ?)`
    ).bind(userMsgId, conversationId, userEncrypted.ciphertext, userEncrypted.iv, now).run()

    // Build messages for AI
    const aiMessages: AIMessage[] = [
      ...history,
      { role: 'user', content: userMessage.content },
    ]

    // Get AI provider and start streaming
    const provider = getProvider(env)
    const ollamaStream = await provider.chat(aiMessages, { systemPrompt: SYSTEM_PROMPT })

    // Transform NDJSON from Ollama to SSE for client
    const finalConversationId = conversationId
    let fullResponse = ''

    const sseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // First event: send conversationId
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: finalConversationId })}\n\n`))

        const reader = ollamaStream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean }
                if (parsed.message?.content) {
                  fullResponse += parsed.message.content
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`))
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer) as { message?: { content?: string } }
              if (parsed.message?.content) {
                fullResponse += parsed.message.content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`))
              }
            } catch {
              // Skip
            }
          }

          // Persist assistant message (encrypted)
          if (fullResponse) {
            try {
              const assistantEncrypted = await encrypt(fullResponse, env.AI_CHAT_ENCRYPTION_KEY)
              const assistantMsgId = generateUUID()
              const assistantNow = nowISO()

              await env.database.prepare(
                `INSERT INTO ai_message (id, conversation_id, role, content_encrypted, iv, created_at)
                 VALUES (?, ?, 'assistant', ?, ?, ?)`
              ).bind(assistantMsgId, finalConversationId, assistantEncrypted.ciphertext, assistantEncrypted.iv, assistantNow).run()

              // Update conversation timestamp
              await env.database.prepare(
                'UPDATE ai_conversation SET updated_at = ? WHERE id = ?'
              ).bind(assistantNow, finalConversationId).run()
            } catch (e) {
              console.error('Failed to persist assistant message:', e)
            }
          }

          // Send done event
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream processing error:', error)
          const errMsg = error instanceof Error ? error.message : 'Stream error'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Chat error:', detail)
    return errorResponse(`AI chat failed: ${detail}`, 500)
  }
}

// GET /api/ai/conversations - List user's conversations
async function handleListConversations(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(
      `SELECT id, title, created_at, updated_at
       FROM ai_conversation WHERE user_id = ?
       ORDER BY updated_at DESC`
    ).bind(userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('List conversations error:', error)
    return errorResponse('Failed to list conversations', 500)
  }
}

// GET /api/ai/conversations/:id - Get conversation with decrypted messages
async function handleGetConversation(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/ai\/conversations\/([^/]+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const conversationId = match[1]

  try {
    const conversation = await env.database.prepare(
      'SELECT * FROM ai_conversation WHERE id = ? AND user_id = ?'
    ).bind(conversationId, userId).first()

    if (!conversation) {
      return errorResponse('Conversation not found', 404)
    }

    const messagesResult = await env.database.prepare(
      `SELECT id, role, content_encrypted, iv, created_at
       FROM ai_message WHERE conversation_id = ?
       ORDER BY created_at ASC`
    ).bind(conversationId).all()

    const messages = []
    for (const row of (messagesResult.results || []) as Record<string, unknown>[]) {
      const content = await decrypt(
        row.content_encrypted as string,
        row.iv as string,
        env.AI_CHAT_ENCRYPTION_KEY
      )
      messages.push({
        id: row.id,
        role: row.role,
        content,
        created_at: row.created_at,
      })
    }

    return jsonResponse({
      ...conversation,
      messages,
    })
  } catch (error) {
    console.error('Get conversation error:', error)
    return errorResponse('Failed to get conversation', 500)
  }
}

// DELETE /api/ai/conversations/:id - Delete conversation
async function handleDeleteConversation(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/ai\/conversations\/([^/]+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const conversationId = match[1]

  try {
    // Verify ownership
    const conversation = await env.database.prepare(
      'SELECT id FROM ai_conversation WHERE id = ? AND user_id = ?'
    ).bind(conversationId, userId).first()

    if (!conversation) {
      return errorResponse('Conversation not found', 404)
    }

    // CASCADE will delete messages
    await env.database.prepare(
      'DELETE FROM ai_conversation WHERE id = ?'
    ).bind(conversationId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return errorResponse('Failed to delete conversation', 500)
  }
}

// GET /api/ai/plan-status - Check async plan generation status
async function handlePlanStatus(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const user = await env.database.prepare(
    'SELECT plan_generation_status FROM app_user WHERE id = ?'
  ).bind(userId).first<{ plan_generation_status: string | null }>()

  if (!user) return errorResponse('User not found', 404)

  if (user.plan_generation_status === 'pending') {
    return jsonResponse({ status: 'pending' })
  }

  if (user.plan_generation_status === 'failed') {
    return jsonResponse({ status: 'failed' })
  }

  // Check if user has an active plan
  const activePlan = await env.database.prepare(
    'SELECT training_plan_id FROM user_training_plan WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first()

  return jsonResponse({ status: activePlan ? 'ready' : 'idle' })
}

// POST /api/ai/generate-plan - AI training plan generation (async via waitUntil)
async function handleGeneratePlan(ctx: RequestContext, waitUntil: (promise: Promise<unknown>) => void): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as {
      fitness_goal: string
      experience_level: string
      training_frequency: number
      focus_areas: string[]
      body_weight_kg?: number
      available_exercises?: number[]
    }

    const { fitness_goal, experience_level, training_frequency, focus_areas, body_weight_kg, available_exercises } = body

    if (!fitness_goal || !experience_level || !training_frequency || !focus_areas) {
      return errorResponse('fitness_goal, experience_level, training_frequency, and focus_areas are required', 400)
    }

    // Rate limit: max 5 plan generations per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 600000).toISOString()
    const recentPlans = await env.database.prepare(
      `SELECT COUNT(*) as count FROM training_plan
       WHERE created_by_id = ? AND created_at > ?`
    ).bind(userId, tenMinutesAgo).first<{ count: number }>()

    if (recentPlans && recentPlans.count >= 5) {
      return errorResponse('Rate limit exceeded. Please wait before generating another plan.', 429)
    }

    // Mark user as pending
    await env.database.prepare(
      'UPDATE app_user SET plan_generation_status = ? WHERE id = ?'
    ).bind('pending', userId).run()

    // Return immediately — generation continues in background
    waitUntil(generatePlanInBackground(env, userId, {
      fitness_goal, experience_level, training_frequency, focus_areas, body_weight_kg, available_exercises,
    }))

    return jsonResponse({ status: 'generating' }, 202)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Generate plan error:', detail)
    return errorResponse(`Failed to start plan generation: ${detail}`, 500)
  }
}

// Background plan generation (runs via waitUntil)
async function generatePlanInBackground(
  env: Env,
  userId: string,
  params: {
    fitness_goal: string
    experience_level: string
    training_frequency: number
    focus_areas: string[]
    body_weight_kg?: number
    available_exercises?: number[]
  }
): Promise<void> {
  const { fitness_goal, experience_level, training_frequency, focus_areas, body_weight_kg, available_exercises } = params

  try {
    // Load exercises from DB
    let exercisesResult
    if (available_exercises && available_exercises.length > 0) {
      const placeholders = available_exercises.map(() => '?').join(',')
      exercisesResult = await env.database.prepare(
        `SELECT id, name FROM exercise WHERE id IN (${placeholders})`
      ).bind(...available_exercises).all()
    } else {
      exercisesResult = await env.database.prepare(
        'SELECT id, name FROM exercise'
      ).all()
    }

    const exercises = (exercisesResult.results || []) as Record<string, unknown>[]
    const exerciseNames = exercises.map(e => e.name as string)

    // Build system prompt - keep concise for faster AI response
    const planSystemPrompt = `Fitness-Trainer. Antworte NUR mit JSON, kein Text/Markdown. ALLES auf Deutsch.
Erlaubte Übungen: ${exerciseNames.join(', ')}
Format: {"name":"Deutscher Name","description":"Deutsche Beschreibung","days":[{"day_number":1,"name":"Deutscher Tag-Name","focus_description":"...","exercises":[{"exercise_name":"EXAKT aus Liste","sets":3,"min_reps":8,"max_reps":12,"rest_seconds":90,"notes":"..."}]}]}
NUR Übungen aus der Liste verwenden. 4-5 Übungen pro Tag. Kurze notes auf Deutsch. Tag-Namen auf Deutsch (z.B. "Brust & Trizeps", "Rücken & Bizeps").`

    const userPrompt = `Erstelle einen Trainingsplan mit folgenden Vorgaben:
- Fitnessziel: ${fitness_goal}
- Erfahrungslevel: ${experience_level}
- Trainingstage pro Woche: ${training_frequency}
- Fokus-Bereiche: ${focus_areas.join(', ')}${body_weight_kg ? `\n- Körpergewicht: ${body_weight_kg} kg` : ''}`

    const provider = getProvider(env)
    const aiResponse = await provider.chatSync(
      [{ role: 'user', content: userPrompt }],
      { systemPrompt: planSystemPrompt, temperature: 0.3 }
    )

    // Strip markdown code blocks if present
    let jsonStr = aiResponse.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const planData: {
      name: string
      name_de?: string
      description?: string
      description_de?: string
      days: Array<{
        day_number: number
        name: string
        name_de?: string
        focus_description?: string
        exercises: Array<{
          exercise_name: string
          sets: number
          min_reps: number
          max_reps: number
          rest_seconds?: number
          notes?: string
        }>
      }>
    } = JSON.parse(jsonStr)

    const now = nowISO()

    // Insert training plan
    const planResult = await env.database.prepare(
      `INSERT INTO training_plan (name, name_de, description, description_de, created_by_id, is_system_plan, days_per_week, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
    ).bind(
      planData.name, planData.name_de || planData.name, planData.description || null, planData.description_de || planData.description || null,
      userId, training_frequency, now, now
    ).run()

    const planId = planResult.meta.last_row_id

    // Build exercise name → id lookup (case-insensitive)
    const exerciseLookup = new Map<string, unknown>()
    for (const ex of exercises) {
      exerciseLookup.set((ex.name as string).toLowerCase(), ex.id)
    }

    // Fuzzy match: find best match by substring
    const fuzzyMatch = (name: string): unknown | undefined => {
      const lower = name.toLowerCase()
      // Try exact match first
      const exact = exerciseLookup.get(lower)
      if (exact) return exact
      // Try substring: find exercise whose name contains the query or vice versa
      for (const [exName, exId] of exerciseLookup) {
        if (exName.includes(lower) || lower.includes(exName)) return exId
      }
      return undefined
    }

    // Insert days and exercises
    for (const day of planData.days) {
      const dayResult = await env.database.prepare(
        `INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de, focus_description)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(planId, day.day_number, day.name, day.name_de || day.name, day.focus_description || null).run()

      const dayId = dayResult.meta.last_row_id

      for (let i = 0; i < day.exercises.length; i++) {
        const exercise = day.exercises[i]
        const exerciseId = fuzzyMatch(exercise.exercise_name)

        if (!exerciseId) {
          console.warn(`Exercise not found (no fuzzy match): "${exercise.exercise_name}" - skipping`)
          continue
        }

        await env.database.prepare(
          `INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(dayId, exerciseId, i + 1, exercise.sets, exercise.min_reps, exercise.max_reps, exercise.rest_seconds || 90, exercise.notes || null).run()
      }
    }

    // Assign plan to user: deactivate existing, insert new
    await env.database.prepare(
      'UPDATE user_training_plan SET is_active = 0 WHERE user_id = ?'
    ).bind(userId).run()

    await env.database.prepare(
      `INSERT INTO user_training_plan (user_id, training_plan_id, current_day, started_at, is_active)
       VALUES (?, ?, 1, ?, 1)
       ON CONFLICT(user_id, training_plan_id)
       DO UPDATE SET is_active = 1, current_day = 1, started_at = ?`
    ).bind(userId, planId, now, now).run()

    // Mark generation as complete
    await env.database.prepare(
      'UPDATE app_user SET plan_generation_status = NULL WHERE id = ?'
    ).bind(userId).run()

    console.log(`Plan generated successfully for user ${userId}: plan_id=${planId}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`Background plan generation failed for user ${userId}:`, detail)

    // Mark generation as failed
    await env.database.prepare(
      'UPDATE app_user SET plan_generation_status = ? WHERE id = ?'
    ).bind('failed', userId).run()
  }
}

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url }

  // POST /api/ai/chat
  if (request.method === 'POST' && path === '/api/ai/chat') {
    return handleChat(ctx)
  }

  // GET /api/ai/conversations
  if (request.method === 'GET' && path === '/api/ai/conversations') {
    return handleListConversations(ctx)
  }

  // GET /api/ai/conversations/:id
  if (request.method === 'GET' && path.match(/^\/api\/ai\/conversations\/[^/]+$/)) {
    return handleGetConversation(ctx)
  }

  // DELETE /api/ai/conversations/:id
  if (request.method === 'DELETE' && path.match(/^\/api\/ai\/conversations\/[^/]+$/)) {
    return handleDeleteConversation(ctx)
  }

  // GET /api/ai/plan-status
  if (request.method === 'GET' && path === '/api/ai/plan-status') {
    return handlePlanStatus(ctx)
  }

  // POST /api/ai/generate-plan
  if (request.method === 'POST' && path === '/api/ai/generate-plan') {
    return handleGeneratePlan(ctx, context.waitUntil.bind(context))
  }

  return errorResponse('Not found', 404)
}
