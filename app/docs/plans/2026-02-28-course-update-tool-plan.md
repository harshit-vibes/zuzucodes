# Course Update Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** A `/update-course` Claude Code skill that lets you update any unit of an existing course using AI-assisted agent dispatch with cascade detection.

**Architecture:** Single markdown skill file at `~/.claude/skills/update-course/skill.md`. Reuses all existing agent prompts, validator, and seeder from the /create-course infrastructure. No new TypeScript files.

**Tech Stack:** Claude Code skill (markdown), existing agent prompts in `app/scripts/create-course/prompts/`, existing seeder (`npm run create-course-seed`).

---

## Implementation Notes

### What is NOT needed

- No new TypeScript files (reuses `validator.ts`, `seeder.ts`, all 6 agent prompts)
- No changes to existing agent prompt files
- No database migrations
- No changes to `app/src/` application code

### File locations summary

| File | Action |
|---|---|
| `~/.claude/skills/update-course/skill.md` | CREATE (outside git repo — no commit) |
| `CLAUDE.md` (repo root) | EDIT + COMMIT |

### The `change_description` convention

The `change_description` parameter is how the orchestrator communicates intent to agents. It is not a formal parameter in the existing agent prompts — the subagent treats it as additional guidance appended to the task description. The convention is:

```
change_description: "Update only {field(s)}. {Context about what changed and why}. Do NOT change {other fields}."
```

### Placeholder substitution

All `{placeholders}` in the skill file (e.g. `{course-slug}`, `{module-slug}`, `{file}`, `{index:02d}-{lesson-slug}.json`) must be substituted with actual runtime values before any bash command or agent dispatch.

### Critical Files for Reference

- `~/.claude/skills/create-course/skill.md` — Reference pattern for skill structure, tone, agent dispatch conventions, approve loop format
- `app/scripts/create-course/prompts/lesson-content-agent.md` — Input/output contract for lesson content agent
- `app/scripts/create-course/prompts/code-challenge-agent.md` — Input/output contract for code challenge agent
- `app/scripts/create-course/prompts/structure-agent.md` — Defines `course-outline.json` schema including `status` object format

---

## Task 1: Skill skeleton + entry point + intent resolution

**Files:**
- Create: `~/.claude/skills/update-course/skill.md`

**Step 1: Create the skill directory**

```bash
mkdir -p ~/.claude/skills/update-course
```

**Step 2: Write the skill file with the skeleton**

Write `~/.claude/skills/update-course/skill.md` with exactly this content:

```markdown
# Update Course

An internal skill for updating any unit of an existing zuzu.codes course — lesson content, code challenge, module intro/outro, quiz, course-level forms, or structural changes (add/remove/reorder).

Reuses all agent prompts, validator, and seeder from `/create-course`. The only new behaviour is cascade detection and structural-change orchestration.

## Quick start

When invoked, ask in sequence:

1. List the slugs found in `app/content/`:
   ```bash
   ls app/content/
   ```
   Ask: **"Which course do you want to update?"** (show the slugs)

2. Ask: **"What do you want to update?"** (free-form — see examples below)

**Example inputs:**
- *"rewrite lesson 3's code challenge in module 2"*
- *"add a new lesson after lesson 1 in module 1 about list comprehensions"*
- *"update the module 2 quiz — it's too easy"*
- *"rewrite the course intro hook"*
- *"remove lesson 4 from module 1"*
- *"move module 3 before module 1"*

After receiving both answers, resolve the intent using the table below, then check for resume.

**Important:** All bash commands use `{placeholders}` for dynamic values. Substitute actual values before running any command.

---

## Intent Resolution

| What the user describes | Agent(s) dispatched |
|---|---|
| Lesson content (body, problem fields, intro/outro) | Lesson Content Agent |
| Code challenge only (entry_point, solution, test_cases) | Code Challenge Agent |
| Lesson content + challenge | Lesson Content Agent then Code Challenge Agent |
| Module intro/outro | Module Agent |
| Module quiz | Quiz Agent |
| Course intro/outro or confidence form | Course Content Agent |
| Add a lesson | Lesson Content Agent + Code Challenge Agent (new file) |
| Add a module | Module Agent + all lesson agents + Quiz Agent |
| Remove a lesson | Delete file + reindex — no agent |
| Reorder lessons or modules | Update outline + reindex — no agent |

Resolve the intent from the user's natural language. If ambiguous, ask one clarifying question.

---

## Resume behaviour

Before dispatching any agents, check for pending units:

1. Read `app/content/{course-slug}/course-outline.json` status field.
2. If any `status` values are `'pending'`, tell the user:
   ```
   Found 2 pending unit(s) from a previous session — resuming from the first.
     • lesson:module-2:1
     • quiz:module-2
   ```
3. Resume from the first pending unit, skipping any that are `'complete'`.
4. If no pending units, proceed with the user's stated intent.

---
```

