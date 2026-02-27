# Course Player Enhancements Design

## Overview

Four parallel improvements to the course player:
1. Bug fixes — sidebar staleness, icon jitter, active+completed state conflict
2. Quiz upsert — same single-row pattern as `user_code`
3. Lesson player tweaks — remove footer, add stats bar, review mode pill, module/quiz celebration
4. Confidence form + report card + certificate — onboarding/offboarding confidence tracking with downloadable PDF

---

## Section 1 — Bug Fixes (Sidebar Progress + Lesson Icon)

### Bug 1 — Icon size jitter

`CircleDot` (active state) renders at `h-3.5 w-3.5` (14px) while the 3-state dots render at `h-3 w-3` (12px). The 2px size change on navigation causes a layout shift.

**Fix:** Standardise all lesson icons to `h-3.5 w-3.5`. Update the three `div` dot elements to match.

### Bug 2 — Active state swallows completion status

When a user is ON a completed lesson, `isActive` takes priority and renders `CircleDot` in `text-primary`, losing the green completion signal.

**Fix:** For `isActive && isCompleted`, render `CircleDot` in `text-success` instead of `text-primary`. The row background/text styles stay primary-tinted (active highlight), but the icon reflects completion.

```tsx
{isActive ? (
  <CircleDot className={cn("h-3.5 w-3.5 shrink-0", isCompleted ? "text-success" : "text-primary")} />
) : item.type === "quiz" ? (
  ...
```

### Bug 3 — Stale sidebar after lesson/quiz pass (root cause)

`dashboard/layout.tsx` is a persistent Server Component in Next.js App Router. It fetches `contentCompletion` once and does **not re-fetch** on client-side navigation within `/dashboard/**`. After a lesson or quiz passes, the sidebar shows stale 3-state dots until a hard reload.

**Fix:** Call `router.refresh()` from two places:

- `code-lesson-layout.tsx` — immediately after `testResult.allPassed` (alongside confetti)
- `quiz-player.tsx` — immediately after `result.passed` (alongside confetti)

`router.refresh()` signals Next.js to re-execute the persistent layout RSC with fresh DB data. No page reload needed.

```ts
// code-lesson-layout.tsx (on allPassed)
router.refresh();
confetti({ ... });
viewTimerRef.current = setTimeout(() => setView('outro'), 1800);

// quiz-player.tsx (on result.passed)
router.refresh();
confetti({ ... });
```

---

## Section 2 — Quiz Upsert

`user_quiz_attempts` currently inserts a new row per submission, accumulating history. Change to the same single-row upsert pattern as `user_code`.

### Migration

```sql
-- 1. Keep only latest attempt per user+module, delete duplicates
DELETE FROM user_quiz_attempts a
USING user_quiz_attempts b
WHERE a.user_id = b.user_id
  AND a.module_id = b.module_id
  AND a.attempted_at < b.attempted_at;

-- 2. Add unique constraint
ALTER TABLE user_quiz_attempts
  ADD CONSTRAINT uqa_user_module_unique UNIQUE (user_id, module_id);
```

### API change (`/api/quiz/submit` POST)

```ts
// Before: INSERT (appends a row)
await sql`INSERT INTO user_quiz_attempts (...) VALUES (...)`;

// After: upsert (one row per user+module)
await sql`
  INSERT INTO user_quiz_attempts (user_id, module_id, score_percent, passed, answers, attempted_at)
  VALUES (${userId}, ${moduleId}, ${score}, ${passed}, ${JSON.stringify(answers)}::JSONB, NOW())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    score_percent = EXCLUDED.score_percent,
    passed        = EXCLUDED.passed,
    answers       = EXCLUDED.answers,
    attempted_at  = EXCLUDED.attempted_at
`;
```

`getDashboardStats` quiz average simplifies — no dedup needed, one row per module.

---

## Section 3 — Lesson Player Tweaks

