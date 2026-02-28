# Course Creation Tool Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** A Claude Code skill (`/create-course`) that conversationally guides course creation — structure first, then content unit by unit — writing schema-validated JSON files that seed directly into the platform DB.

**Architecture:** Claude Code skill orchestrates specialised Task subagents in a staged pipeline. Human approves at every level before generation continues. JSON files in `app/content/` are the source of truth; the existing seeder writes them to Neon.

**Tech Stack:** TypeScript, existing Zod schemas (`src/lib/templates/schemas.ts`), existing `assertValidContent` validator, self-hosted Python executor for code verification, Neon DB via existing seed mechanism.

---

## Stage Overview

```
Stage 1 — Structure
  Orchestrator converses → agrees course title, tag, outcomes,
  module names, lesson titles + learning objectives per module
  → writes course-outline.json
  → Human approves

Stage 2 — Content (per module → per lesson)
  For each module:
    Module Agent → module intro/outro
    → Human approves module

    For each lesson:
      Lesson Content Agent → Markdown body, problem fields, intro/outro
      Code Challenge Agent → solution_code, code_template, entry_point,
                             test_cases + executor verification loop
      → Human approves combined lesson

  For each module (after lessons approved):
    Quiz Agent → quiz_form
    → Human approves quiz

Stage 3 — Course level
  Course Content Agent → course intro/outro, confidence_form
  → Human approves
  → Seeder writes all JSON → DB
```

---

## File Structure

```
app/content/
└── {course-slug}/
    ├── course-outline.json          # agreed structure + completion status (orchestration state)
    ├── course.json                  # course row + course-intro + course-outro + confidence_form
    └── {module-slug}/
        ├── module.json              # module row + module-intro + module-outro + quiz_form
        └── lessons/
            ├── 00-{lesson-slug}.json
            ├── 01-{lesson-slug}.json
            └── ...
```

Each file is self-contained. The seeder reads the tree and upserts in order (course → modules → lessons → test_cases). Re-running is idempotent.

`course-outline.json` tracks completion status per unit so `/create-course` on an existing slug resumes from the last incomplete unit — no re-generation of approved content.

---

## Agent Specialisation

### Structure Agent
- **Input:** course topic + target audience (from conversation)
- **Output:** `course-outline.json` — title, slug, tag, outcomes, modules[] with lesson titles + learning objectives

### Module Agent (× N modules)
- **Input:** `course-outline.json` + this module's position in sequence
- **Output:** `module-intro` and `module-outro` fields in `module.json`

### Lesson Content Agent (× N lessons)
- **Input:** course-outline + module context + lesson position + neighboring lesson titles (for teaser continuity)
- **Output:** Markdown body, `problem_summary`, `problem_constraints`, `problem_hints`, `lesson-intro`, `lesson-outro`

### Code Challenge Agent (× N lessons) — has retry loop
- **Input:** course-outline + module context + lesson title + objectives + body content from Content Agent
- **Output:** `solution_code`, `code_template` (stubbed from solution), `entry_point`, `test_cases[]`
- **Verification loop:**
  1. Generate solution + test_cases (args[], expected, visible, description)
  2. Derive code_template: copy solution, replace body with `pass`
  3. POST to executor: run solution against all test_cases
  4. All pass → done
  5. Any fail → send failure output back to agent + retry (max 3×)
  6. After 3 failures → flag for human, don't block generation

### Quiz Agent (× N modules, after lessons approved)
- **Input:** course-outline + module.json + ALL lesson JSONs for that module
- **Output:** `quiz_form` (questions test exactly what was taught in the lesson solutions)

### Course Content Agent
- **Input:** course-outline + ALL module.json + lesson summaries
- **Output:** `course-intro`, `course-outro`, `confidence_form`

**Context inheritance principle:** every agent receives all approved ancestor decisions as read-only context. The Code Challenge Agent reads the lesson body so the challenge matches the teaching. The Quiz Agent reads lesson solutions so questions are grounded in real content.

---

## Validation

Validator runs **before every approval checkpoint** — human never sees invalid content:

- Zod schema check (existing `schemas.ts` — `lesson-intro`, `lesson-outro`, `module-intro`, `module-outro`, `course-intro`, `course-outro`)
- Structural rules: `lesson_count` matches actual lesson files, quiz `correctOption` present in `options`, confidence_form has ≥ 1 question
- For lessons: executor verification (solution must pass 100% of generated test_cases)
- Surfaces errors with field-level diff before presenting for approval

---

## Approval UX

Same interaction shape at every level:

```
── Module 1: Hello, World! ─────────────────────────
  intro: "Your first Python functions — from a simple return..."
  what_you_learn: 3 items
  outro: "You defined your first three Python functions..."

  Validation: ✓ schema valid

Approve? [yes / edit / regenerate / skip]
```

Lesson approval adds executor result:

```
── Lesson 1: Your First Python Function ─────────────
  body: 3 paragraphs, 2 code blocks
  code_challenge: entry_point=greet, 2 test cases (1 visible)
  solution: def greet(): return "Hello, World!"
  executor: ✓ 2/2 tests pass

  intro hook: "Every useful Python program is built from functions..."
  outro teaser: "Next up: make your greeting dynamic with f-strings."

  Validation: ✓ schema valid

Approve? [yes / edit / regenerate / skip]
```

**Options:**
- `yes` — write JSON file, move to next unit
- `edit` — describe change in chat, re-validate, re-present
- `regenerate [notes]` — re-dispatch agent with optional guidance
- `skip` — write `TODO` marker in JSON, continue; seeder skips incomplete files

**Seeder gate:** seeder refuses unless every unit has status `complete`. Override with `--allow-incomplete` for partial preview deploys.

---

## v2 Migration Path

v1 is entirely Claude Code native — orchestration via the Task tool, subagents are Claude Code agents.

v2 extracts orchestration into a standalone `scripts/create-course.mjs`:
- Each subagent's system prompt + generation call becomes a function using `@anthropic-ai/sdk` with structured output (Zod schemas already exist)
- `Task tool dispatch` → `anthropic.messages.create({ response_format: zodToJsonSchema(...) })`
- Swap `anthropic` client for `openai`/`gemini` client to make provider-agnostic
- Same JSON output, same seeder, same approval flow (terminal prompts instead of Claude Code conversation)
- All agent prompts live in `scripts/prompts/` as plain strings — no Claude Code dependency
