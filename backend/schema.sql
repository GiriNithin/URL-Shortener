-- Run this script on your Amazon RDS PostgreSQL instance to create the schema.
-- Example: psql -h your-rds-endpoint -U postgres -d postgres -f schema.sql

CREATE TABLE IF NOT EXISTS urls (
  id         BIGSERIAL PRIMARY KEY,
  long_url   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_urls_id ON urls (id);

-- Optional: limit URL length in app; DB allows long URLs
-- COMMENT ON TABLE urls IS 'Stores long URL to short code mapping (code = base62 of id)';
