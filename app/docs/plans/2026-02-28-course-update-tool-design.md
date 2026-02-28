# Course Update Tool Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** A `/update-course` Claude Code skill that lets you update any unit of an existing course — lesson content, code challenge, module intro/outro, quiz, course-level forms, or structural changes (add/remove/reorder lessons and modules) — using the same agent-dispatch pattern as `/create-course`.

**Architecture:** New skill file at `~/.claude/skills/update-course/skill.md`. Reuses all 6 existing agent prompt files and the existing seeder. No new TypeScript files required. Cascade detection is built into the skill's orchestration logic.

**Tech Stack:** Same as `/create-course` — Claude Code skill, Task subagents, existing agent prompts in `app/scripts/create-course/prompts/`, existing seeder (`npm run create-course-seed`), existing validator.

---

## Entry Point & Intent Resolution

### Invocation

```
/update-course
```

Opens with two questions in sequence:
1. *"Which course?"* — lists slugs found in `app/content/`
2. *"What do you want to update?"* — free-form natural language

### Example inputs

- *"rewrite lesson 3's code challenge in module 2"*
- *"add a new lesson after lesson 1 in module 1 about list comprehensions"*
- *"update the module 2 quiz — it's too easy"*
- *"rewrite the course intro hook"*
- *"remove lesson 4 from module 1"*
- *"move module 3 before module 1"*

### Intent → Agent mapping

| Target type | Agent(s) dispatched |
|---|---|
| Lesson content (body, problem fields, intro/outro) | Lesson Content Agent |
| Code challenge only | Code Challenge Agent |
| Lesson content + challenge | Both in sequence |
| Module intro/outro | Module Agent |
| Module quiz | Quiz Agent |
| Course intro/outro / confidence form | Course Content Agent |
| Add lesson | Lesson Content Agent + Code Challenge Agent (new file) |
| Add module | Module Agent + all lesson agents + Quiz Agent |
| Remove lesson | Delete file + reindex — no agent |
| Reorder | Update outline + reindex — no agent |

**Structural changes (add/remove/reorder):** update `course-outline.json` first, show the diff, get approval before dispatching any agents.

---

## Cascade Detection

After each unit is approved, the skill checks for stale neighbours and offers to regenerate each one individually:

| Unit changed | Cascade offers |
|---|---|
| Lesson content | Prev lesson outro teaser · Next lesson intro context · Module quiz |
| Code challenge | Module quiz |
| Lesson content + challenge | All of the above |
| Lesson added | Prev lesson outro teaser · Next lesson intro context · Module quiz |
| Lesson removed | Same neighbours · Reindex all subsequent `lesson_index` values |
| Module added | Course confidence form · Course outro recap |
| Module removed | Course confidence form · Course outro recap |
| Reorder only | Prev/next outro teasers offered · Quiz NOT offered (no content changed) |
| Module intro/outro | Nothing |
| Course intro/outro | Nothing |

### Cascade UX

```
── Cascade check ──────────────────────────────────
  Lesson 2 outro teaser references this lesson — regenerate? [yes / skip]
  Module 2 quiz may be outdated — regenerate? [yes / skip]
```

Each cascade prompt is separate. `yes` dispatches the relevant agent with a note explaining the triggering change. Each cascade unit goes through its own approve/edit/regenerate loop. `skip` leaves the unit unchanged.

---

## Structural Changes

### Adding a lesson

1. Update `course-outline.json` — insert at specified position, shift subsequent entries
2. Show outline diff → *"Approve structure change? [yes / edit]"*
3. Run Lesson Content Agent + Code Challenge Agent for the new lesson
4. Assign `lesson_index` = 0-based position; reindex all subsequent lessons in their JSON files
5. Rename subsequent lesson files: `02-old.json` → `03-old.json` etc.
6. Cascade: prev lesson outro teaser, next lesson intro context, module quiz

### Removing a lesson

1. Show what will be deleted → *"Remove lesson {N}: '{title}'? [yes / cancel]"*
2. Delete lesson JSON file, remove from `course-outline.json`, reindex subsequent lessons
3. No agent dispatched
4. Cascade: prev lesson outro teaser, next lesson intro context, module quiz

### Adding a module

1. Ask for module title and lesson titles/objectives (same as Stage 1 of `/create-course`)
2. Update `course-outline.json`, show diff, get approval
3. Run full module pipeline: Module Agent → (Lesson Content + Code Challenge per lesson) → Quiz Agent
4. Cascade: course confidence form, course outro recap

### Removing a module

1. Show what will be deleted → *"Remove module '{title}' and its {N} lessons? Type 'remove' to confirm."*
2. Delete module directory, remove from `course-outline.json`
3. Cascade: course confidence form, course outro recap

### Reordering

1. User describes the change: *"move module 3 before module 1"* or *"swap lesson 2 and 3 in module 1"*
2. Show new order as tree diff → approve
3. Update `course-outline.json` `order` fields and lesson `lesson_index` values in JSON files
4. Rename lesson files to match new indices
5. Cascade: prev/next outro teasers offered; no quiz cascade

---

## Status Management

### Reset on update

Before dispatching an agent for a unit, reset its status in `course-outline.json`:
```
status['lesson:module-2:2'] → 'pending'   (before agent runs)
                             → 'complete'  (after user approves)
```

Entity file `_status` follows the same cycle. Both must be in sync (same dual-write rule as `/create-course`).

Cascade units that are regenerated get the same reset → complete cycle individually.

### Resume on interruption

If the user closes Claude Code mid-session, JSON files on disk reflect whatever was approved. Re-invoking `/update-course` on the same course resumes from units still in `pending` status — same resume logic as `/create-course`.

---

## Seeding

After all targeted + cascade units are approved, seed the affected course once:

```bash
cd app && npm run create-course-seed -- --course={course-slug}
```

Seeder is idempotent (`ON CONFLICT DO UPDATE`) — only changed rows are updated. No data is lost for untouched units. Seeding happens once per session, after all approvals, not after each individual unit.

---

## File Naming for New Lessons

New lesson files: `{index:02d}-{lesson-slug}.json` — consistent with existing convention.

When a lesson is inserted mid-module, subsequent files are renamed to reflect new indices before the new lesson file is written. This prevents filename collisions and keeps the sort order correct (the seeder reads lesson files in alphabetical order).

---

## What is NOT in scope (v1)

- Bulk updates across multiple courses in one session
- Diff view of DB state vs JSON files (the seeder handles this via upsert)
- Undo / rollback (git serves this purpose — each approval can be committed)
- Updating `course-outline.json` metadata (title, tag, outcomes, who_is_this_for) — the outline is treated as agreed structure; changing it is out of scope for v1
