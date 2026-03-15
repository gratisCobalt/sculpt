import pg from 'pg'
// @ts-expect-error - ESM import without types
import { translate } from '@vitalets/google-translate-api'

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

// MET values for calorie calculation
const metValues: Record<string, number> = {
  STRENGTH: 5.0,
  CARDIO: 8.0,
  STRETCHING: 2.5,
  PLYOMETRICS: 8.0,
  POWERLIFTING: 6.0,
  STRONGMAN: 6.5,
  OLYMPIC_WEIGHTLIFTING: 6.0,
}

// Rate-limited translation function
async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') return ''
  try {
    const result = await translate(text, { to: 'de' })
    return result.text
  } catch (e) {
    console.error('Translation failed:', e)
    return text // Return original if translation fails
  }
}

// Radar chart attribute estimates
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
  relatedExerciseIds?: string[]
}

async function fetchAllExercises(): Promise<ExerciseListItem[]> {
  const allExercises: ExerciseListItem[] = []
  let cursor: string | null = null
  let page = 1
  
  console.log('📋 Fetching all exercises from API...')
  
  do {
    const url = cursor 
      ? `${API_BASE}/exercises?limit=50&cursor=${cursor}` 
      : `${API_BASE}/exercises?limit=50`
    
    const res = await fetch(url, { headers })
    const json = await res.json()
    
    if (json.success && json.data) {
      allExercises.push(...json.data)
      cursor = json.meta?.nextCursor || null
      console.log(`  Page ${page}: ${json.data.length} exercises (total: ${allExercises.length})`)
      page++
    } else {
      console.error('API Error:', json)
      break
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 250))
  } while (cursor)
  
  console.log(`\n✅ Found ${allExercises.length} exercises total\n`)
  return allExercises
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

async function getOrCreateExerciseType(client: pg.PoolClient, code: string): Promise<number | null> {
  if (!code) return null
  const normalized = code.toUpperCase().replace(/ /g, '_')
  
  let result = await client.query('SELECT id FROM exercise_type WHERE code = $1', [normalized])
  if (result.rows.length > 0) return result.rows[0].id
  
  result = await client.query(
    'INSERT INTO exercise_type (code, name_de, name_en) VALUES ($1, $1, $1) ON CONFLICT (code) DO UPDATE SET code = $1 RETURNING id',
    [normalized]
  )
  return result.rows[0]?.id || null
}

async function getOrCreateBodyPart(client: pg.PoolClient, code: string): Promise<number | null> {
  if (!code) return null
  const normalized = code.toUpperCase().replace(/ /g, '_')
  
  let result = await client.query('SELECT id FROM body_part WHERE code = $1', [normalized])
  if (result.rows.length > 0) return result.rows[0].id
  
  result = await client.query(
    'INSERT INTO body_part (code, name_de, name_en) VALUES ($1, $1, $1) ON CONFLICT (code) DO UPDATE SET code = $1 RETURNING id',
    [normalized]
  )
  return result.rows[0]?.id || null
}

async function getOrCreateEquipment(client: pg.PoolClient, code: string): Promise<number | null> {
  if (!code) return null
  const normalized = code.toUpperCase().replace(/ /g, '_')
  
  let result = await client.query('SELECT id FROM equipment WHERE code = $1', [normalized])
  if (result.rows.length > 0) return result.rows[0].id
  
  result = await client.query(
    'INSERT INTO equipment (code, name_de, name_en) VALUES ($1, $1, $1) ON CONFLICT (code) DO UPDATE SET code = $1 RETURNING id',
    [normalized]
  )
  return result.rows[0]?.id || null
}

async function getOrCreateMuscle(client: pg.PoolClient, code: string, bodyPartId: number | null): Promise<number | null> {
  if (!code) return null
  const normalized = code.toUpperCase().replace(/ /g, '_')
  
  let result = await client.query('SELECT id FROM muscle WHERE code = $1', [normalized])
  if (result.rows.length > 0) return result.rows[0].id
  
  result = await client.query(
    'INSERT INTO muscle (code, name_de, name_en, body_part_id) VALUES ($1, $1, $1, $2) ON CONFLICT (code) DO UPDATE SET code = $1 RETURNING id',
    [normalized, bodyPartId]
  )
  return result.rows[0]?.id || null
}