**Step 3: Verify**

Read `~/.claude/skills/update-course/skill.md`. Confirm the file exists, intent table has 10 rows, resume section references the `status` field in `course-outline.json`.

---

## Task 2: Content update flow

**Files:**
- Edit: `~/.claude/skills/update-course/skill.md` — append section

**Step 1: Append the content update flow**

Append the following to `~/.claude/skills/update-course/skill.md`:

```markdown
## Content Update Flow

For non-structural updates (lesson content, code challenge, module, quiz, course content).

### Step 1: Status reset (before every agent dispatch)

Before dispatching an agent for any unit, reset its status in two places:

1. In the entity file (`module.json`, lesson JSON, `course.json`), set `"_status": "pending"`.
2. In `app/content/{course-slug}/course-outline.json`, set the corresponding status key to `"pending"`.

Both must be updated together. Status key format:
- Module intro/outro: `'module:{module-slug}'`
- Lesson: `'lesson:{module-slug}:{lesson-index}'`
- Module quiz: `'quiz:{module-slug}'`
- Course content: `'course-content'`

### Step 2: Dispatch the agent

Read the relevant agent prompt, then dispatch a Task subagent. Pass a `change_description` alongside the standard inputs — this is additional guidance describing what to change. The agent treats it as: "Update this unit with the following in mind: {change_description}".

#### Lesson Content Agent

**When:** user wants to change lesson body, problem fields (summary/constraints/hints), or lesson intro/outro.

**Read prompt from:** `app/scripts/create-course/prompts/lesson-content-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/lesson-content-agent.md`
- course_outline: {paste full contents of course-outline.json}
- module_json: {paste module.json contents}
- lesson_title: {current title from outline}
- lesson_objectives: {objectives from outline}
- lesson_index: {0-based index}
- prev_lesson_title: {previous lesson title or empty string}
- next_lesson_title: {next lesson title or empty string}
- output_path: `app/content/{course-slug}/{module-slug}/lessons/{index:02d}-{lesson-slug}.json`
- course_slug: {course slug}
- module_slug: {module slug}
- change_description: {user's description of what to change, e.g. "Rewrite the lesson body to be more concise. The code examples are too long."}

The agent must read the existing lesson JSON first, then update ONLY the fields the change_description targets. It must NOT overwrite `code_template`, `solution_code`, `entry_point`, or `test_cases` unless the change explicitly involves those fields.

#### Code Challenge Agent

**When:** user wants to change the code challenge (entry_point, solution, test cases, code_template).

**Read prompt from:** `app/scripts/create-course/prompts/code-challenge-agent.md`

Check `app/.env.local` for `EXECUTOR_URL` and `EXECUTOR_API_KEY`. If missing, stop and tell the user: "app/.env.local is missing EXECUTOR_URL and/or EXECUTOR_API_KEY. Add these values before continuing."

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/code-challenge-agent.md`
- lesson_json_path: `app/content/{course-slug}/{module-slug}/lessons/{file}.json`
- lesson_title: {lesson title}
- lesson_objectives: {lesson objectives}
- lesson_content_summary: {first paragraph of existing lesson content}
- executor_url: {EXECUTOR_URL from .env.local}
- executor_api_key: {EXECUTOR_API_KEY from .env.local}
- change_description: {user's description, e.g. "Make the challenge harder — add two hidden edge case test cases for empty input and negative numbers."}

The agent reads the existing lesson JSON, updates only `code_template`, `solution_code`, `entry_point`, `test_cases`, and `_status`. It does NOT touch content fields.

#### Lesson Content + Code Challenge (both)

Dispatch Lesson Content Agent first, wait for completion, then dispatch Code Challenge Agent. Both receive the same `change_description`. The Code Challenge Agent uses the lesson content summary from the newly written content.

#### Module Agent

**When:** user wants to change module intro/outro.

**Read prompt from:** `app/scripts/create-course/prompts/module-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/module-agent.md`
- course_outline: {paste full contents of course-outline.json}
- module_slug: {slug}
- module_dir: `app/content/{course-slug}/{module-slug}/`
- module_order: {1-based index}
- change_description: {user's description, e.g. "Rewrite the outro recap — it should mention all three lesson topics specifically."}

The agent must read the existing `module.json` first and update ONLY `intro_content` and/or `outro_content` as directed. It must NOT overwrite `quiz_form`.

#### Quiz Agent

**When:** user wants to change the module quiz.

**Read prompt from:** `app/scripts/create-course/prompts/quiz-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/quiz-agent.md`
- module_json_path: `app/content/{course-slug}/{module-slug}/module.json`
- module_title: {title}
- lesson_json_paths: array of all lesson JSON paths for this module
- change_description: {user's description, e.g. "The quiz is too easy. Make 2 of the 4 questions harder by testing edge cases or subtle distinctions."}

#### Course Content Agent

**When:** user wants to change course intro/outro or confidence form.

**Read prompt from:** `app/scripts/create-course/prompts/course-content-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/course-content-agent.md`
- course_json_path: `app/content/{course-slug}/course.json`
- course_outline_path: `app/content/{course-slug}/course-outline.json`
- module_json_paths: array of all module.json paths in order
- change_description: {user's description, e.g. "Rewrite the intro hook — make it specific to why Python is the right first language for a student in 2026."}

### Step 3: Display + validate + approve loop

After the agent completes, display a summary and run validation. Same format as `/create-course`.

**For a lesson:**
```
── Lesson {index}: {title} ─────────────────────────
  intro hook: "{hook}"
  body: ~{N} paragraphs, {N} code blocks
  code_challenge: entry_point={entry_point}, {N} test cases ({N} visible)
  solution: {first line of solution_code}
  executor: {✓ N/N tests pass  OR  ✗ verify-failed: list failures}
  outro teaser: "{next_lesson_teaser}"

  Validation: {run validator, show result}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateLessonJson} = await import('./scripts/create-course/validator.ts');
const l = JSON.parse(require('fs').readFileSync('content/{course-slug}/{module-slug}/lessons/{file}.json', 'utf8'));
const r = validateLessonJson(l);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

**For a module (intro/outro only — ignore quiz_form error):**
```
── Module {N}: {title} ─────────────────────────────
  description: "{description}"
  what_you_learn: {N} items
  outro: "{recap first sentence}..."
  next_module: "{next_module}"

  Validation: {run validator — ignore quiz_form error if quiz unchanged}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateModuleJson} = await import('./scripts/create-course/validator.ts');
const m = JSON.parse(require('fs').readFileSync('content/{course-slug}/{module-slug}/module.json', 'utf8'));
const r = validateModuleJson(m);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

**For a quiz:**
```
── Quiz: {module title} ────────────────────────────
  title: "{quiz title}"
  passingScore: {N}%
  questions:
    q1: {statement}
    q2: {statement}

  Validation: {run validator}
```

**For course content:**
```
── Course: {title} ─────────────────────────────────
  hook: "{hook}"
  outcomes: {N} items
  confidence form: {N} questions
    - {question 1}
    - ...
  outro: "{recap first sentence}..."

  Validation: {run validator}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateCourseJson} = await import('./scripts/create-course/validator.ts');
const c = JSON.parse(require('fs').readFileSync('content/{course-slug}/course.json', 'utf8'));
const r = validateCourseJson(c);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

**Ask: "Approve? [yes / edit / regenerate]"**
- `yes` → set `_status: 'complete'` in entity file; set `status[key]` to `'complete'` in `course-outline.json`; proceed to cascade check
- `edit` → ask what to change, apply with Edit tool, re-validate, re-display
- `regenerate [notes]` → re-dispatch the same agent(s) with notes appended to `change_description`

---
```

**Step 2: Verify**

Read the appended section. Confirm all 5 agent types are documented, `change_description` is passed to each, and the approve/edit/regenerate loop is described.

---

## Task 3: Cascade detection

**Files:**
- Edit: `~/.claude/skills/update-course/skill.md` — append section

**Step 1: Append the cascade section**

Append the following to `~/.claude/skills/update-course/skill.md`:

```markdown
## Cascade Detection

After each unit is approved, check for stale neighbours. Present each cascade offer on a separate line:

```
── Cascade check ──────────────────────────────────
  Lesson 2 outro teaser references this lesson — regenerate? [yes / skip]
  Module 2 quiz may be outdated — regenerate? [yes / skip]
```

`yes` dispatches the relevant agent with a targeted `change_description`. Each cascade unit goes through its own approve/edit/regenerate loop. `skip` leaves the unit unchanged.

### Cascade table

| Unit changed | Cascade offers |
|---|---|
| Lesson content | Prev lesson outro teaser · Next lesson intro context · Module quiz |
| Code challenge | Module quiz |
| Lesson content + challenge | Prev outro teaser · Next intro context · Module quiz |
| Module intro/outro | Nothing |
| Course intro/outro | Nothing |
| Lesson added | Prev outro teaser · Next intro context · Module quiz |
| Lesson removed | Prev outro teaser · Next intro context · Module quiz |
| Module added | Course confidence form · Course outro recap |
| Module removed | Course confidence form · Course outro recap |
| Reorder only | Prev/next outro teasers · Quiz NOT offered (no content changed) |

### How to handle each cascade type

#### Prev lesson outro teaser

Dispatch Lesson Content Agent for the PREVIOUS lesson with:

```
change_description: "Update only the outro_content.next_lesson_teaser field. The next lesson ({next-lesson-title}) has changed — write a new one-sentence teaser that accurately reflects what the learner will do in that lesson. Do NOT change any other field."
```

Status key: `'lesson:{module-slug}:{prev-lesson-index}'` — reset to `'pending'` before dispatch, `'complete'` after approval.

#### Next lesson intro context

Dispatch Lesson Content Agent for the NEXT lesson with:

```
change_description: "Update only the intro_content.hook field. The previous lesson ({prev-lesson-title}) has changed — write a new one-sentence hook that accurately frames why this lesson follows from what was just learned. Do NOT change any other field."
```

Status key: `'lesson:{module-slug}:{next-lesson-index}'` — reset to `'pending'` before dispatch, `'complete'` after approval.

#### Module quiz

Dispatch Quiz Agent with:

```
change_description: "The content of {lesson-title} (lesson index {index}) has changed — review all quiz questions and update any that test concepts from that lesson. If the questions are still accurate, return them unchanged. Do NOT change questions that test other lessons."
```

Status key: `'quiz:{module-slug}'` — reset to `'pending'` before dispatch, `'complete'` after approval.

#### Course confidence form

Dispatch Course Content Agent with:

```
change_description: "Update only the confidence_form field. A module ({module-title}) has been {added/removed} — review the confidence questions and ensure there is exactly one question per remaining module's skill area. Do NOT change intro_content or outro_content."
```

Status key: `'course-content'` — reset to `'pending'` before dispatch, `'complete'` after approval.

#### Course outro recap

Dispatch Course Content Agent with:

```
change_description: "Update only the outro_content.recap field. A module ({module-title}) has been {added/removed} — rewrite the recap to accurately reflect the full arc of the course as it now stands. Do NOT change intro_content or confidence_form."
```

Status key: `'course-content'` — reset to `'pending'` before dispatch, `'complete'` after approval.

> If both course confidence form and course outro recap are triggered in the same session, dispatch the Course Content Agent ONCE with a combined `change_description` covering both fields rather than dispatching twice.

---
```

**Step 2: Verify**

Read the cascade section. Confirm the cascade table has all 10 rows matching the design doc, and each cascade type has an exact `change_description` template.

---

## Task 4: Structural change flow

**Files:**
- Edit: `~/.claude/skills/update-course/skill.md` — append section

**Step 1: Append the structural changes section**

Append the following to `~/.claude/skills/update-course/skill.md`:

```markdown
## Structural Changes

Structural changes always update `course-outline.json` first, show a diff, and get confirmation before dispatching any agents.

### Adding a lesson

1. Ask: "Where should the new lesson go?" (e.g. "after lesson 1 in module 2") and "What should it cover?" (title and main objectives).

2. Compute the new `lesson_index` (0-based). All subsequent lessons in the module shift up by 1.

3. Update `course-outline.json`: insert the new lesson entry at the correct position in the module's `lessons` array.

4. Display as a tree diff:
   ```
   Module 2: {title}
     Lesson 0: {title}
   + Lesson 1: {NEW LESSON TITLE}  ← inserting here
     Lesson 1: {old lesson 1} → now Lesson 2
     Lesson 2: {old lesson 2} → now Lesson 3
   ```

5. Ask: **"Approve structure change? [yes / cancel]"** — `cancel` restores `course-outline.json`.

6. Rename subsequent lesson files, working backwards from the highest index to avoid collisions:
   ```bash
   mv app/content/{course-slug}/{module-slug}/lessons/02-loops.json app/content/{course-slug}/{module-slug}/lessons/03-loops.json
   mv app/content/{course-slug}/{module-slug}/lessons/01-variables.json app/content/{course-slug}/{module-slug}/lessons/02-variables.json
   ```

7. In each renamed file, update the `lesson_index` field to the new 0-based value (Read + Write to preserve all other fields).

8. Dispatch Lesson Content Agent then Code Challenge Agent for the new lesson. Write to `{index:02d}-{lesson-slug}.json`.

9. Run the approve loop for the new lesson.

10. Cascade: prev lesson outro teaser, next lesson intro context, module quiz.

### Removing a lesson

1. Show what will be deleted:
   ```
   About to remove Lesson {N}: "{title}"
   File: app/content/{course-slug}/{module-slug}/lessons/{file}.json

   Remove this lesson? [yes / cancel]
   ```

2. If `yes`:
   - Delete the lesson file: `rm app/content/{course-slug}/{module-slug}/lessons/{file}.json`
   - Remove the lesson entry from `course-outline.json`'s module lessons array.
   - Remove `status['lesson:{module-slug}:{old-index}']` from `course-outline.json`.

3. Reindex all subsequent lessons (shift `lesson_index` down by 1):
   - Rename files from lowest to highest index: `{N+1:02d}-{slug}.json` → `{N:02d}-{slug}.json`
   - Update `lesson_index` in each renamed file.
   - Update the corresponding `status` keys in `course-outline.json`.

4. No agent dispatched.

5. Cascade: prev lesson outro teaser, next lesson intro context, module quiz.

### Adding a module

1. Ask: module title, lesson count, lesson titles and objectives, and position in the course.

2. Update `course-outline.json`: insert the new module at the specified position, shift `order` values for subsequent modules up.

3. Display the tree diff showing the new module and its planned lessons. Ask: **"Approve structure change? [yes / cancel]"**

4. Create the directory:
   ```bash
   mkdir -p app/content/{course-slug}/{new-module-slug}/lessons
   ```

5. Run the full module pipeline:
   - Module Agent → module.json (intro/outro, `_status: 'content-complete'`)
   - For each lesson: Lesson Content Agent → Code Challenge Agent → approve loop
   - Quiz Agent → approve loop (sets `_status: 'complete'`)

6. Cascade: course confidence form + course outro recap — dispatch Course Content Agent once with combined `change_description`.

### Removing a module

1. Show what will be deleted:
   ```
   About to remove Module {N}: "{title}"
   Contains {N} lessons: {lesson titles}
   Directory: app/content/{course-slug}/{module-slug}/

   Type 'remove' to confirm, or press Enter to cancel:
   ```

2. If confirmed (`remove`):
   ```bash
   rm -rf app/content/{course-slug}/{module-slug}/
   ```
   - Remove the module entry from `course-outline.json`'s `modules` array.
   - Remove all `status` keys for this module: `module:{slug}`, `lesson:{slug}:*`, `quiz:{slug}`.
   - Update `order` values for all remaining modules.

3. No agent dispatched.

4. Cascade: course confidence form + course outro recap.

### Reordering

1. User describes the change: *"move module 3 before module 1"* or *"swap lesson 2 and 3 in module 1"*.

2. Show a before/after tree diff:
   ```
   Before:          After:
   Module 1: A      Module 1: C  ← moved
   Module 2: B      Module 2: A
   Module 3: C      Module 3: B
   ```

3. Ask: **"Approve reorder? [yes / cancel]"**

4. For module reorder: update `order` fields in `course-outline.json`. No file renames needed.

5. For lesson reorder within a module: use temporary names to avoid collisions:
   ```bash
   # Swapping lesson index 1 and 2:
   mv app/content/{course-slug}/{module-slug}/lessons/02-{slug-b}.json app/content/{course-slug}/{module-slug}/lessons/tmp-02.json
   mv app/content/{course-slug}/{module-slug}/lessons/01-{slug-a}.json app/content/{course-slug}/{module-slug}/lessons/02-{slug-a}.json
   mv app/content/{course-slug}/{module-slug}/lessons/tmp-02.json app/content/{course-slug}/{module-slug}/lessons/01-{slug-b}.json
   ```
   Update `lesson_index` in each affected file. Reorder the lessons array in `course-outline.json`.

6. Cascade: prev/next outro teasers for lessons with new neighbours. Quiz NOT offered (no content changed).

---
```

**Step 2: Verify**

Read the section. Confirm all 5 structural change types are present, `mv` commands use 2-digit prefix convention, reorder uses temp-rename pattern to avoid collisions.

---

## Task 5: Status management + resume + seeding

**Files:**
- Edit: `~/.claude/skills/update-course/skill.md` — append section

**Step 1: Append the status + seeding section**

Append the following to `~/.claude/skills/update-course/skill.md`:

```markdown
## Status Management

### Dual-write rule

Every status change requires writing to TWO places simultaneously:

1. Entity file (`module.json`, lesson JSON, `course.json`): update `_status` field.
2. `course-outline.json`: update the corresponding key in the `status` object.

The `_status` field on entity files is a local sentinel — the seeder never writes it to the DB. The `status` object in `course-outline.json` is what the resume logic reads.

**Status key format:**
| Unit | Key |
|---|---|
| Module intro/outro | `module:{module-slug}` |
| Lesson | `lesson:{module-slug}:{lesson-index}` |
| Module quiz | `quiz:{module-slug}` |
| Course content | `course-content` |

### Status cycle

```
Before agent dispatch:
  entity._status          = 'pending'
  outline.status[key]     = 'pending'

After user approves:
  entity._status          = 'complete'
  outline.status[key]     = 'complete'
```

Cascade units that are regenerated follow the same pending → complete cycle individually.

### Writing status back

After every approval, read `course-outline.json`, update the relevant key, and write it back using the Read + Write tools. Always write the full file — do NOT use Edit for partial updates.

---

## Seeding

After ALL targeted units and ALL cascade units are approved, seed the course once:

```bash
cd app && npm run create-course-seed -- --course={course-slug}
```

Then validate:

```bash
node app/scripts/validate-content.mjs
```

Report results. If clean:
```
Course '{title}' is updated and live. {N} units changed, seeded to DB.
Visit http://localhost:3000/dashboard to preview.
```

If errors: display them and ask how to fix.

**Rules:**
- Seed ONCE per session, after all approvals — not after each individual unit.
- The seeder is idempotent (`ON CONFLICT DO UPDATE`) — no data is lost for untouched units.
- Do NOT seed if any unit is still in `'pending'` status.

---
```

**Step 2: Verify**

Read the section. Confirm dual-write rule is clearly stated, status cycle shows both writes, seeding is once per session, and validation step is included.

---

## Task 6: Update CLAUDE.md and commit

**Files:**
- Edit: `CLAUDE.md` (repo root)

**Step 1: Add the `/update-course` section**

In `/Users/harshitchoudhary/Documents/projects/zuzucodes/CLAUDE.md`, find the line:

```
**Agent prompt files** (for reference/editing): `app/scripts/create-course/prompts/`
```

Add a new section immediately after the "Creating a Course" section ends (before `## App Platform Architecture`):

```markdown
## Updating a Course

Use the `/update-course` Claude Code skill to update any unit of an existing course — lesson content, code challenge, module intro/outro, quiz, course-level forms, or structural changes (add/remove/reorder lessons and modules).

```bash
/update-course
```

The skill:
1. Asks which course (lists slugs from `app/content/`)
2. Asks what to update (free-form natural language)
3. Resolves intent to the correct agent(s)
4. Resets status, dispatches agent, validates, and runs the approve/edit/regenerate loop
5. Checks for cascade effects (stale neighbours) and offers to regenerate each
6. Seeds the course once all approvals are complete: `npm run create-course-seed -- --course={slug}`

Structural changes (add/remove/reorder) update `course-outline.json` first and show a diff before dispatching any agents.

**Reuses all agent prompts:** `app/scripts/create-course/prompts/`

**Status management:** Same dual-write rule as `/create-course` — `_status` in entity files + `status` map in `course-outline.json`.
```

**Step 2: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add CLAUDE.md
git commit -m "docs: add /update-course skill reference to CLAUDE.md"
```

**Step 3: Verify**

Run `git log --oneline -3` to confirm the commit. Read the updated section in CLAUDE.md.

---

## Summary of files changed

| File | Type | Committed |
|---|---|---|
| `~/.claude/skills/update-course/skill.md` | Created (286+ lines) | No — outside git repo |
| `CLAUDE.md` | Edited | Yes |
