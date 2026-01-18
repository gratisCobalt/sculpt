-- Fake Users for Leaderboard (Migrated from db/init/005_fake_users_seed.sql)
-- UPDATED: Added ~80 more users for a total of ~100 users across all leagues.

INSERT INTO fake_user (id, display_name, avatar_url, fitness_goal, current_streak, xp_total, current_level, league_id, weekly_volume_kg, weekly_workout_count, base_weekly_volume, activity_probability) VALUES
-- Bronze League (Tier 1) - Beginners & Casuals
('fake-MaxPower92', 'MaxPower92', NULL, 'muscle_gain', 2, 1200, 4, 1, 8500, 3, 8000, 60),
('fake-FitLena', 'FitLena', NULL, 'weight_loss', 1, 800, 3, 1, 5200, 2, 5000, 50),
('fake-SportlerTom', 'SportlerTom', NULL, 'strength', 3, 2100, 6, 1, 12000, 4, 11000, 70),
('fake-JuliaFit', 'JuliaFit', NULL, 'health', 1, 600, 2, 1, 4100, 2, 4000, 45),
('fake-BenGains', 'BenGains', NULL, 'muscle_gain', 2, 1500, 5, 1, 9800, 3, 9500, 65),
('fake-CasualCarl', 'CasualCarl', NULL, 'health', 0, 400, 1, 1, 2500, 1, 3000, 30),
('fake-NewbieNina', 'NewbieNina', NULL, 'weight_loss', 2, 900, 3, 1, 6000, 2, 5500, 50),
('fake-LazyLarry', 'LazyLarry', NULL, 'strength', 0, 200, 1, 1, 1500, 1, 2000, 20),
('fake-StarterSteve', 'StarterSteve', NULL, 'muscle_gain', 1, 1100, 4, 1, 7500, 3, 7000, 60),
('fake-BeginnerBetty', 'BeginnerBetty', NULL, 'health', 3, 1300, 5, 1, 5800, 2, 5000, 55),
('fake-TomTraining', 'TomTraining', NULL, 'strength', 1, 1600, 5, 1, 8900, 3, 9000, 60),
('fake-YogaYvonne', 'YogaYvonne', NULL, 'flexibility', 4, 2200, 6, 1, 3000, 4, 3000, 75),
('fake-RunnerRick', 'RunnerRick', NULL, 'endurance', 2, 1800, 5, 1, 4000, 3, 4000, 65),
('fake-GymGary', 'GymGary', NULL, 'muscle_gain', 1, 1400, 4, 1, 9200, 3, 9000, 60),
('fake-FitFiona', 'FitFiona', NULL, 'weight_loss', 2, 1100, 3, 1, 5500, 2, 5000, 50),

-- Silver League (Tier 2) - Consistent
('fake-AnnaStrong', 'AnnaStrong', NULL, 'strength', 4, 4500, 10, 2, 15200, 4, 14500, 75),
('fake-TimoTrain', 'TimoTrain', NULL, 'muscle_gain', 5, 5800, 11, 2, 18500, 5, 17000, 80),
('fake-LauraLift', 'LauraLift', NULL, 'muscle_gain', 3, 3200, 8, 2, 13200, 4, 12500, 70),
('fake-NikoFlex', 'NikoFlex', NULL, 'endurance', 4, 4100, 9, 2, 11800, 5, 11000, 75),
('fake-SarahSport', 'SarahSport', NULL, 'health', 2, 2800, 7, 2, 9500, 3, 9000, 60),
('fake-IronIngo', 'IronIngo', NULL, 'strength', 3, 5000, 10, 2, 16000, 4, 15500, 70),
('fake-PowerPetra', 'PowerPetra', NULL, 'muscle_gain', 4, 4800, 9, 2, 14500, 4, 14000, 72),
('fake-CardioChris', 'CardioChris', NULL, 'endurance', 6, 6000, 12, 2, 8000, 5, 8000, 85),
('fake-ActiveAndy', 'ActiveAndy', NULL, 'health', 3, 3500, 8, 2, 10500, 3, 10000, 65),
('fake-BulkBen', 'BulkBen', NULL, 'muscle_gain', 2, 3900, 9, 2, 17000, 4, 16500, 68),
('fake-ShapeSarah', 'ShapeSarah', NULL, 'weight_loss', 4, 4200, 10, 2, 11000, 4, 10500, 75),
('fake-MoveMike', 'MoveMike', NULL, 'strength', 3, 3100, 8, 2, 13500, 3, 13000, 65),
('fake-FitFrank', 'FitFrank', NULL, 'muscle_gain', 5, 5200, 11, 2, 17500, 5, 17000, 80),
('fake-GymGina', 'GymGina', NULL, 'strength', 4, 4600, 10, 2, 15000, 4, 14500, 75),
('fake-RunRob', 'RunRob', NULL, 'endurance', 3, 3800, 9, 2, 9000, 4, 9000, 70),