async function importExercise(client: pg.PoolClient, detail: ExerciseDetail): Promise<{ id: number, isNew: boolean } | null> {
  try {
    // Check if exercise already exists
    const existing = await client.query('SELECT id, name_de FROM exercise WHERE external_id = $1', [detail.exerciseId])
    
    // Get exercise type
    const exerciseTypeId = detail.exerciseType 
      ? await getOrCreateExerciseType(client, detail.exerciseType) 
      : null
    
    // Calculate MET value
    const met = detail.exerciseType ? (metValues[detail.exerciseType] || 5.0) : 5.0
    
    // Translate name and overview
    console.log(`  🌐 Translating "${detail.name}"...`)
    const nameDe = await translateText(detail.name)
    await new Promise(r => setTimeout(r, 500)) // Rate limit translations
    const overviewDe = detail.overview ? await translateText(detail.overview) : null
    await new Promise(r => setTimeout(r, 300))
    
    let exerciseId: number
    let isNew = false
    
    if (existing.rows.length > 0) {
      // Update existing exercise
      const result = await client.query(`
        UPDATE exercise SET 
          name = $2,
          name_de = $3,
          overview = $4,
          overview_de = $5,
          video_url = $6,
          image_url = $7,
          exercise_type_id = $8,
          met_value = $9,
          api_last_synced_at = NOW()
        WHERE external_id = $1
        RETURNING id
      `, [detail.exerciseId, detail.name, nameDe, detail.overview, overviewDe, detail.videoUrl, detail.imageUrl, exerciseTypeId, met])
      exerciseId = result.rows[0].id
    } else {
      // Insert new exercise
      const result = await client.query(`
        INSERT INTO exercise (external_id, name, name_de, overview, overview_de, video_url, image_url, exercise_type_id, met_value, api_last_synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `, [detail.exerciseId, detail.name, nameDe, detail.overview, overviewDe, detail.videoUrl, detail.imageUrl, exerciseTypeId, met])
      exerciseId = result.rows[0].id
      isNew = true
    }
    
    // Update image resolutions
    if (detail.imageUrls) {
      for (const [resolution, url] of Object.entries(detail.imageUrls)) {
        await client.query(`
          INSERT INTO exercise_image (exercise_id, resolution, url)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, resolution) DO UPDATE SET url = EXCLUDED.url
        `, [exerciseId, resolution, url])
      }
    }
    
    // Update instructions with translations
    if (detail.instructions) {
      // Delete old instructions first
      await client.query('DELETE FROM exercise_instruction WHERE exercise_id = $1', [exerciseId])
      
      for (let i = 0; i < detail.instructions.length; i++) {
        const instructionDe = await translateText(detail.instructions[i])
        await new Promise(r => setTimeout(r, 200))
        
        await client.query(`
          INSERT INTO exercise_instruction (exercise_id, step_number, instruction_text, instruction_text_de)
          VALUES ($1, $2, $3, $4)
        `, [exerciseId, i + 1, detail.instructions[i], instructionDe])
      }
    }
    
    // Update tips with translations
    if (detail.exerciseTips) {
      await client.query('DELETE FROM exercise_tip WHERE exercise_id = $1', [exerciseId])
      
      for (let i = 0; i < detail.exerciseTips.length; i++) {
        const tipDe = await translateText(detail.exerciseTips[i])
        await new Promise(r => setTimeout(r, 200))
        
        await client.query(`
          INSERT INTO exercise_tip (exercise_id, tip_number, tip_text, tip_text_de)
          VALUES ($1, $2, $3, $4)
        `, [exerciseId, i + 1, detail.exerciseTips[i], tipDe])
      }
    }
    
    // Update variations with translations
    if (detail.variations) {
      await client.query('DELETE FROM exercise_variation WHERE exercise_id = $1', [exerciseId])
      
      for (let i = 0; i < detail.variations.length; i++) {
        const variation = detail.variations[i]
        const [name, ...descParts] = variation.split(':')
        const desc = descParts.join(':').trim() || null
        const descDe = desc ? await translateText(desc) : null
        await new Promise(r => setTimeout(r, 200))
        
        await client.query(`
          INSERT INTO exercise_variation (exercise_id, variation_number, name, description, description_de)
          VALUES ($1, $2, $3, $4, $5)
        `, [exerciseId, i + 1, name.trim(), desc, descDe])
      }
    }
    
    // Update keywords
    if (detail.keywords) {
      // Keep existing keywords, add new ones
      for (const keyword of detail.keywords) {
        await client.query(`
          INSERT INTO exercise_keyword (exercise_id, keyword)
          VALUES ($1, $2)
          ON CONFLICT (exercise_id, keyword) DO NOTHING
        `, [exerciseId, keyword])
      }
    }
    
    // Update body parts
    if (detail.bodyParts) {
      await client.query('DELETE FROM exercise_body_part WHERE exercise_id = $1', [exerciseId])
      for (const bp of detail.bodyParts) {
        const bodyPartId = await getOrCreateBodyPart(client, bp)
        if (bodyPartId) {
          await client.query(`
            INSERT INTO exercise_body_part (exercise_id, body_part_id)
            VALUES ($1, $2)
            ON CONFLICT (exercise_id, body_part_id) DO NOTHING
          `, [exerciseId, bodyPartId])
        }
      }
    }
    
    // Update equipments
    if (detail.equipments) {
      await client.query('DELETE FROM exercise_equipment WHERE exercise_id = $1', [exerciseId])
      for (const eq of detail.equipments) {
        const equipmentId = await getOrCreateEquipment(client, eq)
        if (equipmentId) {
          await client.query(`
            INSERT INTO exercise_equipment (exercise_id, equipment_id)
            VALUES ($1, $2)
            ON CONFLICT (exercise_id, equipment_id) DO NOTHING
          `, [exerciseId, equipmentId])
        }
      }
    }
    
    // Get first body part for muscles
    const firstBodyPartId = detail.bodyParts?.[0] 
      ? await getOrCreateBodyPart(client, detail.bodyParts[0]) 
      : null
    
    // Update target muscles
    if (detail.targetMuscles) {
      await client.query('DELETE FROM exercise_target_muscle WHERE exercise_id = $1', [exerciseId])
      for (const muscle of detail.targetMuscles) {
        const muscleId = await getOrCreateMuscle(client, muscle, firstBodyPartId)
        if (muscleId) {
          await client.query(`
            INSERT INTO exercise_target_muscle (exercise_id, muscle_id)
            VALUES ($1, $2)
            ON CONFLICT (exercise_id, muscle_id) DO NOTHING
          `, [exerciseId, muscleId])
        }
      }
    }
    
    // Update secondary muscles
    if (detail.secondaryMuscles) {
      await client.query('DELETE FROM exercise_secondary_muscle WHERE exercise_id = $1', [exerciseId])
      for (const muscle of detail.secondaryMuscles) {
        const muscleId = await getOrCreateMuscle(client, muscle, null)
        if (muscleId) {
          await client.query(`
            INSERT INTO exercise_secondary_muscle (exercise_id, muscle_id)
            VALUES ($1, $2)
            ON CONFLICT (exercise_id, muscle_id) DO NOTHING
          `, [exerciseId, muscleId])
        }
      }
    }
    
    // Update radar chart attributes
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
    
    return { id: exerciseId, isNew }
  } catch (e) {
    console.error(`Failed to import exercise ${detail.name}:`, e)
    return null
  }
}

