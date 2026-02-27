# Design: Flat Markdown Lesson Content

**Date:** 2026-02-27
**Status:** Approved
**Scope:** Replace the `lesson_sections` / template system with a single flat markdown string rendered by the existing `Markdown` component.

---

## Problem

The `lesson_sections` table and section template system (Zod schemas, typed JSONB, `code-section` / `prose-section` / `challenge-section` templates, `LessonSections` pagination UI) adds significant complexity but delivers no more richness than a plain markdown string. The `Markdown` component already supports GFM + KaTeX — everything the section templates express can be written in flat markdown. The paginated/fade sections UX also adds cognitive friction; a continuous scroll is simpler and more natural.

---

## Decision

Remove the `lesson_sections` table and all associated code. Treat each lesson as a single flat markdown string in `lessons.content TEXT` (already exists). Render it as a continuous scroll via the existing `Markdown` component. Keep the intro/outro template system — it drives `LessonOverlay` (structured hook/outcomes/recap cards) and is working well.

---

## What Gets Deleted

| Item | Type |
|------|------|
| `app/src/components/lesson/lesson-sections.tsx` | Component |
| `app/src/lib/templates/schemas.ts` | Section template Zod schemas (section entries only — intro/outro schemas stay) |
| `app/src/lib/templates/types.ts` | `TemplateContent<T>` for section templates |
| `app/src/lib/templates/validate.ts` | `assertValidContent` / `validateContent` |
| `app/src/components/templates/code-section.tsx` | Template component |
| `app/src/components/templates/prose-section.tsx` | Template component |
| `app/src/components/templates/challenge-section.tsx` | Template component |
| `motion` package | npm package (AnimatePresence only used in LessonSections) |

DB: `lesson_sections` table dropped entirely.

---

## What Stays

- `lessons.content TEXT` — single flat markdown string, already populated by seed
- `lessons.intro_content JSONB`, `lessons.outro_content JSONB` — drive `LessonOverlay`
- All intro/outro templates (`lesson-intro`, `lesson-outro`, `module-intro`, `module-outro`, `course-intro`, `course-outro`) and their schemas/components
- `renderTemplate()`, `TemplateRenderer` — still used by overlays, module overview, course overview
- `LessonOverlay` — unchanged
- `Markdown` component — unchanged, renders GFM + KaTeX

---

## What Changes

### `app/src/lib/data.ts`
- Remove `DbLessonSection` interface
- Remove `getLessonSections()` function
- Add `content: string` to `LessonData` interface (already fetched by `getLesson()`, just not exposed)

### `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`
- Remove `getLessonSections()` call and `sections` variable
- Pass `content={lessonData.content}` to `CodeLessonLayout`

### `app/src/components/lesson/code-lesson-layout.tsx`
- Remove `sections: DbLessonSection[]` prop, add `content: string`
- Replace ProsePane with:
  ```tsx
  <div className="h-full overflow-y-auto px-8 py-6">
    <Markdown>{content}</Markdown>
  </div>
  ```
- Remove the `<h1>{lessonTitle}</h1>` header div above the sections (lesson title is in the header bar and optionally in the markdown `# heading`)
- Remove `LessonSections` import

### `app/src/components/templates/index.tsx`
- Remove `code-section`, `prose-section`, `challenge-section` from registry and `TemplateName` union

### `app/scripts/seed-content.ts`
- Remove all `INSERT INTO lesson_sections` statements

### `app/scripts/validate-content.mjs`
- Remove lesson section count validation check

### `app/migrations/`
- New file: `2026-02-27-drop-lesson-sections.sql`
  ```sql
  DROP TABLE IF EXISTS lesson_sections;
  ```

### `app/package.json`
- `npm uninstall motion`

---

## Architecture After

```
lessons.content TEXT  →  CodeLessonLayout (content prop)
                      →  <div overflow-y-auto>
                             <Markdown>{content}</Markdown>
                          </div>
```

The prose pane is a single scrollable div. No pagination state, no dots, no arrows, no AnimatePresence.

---

## Out of Scope

- No changes to the right pane (code editor, Judge0, output panel)
- No changes to quiz, module overview, course overview
- No changes to `LessonOverlay` or intro/outro templates
- No changes to `lessons.content` format — already plain markdown in seed
