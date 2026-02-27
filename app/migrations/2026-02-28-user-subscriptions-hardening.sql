-- Migration: user_subscriptions schema hardening
-- Date: 2026-02-28
-- Adds PRIMARY KEY and CHECK constraint on status values.
-- Safe to run: subscription_id is already UNIQUE NOT NULL so no conflicts.

ALTER TABLE user_subscriptions
  ADD PRIMARY KEY (subscription_id);

ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
    CHECK (status IN ('APPROVAL_PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED'));
