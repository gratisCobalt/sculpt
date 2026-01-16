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

// MET values for calorie calculation (estimates based on exercise type)
const metValues: Record<string, number> = {
  STRENGTH: 5.0,
  CARDIO: 8.0,
  STRETCHING: 2.5,
  PLYOMETRICS: 8.0,
  POWERLIFTING: 6.0,
  STRONGMAN: 6.5,
  OLYMPIC_WEIGHTLIFTING: 6.0,
}

// Radar chart attribute estimates based on exercise characteristics
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

interface ExerciseSearch {
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

async function searchExercises(query: string, limit = 50): Promise<ExerciseSearch[]> {
  try {
    const res = await fetch(`${API_BASE}/exercises/search?search=${encodeURIComponent(query)}&limit=${limit}`, { headers })
    const json = await res.json()
    if (json.success) return json.data
    return []
  } catch (e) {
    console.error(`Search failed for ${query}:`, e)
    return []
  }
}

async function getOrCreateExerciseType(client: pg.PoolClient, code: string): Promise<number | null> {
  if (!code) return null
  const normalized = code.toUpperCase().replace(/ /g, '_')
  
  // Try to get existing
  let result = await client.query('SELECT id FROM exercise_type WHERE code = $1', [normalized])
  if (result.rows.length > 0) return result.rows[0].id
  
  // Insert new
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

async function importExercise(client: pg.PoolClient, detail: ExerciseDetail): Promise<number | null> {
  try {
    // Get exercise type
    const exerciseTypeId = detail.exerciseType 
      ? await getOrCreateExerciseType(client, detail.exerciseType) 
      : null
    
    // Calculate MET value
    const met = detail.exerciseType ? (metValues[detail.exerciseType] || 5.0) : 5.0
    
    // Insert exercise
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
    
    // Insert image resolutions
    if (detail.imageUrls) {
      for (const [resolution, url] of Object.entries(detail.imageUrls)) {
        await client.query(`
          INSERT INTO exercise_image (exercise_id, resolution, url)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, resolution) DO UPDATE SET url = EXCLUDED.url
        `, [exerciseId, resolution, url])
      }
    }
    
    // Insert instructions
    if (detail.instructions) {
      for (let i = 0; i < detail.instructions.length; i++) {
        await client.query(`
          INSERT INTO exercise_instruction (exercise_id, step_number, instruction_text)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, step_number) DO UPDATE SET instruction_text = EXCLUDED.instruction_text
        `, [exerciseId, i + 1, detail.instructions[i]])
      }
    }
    
    // Insert tips
    if (detail.exerciseTips) {
      for (let i = 0; i < detail.exerciseTips.length; i++) {
        await client.query(`
          INSERT INTO exercise_tip (exercise_id, tip_number, tip_text)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, tip_number) DO UPDATE SET tip_text = EXCLUDED.tip_text
        `, [exerciseId, i + 1, detail.exerciseTips[i]])
      }
    }
    
    // Insert variations
    if (detail.variations) {
      for (let i = 0; i < detail.variations.length; i++) {
        const variation = detail.variations[i]
        const [name, ...descParts] = variation.split(':')
        await client.query(`
          INSERT INTO exercise_variation (exercise_id, variation_number, name, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (exercise_id, variation_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
        `, [exerciseId, i + 1, name.trim(), descParts.join(':').trim() || null])
      }
    }
    
    // Insert keywords
    if (detail.keywords) {
      for (const keyword of detail.keywords) {
        await client.query(`
          INSERT INTO exercise_keyword (exercise_id, keyword)
          VALUES ($1, $2)
          ON CONFLICT (exercise_id, keyword) DO NOTHING
        `, [exerciseId, keyword])
      }
    }
    
    // Insert body parts
    if (detail.bodyParts) {
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
    
    // Insert equipments
    if (detail.equipments) {
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
    
    // Insert target muscles
    if (detail.targetMuscles) {
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
    
    // Insert secondary muscles
    if (detail.secondaryMuscles) {
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
    
    // Insert radar chart attributes
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
    
    return exerciseId
  } catch (e) {
    console.error(`Failed to import exercise ${detail.name}:`, e)
    return null
  }
}

async function main() {
  console.log('🏋️ Starting ExerciseDB Import...\n')
  
  const client = await pool.connect()
  
  try {
    // Search for common exercises
    const searchTerms = [
      'bench press', 'squat', 'deadlift', 'row', 'curl', 'press', 
      'pulldown', 'fly', 'extension', 'raise', 'lunge', 'crunch',
      'plank', 'pushup', 'pullup', 'dip', 'shrug', 'calf'
    ]
    
    const exerciseIds = new Set<string>()
    
    console.log('🔍 Searching for exercises...')
    for (const term of searchTerms) {
      const results = await searchExercises(term, 20)
      results.forEach(r => exerciseIds.add(r.exerciseId))
      console.log(`  Found ${results.length} exercises for "${term}"`)
      await new Promise(r => setTimeout(r, 200)) // Rate limiting
    }
    
    console.log(`\n📦 Found ${exerciseIds.size} unique exercises. Importing details...\n`)
    
    let imported = 0
    let failed = 0
    
    for (const exerciseId of exerciseIds) {
      const detail = await fetchExerciseDetail(exerciseId)
      if (detail) {
        await client.query('BEGIN')
        const id = await importExercise(client, detail)
        if (id) {
          await client.query('COMMIT')
          imported++
          console.log(`✅ [${imported}/${exerciseIds.size}] ${detail.name}`)
        } else {
          await client.query('ROLLBACK')
          failed++
          console.log(`❌ Failed: ${detail.name}`)
        }
      } else {
        failed++
      }
      await new Promise(r => setTimeout(r, 300)) // Rate limiting
    }
    
    console.log(`\n✨ Import complete! ${imported} exercises imported, ${failed} failed.`)
    
    // Create PPL training plan with exercises
    console.log('\n📋 Creating Push/Pull/Legs training plan...')
    
    // Get the PPL plan ID
    const planResult = await client.query("SELECT id FROM training_plan WHERE name = 'Push/Pull/Legs'")
    const planId = planResult.rows[0]?.id
    
    if (planId) {
      // Get exercise IDs for the plan
      const exerciseMap: Record<string, number> = {}
      const exercises = ['Bench Press', 'Dumbbell Fly', 'Shoulder Press', 'Triceps Extension', 'Cable Pushdown',
                        'Barbell Row', 'Lat Pulldown', 'Face Pull', 'Bicep Curl', 'Hammer Curl',
                        'Squat', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise']
      
      for (const name of exercises) {
        const result = await client.query('SELECT id FROM exercise WHERE LOWER(name) LIKE $1 LIMIT 1', [`%${name.toLowerCase()}%`])
        if (result.rows.length > 0) {
          exerciseMap[name] = result.rows[0].id
        }
      }
      
      // Day 1: Push
      await client.query(`
        INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de, focus_description)
        VALUES ($1, 1, 'Push', 'Push', 'Chest, Shoulders, Triceps')
        ON CONFLICT (training_plan_id, day_number) DO NOTHING
      `, [planId])
      
      const day1Result = await client.query('SELECT id FROM training_plan_day WHERE training_plan_id = $1 AND day_number = 1', [planId])
      const day1Id = day1Result.rows[0]?.id
      
      if (day1Id) {
        const pushExercises = ['Bench Press', 'Dumbbell Fly', 'Shoulder Press', 'Triceps Extension', 'Cable Pushdown']
        for (let i = 0; i < pushExercises.length; i++) {
          const exId = exerciseMap[pushExercises[i]]
          if (exId) {
            await client.query(`
              INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps)
              VALUES ($1, $2, $3, 3, 8, 12)
              ON CONFLICT (training_plan_day_id, order_index) DO NOTHING
            `, [day1Id, exId, i + 1])
          }
        }
      }
      
      // Day 2: Pull
      await client.query(`
        INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de, focus_description)
        VALUES ($1, 2, 'Pull', 'Pull', 'Back, Biceps')
        ON CONFLICT (training_plan_id, day_number) DO NOTHING
      `, [planId])
      
      const day2Result = await client.query('SELECT id FROM training_plan_day WHERE training_plan_id = $1 AND day_number = 2', [planId])
      const day2Id = day2Result.rows[0]?.id
      
      if (day2Id) {
        const pullExercises = ['Barbell Row', 'Lat Pulldown', 'Face Pull', 'Bicep Curl', 'Hammer Curl']
        for (let i = 0; i < pullExercises.length; i++) {
          const exId = exerciseMap[pullExercises[i]]
          if (exId) {
            await client.query(`
              INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps)
              VALUES ($1, $2, $3, 3, 8, 12)
              ON CONFLICT (training_plan_day_id, order_index) DO NOTHING
            `, [day2Id, exId, i + 1])
          }
        }
      }
      
      // Day 3: Legs
      await client.query(`
        INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de, focus_description)
        VALUES ($1, 3, 'Legs', 'Beine', 'Quads, Hamstrings, Calves')
        ON CONFLICT (training_plan_id, day_number) DO NOTHING
      `, [planId])
      
      const day3Result = await client.query('SELECT id FROM training_plan_day WHERE training_plan_id = $1 AND day_number = 3', [planId])
      const day3Id = day3Result.rows[0]?.id
      
      if (day3Id) {
        const legExercises = ['Squat', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise']
        for (let i = 0; i < legExercises.length; i++) {
          const exId = exerciseMap[legExercises[i]]
          if (exId) {
            await client.query(`
              INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps)
              VALUES ($1, $2, $3, 3, 8, 12)
              ON CONFLICT (training_plan_day_id, order_index) DO NOTHING
            `, [day3Id, exId, i + 1])
          }
        }
      }
      
      console.log('✅ Training plan created!')
    }
    
    // Create test user with mock data
    console.log('\n👤 Creating test user with mock workout data...')
    
    const userResult = await client.query(`
      INSERT INTO app_user (email, full_name, display_name, gender_id, body_weight_kg, onboarding_completed, training_frequency_per_week, fitness_goal, experience_level, current_streak, longest_streak, total_points, hantel_coins)
      VALUES ('test@sculpt-app.de', 'Test User', 'Max', 1, 80, TRUE, 3, 'muscle_gain', 'intermediate', 3, 5, 150, 500)
      ON CONFLICT (email) DO UPDATE SET 
        display_name = EXCLUDED.display_name,
        onboarding_completed = EXCLUDED.onboarding_completed,
        current_streak = EXCLUDED.current_streak,
        hantel_coins = 500
      RETURNING id
    `)
    const userId = userResult.rows[0].id
    
    // Assign PPL plan to user
    if (planId) {
      await client.query(`
        INSERT INTO user_training_plan (user_id, training_plan_id, current_day, is_active)
        VALUES ($1, $2, 2, TRUE)
        ON CONFLICT (user_id, training_plan_id) DO UPDATE SET current_day = 2, is_active = TRUE
      `, [userId, planId])
    }
    
    // Get exercise IDs for mock data
    const benchResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) = 'bench press' LIMIT 1")
    const squatResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) = 'squat' LIMIT 1")
    const rowResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) LIKE '%row%' LIMIT 1")
    
    const benchId = benchResult.rows[0]?.id
    const squatId = squatResult.rows[0]?.id
    const rowId = rowResult.rows[0]?.id
    
    // Get more exercise IDs for variety
    const shoulderResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) LIKE '%shoulder press%' OR LOWER(name) LIKE '%military%' LIMIT 1")
    const curlResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) LIKE '%curl%' AND LOWER(name) LIKE '%bicep%' LIMIT 1")
    const legPressResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) LIKE '%leg press%' LIMIT 1")
    const latResult = await client.query("SELECT id FROM exercise WHERE LOWER(name) LIKE '%lat pulldown%' OR LOWER(name) LIKE '%pull down%' LIMIT 1")
    
    const shoulderId = shoulderResult.rows[0]?.id || benchId
    const curlId = curlResult.rows[0]?.id || rowId
    const legPressId = legPressResult.rows[0]?.id || squatId
    const latId = latResult.rows[0]?.id || rowId
    
    if (benchId && squatId && rowId) {
      // Create mock workout sessions - more recent data for current week stats
      const workoutData = [
        // 4 weeks ago
        { daysAgo: 28, exercises: [[benchId, 55, 12], [benchId, 60, 10], [benchId, 65, 8], [shoulderId, 30, 12]] },
        { daysAgo: 26, exercises: [[squatId, 70, 12], [squatId, 80, 10], [squatId, 85, 8], [legPressId, 100, 12]] },
        { daysAgo: 24, exercises: [[rowId, 45, 12], [rowId, 55, 10], [latId, 50, 10], [curlId, 15, 12]] },
        // 3 weeks ago
        { daysAgo: 21, exercises: [[benchId, 60, 10], [benchId, 70, 8], [benchId, 75, 6], [shoulderId, 32, 10]] },
        { daysAgo: 19, exercises: [[squatId, 80, 10], [squatId, 90, 8], [squatId, 95, 6], [legPressId, 110, 10]] },
        { daysAgo: 17, exercises: [[rowId, 50, 10], [rowId, 60, 8], [rowId, 65, 8], [latId, 55, 10]] },
        // 2 weeks ago
        { daysAgo: 14, exercises: [[benchId, 65, 10], [benchId, 75, 8], [benchId, 80, 6], [shoulderId, 35, 10]] },
        { daysAgo: 12, exercises: [[squatId, 85, 10], [squatId, 95, 8], [squatId, 100, 6], [legPressId, 120, 10]] },
        { daysAgo: 10, exercises: [[rowId, 55, 10], [rowId, 65, 8], [rowId, 70, 8], [curlId, 17, 10]] },
        // Last week
        { daysAgo: 7, exercises: [[benchId, 70, 10], [benchId, 80, 8], [benchId, 85, 6], [shoulderId, 37, 8]] },
        { daysAgo: 5, exercises: [[squatId, 90, 10], [squatId, 100, 8], [squatId, 105, 6], [legPressId, 130, 8]] },
        { daysAgo: 3, exercises: [[rowId, 60, 10], [rowId, 70, 8], [rowId, 75, 8], [latId, 60, 10]] },
        // Current week (important for weekly stats!)
        { daysAgo: 2, exercises: [[benchId, 72, 10], [benchId, 82, 8], [benchId, 87, 6], [shoulderId, 38, 8], [curlId, 18, 12]] },
        { daysAgo: 1, exercises: [[squatId, 92, 10], [squatId, 102, 8], [squatId, 107, 6], [legPressId, 135, 8]] },
        { daysAgo: 0, exercises: [[rowId, 62, 10], [rowId, 72, 8], [rowId, 77, 8], [latId, 62, 10], [curlId, 18, 10]] },
      ]
      
      for (const workout of workoutData) {
        const sessionResult = await client.query(`
          INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned)
          VALUES ($1, NOW() - INTERVAL '${workout.daysAgo} days', NOW() - INTERVAL '${workout.daysAgo} days' + INTERVAL '50 minutes', 3000, 0, 420)
          RETURNING id
        `, [userId])
        
        const sessionId = sessionResult.rows[0].id
        let totalVolume = 0
        
        for (let i = 0; i < workout.exercises.length; i++) {
          const [exId, weight, reps] = workout.exercises[i]
          totalVolume += weight * reps
          await client.query(`
            INSERT INTO workout_set (workout_session_id, exercise_id, set_number, weight_kg, reps)
            VALUES ($1, $2, $3, $4, $5)
          `, [sessionId, exId, i + 1, weight, reps])
        }
        
        await client.query('UPDATE workout_session SET total_volume_kg = $1 WHERE id = $2', [totalVolume, sessionId])
      }
      
      console.log('✅ Mock workout data created!')
    }
    
    // Award some badges to test user
    console.log('\n🏅 Awarding badges to test user...')
    await client.query(`
      INSERT INTO user_badge (user_id, badge_id, notified)
      SELECT $1, id, TRUE FROM badge WHERE code IN ('first_workout', 'workout_10', 'streak_2', 'weight_50')
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `, [userId])
    console.log('✅ Badges awarded!')
    
    // Create second test user (buddy)
    console.log('\n👥 Creating second test user (buddy)...')
    const buddyResult = await client.query(`
      INSERT INTO app_user (email, full_name, display_name, gender_id, body_weight_kg, onboarding_completed, training_frequency_per_week, fitness_goal, experience_level, current_streak, longest_streak, total_points, hantel_coins)
      VALUES ('buddy@sculpt-app.de', 'Alex Trainer', 'Alex', 2, 65, TRUE, 4, 'strength', 'advanced', 5, 8, 280, 300)
      ON CONFLICT (email) DO UPDATE SET 
        display_name = EXCLUDED.display_name,
        onboarding_completed = EXCLUDED.onboarding_completed,
        current_streak = EXCLUDED.current_streak,
        hantel_coins = 300
      RETURNING id
    `)
    const buddyId = buddyResult.rows[0].id
    console.log('✅ Buddy user created!')
    
    // Create friendship between users
    console.log('\n🤝 Creating buddy friendship...')
    // Get the accepted status id
    const statusResult = await client.query("SELECT id FROM friendship_status WHERE code = 'accepted'")
    const acceptedStatusId = statusResult.rows[0]?.id || 2
    
    await client.query(`
      INSERT INTO friendship (requester_id, addressee_id, status_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status_id = $3
    `, [buddyId, userId, acceptedStatusId])
    console.log('✅ Buddy friendship created!')
    
    // Create mock workouts for buddy
    console.log('\n🏋️ Creating mock workouts for buddy...')
    if (benchId && squatId && rowId) {
      const buddyWorkoutData = [
        // Week 1
        { daysAgo: 20, exercises: [[benchId, 55, 12], [benchId, 60, 10], [benchId, 65, 8]] },
        { daysAgo: 18, exercises: [[squatId, 70, 12], [squatId, 80, 10], [squatId, 85, 8]] },
        { daysAgo: 16, exercises: [[rowId, 45, 12], [rowId, 55, 10], [rowId, 60, 8]] },
        { daysAgo: 15, exercises: [[benchId, 58, 12], [benchId, 63, 10], [benchId, 68, 8]] },
        // Week 2
        { daysAgo: 13, exercises: [[squatId, 75, 12], [squatId, 85, 10], [squatId, 90, 8]] },
        { daysAgo: 11, exercises: [[rowId, 48, 12], [rowId, 58, 10], [rowId, 63, 8]] },
        { daysAgo: 9, exercises: [[benchId, 60, 12], [benchId, 65, 10], [benchId, 70, 8]] },
        // Week 3
        { daysAgo: 6, exercises: [[squatId, 80, 12], [squatId, 90, 10], [squatId, 95, 8]] },
        { daysAgo: 4, exercises: [[rowId, 50, 12], [rowId, 60, 10], [rowId, 65, 8]] },
        { daysAgo: 2, exercises: [[benchId, 62, 12], [benchId, 68, 10], [benchId, 73, 8]] },
        // Current week
        { daysAgo: 0, exercises: [[squatId, 85, 12], [squatId, 95, 10], [squatId, 100, 8]] },
      ]
      
      for (const workout of buddyWorkoutData) {
        const sessionResult = await client.query(`
          INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned)
          VALUES ($1, NOW() - INTERVAL '${workout.daysAgo} days', NOW() - INTERVAL '${workout.daysAgo} days' + INTERVAL '50 minutes', 3000, 0, 380)
          RETURNING id
        `, [buddyId])
        
        const sessionId = sessionResult.rows[0].id
        let totalVolume = 0
        
        for (let i = 0; i < workout.exercises.length; i++) {
          const [exId, weight, reps] = workout.exercises[i]
          totalVolume += weight * reps
          await client.query(`
            INSERT INTO workout_set (workout_session_id, exercise_id, set_number, weight_kg, reps)
            VALUES ($1, $2, $3, $4, $5)
          `, [sessionId, exId, i + 1, weight, reps])
        }
        
        await client.query('UPDATE workout_session SET total_volume_kg = $1 WHERE id = $2', [totalVolume, sessionId])
      }
      console.log('✅ Buddy workout data created!')
    }
    
    // Award badges to buddy
    await client.query(`
      INSERT INTO user_badge (user_id, badge_id, notified)
      SELECT $1, id, TRUE FROM badge WHERE code IN ('first_workout', 'workout_10', 'workout_25', 'streak_2', 'streak_4', 'weight_50', 'weight_100')
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `, [buddyId])
    console.log('✅ Buddy badges awarded!')
    
    // Give users some loot boxes
    console.log('\n🎁 Adding loot boxes...')
    // Get rarity IDs from badge_rarity
    const commonRarityResult = await client.query("SELECT id FROM badge_rarity WHERE code = 'common'")
    const rareRarityResult = await client.query("SELECT id FROM badge_rarity WHERE code = 'rare'")
    const commonRarityId = commonRarityResult.rows[0]?.id || 1
    const rareRarityId = rareRarityResult.rows[0]?.id || 2
    
    await client.query(`
      INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining)
      VALUES ($1, $2, 3)
    `, [userId, commonRarityId])
    await client.query(`
      INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining)
      VALUES ($1, $2, 3)
    `, [userId, commonRarityId])
    await client.query(`
      INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining)
      VALUES ($1, $2, 3)
    `, [userId, rareRarityId])
    console.log('✅ Loot boxes added!')
    
  } finally {
    client.release()
    await pool.end()
  }
  
  console.log('\n🎉 All done!')
}

main().catch(console.error)
