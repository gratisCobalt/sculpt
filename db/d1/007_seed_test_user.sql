-- Seed Test User Data (Workouts, History, Inventory)
-- Targets user: test@sculpt-app.de
-- MASSIVE SEED (30+ Workouts)

-- =====================================================
-- 1. INVENTORY & PURCHASES
-- =====================================================
INSERT OR IGNORE INTO user_inventory (user_id, shop_item_id, quantity) 
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='streak_saver'), 5),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='xp_boost_2x'), 3),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='loot_box_rare'), 2),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='title_iron_warrior'), 1);

INSERT INTO purchase_history (user_id, shop_item_id, quantity, total_price)
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='streak_saver'), 3, 2250),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='xp_boost_2x'), 3, 900),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM shop_item WHERE code='title_iron_warrior'), 1, 750);


-- =====================================================
-- 2. WORKOUT HISTORY (Last 30-60 days)
-- =====================================================

-- Helper to insert random workout logic (SQLite blocks)
-- We insert explicit rows

-- Month Ago
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-60 days', '10:00'), datetime('now', '-60 days', '11:00'), 3600, 3000, 300, 'Start Journey');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 10, 40, 6);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-58 days', '10:00'), datetime('now', '-58 days', '11:00'), 3600, 3200, 320, 'Getting better');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 2, 1, 10, 50, 6);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-55 days', '18:00'), datetime('now', '-55 days', '19:00'), 3600, 3500, 350, 'Evening Pump');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 10, 45, 7);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-52 days', '07:00'), datetime('now', '-52 days', '07:45'), 2700, 0, 400, 'Cardio Morning');
-- No sets for cardio sometimes

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-50 days', '12:00'), datetime('now', '-50 days', '13:30'), 5400, 5000, 500, 'Heavy Lifting');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 3, 1, 5, 80, 8);

-- ... continuous stream ...
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-45 days', '16:00'), datetime('now', '-45 days', '17:00'), 3600, 4000, 400, '');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 8, 50, 7);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-42 days', '10:00'), datetime('now', '-42 days', '11:00'), 3600, 4200, 420, '');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 2, 1, 8, 60, 7);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-39 days', '17:00'), datetime('now', '-39 days', '18:00'), 3600, 4500, 450, 'Grind');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 4, 1, 12, 30, 9);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-35 days', '09:00'), datetime('now', '-35 days', '10:30'), 5400, 6000, 600, 'Leg Day');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 3, 1, 10, 90, 8);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-30 days', '18:00'), datetime('now', '-30 days', '19:00'), 3600, 4800, 480, 'Chest');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 5, 70, 9);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-28 days', '07:00'), datetime('now', '-28 days', '07:30'), 1800, 0, 200, 'Quick Run');

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-25 days', '16:00'), datetime('now', '-25 days', '17:00'), 3600, 5000, 500, '');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 5, 1, 15, 20, 7);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-22 days', '10:00'), datetime('now', '-22 days', '11:15'), 4500, 5500, 550, 'Upper Body');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 8, 75, 9);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-20 days', '17:00'), datetime('now', '-20 days', '18:30'), 5400, 7000, 700, 'Legs again');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 3, 1, 8, 100, 8.5);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-18 days', '09:00'), datetime('now', '-18 days', '10:00'), 3600, 4000, 400, 'Back');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 2, 1, 12, 60, 8);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-15 days', '18:00'), datetime('now', '-15 days', '19:00'), 3600, 5200, 520, 'Push');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 5, 80, 9);

-- Last 14 days (Recap from previous seed, roughly)
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-14 days', '10:00'), datetime('now', '-14 days', '11:15'), 4500, 4500, 420, 'Push Day - Guter Start in die Woche');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 10, 60, 8);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-12 days', '17:00'), datetime('now', '-12 days', '18:30'), 5400, 8000, 600, 'Leg Day - Schwere Beine');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 3, 1, 12, 100, 8.5);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-10 days', '09:00'), datetime('now', '-10 days', '10:00'), 3600, 3200, 350, 'Pull Day');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 2, 1, 15, 40, 7);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-7 days', '18:00'), datetime('now', '-7 days', '19:30'), 5400, 6000, 550, 'Full Body Blast');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe, is_pr) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 5, 1, 1, 120, 10, 1);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-5 days', '07:00'), datetime('now', '-5 days', '07:45'), 2700, 0, 400, 'Morning Run');

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-3 days', '16:00'), datetime('now', '-3 days', '17:15'), 4500, 5200, 480, 'Upper Body');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 8, 85, 9);

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-1 days', '12:00'), datetime('now', '-1 days', '13:00'), 3600, 7500, 520, 'Lower Body');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 3, 1, 5, 110, 8.5);

-- Today
INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes) VALUES ((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), datetime('now', '-2 hours'), datetime('now', '-1 hours'), 3600, 5000, 500, 'Fresh Workout');
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES ((SELECT id FROM workout_session WHERE user_id=(SELECT id FROM app_user WHERE email='test@sculpt-app.de') ORDER BY started_at DESC LIMIT 1), 1, 1, 10, 60, 7);


-- =====================================================
-- 4. BADGES (Earned)
-- =====================================================
INSERT OR IGNORE INTO user_badge (user_id, badge_id, earned_at)
VALUES 
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='first_workout'), datetime('now', '-60 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='workout_10'), datetime('now', '-30 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='streak_2'), datetime('now', '-45 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='streak_4'), datetime('now', '-30 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='weight_50'), datetime('now', '-58 days')),
((SELECT id FROM app_user WHERE email='test@sculpt-app.de'), (SELECT id FROM badge WHERE code='weight_100'), datetime('now', '-20 days'));

-- =====================================================
-- 5. UPDATE USER STATS
-- =====================================================
UPDATE app_user 
SET 
  total_points = 5500,
  xp_total = 4200,
  current_level = 10,
  hantel_coins = 1450,
  current_streak = 14,
  longest_streak = 21,
  onboarding_completed = 1,
  fitness_goal = 'muscle_gain',
  training_frequency_per_week = 5,
  experience_level = 'advanced'
WHERE email='test@sculpt-app.de';
