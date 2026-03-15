-- Google OAuth Support
-- Adds google_id and auth_provider columns to app_user

-- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ALTER TABLE)
-- These will fail silently if columns already exist in the full schema

ALTER TABLE app_user ADD COLUMN google_id TEXT;
ALTER TABLE app_user ADD COLUMN auth_provider TEXT DEFAULT 'email';

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_google_id ON app_user(google_id);
