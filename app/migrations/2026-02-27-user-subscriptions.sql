-- migrations/2026-02-27-user-subscriptions.sql
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id          TEXT NOT NULL,
  subscription_id  TEXT UNIQUE NOT NULL,
  plan_id          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'APPROVAL_PENDING',
  trial_end_at     TIMESTAMPTZ,
  next_billing_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx
  ON user_subscriptions (user_id);