async function main() {
  console.log('🏋️ Starting Exercise Sync & Translation...\n')
  
  const client = await pool.connect()
  
  try {
    // First, get count of existing exercises
    const existingCount = await client.query('SELECT COUNT(*) FROM exercise')
    console.log(`📊 Currently ${existingCount.rows[0].count} exercises in database\n`)
    
    // Fetch all exercises from API
    const allExercises = await fetchAllExercises()
    
    console.log('🔄 Fetching details and translating...\n')
    
    let imported = 0
    let updated = 0
    let failed = 0
    
    for (let i = 0; i < allExercises.length; i++) {
      const exercise = allExercises[i]
      console.log(`[${i + 1}/${allExercises.length}] Processing "${exercise.name}"...`)
      
      const detail = await fetchExerciseDetail(exercise.exerciseId)
      if (detail) {
        await client.query('BEGIN')
        const result = await importExercise(client, detail)
        if (result) {
          await client.query('COMMIT')
          if (result.isNew) {
            imported++
            console.log(`  ✅ NEW: ${detail.name}`)
          } else {
            updated++
            console.log(`  🔄 Updated: ${detail.name}`)
          }
        } else {
          await client.query('ROLLBACK')
          failed++
          console.log(`  ❌ Failed: ${detail.name}`)
        }
      } else {
        failed++
        console.log(`  ❌ Could not fetch details for ${exercise.name}`)
      }
      
      // Rate limiting between exercises
      await new Promise(r => setTimeout(r, 400))
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 SUMMARY')
    console.log('='.repeat(50))
    console.log(`✅ New exercises imported: ${imported}`)
    console.log(`🔄 Exercises updated: ${updated}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📦 Total processed: ${allExercises.length}`)
    
    // Final count
    const finalCount = await client.query('SELECT COUNT(*) FROM exercise')
    const translatedCount = await client.query('SELECT COUNT(*) FROM exercise WHERE name_de IS NOT NULL')
    console.log(`\n📊 Final database state:`)
    console.log(`   Total exercises: ${finalCount.rows[0].count}`)
    console.log(`   With translations: ${translatedCount.rows[0].count}`)
    
  } finally {
    client.release()
    await pool.end()
  }
  
  console.log('\n🎉 Sync complete!')
}

main().catch(console.error)
