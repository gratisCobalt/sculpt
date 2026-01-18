/**
 * Import exercises from local JSON cache file into database
 * Use this after running download-exercises.ts
 */

import fs from 'fs'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'sculpt',
  user: 'sculpt',
  password: 'sculpt_dev_2026',
})

const CACHE_FILE = path.join(process.cwd(), 'data', 'exercises-cache.json')

const metValues: Record<string, number> = {
  STRENGTH: 5.0,
  CARDIO: 8.0,
  STRETCHING: 2.5,
  PLYOMETRICS: 8.0,
  POWERLIFTING: 6.0,
  STRONGMAN: 6.5,
  OLYMPIC_WEIGHTLIFTING: 6.0,
}

function estimateAttributes(exercise: any): Record<string, number> {
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

async function importExercise(client: pg.PoolClient, exercise: any): Promise<boolean> {
  try {
    const exerciseTypeId = exercise.exerciseType 
      ? await getOrCreate(client, 'exercise_type', exercise.exerciseType)
      : null
    
    const met = exercise.exerciseType ? (metValues[exercise.exerciseType] || 5.0) : 5.0
    
    // Upsert exercise
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
    `, [exercise.exerciseId, exercise.name, exercise.overview, exercise.videoUrl, exercise.imageUrl, exerciseTypeId, met])
    
    const exerciseId = result.rows[0].id
    
    // Image resolutions
    if (exercise.imageUrls) {
      for (const [resolution, url] of Object.entries(exercise.imageUrls)) {
        await client.query(`
          INSERT INTO exercise_image (exercise_id, resolution, url)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, resolution) DO UPDATE SET url = EXCLUDED.url
        `, [exerciseId, resolution, url])
      }
    }
    
    // Instructions
    if (exercise.instructions?.length) {
      await client.query('DELETE FROM exercise_instruction WHERE exercise_id = $1', [exerciseId])
      for (let i = 0; i < exercise.instructions.length; i++) {
        await client.query(`
          INSERT INTO exercise_instruction (exercise_id, step_number, instruction_text)
          VALUES ($1, $2, $3)
        `, [exerciseId, i + 1, exercise.instructions[i]])
      }
    }
    
    // Tips
    if (exercise.exerciseTips?.length) {
      await client.query('DELETE FROM exercise_tip WHERE exercise_id = $1', [exerciseId])
      for (let i = 0; i < exercise.exerciseTips.length; i++) {
        await client.query(`
          INSERT INTO exercise_tip (exercise_id, tip_number, tip_text)
          VALUES ($1, $2, $3)
        `, [exerciseId, i + 1, exercise.exerciseTips[i]])
      }
    }
    
    // Variations
    if (exercise.variations?.length) {
      await client.query('DELETE FROM exercise_variation WHERE exercise_id = $1', [exerciseId])
      for (let i = 0; i < exercise.variations.length; i++) {
        const [name, ...descParts] = exercise.variations[i].split(':')
        await client.query(`
          INSERT INTO exercise_variation (exercise_id, variation_number, name, description)
          VALUES ($1, $2, $3, $4)
        `, [exerciseId, i + 1, name.trim(), descParts.join(':').trim() || null])
      }
    }
    
    // Keywords
    if (exercise.keywords?.length) {
      for (const keyword of exercise.keywords) {
        await client.query(`
          INSERT INTO exercise_keyword (exercise_id, keyword)
          VALUES ($1, $2)
          ON CONFLICT (exercise_id, keyword) DO NOTHING
        `, [exerciseId, keyword])
      }
    }
    
    // Body parts
    if (exercise.bodyParts?.length) {
      await client.query('DELETE FROM exercise_body_part WHERE exercise_id = $1', [exerciseId])
      for (const bp of exercise.bodyParts) {
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
    if (exercise.equipments?.length) {
      await client.query('DELETE FROM exercise_equipment WHERE exercise_id = $1', [exerciseId])
      for (const eq of exercise.equipments) {
        const equipmentId = await getOrCreate(client, 'equipment', eq)
        if (equipmentId) {
          await client.query(`
            INSERT INTO exercise_equipment (exercise_id, equipment_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [exerciseId, equipmentId])
        }
      }
    }
    
    const firstBodyPartId = exercise.bodyParts?.[0] 
      ? await getOrCreate(client, 'body_part', exercise.bodyParts[0])
      : null
    
    // Target muscles
    if (exercise.targetMuscles?.length) {
      await client.query('DELETE FROM exercise_target_muscle WHERE exercise_id = $1', [exerciseId])
      for (const muscle of exercise.targetMuscles) {
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
    if (exercise.secondaryMuscles?.length) {
      await client.query('DELETE FROM exercise_secondary_muscle WHERE exercise_id = $1', [exerciseId])
      for (const muscle of exercise.secondaryMuscles) {
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
    const attributes = estimateAttributes(exercise)
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
    console.error(`Failed to import ${exercise.name}:`, e)
    return false
  }
}

async function main() {
  console.log('📦 Importing exercises from cache file...')
  console.log('='.repeat(50))
  
  if (!fs.existsSync(CACHE_FILE)) {
    console.error(`❌ Cache file not found: ${CACHE_FILE}`)
    console.log('   Run "npx tsx scripts/download-exercises.ts" first to download exercises.')
    process.exit(1)
  }
  
  const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
  console.log(`📂 Cache downloaded at: ${cacheData.downloadedAt}`)
  console.log(`📊 Exercises in cache: ${cacheData.totalCount || cacheData.exercises?.length || 0}\n`)
  
  const exercises = cacheData.exercises || []
  
  if (exercises.length === 0) {
    console.log('⚠️  No exercises in cache file.')
    process.exit(0)
  }
  
  const client = await pool.connect()
  
  try {
    let imported = 0
    let failed = 0
    
    for (let i = 0; i < exercises.length; i++) {
      if ((i + 1) % 100 === 0 || i === 0) {
        console.log(`[${i + 1}/${exercises.length}] Importing...`)
      }
      
      await client.query('BEGIN')
      const success = await importExercise(client, exercises[i])
      if (success) {
        await client.query('COMMIT')
        imported++
      } else {
        await client.query('ROLLBACK')
        failed++
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 IMPORT COMPLETE')
    console.log('='.repeat(50))
    console.log(`✅ Imported: ${imported}`)
    console.log(`❌ Failed: ${failed}`)
    
    const totalCount = await client.query('SELECT COUNT(*) FROM exercise')
    console.log(`📦 Total exercises in database: ${totalCount.rows[0].count}`)
    
    console.log('\n⏭️  Next: Run "npx tsx scripts/manual-translate.ts" to add German translations')
    
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
