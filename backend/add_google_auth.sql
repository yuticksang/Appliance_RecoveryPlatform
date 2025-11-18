-- Add google_id column to users table for Google OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Comment on column
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID for Google Sign-In integration';
