-- Fake Users for Leaderboard (Migrated from db/init/005_fake_users_seed.sql)

INSERT INTO fake_user (id, display_name, avatar_url, fitness_goal, current_streak, xp_total, current_level, league_id, weekly_volume_kg, weekly_workout_count, base_weekly_volume, activity_probability) VALUES
-- Bronze League
('fake-MaxPower92', 'MaxPower92', NULL, 'muscle_gain', 2, 1200, 4, 1, 8500, 3, 8000, 60),
('fake-FitLena', 'FitLena', NULL, 'weight_loss', 1, 800, 3, 1, 5200, 2, 5000, 50),
('fake-SportlerTom', 'SportlerTom', NULL, 'strength', 3, 2100, 6, 1, 12000, 4, 11000, 70),
('fake-JuliaFit', 'JuliaFit', NULL, 'health', 1, 600, 2, 1, 4100, 2, 4000, 45),
('fake-BenGains', 'BenGains', NULL, 'muscle_gain', 2, 1500, 5, 1, 9800, 3, 9500, 65),

-- Silver League
('fake-AnnaStrong', 'AnnaStrong', NULL, 'strength', 4, 4500, 10, 2, 15200, 4, 14500, 75),
('fake-TimoTrain', 'TimoTrain', NULL, 'muscle_gain', 5, 5800, 11, 2, 18500, 5, 17000, 80),
('fake-LauraLift', 'LauraLift', NULL, 'muscle_gain', 3, 3200, 8, 2, 13200, 4, 12500, 70),
('fake-NikoFlex', 'NikoFlex', NULL, 'endurance', 4, 4100, 9, 2, 11800, 5, 11000, 75),
('fake-SarahSport', 'SarahSport', NULL, 'health', 2, 2800, 7, 2, 9500, 3, 9000, 60),

-- Gold League
('fake-MarcoMuscle', 'MarcoMuscle', NULL, 'muscle_gain', 6, 9500, 15, 3, 22000, 5, 21000, 85),
('fake-LisaLeistung', 'LisaLeistung', NULL, 'strength', 5, 7800, 13, 3, 19500, 5, 18500, 80),
('fake-DavidDedicated', 'DavidDedicated', NULL, 'muscle_gain', 7, 11200, 16, 3, 25000, 6, 24000, 90),
('fake-EmmaEndurance', 'EmmaEndurance', NULL, 'endurance', 4, 6500, 12, 3, 14000, 6, 13000, 85),
('fake-FelixFit', 'FelixFit', NULL, 'strength', 5, 8200, 14, 3, 20500, 5, 19500, 80),

-- Platinum League
('fake-ChrisChamp', 'ChrisChamp', NULL, 'muscle_gain', 10, 28000, 26, 4, 35000, 6, 33000, 90),
('fake-SophieStark', 'SophieStark', NULL, 'strength', 8, 22000, 22, 4, 30000, 6, 28000, 85),
('fake-JonasJacked', 'JonasJacked', NULL, 'muscle_gain', 12, 35000, 30, 4, 42000, 7, 40000, 95),

-- Diamond League
('fake-AthletAlex', 'AthletAlex', NULL, 'muscle_gain', 15, 65000, 40, 5, 55000, 7, 52000, 95),
('fake-ProPaula', 'ProPaula', NULL, 'strength', 14, 58000, 38, 5, 48000, 7, 46000, 90),

-- Champion League
('fake-GymGott', 'GymGott', NULL, 'muscle_gain', 25, 150000, 55, 6, 75000, 7, 70000, 98)

ON CONFLICT(id) DO NOTHING;

-- Update avatar URLs
UPDATE fake_user SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(display_name, ' ', '+') || '&background=random&size=128'
WHERE avatar_url IS NULL;
