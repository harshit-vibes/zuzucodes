# Lesson Overlay + Pane Styling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Make lesson intro/outro full-width blocking overlays with prev/next lesson navigation, and refresh the visual styling of the theory pane, practical pane, and module/course intro-outro pages.

**Architecture:** `CodeLessonLayout` gains a `view: 'intro' | 'content' | 'outro'` state. When `view !== 'content'` the header stays mounted, everything else is replaced by a `LessonOverlay` component. Styling changes touch 7 existing files (templates + problem panel + module + course pages) — no schema or data changes needed.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, React client components. No new libraries. No test framework — verify with `npx tsc --noEmit` + `npm run lint`.

---

## Task 1: Create `LessonOverlay` component

**Files:**
- Create: `app/src/components/lesson/lesson-overlay.tsx`

**Step 1: Create the file**

```tsx
'use client';

import Link from 'next/link';
import { renderTemplate } from '@/components/templates';

interface LessonOverlayProps {
  view: 'intro' | 'outro';
  introContent: unknown | null;
  outroContent: unknown | null;
  lessonTitle: string;
  position: number;
  lessonCount: number;
  prevHref: string;
  nextHref: string;
  hasPrev: boolean;
  onEnterLesson: () => void;
}

export function LessonOverlay({
  view,
  introContent,
  outroContent,
  lessonTitle,
  position,
  lessonCount,
  prevHref,
  nextHref,
  hasPrev,
  onEnterLesson,
}: LessonOverlayProps) {
  const content = view === 'intro' ? introContent : outroContent;
  const templateName = view === 'intro' ? 'lesson-intro' : 'lesson-outro';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-y-auto">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
        <div className="w-20">
          {view === 'intro' && hasPrev ? (
            <Link
              href={prevHref}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              prev
            </Link>
          ) : null}
        </div>

        <span className="font-mono text-[11px] text-muted-foreground/40 tabular-nums">
          {position} / {lessonCount}
        </span>

        <div className="w-20 flex justify-end">
          {view === 'outro' ? (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              next
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-[600px] space-y-8">
          {/* Lesson label + title */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">
              {view === 'intro' ? 'lesson intro' : 'lesson complete'}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {lessonTitle}
            </h2>
          </div>

          {/* Template content */}
          {content !== null
            ? renderTemplate(templateName, content)
            : (
              <p className="text-sm text-muted-foreground/60">
                {view === 'intro' ? 'Ready to begin.' : 'Lesson complete.'}
              </p>
            )}

          {/* Action button */}
          {view === 'intro' ? (
            <button
              onClick={onEnterLesson}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Begin
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onEnterLesson}
              className="flex items-center gap-2 px-4 h-9 rounded border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to lesson
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/components/lesson/lesson-overlay.tsx
git commit -m "feat: add LessonOverlay component for intro/outro blocking screens"
```

---

## Task 2: Wire `LessonOverlay` into `CodeLessonLayout`, replace footer, update `LessonSections`

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`
- Modify: `app/src/components/lesson/lesson-sections.tsx`

### Changes to `code-lesson-layout.tsx`

**Step 1: Add import**

At the top of the file, add after the existing `LessonSections` import:

```tsx
import { LessonOverlay } from '@/components/lesson/lesson-overlay';
```

**Step 2: Add `view` state**

After line `const [showCelebration, setShowCelebration] = useState(false);`, add:

```tsx
const [view, setView] = useState<'intro' | 'content' | 'outro'>('intro');
```

**Step 3: Auto-trigger outro on test pass**

In `handleRun`, find the block that fires confetti (around line 208):

```tsx
// Before:
if (testResult.allPassed) {
  setShowCelebration(true);
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 1 },
    colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
    disableForReducedMotion: true,
  });
}

// After:
if (testResult.allPassed) {
  setShowCelebration(true);
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 1 },
    colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
    disableForReducedMotion: true,
  });
  setTimeout(() => setView('outro'), 1800);
}
```

**Step 4: Remove intro/outro from LessonSections call**

In the `ProsePane` constant, change:

```tsx
// Before:
<LessonSections
  introContent={introContent}
  sections={sections}
  outroContent={outroContent}
