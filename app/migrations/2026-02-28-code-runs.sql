-- Rate limiting: track code execution per user
-- Used by /api/code/run and /api/code/test to enforce per-min/per-3hr/per-day limits

CREATE TABLE code_runs (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_runs_user_executed ON code_runs (user_id, executed_at DESC);
