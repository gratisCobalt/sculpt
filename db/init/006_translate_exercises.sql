-- Manual German translations for common exercises
-- Run this when API rate limits are reached

-- Common compound movements
UPDATE exercise SET name_de = 'Bankdrücken' WHERE name ILIKE 'Bench Press' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Kniebeuge' WHERE name ILIKE 'Squat' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Kreuzheben' WHERE name ILIKE 'Deadlift' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Klimmzug' WHERE name ILIKE 'Pull Up' OR name ILIKE 'Pullup' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Rudern' WHERE name ILIKE '%Row%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Schulterdrücken' WHERE name ILIKE '%Shoulder Press%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Liegestütze' WHERE name ILIKE '%Push Up%' OR name ILIKE '%Pushup%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Dips' WHERE name ILIKE '%Dip%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Ausfallschritt' WHERE name ILIKE '%Lunge%' AND name_de IS NULL;

-- Chest exercises
UPDATE exercise SET name_de = 'Schrägbankdrücken' WHERE name ILIKE '%Incline%Press%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Negativbankdrücken' WHERE name ILIKE '%Decline%Press%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Fliegende' WHERE name ILIKE '%Fly%' OR name ILIKE '%Flye%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Kabelzug über Kreuz' WHERE name ILIKE '%Cable Crossover%' AND name_de IS NULL;

-- Back exercises  
UPDATE exercise SET name_de = 'Latzug' WHERE name ILIKE '%Lat Pulldown%' OR name ILIKE '%Latpulldown%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Langhantelrudern' WHERE name ILIKE '%Barbell Row%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Einarmiges Rudern' WHERE name ILIKE '%One Arm%Row%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Kabelrudern' WHERE name ILIKE '%Cable Row%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Hyperextension' WHERE name ILIKE '%Hyperextension%' AND name_de IS NULL;

-- Shoulder exercises
UPDATE exercise SET name_de = 'Seitheben' WHERE name ILIKE '%Lateral Raise%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Frontheben' WHERE name ILIKE '%Front Raise%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Vorgebeugtes Seitheben' WHERE name ILIKE '%Rear Delt%' OR name ILIKE '%Reverse Fly%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Schulterheben' WHERE name ILIKE '%Shrug%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Aufrechtes Rudern' WHERE name ILIKE '%Upright Row%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Face Pull' WHERE name ILIKE '%Face Pull%' AND name_de IS NULL;

-- Arm exercises
UPDATE exercise SET name_de = 'Bizeps-Curl' WHERE name ILIKE '%Bicep%Curl%' OR name ILIKE '%Biceps Curl%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Hammer-Curl' WHERE name ILIKE '%Hammer Curl%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Konzentrations-Curl' WHERE name ILIKE '%Concentration Curl%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Scott-Curl' WHERE name ILIKE '%Preacher Curl%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Trizepsdrücken' WHERE name ILIKE '%Tricep%Press%' OR name ILIKE '%Triceps%Press%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Trizeps-Kickback' WHERE name ILIKE '%Kickback%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'French Press' WHERE name ILIKE '%French Press%' OR name ILIKE '%Skull Crusher%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Kabeldrücken' WHERE name ILIKE '%Pushdown%' OR name ILIKE '%Push Down%' AND name_de IS NULL;

-- Leg exercises
UPDATE exercise SET name_de = 'Beinpresse' WHERE name ILIKE '%Leg Press%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Beinstrecker' WHERE name ILIKE '%Leg Extension%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Beinbeuger' WHERE name ILIKE '%Leg Curl%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Wadenheben' WHERE name ILIKE '%Calf Raise%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Bulgarische Kniebeuge' WHERE name ILIKE '%Bulgarian%Squat%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Goblet-Kniebeuge' WHERE name ILIKE '%Goblet Squat%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Sumo-Kniebeuge' WHERE name ILIKE '%Sumo Squat%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Rumänisches Kreuzheben' WHERE name ILIKE '%Romanian Deadlift%' OR name ILIKE '%RDL%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Hip Thrust' WHERE name ILIKE '%Hip Thrust%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Glute Bridge' WHERE name ILIKE '%Glute Bridge%' AND name_de IS NULL;

-- Core exercises
UPDATE exercise SET name_de = 'Crunches' WHERE name ILIKE '%Crunch%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Sit-Ups' WHERE name ILIKE '%Sit Up%' OR name ILIKE '%Situp%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Plank' WHERE name ILIKE '%Plank%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Beinheben' WHERE name ILIKE '%Leg Raise%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Russian Twist' WHERE name ILIKE '%Russian Twist%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Mountain Climber' WHERE name ILIKE '%Mountain Climber%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Ab Wheel Rollout' WHERE name ILIKE '%Ab Wheel%' OR name ILIKE '%Ab Roller%' AND name_de IS NULL;

-- Cardio
UPDATE exercise SET name_de = 'Laufband' WHERE name ILIKE '%Treadmill%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Crosstrainer' WHERE name ILIKE '%Elliptical%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Rudergerät' WHERE name ILIKE '%Rowing Machine%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Fahrradergometer' WHERE name ILIKE '%Bike%' OR name ILIKE '%Cycle%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Seilspringen' WHERE name ILIKE '%Jump Rope%' OR name ILIKE '%Skipping%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Burpees' WHERE name ILIKE '%Burpee%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Hampelmann' WHERE name ILIKE '%Jumping Jack%' AND name_de IS NULL;

-- Stretching
UPDATE exercise SET name_de = 'Dehnung' WHERE name ILIKE '%Stretch%' AND name_de IS NULL;
UPDATE exercise SET name_de = 'Nackendehnung' WHERE name ILIKE '%Neck Stretch%' AND name_de IS NULL;

-- For any remaining unmatched - just use the English name as fallback
-- This ensures all exercises have at least SOME name_de value
UPDATE exercise SET name_de = name WHERE name_de IS NULL;

-- Show results
SELECT name, name_de FROM exercise ORDER BY name LIMIT 20;
