-- =====================================================
-- SCULPT MOCKUP DATA SEED
-- Erstellt am: 18. Januar 2026
-- Nutzung: npx wrangler d1 execute sculpt-db --remote --file=db/d1/seed_mockup_data.sql -y
-- =====================================================

-- =====================================================
-- 1. LÖSCHE BESTEHENDE MOCKUP-DATEN
-- =====================================================
DELETE FROM workout_set;
DELETE FROM workout_session;
DELETE FROM user_loot_box;
DELETE FROM user_inventory;
DELETE FROM user_badge;
DELETE FROM purchase_history;
DELETE FROM personal_record;
DELETE FROM xp_transaction;
DELETE FROM activity_feed_item;
DELETE FROM fake_user;

-- =====================================================
-- 2. FAKE USER FÜR LEADERBOARD (100 User)
-- =====================================================
INSERT INTO fake_user (id, display_name, avatar_url, fitness_goal, current_streak, xp_total, current_level, league_id, weekly_volume_kg, weekly_workout_count, base_weekly_volume, activity_probability, is_active) VALUES
-- Bronze Liga (ID 1)
('fake-MaxPower92', 'MaxPower92', 'https://ui-avatars.com/api/?name=Max+Power&background=random', 'muscle_gain', 2, 1200, 4, 1, 8500, 3, 8000, 60, 1),
('fake-FitLena', 'FitLena', 'https://ui-avatars.com/api/?name=Fit+Lena&background=random', 'weight_loss', 1, 800, 3, 1, 5200, 2, 5000, 50, 1),
('fake-SportlerTom', 'SportlerTom', 'https://ui-avatars.com/api/?name=Sportler+Tom&background=random', 'strength', 3, 2100, 6, 1, 12000, 4, 11000, 70, 1),
('fake-JuliaFit', 'JuliaFit', 'https://ui-avatars.com/api/?name=Julia+Fit&background=random', 'health', 1, 600, 2, 1, 4100, 2, 4000, 45, 1),
('fake-BenGains', 'BenGains', 'https://ui-avatars.com/api/?name=Ben+Gains&background=random', 'muscle_gain', 2, 1500, 5, 1, 9800, 3, 9500, 65, 1),
('fake-LazyLarry', 'LazyLarry', 'https://ui-avatars.com/api/?name=Lazy+Larry&background=random', 'health', 0, 200, 1, 1, 1500, 1, 2000, 20, 1),
('fake-RunnerRick', 'RunnerRick', 'https://ui-avatars.com/api/?name=Runner+Rick&background=random', 'endurance', 2, 1800, 5, 1, 4000, 3, 4000, 65, 1),
('fake-GymGary', 'GymGary', 'https://ui-avatars.com/api/?name=Gym+Gary&background=random', 'muscle_gain', 1, 1400, 4, 1, 9200, 3, 9000, 60, 1),
('fake-FitFiona', 'FitFiona', 'https://ui-avatars.com/api/?name=Fit+Fiona&background=random', 'weight_loss', 2, 1100, 3, 1, 5500, 2, 5000, 50, 1),
('fake-NewbieNick', 'NewbieNick', 'https://ui-avatars.com/api/?name=Newbie+Nick&background=random', 'muscle_gain', 0, 300, 1, 1, 2000, 1, 2500, 30, 1),
-- Silber Liga (ID 2)
('fake-AnnaStrong', 'AnnaStrong', 'https://ui-avatars.com/api/?name=Anna+Strong&background=random', 'strength', 4, 4500, 10, 2, 15200, 4, 14500, 75, 1),
('fake-TimoTrain', 'TimoTrain', 'https://ui-avatars.com/api/?name=Timo+Train&background=random', 'muscle_gain', 5, 5800, 11, 2, 18500, 5, 17000, 80, 1),
('fake-LauraLift', 'LauraLift', 'https://ui-avatars.com/api/?name=Laura+Lift&background=random', 'muscle_gain', 3, 3200, 8, 2, 13200, 4, 12500, 70, 1),
('fake-IronIngo', 'IronIngo', 'https://ui-avatars.com/api/?name=Iron+Ingo&background=random', 'strength', 3, 5000, 10, 2, 16000, 4, 15500, 70, 1),
('fake-PowerPetra', 'PowerPetra', 'https://ui-avatars.com/api/?name=Power+Petra&background=random', 'muscle_gain', 4, 4800, 9, 2, 14500, 4, 14000, 72, 1),
('fake-CardioChris', 'CardioChris', 'https://ui-avatars.com/api/?name=Cardio+Chris&background=random', 'endurance', 6, 6000, 12, 2, 8000, 5, 8000, 85, 1),
('fake-BulkBen', 'BulkBen', 'https://ui-avatars.com/api/?name=Bulk+Ben&background=random', 'muscle_gain', 2, 3900, 9, 2, 17000, 4, 16500, 68, 1),
('fake-ShapeSarah', 'ShapeSarah', 'https://ui-avatars.com/api/?name=Shape+Sarah&background=random', 'weight_loss', 4, 4200, 10, 2, 11000, 4, 10500, 75, 1),
('fake-FitFrank', 'FitFrank', 'https://ui-avatars.com/api/?name=Fit+Frank&background=random', 'muscle_gain', 5, 5200, 11, 2, 17500, 5, 17000, 80, 1),
('fake-GymGina', 'GymGina', 'https://ui-avatars.com/api/?name=Gym+Gina&background=random', 'strength', 4, 4600, 10, 2, 15000, 4, 14500, 75, 1),
-- Gold Liga (ID 3)
('fake-MarcoMuscle', 'MarcoMuscle', 'https://ui-avatars.com/api/?name=Marco+Muscle&background=random', 'muscle_gain', 6, 9500, 15, 3, 22000, 5, 21000, 85, 1),
('fake-LisaLeistung', 'LisaLeistung', 'https://ui-avatars.com/api/?name=Lisa+Leistung&background=random', 'strength', 5, 7800, 13, 3, 19500, 5, 18500, 80, 1),
('fake-DavidDedicated', 'DavidDedicated', 'https://ui-avatars.com/api/?name=David+Dedicated&background=random', 'muscle_gain', 7, 11200, 16, 3, 25000, 6, 24000, 90, 1),
('fake-SolidSimon', 'SolidSimon', 'https://ui-avatars.com/api/?name=Solid+Simon&background=random', 'muscle_gain', 8, 12500, 17, 3, 26000, 6, 25000, 90, 1),
('fake-ToughTina', 'ToughTina', 'https://ui-avatars.com/api/?name=Tough+Tina&background=random', 'strength', 6, 10000, 15, 3, 21000, 5, 20000, 85, 1),
('fake-CrossfitCarl', 'CrossfitCarl', 'https://ui-avatars.com/api/?name=Crossfit+Carl&background=random', 'strength', 5, 9000, 14, 3, 23000, 5, 22000, 82, 1),
('fake-PumperPaul', 'PumperPaul', 'https://ui-avatars.com/api/?name=Pumper+Paul&background=random', 'muscle_gain', 6, 11500, 17, 3, 24500, 5, 24000, 85, 1),
('fake-GainGeorge', 'GainGeorge', 'https://ui-avatars.com/api/?name=Gain+George&background=random', 'muscle_gain', 8, 12000, 17, 3, 25500, 6, 25000, 90, 1),
('fake-StrongSteffi', 'StrongSteffi', 'https://ui-avatars.com/api/?name=Strong+Steffi&background=random', 'strength', 6, 9800, 15, 3, 21500, 5, 20500, 85, 1),
('fake-EndureEric', 'EndureEric', 'https://ui-avatars.com/api/?name=Endure+Eric&background=random', 'endurance', 7, 10200, 16, 3, 15000, 6, 14500, 88, 1),
-- Platin Liga (ID 4)
('fake-ChrisChamp', 'ChrisChamp', 'https://ui-avatars.com/api/?name=Chris+Champ&background=random', 'muscle_gain', 10, 28000, 26, 4, 35000, 6, 33000, 90, 1),
('fake-SophieStark', 'SophieStark', 'https://ui-avatars.com/api/?name=Sophie+Stark&background=random', 'strength', 8, 22000, 22, 4, 30000, 6, 28000, 85, 1),
('fake-JonasJacked', 'JonasJacked', 'https://ui-avatars.com/api/?name=Jonas+Jacked&background=random', 'muscle_gain', 12, 35000, 30, 4, 42000, 7, 40000, 95, 1),
('fake-BeastBob', 'BeastBob', 'https://ui-avatars.com/api/?name=Beast+Bob&background=random', 'strength', 11, 32000, 28, 4, 38000, 6, 36000, 92, 1),
('fake-IronIris', 'IronIris', 'https://ui-avatars.com/api/?name=Iron+Iris&background=random', 'muscle_gain', 9, 29000, 27, 4, 34000, 6, 32000, 88, 1),
('fake-TitanTom', 'TitanTom', 'https://ui-avatars.com/api/?name=Titan+Tom&background=random', 'strength', 13, 36000, 31, 4, 40000, 7, 38000, 94, 1),
('fake-MachineMax', 'MachineMax', 'https://ui-avatars.com/api/?name=Machine+Max&background=random', 'muscle_gain', 11, 33000, 29, 4, 39000, 6, 37000, 92, 1),
('fake-SteelSarah', 'SteelSarah', 'https://ui-avatars.com/api/?name=Steel+Sarah&background=random', 'strength', 12, 34000, 30, 4, 41000, 7, 40000, 93, 1),
('fake-GainsGus', 'GainsGus', 'https://ui-avatars.com/api/?name=Gains+Gus&background=random', 'muscle_gain', 13, 37000, 32, 4, 43000, 7, 41000, 94, 1),
('fake-VikingVictor', 'VikingVictor', 'https://ui-avatars.com/api/?name=Viking+Victor&background=random', 'strength', 11, 31000, 27, 4, 37000, 6, 35000, 91, 1),
-- Diamant Liga (ID 5)
('fake-AthletAlex', 'AthletAlex', 'https://ui-avatars.com/api/?name=Athlet+Alex&background=random', 'muscle_gain', 15, 65000, 40, 5, 55000, 7, 52000, 95, 1),
('fake-ProPaula', 'ProPaula', 'https://ui-avatars.com/api/?name=Pro+Paula&background=random', 'strength', 14, 58000, 38, 5, 48000, 7, 46000, 90, 1),
('fake-EliteErik', 'EliteErik', 'https://ui-avatars.com/api/?name=Elite+Erik&background=random', 'muscle_gain', 18, 72000, 42, 5, 60000, 9, 58000, 97, 1),
('fake-HulkHogan', 'HulkHogan', 'https://ui-avatars.com/api/?name=Hulk+Hogan&background=random', 'muscle_gain', 20, 80000, 45, 5, 65000, 10, 62000, 98, 1),
('fake-ThorThunder', 'ThorThunder', 'https://ui-avatars.com/api/?name=Thor+Thunder&background=random', 'strength', 19, 75000, 44, 5, 62000, 9, 60000, 97, 1),
('fake-IronMan', 'IronMan', 'https://ui-avatars.com/api/?name=Iron+Man&background=random', 'muscle_gain', 17, 70000, 42, 5, 58000, 8, 56000, 96, 1),
('fake-SpartanSam', 'SpartanSam', 'https://ui-avatars.com/api/?name=Spartan+Sam&background=random', 'endurance', 21, 55000, 36, 5, 30000, 12, 28000, 99, 1),
('fake-OlympianOli', 'OlympianOli', 'https://ui-avatars.com/api/?name=Olympian+Oli&background=random', 'muscle_gain', 18, 73000, 43, 5, 61000, 9, 59000, 97, 1),
('fake-HerculesHank', 'HerculesHank', 'https://ui-avatars.com/api/?name=Hercules+Hank&background=random', 'strength', 20, 78000, 44, 5, 64000, 10, 62000, 98, 1),
('fake-LegendLeo', 'LegendLeo', 'https://ui-avatars.com/api/?name=Legend+Leo&background=random', 'strength', 19, 74000, 43, 5, 61500, 9, 60000, 97, 1),
-- Champion Liga (ID 6)
('fake-GymGott', 'GymGott', 'https://ui-avatars.com/api/?name=Gym+Gott&background=random', 'muscle_gain', 25, 150000, 55, 6, 75000, 7, 70000, 98, 1),
('fake-Zeus', 'Zeus', 'https://ui-avatars.com/api/?name=Zeus&background=random', 'strength', 30, 200000, 65, 6, 90000, 10, 85000, 99, 1),
('fake-Athena', 'Athena', 'https://ui-avatars.com/api/?name=Athena&background=random', 'strength', 28, 180000, 60, 6, 85000, 9, 80000, 99, 1),
('fake-Kratos', 'Kratos', 'https://ui-avatars.com/api/?name=Kratos&background=random', 'muscle_gain', 35, 250000, 70, 6, 100000, 12, 95000, 100, 1),
('fake-Atlas', 'Atlas', 'https://ui-avatars.com/api/?name=Atlas&background=random', 'strength', 40, 300000, 80, 6, 120000, 14, 110000, 100, 1);

