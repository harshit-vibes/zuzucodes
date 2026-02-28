# Capstone Projects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add end-of-course capstone projects — a free-form Python script challenge using pre-installed libraries, with submit-for-review completion gating the final course sequence steps.

**Architecture:** New `capstones` table (one per course) + `user_capstone_submissions` table. Capstone appears as a terminal node in `buildCourseSequence()` inserted before `graduation`, locked until all modules complete. Dedicated player at `/dashboard/course/[courseSlug]/capstone` reuses `CodeEditor` + `runCode()` + `CoursePlayerShell`. Submission recorded via new API route; sidebar shows capstone item using extended `contentCompletion` map.

**Tech Stack:** Next.js 15 App Router, Neon PostgreSQL (raw SQL via `@neondatabase/serverless`), CodeMirror (`@uiw/react-codemirror`), Tailwind CSS v4, shadcn/ui.

---

## Task 1: DB Migration

**Files:**
- Create: `app/migrations/2026-03-01-capstones.sql`

**Step 1: Write the migration**

```sql
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
```

**Step 2: Apply to Neon**

Paste the SQL into the Neon console SQL editor and run it.
Expected: two new tables visible in the schema browser.

**Step 3: Commit**

```bash
git add app/migrations/2026-03-01-capstones.sql
git commit -m "feat: add capstones and user_capstone_submissions migration"
```

---

## Task 2: Data layer — types and queries

**Files:**
- Modify: `app/src/lib/data.ts`

### Step 1: Add `Capstone` and `CapstoneSubmission` types

Add after the existing type definitions (near the top of the file, around where `Module`, `LessonData` etc. are defined):

```typescript
export interface Capstone {
  id: string
  courseId: string
  title: string
  description: string | null
  starterCode: string | null
  requiredPackages: string[]
  hints: string[]
}

export interface CapstoneSubmission {
  userId: string
  capstoneId: string
  code: string
  output: string | null
  submittedAt: string
}
```

### Step 2: Add `getCapstone(courseId)`

```typescript
export const getCapstone = React.cache(async function getCapstone(
  courseId: string,
): Promise<Capstone | null> {
  const rows = await sql<{
    id: string
    course_id: string
    title: string
    description: string | null
    starter_code: string | null
    required_packages: string[]
    hints: string[]
  }[]>`
    SELECT id, course_id, title, description, starter_code, required_packages, hints
    FROM capstones
    WHERE course_id = ${courseId}
    LIMIT 1
  `
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    description: r.description,
    starterCode: r.starter_code,
    requiredPackages: r.required_packages ?? [],
    hints: r.hints ?? [],
  }
})
```

### Step 3: Add `getUserCapstoneSubmission(userId, capstoneId)`

```typescript
export const getUserCapstoneSubmission = React.cache(async function getUserCapstoneSubmission(
  userId: string,
  capstoneId: string,
): Promise<CapstoneSubmission | null> {
  const rows = await sql<{
    user_id: string
    capstone_id: string
    code: string
    output: string | null
    submitted_at: string
  }[]>`
    SELECT user_id, capstone_id, code, output, submitted_at
    FROM user_capstone_submissions
    WHERE user_id = ${userId} AND capstone_id = ${capstoneId}
    LIMIT 1
  `
  if (!rows[0]) return null
  const r = rows[0]
  return {
    userId: r.user_id,
    capstoneId: r.capstone_id,
    code: r.code,
    output: r.output,
    submittedAt: r.submitted_at,
  }
})
```

### Step 4: Add `areAllModulesComplete(userId, moduleIds)`

This checks every module has all lessons passed AND quiz passed. Uses the existing `getBatchModuleCompletionStatus` function (already defined in data.ts).

```typescript
export async function areAllModulesComplete(
  userId: string,
  moduleIds: string[],
): Promise<boolean> {
  if (moduleIds.length === 0) return true
  const statuses = await getBatchModuleCompletionStatus(userId, moduleIds)
  return moduleIds.every(
    (id) => statuses[id]?.allLessonsCompleted && statuses[id]?.quizCompleted,
  )
}
```

### Step 5: Extend `CourseWithModules` to include capstone

Find the `CourseWithModules` interface (search for `interface CourseWithModules`) and add a `capstone` field:

