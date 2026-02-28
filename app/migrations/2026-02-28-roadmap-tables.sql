CREATE TABLE IF NOT EXISTS roadmap_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (char_length(title) <= 80),
  description  TEXT        CHECK (char_length(description) <= 300),
  status       TEXT        NOT NULL DEFAULT 'idea'
                           CHECK (status IN ('idea', 'planned', 'in_progress', 'done')),
  is_published BOOLEAN     NOT NULL DEFAULT false,
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roadmap_votes (
  user_id    TEXT        NOT NULL,
  item_id    UUID        NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS roadmap_votes_item_id_idx ON roadmap_votes(item_id);
