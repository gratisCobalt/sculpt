import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pg from 'pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'sculpt-dev-secret-2026'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sculpt:sculpt_dev_2026@localhost:5432/sculpt',
})

app.use(cors())
app.use(express.json())

// Auth Middleware
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    ;(req as any).userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// =====================================================
// AUTH ROUTES
// =====================================================

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body
  
  try {
    // Check if user exists
    const existing = await pool.query('SELECT id FROM app_user WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO app_user (email, display_name, onboarding_completed) 
       VALUES ($1, $2, FALSE) RETURNING id, email, display_name, onboarding_completed`,
      [email, displayName]
    )
    
    // Store password hash (would need password column in schema - simplified for dev)
    const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({ user: result.rows[0], token })
  } catch (e) {
    console.error('Register error:', e)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  
  try {
    const result = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [email]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const user = result.rows[0]
    // For dev mode, accept any password for test user
    if (email === 'test@sculpt-app.de' && password === 'TestUser123!') {
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ user, token })
    }
    
    return res.status(401).json({ error: 'Invalid credentials' })
  } catch (e) {
    console.error('Login error:', e)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, g.code as gender_code, g.name_de as gender_name
       FROM app_user u
       LEFT JOIN gender g ON u.gender_id = g.id
       WHERE u.id = $1`,
      [(req as any).userId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json(result.rows[0])
  } catch (e) {
    console.error('Get user error:', e)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

// =====================================================
// USER ROUTES
// =====================================================

app.patch('/api/users/me', authMiddleware, async (req, res) => {
  const { display_name, gender_id, body_weight_kg, training_frequency_per_week, fitness_goal, experience_level, onboarding_completed } = req.body
  
  try {
    const result = await pool.query(
      `UPDATE app_user SET 
        display_name = COALESCE($2, display_name),
        gender_id = COALESCE($3, gender_id),
        body_weight_kg = COALESCE($4, body_weight_kg),
        training_frequency_per_week = COALESCE($5, training_frequency_per_week),
        fitness_goal = COALESCE($6, fitness_goal),
        experience_level = COALESCE($7, experience_level),
        onboarding_completed = COALESCE($8, onboarding_completed),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [(req as any).userId, display_name, gender_id, body_weight_kg, training_frequency_per_week, fitness_goal, experience_level, onboarding_completed]
    )
    
    res.json(result.rows[0])
  } catch (e) {
    console.error('Update user error:', e)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

app.post('/api/users/me/focus-areas', authMiddleware, async (req, res) => {
  const { body_part_ids } = req.body
  
  try {
    // Clear existing
    await pool.query('DELETE FROM user_focus_area WHERE user_id = $1', [(req as any).userId])
    
    // Insert new
    for (let i = 0; i < body_part_ids.length; i++) {
      await pool.query(
        'INSERT INTO user_focus_area (user_id, body_part_id, priority) VALUES ($1, $2, $3)',
        [(req as any).userId, body_part_ids[i], i + 1]
      )
    }
    
    res.json({ success: true })
  } catch (e) {
    console.error('Update focus areas error:', e)
    res.status(500).json({ error: 'Failed to update focus areas' })
  }
})

// =====================================================
// DASHBOARD ROUTES
// =====================================================

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  const { period = '7' } = req.query
  const days = parseInt(period as string)
  
  try {
    const userId = (req as any).userId
    
    // Current period stats
    const currentStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT ws.id) as total_workouts,
        COALESCE(SUM(ws.total_volume_kg), 0) as total_volume,
        COALESCE(SUM(ws.calories_burned), 0) as calories_burned
      FROM workout_session ws
      WHERE ws.user_id = $1 
        AND ws.started_at >= NOW() - INTERVAL '${days} days'
    `, [userId])
    
    // Previous period stats (for comparison)
    const prevStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT ws.id) as total_workouts,
        COALESCE(SUM(ws.total_volume_kg), 0) as total_volume
      FROM workout_session ws
      WHERE ws.user_id = $1 
        AND ws.started_at >= NOW() - INTERVAL '${days * 2} days'
        AND ws.started_at < NOW() - INTERVAL '${days} days'
    `, [userId])
    
    // Workouts this week
    const thisWeek = await pool.query(`
      SELECT COUNT(*) as count
      FROM workout_session ws
      WHERE ws.user_id = $1 
        AND ws.started_at >= DATE_TRUNC('week', NOW())
    `, [userId])
    
    // User data for target
    const user = await pool.query(
      'SELECT current_streak, training_frequency_per_week FROM app_user WHERE id = $1',
      [userId]
    )
    
    res.json({
      totalWorkouts: parseInt(currentStats.rows[0].total_workouts),
      totalVolume: parseFloat(currentStats.rows[0].total_volume),
      caloriesBurned: parseInt(currentStats.rows[0].calories_burned),
      currentStreak: user.rows[0]?.current_streak || 0,
      workoutsThisWeek: parseInt(thisWeek.rows[0].count),
      targetWorkoutsPerWeek: user.rows[0]?.training_frequency_per_week || 3,
      previousPeriodWorkouts: parseInt(prevStats.rows[0].total_workouts),
      previousPeriodVolume: parseFloat(prevStats.rows[0].total_volume),
    })
  } catch (e) {
    console.error('Dashboard stats error:', e)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

app.get('/api/dashboard/exercise-progress', authMiddleware, async (req, res) => {
  const { period = '7', bodyPart } = req.query
  const days = parseInt(period as string)
  
  try {
    const userId = (req as any).userId
    
    let query = `
      SELECT 
        e.id as exercise_id,
        e.name,
        e.image_url,
        (SELECT bp.code FROM body_part bp 
         JOIN exercise_body_part ebp ON bp.id = ebp.body_part_id 
         WHERE ebp.exercise_id = e.id 
         LIMIT 1) as primary_category,
        ws.id as set_id,
        ws.weight_kg,
        ws.reps,
        ws.set_number,
        ws.is_warmup,
        ws.is_pr,
        wse.started_at as date
      FROM workout_set ws
      JOIN workout_session wse ON ws.workout_session_id = wse.id
      JOIN exercise e ON ws.exercise_id = e.id
      WHERE wse.user_id = $1
        AND wse.started_at >= NOW() - INTERVAL '${days} days'
    `
    const params: any[] = [userId]
    
    if (bodyPart && bodyPart !== 'all') {
      query += ` AND EXISTS (
        SELECT 1 FROM exercise_body_part ebp 
        JOIN body_part bp ON ebp.body_part_id = bp.id 
        WHERE ebp.exercise_id = e.id AND LOWER(bp.code) = LOWER($2)
      )`
      params.push(bodyPart)
    }
    
    query += ' ORDER BY e.id, wse.started_at, ws.set_number'
    
    const result = await pool.query(query, params)
    
    // Group by exercise
    const exerciseMap = new Map<number, any>()
    
    for (const row of result.rows) {
      if (!exerciseMap.has(row.exercise_id)) {
        exerciseMap.set(row.exercise_id, {
          exercise: { 
            id: row.exercise_id, 
            name: row.name, 
            image_url: row.image_url,
            primary_category: row.primary_category?.toLowerCase() || 'other'
          },
          history: [],
          allSets: [],
          latestWeight: 0,
          latestReps: 0,
          maxWeight: 0,
          isPR: false,
        })
      }
      
      const data = exerciseMap.get(row.exercise_id)!
      data.history.push({
        date: row.date,
        weight: parseFloat(row.weight_kg),
        reps: row.reps,
        volume: parseFloat(row.weight_kg) * row.reps,
      })
      
      // Add to allSets for modal view
      data.allSets.push({
        id: row.set_id,
        date: row.date,
        weight: parseFloat(row.weight_kg),
        reps: row.reps,
        setNumber: row.set_number,
        isWarmup: row.is_warmup,
        isPR: row.is_pr,
      })
      
      if (parseFloat(row.weight_kg) > data.maxWeight) {
        data.maxWeight = parseFloat(row.weight_kg)
      }
    }
    
    // Set latest values and check PRs
    exerciseMap.forEach((data) => {
      if (data.history.length > 0) {
        const latest = data.history[data.history.length - 1]
        data.latestWeight = latest.weight
        data.latestReps = latest.reps
        data.isPR = latest.weight === data.maxWeight && data.history.length > 1
      }
    })
    
    res.json(Array.from(exerciseMap.values()))
  } catch (e) {
    console.error('Exercise progress error:', e)
    res.status(500).json({ error: 'Failed to get exercise progress' })
  }
})

// =====================================================
// EXERCISE ROUTES
// =====================================================

app.get('/api/exercises', async (req, res) => {
  const { search, bodyPart, limit = 50 } = req.query
  
  try {
    let query = `
      SELECT DISTINCT e.*, et.name_de as exercise_type_name
      FROM exercise e
      LEFT JOIN exercise_type et ON e.exercise_type_id = et.id
    `
    const params: any[] = []
    const conditions: string[] = []
    
    if (search) {
      conditions.push(`LOWER(e.name) LIKE LOWER($${params.length + 1})`)
      params.push(`%${search}%`)
    }
    
    if (bodyPart && bodyPart !== 'all') {
      conditions.push(`EXISTS (
        SELECT 1 FROM exercise_body_part ebp 
        JOIN body_part bp ON ebp.body_part_id = bp.id 
        WHERE ebp.exercise_id = e.id AND LOWER(bp.code) = LOWER($${params.length + 1})
      )`)
      params.push(bodyPart)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ` ORDER BY e.name LIMIT $${params.length + 1}`
    params.push(limit)
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (e) {
    console.error('Get exercises error:', e)
    res.status(500).json({ error: 'Failed to get exercises' })
  }
})

app.get('/api/exercises/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Get exercise with all details
    const exercise = await pool.query(`
      SELECT e.*, et.name_de as exercise_type_name
      FROM exercise e
      LEFT JOIN exercise_type et ON e.exercise_type_id = et.id
      WHERE e.id = $1
    `, [id])
    
    if (exercise.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' })
    }
    
    const data = exercise.rows[0]
    
    // Get body parts
    const bodyParts = await pool.query(`
      SELECT bp.* FROM body_part bp
      JOIN exercise_body_part ebp ON bp.id = ebp.body_part_id
      WHERE ebp.exercise_id = $1
    `, [id])
    
    // Get equipment
    const equipment = await pool.query(`
      SELECT eq.* FROM equipment eq
      JOIN exercise_equipment ee ON eq.id = ee.equipment_id
      WHERE ee.exercise_id = $1
    `, [id])
    
    // Get muscles
    const targetMuscles = await pool.query(`
      SELECT m.* FROM muscle m
      JOIN exercise_target_muscle etm ON m.id = etm.muscle_id
      WHERE etm.exercise_id = $1
    `, [id])
    
    const secondaryMuscles = await pool.query(`
      SELECT m.* FROM muscle m
      JOIN exercise_secondary_muscle esm ON m.id = esm.muscle_id
      WHERE esm.exercise_id = $1
    `, [id])
    
    // Get instructions
    const instructions = await pool.query(`
      SELECT * FROM exercise_instruction
      WHERE exercise_id = $1
      ORDER BY step_number
    `, [id])
    
    // Get tips
    const tips = await pool.query(`
      SELECT * FROM exercise_tip
      WHERE exercise_id = $1
      ORDER BY tip_number
    `, [id])
    
    // Get radar chart attributes
    const attributes = await pool.query(`
      SELECT eat.*, eav.value
      FROM exercise_attribute_value eav
      JOIN exercise_attribute_type eat ON eav.attribute_type_id = eat.id
      WHERE eav.exercise_id = $1
    `, [id])
    
    res.json({
      ...data,
      body_parts: bodyParts.rows,
      equipments: equipment.rows,
      target_muscles: targetMuscles.rows,
      secondary_muscles: secondaryMuscles.rows,
      instructions: instructions.rows,
      tips: tips.rows,
      attributes: attributes.rows.map(a => ({ type: { code: a.code, name_de: a.name_de }, value: a.value })),
    })
  } catch (e) {
    console.error('Get exercise error:', e)
    res.status(500).json({ error: 'Failed to get exercise' })
  }
})

// =====================================================
// TRAINING PLAN ROUTES
// =====================================================

app.get('/api/training-plans', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT tp.*, 
        (SELECT COUNT(*) FROM training_plan_day WHERE training_plan_id = tp.id) as total_days,
        (SELECT COUNT(*) FROM training_plan_exercise tpe 
         JOIN training_plan_day tpd ON tpe.training_plan_day_id = tpd.id 
         WHERE tpd.training_plan_id = tp.id) as total_exercises
      FROM training_plan tp
      WHERE tp.is_system_plan = TRUE
      ORDER BY tp.name
    `)
    res.json(result.rows)
  } catch (e) {
    console.error('Get training plans error:', e)
    res.status(500).json({ error: 'Failed to get training plans' })
  }
})

app.get('/api/training-plans/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const plan = await pool.query('SELECT * FROM training_plan WHERE id = $1', [id])
    if (plan.rows.length === 0) {
      return res.status(404).json({ error: 'Training plan not found' })
    }
    
    const days = await pool.query(`
      SELECT tpd.*, 
        json_agg(json_build_object(
          'id', tpe.id,
          'order_index', tpe.order_index,
          'sets', tpe.sets,
          'min_reps', tpe.min_reps,
          'max_reps', tpe.max_reps,
          'exercise', json_build_object(
            'id', e.id,
            'name', e.name,
            'image_url', e.image_url,
            'video_url', e.video_url
          )
        ) ORDER BY tpe.order_index) as exercises
      FROM training_plan_day tpd
      LEFT JOIN training_plan_exercise tpe ON tpd.id = tpe.training_plan_day_id
      LEFT JOIN exercise e ON tpe.exercise_id = e.id
      WHERE tpd.training_plan_id = $1
      GROUP BY tpd.id
      ORDER BY tpd.day_number
    `, [id])
    
    res.json({
      ...plan.rows[0],
      days: days.rows,
    })
  } catch (e) {
    console.error('Get training plan error:', e)
    res.status(500).json({ error: 'Failed to get training plan' })
  }
})

