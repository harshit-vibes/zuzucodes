# Flat Markdown Lesson Content Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace the `lesson_sections` / section-template system with a single flat markdown string rendered by the existing `Markdown` component.

**Architecture:** Drop the `lesson_sections` DB table and all section template code. `lessons.content TEXT` (already populated, already returned by `getLesson()`) becomes the single lesson content source. `CodeLessonLayout` receives a `content: string` prop and renders it with `<Markdown content={content} />` in a scrollable div. `LessonOverlay` and intro/outro templates are untouched.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, Neon PostgreSQL (raw SQL).

---

## Task 1: DB migration — drop lesson_sections table

**Files:**
- Create: `app/migrations/2026-02-27-drop-lesson-sections.sql`

**Step 1: Create the migration file**

```sql
-- Drop lesson_sections table (replaced by flat lessons.content TEXT field)
DROP TABLE IF EXISTS lesson_sections;
```

**Step 2: TypeScript check (no code changes — just verify baseline is clean)**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 3: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/migrations/2026-02-27-drop-lesson-sections.sql
git commit -m "feat: migration — drop lesson_sections table"
```

---

## Task 2: Remove DbLessonSection and getLessonSections from data.ts

**Files:**
- Modify: `app/src/lib/data.ts:86-117`

**Context:**
- Lines 84–117 of `data.ts` contain the `DbLessonSection` interface and `getLessonSections` cache function — both tied to the `lesson_sections` table.
- `LessonData.content: string` already exists at line 225 and is already returned by `getLesson()` at line 277 — **no changes needed** to `LessonData` or `getLesson()`.
- After removing these lines, two files will have TS errors until Tasks 3 and 4 fix them: `code-lesson-layout.tsx` (imports `DbLessonSection`) and `lesson/[order]/page.tsx` (calls `getLessonSections`). Fix all in one commit at end of Task 4.

**Step 1: Delete the DbLessonSection interface and getLessonSections function**

In `app/src/lib/data.ts`, remove this entire block (lines 84–117):

```typescript
// ── Template system ──────────────────────────────────────────────────────────

export interface DbLessonSection {
  id: string;
  lessonId: string;
  position: number;
  template: string;        // TemplateName — kept as string here to avoid server bundle coupling
  content: unknown;        // Validated JSONB; cast to TemplateContent<T> at render time
}

/**
 * Fetch all sections for a lesson, ordered by position.
 * Wrapped with React.cache() for per-request deduplication.
 */
export const getLessonSections = cache(async (lessonId: string): Promise<DbLessonSection[]> => {
  try {
    const result = await sql`
      SELECT id, lesson_id, position, template, content
      FROM lesson_sections
      WHERE lesson_id = ${lessonId}
      ORDER BY position ASC
    `;
    return (result as any[]).map((row) => ({
      id: row.id,
      lessonId: row.lesson_id,
      position: row.position,
      template: row.template,
      content: row.content,
    }));
  } catch (error) {
    console.error('getLessonSections error:', error);
    return [];
  }
});
```

**Step 2: Do NOT commit yet** — TS errors exist until Tasks 3 and 4 are done.

---

## Task 3: Update CodeLessonLayout — replace sections with content + new ProsePane

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Context:**
- Currently imports `LessonSections` and `DbLessonSection`, receives `sections: DbLessonSection[]`, renders a ProsePane with `<h1>` header + `<LessonSections sections={sections} />`
- After: receives `content: string`, renders `<Markdown content={content} />` in a scrollable div
- `Markdown` component is at `@/components/shared/markdown`, takes `{ content: string }` prop
- The `<h1>{lessonTitle}</h1>` header is removed from ProsePane — lesson title already appears in the top header bar
- `motion` package will be uninstalled in Task 7; removing its import here is required first (it's in `lesson-sections.tsx` which gets deleted in Task 6, but `code-lesson-layout.tsx` may be importing via `lesson-sections.tsx`)

**Step 1: Replace the two section-related imports at the top**

Remove these two lines:
```typescript
import { LessonSections } from '@/components/lesson/lesson-sections';
import type { DbLessonSection } from '@/lib/data';
```

Add this import (after the existing imports):
```typescript
import { Markdown } from '@/components/shared/markdown';
```

**Step 2: Update the props interface**

In the `CodeLessonLayoutProps` interface, replace:
```typescript
  introContent: unknown | null;
  sections: DbLessonSection[];
  outroContent: unknown | null;
```
with:
```typescript
  introContent: unknown | null;
  content: string;
  outroContent: unknown | null;