```typescript
export interface CourseWithModules extends Course {
  modules: (Module & { contentItems: ContentItem[] })[]
  capstone?: { id: string; title: string } | null   // ← ADD THIS
}
```

### Step 6: Extend `getCoursesForSidebar()` to include capstone

Find the `getCoursesForSidebar` function. After it fetches courses and modules, add a query to fetch capstones:

```typescript
// Add this query alongside the existing courses + modules queries:
const capstones = await sql<{ id: string; course_id: string; title: string }[]>`
  SELECT id, course_id, title FROM capstones
  WHERE course_id = ANY(${courseIds}::text[])
`
const capstonesByCourse = Object.fromEntries(
  capstones.map((c) => [c.course_id, { id: c.id, title: c.title }])
)

// Then attach to each course when building the return value:
// course.capstone = capstonesByCourse[course.id] ?? null
```

The exact integration point depends on how `getCoursesForSidebar` builds its return objects. Find where it maps course rows to `CourseWithModules` objects and add `capstone: capstonesByCourse[course.id] ?? null`.

### Step 7: Add `getCapstoneSubmissionStatuses(userId, courses)`

Used by dashboard layout to include capstone completion in the `contentCompletion` map (keyed as `capstone:{courseId}`):

```typescript
export async function getCapstoneSubmissionStatuses(
  userId: string,
  courses: Array<{ id: string; capstone?: { id: string; title: string } | null }>,
): Promise<Record<string, SectionStatus>> {
  const capstoneIds = courses
    .map((c) => c.capstone?.id)
    .filter((id): id is string => !!id)

  if (capstoneIds.length === 0) return {}

  const rows = await sql<{ capstone_id: string }[]>`
    SELECT capstone_id FROM user_capstone_submissions
    WHERE user_id = ${userId} AND capstone_id = ANY(${capstoneIds}::text[])
  `
  const submittedSet = new Set(rows.map((r) => r.capstone_id))

  return Object.fromEntries(
    courses
      .filter((c) => c.capstone)
      .map((c) => [
        `capstone:${c.id}`,
        submittedSet.has(c.capstone!.id) ? 'completed' : 'not-started',
      ])
  ) as Record<string, SectionStatus>
}
```

### Step 8: Commit

```bash
git add app/src/lib/data.ts
git commit -m "feat: add Capstone types, queries, and sidebar data helpers"
```

---

## Task 3: Course sequence — add capstone node

**Files:**
- Modify: `app/src/lib/course-sequence.ts`

### Step 1: Add `'capstone'` to `CourseStep.type`

```typescript
export type CourseStep = {
  href: string
  label: string
  type:
    | 'course-intro'
    | 'module-intro'
    | 'lesson-intro'
    | 'lesson-content'
    | 'lesson-outro'
    | 'quiz'
    | 'module-outro'
    | 'capstone'       // ← ADD
    | 'graduation'
    | 'certificate'
}
```

### Step 2: Add optional `capstoneTitle` parameter to `buildCourseSequence`

```typescript
export function buildCourseSequence(
  courseSlug: string,
  modules: Pick<Module, 'id' | 'slug' | 'title' | 'quiz_form'>[],
  lessonsByModule: Record<string, Array<{ lesson_index: number; title: string }>>,
  capstoneTitle?: string,   // ← ADD
): CourseStep[]
```

### Step 3: Insert capstone node before `graduation`

Find the two lines that push `graduation` and `certificate` at the end of `buildCourseSequence`. Insert the capstone node just before them:

```typescript
  // ← INSERT BEFORE graduation push:
  if (capstoneTitle) {
    steps.push({
      href: `${base}/capstone`,
      label: capstoneTitle,
      type: 'capstone',
    })
  }

  steps.push({ href: `${base}/graduation`, label: 'Graduation', type: 'graduation' })
  steps.push({ href: `${base}/certificate`, label: 'Certificate', type: 'certificate' })
```

### Step 4: Commit

```bash
git add app/src/lib/course-sequence.ts
git commit -m "feat: add capstone node to buildCourseSequence"
```

---

## Task 4: API routes

**Files:**
- Create: `app/src/app/api/capstone/submit/route.ts`
- Create: `app/src/app/api/capstone/[capstoneId]/route.ts`

