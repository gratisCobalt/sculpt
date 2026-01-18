-- Seed Test User Data (Workouts, History, Inventory, Friends)
-- Targets user: test@sculpt-app.de

-- =====================================================
-- 1. FRIENDSHIPS
-- =====================================================
-- Skipped due to FK constraints

-- =====================================================
-- 2. WORKOUT HISTORY (Last 2 weeks)
-- =====================================================

-- Workout 1: Push Day (14 days ago)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-14 days', '10:00'), datetime('now', '-14 days', '11:15'), 4500, 4500, 420, 'Push Day - Guter Start in die Woche');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe)
VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise ORDER BY RANDOM() LIMIT 1), 1, 10, 60, 8),
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise ORDER BY RANDOM() LIMIT 1), 2, 8, 65, 9);

-- Workout 2: Leg Day (12 days ago)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-12 days', '17:00'), datetime('now', '-12 days', '18:30'), 5400, 8000, 600, 'Leg Day - Schwere Beine');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe)
VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise ORDER BY RANDOM() LIMIT 1), 1, 12, 100, 8.5),
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise ORDER BY RANDOM() LIMIT 1), 2, 10, 110, 9);

-- Workout 3: Pull Day (10 days ago)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-10 days', '09:00'), datetime('now', '-10 days', '10:00'), 3600, 3200, 350, 'Pull Day');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe)
VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise ORDER BY RANDOM() LIMIT 1), 1, 15, 40, 7);

-- Workout 4: Full Body (7 days ago) - PR!
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-7 days', '18:00'), datetime('now', '-7 days', '19:30'), 5400, 6000, 550, 'Full Body Blast');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe, is_pr)
VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise ORDER BY RANDOM() LIMIT 1), 1, 1, 120, 10, 1);

-- Workout 5: Cardio (5 days ago)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-5 days', '07:00'), datetime('now', '-5 days', '07:45'), 2700, 0, 400, 'Morning Run');

-- Workout 6: Upper Body (3 days ago)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-3 days', '16:00'), datetime('now', '-3 days', '17:15'), 4500, 5200, 480, 'Upper Body');

-- Workout 7: Lower Body (Yesterday)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-1 days', '12:00'), datetime('now', '-1 days', '13:00'), 3600, 7500, 520, 'Lower Body');

-- =====================================================
-- 3. INVENTORY & PURCHASES
-- =====================================================
INSERT OR IGNORE INTO user_inventory (user_id, shop_item_id, quantity) 
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='streak_saver'), 2),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='xp_boost_2x'), 1);

INSERT INTO purchase_history (user_id, shop_item_id, quantity, total_price)
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='streak_saver'), 1, 750);

-- =====================================================
-- 4. BADGES (Earned)
-- =====================================================
INSERT OR IGNORE INTO user_badge (user_id, badge_id, earned_at)
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='first_workout'), datetime('now', '-14 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='streak_2'), datetime('now', '-1 day'));

-- =====================================================
-- 5. UPDATE USER STATS
-- =====================================================
UPDATE app_user 
SET 
  total_points = 1500,
  xp_total = 1200,
  current_level = 5,
  hantel_coins = 450,
  current_streak = 3,
  onboarding_completed = 1,
  fitness_goal = 'muscle_gain',
  training_frequency_per_week = 4,
  experience_level = 'intermediate'
WHERE email='test@sculpt-app.de';
