-- =====================================================
-- SCULPT FITNESS APP - LEADERBOARD, RANKS & CHALLENGES
-- =====================================================

-- =====================================================
-- 1. LEVEL SYSTEM (Permanent XP-based progression)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_level (
    id SERIAL PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE,
    name_de VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    xp_required INTEGER NOT NULL,
    icon_name VARCHAR(50),
    color_hex VARCHAR(7)
);

-- Insert levels 1-100 with exponential XP curve
INSERT INTO user_level (level, name_de, name_en, xp_required, icon_name, color_hex) VALUES
-- Beginner (1-10)
(1, 'Neuling', 'Newcomer', 0, 'seedling', '#9CA3AF'),
(2, 'Neuling', 'Newcomer', 100, 'seedling', '#9CA3AF'),
(3, 'Neuling', 'Newcomer', 250, 'seedling', '#9CA3AF'),
(4, 'Neuling', 'Newcomer', 500, 'seedling', '#9CA3AF'),
(5, 'Neuling', 'Newcomer', 850, 'seedling', '#9CA3AF'),
(6, 'Anfänger', 'Beginner', 1300, 'leaf', '#6EE7B7'),
(7, 'Anfänger', 'Beginner', 1850, 'leaf', '#6EE7B7'),
(8, 'Anfänger', 'Beginner', 2500, 'leaf', '#6EE7B7'),
(9, 'Anfänger', 'Beginner', 3300, 'leaf', '#6EE7B7'),
(10, 'Anfänger', 'Beginner', 4200, 'leaf', '#6EE7B7'),
-- Intermediate (11-25)
(11, 'Fortgeschritten', 'Intermediate', 5200, 'flame', '#FCD34D'),
(12, 'Fortgeschritten', 'Intermediate', 6400, 'flame', '#FCD34D'),
(13, 'Fortgeschritten', 'Intermediate', 7800, 'flame', '#FCD34D'),
(14, 'Fortgeschritten', 'Intermediate', 9400, 'flame', '#FCD34D'),
(15, 'Fortgeschritten', 'Intermediate', 11200, 'flame', '#FCD34D'),
(16, 'Fortgeschritten', 'Intermediate', 13200, 'flame', '#FCD34D'),
(17, 'Fortgeschritten', 'Intermediate', 15500, 'flame', '#FCD34D'),
(18, 'Fortgeschritten', 'Intermediate', 18000, 'flame', '#FCD34D'),
(19, 'Fortgeschritten', 'Intermediate', 20800, 'flame', '#FCD34D'),
(20, 'Fortgeschritten', 'Intermediate', 24000, 'flame', '#FCD34D'),
(21, 'Erfahren', 'Experienced', 27500, 'star', '#F97316'),
(22, 'Erfahren', 'Experienced', 31500, 'star', '#F97316'),
(23, 'Erfahren', 'Experienced', 36000, 'star', '#F97316'),
(24, 'Erfahren', 'Experienced', 41000, 'star', '#F97316'),
(25, 'Erfahren', 'Experienced', 46500, 'star', '#F97316'),
-- Advanced (26-50)
(26, 'Profi', 'Pro', 52500, 'zap', '#EF4444'),
(27, 'Profi', 'Pro', 59000, 'zap', '#EF4444'),
(28, 'Profi', 'Pro', 66000, 'zap', '#EF4444'),
(29, 'Profi', 'Pro', 74000, 'zap', '#EF4444'),
(30, 'Profi', 'Pro', 82500, 'zap', '#EF4444'),
(31, 'Profi', 'Pro', 91500, 'zap', '#EF4444'),
(32, 'Profi', 'Pro', 101000, 'zap', '#EF4444'),
(33, 'Profi', 'Pro', 111500, 'zap', '#EF4444'),
(34, 'Profi', 'Pro', 122500, 'zap', '#EF4444'),
(35, 'Profi', 'Pro', 134500, 'zap', '#EF4444'),
(36, 'Veteran', 'Veteran', 147500, 'shield', '#8B5CF6'),
(37, 'Veteran', 'Veteran', 161500, 'shield', '#8B5CF6'),
(38, 'Veteran', 'Veteran', 176500, 'shield', '#8B5CF6'),
(39, 'Veteran', 'Veteran', 192500, 'shield', '#8B5CF6'),
(40, 'Veteran', 'Veteran', 210000, 'shield', '#8B5CF6'),
(41, 'Veteran', 'Veteran', 228500, 'shield', '#8B5CF6'),
(42, 'Veteran', 'Veteran', 248500, 'shield', '#8B5CF6'),
(43, 'Veteran', 'Veteran', 270000, 'shield', '#8B5CF6'),
(44, 'Veteran', 'Veteran', 293000, 'shield', '#8B5CF6'),
(45, 'Veteran', 'Veteran', 318000, 'shield', '#8B5CF6'),
(46, 'Elite', 'Elite', 345000, 'crown', '#EC4899'),
(47, 'Elite', 'Elite', 374000, 'crown', '#EC4899'),
(48, 'Elite', 'Elite', 405000, 'crown', '#EC4899'),
(49, 'Elite', 'Elite', 438000, 'crown', '#EC4899'),
(50, 'Elite', 'Elite', 475000, 'crown', '#EC4899'),
-- Master (51-75)
(51, 'Meister', 'Master', 515000, 'gem', '#06B6D4'),
(52, 'Meister', 'Master', 558000, 'gem', '#06B6D4'),
(53, 'Meister', 'Master', 604000, 'gem', '#06B6D4'),
(54, 'Meister', 'Master', 653000, 'gem', '#06B6D4'),
(55, 'Meister', 'Master', 705000, 'gem', '#06B6D4'),
(56, 'Meister', 'Master', 761000, 'gem', '#06B6D4'),
(57, 'Meister', 'Master', 820000, 'gem', '#06B6D4'),
(58, 'Meister', 'Master', 883000, 'gem', '#06B6D4'),
(59, 'Meister', 'Master', 950000, 'gem', '#06B6D4'),
(60, 'Meister', 'Master', 1021000, 'gem', '#06B6D4'),
(61, 'Großmeister', 'Grandmaster', 1096000, 'swords', '#14B8A6'),
(62, 'Großmeister', 'Grandmaster', 1176000, 'swords', '#14B8A6'),
(63, 'Großmeister', 'Grandmaster', 1261000, 'swords', '#14B8A6'),
(64, 'Großmeister', 'Grandmaster', 1351000, 'swords', '#14B8A6'),
(65, 'Großmeister', 'Grandmaster', 1447000, 'swords', '#14B8A6'),
(66, 'Großmeister', 'Grandmaster', 1548000, 'swords', '#14B8A6'),
(67, 'Großmeister', 'Grandmaster', 1656000, 'swords', '#14B8A6'),
(68, 'Großmeister', 'Grandmaster', 1770000, 'swords', '#14B8A6'),
(69, 'Großmeister', 'Grandmaster', 1891000, 'swords', '#14B8A6'),
(70, 'Großmeister', 'Grandmaster', 2019000, 'swords', '#14B8A6'),
(71, 'Champion', 'Champion', 2155000, 'trophy', '#FBBF24'),
(72, 'Champion', 'Champion', 2299000, 'trophy', '#FBBF24'),
(73, 'Champion', 'Champion', 2451000, 'trophy', '#FBBF24'),
(74, 'Champion', 'Champion', 2612000, 'trophy', '#FBBF24'),
(75, 'Champion', 'Champion', 2782000, 'trophy', '#FBBF24'),
-- Legend (76-100)
(76, 'Legende', 'Legend', 2962000, 'sparkles', '#F59E0B'),
(77, 'Legende', 'Legend', 3152000, 'sparkles', '#F59E0B'),
(78, 'Legende', 'Legend', 3353000, 'sparkles', '#F59E0B'),
(79, 'Legende', 'Legend', 3566000, 'sparkles', '#F59E0B'),
(80, 'Legende', 'Legend', 3791000, 'sparkles', '#F59E0B'),
(81, 'Legende', 'Legend', 4029000, 'sparkles', '#F59E0B'),
(82, 'Legende', 'Legend', 4281000, 'sparkles', '#F59E0B'),
(83, 'Legende', 'Legend', 4548000, 'sparkles', '#F59E0B'),
(84, 'Legende', 'Legend', 4831000, 'sparkles', '#F59E0B'),
(85, 'Legende', 'Legend', 5131000, 'sparkles', '#F59E0B'),
(86, 'Mythos', 'Mythic', 5449000, 'infinity', '#DC2626'),
(87, 'Mythos', 'Mythic', 5786000, 'infinity', '#DC2626'),
(88, 'Mythos', 'Mythic', 6144000, 'infinity', '#DC2626'),
(89, 'Mythos', 'Mythic', 6524000, 'infinity', '#DC2626'),
(90, 'Mythos', 'Mythic', 6928000, 'infinity', '#DC2626'),
(91, 'Mythos', 'Mythic', 7357000, 'infinity', '#DC2626'),
(92, 'Mythos', 'Mythic', 7814000, 'infinity', '#DC2626'),
(93, 'Mythos', 'Mythic', 8300000, 'infinity', '#DC2626'),
(94, 'Mythos', 'Mythic', 8818000, 'infinity', '#DC2626'),
(95, 'Mythos', 'Mythic', 9370000, 'infinity', '#DC2626'),
(96, 'Unsterblich', 'Immortal', 9958000, 'sun', '#7C3AED'),
(97, 'Unsterblich', 'Immortal', 10585000, 'sun', '#7C3AED'),
(98, 'Unsterblich', 'Immortal', 11254000, 'sun', '#7C3AED'),
(99, 'Unsterblich', 'Immortal', 11968000, 'sun', '#7C3AED'),
(100, 'Unsterblich', 'Immortal', 12730000, 'sun', '#7C3AED')
ON CONFLICT (level) DO NOTHING;