/>

// After:
<LessonSections sections={sections} />
```

**Step 5: Replace the Footer with a minimal "wrap up" footer**

Delete the entire `Footer` constant and replace with this minimal version:

```tsx
const Footer = (
  <footer className="shrink-0 h-11 bg-muted/50 dark:bg-zinc-900 border-t border-border dark:border-zinc-800 flex items-center justify-end px-4">
    <button
      onClick={() => setView('outro')}
      className="flex items-center gap-1.5 px-3 h-7 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800 transition-colors"
    >
      wrap up
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </footer>
);
```

**Step 6: Replace the Layout return**

Replace the `return (...)` block entirely with:

```tsx
return (
  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
    {Header}
    {view !== 'content' ? (
      <LessonOverlay
        view={view}
        introContent={introContent}
        outroContent={outroContent}
        lessonTitle={lessonTitle}
        position={position}
        lessonCount={lessonCount}
        prevHref={prevHref}
        nextHref={nextHref}
        hasPrev={hasPrev}
        onEnterLesson={() => setView('content')}
      />
    ) : (
      <>
        <div className="md:hidden shrink-0 flex border-b border-border bg-muted/50 dark:bg-zinc-900">
          <button onClick={() => setActiveTab('lesson')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${activeTab === 'lesson' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>lesson</button>
          <button onClick={() => setActiveTab('code')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${activeTab === 'code' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>code</button>
        </div>
        <div className="md:hidden flex-1 overflow-hidden flex flex-col">
          {activeTab === 'lesson' ? ProsePane : CodePane}
        </div>
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">{ProsePane}</div>
          <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-zinc-950">{CodePane}</div>
        </div>
        {Footer}
      </>
    )}
  </div>
);
```

### Changes to `lesson-sections.tsx`

**Step 7: Remove introContent and outroContent props**

Replace the entire file content with:

```tsx
'use client';

import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';

interface LessonSectionsProps {
  sections: DbLessonSection[];
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[10px] bg-muted/50 text-muted-foreground/50 px-1.5 py-0.5 rounded">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

export function LessonSections({ sections }: LessonSectionsProps) {
  if (sections.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground/30">No content</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
      {sections.map((section, i) => (
        <div key={section.id} className="mb-12">
          <SectionDivider label={String(i + 1).padStart(2, '0')} />
          {renderTemplate(section.template as TemplateName, section.content)}
        </div>
      ))}
    </div>
  );
}
```

**Step 8: Type-check and lint**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit && npm run lint
```

Expected: no errors (warnings from unrelated pre-existing code are OK).

**Step 9: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx app/src/components/lesson/lesson-sections.tsx
git commit -m "feat: lesson intro/outro blocking overlay, wrap-up footer, simplified LessonSections"
```

---

## Task 3: Theory pane template styling

**Files:**
- Modify: `app/src/components/templates/lesson-intro.tsx`
- Modify: `app/src/components/templates/lesson-outro.tsx`
- Modify: `app/src/components/templates/prose-section.tsx`
- Modify: `app/src/components/templates/code-section.tsx`

### `lesson-intro.tsx` — swap CheckCircle2 for mono counters

Replace entire file:

```tsx
'use client';

import { Clock } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-intro'>;
}

export function LessonIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-l-2 border-primary/40 pl-4">
        <p className="text-lg leading-relaxed text-foreground/85">{content.hook}</p>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll learn
        </p>
        <ul className="flex flex-col gap-2.5">
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground/75">
              <span className="font-mono text-[10px] text-muted-foreground/40 shrink-0 mt-0.5 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.estimated_minutes ? (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/40 font-mono">
            ~{content.estimated_minutes} min
          </span>
        </div>
      ) : null}
    </div>
  );
}
```

### `lesson-outro.tsx` — warm up "up next" box

Replace entire file:

```tsx
'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-outro'>;
}

