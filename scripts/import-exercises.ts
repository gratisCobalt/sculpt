/**
 * PHASE 1: Fast Exercise Import (without translations)
 * 
 * This script imports ALL exercises from the ExerciseDB API into the local database.
 * It does NOT translate - that's done separately in phase 2 for speed.
 * 
 * Estimated time: ~20-30 minutes for 3500+ exercises
 */

import pg from 'pg'

const API_BASE = 'https://exercise-db-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1'
const API_KEY = 'af7f90eb4emsh40401dc13b6686fp14cb55jsn447a809b8285'
const API_HOST = 'exercise-db-with-videos-and-images-by-ascendapi.p.rapidapi.com'

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'sculpt',
  user: 'sculpt',
  password: 'sculpt_dev_2026',
})

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
}

const metValues: Record<string, number> = {
  STRENGTH: 5.0,
  CARDIO: 8.0,
  STRETCHING: 2.5,
  PLYOMETRICS: 8.0,
  POWERLIFTING: 6.0,
  STRONGMAN: 6.5,
  OLYMPIC_WEIGHTLIFTING: 6.0,
}

function estimateAttributes(exercise: ExerciseDetail): Record<string, number> {
  const isCompound = (exercise.secondaryMuscles?.length || 0) >= 2
  const hasBarbell = exercise.equipments?.includes('BARBELL') || exercise.equipments?.includes('OLYMPIC_BARBELL')
  const isBodyweight = exercise.equipments?.includes('BODY WEIGHT')
  const isStrength = exercise.exerciseType === 'STRENGTH'
  const isCardio = exercise.exerciseType === 'CARDIO'
  
  return {
    strength: isStrength ? (hasBarbell ? 8 : 6) : (isCardio ? 3 : 5),
    endurance: isCardio ? 9 : (isCompound ? 5 : 3),
    technique: isCompound ? 7 : (isBodyweight ? 5 : 4),
    flexibility: isBodyweight ? 6 : 4,
    intensity: isCompound ? 8 : (isStrength ? 6 : 4),
  }
}

interface ExerciseListItem {
  exerciseId: string
  name: string
  imageUrl: string
}

interface ExerciseDetail {
  exerciseId: string
  name: string
  imageUrl: string
  imageUrls?: Record<string, string>
  equipments?: string[]
  bodyParts?: string[]
  exerciseType?: string
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  videoUrl?: string
  keywords?: string[]
  overview?: string
  instructions?: string[]
  exerciseTips?: string[]
  variations?: string[]
}

// Fetch single page of exercises
async function fetchExercisePage(cursor: string | null): Promise<{ data: ExerciseListItem[], nextCursor: string | null }> {
  const url = cursor 
    ? `${API_BASE}/exercises?limit=50&cursor=${cursor}` 
    : `${API_BASE}/exercises?limit=50`
  
  const res = await fetch(url, { headers })
  const json = await res.json()
  
  if (json.success && json.data) {
    return { 
      data: json.data, 
      nextCursor: json.meta?.nextCursor || null 
    }
  }
  return { data: [], nextCursor: null }
}