-- =====================================================
-- 3. WORKOUTS FÜR ALLE ECHTEN USER (30 Tage Historie)
-- =====================================================

-- WOCHE 1 (19. Dezember - 25. Dezember 2025)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=1 LIMIT 1), 
       datetime('2025-12-19 18:00:00'), datetime('2025-12-19 19:00:00'), 3600, 3200, 320, 'Push - Anfang'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=2 LIMIT 1), 
       datetime('2025-12-21 18:00:00'), datetime('2025-12-21 19:00:00'), 3600, 2800, 280, 'Pull - Leicht'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=3 LIMIT 1), 
       datetime('2025-12-23 17:00:00'), datetime('2025-12-23 18:00:00'), 3600, 4500, 450, 'Legs - Start'
FROM app_user;

-- WOCHE 2 (26. Dezember - 1. Januar)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=1 LIMIT 1), 
       datetime('2025-12-26 10:00:00'), datetime('2025-12-26 11:00:00'), 3600, 3500, 350, 'Weihnachts-Push'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=2 LIMIT 1), 
       datetime('2025-12-28 18:00:00'), datetime('2025-12-28 19:00:00'), 3600, 3200, 320, 'Pull Day'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=3 LIMIT 1), 
       datetime('2025-12-30 17:00:00'), datetime('2025-12-30 18:30:00'), 5400, 5200, 520, 'Silvester Legs'