app.get('/api/users/me/training-plan', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT utp.*, tp.name, tp.name_de, tp.days_per_week
      FROM user_training_plan utp
      JOIN training_plan tp ON utp.training_plan_id = tp.id
      WHERE utp.user_id = $1 AND utp.is_active = TRUE
    `, [(req as any).userId])
    
    if (result.rows.length === 0) {
      return res.json(null)
    }
    
    // Get current day details
    const dayResult = await pool.query(`
      SELECT tpd.*, 
        json_agg(json_build_object(
          'id', tpe.id,
          'order_index', tpe.order_index,
          'sets', tpe.sets,
          'min_reps', tpe.min_reps,
          'max_reps', tpe.max_reps,
          'exercise', json_build_object(
            'id', e.id,
            'name', e.name,
            'image_url', e.image_url,
            'video_url', e.video_url
          )
        ) ORDER BY tpe.order_index) as exercises
      FROM training_plan_day tpd
      LEFT JOIN training_plan_exercise tpe ON tpd.id = tpe.training_plan_day_id
      LEFT JOIN exercise e ON tpe.exercise_id = e.id
      WHERE tpd.training_plan_id = $1 AND tpd.day_number = $2
      GROUP BY tpd.id
    `, [result.rows[0].training_plan_id, result.rows[0].current_day])
    
    res.json({
      ...result.rows[0],
      current_day_details: dayResult.rows[0] || null,
    })
  } catch (e) {
    console.error('Get user training plan error:', e)
    res.status(500).json({ error: 'Failed to get training plan' })
  }
})

// =====================================================
// WORKOUT ROUTES
// =====================================================

app.post('/api/workouts', authMiddleware, async (req, res) => {
  const { training_plan_day_id, sets } = req.body
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Create workout session
    const session = await client.query(`
      INSERT INTO workout_session (user_id, training_plan_day_id, started_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `, [(req as any).userId, training_plan_day_id])
    
    const sessionId = session.rows[0].id
    let totalVolume = 0
    let totalCalories = 0
    
    // Insert sets
    for (const set of sets) {
      await client.query(`
        INSERT INTO workout_set (workout_session_id, exercise_id, set_number, weight_kg, reps, is_warmup, rpe)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [sessionId, set.exercise_id, set.set_number, set.weight_kg, set.reps, set.is_warmup || false, set.rpe])
      
      if (!set.is_warmup) {
        totalVolume += set.weight_kg * set.reps
        
        // Calculate calories based on MET value
        const exercise = await client.query('SELECT met_value FROM exercise WHERE id = $1', [set.exercise_id])
        const met = exercise.rows[0]?.met_value || 5
        // Rough estimate: MET * weight(kg) * duration(hours) - assume ~30 seconds per set
        totalCalories += (met * 80 * 0.5) / 60 // Using 80kg default body weight
      }
    }
    
    // Update session with totals
    await client.query(`
      UPDATE workout_session 
      SET completed_at = NOW(), 
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at)),
          total_volume_kg = $2,
          calories_burned = $3
      WHERE id = $1
    `, [sessionId, totalVolume, Math.round(totalCalories)])
    
    // Update user's last workout and check streak
    await client.query(`
      UPDATE app_user 
      SET last_workout_at = NOW(),
          current_streak = CASE 
            WHEN last_workout_at >= NOW() - INTERVAL '7 days' THEN current_streak + 1
            ELSE 1
          END,
          longest_streak = GREATEST(longest_streak, current_streak + 1)
      WHERE id = $1
    `, [(req as any).userId])

    // ===== AUTO-BRAG: Create activity feed item for buddies =====
    try {
      // Get user info for the activity
      const userInfo = await client.query(
        'SELECT display_name FROM app_user WHERE id = $1',
        [(req as any).userId]
      )
      const userName = userInfo.rows[0]?.display_name || 'Jemand'

      // Get activity type for workout_completed
      const activityType = await client.query(
        "SELECT id FROM activity_type WHERE slug = 'workout_completed'"
      )

      if (activityType.rows.length > 0) {
        await client.query(`
          INSERT INTO activity_feed_item (user_id, activity_type_id, metadata)
          VALUES ($1, $2, $3)
        `, [
          (req as any).userId,
          activityType.rows[0].id,
          JSON.stringify({
            session_id: sessionId,
            total_volume: totalVolume,
            set_count: sets.length,
            workout_name: userName + ' hat trainiert'
          })
        ])
      }
    } catch (bragErr) {
      console.error('Auto-brag error (non-fatal):', bragErr)
    }
    
    await client.query('COMMIT')
    
    res.json(session.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Create workout error:', e)
    res.status(500).json({ error: 'Failed to create workout' })
  } finally {
    client.release()
  }
})

// Get last workout data for a specific exercise (for placeholder hints)
app.get('/api/exercises/:id/last-workout', authMiddleware, async (req, res) => {
  const { id } = req.params
  
  try {
    const result = await pool.query(`
      SELECT 
        ws.set_number,
        ws.weight_kg,
        ws.reps,
        ws.is_warmup,
        wse.started_at
      FROM workout_set ws
      JOIN workout_session wse ON ws.workout_session_id = wse.id
      WHERE wse.user_id = $1 
        AND ws.exercise_id = $2
        AND wse.started_at = (
          SELECT MAX(wse2.started_at) 
          FROM workout_session wse2 
          JOIN workout_set ws2 ON wse2.id = ws2.workout_session_id
          WHERE wse2.user_id = $1 AND ws2.exercise_id = $2
        )
      ORDER BY ws.set_number ASC
    `, [(req as any).userId, id])
    
    // Return als Object mit set_number als Key für einfachen Zugriff
    const setsByNumber: Record<number, { weight: number; reps: number; isWarmup: boolean }> = {}
    for (const row of result.rows) {
      setsByNumber[row.set_number] = {
        weight: parseFloat(row.weight_kg),
        reps: row.reps,
        isWarmup: row.is_warmup
      }
    }
    
    res.json({
      lastWorkoutDate: result.rows[0]?.started_at || null,
      sets: setsByNumber
    })
  } catch (e) {
    console.error('Get last workout error:', e)
    res.status(500).json({ error: 'Failed to get last workout' })
  }
})

