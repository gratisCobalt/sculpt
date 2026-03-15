-- =====================================================
-- USER FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    image_urls TEXT DEFAULT '[]',
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
);