### 3a — Remove "wrap up →" footer

Delete the `<footer>` element in `code-lesson-layout.tsx` (the `h-11` bar with "wrap up →"). The outro overlay is reached only via the sidebar or outro-driven navigation. The rate-limit stats bar already exists in `dashboard/layout.tsx` footer — no replacement needed inside the lesson layout.

### 3b — Review mode pill

In `code-lesson-layout.tsx` header, when `isCompleted`:

Replace the current `w-4 h-4 checkmark` with a compact pill:

```tsx
{isCompleted && (
  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/70 ring-1 ring-success/20">
    completed
  </span>
)}
```

Positioned inline with the lesson title in the header breadcrumb area.

### 3c — Module + quiz pass celebration

**Quiz pass:** Fire confetti in `quiz-player.tsx` when `result.passed === true`, immediately after the submit response resolves. Same `canvas-confetti` call as lesson pass.

**Module completion:** On quiz pass where `allLessonsCompleted` is already true (the quiz page already checks this), fire a second confetti burst with a wider spread to signal module completion:

```ts
// Standard quiz pass burst
confetti({ particleCount: 80, spread: 70, origin: { x: 0.5, y: 1 } });

// Module completion — wider, dual-origin burst (300ms later)
setTimeout(() => {
  confetti({ particleCount: 60, spread: 100, origin: { x: 0.2, y: 0.8 } });
  confetti({ particleCount: 60, spread: 100, origin: { x: 0.8, y: 0.8 } });
}, 300);
```

The `isAlreadyPassed` prop already signals prior completion — the dual burst only fires on first-time quiz pass (i.e. `!isAlreadyPassed`).

---

## Section 4 — Confidence Form + Report Card + Certificate

### 4a — `ConfidenceForm` schema

New type in `data.ts` (replaces `CourseForm`):

```ts
export interface ConfidenceQuestion {
  id: string;       // e.g. "q1"
  statement: string; // e.g. "How confident are you writing Python functions?"
}

export interface ConfidenceForm {
  title: string;
  questions: ConfidenceQuestion[]; // min 1
  // no options — Likert 1–5 is a schema constant
}
```

Likert scale: `1` = Not confident → `5` = Very confident. Fixed, not stored in the form.

### 4b — DB changes

```sql
-- Drop old MCQ form columns, add single confidence_form column
ALTER TABLE courses
  DROP COLUMN IF EXISTS onboarding_form,
  DROP COLUMN IF EXISTS completion_form,
  ADD COLUMN confidence_form JSONB NOT NULL;

-- CHECK constraint (strict schema enforcement)
ALTER TABLE courses ADD CONSTRAINT courses_confidence_form_check CHECK (
  confidence_form ? 'title'
  AND confidence_form ? 'questions'
  AND jsonb_typeof(confidence_form->'questions') = 'array'
  AND jsonb_array_length(confidence_form->'questions') >= 1
);
```

`user_course_form_responses` — no column changes. `form_type: 'onboarding' | 'completion'` distinguishes the two submissions. `responses` JSONB stores `{ "q1": 3, "q2": 4 }` (integer values 1–5).

New data function:

```ts
export async function getCourseConfidenceResponses(
  userId: string,
  courseId: string,
): Promise<{ onboarding: Record<string, number> | null; completion: Record<string, number> | null }> {
  const rows = await sql`
    SELECT form_type, responses
    FROM user_course_form_responses
    WHERE user_id = ${userId} AND course_id = ${courseId}
  `;
  const onboarding = rows.find(r => r.form_type === 'onboarding')?.responses ?? null;
  const completion = rows.find(r => r.form_type === 'completion')?.responses ?? null;
  return { onboarding, completion };
}
```

### 4c — Course overview page states

```
not started + onboarding not submitted  → <ConfidenceFormCard type="onboarding" />
in progress (onboarding submitted)      → progress bar + Continue CTA
completed + completion not submitted    → <ConfidenceFormCard type="completion" />
completed + both submitted              → <ReportCard /> + <CertificateDownload />
```