app.get('/api/workouts', authMiddleware, async (req, res) => {
  const { limit = 20 } = req.query
  
  try {
    const result = await pool.query(`
      SELECT ws.*, 
        json_agg(json_build_object(
          'id', wset.id,
          'exercise_id', wset.exercise_id,
          'exercise_name', e.name,
          'set_number', wset.set_number,
          'weight_kg', wset.weight_kg,
          'reps', wset.reps
        ) ORDER BY wset.set_number) as sets
      FROM workout_session ws
      LEFT JOIN workout_set wset ON ws.id = wset.workout_session_id
      LEFT JOIN exercise e ON wset.exercise_id = e.id
      WHERE ws.user_id = $1
      GROUP BY ws.id
      ORDER BY ws.started_at DESC
      LIMIT $2
    `, [(req as any).userId, limit])
    
    res.json(result.rows)
  } catch (e) {
    console.error('Get workouts error:', e)
    res.status(500).json({ error: 'Failed to get workouts' })
  }
})

// Update a workout set
app.patch('/api/workout-sets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { weight_kg, reps } = req.body
  
  try {
    // Verify the set belongs to this user
    const check = await pool.query(`
      SELECT ws.id FROM workout_set ws
      JOIN workout_session wse ON ws.workout_session_id = wse.id
      WHERE ws.id = $1 AND wse.user_id = $2
    `, [id, (req as any).userId])
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' })
    }
    
    const updates: string[] = []
    const params: any[] = []
    let paramCount = 1
    
    if (weight_kg !== undefined) {
      updates.push(`weight_kg = $${paramCount++}`)
      params.push(weight_kg)
    }
    if (reps !== undefined) {
      updates.push(`reps = $${paramCount++}`)
      params.push(reps)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }
    
    params.push(id)
    const result = await pool.query(`
      UPDATE workout_set SET ${updates.join(', ')} WHERE id = $${paramCount}
      RETURNING *
    `, params)
    
    // Update session totals
    await pool.query(`
      UPDATE workout_session ws
      SET total_volume_kg = (
        SELECT COALESCE(SUM(weight_kg * reps), 0)
        FROM workout_set
        WHERE workout_session_id = ws.id AND NOT is_warmup
      )
      WHERE id = (SELECT workout_session_id FROM workout_set WHERE id = $1)
    `, [id])
    
    res.json(result.rows[0])
  } catch (e) {
    console.error('Update set error:', e)
    res.status(500).json({ error: 'Failed to update set' })
  }
})

// Delete a workout set
app.delete('/api/workout-sets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  
  try {
    // Verify the set belongs to this user
    const check = await pool.query(`
      SELECT ws.id, ws.workout_session_id FROM workout_set ws
      JOIN workout_session wse ON ws.workout_session_id = wse.id
      WHERE ws.id = $1 AND wse.user_id = $2
    `, [id, (req as any).userId])
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' })
    }
    
    const sessionId = check.rows[0].workout_session_id
    
    await pool.query('DELETE FROM workout_set WHERE id = $1', [id])
    
    // Update session totals
    await pool.query(`
      UPDATE workout_session
      SET total_volume_kg = (
        SELECT COALESCE(SUM(weight_kg * reps), 0)
        FROM workout_set
        WHERE workout_session_id = $1 AND NOT is_warmup
      )
      WHERE id = $1
    `, [sessionId])
    
    res.json({ success: true })
  } catch (e) {
    console.error('Delete set error:', e)
    res.status(500).json({ error: 'Failed to delete set' })
  }
})

// =====================================================
// BADGE ROUTES
// =====================================================

app.get('/api/badges', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, br.code as rarity_code, br.name_de as rarity_name, br.color_hex as rarity_color
      FROM badge b
      JOIN badge_rarity br ON b.rarity_id = br.id
      ORDER BY b.rarity_id DESC, b.points DESC
    `)
    res.json(result.rows)
  } catch (e) {
    console.error('Get badges error:', e)
    res.status(500).json({ error: 'Failed to get badges' })
  }
})

app.get('/api/users/me/badges', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ub.*, b.code, b.name_de, b.description_de, b.icon_name, b.points,
             br.code as rarity_code, br.name_de as rarity_name, br.color_hex as rarity_color
      FROM user_badge ub
      JOIN badge b ON ub.badge_id = b.id
      JOIN badge_rarity br ON b.rarity_id = br.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [(req as any).userId])
    res.json(result.rows)
  } catch (e) {
    console.error('Get user badges error:', e)
    res.status(500).json({ error: 'Failed to get badges' })
  }
})

app.get('/api/users/me/badges/check', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId
    const newBadges: any[] = []
    
    // Get user stats
    const userStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM workout_session WHERE user_id = $1) as total_workouts,
        (SELECT COALESCE(SUM(total_volume_kg), 0) FROM workout_session WHERE user_id = $1) as total_volume,
        (SELECT MAX(weight_kg) FROM workout_set ws JOIN workout_session wse ON ws.workout_session_id = wse.id WHERE wse.user_id = $1) as max_weight,
        (SELECT current_streak FROM app_user WHERE id = $1) as current_streak
    `, [userId])
    
    const stats = userStats.rows[0]
    
    // Get badges user doesn't have
    const unearned = await pool.query(`
      SELECT b.*, br.code as rarity_code, br.name_de as rarity_name, br.color_hex as rarity_color
      FROM badge b
      JOIN badge_rarity br ON b.rarity_id = br.id
      WHERE b.id NOT IN (SELECT badge_id FROM user_badge WHERE user_id = $1)
    `, [userId])
    
    // Check each badge
    for (const badge of unearned.rows) {
      let earned = false
      
      switch (badge.category) {
        case 'workout_count':
          earned = parseInt(stats.total_workouts) >= badge.threshold_value
          break
        case 'streak':
          earned = parseInt(stats.current_streak) >= badge.threshold_value
          break
        case 'weight':
          earned = parseFloat(stats.max_weight) >= badge.threshold_value
          break
        case 'volume':
          earned = parseFloat(stats.total_volume) >= badge.threshold_value
          break
      }
      
      if (earned) {
        await pool.query(
          'INSERT INTO user_badge (user_id, badge_id, notified) VALUES ($1, $2, FALSE)',
          [userId, badge.id]
        )
        
        // Update user points
        await pool.query(
          'UPDATE app_user SET total_points = total_points + $2 WHERE id = $1',
          [userId, badge.points]
        )
        
        // ===== AUTO-BRAG: Create activity feed item for badge =====
        try {
          const activityType = await pool.query(
            "SELECT id FROM activity_type WHERE slug = 'badge_earned'"
          )
          
          if (activityType.rows.length > 0) {
            await pool.query(`
              INSERT INTO activity_feed_item (user_id, activity_type_id, metadata)
              VALUES ($1, $2, $3)
            `, [
              userId,
              activityType.rows[0].id,
              JSON.stringify({
                badge_id: badge.id,
                badge_name: badge.name_de,
                badge_icon: badge.icon,
                badge_rarity: badge.rarity_code,
                points: badge.points
              })
            ])
          }
        } catch (bragErr) {
          console.error('Badge auto-brag error (non-fatal):', bragErr)
        }
        
        newBadges.push(badge)
      }
    }
    
    res.json({ newBadges })
  } catch (e) {
    console.error('Check badges error:', e)
    res.status(500).json({ error: 'Failed to check badges' })
  }
})

app.post('/api/users/me/badges/:badgeId/notify', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_badge SET notified = TRUE WHERE user_id = $1 AND badge_id = $2',
      [(req as any).userId, req.params.badgeId]
    )
    res.json({ success: true })
  } catch (e) {
    console.error('Notify badge error:', e)
    res.status(500).json({ error: 'Failed to update badge notification' })
  }
})

// =====================================================
// LOOKUP ROUTES
// =====================================================

app.get('/api/body-parts', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM body_part ORDER BY name_de')
    res.json(result.rows)
  } catch (e) {
    console.error('Get body parts error:', e)
    res.status(500).json({ error: 'Failed to get body parts' })
  }
})

app.get('/api/genders', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gender ORDER BY id')
    res.json(result.rows)
  } catch (e) {
    console.error('Get genders error:', e)
    res.status(500).json({ error: 'Failed to get genders' })
  }
})

// =====================================================
// BUDDY SYSTEM ROUTES
// =====================================================

// Search for users to add as buddies
app.get('/api/users/search', authMiddleware, async (req, res) => {
  const { q } = req.query
  
  if (!q || (q as string).length < 2) {
    return res.json([])
  }
  
  try {
    const result = await pool.query(`
      SELECT id, display_name, avatar_url, current_streak, full_name
      FROM app_user
      WHERE id != $1
        AND onboarding_completed = TRUE
        AND (
          LOWER(display_name) LIKE LOWER($2) 
          OR LOWER(email) LIKE LOWER($2)
          OR LOWER(full_name) LIKE LOWER($2)
        )
      LIMIT 20
    `, [(req as any).userId, `%${q}%`])
    
    res.json(result.rows)
  } catch (e) {
    console.error('Search users error:', e)
    res.status(500).json({ error: 'Failed to search users' })
  }
})

// Get all buddies (friends)
app.get('/api/buddies', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId
    
    const result = await pool.query(`
      SELECT 
        f.id as friendship_id,
        f.friend_streak,
        f.last_both_trained_at,
        f.created_at as friends_since,
        fs.code as status,
        CASE WHEN f.requester_id = $1 THEN 'sent' ELSE 'received' END as direction,
        u.id as user_id,
        u.display_name,
        u.avatar_url,
        u.current_streak,
        u.last_workout_at
      FROM friendship f
      JOIN friendship_status fs ON f.status_id = fs.id
      JOIN app_user u ON (
        CASE 
          WHEN f.requester_id = $1 THEN f.addressee_id 
          ELSE f.requester_id 
        END = u.id
      )
      WHERE f.requester_id = $1 OR f.addressee_id = $1
      ORDER BY 
        CASE fs.code WHEN 'pending' THEN 0 ELSE 1 END,
        f.friend_streak DESC
    `, [userId])
    
    res.json(result.rows)
  } catch (e) {
    console.error('Get buddies error:', e)
    res.status(500).json({ error: 'Failed to get buddies' })
  }
})