FROM app_user;

-- WOCHE 3 (2. Januar - 8. Januar 2026)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=1 LIMIT 1), 
       datetime('2026-01-02 18:00:00'), datetime('2026-01-02 19:15:00'), 4500, 4000, 400, 'Neujahr Push'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, NULL, 
       datetime('2026-01-03 07:00:00'), datetime('2026-01-03 07:30:00'), 1800, 0, 200, 'Cardio'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=2 LIMIT 1), 
       datetime('2026-01-04 18:00:00'), datetime('2026-01-04 19:00:00'), 3600, 3800, 380, 'Pull Day'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=3 LIMIT 1), 
       datetime('2026-01-06 17:00:00'), datetime('2026-01-06 18:30:00'), 5400, 6000, 600, 'Heavy Legs'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=1 LIMIT 1), 
       datetime('2026-01-08 18:00:00'), datetime('2026-01-08 19:00:00'), 3600, 4500, 450, 'Push Progress'
FROM app_user;

-- WOCHE 4 (9. Januar - 11. Januar)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=2 LIMIT 1), 
       datetime('2026-01-09 18:00:00'), datetime('2026-01-09 19:00:00'), 3600, 4200, 420, 'Pull Strong'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=3 LIMIT 1), 
       datetime('2026-01-10 17:00:00'), datetime('2026-01-10 18:30:00'), 5400, 7200, 720, 'Leg Day Beast'
