-- Seed Training Plan Details (Days and Exercises) for Default PPL Plan
-- Plan ID 1: Push/Pull/Beine

-- =====================================================
-- 1. TRAINING PLAN DAYS
-- =====================================================
INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de, focus_description) VALUES
(1, 1, 'Push', 'Drücken', 'Chest, Shoulders, Triceps'),
(1, 2, 'Pull', 'Ziehen', 'Back, Biceps, Rear Delts'),
(1, 3, 'Legs', 'Beine', 'Quads, Hamstrings, Calves, Abs');

-- =====================================================
-- 2. TRAINING PLAN EXERCISES (PUSH DAY)
-- =====================================================
-- Bench Press
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Bench Press%' LIMIT 1), 1, 3, 8, 12 FROM training_plan_day WHERE training_plan_id=1 AND day_number=1;

-- Dumbbell Shoulder Press
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Press%' LIMIT 1), 2, 3, 10, 15 FROM training_plan_day WHERE training_plan_id=1 AND day_number=1;

-- Triceps Pushdown (Cable) - fallback to generic if specific not found
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Triceps%' LIMIT 1), 3, 3, 12, 15 FROM training_plan_day WHERE training_plan_id=1 AND day_number=1;


-- =====================================================
-- 3. TRAINING PLAN EXERCISES (PULL DAY)
-- =====================================================
-- Pullups or Lat Pulldown
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Row%' LIMIT 1), 1, 3, 8, 12 FROM training_plan_day WHERE training_plan_id=1 AND day_number=2;

-- Barbell Row
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Row%' ORDER BY id DESC LIMIT 1), 2, 3, 8, 12 FROM training_plan_day WHERE training_plan_id=1 AND day_number=2;

-- Bicep Curl
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Curl%' LIMIT 1), 3, 3, 10, 12 FROM training_plan_day WHERE training_plan_id=1 AND day_number=2;


-- =====================================================
-- 4. TRAINING PLAN EXERCISES (LEGS DAY)
-- =====================================================
-- Squat
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Squat%' LIMIT 1), 1, 4, 6, 10 FROM training_plan_day WHERE training_plan_id=1 AND day_number=3;

-- Leg Press
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Squat%' ORDER BY id DESC LIMIT 1), 2, 3, 10, 15 FROM training_plan_day WHERE training_plan_id=1 AND day_number=3;

-- Calf Raise
INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps) 
SELECT id, (SELECT id FROM exercise WHERE name LIKE '%Calf%' LIMIT 1), 3, 4, 15, 20 FROM training_plan_day WHERE training_plan_id=1 AND day_number=3;

-- =====================================================
-- 5. ASSIGN PLAN TO TEST USER
-- =====================================================
INSERT OR REPLACE INTO user_training_plan (user_id, training_plan_id, current_day, is_active)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), 1, 1, 1);
