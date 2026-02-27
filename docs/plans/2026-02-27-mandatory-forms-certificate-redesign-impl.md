# Mandatory Forms + Certificate Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Gate module/lesson/quiz pages behind the onboarding survey, gate the certificate page behind the completion survey, add a mandatory callout to the Welcome page form, and redesign the certificate as a bold dark vertical card.

**Architecture:** Server-side `redirect()` in three route pages (module overview, lesson, quiz) checks `getCourseConfidenceResponses` — already `React.cache()`-wrapped so zero extra cost when called multiple times in the same request. Certificate page adds a completion gate redirect. Welcome page gets an amber mandatory callout wrapper around the existing `OnboardingFormWrapper`. `CourseCertificate` component is fully rewritten with inline styles (required for `html2canvas` reliability) using dark/gold palette, portrait orientation.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, html2canvas, jsPDF.

---

## Task 1: Gate module overview page with onboarding check

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`

### Context

The module overview page already calls `getCourseWithModules(courseSlug)` which returns a `course` object including `course.id` and `course.confidence_form`. We need to add `getCourseConfidenceResponses` to check if the user has completed the onboarding survey, and redirect to the Welcome page if not.

Currently the page has two sequential DB calls:
1. `const [course, mod] = await Promise.all([getCourseWithModules, getModule])`
2. `const lessonsMap = await getLessonsForCourse([mod.id])`
3. `const completionStatus = user?.id ? await getSectionCompletionStatus(...) : {}`

We'll collapse steps 2+3 into one `Promise.all` and add the confidence check in parallel.

### Step 1: Add imports

Find the current data import block:
```typescript
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
  type SectionStatus,
} from '@/lib/data';
```

Replace with:
```typescript
import { redirect } from 'next/navigation';
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
```

(`redirect` goes at the top with the other next/navigation imports — currently `notFound` is imported from there, so add `redirect` to that import.)

Actually the current import is:
```typescript
import { notFound } from 'next/navigation';
```

Change to:
```typescript
import { notFound, redirect } from 'next/navigation';
```

### Step 2: Replace the two sequential fetches with one parallel fetch + gate

Find these two blocks (lines ~34-39):
```typescript
  const lessonsMap = await getLessonsForCourse([mod.id]);
  const lessons = lessonsMap[mod.id] ?? [];

  const completionStatus = user?.id
    ? await getSectionCompletionStatus(user.id, [mod])
    : ({} as Record<string, SectionStatus>);