-- Gold League (Tier 3) - Dedicated
('fake-MarcoMuscle', 'MarcoMuscle', NULL, 'muscle_gain', 6, 9500, 15, 3, 22000, 5, 21000, 85),
('fake-LisaLeistung', 'LisaLeistung', NULL, 'strength', 5, 7800, 13, 3, 19500, 5, 18500, 80),
('fake-DavidDedicated', 'DavidDedicated', NULL, 'muscle_gain', 7, 11200, 16, 3, 25000, 6, 24000, 90),
('fake-EmmaEndurance', 'EmmaEndurance', NULL, 'endurance', 4, 6500, 12, 3, 14000, 6, 13000, 85),
('fake-FelixFit', 'FelixFit', NULL, 'strength', 5, 8200, 14, 3, 20500, 5, 19500, 80),
('fake-SolidSimon', 'SolidSimon', NULL, 'muscle_gain', 8, 12500, 17, 3, 26000, 6, 25000, 90),
('fake-ToughTina', 'ToughTina', NULL, 'strength', 6, 10000, 15, 3, 21000, 5, 20000, 85),
('fake-MarathonMark', 'MarathonMark', NULL, 'endurance', 9, 13000, 18, 3, 16000, 6, 15000, 92),
('fake-CrossfitCarl', 'CrossfitCarl', NULL, 'strength', 5, 9000, 14, 3, 23000, 5, 22000, 82),
('fake-HoneHanna', 'HoneHanna', NULL, 'weight_loss', 7, 10500, 16, 3, 18000, 5, 17500, 88),
('fake-PumperPaul', 'PumperPaul', NULL, 'muscle_gain', 6, 11500, 17, 3, 24500, 5, 24000, 85),
('fake-LimitLisa', 'LimitLisa', NULL, 'strength', 5, 8800, 14, 3, 20000, 5, 19000, 80),
('fake-GainGeorge', 'GainGeorge', NULL, 'muscle_gain', 8, 12000, 17, 3, 25500, 6, 25000, 90),
('fake-StrongSteffi', 'StrongSteffi', NULL, 'strength', 6, 9800, 15, 3, 21500, 5, 20500, 85),
('fake-EndureEric', 'EndureEric', NULL, 'endurance', 7, 10200, 16, 3, 15000, 6, 14500, 88),

-- Platinum League (Tier 4) - Athletes
('fake-ChrisChamp', 'ChrisChamp', NULL, 'muscle_gain', 10, 28000, 26, 4, 35000, 6, 33000, 90),
('fake-SophieStark', 'SophieStark', NULL, 'strength', 8, 22000, 22, 4, 30000, 6, 28000, 85),
('fake-JonasJacked', 'JonasJacked', NULL, 'muscle_gain', 12, 35000, 30, 4, 42000, 7, 40000, 95),
('fake-BeastBob', 'BeastBob', NULL, 'strength', 11, 32000, 28, 4, 38000, 6, 36000, 92),
('fake-IronIris', 'IronIris', NULL, 'muscle_gain', 9, 29000, 27, 4, 34000, 6, 32000, 88),
('fake-TitanTom', 'TitanTom', NULL, 'strength', 13, 36000, 31, 4, 40000, 7, 38000, 94),
('fake-PowerPaula', 'PowerPaula', NULL, 'muscle_gain', 10, 30000, 28, 4, 36000, 6, 34000, 90),
('fake-UltraUwe', 'UltraUwe', NULL, 'endurance', 14, 25000, 25, 4, 20000, 7, 19000, 95),
('fake-MachineMax', 'MachineMax', NULL, 'muscle_gain', 11, 33000, 29, 4, 39000, 6, 37000, 92),
('fake-SteelSarah', 'SteelSarah', NULL, 'strength', 12, 34000, 30, 4, 41000, 7, 40000, 93),
('fake-FlexFelix', 'FlexFelix', NULL, 'muscle_gain', 10, 28500, 26, 4, 35500, 6, 33500, 90),
('fake-RippedRita', 'RippedRita', NULL, 'weight_loss', 9, 27000, 25, 4, 32000, 6, 31000, 88),
('fake-GainsGus', 'GainsGus', NULL, 'muscle_gain', 13, 37000, 32, 4, 43000, 7, 41000, 94),
('fake-VikingVictor', 'VikingVictor', NULL, 'strength', 11, 31000, 27, 4, 37000, 6, 35000, 91),
('fake-AmazonAmy', 'AmazonAmy', NULL, 'strength', 10, 29500, 26, 4, 34500, 6, 33000, 89),