export function LessonOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        <span className="text-xs font-mono uppercase tracking-widest text-success/70">
          Lesson complete
        </span>
      </div>

      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_lesson_teaser ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60 mb-1">
              Up next
            </p>
            <p className="text-sm text-foreground/70">{content.next_lesson_teaser}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary/30 shrink-0 mt-1" />
        </div>
      ) : null}
    </div>
  );
}
```

### `prose-section.tsx` — add max-w-prose

Replace entire file:

```tsx
'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'prose-section'>;
}

export function ProseSectionTemplate({ content }: Props) {
  return (
    <div className="prose-container max-w-prose">
      <Markdown content={content.markdown} />
    </div>
  );
}
```

### `code-section.tsx` — border-left on explanation, lighter takeaway

Replace entire file:

```tsx
'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'code-section'>;
}

export function CodeSectionTemplate({ content }: Props) {
  const fenced = `\`\`\`${content.language}\n${content.code}\n\`\`\``;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-l-2 border-primary/20 pl-4 prose-container">
        <Markdown content={content.explanation} />
      </div>

      <div className="prose-container">
        <Markdown content={fenced} />
      </div>

      {content.takeaway ? (
        <div className="rounded-lg ring-1 ring-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-1">
            Key takeaway
          </p>
          <p className="text-sm text-foreground/70">{content.takeaway}</p>
        </div>
      ) : null}
    </div>
  );
}
```

**Step: Type-check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit
```

**Step: Commit**

```bash
git add app/src/components/templates/lesson-intro.tsx app/src/components/templates/lesson-outro.tsx app/src/components/templates/prose-section.tsx app/src/components/templates/code-section.tsx
git commit -m "feat: theory pane template styling — mono counters, warm up-next, border-left explanation"
```

---

## Task 4: Practical pane — problem panel styling

**Files:**
- Modify: `app/src/components/lesson/problem-panel.tsx`

Replace the entire file content with:

```tsx
'use client';

import { useState } from 'react';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problemSummary: string;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function ProblemPanel({
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: ProblemPanelProps) {
  const [constraintsOpen, setConstraintsOpen] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);

  return (
    <div className="overflow-y-auto border-b border-border/50 dark:border-zinc-700/50 bg-background dark:bg-zinc-950" style={{ maxHeight: '40%' }}>
      <div className="px-4 py-3 space-y-3">

        {/* Summary */}
        <div>
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            challenge
          </span>
          <p className="text-sm font-medium text-foreground/80 leading-relaxed mt-1">
            {problemSummary}
          </p>
        </div>

        {/* Examples */}
        {visibleExamples.length > 0 && entryPoint && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
              examples
            </span>
            <div className="space-y-1">
              {visibleExamples.map((tc, i) => (
                <div
                  key={i}
                  className="font-mono text-xs bg-muted/40 dark:bg-zinc-900 rounded px-2.5 py-1.5 flex items-center gap-2 border-l-2 border-primary/30"
                >
                  <span className="text-foreground/70">
                    {entryPoint}({tc.args.map(a => JSON.stringify(a)).join(', ')})
                  </span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="text-emerald-400/90">{JSON.stringify(tc.expected)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints — collapsible */}
        {problemConstraints.length > 0 && (
          <div>
            <button
              onClick={() => setConstraintsOpen(o => !o)}
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider flex-1">
                constraints
              </span>
              <ChevronIcon open={constraintsOpen} />
            </button>
            {constraintsOpen && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {problemConstraints.map((c, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs text-muted-foreground/70 ring-1 ring-border/40 rounded px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hints — collapsible, reveal one at a time */}
        {problemHints.length > 0 && (
          <div>
            <button
              onClick={() => {
                if (hintsOpen) setHintsRevealed(0);
                setHintsOpen(o => !o);
              }}
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider flex-1">
                hints
              </span>
              <ChevronIcon open={hintsOpen} />
            </button>
            {hintsOpen && (
              <div className="mt-1.5 space-y-1.5">
                {problemHints.slice(0, hintsRevealed).map((hint, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted-foreground/70 bg-muted/30 dark:bg-zinc-800/40 rounded px-3 py-2 border border-border/30"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground/40 block mb-1">
                      hint {i + 1}
                    </span>
                    {hint}
                  </div>
                ))}
                {hintsRevealed < problemHints.length && (
                  <button
                    onClick={() => setHintsRevealed(h => h + 1)}
                    className="text-xs font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    show hint {hintsRevealed + 1}/{problemHints.length} →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
```