-- =====================================================
-- 2. LEAGUE SYSTEM (Weekly with promotion/demotion)
-- =====================================================

CREATE TABLE IF NOT EXISTS league_tier (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_de VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    tier_order INTEGER NOT NULL, -- 1 = lowest (Bronze), 6 = highest (Champion)
    icon_name VARCHAR(50),
    color_hex VARCHAR(7),
    promotion_threshold_percent INTEGER DEFAULT 20, -- Top X% get promoted
    demotion_threshold_percent INTEGER DEFAULT 20   -- Bottom X% get demoted
);

INSERT INTO league_tier (code, name_de, name_en, tier_order, icon_name, color_hex) VALUES
('bronze', 'Bronze Liga', 'Bronze League', 1, 'medal', '#CD7F32'),
('silver', 'Silber Liga', 'Silver League', 2, 'medal', '#C0C0C0'),
('gold', 'Gold Liga', 'Gold League', 3, 'medal', '#FFD700'),
('platinum', 'Platin Liga', 'Platinum League', 4, 'gem', '#E5E4E2'),
('diamond', 'Diamant Liga', 'Diamond League', 5, 'gem', '#B9F2FF'),
('champion', 'Champion Liga', 'Champion League', 6, 'crown', '#FF6B6B')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 3. ALTER APP_USER for Level & League
-- =====================================================

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
-- league_id = NULL bedeutet "Unplatziert" - User wird erst platziert wenn er trainiert
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES league_tier(id) DEFAULT NULL;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS league_points INTEGER DEFAULT 0; -- Points earned this week
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS league_week_start DATE DEFAULT CURRENT_DATE;