### Step 1: Create submit route

```typescript
// app/src/app/api/capstone/submit/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@neondatabase/serverless'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { capstoneId?: string; code?: string; output?: string }
  const { capstoneId, code, output } = body

  if (!capstoneId || !code) {
    return NextResponse.json({ error: 'Missing capstoneId or code' }, { status: 400 })
  }

  await sql`
    INSERT INTO user_capstone_submissions (user_id, capstone_id, code, output, submitted_at)
    VALUES (${session.user.id}, ${capstoneId}, ${code}, ${output ?? null}, NOW())
    ON CONFLICT (user_id, capstone_id) DO UPDATE SET
      code         = EXCLUDED.code,
      output       = EXCLUDED.output,
      submitted_at = NOW()
  `

  return NextResponse.json({ ok: true })
}
```

### Step 2: Create fetch route

```typescript
// app/src/app/api/capstone/[capstoneId]/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getUserCapstoneSubmission } from '@/lib/data'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ capstoneId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { capstoneId } = await params
  const submission = await getUserCapstoneSubmission(session.user.id, capstoneId)
  return NextResponse.json(submission ?? null)
}
```

### Step 3: Commit

```bash
git add app/src/app/api/capstone/
git commit -m "feat: add capstone submit and fetch API routes"
```

---

## Task 5: Capstone layout client component

**Files:**
- Create: `app/src/components/capstone/capstone-layout.tsx`

This is modelled after `code-lesson-layout.tsx` but without test cases. It uses `CoursePlayerShell`, `CodeEditor`, and `Markdown` — all already available.

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CoursePlayerShell } from '@/components/course/course-player-shell'
import { CodeEditor } from '@/components/lesson/code-editor'
import { Markdown } from '@/components/shared/markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Play, Send, CheckCircle2, ChevronDown } from 'lucide-react'
import type { Capstone } from '@/lib/data'
import type { CourseStep } from '@/lib/course-sequence'

type ExecutionPhase = 'idle' | 'running' | 'run-pass' | 'run-fail' | 'error' | 'tle'

interface CapstoneLayoutProps {
  capstone: Capstone
  savedCode: string | null
  savedOutput: string | null
  isSubmitted: boolean
  prevStep: CourseStep | null
  nextStep: CourseStep | null
  isAuthenticated: boolean
}