```

**Step 3: Update the destructured props**

In the `CodeLessonLayout` function signature, replace `sections` with `content`:
```typescript
export function CodeLessonLayout({
  lessonTitle,
  introContent,
  content,       // ← was: sections
  outroContent,
  ...
```

**Step 4: Replace the ProsePane constant**

Find this block (around line 241–250):
```typescript
  // ─── Prose Pane ─────────────────────────────────────────────────────────────
  const ProsePane = (
    <div className="h-full relative overflow-hidden flex flex-col">
      <div className="shrink-0 px-8 pt-8 pb-4 border-b border-border/30">
        <h1 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight leading-tight text-foreground">
          {lessonTitle}
        </h1>
      </div>
      <LessonSections sections={sections} />
    </div>
  );
```

Replace with:
```typescript
  // ─── Prose Pane ─────────────────────────────────────────────────────────────
  const ProsePane = (
    <div className="h-full overflow-y-auto px-8 py-6">
      <Markdown content={content} />
    </div>
  );
```

**Step 5: Do NOT commit yet** — wait for Task 4 to fix the lesson page TS errors too.

---

## Task 4: Update lesson page — remove getLessonSections, pass content

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`

**Context:**
- Currently calls `getLessonSections(lessonData.id)` on line 31 and passes `sections={sections}` to `CodeLessonLayout`
- `lessonData.content` is already available (returned by `getLesson()`) — just needs to be passed through

**Step 1: Remove getLessonSections from the import**

Find:
```typescript
import { getLesson, getModule, getLessonCount, getUserCode, getLessonSections } from '@/lib/data';
```

Replace with:
```typescript
import { getLesson, getModule, getLessonCount, getUserCode } from '@/lib/data';
```

**Step 2: Remove the getLessonSections call**

Find and delete:
```typescript
  const sections = await getLessonSections(lessonData.id);
```

**Step 3: Update the CodeLessonLayout JSX**

Replace:
```typescript
      introContent={lessonData.introContent}
      sections={sections}
      outroContent={lessonData.outroContent}
```

With:
```typescript
      introContent={lessonData.introContent}
      content={lessonData.content}
      outroContent={lessonData.outroContent}
```

**Step 4: TypeScript check — confirm zero errors**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors. If errors remain, they will be about `lesson-sections.tsx` importing `TemplateName` from schemas — those resolve in Task 6.

**Step 5: Commit Tasks 2 + 3 + 4 together**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/lib/data.ts \
        'app/src/components/lesson/code-lesson-layout.tsx' \
        'app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx'
git commit -m "feat: replace lesson sections with flat Markdown content in ProsePane"
```

---

## Task 5: Remove section templates from the template registry

**Files:**
- Modify: `app/src/components/templates/index.tsx`

**Context:**
- `index.tsx` imports and registers 9 templates. We remove the 3 section templates (`code-section`, `prose-section`, `challenge-section`) and keep the 6 intro/outro templates.
- The `TemplateComponentMap` type is keyed on `TemplateName` — after removing the section schemas from `schemas.ts` (Task 6), this type will automatically narrow. Do this update now so the registry is clean before the schema change.

**Step 1: Remove the three section imports**

Remove these three lines from `app/src/components/templates/index.tsx`:
```typescript
import { CodeSectionTemplate } from './code-section';
import { ProseSectionTemplate } from './prose-section';
import { ChallengeSectionTemplate } from './challenge-section';
```

**Step 2: Remove the three section entries from templateComponents**

Remove these three lines from the `templateComponents` object:
```typescript
  'code-section':       CodeSectionTemplate,
  'prose-section':      ProseSectionTemplate,
  'challenge-section':  ChallengeSectionTemplate, // sentinel — LessonSections handles challenge specially
```

The final `templateComponents` object should be:
```typescript
export const templateComponents: TemplateComponentMap = {
  'lesson-intro':  LessonIntroTemplate,
  'lesson-outro':  LessonOutroTemplate,
  'module-intro':  ModuleIntroTemplate,
  'module-outro':  ModuleOutroTemplate,
  'course-intro':  CourseIntroTemplate,
  'course-outro':  CourseOutroTemplate,
};
```

**Step 3: Do NOT commit yet** — TS will error until schemas.ts is updated in Task 6.

---

## Task 6: Delete section template files and update schemas.ts

**Files:**
- Delete: `app/src/components/lesson/lesson-sections.tsx`
- Delete: `app/src/components/templates/code-section.tsx`
- Delete: `app/src/components/templates/prose-section.tsx`
- Delete: `app/src/components/templates/challenge-section.tsx`
- Modify: `app/src/lib/templates/schemas.ts`

**Context:**
- `validate.ts`, `types.ts`, and `json-schema.ts` in `app/src/lib/templates/` all **stay** — they're used by the remaining intro/outro templates in the seed script and overlay.
- `schemas.ts` currently has 9 template definitions. Remove the 3 section schemas, keep the 6 intro/outro schemas.

**Step 1: Delete the four component files**

```bash
rm app/src/components/lesson/lesson-sections.tsx
rm app/src/components/templates/code-section.tsx
rm app/src/components/templates/prose-section.tsx
rm app/src/components/templates/challenge-section.tsx
```

**Step 2: Remove section schemas from schemas.ts**

In `app/src/lib/templates/schemas.ts`, remove this entire block (lines 33–65):

```typescript
  // ── Lesson sections ───────────────────────────────────────────────────────
  'code-section': z.object({
    explanation: z
      .string()
      .min(1)
      .describe('Prose explanation of the concept, shown before the code. 2–4 sentences.'),
    code: z
      .string()
      .min(1)
      .describe('Python code example. Should be complete and runnable.'),
    language: z
      .string()
      .default('python')
      .describe('Language identifier for syntax highlighting. Default: python.'),
    takeaway: z
      .string()
      .optional()
      .describe('One-sentence summary of what the learner should remember.'),
  }),

  'prose-section': z.object({
    markdown: z
      .string()
      .min(1)
      .describe('Markdown content for a text-only section.'),
  }),

  'challenge-section': z.object({
    // challenge-section has no JSONB content — it renders from the lesson's
    // existing problem_summary, problem_constraints, problem_hints fields.
    // This schema is a sentinel so the template registry stays complete.
    _type: z.literal('challenge').default('challenge'),
  }),
```

**Step 3: TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 4: Commit Tasks 5 + 6 together**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add -A
git commit -m "refactor: remove lesson_sections template system (code-section, prose-section, challenge-section)"
```

---

## Task 7: Update seed-content.ts — remove lesson_sections inserts

**Files:**
- Modify: `app/scripts/seed-content.ts`

**Context:**
- The seed script currently calls `assertValidContent('code-section', ...)` and inserts into `lesson_sections` for every lesson. These calls must be removed.
- `assertValidContent` calls for `lesson-intro`, `lesson-outro`, `module-intro`, `module-outro`, `course-intro` **stay** — they populate intro/outro JSONB columns on lessons/modules/courses.
- The `lesson_sections` table no longer exists after Task 1's migration, so these inserts would fail at runtime.

**Step 1: Find and remove all lesson_sections-related code in seed-content.ts**

Search for every block matching this pattern and delete it (there are ~12 such blocks across all lessons):

```typescript
  const lesson0Section0 = assertValidContent('code-section', {
    explanation: '...',
    code: '...',
    language: 'python',
    takeaway: '...',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (
      ${'ls-...-0'},
      ${lessonXId},
      ${0},
      'code-section',
      ${JSON.stringify(lessonXSection0)}
    )
    ON CONFLICT (lesson_id, position) DO UPDATE
      SET template = EXCLUDED.template,
          content  = EXCLUDED.content
  `;
```

Also remove the `console.log('  seeded lesson_sections...')` lines.

**Step 2: Verify assertValidContent for section templates is gone**

```bash
grep -n "code-section\|prose-section\|challenge-section\|lesson_sections" app/scripts/seed-content.ts
```

Expected: zero results.

**Step 3: TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 4: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/scripts/seed-content.ts
git commit -m "feat: remove lesson_sections inserts from seed script"
```

---

## Task 8: Uninstall motion package

**Files:**
- Modify: `app/package.json`, `app/package-lock.json` (via npm)

**Context:**
- `motion` (Framer Motion) was only used in `lesson-sections.tsx` which is now deleted.
- Confirm no remaining imports before uninstalling.

**Step 1: Verify no remaining motion imports**

```bash
grep -rn "from 'motion" app/src --include="*.tsx" --include="*.ts"
```

Expected: zero results. If any remain, remove them before proceeding.

**Step 2: Uninstall motion**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npm uninstall motion
```

Expected: `removed N packages` with no errors.

**Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 4: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/package.json app/package-lock.json
git commit -m "chore: uninstall motion (lesson-sections removed)"
```

---

## Task 9: Final verification

**No file changes — verification only.**

**Step 1: Full TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 2: Verify no orphan imports**

```bash
grep -rn "lesson-sections\|DbLessonSection\|getLessonSections\|lesson_sections\|code-section\|prose-section\|challenge-section" app/src --include="*.tsx" --include="*.ts"
```

Expected: zero results.

**Step 3: Dev server smoke test**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npm run dev
```

Navigate to any lesson (e.g. `/dashboard/course/python/hello-world/lesson/1`) and verify:
- [ ] Prose pane renders the lesson's markdown content as a continuous scroll
- [ ] No `<h1>` title bar above the content (lesson title is in the top header bar)
- [ ] GFM elements render correctly (code blocks, lists, bold, links)
- [ ] Lesson overlay (intro screen before lesson) still shows on first visit
- [ ] Outro overlay appears after passing all tests
- [ ] No console errors

**Step 4: Final commit if any fixes were needed**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add -A
git commit -m "feat: flat markdown lesson content complete"
```
