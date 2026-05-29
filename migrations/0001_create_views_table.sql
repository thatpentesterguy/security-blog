-- Migration number: 0001 	 2026-05-29T09:24:00.822Z

-- Per-post view counts. One row per page path, holding an all-time total.
-- The path is the primary key so increments are a single atomic upsert and
-- reads are an indexed point lookup.
CREATE TABLE IF NOT EXISTS views (
  path  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