-- Diamond League (Tier 5) - Elites
('fake-AthletAlex', 'AthletAlex', NULL, 'muscle_gain', 15, 65000, 40, 5, 55000, 7, 52000, 95),
('fake-ProPaula', 'ProPaula', NULL, 'strength', 14, 58000, 38, 5, 48000, 7, 46000, 90),
('fake-EliteErik', 'EliteErik', NULL, 'muscle_gain', 18, 72000, 42, 5, 60000, 9, 58000, 97),
('fake-WonderWoman', 'WonderWoman', NULL, 'strength', 16, 68000, 41, 5, 56000, 8, 54000, 96),
('fake-HulkHogan', 'HulkHogan', NULL, 'muscle_gain', 20, 80000, 45, 5, 65000, 10, 62000, 98),
('fake-XenaWarrior', 'XenaWarrior', NULL, 'strength', 15, 62000, 39, 5, 50000, 8, 48000, 94),
('fake-ThorThunder', 'ThorThunder', NULL, 'strength', 19, 75000, 44, 5, 62000, 9, 60000, 97),
('fake-IronMan', 'IronMan', NULL, 'muscle_gain', 17, 70000, 42, 5, 58000, 8, 56000, 96),
('fake-SpartanSam', 'SpartanSam', NULL, 'endurance', 21, 55000, 36, 5, 30000, 12, 28000, 99),
('fake-ValkyrieVal', 'ValkyrieVal', NULL, 'strength', 16, 64000, 40, 5, 52000, 8, 50000, 95),
('fake-OlympianOli', 'OlympianOli', NULL, 'muscle_gain', 18, 73000, 43, 5, 61000, 9, 59000, 97),
('fake-GoddessGaia', 'GoddessGaia', NULL, 'strength', 15, 60000, 39, 5, 49000, 8, 47000, 94),
('fake-HerculesHank', 'HerculesHank', NULL, 'strength', 20, 78000, 44, 5, 64000, 10, 62000, 98),
('fake-PowerPia', 'PowerPia', NULL, 'muscle_gain', 17, 69000, 42, 5, 57000, 8, 55000, 96),
('fake-LegendLeo', 'LegendLeo', NULL, 'strength', 19, 74000, 43, 5, 61500, 9, 60000, 97),

-- Champion League (Tier 6) - Gods
('fake-GymGott', 'GymGott', NULL, 'muscle_gain', 25, 150000, 55, 6, 75000, 7, 70000, 98),
('fake-Zeus', 'Zeus', NULL, 'strength', 30, 200000, 65, 6, 90000, 10, 85000, 99),
('fake-Athena', 'Athena', NULL, 'strength', 28, 180000, 60, 6, 85000, 9, 80000, 99),
('fake-Kratos', 'Kratos', NULL, 'muscle_gain', 35, 250000, 70, 6, 100000, 12, 95000, 100),
('fake-Atlas', 'Atlas', NULL, 'strength', 40, 300000, 80, 6, 120000, 14, 110000, 100)

ON CONFLICT(id) DO NOTHING;

-- Update avatar URLs
UPDATE fake_user SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(display_name, ' ', '+') || '&background=random&size=128'
WHERE avatar_url IS NULL;