`getCourseConfidenceResponses` replaces the two separate `getCourseFormResponse` boolean checks.

### 4d — Confidence form UI (`ConfidenceFormCard`)

```
Before you begin — rate your confidence in each area   ← onboarding framing
────────────────────────────────────────────────────
Writing Python functions
  [1] [2] [3] [4] [5]
  Not confident         Very confident

List comprehensions
  [1] [2] [3] [4] [5]
  ...

                         [ Submit → ]
```

- 5 circle buttons per question, labels only at 1 and 5
- Submit activates once all questions answered
- Submits via Server Action to `submitCourseFormResponse`

### 4e — Report card (`ReportCard`)

```
Your confidence growth · Python Fundamentals
─────────────────────────────────────────────
Writing Python functions    ●○○○○ → ●●●●○  +3
List comprehensions         ●●○○○ → ●●●●●  +3
Working with dicts          ●○○○○ → ●●●○○  +2
─────────────────────────────────────────────
Average improvement         +2.7 pts
```

- Pure CSS dot rows — no chart library
- Before dots: `bg-muted-foreground/30`
- After dots: `bg-success/70`
- Delta badge: `+N` in success tint, `=` in muted for no change

### 4f — Certificate (`CourseCertificate`)

Client-side PDF generation: `html2canvas` + `jspdf` (two new packages).

Certificate content (white card, A4 landscape):
- zuzu.codes logo (top-left)
- "Certificate of Completion" (label-mono)
- Student name (large, `font-display`)
- "has successfully completed"
- Course title (largest, `font-display`)
- Completion date (formatted)
- Decorative border

A `ref` on the certificate `div` is passed to a `handleDownload` function:

```ts
const handleDownload = async () => {
  const canvas = await html2canvas(certRef.current, { scale: 2 });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`${courseTitle}-certificate.pdf`);
};
```

Certificate `div` is visually rendered on the page (below the report card). The "Download Certificate →" button is outside the `div` (not captured in PDF).

---

## Files Affected

| File | Change |
|------|--------|
| `app/src/components/shared/app-sidebar.tsx` | Bug 1 + Bug 2: icon size + active+completed colour |
| `app/src/components/lesson/code-lesson-layout.tsx` | Bug 3: `router.refresh()` on pass; remove footer; review pill |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx` | Bug 3: `router.refresh()` on pass; confetti on pass + module completion |
| `app/src/app/api/quiz/submit/route.ts` | Section 2: INSERT → upsert |
| `app/migrations/` | Section 2: quiz unique constraint; Section 4: confidence_form column + CHECK |
| `app/src/lib/data.ts` | Section 4: `ConfidenceForm` type; `getCourseConfidenceResponses`; drop `CourseForm` |
| `app/src/app/dashboard/course/[courseSlug]/page.tsx` | Section 4: updated state machine; pass confidence responses |
| `app/src/components/dashboard/course-form-wrappers.tsx` | Section 4: replace MCQ form with Likert `ConfidenceFormCard` |
| `app/src/components/dashboard/report-card.tsx` | Section 4: new component |
| `app/src/components/dashboard/course-certificate.tsx` | Section 4: new component + download |
| `app/scripts/seed-content.ts` | Section 4: add `confidence_form` to every course |
| `app/scripts/validate-content.mjs` | Section 4: enforce `confidence_form` NOT NULL + valid schema |

No new API routes. Server Actions handle form submission (existing pattern).

---

## What Is NOT Changing

- Sidebar 3-state dots (already implemented)
- Module overview N/M text counter (already sufficient)
- Lesson header position/lessonCount progress (already sufficient)
- Lesson navigation (sidebar + outro overlay only)
- Quiz result screen score display (already shows latest score)
- Footer "wrap up →" → removed; platform stats footer in layout already exists