// Send friend request
app.post('/api/buddies/request', authMiddleware, async (req, res) => {
  const { userId: addresseeId } = req.body
  
  try {
    const userId = (req as any).userId
    
    // Check if friendship already exists
    const existing = await pool.query(`
      SELECT id FROM friendship 
      WHERE (requester_id = $1 AND addressee_id = $2) 
         OR (requester_id = $2 AND addressee_id = $1)
    `, [userId, addresseeId])
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Friendship already exists' })
    }
    
    // Get pending status id
    const statusResult = await pool.query(
      "SELECT id FROM friendship_status WHERE code = 'pending'"
    )
    
    const result = await pool.query(`
      INSERT INTO friendship (requester_id, addressee_id, status_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, addresseeId, statusResult.rows[0].id])
    
    // Create notification for addressee
    const notifType = await pool.query(
      "SELECT id FROM notification_type WHERE code = 'friend_request'"
    )
    const sender = await pool.query(
      'SELECT display_name FROM app_user WHERE id = $1',
      [userId]
    )
    
    await pool.query(`
      INSERT INTO notification (user_id, notification_type_id, sender_id, title, body)
      VALUES ($1, $2, $3, 'Freundschaftsanfrage', $4)
    `, [
      addresseeId,
      notifType.rows[0].id,
      userId,
      `${sender.rows[0].display_name} möchte dein Buddy sein!`
    ])
    
    res.json(result.rows[0])
  } catch (e) {
    console.error('Send friend request error:', e)
    res.status(500).json({ error: 'Failed to send friend request' })
  }
})

// Accept/reject friend request
app.patch('/api/buddies/:friendshipId', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params
  const { action } = req.body // 'accept' or 'reject'
  
  try {
    const userId = (req as any).userId
    
    // Verify user is the addressee
    const friendship = await pool.query(`
      SELECT * FROM friendship WHERE id = $1 AND addressee_id = $2
    `, [friendshipId, userId])
    
    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' })
    }
    
    if (action === 'accept') {
      const statusResult = await pool.query(
        "SELECT id FROM friendship_status WHERE code = 'accepted'"
      )
      
      await pool.query(`
        UPDATE friendship SET status_id = $2, updated_at = NOW() WHERE id = $1
      `, [friendshipId, statusResult.rows[0].id])
      
      // Notify requester
      const notifType = await pool.query(
        "SELECT id FROM notification_type WHERE code = 'friend_accepted'"
      )
      const accepter = await pool.query(
        'SELECT display_name FROM app_user WHERE id = $1',
        [userId]
      )
      
      await pool.query(`
        INSERT INTO notification (user_id, notification_type_id, sender_id, title, body)
        VALUES ($1, $2, $3, 'Anfrage akzeptiert', $4)
      `, [
        friendship.rows[0].requester_id,
        notifType.rows[0].id,
        userId,
        `${accepter.rows[0].display_name} hat deine Anfrage akzeptiert!`
      ])
      
      res.json({ success: true, status: 'accepted' })
    } else if (action === 'reject') {
      await pool.query('DELETE FROM friendship WHERE id = $1', [friendshipId])
      res.json({ success: true, status: 'rejected' })
    } else {
      res.status(400).json({ error: 'Invalid action' })
    }
  } catch (e) {
    console.error('Update friendship error:', e)
    res.status(500).json({ error: 'Failed to update friendship' })
  }
})

// Remove buddy
app.delete('/api/buddies/:friendshipId', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params
  
  try {
    const userId = (req as any).userId
    
    await pool.query(`
      DELETE FROM friendship 
      WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)
    `, [friendshipId, userId])
    
    res.json({ success: true })
  } catch (e) {
    console.error('Remove buddy error:', e)
    res.status(500).json({ error: 'Failed to remove buddy' })
  }
})

// Send reminder to buddy
app.post('/api/buddies/:friendshipId/remind', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params
  
  try {
    const userId = (req as any).userId
    
    // Get friendship and buddy
    const friendship = await pool.query(`
      SELECT 
        f.*,
        CASE WHEN f.requester_id = $2 THEN f.addressee_id ELSE f.requester_id END as buddy_id
      FROM friendship f
      JOIN friendship_status fs ON f.status_id = fs.id
      WHERE f.id = $1 
        AND (f.requester_id = $2 OR f.addressee_id = $2)
        AND fs.code = 'accepted'
    `, [friendshipId, userId])
    
    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' })
    }
    
    const buddyId = friendship.rows[0].buddy_id
    
    // Create notification
    const notifType = await pool.query(
      "SELECT id FROM notification_type WHERE code = 'buddy_reminder'"
    )
    const sender = await pool.query(
      'SELECT display_name FROM app_user WHERE id = $1',
      [userId]
    )
    
    await pool.query(`
      INSERT INTO notification (user_id, notification_type_id, sender_id, title, body)
      VALUES ($1, $2, $3, 'Buddy-Erinnerung', $4)
    `, [
      buddyId,
      notifType.rows[0].id,
      userId,
      `${sender.rows[0].display_name} sagt: Zeit für dein Training!`
    ])
    
    res.json({ success: true })
  } catch (e) {
    console.error('Send reminder error:', e)
    res.status(500).json({ error: 'Failed to send reminder' })
  }
})

// Get notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
  const { unreadOnly = 'false', limit = 50 } = req.query
  
  try {
    const userId = (req as any).userId
    
    let query = `
      SELECT n.*, nt.code as type_code, nt.icon_name,
             s.display_name as sender_name, s.avatar_url as sender_avatar
      FROM notification n
      JOIN notification_type nt ON n.notification_type_id = nt.id
      LEFT JOIN app_user s ON n.sender_id = s.id
      WHERE n.user_id = $1
    `
    const params: any[] = [userId]
    
    if (unreadOnly === 'true') {
      query += ' AND n.is_read = FALSE'
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT $2'
    params.push(limit)
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (e) {
    console.error('Get notifications error:', e)
    res.status(500).json({ error: 'Failed to get notifications' })
  }
})

// Mark notifications as read
app.patch('/api/notifications/read', authMiddleware, async (req, res) => {
  const { notificationIds } = req.body // array of IDs or 'all'
  
  try {
    const userId = (req as any).userId
    
    if (notificationIds === 'all') {
      await pool.query(
        'UPDATE notification SET is_read = TRUE WHERE user_id = $1',
        [userId]
      )
    } else if (Array.isArray(notificationIds)) {
      await pool.query(`
        UPDATE notification SET is_read = TRUE 
        WHERE user_id = $1 AND id = ANY($2)
      `, [userId, notificationIds])
    }
    
    res.json({ success: true })
  } catch (e) {
    console.error('Mark notifications read error:', e)
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

// Get activity feed (buddies' achievements)
app.get('/api/activity-feed', authMiddleware, async (req, res) => {
  const { limit = 30 } = req.query
  
  try {
    const userId = (req as any).userId
    
    const result = await pool.query(`
      SELECT 
        afi.*,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM activity_congrats WHERE activity_feed_item_id = afi.id) as congrats_count,
        EXISTS(SELECT 1 FROM activity_congrats WHERE activity_feed_item_id = afi.id AND user_id = $1) as has_congrats
      FROM activity_feed_item afi
      JOIN app_user u ON afi.user_id = u.id
      WHERE afi.visibility = 'friends'
        AND afi.user_id IN (
          SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
          FROM friendship f
          JOIN friendship_status fs ON f.status_id = fs.id
          WHERE (requester_id = $1 OR addressee_id = $1) AND fs.code = 'accepted'
        )
      ORDER BY afi.created_at DESC
      LIMIT $2
    `, [userId, limit])
    
    res.json(result.rows)
  } catch (e) {
    console.error('Get activity feed error:', e)
    res.status(500).json({ error: 'Failed to get activity feed' })
  }
})

// Send congrats on activity
app.post('/api/activity-feed/:itemId/congrats', authMiddleware, async (req, res) => {
  const { itemId } = req.params
  const { emoji = '🎉' } = req.body
  
  try {
    const userId = (req as any).userId
    
    // Check if item exists and user can see it
    const item = await pool.query(`
      SELECT afi.*, u.display_name as owner_name
      FROM activity_feed_item afi
      JOIN app_user u ON afi.user_id = u.id
      WHERE afi.id = $1
    `, [itemId])
    
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    
    // Insert congrats
    await pool.query(`
      INSERT INTO activity_congrats (activity_feed_item_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT (activity_feed_item_id, user_id) DO UPDATE SET emoji = $3
    `, [itemId, userId, emoji])
    
    // Notify the activity owner
    const notifType = await pool.query(
      "SELECT id FROM notification_type WHERE code = 'congrats_received'"
    )
    const sender = await pool.query(
      'SELECT display_name FROM app_user WHERE id = $1',
      [userId]
    )
    
    await pool.query(`
      INSERT INTO notification (user_id, notification_type_id, sender_id, title, body)
      VALUES ($1, $2, $3, 'Gratulation erhalten', $4)
    `, [
      item.rows[0].user_id,
      notifType.rows[0].id,
      userId,
      `${sender.rows[0].display_name} gratuliert dir! ${emoji}`
    ])
    
    res.json({ success: true })
  } catch (e) {
    console.error('Send congrats error:', e)
    res.status(500).json({ error: 'Failed to send congrats' })
  }
})

// =====================================================
// CHAT ROUTES (E2E Encrypted)
// =====================================================

// Get/Upload encryption keys
app.get('/api/encryption/keys', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId
    
    const result = await pool.query(`
      SELECT identity_public_key, signed_prekey_public, signed_prekey_signature
      FROM user_encryption_key
      WHERE user_id = $1
    `, [userId])
    
    if (result.rows.length === 0) {
      return res.json(null)
    }
    
    // Also get available prekeys
    const prekeys = await pool.query(`
      SELECT prekey_id, public_key FROM user_prekey
      WHERE user_id = $1 AND NOT is_used
      ORDER BY prekey_id
    `, [userId])
    
    res.json({
      ...result.rows[0],
      prekeys: prekeys.rows,
    })
  } catch (e) {
    console.error('Get keys error:', e)
    res.status(500).json({ error: 'Failed to get keys' })
  }
})

app.post('/api/encryption/keys', authMiddleware, async (req, res) => {
  const { identityPublicKey, signedPrekeyPublic, signedPrekeySignature, prekeys } = req.body
  
  try {
    const userId = (req as any).userId
    
    // Upsert main keys
    await pool.query(`
      INSERT INTO user_encryption_key (user_id, identity_public_key, signed_prekey_public, signed_prekey_signature)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        identity_public_key = $2,
        signed_prekey_public = $3,
        signed_prekey_signature = $4,
        updated_at = NOW()
    `, [userId, identityPublicKey, signedPrekeyPublic, signedPrekeySignature])
    
    // Insert prekeys
    if (prekeys && Array.isArray(prekeys)) {
      for (const pk of prekeys) {
        await pool.query(`
          INSERT INTO user_prekey (user_id, prekey_id, public_key)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, prekey_id) DO UPDATE SET public_key = $3, is_used = FALSE
        `, [userId, pk.id, pk.publicKey])
      }
    }
    
    res.json({ success: true })
  } catch (e) {
    console.error('Upload keys error:', e)
    res.status(500).json({ error: 'Failed to upload keys' })
  }
})

// Get buddy's keys for initiating chat
app.get('/api/buddies/:friendshipId/keys', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params
  
  try {
    const userId = (req as any).userId
    
    // Get buddy id
    const friendship = await pool.query(`
      SELECT 
        CASE WHEN requester_id = $2 THEN addressee_id ELSE requester_id END as buddy_id
      FROM friendship f
      JOIN friendship_status fs ON f.status_id = fs.id
      WHERE f.id = $1 AND (f.requester_id = $2 OR f.addressee_id = $2) AND fs.code = 'accepted'
    `, [friendshipId, userId])
    
    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' })
    }
    
    const buddyId = friendship.rows[0].buddy_id
    
    // Get buddy's keys
    const keys = await pool.query(`
      SELECT identity_public_key, signed_prekey_public, signed_prekey_signature
      FROM user_encryption_key
      WHERE user_id = $1
    `, [buddyId])
    
    if (keys.rows.length === 0) {
      return res.json({ error: 'Buddy has not set up encryption' })
    }
    
    // Get one prekey and mark as used
    const prekey = await pool.query(`
      UPDATE user_prekey
      SET is_used = TRUE
      WHERE id = (
        SELECT id FROM user_prekey 
        WHERE user_id = $1 AND NOT is_used 
        ORDER BY prekey_id LIMIT 1
      )
      RETURNING prekey_id, public_key
    `, [buddyId])
    
    res.json({
      ...keys.rows[0],
      oneTimePrekey: prekey.rows[0] || null,
    })
  } catch (e) {
    console.error('Get buddy keys error:', e)
    res.status(500).json({ error: 'Failed to get buddy keys' })
  }
})

// Send encrypted message
app.post('/api/buddies/:friendshipId/messages', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params
  const { encryptedContent, ephemeralPublicKey, mac, nonce, messageType, referenceType, referenceId } = req.body
  
  try {
    const userId = (req as any).userId
    
    // Verify friendship
    const friendship = await pool.query(`
      SELECT * FROM friendship f
      JOIN friendship_status fs ON f.status_id = fs.id
      WHERE f.id = $1 AND (f.requester_id = $2 OR f.addressee_id = $2) AND fs.code = 'accepted'
    `, [friendshipId, userId])
    
    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' })
    }
    
    const result = await pool.query(`
      INSERT INTO chat_message (friendship_id, sender_id, encrypted_content, ephemeral_public_key, mac, nonce, message_type, reference_type, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [friendshipId, userId, encryptedContent, ephemeralPublicKey, mac, nonce, messageType || 'text', referenceType, referenceId])
    
    res.json(result.rows[0])
  } catch (e) {
    console.error('Send message error:', e)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// Get chat messages
app.get('/api/buddies/:friendshipId/messages', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params
  const { limit = 50, before } = req.query
  
  try {
    const userId = (req as any).userId
    
    // Verify friendship
    const friendship = await pool.query(`
      SELECT * FROM friendship f
      JOIN friendship_status fs ON f.status_id = fs.id
      WHERE f.id = $1 AND (f.requester_id = $2 OR f.addressee_id = $2) AND fs.code = 'accepted'
    `, [friendshipId, userId])
    
    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' })
    }
    
    let query = `
      SELECT cm.*, u.display_name as sender_name
      FROM chat_message cm
      JOIN app_user u ON cm.sender_id = u.id
      WHERE cm.friendship_id = $1
    `
    const params: any[] = [friendshipId]
    
    if (before) {
      query += ' AND cm.created_at < $2'
      params.push(before)
    }
    
    query += ' ORDER BY cm.created_at DESC LIMIT $' + (params.length + 1)
    params.push(limit)
    
    const result = await pool.query(query, params)
    
    // Mark messages as read
    await pool.query(`
      UPDATE chat_message SET is_read = TRUE
      WHERE friendship_id = $1 AND sender_id != $2 AND NOT is_read
    `, [friendshipId, userId])
    
    res.json(result.rows.reverse())
  } catch (e) {
    console.error('Get messages error:', e)
    res.status(500).json({ error: 'Failed to get messages' })
  }
})

