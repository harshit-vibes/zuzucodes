-- app/migrations/2026-03-01-capstones.sql

CREATE TABLE capstones (
  id                TEXT        PRIMARY KEY,
  course_id         TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT,
  starter_code      TEXT,
  required_packages TEXT[]      NOT NULL DEFAULT '{}',
  hints             TEXT[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX capstones_course_id_idx ON capstones(course_id);

CREATE TABLE user_capstone_submissions (
  user_id       TEXT        NOT NULL,
  capstone_id   TEXT        NOT NULL REFERENCES capstones(id) ON DELETE CASCADE,
  code          TEXT        NOT NULL,
  output        TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, capstone_id)
);