FROM app_user;

INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, NULL, 
       datetime('2026-01-11 09:00:00'), datetime('2026-01-11 09:30:00'), 1800, 0, 250, 'Active Recovery'
FROM app_user;

-- WOCHE 5: AKTUELLE WOCHE (12. Januar - 18. Januar 2026)
-- Montag
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=1 LIMIT 1), 
       datetime('2026-01-12 18:00:00'), datetime('2026-01-12 19:15:00'), 4500, 5500, 550, 'Montag Push Day'
FROM app_user;

-- Dienstag
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, NULL, 
       datetime('2026-01-13 07:00:00'), datetime('2026-01-13 07:45:00'), 2700, 0, 350, 'Cardio Morning'
FROM app_user;

-- Mittwoch Pull
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=2 LIMIT 1), 
       datetime('2026-01-14 18:00:00'), datetime('2026-01-14 19:00:00'), 3600, 4800, 480, 'Mittwoch Pull Day'
FROM app_user;

-- Donnerstag
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, NULL, 
       datetime('2026-01-15 12:00:00'), datetime('2026-01-15 12:30:00'), 1800, 0, 200, 'Kurzes HIIT'
FROM app_user;

-- Freitag Legs
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=3 LIMIT 1), 
       datetime('2026-01-16 17:00:00'), datetime('2026-01-16 18:30:00'), 5400, 8500, 850, 'Freitag Leg Day PR!'
