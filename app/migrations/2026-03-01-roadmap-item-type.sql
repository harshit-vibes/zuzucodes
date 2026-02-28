-- Add item type to roadmap_items
-- feature = platform feature request
-- bug     = reported bug
-- learning = new course / module / lesson request

ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'feature'
    CHECK (type IN ('feature', 'bug', 'learning'));