async function fetchExerciseDetail(exerciseId: string): Promise<ExerciseDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/exercises/${exerciseId}`, { headers })
    const json = await res.json()
    if (json.success) return json.data
    return null
  } catch (e) {
    console.error(`Failed to fetch ${exerciseId}:`, e)
    return null
  }
}

async function getOrCreate(client: pg.PoolClient, table: string, code: string, bodyPartId?: number | null): Promise<number | null> {
  if (!code) return null
  const normalized = code.toUpperCase().replace(/ /g, '_')
  
  let result = await client.query(`SELECT id FROM ${table} WHERE code = $1`, [normalized])
  if (result.rows.length > 0) return result.rows[0].id
  
  if (table === 'muscle') {
    result = await client.query(
      `INSERT INTO ${table} (code, name_de, name_en, body_part_id) VALUES ($1, $1, $1, $2) ON CONFLICT (code) DO UPDATE SET code = $1 RETURNING id`,
      [normalized, bodyPartId]
    )
  } else {
    result = await client.query(
      `INSERT INTO ${table} (code, name_de, name_en) VALUES ($1, $1, $1) ON CONFLICT (code) DO UPDATE SET code = $1 RETURNING id`,
      [normalized]
    )
  }
  return result.rows[0]?.id || null
}

async function importExercise(client: pg.PoolClient, detail: ExerciseDetail): Promise<boolean> {
  try {
    const exerciseTypeId = detail.exerciseType 
      ? await getOrCreate(client, 'exercise_type', detail.exerciseType)
      : null
    
    const met = detail.exerciseType ? (metValues[detail.exerciseType] || 5.0) : 5.0
    
    // Upsert exercise (NO translation yet - done in phase 2)
    const result = await client.query(`
      INSERT INTO exercise (external_id, name, overview, video_url, image_url, exercise_type_id, met_value, api_last_synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (external_id) DO UPDATE SET 
        name = EXCLUDED.name,
        overview = EXCLUDED.overview,
        video_url = EXCLUDED.video_url,
        image_url = EXCLUDED.image_url,
        exercise_type_id = EXCLUDED.exercise_type_id,
        met_value = EXCLUDED.met_value,
        api_last_synced_at = NOW()
      RETURNING id
    `, [detail.exerciseId, detail.name, detail.overview, detail.videoUrl, detail.imageUrl, exerciseTypeId, met])
    
    const exerciseId = result.rows[0].id
    
    // Image resolutions
    if (detail.imageUrls) {
      for (const [resolution, url] of Object.entries(detail.imageUrls)) {
        await client.query(`
          INSERT INTO exercise_image (exercise_id, resolution, url)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, resolution) DO UPDATE SET url = EXCLUDED.url
        `, [exerciseId, resolution, url])
      }
    }
    
    // Instructions (English only for now)
    if (detail.instructions?.length) {
      await client.query('DELETE FROM exercise_instruction WHERE exercise_id = $1', [exerciseId])
      for (let i = 0; i < detail.instructions.length; i++) {
        await client.query(`
          INSERT INTO exercise_instruction (exercise_id, step_number, instruction_text)
          VALUES ($1, $2, $3)
        `, [exerciseId, i + 1, detail.instructions[i]])
      }
    }
    
    // Tips (English only for now)
    if (detail.exerciseTips?.length) {
      await client.query('DELETE FROM exercise_tip WHERE exercise_id = $1', [exerciseId])
      for (let i = 0; i < detail.exerciseTips.length; i++) {
        await client.query(`
          INSERT INTO exercise_tip (exercise_id, tip_number, tip_text)
          VALUES ($1, $2, $3)
        `, [exerciseId, i + 1, detail.exerciseTips[i]])
      }
    }
    
    // Variations
    if (detail.variations?.length) {
      await client.query('DELETE FROM exercise_variation WHERE exercise_id = $1', [exerciseId])
      for (let i = 0; i < detail.variations.length; i++) {
        const [name, ...descParts] = detail.variations[i].split(':')
        await client.query(`
          INSERT INTO exercise_variation (exercise_id, variation_number, name, description)
          VALUES ($1, $2, $3, $4)
        `, [exerciseId, i + 1, name.trim(), descParts.join(':').trim() || null])
      }
    }
    
    // Keywords
    if (detail.keywords?.length) {
      for (const keyword of detail.keywords) {
        await client.query(`
          INSERT INTO exercise_keyword (exercise_id, keyword)
          VALUES ($1, $2)
          ON CONFLICT (exercise_id, keyword) DO NOTHING
        `, [exerciseId, keyword])
      }
    }
    
    // Body parts
    if (detail.bodyParts?.length) {
      await client.query('DELETE FROM exercise_body_part WHERE exercise_id = $1', [exerciseId])
      for (const bp of detail.bodyParts) {
        const bodyPartId = await getOrCreate(client, 'body_part', bp)
        if (bodyPartId) {
          await client.query(`
            INSERT INTO exercise_body_part (exercise_id, body_part_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [exerciseId, bodyPartId])
        }
      }
    }
    
    // Equipment
    if (detail.equipments?.length) {
      await client.query('DELETE FROM exercise_equipment WHERE exercise_id = $1', [exerciseId])
      for (const eq of detail.equipments) {
        const equipmentId = await getOrCreate(client, 'equipment', eq)
        if (equipmentId) {
          await client.query(`
            INSERT INTO exercise_equipment (exercise_id, equipment_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [exerciseId, equipmentId])
        }
      }
    }
    
    const firstBodyPartId = detail.bodyParts?.[0] 
      ? await getOrCreate(client, 'body_part', detail.bodyParts[0])
      : null
    
    // Target muscles
    if (detail.targetMuscles?.length) {
      await client.query('DELETE FROM exercise_target_muscle WHERE exercise_id = $1', [exerciseId])
      for (const muscle of detail.targetMuscles) {
        const muscleId = await getOrCreate(client, 'muscle', muscle, firstBodyPartId)
        if (muscleId) {
          await client.query(`
            INSERT INTO exercise_target_muscle (exercise_id, muscle_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [exerciseId, muscleId])
        }
      }
    }
    
    // Secondary muscles
    if (detail.secondaryMuscles?.length) {
      await client.query('DELETE FROM exercise_secondary_muscle WHERE exercise_id = $1', [exerciseId])
      for (const muscle of detail.secondaryMuscles) {
        const muscleId = await getOrCreate(client, 'muscle', muscle, null)
        if (muscleId) {
          await client.query(`
            INSERT INTO exercise_secondary_muscle (exercise_id, muscle_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [exerciseId, muscleId])
        }
      }
    }
    
    // Radar chart attributes
    const attributes = estimateAttributes(detail)
    for (const [attrCode, value] of Object.entries(attributes)) {
      const attrResult = await client.query('SELECT id FROM exercise_attribute_type WHERE code = $1', [attrCode])
      if (attrResult.rows.length > 0) {
        await client.query(`
          INSERT INTO exercise_attribute_value (exercise_id, attribute_type_id, value)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, attribute_type_id) DO UPDATE SET value = EXCLUDED.value
        `, [exerciseId, attrResult.rows[0].id, value])
      }
    }
    
    return true
  } catch (e) {
    console.error(`Failed to import ${detail.name}:`, e)
    return false
  }
}

async function main() {
  console.log('🏋️ PHASE 1: Fast Exercise Import (No Translation)')
  console.log('='.repeat(50))
  
  const client = await pool.connect()
  
  try {
    const existingCount = await client.query('SELECT COUNT(*) FROM exercise')
    console.log(`📊 Currently ${existingCount.rows[0].count} exercises in database\n`)
    
    // Collect all exercise IDs first
    console.log('📋 Fetching exercise list from API...')
    const allExercises: ExerciseListItem[] = []
    let cursor: string | null = null
    let page = 1
    
    do {
      const result = await fetchExercisePage(cursor)
      allExercises.push(...result.data)
      cursor = result.nextCursor
      
      if (page % 10 === 0) {
        console.log(`  Page ${page}: ${allExercises.length} exercises collected`)
      }
      page++
      
      await new Promise(r => setTimeout(r, 100)) // Light rate limiting
    } while (cursor)
    
    console.log(`\n✅ Found ${allExercises.length} exercises total\n`)
    
    // Now import each exercise
    console.log('🔄 Importing exercises...\n')
    
    let imported = 0
    let failed = 0
    const startTime = Date.now()
    
    for (let i = 0; i < allExercises.length; i++) {
      const exercise = allExercises[i]
      
      // Progress update every 50 exercises
      if ((i + 1) % 50 === 0 || i === 0) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = (i + 1) / elapsed
        const remaining = (allExercises.length - i - 1) / rate
        console.log(`[${i + 1}/${allExercises.length}] (${Math.round(rate * 60)}/min, ~${Math.round(remaining / 60)}min remaining)`)
      }
      
      const detail = await fetchExerciseDetail(exercise.exerciseId)
      if (detail) {
        await client.query('BEGIN')
        const success = await importExercise(client, detail)
        if (success) {
          await client.query('COMMIT')
          imported++
        } else {
          await client.query('ROLLBACK')
          failed++
        }
      } else {
        failed++
      }
      
      await new Promise(r => setTimeout(r, 150)) // Rate limiting
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 PHASE 1 COMPLETE')
    console.log('='.repeat(50))
    console.log(`✅ Imported: ${imported}`)
    console.log(`❌ Failed: ${failed}`)
    
    const finalCount = await client.query('SELECT COUNT(*) FROM exercise')
    console.log(`📦 Total exercises in database: ${finalCount.rows[0].count}`)
    console.log(`\n⏭️  Next: Run 'npx tsx scripts/translate-exercises.ts' to add German translations`)
    
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
