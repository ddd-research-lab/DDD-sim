-- Create archives table
CREATE TABLE IF NOT EXISTS archives (
  id TEXT PRIMARY KEY,
  nickname TEXT,
  initial_setup TEXT,
  explanation TEXT,
  history JSONB,
  logs TEXT[],
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  author_id TEXT,
  likes INTEGER DEFAULT 0,
  liked_by TEXT[] DEFAULT '{}'
);

-- Create access_stats table for analytics
CREATE TABLE IF NOT EXISTS access_stats (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_archives_created_at ON archives(created_at DESC);