FROM app_user;

-- Samstag
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, (SELECT id FROM training_plan_day WHERE day_number=1 LIMIT 1), 
       datetime('2026-01-17 10:00:00'), datetime('2026-01-17 11:00:00'), 3600, 5800, 580, 'Samstag Push Strong'
FROM app_user;

-- Sonntag (Heute)
INSERT INTO workout_session (user_id, training_plan_day_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
SELECT id, NULL, 
       datetime('2026-01-18 09:00:00'), datetime('2026-01-18 09:45:00'), 2700, 0, 300, 'Sonntag Erholung'
FROM app_user;

-- =====================================================
-- 4. WORKOUT SETS HINZUFÜGEN
-- =====================================================
-- Sets für alle Workouts mit Volume > 0
INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe)
SELECT ws.id, (SELECT id FROM exercise LIMIT 1), 1, 10, 60, 8
FROM workout_session ws WHERE ws.total_volume_kg > 0;

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe)
SELECT ws.id, (SELECT id FROM exercise LIMIT 1 OFFSET 1), 2, 8, 70, 8.5
FROM workout_session ws WHERE ws.total_volume_kg > 0;

INSERT INTO workout_set (workout_session_id, exercise_id, set_number, reps, weight_kg, rpe)
SELECT ws.id, (SELECT id FROM exercise LIMIT 1 OFFSET 2), 3, 12, 50, 7
FROM workout_session ws WHERE ws.total_volume_kg > 0;

-- =====================================================
-- 5. LOOTBOXEN FÜR ALLE USER
-- =====================================================
INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining, is_opened, earned_at)
SELECT id, 1, 3, 0, datetime('2026-01-18 10:00:00') FROM app_user;

INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining, is_opened, earned_at)
SELECT id, 1, 3, 0, datetime('2026-01-17 10:00:00') FROM app_user;

INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining, is_opened, earned_at)
SELECT id, 2, 3, 0, datetime('2026-01-16 10:00:00') FROM app_user;

INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining, is_opened, earned_at)
SELECT id, 3, 3, 0, datetime('2026-01-12 10:00:00') FROM app_user;

-- =====================================================
-- 6. BADGES FÜR ALLE USER
-- =====================================================
INSERT OR IGNORE INTO user_badge (user_id, badge_id, earned_at)
SELECT u.id, b.id, datetime('2026-01-12')
FROM app_user u, badge b WHERE b.code = 'first_workout';

INSERT OR IGNORE INTO user_badge (user_id, badge_id, earned_at)
SELECT u.id, b.id, datetime('2026-01-15')
FROM app_user u, badge b WHERE b.code = 'streak_2';

INSERT OR IGNORE INTO user_badge (user_id, badge_id, earned_at)
SELECT u.id, b.id, datetime('2026-01-16')
FROM app_user u, badge b WHERE b.code = 'weight_50';

-- =====================================================
-- 7. INVENTORY FÜR ALLE USER
-- =====================================================
INSERT OR IGNORE INTO user_inventory (user_id, shop_item_id, quantity)
SELECT u.id, (SELECT id FROM shop_item WHERE code='streak_saver'), 3
FROM app_user u;

INSERT OR IGNORE INTO user_inventory (user_id, shop_item_id, quantity)
SELECT u.id, (SELECT id FROM shop_item WHERE code='xp_boost_2x'), 2
FROM app_user u;

-- =====================================================
-- 8. USER STATS AKTUALISIEREN
-- =====================================================
UPDATE app_user SET 
  current_streak = 7,
  longest_streak = 14,
  total_points = 5000,
  xp_total = 4000,
  current_level = 10,
  hantel_coins = 1500,
  onboarding_completed = 1,
  fitness_goal = 'muscle_gain',
  training_frequency_per_week = 5,
  experience_level = 'intermediate',
  last_workout_at = '2026-01-18 09:45:00';

-- =====================================================
-- FERTIG! Mockup-Daten wurden erstellt.
-- =====================================================