```

Replace with:
```typescript
  const [lessonsMap, completionStatus, confidenceResponses] = await Promise.all([
    getLessonsForCourse([mod.id]),
    user?.id
      ? getSectionCompletionStatus(user.id, [mod])
      : Promise.resolve({} as Record<string, SectionStatus>),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  const lessons = lessonsMap[mod.id] ?? [];
```

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit 2>&1
```

Expected: zero errors.

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx'
git commit -m "feat: gate module overview behind onboarding survey"
```

---

## Task 2: Gate lesson page with onboarding check

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`

### Context

The lesson page currently does NOT fetch course data — it only fetches `getModule`, `getLesson`, `getLessonCount`, `getUserCode`. We need to add `getCourseWithModules` to get `course.confidence_form` and `course.id`, then check confidence responses in parallel with the lesson fetch.

### Step 1: Add imports

Find:
```typescript
import { getLesson, getModule, getLessonCount, getUserCode } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
```

Replace with:
```typescript
import { getLesson, getModule, getLessonCount, getUserCode, getCourseWithModules, getCourseConfidenceResponses } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
```

### Step 2: Add course fetch + confidence gate

Find:
```typescript
  const module = await getModule(moduleSlug);
  if (!module) notFound();

  const [lessonData, lessonCount] = await Promise.all([
    getLesson(module.id, position),
    getLessonCount(module.id),
  ]);
```

Replace with:
```typescript
  const [module, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);
  if (!module || !course) notFound();

  const [lessonData, lessonCount, confidenceResponses] = await Promise.all([
    getLesson(module.id, position),
    getLessonCount(module.id),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }
```

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit 2>&1
```

Expected: zero errors.

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx'
git commit -m "feat: gate lesson page behind onboarding survey"
```

---

## Task 3: Gate quiz page with onboarding check

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`

### Context

The quiz page currently fetches only `getModule(moduleSlug)`. We need to add `getCourseWithModules` (parallel with `getModule`) and then check confidence responses.

### Step 1: Add imports

Find:
```typescript
import { getModule, isQuizCompleted, areAllLessonsCompleted, type QuizQuestion } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
```

Replace with:
```typescript
import { getModule, isQuizCompleted, areAllLessonsCompleted, getCourseWithModules, getCourseConfidenceResponses, type QuizQuestion } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
```

### Step 2: Fetch course in parallel + add gate

Find:
```typescript
  const mod = await getModule(moduleSlug);

  if (!mod || !mod.quiz_form) {
    notFound();
  }
```

Replace with:
```typescript
  const [mod, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);

  if (!mod || !mod.quiz_form || !course) {
    notFound();
  }

  if (course.confidence_form && user?.id) {
    const { onboarding } = await getCourseConfidenceResponses(user.id, course.id);
    if (onboarding === null) redirect(`/dashboard/course/${courseSlug}`);
  }
```

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit 2>&1
```

Expected: zero errors.

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx'
git commit -m "feat: gate quiz page behind onboarding survey"
```

---

## Task 4: Gate certificate page with completion check

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx`

### Context

The certificate page already fetches `confidenceResponses` and computes `isCompleted`. We just need to add a redirect after these are computed: if the course is complete but the completion survey hasn't been submitted, redirect to the graduation page where the form lives.

### Step 1: Add `redirect` import

Find:
```typescript
import { notFound } from 'next/navigation';
```

Replace with:
```typescript
import { notFound, redirect } from 'next/navigation';
```

### Step 2: Add completion gate redirect

Find (after `const isCompleted = totalItems > 0 && completedItems === totalItems;`):
```typescript
  const bothSubmitted =
    confidenceResponses.onboarding !== null &&
    confidenceResponses.completion !== null;
```

Insert between those two lines:
```typescript
  if (isCompleted && course.confidence_form && confidenceResponses.completion === null) {
    redirect(`/dashboard/course/${courseSlug}/graduation`);
  }
```

So the result looks like:
```typescript
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  if (isCompleted && course.confidence_form && confidenceResponses.completion === null) {
    redirect(`/dashboard/course/${courseSlug}/graduation`);
  }

  const bothSubmitted =
    confidenceResponses.onboarding !== null &&
    confidenceResponses.completion !== null;
```

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit 2>&1
```

Expected: zero errors.

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx'
git commit -m "feat: gate certificate behind completion survey"
```

---

## Task 5: Mandatory callout on Welcome page

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

### Context

The Welcome page currently shows the `OnboardingFormWrapper` inline with no visual emphasis. We want to wrap it in an amber/warning callout to make it stand out as mandatory. The submitted badge (shown after submission) stays as-is.

### Step 1: Replace the OnboardingFormWrapper render

Find the onboarding survey block:
```typescript
        {/* ─── Onboarding survey ──────────────────────────────── */}
        {user && course.confidence_form && (
          onboardingSubmitted ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
              <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-success/70 font-mono">Pre-course survey completed</span>
            </div>
          ) : (
            <OnboardingFormWrapper courseId={course.id} form={course.confidence_form} />
          )
        )}
```

Replace with:
```typescript
        {/* ─── Onboarding survey ──────────────────────────────── */}
        {user && course.confidence_form && (
          onboardingSubmitted ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
              <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-success/70 font-mono">Pre-course survey completed</span>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs font-mono font-semibold text-warning uppercase tracking-wider">
                  Required before starting
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Complete this survey before accessing any lessons.
              </p>
              <OnboardingFormWrapper courseId={course.id} form={course.confidence_form} />
            </div>
          )
        )}
```

### Step 2: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit 2>&1
```

Expected: zero errors.

### Step 3: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/page.tsx'
git commit -m "feat: add mandatory callout to onboarding survey on Welcome page"
```

---

## Task 6: Certificate visual redesign

**Files:**
- Modify: `app/src/components/dashboard/course-certificate.tsx`

### Context

The current certificate is a plain light-themed horizontal card. We're replacing it with a bold dark-themed portrait card (600×800px, 3:4 ratio) using:
- Dark background `#0f0f0f`
- Gold accent color `#c9a84c`
- Warm off-white text `#f5f0e8`
- `Playfair Display` (`var(--font-display)`) for the student name
- Double gold rules at top and bottom
- Portrait jsPDF orientation

Inline styles are used throughout the captured div (instead of Tailwind classes) because `html2canvas` reads computed styles and inline styles are the most reliable approach. The download button outside the certRef still uses Tailwind.

### Step 1: Replace the entire file content

```typescript
'use client';

import { useRef } from 'react';

interface CourseCertificateProps {
  studentName: string;
  courseTitle: string;
  completionDate: string;
}

export function CourseCertificate({
  studentName,
  courseTitle,
  completionDate,
}: CourseCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!certRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${courseTitle.replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`);
  };

  const gold = '#c9a84c';
  const bg = '#0f0f0f';
  const textPrimary = '#f5f0e8';
  const textMuted = 'rgba(245, 240, 232, 0.45)';

  return (
    <div className="space-y-4">
      {/* Wrapper centres the fixed-width card */}
      <div className="flex justify-center">
        {/* Certificate card — captured by html2canvas */}
        <div
          ref={certRef}
          style={{
            width: 600,
            height: 800,
            backgroundColor: bg,
            color: textPrimary,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 64px',
            boxSizing: 'border-box',
            borderRadius: 16,
            border: `1px solid rgba(201, 168, 76, 0.2)`,
          }}
        >
          {/* Top double rule */}
          <div style={{ width: '100%', marginBottom: 24 }}>
            <div style={{ height: 3, backgroundColor: gold, borderRadius: 2, marginBottom: 4 }} />
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.35, borderRadius: 1 }} />
          </div>

          {/* Brand row */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.28em', color: gold, textTransform: 'uppercase' }}>
              zuzu.codes
            </span>
            <span style={{ color: gold, fontSize: 18, lineHeight: 1 }}>★</span>
          </div>

          {/* Lower top rule */}
          <div style={{ width: '100%', marginBottom: 56 }}>
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.35, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.15, borderRadius: 1 }} />
          </div>

          {/* "Certificate of Completion" label */}
          <p style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.3em', color: gold, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
            Certificate of Completion
          </p>

          {/* Short gold rule */}
          <div style={{ width: 64, height: 1, backgroundColor: gold, opacity: 0.5, marginBottom: 40 }} />

          {/* "This certifies that" */}
          <p style={{ fontSize: 12, color: textMuted, marginBottom: 20, fontStyle: 'italic', textAlign: 'center' }}>
            This certifies that
          </p>

          {/* Student name — Playfair Display */}
          <p style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 34, fontWeight: 600, color: gold, marginBottom: 24, textAlign: 'center', lineHeight: 1.2 }}>
            {studentName}
          </p>

          {/* "has successfully completed" */}
          <p style={{ fontSize: 12, color: textMuted, marginBottom: 20, textAlign: 'center' }}>
            has successfully completed
          </p>

          {/* Course title */}
          <p style={{ fontSize: 20, fontWeight: 600, color: textPrimary, marginBottom: 40, textAlign: 'center', lineHeight: 1.35, maxWidth: 400 }}>
            {courseTitle}
          </p>

          {/* Completion date */}
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: textMuted, textAlign: 'center' }}>
            {completionDate}
          </p>

          {/* Spacer to push footer down */}
          <div style={{ flex: 1 }} />

          {/* Bottom double rule */}
          <div style={{ width: '100%', marginBottom: 16 }}>
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.35, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ height: 3, backgroundColor: gold, borderRadius: 2 }} />
          </div>

          {/* Footer */}
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: textMuted, letterSpacing: '0.12em', textAlign: 'center' }}>
            zuzu.codes © 2026
          </p>
        </div>
      </div>

      {/* Download button — outside certRef, not captured in PDF */}
      <button
        onClick={handleDownload}
        className="w-full h-9 rounded-lg border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Download Certificate →
      </button>
    </div>
  );
}
```

### Step 2: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit 2>&1
```

Expected: zero errors.

### Step 3: Self-review checklist

- [ ] Certificate card is 600×800px
- [ ] Background is dark (`#0f0f0f`)
- [ ] Gold double rules at top and bottom
- [ ] Student name uses `var(--font-display)` (Playfair Display)
- [ ] jsPDF uses `orientation: 'portrait'`
- [ ] Download button is outside certRef

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/dashboard/course-certificate.tsx
git commit -m "feat: redesign certificate as dark portrait card with gold accents"
```
