-- =====================================================
-- GOOGLE OAUTH SUPPORT
-- =====================================================
-- Migration to add Google OAuth columns to app_user table
-- Note: SQLite doesn't support UNIQUE constraint on ALTER TABLE
-- We add the column first, then create a unique index

-- Add Google OAuth columns (without UNIQUE constraint)
ALTER TABLE app_user ADD COLUMN google_id TEXT;
ALTER TABLE app_user ADD COLUMN auth_provider TEXT DEFAULT 'email';
-- auth_provider values: 'email', 'google', 'both' (linked account)

-- Create unique index for google_id (this enforces uniqueness in SQLite)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_google_id ON app_user(google_id);