// =====================================================
// PUSH NOTIFICATION ROUTES
// =====================================================

app.post('/api/push-tokens', authMiddleware, async (req, res) => {
  const { token, platform } = req.body
  
  try {
    const userId = (req as any).userId
    
    await pool.query(`
      INSERT INTO push_token (user_id, token, platform)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, token) DO UPDATE SET last_used_at = NOW()
    `, [userId, token, platform])
    
    res.json({ success: true })
  } catch (e) {
    console.error('Save push token error:', e)
    res.status(500).json({ error: 'Failed to save push token' })
  }
})

app.delete('/api/push-tokens', authMiddleware, async (req, res) => {
  const { token } = req.body
  
  try {
    await pool.query(
      'DELETE FROM push_token WHERE user_id = $1 AND token = $2',
      [(req as any).userId, token]
    )
    res.json({ success: true })
  } catch (e) {
    console.error('Delete push token error:', e)
    res.status(500).json({ error: 'Failed to delete push token' })
  }
})

// =====================================================
// SHOP ROUTES
// =====================================================

app.get('/api/shop/items', authMiddleware, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT si.*, 
             sic.code as category_code, 
             sic.name_de as category_name,
             br.code as rarity_code,
             br.name_de as rarity_name
      FROM shop_item si
      JOIN shop_item_category sic ON si.category_id = sic.id
      LEFT JOIN badge_rarity br ON si.rarity_id = br.id
      WHERE si.is_active = TRUE
      ORDER BY sic.id, si.price_coins
    `)
    res.json(result.rows)
  } catch (e) {
    console.error('Get shop items error:', e)
    res.status(500).json({ error: 'Failed to get shop items' })
  }
})

app.get('/api/shop/inventory', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ui.*, si.code, si.name_de, si.icon_name, si.max_stack
      FROM user_inventory ui
      JOIN shop_item si ON ui.shop_item_id = si.id
      WHERE ui.user_id = $1 AND ui.quantity > 0
    `, [(req as any).userId])
    res.json(result.rows)
  } catch (e) {
    console.error('Get inventory error:', e)
    res.status(500).json({ error: 'Failed to get inventory' })
  }
})

app.post('/api/shop/purchase', authMiddleware, async (req, res) => {
  const { item_id, quantity = 1 } = req.body
  const userId = (req as any).userId
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Get item and user info
    const item = await client.query('SELECT * FROM shop_item WHERE id = $1 AND is_active = TRUE', [item_id])
    if (item.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Item not found' })
    }
    
    const user = await client.query('SELECT hantel_coins FROM app_user WHERE id = $1 FOR UPDATE', [userId])
    const totalCost = item.rows[0].price_coins * quantity
    
    if (user.rows[0].hantel_coins < totalCost) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Insufficient coins' })
    }
    
    // Check max stack
    if (item.rows[0].max_stack) {
      const current = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND shop_item_id = $2',
        [userId, item_id]
      )
      const currentQty = current.rows[0]?.quantity || 0
      if (currentQty + quantity > item.rows[0].max_stack) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Max stack reached' })
      }
    }
    
    // Deduct coins
    await client.query(
      'UPDATE app_user SET hantel_coins = hantel_coins - $2 WHERE id = $1',
      [userId, totalCost]
    )
    
    // Add to inventory
    await client.query(`
      INSERT INTO user_inventory (user_id, shop_item_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, shop_item_id) DO UPDATE SET quantity = user_inventory.quantity + $3
    `, [userId, item_id, quantity])
    
    // Record purchase
    await client.query(`
      INSERT INTO purchase_history (user_id, shop_item_id, quantity, total_price)
      VALUES ($1, $2, $3, $4)
    `, [userId, item_id, quantity, totalCost])
    
    await client.query('COMMIT')
    
    const newBalance = await pool.query('SELECT hantel_coins FROM app_user WHERE id = $1', [userId])
    res.json({ success: true, new_balance: newBalance.rows[0].hantel_coins })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Purchase error:', e)
    res.status(500).json({ error: 'Purchase failed' })
  } finally {
    client.release()
  }
})