export function CapstoneLayout({
  capstone,
  savedCode,
  savedOutput,
  isSubmitted: initialIsSubmitted,
  prevStep,
  nextStep,
  isAuthenticated,
}: CapstoneLayoutProps) {
  const router = useRouter()
  const [code, setCode] = useState(savedCode ?? capstone.starterCode ?? '')
  const [phase, setPhase] = useState<ExecutionPhase>('idle')
  const [stdout, setStdout] = useState<string | null>(savedOutput)
  const [isSubmitted, setIsSubmitted] = useState(initialIsSubmitted)
  const [hasRun, setHasRun] = useState(!!savedOutput)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [openHint, setOpenHint] = useState<number | null>(null)

  const handleRun = useCallback(async () => {
    setPhase('running')
    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const result = await res.json()
      const out: string = result.stdout ?? result.stderr ?? ''
      setStdout(out)
      setHasRun(true)
      if (result.statusId === 5) {
        setPhase('tle')
      } else if (result.stderr || (result.statusId && result.statusId > 3)) {
        setPhase('run-fail')
      } else {
        setPhase('run-pass')
      }
    } catch {
      setPhase('error')
      setStdout('Network error — could not reach executor.')
    }
  }, [code])

  const handleSubmit = useCallback(async () => {
    setSubmitStatus('submitting')
    try {
      await fetch('/api/capstone/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capstoneId: capstone.id, code, output: stdout }),
      })
      setIsSubmitted(true)
      setSubmitStatus('done')
      router.refresh()
    } catch {
      setSubmitStatus('idle')
    }
  }, [capstone.id, code, stdout, router])

  const canSubmit = hasRun && phase !== 'tle' && phase !== 'running' && phase !== 'error'

  return (
    <CoursePlayerShell
      eyebrow="Capstone Project"
      title={capstone.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={!isSubmitted}
      scrollable={false}
    >
      <div className="flex h-full divide-x divide-border overflow-hidden">
        {/* Left: Project brief */}
        <div className="w-[44%] flex flex-col overflow-y-auto p-6 gap-4">
          {capstone.requiredPackages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Uses:</span>
              {capstone.requiredPackages.map((pkg) => (
                <Badge key={pkg} variant="secondary" className="text-xs font-mono">{pkg}</Badge>
              ))}
            </div>
          )}

          {capstone.description && <Markdown content={capstone.description} />}

          {capstone.hints.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hints</p>
              {capstone.hints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => setOpenHint(openHint === i ? null : i)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Hint {i + 1}</span>
                    <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', openHint === i && 'rotate-180')} />
                  </div>
                  {openHint === i && (
                    <p className="mt-1.5 text-foreground/80">{hint}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {isSubmitted && (
            <div className="mt-auto flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400 ring-1 ring-green-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Submitted — under review
            </div>
          )}
        </div>

        {/* Right: Editor + output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <CodeEditor value={code} onChange={setCode} />
          </div>

          <div className="h-44 border-t border-border bg-muted/10 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Output</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRun}
                  disabled={phase === 'running'}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  <Play className="h-3 w-3" />
                  {phase === 'running' ? 'Running…' : 'Run'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitStatus === 'submitting'}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {submitStatus === 'submitting'
                    ? 'Submitting…'
                    : isSubmitted
                    ? 'Resubmit'
                    : 'Submit for Review'}
                </Button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">
              {phase === 'running' ? (
                <span className="text-muted-foreground animate-pulse">Running…</span>
              ) : stdout ? (
                stdout
              ) : (
                <span className="text-muted-foreground">Run your code to see output here.</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </CoursePlayerShell>
  )
}
```

**Commit:**

```bash
git add app/src/components/capstone/capstone-layout.tsx
git commit -m "feat: add CapstoneLayout client component"
```

---

## Task 6: Capstone server page

**Files:**
- Create: `app/src/app/dashboard/course/[courseSlug]/capstone/page.tsx`

Pattern mirrors `quiz/page.tsx` exactly — same parallel fetch + `buildCourseSequence` + `CoursePlayerShell` pattern.

```typescript
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/server'
import {
  getCourseWithModules,
  getCapstone,
  getUserCapstoneSubmission,
  getLessonsForCourse,
  areAllModulesComplete,
} from '@/lib/data'
import { buildCourseSequence } from '@/lib/course-sequence'
import { CapstoneLayout } from '@/components/capstone/capstone-layout'
import { CoursePlayerShell } from '@/components/course/course-player-shell'
import Link from 'next/link'

interface Props {
  params: Promise<{ courseSlug: string }>
}

export default async function CapstonePage({ params }: Props) {
  const { courseSlug } = await params
  const { user } = await auth()

  const course = await getCourseWithModules(courseSlug)
  if (!course) notFound()

  const capstone = await getCapstone(course.id)
  if (!capstone) notFound()

  const moduleIds = course.modules.map((m) => m.id)

  const [submission, allComplete, allLessonsMap] = await Promise.all([
    user ? getUserCapstoneSubmission(user.id, capstone.id) : Promise.resolve(null),
    user ? areAllModulesComplete(user.id, moduleIds) : Promise.resolve(false),
    getLessonsForCourse(moduleIds),
  ])

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap, capstone.title)
  const currentHref = `/dashboard/course/${courseSlug}/capstone`
  const currentIdx = steps.findIndex((s) => s.href === currentHref)
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null

  // Locked state — all modules must be complete (and not already submitted)
  const isLocked = !allComplete && !submission

  if (isLocked) {
    return (
      <CoursePlayerShell
        eyebrow="Capstone Project"
        title={capstone.title}
        prevHref={prevStep?.href ?? null}
        prevLabel={prevStep?.label ?? null}
        nextHref={null}
        nextLabel={null}
        nextLocked={true}
      >
        <div className="flex items-center justify-center h-full">
          <div className="bg-card rounded-2xl border border-border/60 p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Capstone Locked</h2>
            <p className="text-muted-foreground mb-6">
              Complete all modules and their quizzes to unlock the capstone project.
            </p>
            <Link
              href={`/dashboard/course/${courseSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </CoursePlayerShell>
    )
  }

  return (
    <CapstoneLayout
      capstone={capstone}
      savedCode={submission?.code ?? null}
      savedOutput={submission?.output ?? null}
      isSubmitted={!!submission}
      prevStep={prevStep}
      nextStep={nextStep}
      isAuthenticated={!!user}
    />
  )
}
```

**Commit:**

```bash
git add app/src/app/dashboard/course/[courseSlug]/capstone/
git commit -m "feat: add capstone server page with lock state"
```

---

## Task 7: Sidebar — add capstone item

**Files:**
- Modify: `app/src/app/dashboard/layout.tsx`
- Modify: `app/src/components/shared/app-sidebar.tsx`

### Step 1: Update `dashboard/layout.tsx` to fetch capstone statuses

In `dashboard/layout.tsx`, the existing data fetch block is:
```typescript
const [courseProgress, contentCompletion] = await Promise.all([
  getSidebarProgress(user.id, courseIds),
  allModules.length > 0
    ? getSectionCompletionStatus(user.id, allModules)
    : Promise.resolve({} as Record<string, SectionStatus>),
])
```

Add `getCapstoneSubmissionStatuses` to the import and extend the `contentCompletion` merge:

```typescript
import { ..., getCapstoneSubmissionStatuses } from '@/lib/data'

// In the parallel fetch:
const [courseProgress, contentCompletion, capstoneStatuses] = await Promise.all([
  getSidebarProgress(user.id, courseIds),
  allModules.length > 0
    ? getSectionCompletionStatus(user.id, allModules)
    : Promise.resolve({} as Record<string, SectionStatus>),
  getCapstoneSubmissionStatuses(user.id, courses),
])

// Merge capstone statuses into contentCompletion before passing to sidebar:
const mergedCompletion = { ...contentCompletion, ...capstoneStatuses }
```

Then pass `mergedCompletion` instead of `contentCompletion` to `<AppSidebar>`.

### Step 2: Add capstone item rendering to `app-sidebar.tsx`

In `app-sidebar.tsx`, find the place where a course's modules are rendered (in `ModuleSection` or the parent loop). After the last module, add a capstone item if the course has one.

The `contentCompletion` map now includes `capstone:{courseId}` keys, so completion check is:
```typescript
const capstoneCompleted = (contentCompletion[`capstone:${course.id}`] ?? 'not-started') === 'completed'
const isActiveCapstone = pathname === `/dashboard/course/${course.slug}/capstone`
```

Render after the modules list (inside the course section loop):
```typescript
{course.capstone && (
  <Link
    href={`/dashboard/course/${course.slug}/capstone`}
    className={cn(
      "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors mt-1",
      isActiveCapstone
        ? "bg-primary/10 text-primary font-medium"
        : capstoneCompleted
        ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    )}
  >
    {isActiveCapstone ? (
      <CircleDot className={cn("h-3.5 w-3.5 shrink-0", capstoneCompleted ? "text-green-500" : "text-primary")} />
    ) : capstoneCompleted ? (
      <div className="h-3.5 w-3.5 rounded-full bg-green-500/70 shrink-0" />
    ) : (
      <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
    )}
    <span className="truncate">{course.capstone.title}</span>
  </Link>
)}
```

Add `Layers` to lucide-react imports if not already present.

### Step 3: Commit

```bash
git add app/src/app/dashboard/layout.tsx app/src/components/shared/app-sidebar.tsx
git commit -m "feat: add capstone item to sidebar with completion state"
```

---

## Task 8: Content JSON + Seeder

**Files:**
- Create: `app/content/intro-to-python/capstone.json` (example)
- Modify: `app/scripts/seed-content.mjs`

### Step 1: Create sample capstone.json

```json
{
  "id": "capstone-intro-to-python-001",
  "course_id": "course-intro-to-python-001",
  "title": "Build a Quote Fetcher",
  "description": "# Capstone: Quote Fetcher\n\nYou've mastered Python fundamentals. Now put it all together.\n\nUsing the `requests` library, write a script that fetches a random quote from a public API, formats it nicely, and prints it to the terminal.\n\n**Requirements:**\n- Fetch from `https://zenquotes.io/api/random`\n- Print the quote text and author in a readable format\n- Handle the case where the request fails gracefully",
  "starter_code": "import requests\n\n# Fetch a random quote and print it\ndef main():\n    # Your code here\n    pass\n\nmain()\n",
  "required_packages": ["requests"],
  "hints": [
    "Use requests.get(url) to fetch the URL. Check response.status_code == 200 before proceeding.",
    "The API returns a JSON array. Use response.json() to parse it, then access [0]['q'] for the quote and [0]['a'] for the author.",
    "Wrap your main() call in a try/except block to handle network errors gracefully."
  ]
}
```

### Step 2: Add capstone seeding to `seed-content.mjs`

In `seed-content.mjs`, find where it seeds a course (after modules and lessons). Add capstone seeding logic:

```javascript
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// After seeding modules and lessons for a course:
const capstonePath = join(courseDir, 'capstone.json')
if (existsSync(capstonePath)) {
  const capstone = JSON.parse(readFileSync(capstonePath, 'utf8'))
  // Skip _status sentinel if present
  const { _status, ...capstoneData } = capstone

  await sql`
    INSERT INTO capstones (id, course_id, title, description, starter_code, required_packages, hints)
    VALUES (
      ${capstoneData.id},
      ${capstoneData.course_id},
      ${capstoneData.title},
      ${capstoneData.description ?? null},
      ${capstoneData.starter_code ?? null},
      ${capstoneData.required_packages},
      ${capstoneData.hints}
    )
    ON CONFLICT (id) DO UPDATE SET
      title             = EXCLUDED.title,
      description       = EXCLUDED.description,
      starter_code      = EXCLUDED.starter_code,
      required_packages = EXCLUDED.required_packages,
      hints             = EXCLUDED.hints,
      updated_at        = NOW()
  `
  console.log(`  ✓ Capstone: ${capstoneData.title}`)
}
```

### Step 3: Test the seeder

```bash
cd app
node scripts/seed-content.mjs
```

Expected output includes: `✓ Capstone: Build a Quote Fetcher`

### Step 4: Commit

```bash
git add app/scripts/seed-content.mjs app/content/
git commit -m "feat: add capstone seeder and sample capstone.json"
```

---

## Task 9: Executor — pre-install packages

**Step 1: Locate executor source**

The executor is a self-hosted Railway service. Find its source locally or via Railway dashboard. Check:

```bash
find /Users/harshitchoudhary/Documents/projects -name "requirements.txt" | grep -v node_modules | grep -v ".venv"
```

Or check the Railway dashboard (project: `zuzu-judge0`, service ID: `b6728548-20d0-423a-8791-7747456df052`) for the connected Git repo.

**Step 2: Add packages to `requirements.txt`**

```
requests>=2.31.0
beautifulsoup4>=4.12.0
lxml>=5.0.0
pandas>=2.0.0
Pillow>=10.0.0
python-dotenv>=1.0.0
openpyxl>=3.1.0
httpx>=0.26.0
rich>=13.0.0
pydantic>=2.0.0
```

**Step 3: Deploy**

```bash
# In executor directory:
git add requirements.txt
git commit -m "feat: add capstone package dependencies"
git push
```

Railway auto-deploys on push. Verify the new packages are available:

```bash
curl -X POST https://python-executor-production-2fc7.up.railway.app/run \
  -H "X-Api-Key: $EXECUTOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "import requests; import bs4; print(\"ok\")"}'
```

Expected: `{"stdout": "ok\n", ...}` with no import errors.

---

## Task 10: Type check + smoke test

**Step 1: Type check**

```bash
cd app
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Lint**

```bash
npm run lint
```

**Step 3: Smoke test in dev**

```bash
npm run dev
```

Navigate to `/dashboard/course/intro-to-python/capstone`:
- With no modules complete → lock screen shown, "Back to Course" link works
- After completing all modules → capstone player loads with starter code pre-filled
- Click Run → output panel shows stdout from executor
- Click "Submit for Review" → page refreshes, shows "Submitted — under review" banner
- Sidebar shows "Build a Quote Fetcher" as final course item
- After submit → sidebar item shows green filled dot

**Step 4: Final commit**

```bash
git add -p  # stage any remaining changes
git commit -m "feat: capstone projects — end-to-end"
```
