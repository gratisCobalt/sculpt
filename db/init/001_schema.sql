-- =====================================================
-- SCULPT FITNESS APP - DATABASE SCHEMA (5NF)
-- =====================================================
-- Normalized to 5th Normal Form - No JSON, No Arrays
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- LOOKUP TABLES (Reference Data)
-- =====================================================

-- Gender options
CREATE TABLE gender (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name_de VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL
);

INSERT INTO gender (code, name_de, name_en) VALUES
    ('male', 'Männlich', 'Male'),
    ('female', 'Weiblich', 'Female'),
    ('diverse', 'Divers', 'Diverse');

-- Badge rarity levels
CREATE TABLE badge_rarity (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_de VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    points_multiplier DECIMAL(3,2) DEFAULT 1.00
);

INSERT INTO badge_rarity (code, name_de, name_en, color_hex, points_multiplier) VALUES
    ('common', 'Gewöhnlich', 'Common', '#9CA3AF', 1.00),
    ('rare', 'Selten', 'Rare', '#3B82F6', 1.50),
    ('epic', 'Episch', 'Epic', '#8B5CF6', 2.00),
    ('legendary', 'Legendär', 'Legendary', '#F59E0B', 3.00);

-- Exercise types
CREATE TABLE exercise_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL
);

INSERT INTO exercise_type (code, name_de, name_en) VALUES
    ('STRENGTH', 'Kraft', 'Strength'),
    ('CARDIO', 'Ausdauer', 'Cardio'),
    ('STRETCHING', 'Dehnung', 'Stretching'),
    ('PLYOMETRICS', 'Plyometrie', 'Plyometrics'),
    ('POWERLIFTING', 'Kraftdreikampf', 'Powerlifting'),
    ('STRONGMAN', 'Strongman', 'Strongman'),
    ('OLYMPIC_WEIGHTLIFTING', 'Olympisches Gewichtheben', 'Olympic Weightlifting');

-- Body parts
CREATE TABLE body_part (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50)
);

INSERT INTO body_part (code, name_de, name_en, icon_name) VALUES
    ('CHEST', 'Brust', 'Chest', 'heart'),
    ('BACK', 'Rücken', 'Back', 'arrow-left'),
    ('SHOULDERS', 'Schultern', 'Shoulders', 'chevrons-up'),
    ('UPPER_ARMS', 'Oberarme', 'Upper Arms', 'biceps'),
    ('LOWER_ARMS', 'Unterarme', 'Lower Arms', 'hand'),
    ('UPPER_LEGS', 'Oberschenkel', 'Upper Legs', 'leg'),
    ('LOWER_LEGS', 'Unterschenkel', 'Lower Legs', 'foot'),
    ('WAIST', 'Bauch', 'Waist', 'circle'),
    ('CARDIO', 'Cardio', 'Cardio', 'activity'),
    ('NECK', 'Nacken', 'Neck', 'move-vertical');

-- Equipment types
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    image_url TEXT
);