-- =====================================================
-- 4. FITNESS GOAL BADGES (for display next to username)
-- =====================================================

CREATE TABLE IF NOT EXISTS fitness_goal (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_de VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    icon_name VARCHAR(50),
    color_hex VARCHAR(7)
);

INSERT INTO fitness_goal (code, name_de, name_en, emoji, icon_name, color_hex) VALUES
('muscle_gain', 'Muskelaufbau', 'Muscle Gain', '💪', 'dumbbell', '#EF4444'),
('weight_loss', 'Abnehmen', 'Weight Loss', '🔥', 'flame', '#F97316'),
('strength', 'Kraft steigern', 'Strength', '⚡', 'zap', '#FBBF24'),
('endurance', 'Ausdauer', 'Endurance', '🏃', 'activity', '#22C55E'),
('health', 'Gesundheit', 'Health', '❤️', 'heart', '#EC4899')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. BUDDY CHALLENGES (1v1)
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_de TEXT,
    description_en TEXT,
    metric VARCHAR(30) NOT NULL, -- 'volume_kg', 'workout_count', 'exercise_reps'
    icon_name VARCHAR(50),
    default_target INTEGER
);

INSERT INTO challenge_type (code, name_de, name_en, description_de, description_en, metric, icon_name, default_target) VALUES
('total_volume', 'Gesamtvolumen', 'Total Volume', 'Wer bewegt mehr Gewicht?', 'Who moves more weight?', 'volume_kg', 'weight', 5000),
('workout_count', 'Trainingsanzahl', 'Workout Count', 'Wer trainiert öfter?', 'Who trains more often?', 'workout_count', 'calendar', 5),
('exercise_volume', 'Übungsvolumen', 'Exercise Volume', 'Wer schafft mehr bei einer Übung?', 'Who does more on one exercise?', 'exercise_volume_kg', 'target', 1000)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS buddy_challenge (
    id SERIAL PRIMARY KEY,
    friendship_id INTEGER NOT NULL REFERENCES friendship(id) ON DELETE CASCADE,
    challenge_type_id INTEGER NOT NULL REFERENCES challenge_type(id),
    exercise_id INTEGER REFERENCES exercise(id), -- Only for exercise-specific challenges
    
    -- Participants (derived from friendship, but stored for easy querying)
    challenger_id UUID NOT NULL REFERENCES app_user(id),
    opponent_id UUID NOT NULL REFERENCES app_user(id),
    
    -- Challenge parameters
    target_value INTEGER, -- Optional target (otherwise just compare progress)
    wager_coins INTEGER DEFAULT 0, -- Optional coin bet
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Progress tracking
    challenger_progress INTEGER DEFAULT 0,
    opponent_progress INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled', 'declined'
    winner_id UUID REFERENCES app_user(id),
    
    -- Rewards
    xp_reward INTEGER DEFAULT 100,
    coins_claimed BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT different_participants CHECK (challenger_id != opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_challenge_challenger ON buddy_challenge(challenger_id);
CREATE INDEX IF NOT EXISTS idx_buddy_challenge_opponent ON buddy_challenge(opponent_id);
CREATE INDEX IF NOT EXISTS idx_buddy_challenge_status ON buddy_challenge(status);
CREATE INDEX IF NOT EXISTS idx_buddy_challenge_ends_at ON buddy_challenge(ends_at);

-- =====================================================
-- 6. FAKE USERS (for leaderboard filling)
-- =====================================================

CREATE TABLE IF NOT EXISTS fake_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    fitness_goal VARCHAR(30) REFERENCES fitness_goal(code),
    
    -- Simulated stats (updated weekly by cron)
    current_streak INTEGER DEFAULT 0,
    xp_total INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    league_id INTEGER REFERENCES league_tier(id) DEFAULT 1,
    weekly_volume_kg INTEGER DEFAULT 0,
    weekly_workout_count INTEGER DEFAULT 0,
    
    -- For realistic variation
    base_weekly_volume INTEGER DEFAULT 5000, -- Base volume, randomized each week
    volume_variance_percent INTEGER DEFAULT 30, -- +/- variance
    activity_probability INTEGER DEFAULT 70, -- % chance to "train" each day
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. WEEKLY LEADERBOARD VIEW
-- =====================================================

CREATE OR REPLACE VIEW weekly_leaderboard AS
WITH all_users AS (
    -- Real users
    SELECT 
        id,
        display_name,
        avatar_url,
        fitness_goal,
        current_streak,
        xp_total,
        current_level,
        league_id,
        COALESCE((
            SELECT SUM(total_volume_kg)::INTEGER
            FROM workout_session ws
            WHERE ws.user_id = app_user.id
            AND ws.completed_at >= date_trunc('week', CURRENT_DATE)
        ), 0) as weekly_volume_kg,
        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM workout_session ws
            WHERE ws.user_id = app_user.id
            AND ws.completed_at >= date_trunc('week', CURRENT_DATE)
        ), 0) as weekly_workout_count,
        FALSE as is_fake
    FROM app_user
    WHERE onboarding_completed = TRUE
    
    UNION ALL
    
    -- Fake users
    SELECT 
        id,
        display_name,
        avatar_url,
        fitness_goal,
        current_streak,
        xp_total,
        current_level,
        league_id,
        weekly_volume_kg,
        weekly_workout_count,
        TRUE as is_fake
    FROM fake_user
    WHERE is_active = TRUE
)
SELECT 
    *,
    ROW_NUMBER() OVER (ORDER BY weekly_volume_kg DESC) as rank_volume,
    ROW_NUMBER() OVER (ORDER BY weekly_workout_count DESC) as rank_workouts