app.post('/api/shop/activate-streak-saver', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Check if user has streak saver in inventory
    const streakSaverItem = await client.query(
      `SELECT si.id FROM shop_item si WHERE si.code = 'streak_saver'`
    )
    
    if (streakSaverItem.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Streak saver item not found' })
    }
    
    const inventory = await client.query(
      'SELECT quantity FROM user_inventory WHERE user_id = $1 AND shop_item_id = $2 FOR UPDATE',
      [userId, streakSaverItem.rows[0].id]
    )
    
    if (!inventory.rows[0] || inventory.rows[0].quantity < 1) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'No streak saver in inventory' })
    }
    
    // Deduct from inventory
    await client.query(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND shop_item_id = $2',
      [userId, streakSaverItem.rows[0].id]
    )
    
    // Activate streak saver (7 days protection)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await client.query(`
      INSERT INTO active_streak_saver (user_id, expires_at)
      VALUES ($1, $2)
    `, [userId, expiresAt])
    
    await client.query('COMMIT')
    res.json({ success: true, expires_at: expiresAt.toISOString() })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Activate streak saver error:', e)
    res.status(500).json({ error: 'Failed to activate streak saver' })
  } finally {
    client.release()
  }
})

// =====================================================
// LOOT BOX ROUTES
// =====================================================

app.get('/api/loot-boxes', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lb.*, br.code as rarity_code, br.name_de as rarity_name
      FROM user_loot_box lb
      JOIN badge_rarity br ON lb.rarity_id = br.id
      WHERE lb.user_id = $1
      ORDER BY lb.is_opened ASC, lb.earned_at DESC
      LIMIT 50
    `, [(req as any).userId])
    res.json(result.rows)
  } catch (e) {
    console.error('Get loot boxes error:', e)
    res.status(500).json({ error: 'Failed to get loot boxes' })
  }
})

app.post('/api/loot-boxes/:id/click', authMiddleware, async (req, res) => {
  const boxId = parseInt(req.params.id as string, 10)
  const userId = (req as any).userId
  
  try {
    const result = await pool.query(
      'SELECT * FROM click_loot_box($1, $2)',
      [boxId, userId]
    )
    
    if (!result.rows[0]?.success) {
      return res.status(400).json({ error: 'Could not click loot box' })
    }
    
    res.json(result.rows[0])
  } catch (e) {
    console.error('Click loot box error:', e)
    res.status(500).json({ error: 'Failed to click loot box' })
  }
})

// =====================================================
// WEEKLY STATS ROUTE
// =====================================================

app.get('/api/stats/weekly', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  
  try {
    // Get start of current week (Monday)
    const weekStart = await pool.query(`SELECT date_trunc('week', CURRENT_DATE)::date as start_date`)
    const startDate = weekStart.rows[0].start_date
    
    // Get workout stats (calories from sessions, avoid double counting)
    const workoutStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT id) as workouts_count,
        COALESCE(SUM(calories_burned), 0) as calories_burned,
        COALESCE(SUM(total_volume_kg), 0) as total_volume_kg
      FROM workout_session
      WHERE user_id = $1 
        AND started_at >= $2
        AND completed_at IS NOT NULL
    `, [userId, startDate])
    
    // Get exercise count from sets
    const exerciseStats = await pool.query(`
      SELECT COUNT(DISTINCT ws.exercise_id) as exercises_completed
      FROM workout_set ws
      JOIN workout_session wses ON ws.workout_session_id = wses.id
      WHERE wses.user_id = $1 
        AND wses.started_at >= $2
        AND wses.completed_at IS NOT NULL
    `, [userId, startDate])
    
    const user = await pool.query('SELECT current_streak FROM app_user WHERE id = $1', [userId])
    
    res.json({
      exercises_completed: parseInt(exerciseStats.rows[0].exercises_completed) || 0,
      total_volume_kg: parseFloat(workoutStats.rows[0].total_volume_kg) || 0,
      workouts_count: parseInt(workoutStats.rows[0].workouts_count) || 0,
      calories_burned: parseInt(workoutStats.rows[0].calories_burned) || 0,
      streak: user.rows[0]?.current_streak || 0,
    })
  } catch (e) {
    console.error('Get weekly stats error:', e)
    res.status(500).json({ error: 'Failed to get weekly stats' })
  }
})

// =====================================================
// AI TRAINING PLAN GENERATION
// =====================================================

import { parseTOON, validateTrainingPlan, type TOONTrainingPlan } from './utils/toon'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VERTEX_API_KEY || ''
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface GeneratePlanRequest {
  fitness_goal: string
  experience_level: string
  training_frequency: number
  focus_areas: string[]
  body_weight_kg?: number
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

app.post('/api/training-plans/generate', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  const { fitness_goal, experience_level, training_frequency, focus_areas, body_weight_kg } = req.body as GeneratePlanRequest

  try {
    // 1. Fetch exercises from DB with their body parts
    const exercisesResult = await pool.query(`
      SELECT e.id, e.name, e.name_de, et.name_de as type_name, 
             string_agg(bp.code, ',') as body_parts
      FROM exercise e
      LEFT JOIN exercise_type et ON e.exercise_type_id = et.id
      LEFT JOIN exercise_body_part ebp ON e.id = ebp.exercise_id
      LEFT JOIN body_part bp ON ebp.body_part_id = bp.id
      GROUP BY e.id, e.name, e.name_de, et.name_de
      ORDER BY e.name
      LIMIT 200
    `)
    const exercises = exercisesResult.rows
    const validIds = new Set(exercises.map(e => e.id))

    // Helper to find exercises by body part
    const getExercisesByBodyPart = (bodyPartCodes: string[], count: number) => {
      const matching = exercises.filter(e => {
        if (!e.body_parts) return false
        const parts = e.body_parts.toLowerCase()
        return bodyPartCodes.some(bp => parts.includes(bp.toLowerCase()))
      })
      const shuffled = matching.sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count).map(e => e.id)
    }

    // Generate template-based plan if no API key or as fallback
    let plan: TOONTrainingPlan | null = null
    // let usedTemplate = false

    // Check if API key is available
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured (GEMINI_API_KEY missing)' })
    }
    
    // Try AI generation
    // Build exercise list for prompt
    const exerciseList = exercises.map(e => `- ID ${e.id}: ${e.name_de || e.name} (${e.type_name || 'Übung'})`).join('\n')

    const prompt = `Du bist ein erfahrener Fitness-Coach. Erstelle einen personalisierten Trainingsplan.

BENUTZER-PROFIL:
- Fitnessziel: ${fitness_goal}
- Erfahrungslevel: ${experience_level}
- Trainingsfrequenz: ${training_frequency}x pro Woche
- Fokus-Bereiche: ${focus_areas.join(', ')}
${body_weight_kg ? `- Körpergewicht: ${body_weight_kg} kg` : ''}

VERFÜGBARE ÜBUNGEN (nutze NUR diese IDs):
${exerciseList}

REGELN:
- Erstelle genau ${training_frequency} Trainingstage
- Jeder Tag sollte 4-8 Übungen haben
- Nutze NUR exercise_ids aus der obigen Liste
- sets: 2-5 je nach Erfahrung
- min_reps/max_reps: realistisch (z.B. 8-12 für Hypertrophie, 4-6 für Kraft)
- rest_seconds: 60-180 je nach Übungstyp

AUSGABE-FORMAT (TOON - nutze exakt dieses Format):
training_plan:
  name: [Planname auf Deutsch]
  description: [Kurze Beschreibung]
  days:
    - name: [Tagname]
      day_number: 1
      exercises:
        - exercise_id: [ID]
          sets: [Anzahl]
          min_reps: [Min]
          max_reps: [Max]
          rest_seconds: [Sekunden]

Erstelle jetzt den Trainingsplan im TOON-Format:`

    // Try AI with retry
    let lastError = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await callGeminiAPI(prompt)
        
        let toonContent = response
        const codeBlockMatch = response.match(/```(?:toon|yaml|)?\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch) {
          toonContent = codeBlockMatch[1]
        }

        const parsed = parseTOON(toonContent)
        const validation = validateTrainingPlan(parsed)
        if (!validation.valid) {
          lastError = validation.error
          continue
        }

        // Validate exercise IDs
        let allIdsValid = true
        for (const day of validation.plan.days) {
          for (const ex of day.exercises) {
            if (!validIds.has(ex.exercise_id)) {
              lastError = `Invalid exercise_id: ${ex.exercise_id}`
              allIdsValid = false
              break
            }
          }
          if (!allIdsValid) break
        }

        if (allIdsValid) {
          plan = validation.plan
          break
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error'
      }
    }

    if (!plan) {
      return res.status(500).json({ 
        error: 'Training plan generation failed after 3 attempts',
        details: lastError 
      })
    }

    /* TEMPLATE FALLBACK - auskommentiert für Dev
    // Generate template plan if AI failed
    if (usedTemplate || !plan) {
      const dayNames = ['Push', 'Pull', 'Beine', 'Oberkörper', 'Unterkörper', 'Ganzkörper', 'Arme']
      const days: TOONTrainingPlan['days'] = []
      
      const sets = experience_level === 'beginner' ? 3 : experience_level === 'intermediate' ? 4 : 5
      const repsMin = fitness_goal === 'strength' ? 4 : 8
      const repsMax = fitness_goal === 'strength' ? 6 : 12
      const rest = fitness_goal === 'strength' ? 180 : 90

      for (let i = 0; i < training_frequency; i++) {
        const dayNum = i + 1
        let bodyParts: string[] = []
        let dayName = dayNames[i] || `Tag ${dayNum}`

        // Assign body parts based on frequency (using body_part codes from DB)
        if (training_frequency <= 2) {
          bodyParts = ['CHEST', 'BACK', 'UPPER_LEGS', 'SHOULDERS']
          dayName = `Ganzkörper ${dayNum}`
        } else if (training_frequency === 3) {
          if (i === 0) { bodyParts = ['CHEST', 'SHOULDERS', 'TRICEPS']; dayName = 'Push' }
          else if (i === 1) { bodyParts = ['BACK', 'BICEPS']; dayName = 'Pull' }
          else { bodyParts = ['UPPER_LEGS', 'LOWER_LEGS', 'WAIST']; dayName = 'Beine' }
        } else {
          if (i === 0) { bodyParts = ['CHEST', 'SHOULDERS', 'TRICEPS']; dayName = 'Push' }
          else if (i === 1) { bodyParts = ['BACK', 'BICEPS']; dayName = 'Pull' }
          else if (i === 2) { bodyParts = ['UPPER_LEGS', 'LOWER_LEGS']; dayName = 'Beine' }
          else if (i === 3) { bodyParts = ['SHOULDERS', 'UPPER_ARMS']; dayName = 'Schultern & Arme' }
          else { bodyParts = ['CHEST', 'BACK', 'WAIST']; dayName = 'Ganzkörper' }
        }

        const exerciseIds = getExercisesByBodyPart(bodyParts, 6)
        const dayExercises = exerciseIds.map(id => ({
          exercise_id: id,
          sets,
          min_reps: repsMin,
          max_reps: repsMax,
          rest_seconds: rest
        }))

        days.push({
          name: dayName,
          day_number: dayNum,
          exercises: dayExercises
        })
      }

      const goalNames: Record<string, string> = {
        muscle_gain: 'Muskelaufbau',
        weight_loss: 'Fettverbrennung',
        strength: 'Kraft',
        endurance: 'Ausdauer',
        health: 'Fitness'
      }

      plan = {
        name: `${goalNames[fitness_goal] || 'Fitness'}-Plan`,
        description: `Personalisierter ${training_frequency}-Tage Plan für ${experience_level === 'beginner' ? 'Anfänger' : experience_level === 'intermediate' ? 'Fortgeschrittene' : 'Erfahrene'}`,
        days
      }
    }
    */

    // 4. Insert into database (normalized)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Create training plan
      const planResult = await client.query(`
        INSERT INTO training_plan (name, name_de, description, description_de, created_by_id, is_system_plan, days_per_week)
        VALUES ($1, $2, $3, $4, $5, FALSE, $6)
        RETURNING id
      `, [plan.name, plan.name, plan.description || null, plan.description || null, userId, plan.days.length])
      
      const planId = planResult.rows[0].id

      // Create days and exercises
      for (const day of plan.days) {
        const dayResult = await client.query(`
          INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [planId, day.day_number, day.name, day.name])
        
        const dayId = dayResult.rows[0].id

        // Create exercises
        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i]
          await client.query(`
            INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps, rest_seconds, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [dayId, ex.exercise_id, i + 1, ex.sets, ex.min_reps, ex.max_reps, ex.rest_seconds, ex.notes || null])
        }
      }

      // Create user-plan relation and set as active
      await client.query(`
        INSERT INTO user_training_plan (user_id, training_plan_id, current_day, is_active)
        VALUES ($1, $2, 1, TRUE)
      `, [userId, planId])

      // Deactivate other plans for this user
      await client.query(`
        UPDATE user_training_plan SET is_active = FALSE
        WHERE user_id = $1 AND training_plan_id != $2
      `, [userId, planId])

      await client.query('COMMIT')

      res.json({ 
        success: true, 
        plan_id: planId,
        plan_name: plan.name,
        days_count: plan.days.length
      })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('Generate training plan error:', e)
    res.status(500).json({ error: 'Failed to generate training plan' })
  }
})