INSERT INTO equipment (code, name_de, name_en, image_url) VALUES
    ('BARBELL', 'Langhantel', 'Barbell', 'https://cdn.exercisedb.dev/equipments/equipment-barbell.webp'),
    ('DUMBBELL', 'Kurzhantel', 'Dumbbell', 'https://cdn.exercisedb.dev/equipments/equipment-Dumbbell.webp'),
    ('CABLE', 'Kabelzug', 'Cable', 'https://cdn.exercisedb.dev/equipments/equipment-Cable-1.webp'),
    ('BODY_WEIGHT', 'Körpergewicht', 'Body Weight', 'https://cdn.exercisedb.dev/equipments/equipment-Body-weight.webp'),
    ('KETTLEBELL', 'Kettlebell', 'Kettlebell', 'https://cdn.exercisedb.dev/equipments/equipment-Kettlebell.webp'),
    ('LEVERAGE_MACHINE', 'Maschine', 'Leverage Machine', 'https://cdn.exercisedb.dev/equipments/equipment-Leverage-machine.webp'),
    ('SMITH_MACHINE', 'Smith Machine', 'Smith Machine', 'https://cdn.exercisedb.dev/equipments/equipment-Smith-machine.webp'),
    ('EZ_BARBELL', 'SZ-Stange', 'EZ Barbell', 'https://cdn.exercisedb.dev/equipments/equipment-EZ-Barbell.webp'),
    ('RESISTANCE_BAND', 'Widerstandsband', 'Resistance Band', 'https://cdn.exercisedb.dev/equipments/equipment-Resistance-Band.webp'),
    ('STABILITY_BALL', 'Gymnastikball', 'Stability Ball', 'https://cdn.exercisedb.dev/equipments/equipment-Stability-ball.webp'),
    ('MEDICINE_BALL', 'Medizinball', 'Medicine Ball', 'https://cdn.exercisedb.dev/equipments/equipment-Medicine-Ball.webp'),
    ('ASSISTED', 'Unterstützt', 'Assisted', 'https://cdn.exercisedb.dev/equipments/equipment-assisted.webp'),
    ('BAND', 'Band', 'Band', 'https://cdn.exercisedb.dev/equipments/equipment-band.webp'),
    ('BOSU_BALL', 'Bosu Ball', 'Bosu Ball', 'https://cdn.exercisedb.dev/equipments/equipment-Bosu-ball.webp'),
    ('TRAP_BAR', 'Trap Bar', 'Trap Bar', 'https://cdn.exercisedb.dev/equipments/equipment-Trap-bar.webp'),
    ('ROPE', 'Seil', 'Rope', 'https://cdn.exercisedb.dev/equipments/equipment-Jump-Rope.webp'),
    ('WEIGHTED', 'Gewichtet', 'Weighted', 'https://cdn.exercisedb.dev/equipments/equipment-Weighted.webp'),
    ('WHEEL_ROLLER', 'Ab Roller', 'Wheel Roller', 'https://cdn.exercisedb.dev/equipments/equipment-Wheel-Roller.webp'),
    ('SUSPENSION', 'Schlingentrainer', 'Suspension', 'https://cdn.exercisedb.dev/equipments/equipment-Suspension.webp'),
    ('HAMMER', 'Hammer', 'Hammer', 'https://cdn.exercisedb.dev/equipments/equipment-hammer.webp'),
    ('OLYMPIC_BARBELL', 'Olympische Langhantel', 'Olympic Barbell', 'https://cdn.exercisedb.dev/equipments/equipment-Olympic-barbell.webp'),
    ('SLED_MACHINE', 'Schlitten', 'Sled Machine', 'https://cdn.exercisedb.dev/equipments/equipment-Sled-machine.webp'),
    ('ROLL', 'Faszienrolle', 'Roll', 'https://cdn.exercisedb.dev/equipments/equipment-Massage-Roller.webp'),
    ('BATTLING_ROPE', 'Battle Rope', 'Battling Rope', 'https://cdn.exercisedb.dev/equipments/equipment-Battling-Rope.webp'),
    ('POWER_SLED', 'Power Sled', 'Power Sled', 'https://cdn.exercisedb.dev/equipments/equipment-Power-Sled.webp'),
    ('STICK', 'Stab', 'Stick', 'https://cdn.exercisedb.dev/equipments/equipment-Stick.webp'),
    ('ROLLBALL', 'Rollball', 'Rollball', 'https://cdn.exercisedb.dev/equipments/equipment-Roll-Ball.webp'),
    ('VIBRATE_PLATE', 'Vibrationsplatte', 'Vibrate Plate', 'https://cdn.exercisedb.dev/equipments/equipment-Vibrate-Plate.webp');

-- Muscles
CREATE TABLE muscle (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    body_part_id INTEGER REFERENCES body_part(id)
);

-- Radar chart attributes for exercises
CREATE TABLE exercise_attribute_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_de TEXT,
    description_en TEXT,
    min_value INTEGER DEFAULT 1,
    max_value INTEGER DEFAULT 10
);