**Step: Type-check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit
```

**Step: Commit**

```bash
git add app/src/components/lesson/problem-panel.tsx
git commit -m "feat: problem panel styling — challenge label, example left-border, ring constraints, hint prefix"
```

---

## Task 5: Module + course intro/outro page improvements

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

### Module overview page

**Change 1:** Replace the plain intro card (lines 111–115) with a primary-tinted card:

```tsx
// Before:
{isNotStarted && mod.intro_content ? (
  <div className="rounded-xl border border-border/50 bg-card p-6">
    <TemplateRenderer name="module-intro" content={mod.intro_content} />
  </div>
) : null}

// After:
{isNotStarted && mod.intro_content ? (
  <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
    <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-4">
      In this module
    </p>
    <TemplateRenderer name="module-intro" content={mod.intro_content} />
  </div>
) : null}
```

**Change 2:** Replace the plain outro card (lines 118–122) with a success-tinted card:

```tsx
// Before:
{isCompleted && mod.outro_content ? (
  <div className="rounded-xl border border-border/50 bg-card p-6">
    <TemplateRenderer name="module-outro" content={mod.outro_content} />
  </div>
) : null}

// After:
{isCompleted && mod.outro_content ? (
  <div className="rounded-xl border border-success/20 bg-success/5 p-6">
    <p className="text-[10px] font-mono uppercase tracking-widest text-success/50 mb-4">
      Module complete
    </p>
    <TemplateRenderer name="module-outro" content={mod.outro_content} />
  </div>
) : null}
```

### Course overview page

**Change 3:** In the header `<div>` block (lines 71–87), remove the `intro_content` rendering and keep only the description fallback:

```tsx
// Before (lines 80–87):
{course.intro_content
  ? <TemplateRenderer name="course-intro" content={course.intro_content} />
  : course.description && (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {course.description}
      </p>
    )}

// After:
{!course.intro_content && course.description && (
  <p className="text-sm text-muted-foreground leading-relaxed">
    {course.description}
  </p>
)}
```

**Change 4:** Add a course intro card block immediately after the `</div>` that closes the header block (after line 87), before the Progress+CTA section:

```tsx
{/* ─── Course intro ───────────────────────────────────────── */}
{course.intro_content && (
  <div className="rounded-xl border border-border/30 bg-card p-5">
    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-4">
      About this course
    </p>
    <TemplateRenderer name="course-intro" content={course.intro_content} />
  </div>
)}
```

**Change 5:** Add a course outro card after the Progress+CTA block (after the closing `}` of the `{user && (...)}` block), before the Outcomes section:

```tsx
{/* ─── Course outro (completed) ───────────────────────────── */}
{isCompleted && course.outro_content && (
  <div className="rounded-xl border border-success/20 bg-success/5 p-5">
    <p className="text-[10px] font-mono uppercase tracking-widest text-success/50 mb-4">
      Course complete
    </p>
    <TemplateRenderer name="course-outro" content={course.outro_content} />
  </div>
)}
```

**Step: Type-check and lint**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app && npx tsc --noEmit && npm run lint
```

**Step: Commit**

```bash
git add app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx app/src/app/dashboard/course/[courseSlug]/page.tsx
git commit -m "feat: module/course intro-outro colored cards, course outro on completion"
```