// =====================================================
// LEADERBOARD ROUTES
// =====================================================

// Get weekly leaderboard (buddies + global + fake users)
app.get('/api/leaderboard/weekly', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  
  try {
    // Get user's buddies
    const buddiesResult = await pool.query(`
      SELECT 
        CASE 
          WHEN f.requester_id = $1 THEN f.addressee_id 
          ELSE f.requester_id 
        END as buddy_id
      FROM friendship f
      WHERE (f.requester_id = $1 OR f.addressee_id = $1)
      AND f.status_id = (SELECT id FROM friendship_status WHERE code = 'accepted')
    `, [userId])
    
    const buddyIds = buddiesResult.rows.map(r => r.buddy_id)
    buddyIds.push(userId) // Include self
    
    // Get current user's league
    const userLeague = await pool.query('SELECT league_id FROM app_user WHERE id = $1', [userId])
    const leagueId = userLeague.rows[0]?.league_id || 1
    
    // Get real users with their weekly stats
    const realUsersResult = await pool.query(`
      WITH user_weekly_stats AS (
        SELECT 
          u.id,
          u.display_name,
          u.avatar_url,
          u.fitness_goal,
          u.current_streak,
          u.xp_total,
          u.current_level,
          u.league_id,
          COALESCE(SUM(ws.total_volume_kg), 0)::INTEGER as weekly_volume_kg,
          COUNT(DISTINCT ws.id)::INTEGER as weekly_workout_count
        FROM app_user u
        LEFT JOIN workout_session ws ON ws.user_id = u.id 
          AND ws.completed_at >= date_trunc('week', CURRENT_DATE)
        WHERE u.onboarding_completed = TRUE
        GROUP BY u.id
      )
      SELECT 
        id,
        display_name,
        avatar_url,
        fitness_goal,
        current_streak,
        xp_total,
        current_level,
        league_id,
        weekly_volume_kg,
        weekly_workout_count,
        FALSE as is_fake,
        CASE WHEN id = ANY($1::uuid[]) THEN TRUE ELSE FALSE END as is_buddy
      FROM user_weekly_stats
      ORDER BY weekly_volume_kg DESC
    `, [buddyIds])
    
    // Get fake users from same league or adjacent
    const fakeUsersResult = await pool.query(`
      SELECT 
        id,
        display_name,
        avatar_url,
        fitness_goal,
        current_streak,
        xp_total,
        current_level,
        league_id,
        weekly_volume_kg,
        weekly_workout_count,
        TRUE as is_fake,
        FALSE as is_buddy
      FROM fake_user
      WHERE is_active = TRUE
      AND league_id BETWEEN $1 - 1 AND $1 + 1
      ORDER BY weekly_volume_kg DESC
    `, [leagueId])
    
    // Combine and sort
    const allUsers = [...realUsersResult.rows, ...fakeUsersResult.rows]
      .sort((a, b) => b.weekly_volume_kg - a.weekly_volume_kg)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }))
    
    // Get league info
    const leagueInfo = await pool.query(`
      SELECT * FROM league_tier WHERE id = $1
    `, [leagueId])
    
    // Get level info for current user
    const levelInfo = await pool.query(`
      SELECT * FROM user_level WHERE level = (
        SELECT current_level FROM app_user WHERE id = $1
      )
    `, [userId])
    
    const nextLevelInfo = await pool.query(`
      SELECT * FROM user_level WHERE level = (
        SELECT current_level + 1 FROM app_user WHERE id = $1
      )
    `, [userId])
    
    res.json({
      leaderboard: allUsers,
      currentUserRank: allUsers.findIndex(u => u.id === userId) + 1,
      league: leagueInfo.rows[0],
      level: levelInfo.rows[0],
      nextLevel: nextLevelInfo.rows[0] || null,
      totalParticipants: allUsers.length
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// Get all leagues with user counts
app.get('/api/leagues', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lt.*,
        COUNT(DISTINCT u.id)::INTEGER as user_count,
        COUNT(DISTINCT f.id)::INTEGER as fake_user_count
      FROM league_tier lt
      LEFT JOIN app_user u ON u.league_id = lt.id
      LEFT JOIN fake_user f ON f.league_id = lt.id AND f.is_active = TRUE
      GROUP BY lt.id
      ORDER BY lt.tier_order
    `)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching leagues:', error)
    res.status(500).json({ error: 'Failed to fetch leagues' })
  }
})

// Get all levels
app.get('/api/levels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_level ORDER BY level')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching levels:', error)
    res.status(500).json({ error: 'Failed to fetch levels' })
  }
})

// Get fitness goals
app.get('/api/fitness-goals', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fitness_goal ORDER BY id')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching fitness goals:', error)
    res.status(500).json({ error: 'Failed to fetch fitness goals' })
  }
})

// =====================================================
// CHALLENGE ROUTES
// =====================================================

// Get challenge types
app.get('/api/challenges/types', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM challenge_type ORDER BY id')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching challenge types:', error)
    res.status(500).json({ error: 'Failed to fetch challenge types' })
  }
})

// Get user's active and pending challenges
app.get('/api/challenges', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  
  try {
    const result = await pool.query(`
      SELECT 
        bc.*,
        ct.code as challenge_type_code,
        ct.name_de as challenge_type_name,
        ct.icon_name as challenge_type_icon,
        ct.metric,
        challenger.display_name as challenger_name,
        challenger.avatar_url as challenger_avatar,
        challenger.fitness_goal as challenger_goal,
        opponent.display_name as opponent_name,
        opponent.avatar_url as opponent_avatar,
        opponent.fitness_goal as opponent_goal,
        e.name_de as exercise_name
      FROM buddy_challenge bc
      JOIN challenge_type ct ON ct.id = bc.challenge_type_id
      JOIN app_user challenger ON challenger.id = bc.challenger_id
      JOIN app_user opponent ON opponent.id = bc.opponent_id
      LEFT JOIN exercise e ON e.id = bc.exercise_id
      WHERE (bc.challenger_id = $1 OR bc.opponent_id = $1)
      AND bc.status IN ('pending', 'active')
      ORDER BY bc.created_at DESC
    `, [userId])
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching challenges:', error)
    res.status(500).json({ error: 'Failed to fetch challenges' })
  }
})

// Get challenge history
app.get('/api/challenges/history', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  const limit = parseInt(req.query.limit as string) || 20
  
  try {
    const result = await pool.query(`
      SELECT 
        bc.*,
        ct.code as challenge_type_code,
        ct.name_de as challenge_type_name,
        ct.icon_name as challenge_type_icon,
        challenger.display_name as challenger_name,
        challenger.avatar_url as challenger_avatar,
        opponent.display_name as opponent_name,
        opponent.avatar_url as opponent_avatar,
        e.name_de as exercise_name
      FROM buddy_challenge bc
      JOIN challenge_type ct ON ct.id = bc.challenge_type_id
      JOIN app_user challenger ON challenger.id = bc.challenger_id
      JOIN app_user opponent ON opponent.id = bc.opponent_id
      LEFT JOIN exercise e ON e.id = bc.exercise_id
      WHERE (bc.challenger_id = $1 OR bc.opponent_id = $1)
      AND bc.status IN ('completed', 'cancelled', 'declined')
      ORDER BY bc.ends_at DESC
      LIMIT $2
    `, [userId, limit])
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching challenge history:', error)
    res.status(500).json({ error: 'Failed to fetch challenge history' })
  }
})

// Create a challenge
app.post('/api/challenges', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  const { 
    opponentId, 
    challengeTypeId, 
    exerciseId, 
    targetValue, 
    wagerCoins,
    endsAt,
    durationPreset // '1h', '1d', 'week', 'custom'
  } = req.body
  
  try {
    // Verify friendship exists
    const friendshipResult = await pool.query(`
      SELECT id FROM friendship
      WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
      AND status_id = (SELECT id FROM friendship_status WHERE code = 'accepted')
    `, [userId, opponentId])
    
    if (friendshipResult.rows.length === 0) {
      return res.status(400).json({ error: 'Must be buddies to challenge' })
    }
    
    const friendshipId = friendshipResult.rows[0].id
    
    // Calculate end time based on preset
    let calculatedEndsAt = endsAt
    if (durationPreset && !endsAt) {
      const now = new Date()
      switch (durationPreset) {
        case '1h':
          calculatedEndsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
          break
        case '1d':
          calculatedEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          break
        case 'week':
          // End of current week (Sunday 23:59:59)
          const endOfWeek = new Date(now)
          endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
          endOfWeek.setHours(23, 59, 59, 999)
          calculatedEndsAt = endOfWeek.toISOString()
          break
      }
    }
    
    // If wager, check user has enough coins
    if (wagerCoins && wagerCoins > 0) {
      const userCoins = await pool.query('SELECT hantel_coins FROM app_user WHERE id = $1', [userId])
      if (userCoins.rows[0].hantel_coins < wagerCoins) {
        return res.status(400).json({ error: 'Not enough coins' })
      }
    }
    
    // Calculate XP reward based on duration
    let xpReward = 100 // base
    if (durationPreset === '1h') xpReward = 50
    else if (durationPreset === '1d') xpReward = 100
    else if (durationPreset === 'week') xpReward = 250
    else xpReward = 150 // custom
    
    const result = await pool.query(`
      INSERT INTO buddy_challenge (
        friendship_id, challenge_type_id, exercise_id,
        challenger_id, opponent_id,
        target_value, wager_coins, ends_at, xp_reward
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      friendshipId, challengeTypeId, exerciseId || null,
      userId, opponentId,
      targetValue || null, wagerCoins || 0, calculatedEndsAt, xpReward
    ])
    
    // Add to activity feed
    await pool.query(`
      INSERT INTO activity_feed_item (user_id, activity_type, title_de, title_en, description_de, visibility)
      VALUES ($1, 'challenge', 'Hat eine Challenge gestartet', 'Started a challenge', $2, 'friends')
    `, [userId, `Challenge gegen ${opponentId}`])
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error creating challenge:', error)
    res.status(500).json({ error: 'Failed to create challenge' })
  }
})

