-- Add published_at to courses for "New" badge logic
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

-- Backdate existing courses so they don't get a spurious "New" badge on launch
UPDATE courses SET published_at = '2026-01-01' WHERE published_at IS NOT NULL;
