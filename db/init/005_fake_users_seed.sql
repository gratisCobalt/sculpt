-- =====================================================
-- FAKE USERS FOR LEADERBOARD (Realistic German Names)
-- =====================================================

-- These users look completely real but are controlled by the system
-- Their stats are moderate to not demotivate real users

INSERT INTO fake_user (display_name, avatar_url, fitness_goal, current_streak, xp_total, current_level, league_id, weekly_volume_kg, weekly_workout_count, base_weekly_volume, activity_probability) VALUES
-- Bronze League (moderate stats)
('MaxPower92', NULL, 'muscle_gain', 2, 1200, 4, 1, 8500, 3, 8000, 60),
('FitLena', NULL, 'weight_loss', 1, 800, 3, 1, 5200, 2, 5000, 50),
('SportlerTom', NULL, 'strength', 3, 2100, 6, 1, 12000, 4, 11000, 70),
('JuliaFit', NULL, 'health', 1, 600, 2, 1, 4100, 2, 4000, 45),
('BenGains', NULL, 'muscle_gain', 2, 1500, 5, 1, 9800, 3, 9500, 65),

-- Silver League (slightly better)
('AnnaStrong', NULL, 'strength', 4, 4500, 10, 2, 15200, 4, 14500, 75),
('TimoTrain', NULL, 'muscle_gain', 5, 5800, 11, 2, 18500, 5, 17000, 80),
('LauraLift', NULL, 'muscle_gain', 3, 3200, 8, 2, 13200, 4, 12500, 70),
('NikoFlex', NULL, 'endurance', 4, 4100, 9, 2, 11800, 5, 11000, 75),
('SarahSport', NULL, 'health', 2, 2800, 7, 2, 9500, 3, 9000, 60),

-- Gold League (good but reachable)
('MarcoMuscle', NULL, 'muscle_gain', 6, 9500, 15, 3, 22000, 5, 21000, 85),
('LisaLeistung', NULL, 'strength', 5, 7800, 13, 3, 19500, 5, 18500, 80),
('DavidDedicated', NULL, 'muscle_gain', 7, 11200, 16, 3, 25000, 6, 24000, 90),
('EmmaEndurance', NULL, 'endurance', 4, 6500, 12, 3, 14000, 6, 13000, 85),
('FelixFit', NULL, 'strength', 5, 8200, 14, 3, 20500, 5, 19500, 80),

-- Platinum League (aspirational)
('ChrisChamp', NULL, 'muscle_gain', 10, 28000, 26, 4, 35000, 6, 33000, 90),
('SophieStark', NULL, 'strength', 8, 22000, 22, 4, 30000, 6, 28000, 85),
('JonasJacked', NULL, 'muscle_gain', 12, 35000, 30, 4, 42000, 7, 40000, 95),

-- Diamond League (elite)
('AthletAlex', NULL, 'muscle_gain', 15, 65000, 40, 5, 55000, 7, 52000, 95),
('ProPaula', NULL, 'strength', 14, 58000, 38, 5, 48000, 7, 46000, 90),

-- Champion League (only 1-2, very rare)
('GymGott', NULL, 'muscle_gain', 25, 150000, 55, 6, 75000, 7, 70000, 98)

ON CONFLICT DO NOTHING;

-- Add some variety in avatars (using UI Avatars service or similar)
UPDATE fake_user SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(display_name, ' ', '+') || '&background=random&size=128'
WHERE avatar_url IS NULL;
