# Lesson + Editor Pane Redesign — Design Document

## Overview

Restructure the lesson player so theory and code challenge are cleanly separated: the **lesson pane** is purely theory, the **editor pane** always shows the problem statement above the editor. Extend this to include structured module intro/outro schemas and new course-level onboarding + completion forms.

---

## Section 1: Lesson Pane — Theory Only

**Goal:** Remove the challenge/problem panel from the lesson pane. The lesson pane shows only theory content in a clean continuous scroll.

**Content order:**
1. `intro_content` (if present)
2. Section blocks (ordered by `position`)
3. `outro_content` (if present)

No problem summary, constraints, or hints in the lesson pane. The `ProblemPanel` component is moved entirely to the editor pane.

**Changes:**
- `LessonSections` component: remove `problemSummary`, `problemConstraints`, `problemHints`, `testCases`, `entryPoint` props
- `CodeLessonLayout`: stop passing problem props to `LessonSections`

---

## Section 2: Editor Pane — Problem Panel Pinned Above Editor

**Goal:** The code challenge is always visible while coding. No toggling, no tabs.

**Editor pane layout (top to bottom):**
```
┌──────────────────────────────────┐
│  PROBLEM PANEL (max-h ~40%,      │
│  overflow-y-auto)                │
│  • Challenge statement           │
│  • Constraints (collapsible)     │
│  • Hints (collapsible)           │
├──────────────────────────────────┤
│  EDITOR TOOLBAR (h-9, shrink-0)  │
├──────────────────────────────────┤
│  CODE EDITOR (flex-1)            │
├──────────────────────────────────┤
│  OUTPUT PANEL                    │
└──────────────────────────────────┘
```

**Behavior:**
- If `problemSummary` is null (theory-only lesson): problem panel is hidden, editor fills the space
- Constraints expand/collapse inline with a chevron toggle
- Hints expand/collapse inline with a chevron toggle (collapsed by default)

**Changes:**
- `CodeLessonLayout`: move `ProblemPanel` into the code pane, above the editor
- `ProblemPanel`: add collapsible sections for constraints and hints, remove the current accordion if any

---

## Section 3: Module Intro/Outro — Structured Schema

**Goal:** Replace freeform `unknown` JSONB with typed Zod schemas and dedicated templates.

### Module Intro Schema

```ts
// TemplateName: 'module-intro'
{
  headline: string          // e.g. "What you'll learn in this module"
  body: string              // markdown prose (1–3 paragraphs)
  objectives: string[]      // 2–5 bullet points
}
```

### Module Outro Schema

```ts
// TemplateName: 'module-outro'
{
  headline: string          // e.g. "Module complete!"
  body: string              // markdown prose — reflection / recap
  nextPreview?: string      // optional teaser for next module
}
```

**Changes:**
- `app/src/lib/templates/schemas.ts`: add `module-intro` and `module-outro` Zod schemas
- `app/src/components/templates/`: add `ModuleIntroTemplate` and `ModuleOutroTemplate` components
- DB columns (`modules.intro_content`, `modules.outro_content`) stay JSONB — no migration needed unless existing data needs transforming

---

## Section 4: Course-Level Forms

**Goal:** Two MCQ forms per course — onboarding (before starting) and completion (after finishing). No passing score.

### DB Schema

New column on `courses` table:
```sql
ALTER TABLE courses ADD COLUMN onboarding_form JSONB;
ALTER TABLE courses ADD COLUMN completion_form JSONB;
```

New table for responses:
```sql
CREATE TABLE user_course_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('onboarding', 'completion')),
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id, form_type)
);
```

### Form JSON Shape

Both `onboarding_form` and `completion_form` share this structure:
```ts
{
  title: string
  questions: {
    id: string
    statement: string
    options: { id: string; text: string }[]
  }[]
  // No passingScore — purely informational
}
```

### UX Flow

**Onboarding form:**
- Shown on the course overview page (`/dashboard/course/[courseSlug]`)
- Condition: `course.onboarding_form` exists AND user has not submitted it
- Replaces the "Start Course" CTA with the form inline
- On submit: store response → show "Start Course" CTA

**Completion form:**
- Shown after all modules + quizzes are complete
- Condition: `course.completion_form` exists AND user has not submitted it
- Shown inline on the course overview page where "Course complete" state normally appears
- On submit: store response → show "Course complete" state

### API Routes

```
POST /api/course/form-response   → { courseId, formType, responses }
GET  /api/course/form-response?courseId=&formType=   → { submitted: bool }
```

---

## Files Affected

| File | Change |
|------|--------|
| `app/src/components/lesson/lesson-sections.tsx` | Remove problem panel props and rendering |
| `app/src/components/lesson/code-lesson-layout.tsx` | Move ProblemPanel into code pane; wire problem panel above editor |
| `app/src/components/lesson/problem-panel.tsx` | Add collapsible constraints + hints |
| `app/src/lib/templates/schemas.ts` | Add module-intro, module-outro schemas |
| `app/src/components/templates/module-intro.tsx` | New template component |
| `app/src/components/templates/module-outro.tsx` | New template component |
| `app/src/components/templates/index.ts` | Register new templates |
| `app/migrations/NNNN_course_forms.sql` | Add onboarding_form, completion_form columns + user_course_form_responses table |
| `app/src/lib/data.ts` | Add getCourseFormResponse(), submitCourseFormResponse() |
| `app/src/app/api/course/form-response/route.ts` | New API route |
| `app/src/app/dashboard/course/[courseSlug]/page.tsx` | Show onboarding/completion forms |
