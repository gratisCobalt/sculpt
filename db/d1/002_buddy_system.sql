-- =====================================================
-- SCULPT FITNESS APP - BUDDY SYSTEM (D1/SQLite)
-- =====================================================

-- Friendship status types
CREATE TABLE IF NOT EXISTS friendship_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL
);

INSERT OR IGNORE INTO friendship_status (code, name_de, name_en) VALUES
    ('pending', 'Ausstehend', 'Pending'),
    ('accepted', 'Akzeptiert', 'Accepted'),
    ('blocked', 'Blockiert', 'Blocked');

-- Friendships / Buddy connections
CREATE TABLE IF NOT EXISTS friendship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    addressee_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    status_id INTEGER NOT NULL REFERENCES friendship_status(id) DEFAULT 1,
    friend_streak INTEGER DEFAULT 0,
    last_both_trained_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(requester_id, addressee_id),
    CHECK(requester_id != addressee_id)
);

-- Notification types for the buddy system
CREATE TABLE IF NOT EXISTS notification_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL,
    template_de TEXT NOT NULL,
    template_en TEXT NOT NULL,
    icon_name TEXT NOT NULL
);

INSERT OR IGNORE INTO notification_type (code, name_de, name_en, template_de, template_en, icon_name) VALUES
    ('friend_request', 'Freundschaftsanfrage', 'Friend Request', '{name} möchte dein Buddy sein!', '{name} wants to be your buddy!', 'user-plus'),
    ('friend_accepted', 'Anfrage akzeptiert', 'Request Accepted', '{name} hat deine Anfrage akzeptiert!', '{name} accepted your request!', 'check-circle'),
    ('workout_completed', 'Training abgeschlossen', 'Workout Completed', '{name} hat gerade ein Training abgeschlossen! 💪', '{name} just completed a workout! 💪', 'dumbbell'),
    ('badge_earned', 'Badge verdient', 'Badge Earned', '{name} hat "{badge}" freigeschaltet! 🏆', '{name} unlocked "{badge}"! 🏆', 'trophy'),
    ('streak_milestone', 'Streak-Meilenstein', 'Streak Milestone', '{name} hat einen {count}-Wochen-Streak! 🔥', '{name} reached a {count}-week streak! 🔥', 'flame'),
    ('pr_achieved', 'Persönlicher Rekord', 'Personal Record', '{name} hat einen neuen PR bei {exercise}! 🎉', '{name} set a new PR on {exercise}! 🎉', 'trending-up'),
    ('buddy_reminder', 'Buddy-Erinnerung', 'Buddy Reminder', '{name} sagt: Zeit für dein Training!', '{name} says: Time for your workout!', 'bell'),
    ('congrats_received', 'Gratulation erhalten', 'Congrats Received', '{name} gratuliert dir! 🎊', '{name} congratulates you! 🎊', 'party-popper'),
    ('friend_streak_broken', 'Freundes-Streak verloren', 'Friend Streak Broken', 'Euer {count}-Wochen-Streak ist verloren! 😢', 'Your {count}-week streak was broken! 😢', 'flame-off'),
    ('friend_streak_milestone', 'Freundes-Streak Meilenstein', 'Friend Streak Milestone', '{name} und du: {count} Wochen gemeinsam stark! 💪', 'You and {name}: {count} weeks strong together! 💪', 'users');

-- User notifications (in-app + push)
CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    notification_type_id INTEGER NOT NULL REFERENCES notification_type(id),
    sender_id TEXT REFERENCES app_user(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT DEFAULT '{}', -- JSON stored as TEXT
    is_read INTEGER DEFAULT 0,
    is_push_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'ios', 'android', 'web'
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, token)
);

-- E2E Encrypted Chat Messages
CREATE TABLE IF NOT EXISTS chat_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    friendship_id INTEGER NOT NULL REFERENCES friendship(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    ephemeral_public_key TEXT NOT NULL,
    mac TEXT NOT NULL,
    nonce TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'congrats', 'reminder', 'brag'
    reference_type TEXT,
    reference_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- User's public keys for E2E encryption
CREATE TABLE IF NOT EXISTS user_encryption_key (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    identity_public_key TEXT NOT NULL,
    signed_prekey_public TEXT NOT NULL,
    signed_prekey_signature TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id)
);

-- One-time prekeys for initial key exchange
CREATE TABLE IF NOT EXISTS user_prekey (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    prekey_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, prekey_id)
);

-- Activity type enum table
CREATE TABLE IF NOT EXISTS activity_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name_de TEXT NOT NULL,
    name_en TEXT NOT NULL
);

INSERT OR IGNORE INTO activity_type (slug, name_de, name_en) VALUES
    ('workout_completed', 'Workout abgeschlossen', 'Workout Completed'),
    ('badge_earned', 'Badge verdient', 'Badge Earned'),
    ('pr_achieved', 'Persönlicher Rekord', 'Personal Record'),
    ('streak_milestone', 'Streak Meilenstein', 'Streak Milestone');

-- Brag/Achievement feed items (auto-shared with buddies)
CREATE TABLE IF NOT EXISTS activity_feed_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    activity_type_id INTEGER NOT NULL REFERENCES activity_type(id),
    metadata TEXT DEFAULT '{}', -- JSON stored as TEXT
    visibility TEXT DEFAULT 'friends', -- 'friends', 'public', 'private'
    created_at TEXT DEFAULT (datetime('now'))
);

-- Congratulations on activity feed items
CREATE TABLE IF NOT EXISTS activity_congrats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_feed_item_id INTEGER NOT NULL REFERENCES activity_feed_item(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    emoji TEXT DEFAULT '🎉',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(activity_feed_item_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendship_requester ON friendship(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendship_addressee ON friendship(addressee_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_chat_message_friendship ON chat_message(friendship_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed_item(user_id, created_at);
