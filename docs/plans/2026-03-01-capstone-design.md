# Capstone Projects — Design

**Date:** 2026-03-01
**Status:** Approved

## Overview

Add end-of-course capstone projects to the platform. Each course has one capstone — a free-form Python script challenge using external libraries. Learners write, run, and submit their code for instructor review. Completion is recorded on submission; the review workflow is out of scope for this phase.

---

## Data Model

Two new tables in Neon Postgres.

### `capstones`

```sql
CREATE TABLE capstones (
  id                TEXT PRIMARY KEY,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,              -- markdown project brief
  starter_code      TEXT,              -- optional starter script
  required_packages TEXT[] NOT NULL DEFAULT '{}',  -- informational only (pre-installed on executor)
  hints             TEXT[] NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX capstones_course_id_idx ON capstones(course_id);
```

One capstone per course (enforced by unique index).

### `user_capstone_submissions`

```sql
CREATE TABLE user_capstone_submissions (
  user_id       TEXT NOT NULL,
  capstone_id   TEXT NOT NULL REFERENCES capstones(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  output        TEXT,                  -- last run stdout
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, capstone_id)  -- upsertable; latest submission wins
);
```

`required_packages` is informational — used to render a badge list in the UI. No runtime pip install. All packages are pre-installed on the executor image.

---

## Course Sequence Integration

`buildCourseSequence()` in `lib/course-sequence.ts` gains a new terminal node type:

```
[...all module lessons + quizzes] → capstone node
```

**Capstone node:**
- **Locked** until all module lessons and quizzes are complete
- **Route:** `/dashboard/course/[courseSlug]/capstone`
- **Completion:** row exists in `user_capstone_submissions` for the user

The sidebar renders the capstone as the final item in the course list — same lock/unlock/complete indicator pattern as lessons and quizzes.

---

## Capstone Player UI

New page at `/dashboard/course/[courseSlug]/capstone`. Two-panel layout matching the lesson player.

### Left panel — Project Brief
- Markdown description (same renderer as lessons)
- "This project uses:" badge list from `required_packages`
- Progressive hint carousel (same component as lessons, collapsed by default)

### Right panel — Editor + Output
- CodeMirror editor pre-loaded with `starter_code`
- Auto-save to `localStorage` only (no DB autosave until explicit submit)
- Output panel: stdout only, no test cases tab
- **Run** button → calls existing `/api/code/run` (raw stdout execution, no test harness)
- **Submit for Review** button — enabled only after at least one successful run (no error/TLE)
- On submit: upserts to `user_capstone_submissions`, shows "Submitted — under review" confirmation banner

### State machine

```
idle → running → run-pass | run-fail | error | tle
                     ↓ (run-pass only enables submit)
              submit-ready → submitted
```

On page reload, the last submission (code + output) is restored from the DB via GET `/api/capstone/[capstoneId]`.

---

## Executor Changes

Update the executor's `requirements.txt` on Railway to include a curated package set:

```
requests
beautifulsoup4
pandas
Pillow
python-dotenv
openpyxl
httpx
rich
pydantic
```

No code changes to the executor. `runCode()` already executes free-form scripts with raw stdout.

---

## Content JSON Format

New file per course:

```
app/content/{course-slug}/capstone.json
```

```json
{
  "id": "capstone-{course-slug}-001",
  "course_id": "course-{course-slug}-001",
  "title": "Build a Web Scraper",
  "description": "# Your Capstone: Web Scraper\n\nUsing `requests` and `BeautifulSoup`, scrape...",
  "starter_code": "import requests\nfrom bs4 import BeautifulSoup\n\n# Your code here\n",
  "required_packages": ["requests", "beautifulsoup4"],
  "hints": [
    "Start by fetching the page with requests.get(url)",
    "Use BeautifulSoup(html, 'html.parser') to parse the response",
    "Find elements with .find() or .find_all()"
  ]
}
```

The seeder gains a `seed-capstone` step: reads `capstone.json` and upserts to the `capstones` table via `ON CONFLICT (id) DO UPDATE`.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/capstone/submit` | POST | Upsert submission (code + output) |
| `/api/capstone/[capstoneId]` | GET | Fetch user's existing submission (restore state on reload) |

---

## Out of Scope (Phase 2)

- Instructor review UI (`/admin/capstone`)
- Email notifications on submission
- Approval/rejection status surfaced to learner
- Multiple submission history
