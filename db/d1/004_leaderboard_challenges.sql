-- =====================================================
-- SCULPT FITNESS APP - LEADERBOARD & CHALLENGES (D1/SQLite)
-- =====================================================

-- =====================================================
-- 1. LEVEL SYSTEM (Permanent XP-based progression)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_level (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL UNIQUE,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    xp_required INTEGER NOT NULL,
    icon_name TEXT,
    color_hex TEXT
);

-- Insert levels 1-100 with exponential XP curve
INSERT OR IGNORE INTO user_level (level, name_de, name_en, xp_required, icon_name, color_hex) VALUES
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
(100, 'Unsterblich', 'Immortal', 12730000, 'sun', '#7C3AED');

-- =====================================================
-- 2. LEAGUE SYSTEM (Weekly with promotion/demotion)
-- =====================================================

CREATE TABLE IF NOT EXISTS league_tier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    tier_order INTEGER NOT NULL, -- 1 = lowest (Bronze), 6 = highest (Champion)
    icon_name TEXT,
    color_hex TEXT,
    promotion_threshold_percent INTEGER DEFAULT 20,
    demotion_threshold_percent INTEGER DEFAULT 20
);

INSERT OR IGNORE INTO league_tier (code, name_de, name_en, tier_order, icon_name, color_hex) VALUES
('bronze', 'Bronze Liga', 'Bronze League', 1, 'medal', '#CD7F32'),
('silver', 'Silber Liga', 'Silver League', 2, 'medal', '#C0C0C0'),
('gold', 'Gold Liga', 'Gold League', 3, 'medal', '#FFD700'),
('platinum', 'Platin Liga', 'Platinum League', 4, 'gem', '#E5E4E2'),
('diamond', 'Diamant Liga', 'Diamond League', 5, 'gem', '#B9F2FF'),
('champion', 'Champion Liga', 'Champion League', 6, 'crown', '#FF6B6B');

-- =====================================================
-- 4. FITNESS GOAL BADGES
-- =====================================================

CREATE TABLE IF NOT EXISTS fitness_goal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    emoji TEXT NOT NULL,
    icon_name TEXT,
    color_hex TEXT
);

INSERT OR IGNORE INTO fitness_goal (code, name_de, name_en, emoji, icon_name, color_hex) VALUES
('muscle_gain', 'Muskelaufbau', 'Muscle Gain', '💪', 'dumbbell', '#EF4444'),
('weight_loss', 'Abnehmen', 'Weight Loss', '🔥', 'flame', '#F97316'),
('strength', 'Kraft steigern', 'Strength', '⚡', 'zap', '#FBBF24'),
('endurance', 'Ausdauer', 'Endurance', '🏃', 'activity', '#22C55E'),
('health', 'Gesundheit', 'Health', '❤️', 'heart', '#EC4899');

-- =====================================================
-- 5. BUDDY CHALLENGES (1v1)
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_de TEXT,
    description_en TEXT,
    metric TEXT NOT NULL, -- 'volume_kg', 'workout_count', 'exercise_reps'
    icon_name TEXT,
    default_target INTEGER
);

INSERT OR IGNORE INTO challenge_type (code, name_de, name_en, description_de, description_en, metric, icon_name, default_target) VALUES
('total_volume', 'Gesamtvolumen', 'Total Volume', 'Wer bewegt mehr Gewicht?', 'Who moves more weight?', 'volume_kg', 'weight', 5000),
('workout_count', 'Trainingsanzahl', 'Workout Count', 'Wer trainiert öfter?', 'Who trains more often?', 'workout_count', 'calendar', 5),
('exercise_volume', 'Übungsvolumen', 'Exercise Volume', 'Wer schafft mehr bei einer Übung?', 'Who does more on one exercise?', 'exercise_volume_kg', 'target', 1000);

CREATE TABLE IF NOT EXISTS buddy_challenge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    friendship_id INTEGER NOT NULL REFERENCES friendship(id) ON DELETE CASCADE,
    challenge_type_id INTEGER NOT NULL REFERENCES challenge_type(id),
    exercise_id INTEGER REFERENCES exercise(id),
    
    challenger_id TEXT NOT NULL REFERENCES app_user(id),
    opponent_id TEXT NOT NULL REFERENCES app_user(id),
    
    target_value INTEGER,
    wager_coins INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT,
    starts_at TEXT DEFAULT (datetime('now')),
    ends_at TEXT NOT NULL,
    
    challenger_progress INTEGER DEFAULT 0,
    opponent_progress INTEGER DEFAULT 0,
    
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled', 'declined'
    winner_id TEXT REFERENCES app_user(id),
    
    xp_reward INTEGER DEFAULT 100,
    coins_claimed INTEGER DEFAULT 0,
    
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
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    fitness_goal TEXT,
    
    current_streak INTEGER DEFAULT 0,
    xp_total INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    league_id INTEGER REFERENCES league_tier(id) DEFAULT 1,
    weekly_volume_kg INTEGER DEFAULT 0,
    weekly_workout_count INTEGER DEFAULT 0,
    
    base_weekly_volume INTEGER DEFAULT 5000,
    volume_variance_percent INTEGER DEFAULT 30,
    activity_probability INTEGER DEFAULT 70,
    
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 8. XP TRANSACTION LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS xp_transaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL, -- 'workout', 'challenge_win', 'challenge_participate', 'streak', 'pr'
    source_id INTEGER,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_xp_transaction_user ON xp_transaction(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transaction_created ON xp_transaction(created_at);
