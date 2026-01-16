-- =====================================================
-- SCULPT FITNESS APP - SHOP & LOOT BOX SYSTEM
-- =====================================================

-- Add birthdate to app_user if not exists
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Add hantel_coins currency (rename from hantel_currency if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_user' AND column_name = 'hantel_currency') THEN
        ALTER TABLE app_user RENAME COLUMN hantel_currency TO hantel_coins;
    END IF;
EXCEPTION WHEN OTHERS THEN
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS hantel_coins INTEGER DEFAULT 100;
END $$;

-- Ensure column exists
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS hantel_coins INTEGER DEFAULT 100;

-- =====================================================
-- LOOT BOX SYSTEM
-- =====================================================

-- Loot box rarity (uses same as badge_rarity)
-- common, rare, epic, legendary

-- Loot box rewards configuration
CREATE TABLE IF NOT EXISTS loot_box_config (
    id SERIAL PRIMARY KEY,
    rarity_id INTEGER NOT NULL REFERENCES badge_rarity(id),
    min_coins INTEGER NOT NULL,
    max_coins INTEGER NOT NULL,
    upgrade_chance DECIMAL(4,3) NOT NULL, -- Chance to upgrade on click (0.000 - 1.000)
    UNIQUE(rarity_id)
);

INSERT INTO loot_box_config (rarity_id, min_coins, max_coins, upgrade_chance) VALUES
    (1, 5, 15, 0.400),    -- Common: 5-15 coins, 40% upgrade chance
    (2, 20, 50, 0.250),   -- Rare: 20-50 coins, 25% upgrade chance
    (3, 60, 120, 0.100),  -- Epic: 60-120 coins, 10% upgrade chance
    (4, 150, 300, 0.000)  -- Legendary: 150-300 coins, can't upgrade further
ON CONFLICT (rarity_id) DO UPDATE SET
    min_coins = EXCLUDED.min_coins,
    max_coins = EXCLUDED.max_coins,
    upgrade_chance = EXCLUDED.upgrade_chance;

-- User's pending loot boxes
CREATE TABLE IF NOT EXISTS user_loot_box (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    rarity_id INTEGER NOT NULL REFERENCES badge_rarity(id) DEFAULT 1,
    clicks_remaining INTEGER NOT NULL DEFAULT 3,
    is_opened BOOLEAN DEFAULT FALSE,
    coins_awarded INTEGER,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE,
    workout_session_id INTEGER REFERENCES workout_session(id),
    CONSTRAINT valid_clicks CHECK (clicks_remaining >= 0 AND clicks_remaining <= 3)
);

CREATE INDEX IF NOT EXISTS idx_user_loot_box_user ON user_loot_box(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loot_box_unopened ON user_loot_box(user_id, is_opened) WHERE NOT is_opened;

-- =====================================================
-- SHOP SYSTEM
-- =====================================================

-- Shop item categories
CREATE TABLE IF NOT EXISTS shop_item_category (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50)
);

INSERT INTO shop_item_category (code, name_de, name_en, icon_name) VALUES
    ('consumable', 'Verbrauchsgüter', 'Consumables', 'package'),
    ('cosmetic', 'Kosmetik', 'Cosmetics', 'sparkles'),
    ('boost', 'Boosts', 'Boosts', 'zap')
ON CONFLICT (code) DO NOTHING;

-- Shop items
CREATE TABLE IF NOT EXISTS shop_item (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    category_id INTEGER NOT NULL REFERENCES shop_item_category(id),
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_de TEXT,
    description_en TEXT,
    price_coins INTEGER NOT NULL,
    icon_name VARCHAR(50),
    rarity_id INTEGER REFERENCES badge_rarity(id),
    max_stack INTEGER, -- NULL = unlimited
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert shop items
INSERT INTO shop_item (code, category_id, name_de, name_en, description_de, description_en, price_coins, icon_name, rarity_id, max_stack) VALUES
    ('streak_saver', 1, 'Streak Saver', 'Streak Saver', 'Schützt deinen Streak für eine Woche, falls du mal nicht trainieren kannst.', 'Protects your streak for one week if you can''t train.', 750, 'shield', 2, 3),
    ('xp_boost_2x', 3, 'XP Boost (2x)', '2x XP Boost', '24 Stunden lang doppelte XP für alle Aktivitäten.', 'Double XP for all activities for 24 hours.', 300, 'zap', 2, 5),
    ('loot_box_common', 1, 'Loot Box', 'Loot Box', 'Eine zusätzliche Loot Box mit zufälligen Belohnungen.', 'An extra loot box with random rewards.', 100, 'gift', 1, NULL),
    ('loot_box_rare', 1, 'Seltene Loot Box', 'Rare Loot Box', 'Eine seltene Loot Box mit besseren Belohnungen.', 'A rare loot box with better rewards.', 350, 'gift', 2, NULL),
    ('loot_box_epic', 1, 'Epische Loot Box', 'Epic Loot Box', 'Eine epische Loot Box mit großartigen Belohnungen.', 'An epic loot box with great rewards.', 800, 'gift', 3, NULL),
    ('profile_frame_gold', 2, 'Goldener Rahmen', 'Gold Frame', 'Ein goldener Rahmen für dein Profilbild.', 'A gold frame for your profile picture.', 1000, 'frame', 4, 1),
    ('title_iron_warrior', 2, 'Titel: Eisenkrieger', 'Title: Iron Warrior', 'Zeige den Titel "Eisenkrieger" unter deinem Namen.', 'Show the title "Iron Warrior" below your name.', 750, 'award', 3, 1)
ON CONFLICT (code) DO UPDATE SET
    price_coins = EXCLUDED.price_coins,
    description_de = EXCLUDED.description_de,
    description_en = EXCLUDED.description_en;

-- User inventory
CREATE TABLE IF NOT EXISTS user_inventory (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    shop_item_id INTEGER NOT NULL REFERENCES shop_item(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- For time-limited items like boosts
    UNIQUE(user_id, shop_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);

-- Purchase history
CREATE TABLE IF NOT EXISTS purchase_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    shop_item_id INTEGER NOT NULL REFERENCES shop_item(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active streak savers (consumed when streak would break)
CREATE TABLE IF NOT EXISTS active_streak_saver (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_active_streak_saver_user ON active_streak_saver(user_id, used, expires_at);

-- =====================================================
-- FUNCTIONS FOR LOOT BOX
-- =====================================================

-- Function to award loot box after workout
CREATE OR REPLACE FUNCTION award_loot_box_for_workout()
RETURNS TRIGGER AS $$
BEGIN
    -- Only award if workout is completed (has completed_at)
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        INSERT INTO user_loot_box (user_id, rarity_id, clicks_remaining, workout_session_id)
        VALUES (NEW.user_id, 1, 3, NEW.id); -- Start with common rarity
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for loot box award
DROP TRIGGER IF EXISTS trigger_award_loot_box ON workout_session;
CREATE TRIGGER trigger_award_loot_box
    AFTER UPDATE ON workout_session
    FOR EACH ROW
    EXECUTE FUNCTION award_loot_box_for_workout();

-- Function to click/upgrade loot box
CREATE OR REPLACE FUNCTION click_loot_box(
    p_loot_box_id INTEGER,
    p_user_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    new_rarity_id INTEGER,
    new_rarity_code VARCHAR,
    clicks_left INTEGER,
    upgraded BOOLEAN,
    coins_won INTEGER
) AS $$
DECLARE
    v_box user_loot_box%ROWTYPE;
    v_config loot_box_config%ROWTYPE;
    v_rarity badge_rarity%ROWTYPE;
    v_upgraded BOOLEAN := FALSE;
    v_coins INTEGER := NULL;
    v_random DECIMAL;
BEGIN
    -- Get the loot box
    SELECT * INTO v_box FROM user_loot_box 
    WHERE id = p_loot_box_id AND user_id = p_user_id AND NOT is_opened
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR, NULL::INTEGER, FALSE, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- Get config for current rarity
    SELECT * INTO v_config FROM loot_box_config WHERE rarity_id = v_box.rarity_id;
    
    IF v_box.clicks_remaining > 0 THEN
        -- Try to upgrade
        v_random := random();
        IF v_random < v_config.upgrade_chance AND v_box.rarity_id < 4 THEN
            v_box.rarity_id := v_box.rarity_id + 1;
            v_upgraded := TRUE;
        END IF;
        
        v_box.clicks_remaining := v_box.clicks_remaining - 1;
        
        -- Update the box
        UPDATE user_loot_box 
        SET rarity_id = v_box.rarity_id, clicks_remaining = v_box.clicks_remaining
        WHERE id = p_loot_box_id;
    END IF;
    
    -- If no clicks left, open the box
    IF v_box.clicks_remaining = 0 THEN
        SELECT * INTO v_config FROM loot_box_config WHERE rarity_id = v_box.rarity_id;
        v_coins := floor(random() * (v_config.max_coins - v_config.min_coins + 1) + v_config.min_coins)::INTEGER;
        
        -- Award coins
        UPDATE app_user SET hantel_coins = COALESCE(hantel_coins, 0) + v_coins WHERE id = p_user_id;
        
        -- Mark box as opened
        UPDATE user_loot_box 
        SET is_opened = TRUE, coins_awarded = v_coins, opened_at = NOW()
        WHERE id = p_loot_box_id;
    END IF;
    
    -- Get rarity info
    SELECT * INTO v_rarity FROM badge_rarity WHERE id = v_box.rarity_id;
    
    RETURN QUERY SELECT 
        TRUE, 
        v_box.rarity_id, 
        v_rarity.code,
        v_box.clicks_remaining, 
        v_upgraded,
        v_coins;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STREAK SAVER LOGIC
-- =====================================================

-- Function to check and use streak saver
CREATE OR REPLACE FUNCTION check_streak_with_saver(p_user_id UUID)
RETURNS TABLE (
    streak_broken BOOLEAN,
    saver_used BOOLEAN,
    current_streak INTEGER
) AS $$
DECLARE
    v_user app_user%ROWTYPE;
    v_saver active_streak_saver%ROWTYPE;
    v_streak_broken BOOLEAN := FALSE;
    v_saver_used BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_user FROM app_user WHERE id = p_user_id;
    
    -- Check if streak would be broken (no workout in 7 days)
    IF v_user.last_workout_at IS NULL OR v_user.last_workout_at < NOW() - INTERVAL '7 days' THEN
        -- Check for active streak saver
        SELECT * INTO v_saver FROM active_streak_saver 
        WHERE user_id = p_user_id 
          AND NOT used 
          AND expires_at > NOW()
        ORDER BY expires_at ASC
        LIMIT 1
        FOR UPDATE;
        
        IF FOUND THEN
            -- Use the streak saver
            UPDATE active_streak_saver SET used = TRUE, used_at = NOW() WHERE id = v_saver.id;
            v_saver_used := TRUE;
            -- Extend last_workout_at to prevent immediate re-break
            UPDATE app_user SET last_workout_at = NOW() - INTERVAL '1 day' WHERE id = p_user_id;
        ELSE
            -- Break the streak
            UPDATE app_user SET current_streak = 0 WHERE id = p_user_id;
            v_streak_broken := TRUE;
        END IF;
    END IF;
    
    SELECT current_streak INTO v_user.current_streak FROM app_user WHERE id = p_user_id;
    
    RETURN QUERY SELECT v_streak_broken, v_saver_used, v_user.current_streak;
END;
$$ LANGUAGE plpgsql;