FROM all_users;

-- =====================================================
-- 8. XP TRANSACTION LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS xp_transaction (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'workout', 'challenge_win', 'challenge_participate', 'streak', 'pr'
    source_id INTEGER, -- Reference to workout_session.id or buddy_challenge.id
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transaction_user ON xp_transaction(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transaction_created ON xp_transaction(created_at);

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION get_level_from_xp(p_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(
        (SELECT level FROM user_level WHERE xp_required <= p_xp ORDER BY level DESC LIMIT 1),
        1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add XP and update level
CREATE OR REPLACE FUNCTION add_user_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50),
    p_source_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN) AS $$
DECLARE
    v_old_level INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_league_id INTEGER;
BEGIN
    -- Get current state
    SELECT current_level, xp_total, league_id INTO v_old_level, v_new_xp, v_league_id FROM app_user WHERE id = p_user_id;
    
    -- Add XP
    v_new_xp := v_new_xp + p_amount;
    v_new_level := get_level_from_xp(v_new_xp);
    
    -- Wenn User unplatziert ist (league_id = NULL), in Bronze Liga platzieren
    IF v_league_id IS NULL THEN
        v_league_id := 1; -- Bronze Liga
    END IF;
    
    -- Update user
    UPDATE app_user 
    SET xp_total = v_new_xp, current_level = v_new_level, league_id = v_league_id
    WHERE id = p_user_id;
    
    -- Log transaction
    INSERT INTO xp_transaction (user_id, amount, source, source_id, description)
    VALUES (p_user_id, p_amount, p_source, p_source_id, p_description);
    
    -- Also add to league points for the week
    UPDATE app_user SET league_points = league_points + p_amount WHERE id = p_user_id;
    
    RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql;

-- Function to process weekly league promotions/demotions
-- Wird am Ende jeder Woche aufgerufen (Cron Job)
-- User ohne Training werden auf "Unplatziert" (league_id = NULL) gesetzt
CREATE OR REPLACE FUNCTION process_weekly_league_changes()
RETURNS void AS $$
DECLARE
    v_league RECORD;
    v_total_users INTEGER;
    v_promote_count INTEGER;
    v_demote_count INTEGER;
BEGIN
    -- ZUERST: User die diese Woche NICHT trainiert haben → Unplatziert setzen
    UPDATE app_user 
    SET league_id = NULL
    WHERE league_id IS NOT NULL 
    AND league_points = 0
    AND NOT EXISTS (
        SELECT 1 FROM workout_session ws 
        WHERE ws.user_id = app_user.id 
        AND ws.completed_at >= date_trunc('week', CURRENT_DATE)
    );
    
    -- Dann: Normale Promotion/Demotion für aktive User
    FOR v_league IN SELECT * FROM league_tier ORDER BY tier_order LOOP
        -- Get users in this league (nur platzierte User)
        SELECT COUNT(*) INTO v_total_users FROM app_user WHERE league_id = v_league.id;
        
        IF v_total_users > 0 THEN
            v_promote_count := GREATEST(1, (v_total_users * v_league.promotion_threshold_percent / 100));
            v_demote_count := GREATEST(1, (v_total_users * v_league.demotion_threshold_percent / 100));
            
            -- Promote top performers (if not already in champion league)
            IF v_league.tier_order < 6 THEN
                UPDATE app_user 
                SET league_id = v_league.id + 1
                WHERE id IN (
                    SELECT id FROM app_user 
                    WHERE league_id = v_league.id 
                    ORDER BY league_points DESC 
                    LIMIT v_promote_count
                );
            END IF;
            
            -- Demote bottom performers (if not already in bronze league)
            IF v_league.tier_order > 1 THEN
                UPDATE app_user 
                SET league_id = v_league.id - 1
                WHERE id IN (
                    SELECT id FROM app_user 
                    WHERE league_id = v_league.id 
                    ORDER BY league_points ASC 
                    LIMIT v_demote_count
                );
            END IF;
        END IF;
    END LOOP;
    
    -- Reset weekly league points for all users
    UPDATE app_user SET league_points = 0, league_week_start = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function: Platziert User in Bronze Liga wenn er trainiert und unplatziert ist
-- Wird beim Starten einer Workout Session aufgerufen
CREATE OR REPLACE FUNCTION place_user_in_league_if_needed(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_league_id INTEGER;
BEGIN
    SELECT league_id INTO v_league_id FROM app_user WHERE id = p_user_id;
    
    IF v_league_id IS NULL THEN
        UPDATE app_user SET league_id = 1 WHERE id = p_user_id; -- Bronze Liga
        RETURN 1;
    END IF;
    
    RETURN v_league_id;
END;
$$ LANGUAGE plpgsql;