// Accept a challenge
app.patch('/api/challenges/:id/accept', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  const challengeId = parseInt(req.params.id as string)
  
  try {
    // Verify user is the opponent and challenge is pending
    const challenge = await pool.query(`
      SELECT * FROM buddy_challenge WHERE id = $1 AND opponent_id = $2 AND status = 'pending'
    `, [challengeId, userId])
    
    if (challenge.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found or already accepted' })
    }
    
    const wagerCoins = challenge.rows[0].wager_coins
    
    // If wager, check and deduct coins from both users
    if (wagerCoins > 0) {
      const userCoins = await pool.query('SELECT hantel_coins FROM app_user WHERE id = $1', [userId])
      if (userCoins.rows[0].hantel_coins < wagerCoins) {
        return res.status(400).json({ error: 'Not enough coins for wager' })
      }
      
      // Deduct from both
      await pool.query('UPDATE app_user SET hantel_coins = hantel_coins - $1 WHERE id = $2', [wagerCoins, userId])
      await pool.query('UPDATE app_user SET hantel_coins = hantel_coins - $1 WHERE id = $2', [wagerCoins, challenge.rows[0].challenger_id])
    }
    
    const result = await pool.query(`
      UPDATE buddy_challenge 
      SET status = 'active', accepted_at = NOW(), starts_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [challengeId])
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error accepting challenge:', error)
    res.status(500).json({ error: 'Failed to accept challenge' })
  }
})

// Decline a challenge
app.patch('/api/challenges/:id/decline', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  const challengeId = parseInt(req.params.id as string)
  
  try {
    const result = await pool.query(`
      UPDATE buddy_challenge 
      SET status = 'declined'
      WHERE id = $1 AND opponent_id = $2 AND status = 'pending'
      RETURNING *
    `, [challengeId, userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error declining challenge:', error)
    res.status(500).json({ error: 'Failed to decline challenge' })
  }
})

// Cancel a challenge (only challenger before accepted)
app.patch('/api/challenges/:id/cancel', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  const challengeId = parseInt(req.params.id as string)
  
  try {
    const result = await pool.query(`
      UPDATE buddy_challenge 
      SET status = 'cancelled'
      WHERE id = $1 AND challenger_id = $2 AND status = 'pending'
      RETURNING *
    `, [challengeId, userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found or cannot be cancelled' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error cancelling challenge:', error)
    res.status(500).json({ error: 'Failed to cancel challenge' })
  }
})

// Complete a challenge (called by cron or when time expires)
app.post('/api/challenges/:id/complete', authMiddleware, async (req, res) => {
  const challengeId = parseInt(req.params.id as string)
  
  try {
    const challenge = await pool.query(`
      SELECT bc.*, ct.metric FROM buddy_challenge bc
      JOIN challenge_type ct ON ct.id = bc.challenge_type_id
      WHERE bc.id = $1 AND bc.status = 'active'
    `, [challengeId])
    
    if (challenge.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' })
    }
    
    const c = challenge.rows[0]
    
    // Determine winner
    let winnerId = null
    if (c.challenger_progress > c.opponent_progress) {
      winnerId = c.challenger_id
    } else if (c.opponent_progress > c.challenger_progress) {
      winnerId = c.opponent_id
    }
    // If tied, no winner
    
    // Update challenge
    await pool.query(`
      UPDATE buddy_challenge 
      SET status = 'completed', winner_id = $1
      WHERE id = $2
    `, [winnerId, challengeId])
    
    // Award XP to both participants (winner gets more)
    const winnerXp = c.xp_reward
    const loserXp = Math.floor(c.xp_reward * 0.5)
    
    if (winnerId) {
      const loserId = winnerId === c.challenger_id ? c.opponent_id : c.challenger_id
      
      // Winner XP + coins
      await pool.query(`SELECT add_user_xp($1, $2, 'challenge_win', $3, 'Challenge gewonnen')`, [winnerId, winnerXp, challengeId])
      
      // Loser XP (participation)
      await pool.query(`SELECT add_user_xp($1, $2, 'challenge_participate', $3, 'Challenge teilgenommen')`, [loserId, loserXp, challengeId])
      
      // Transfer wager coins
      if (c.wager_coins > 0) {
        const totalPot = c.wager_coins * 2
        await pool.query('UPDATE app_user SET hantel_coins = hantel_coins + $1 WHERE id = $2', [totalPot, winnerId])
      }
    } else {
      // Tie - both get base XP, coins returned
      await pool.query(`SELECT add_user_xp($1, $2, 'challenge_participate', $3, 'Challenge unentschieden')`, [c.challenger_id, loserXp, challengeId])
      await pool.query(`SELECT add_user_xp($1, $2, 'challenge_participate', $3, 'Challenge unentschieden')`, [c.opponent_id, loserXp, challengeId])
      
      if (c.wager_coins > 0) {
        await pool.query('UPDATE app_user SET hantel_coins = hantel_coins + $1 WHERE id = $2', [c.wager_coins, c.challenger_id])
        await pool.query('UPDATE app_user SET hantel_coins = hantel_coins + $1 WHERE id = $2', [c.wager_coins, c.opponent_id])
      }
    }
    
    res.json({ winner_id: winnerId, message: 'Challenge completed' })
  } catch (error) {
    console.error('Error completing challenge:', error)
    res.status(500).json({ error: 'Failed to complete challenge' })
  }
})

// Get user XP/level info
app.get('/api/user/level', authMiddleware, async (req, res) => {
  const userId = (req as any).userId
  
  try {
    const result = await pool.query(`
      SELECT 
        u.xp_total,
        u.current_level,
        u.league_id,
        u.league_points,
        ul.name_de as level_name,
        ul.icon_name as level_icon,
        ul.color_hex as level_color,
        ul.xp_required as current_level_xp,
        next_ul.xp_required as next_level_xp,
        lt.code as league_code,
        lt.name_de as league_name,
        lt.icon_name as league_icon,
        lt.color_hex as league_color
      FROM app_user u
      JOIN user_level ul ON ul.level = u.current_level
      LEFT JOIN user_level next_ul ON next_ul.level = u.current_level + 1
      LEFT JOIN league_tier lt ON lt.id = u.league_id
      WHERE u.id = $1
    `, [userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const data = result.rows[0]
    
    // Calculate progress to next level
    const currentXp = data.xp_total
    const currentLevelXp = data.current_level_xp
    const nextLevelXp = data.next_level_xp || currentLevelXp
    const progressPercent = nextLevelXp > currentLevelXp 
      ? Math.min(100, Math.floor(((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))
      : 100
    
    res.json({
      ...data,
      progress_percent: progressPercent,
      xp_to_next: Math.max(0, nextLevelXp - currentXp)
    })
  } catch (error) {
    console.error('Error fetching user level:', error)
    res.status(500).json({ error: 'Failed to fetch user level' })
  }
})

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`🚀 Sculpt API running on http://localhost:${PORT}`)
})
