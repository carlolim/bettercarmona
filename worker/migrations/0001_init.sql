-- The chat API's tables. They hold counts and hashes, and cached answers keyed by a hash of the
-- question. Never a question, a conversation, or an IP address.

-- One row per scope, key, and period.
-- scope: ip-day, site-day, semantic-month, keyword-month, neurons-day.
-- key: for ip-day, SHA-256 of the IP, the date, and a secret salt; otherwise "site".
-- period: the UTC date (YYYY-MM-DD) or month (YYYY-MM).
CREATE TABLE IF NOT EXISTS counters (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  period TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key, period)
);

-- Answers to first questions, keyed by SHA-256 of the question, the language, and the index version.
CREATE TABLE IF NOT EXISTS answer_cache (
  hash TEXT PRIMARY KEY,
  kb_version TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Thumbs up and down, as counts only.
CREATE TABLE IF NOT EXISTS feedback (
  kb_version TEXT NOT NULL,
  day TEXT NOT NULL,
  rating TEXT NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kb_version, day, rating, kind)
);
