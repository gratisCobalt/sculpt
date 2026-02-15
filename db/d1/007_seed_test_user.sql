-- Seed Test User Data (Workouts, History, Inventory, Lootboxes)
-- Targets user: test@sculpt-app.de
-- MASSIVE SEED (With Plan Links & Lootboxes)

-- =====================================================
-- 1. LOOTBOXES & INVENTORY
-- =====================================================
-- Unopened Lootboxes
INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining, is_opened, earned_at) VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), 1, 3, 0, datetime('now', '-1 day')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), 1, 3, 0, datetime('now', '-2 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), 2, 3, 0, datetime('now', '-5 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), 3, 3, 0, datetime('now', '-10 days'));

-- Purchased/Owned Items
INSERT OR IGNORE INTO user_inventory (user_id, shop_item_id, quantity) 
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='streak_saver'), 5),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='xp_boost_2x'), 3),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='title_iron_warrior'), 1);

-- =====================================================
-- 2. WORKOUT HISTORY -- THIS WEEK (Jan 12 - Jan 18 2026)
-- =====================================================
-- Monday Jan 12 (-6 days) - Push Day (Plan Generated)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=1), datetime('now', '-6 days', '18:00'), datetime('now', '-6 days', '19:15'), 4500, 5000, 500, 'Monday Push');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise WHERE name LIKE '%Bench%' LIMIT 1), 1, 10, 60, 8), 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise WHERE name LIKE '%Bench%' LIMIT 1), 2, 10, 60, 8.5);

-- Wednesday Jan 14 (-4 days) - Pull Day
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=2), datetime('now', '-4 days', '18:00'), datetime('now', '-4 days', '19:00'), 3600, 4200, 400, 'Wednesday Pull');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise WHERE name LIKE '%Row%' LIMIT 1), 1, 12, 50, 8);

-- Friday Jan 16 (-2 days) - Leg Day
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=3), datetime('now', '-2 days', '17:00'), datetime('now', '-2 days', '18:30'), 5400, 8000, 700, 'Friday Legs');

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES 
((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise WHERE name LIKE '%Squat%' LIMIT 1), 1, 10, 100, 9);

-- Sunday Jan 18 (Today) - Cardio/Abs
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), NULL, datetime('now', '-2 hours'), datetime('now', '-1 hours'), 3600, 0, 300, 'Sunday Recovery');


-- =====================================================
-- 3. WORKOUT HISTORY -- PAST MONTHS
-- =====================================================
-- Insert 20 more workouts (condensed)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=1), datetime('now', '-10 days'), datetime('now', '-10 days', '+1 hour'), 3600, 4000, 400, 'Past Push');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), (SELECT id FROM exercise WHERE name LIKE '%Bench%' LIMIT 1), 1, 10, 50, 7);

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=2), datetime('now', '-13 days'), datetime('now', '-13 days', '+1 hour'), 3600, 4000, 400, 'Past Pull');

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=3), datetime('now', '-15 days'), datetime('now', '-15 days', '+1 hour'), 3600, 7000, 600, 'Past Legs');

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=1), datetime('now', '-17 days'), datetime('now', '-17 days', '+1 hour'), 3600, 4500, 450, 'Past Push');

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=2), datetime('now', '-20 days'), datetime('now', '-20 days', '+1 hour'), 3600, 4200, 400, 'Past Pull');

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) 
VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM training_plan_day WHERE training_plan_id=1 AND day_number=3), datetime('now', '-23 days'), datetime('now', '-23 days', '+1 hour'), 3600, 7500, 650, 'Past Legs');

-- =====================================================
-- 4. UPDATE USER
-- =====================================================
UPDATE app_user SET 
  total_points = 6000,
  xp_total = 4500,
  current_level = 11,
  hantel_coins = 2000,
  current_streak = 25
WHERE email='test@sculpt-app.de';