INSERT INTO exercise_attribute_type (code, name_de, name_en, description_de, description_en) VALUES
    ('strength', 'Kraft', 'Strength', 'Wie viel maximale Kraft erforderlich ist', 'How much maximum strength is required'),
    ('endurance', 'Ausdauer', 'Endurance', 'Kardiovaskuläre Belastung', 'Cardiovascular demand'),
    ('technique', 'Technik', 'Technique', 'Komplexität der Bewegung', 'Movement complexity'),
    ('flexibility', 'Flexibilität', 'Flexibility', 'Benötigte Mobilität', 'Required mobility'),
    ('intensity', 'Intensität', 'Intensity', 'Gesamtbelastung pro Wiederholung', 'Overall load per repetition');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    display_name VARCHAR(100),
    avatar_url TEXT,
    gender_id INTEGER REFERENCES gender(id),
    body_weight_kg DECIMAL(5,2),
    
    -- Onboarding data
    onboarding_completed BOOLEAN DEFAULT FALSE,
    training_frequency_per_week INTEGER CHECK (training_frequency_per_week BETWEEN 1 AND 7),
    fitness_goal VARCHAR(50),
    experience_level VARCHAR(20),
    
    -- Stats
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    hantel_currency INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_workout_at TIMESTAMP WITH TIME ZONE
);

-- User focus areas (many-to-many with body_part)
CREATE TABLE user_focus_area (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    body_part_id INTEGER NOT NULL REFERENCES body_part(id),
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, body_part_id)
);

-- Exercises (from ExerciseDB API)
CREATE TABLE exercise (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_de VARCHAR(255),
    overview TEXT,
    overview_de TEXT,
    video_url TEXT,
    image_url TEXT,
    exercise_type_id INTEGER REFERENCES exercise_type(id),
    
    -- Calorie calculation
    met_value DECIMAL(4,2) DEFAULT 5.0,
    
    -- Caching
    api_last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise image resolutions
CREATE TABLE exercise_image (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    resolution VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    UNIQUE(exercise_id, resolution)
);

-- Exercise instructions (ordered steps)
CREATE TABLE exercise_instruction (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction_text TEXT NOT NULL,
    instruction_text_de TEXT,
    UNIQUE(exercise_id, step_number)
);

-- Exercise tips
CREATE TABLE exercise_tip (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    tip_number INTEGER NOT NULL,
    tip_text TEXT NOT NULL,
    tip_text_de TEXT,
    UNIQUE(exercise_id, tip_number)
);

-- Exercise variations
CREATE TABLE exercise_variation (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    variation_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    description_de TEXT,
    UNIQUE(exercise_id, variation_number)
);

-- Exercise keywords
CREATE TABLE exercise_keyword (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    UNIQUE(exercise_id, keyword)
);

-- Junction: Exercise <-> Body Part
CREATE TABLE exercise_body_part (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    body_part_id INTEGER NOT NULL REFERENCES body_part(id),
    UNIQUE(exercise_id, body_part_id)
);

-- Junction: Exercise <-> Equipment
CREATE TABLE exercise_equipment (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    UNIQUE(exercise_id, equipment_id)
);

-- Junction: Exercise <-> Target Muscle (primary)
CREATE TABLE exercise_target_muscle (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    muscle_id INTEGER NOT NULL REFERENCES muscle(id),
    UNIQUE(exercise_id, muscle_id)
);

-- Junction: Exercise <-> Secondary Muscle
CREATE TABLE exercise_secondary_muscle (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    muscle_id INTEGER NOT NULL REFERENCES muscle(id),
    UNIQUE(exercise_id, muscle_id)
);

-- Junction: Exercise <-> Related Exercise
CREATE TABLE exercise_related (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    related_exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    UNIQUE(exercise_id, related_exercise_id),
    CHECK(exercise_id != related_exercise_id)
);

-- Exercise radar chart values
CREATE TABLE exercise_attribute_value (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    attribute_type_id INTEGER NOT NULL REFERENCES exercise_attribute_type(id),
    value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 10),
    UNIQUE(exercise_id, attribute_type_id)
);

