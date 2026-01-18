-- =====================================================
-- SCULPT FITNESS APP - SHOP & LOOT BOX (D1/SQLite)
-- =====================================================

-- =====================================================
-- LOOT BOX SYSTEM
-- =====================================================

-- Loot box rewards configuration
CREATE TABLE IF NOT EXISTS loot_box_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rarity_id INTEGER NOT NULL REFERENCES badge_rarity(id),
    min_coins INTEGER NOT NULL,
    max_coins INTEGER NOT NULL,
    upgrade_chance REAL NOT NULL, -- 0.000 - 1.000
    UNIQUE(rarity_id)
);

INSERT OR REPLACE INTO loot_box_config (rarity_id, min_coins, max_coins, upgrade_chance) VALUES
    (1, 5, 15, 0.400),    -- Common: 5-15 coins, 40% upgrade chance
    (2, 20, 50, 0.250),   -- Rare: 20-50 coins, 25% upgrade chance
    (3, 60, 120, 0.100),  -- Epic: 60-120 coins, 10% upgrade chance
    (4, 150, 300, 0.000); -- Legendary: 150-300 coins, can't upgrade further

-- User's pending loot boxes
CREATE TABLE IF NOT EXISTS user_loot_box (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    rarity_id INTEGER NOT NULL REFERENCES badge_rarity(id) DEFAULT 1,
    clicks_remaining INTEGER NOT NULL DEFAULT 3,
    is_opened INTEGER DEFAULT 0,
    coins_awarded INTEGER,
    earned_at TEXT DEFAULT (datetime('now')),
    opened_at TEXT,
    workout_session_id INTEGER REFERENCES workout_session(id),
    CONSTRAINT valid_clicks CHECK (clicks_remaining >= 0 AND clicks_remaining <= 3)
);

CREATE INDEX IF NOT EXISTS idx_user_loot_box_user ON user_loot_box(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loot_box_unopened ON user_loot_box(user_id, is_opened);

-- =====================================================
-- SHOP SYSTEM
-- =====================================================

-- Shop item categories
CREATE TABLE IF NOT EXISTS shop_item_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon_name TEXT
);

INSERT OR IGNORE INTO shop_item_category (code, name_de, name_en, icon_name) VALUES
    ('consumable', 'Verbrauchsgüter', 'Consumables', 'package'),
    ('cosmetic', 'Kosmetik', 'Cosmetics', 'sparkles'),
    ('boost', 'Boosts', 'Boosts', 'zap');

-- Shop items
CREATE TABLE IF NOT EXISTS shop_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    category_id INTEGER NOT NULL REFERENCES shop_item_category(id),
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_de TEXT,
    description_en TEXT,
    price_coins INTEGER NOT NULL,
    icon_name TEXT,
    rarity_id INTEGER REFERENCES badge_rarity(id),
    max_stack INTEGER, -- NULL = unlimited
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Insert shop items
INSERT OR REPLACE INTO shop_item (code, category_id, name_de, name_en, description_de, description_en, price_coins, icon_name, rarity_id, max_stack) VALUES
    ('streak_saver', 1, 'Streak Saver', 'Streak Saver', 'Schützt deinen Streak für eine Woche, falls du mal nicht trainieren kannst.', 'Protects your streak for one week if you can''t train.', 750, 'shield', 2, 3),
    ('xp_boost_2x', 3, 'XP Boost (2x)', '2x XP Boost', '24 Stunden lang doppelte XP für alle Aktivitäten.', 'Double XP for all activities for 24 hours.', 300, 'zap', 2, 5),
    ('loot_box_common', 1, 'Loot Box', 'Loot Box', 'Eine zusätzliche Loot Box mit zufälligen Belohnungen.', 'An extra loot box with random rewards.', 100, 'gift', 1, NULL),
    ('loot_box_rare', 1, 'Seltene Loot Box', 'Rare Loot Box', 'Eine seltene Loot Box mit besseren Belohnungen.', 'A rare loot box with better rewards.', 350, 'gift', 2, NULL),
    ('loot_box_epic', 1, 'Epische Loot Box', 'Epic Loot Box', 'Eine epische Loot Box mit großartigen Belohnungen.', 'An epic loot box with great rewards.', 800, 'gift', 3, NULL),
    ('profile_frame_gold', 2, 'Goldener Rahmen', 'Gold Frame', 'Ein goldener Rahmen für dein Profilbild.', 'A gold frame for your profile picture.', 1000, 'frame', 4, 1),
    ('title_iron_warrior', 2, 'Titel: Eisenkrieger', 'Title: Iron Warrior', 'Zeige den Titel "Eisenkrieger" unter deinem Namen.', 'Show the title "Iron Warrior" below your name.', 750, 'award', 3, 1);

-- User inventory
CREATE TABLE IF NOT EXISTS user_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    shop_item_id INTEGER NOT NULL REFERENCES shop_item(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- For time-limited items like boosts
    UNIQUE(user_id, shop_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);

-- Purchase history
CREATE TABLE IF NOT EXISTS purchase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    shop_item_id INTEGER NOT NULL REFERENCES shop_item(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price INTEGER NOT NULL,
    purchased_at TEXT DEFAULT (datetime('now'))
);

-- Active streak savers
CREATE TABLE IF NOT EXISTS active_streak_saver (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    activated_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_active_streak_saver_user ON active_streak_saver(user_id, used, expires_at);