-- =====================================================
-- TRAINING PLANS
-- =====================================================

CREATE TABLE training_plan (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_de VARCHAR(255),
    description TEXT,
    description_de TEXT,
    created_by_id UUID REFERENCES app_user(id),
    is_system_plan BOOLEAN DEFAULT FALSE,
    days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE training_plan_day (
    id SERIAL PRIMARY KEY,
    training_plan_id INTEGER NOT NULL REFERENCES training_plan(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    name VARCHAR(100) NOT NULL,
    name_de VARCHAR(100),
    focus_description TEXT,
    UNIQUE(training_plan_id, day_number)
);

CREATE TABLE training_plan_exercise (
    id SERIAL PRIMARY KEY,
    training_plan_day_id INTEGER NOT NULL REFERENCES training_plan_day(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id),
    order_index INTEGER NOT NULL,
    sets INTEGER DEFAULT 3,
    min_reps INTEGER DEFAULT 8,
    max_reps INTEGER DEFAULT 12,
    rest_seconds INTEGER DEFAULT 90,
    notes TEXT,
    UNIQUE(training_plan_day_id, order_index)
);

-- User's active training plan
CREATE TABLE user_training_plan (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    training_plan_id INTEGER NOT NULL REFERENCES training_plan(id),
    current_day INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, training_plan_id)
);

-- =====================================================
-- WORKOUT TRACKING
-- =====================================================

CREATE TABLE workout_session (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    training_plan_day_id INTEGER REFERENCES training_plan_day(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    total_volume_kg DECIMAL(10,2) DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    notes TEXT
);

CREATE TABLE workout_set (
    id SERIAL PRIMARY KEY,
    workout_session_id INTEGER NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id),
    set_number INTEGER NOT NULL,
    weight_kg DECIMAL(6,2) NOT NULL,
    reps INTEGER NOT NULL,
    is_warmup BOOLEAN DEFAULT FALSE,
    is_pr BOOLEAN DEFAULT FALSE,
    rpe DECIMAL(3,1) CHECK (rpe BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personal records
CREATE TABLE personal_record (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercise(id),
    record_type VARCHAR(20) NOT NULL, -- 'weight', 'reps', 'volume'
    value DECIMAL(10,2) NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    workout_set_id INTEGER REFERENCES workout_set(id),
    UNIQUE(user_id, exercise_id, record_type)
);

-- =====================================================
-- BADGES & ACHIEVEMENTS
-- =====================================================

CREATE TABLE badge (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_de TEXT NOT NULL,
    description_en TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    rarity_id INTEGER NOT NULL REFERENCES badge_rarity(id),
    points INTEGER NOT NULL DEFAULT 10,
    
    -- Achievement criteria
    category VARCHAR(50) NOT NULL, -- 'workout_count', 'streak', 'weight', 'volume', 'category_master'
    threshold_value INTEGER,
    threshold_body_part_id INTEGER REFERENCES body_part(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_badge (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badge(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, badge_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_exercise_external_id ON exercise(external_id);
CREATE INDEX idx_exercise_name ON exercise(name);
CREATE INDEX idx_workout_session_user ON workout_session(user_id);
CREATE INDEX idx_workout_session_date ON workout_session(started_at);
CREATE INDEX idx_workout_set_session ON workout_set(workout_session_id);
CREATE INDEX idx_workout_set_exercise ON workout_set(exercise_id);
CREATE INDEX idx_user_badge_user ON user_badge(user_id);
CREATE INDEX idx_personal_record_user ON personal_record(user_id);
CREATE INDEX idx_app_user_email ON app_user(email);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_user_updated_at BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_updated_at BEFORE UPDATE ON exercise
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_plan_updated_at BEFORE UPDATE ON training_plan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL BADGE DATA
-- =====================================================

-- Workout Count Badges
INSERT INTO badge (code, name_de, name_en, description_de, description_en, icon_name, rarity_id, points, category, threshold_value) VALUES
    ('first_workout', 'Erste Schritte', 'First Steps', 'Absolviere dein erstes Workout', 'Complete your first workout', 'footprints', 1, 10, 'workout_count', 1),
    ('workout_10', 'Anfänger', 'Beginner', 'Absolviere 10 Workouts', 'Complete 10 workouts', 'dumbbell', 1, 25, 'workout_count', 10),
    ('workout_50', 'Fortgeschritten', 'Advanced', 'Absolviere 50 Workouts', 'Complete 50 workouts', 'trophy', 2, 50, 'workout_count', 50),
    ('workout_100', 'Veteran', 'Veteran', 'Absolviere 100 Workouts', 'Complete 100 workouts', 'medal', 3, 100, 'workout_count', 100),
    ('workout_500', 'Fitness-Legende', 'Fitness Legend', 'Absolviere 500 Workouts', 'Complete 500 workouts', 'crown', 4, 250, 'workout_count', 500);

-- Streak Badges
INSERT INTO badge (code, name_de, name_en, description_de, description_en, icon_name, rarity_id, points, category, threshold_value) VALUES
    ('streak_2', 'Konsistent', 'Consistent', '2 Wochen Streak', '2 week streak', 'flame', 1, 15, 'streak', 2),
    ('streak_4', 'Durchhalter', 'Perseverer', '4 Wochen Streak', '4 week streak', 'flame', 2, 40, 'streak', 4),
    ('streak_8', 'Unaufhaltsam', 'Unstoppable', '8 Wochen Streak', '8 week streak', 'flame', 3, 80, 'streak', 8),
    ('streak_12', 'Streak-Master', 'Streak Master', '12 Wochen Streak', '12 week streak', 'flame', 4, 150, 'streak', 12);

-- Weight Milestones
INSERT INTO badge (code, name_de, name_en, description_de, description_en, icon_name, rarity_id, points, category, threshold_value) VALUES
    ('weight_50', 'Kraftpaket', 'Powerhouse', 'Hebe 50kg in einer Übung', 'Lift 50kg in one exercise', 'weight', 1, 20, 'weight', 50),
    ('weight_100', 'Stark', 'Strong', 'Hebe 100kg in einer Übung', 'Lift 100kg in one exercise', 'weight', 2, 50, 'weight', 100),
    ('weight_150', 'Biest', 'Beast', 'Hebe 150kg in einer Übung', 'Lift 150kg in one exercise', 'weight', 3, 100, 'weight', 150),
    ('weight_200', 'Titan', 'Titan', 'Hebe 200kg in einer Übung', 'Lift 200kg in one exercise', 'weight', 4, 200, 'weight', 200);

-- Volume Milestones (total kg lifted)
INSERT INTO badge (code, name_de, name_en, description_de, description_en, icon_name, rarity_id, points, category, threshold_value) VALUES
    ('volume_10k', 'Volumen-Rookie', 'Volume Rookie', '10.000 kg Gesamtvolumen', '10,000 kg total volume', 'trending-up', 1, 30, 'volume', 10000),
    ('volume_50k', 'Volumen-Pro', 'Volume Pro', '50.000 kg Gesamtvolumen', '50,000 kg total volume', 'trending-up', 2, 60, 'volume', 50000),
    ('volume_100k', 'Volumen-Elite', 'Volume Elite', '100.000 kg Gesamtvolumen', '100,000 kg total volume', 'trending-up', 3, 120, 'volume', 100000),
    ('volume_500k', 'Volumen-Legende', 'Volume Legend', '500.000 kg Gesamtvolumen', '500,000 kg total volume', 'trending-up', 4, 250, 'volume', 500000);

-- =====================================================
-- DEFAULT TRAINING PLAN (Push/Pull/Legs)
-- =====================================================

INSERT INTO training_plan (name, name_de, description, description_de, is_system_plan, days_per_week) VALUES
    ('Push/Pull/Legs', 'Push/Pull/Beine', '3-day split focusing on push, pull, and leg movements', '3-Tage Split mit Fokus auf Drück-, Zug- und Beinübungen', TRUE, 3);
