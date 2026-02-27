# Lesson Player: Continuous Scroll Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `LessonSections` to render all lesson content as a single continuous scroll, removing all section-pagination state and UI.

**Architecture:** Delete the `activeIndex`/`navigateTo` pagination state, the up/down arrow buttons, and the dots column. Replace the single-item `absolute inset-0` container with a simple `overflow-y-auto` column that renders every block (intro → sections → outro → challenge) top-to-bottom with a visual label+rule separator between them. No other files change.

**Tech Stack:** React (Next.js App Router), Tailwind CSS v4, TypeScript

---

### Task 1: Rewrite `lesson-sections.tsx` as a continuous scroll

**Files:**
- Modify: `app/src/components/lesson/lesson-sections.tsx` (full rewrite)

**Context for the implementer:**
- The file is a React client component (`'use client'`)
- `LessonSectionsProps` interface — keep it exactly as-is (same props, just simpler rendering)
- `renderTemplate(name, content)` — imported from `@/components/templates`; renders the right template component for each section
- `ProblemPanel` — renders the coding challenge description (problem summary, constraints, hints, test case signatures)
- The `SectionDivider` pattern already exists in the current code (label + `h-px bg-border/20` line) — keep it as a visual separator
- `flex-1 min-h-0` on the outer div is critical — it makes the scroll area fill the available pane height in the flex layout of `CodeLessonLayout`

**Step 1: Replace the file with the new implementation**

Replace the entire contents of `app/src/components/lesson/lesson-sections.tsx` with:

```tsx
'use client';

import { ProblemPanel } from '@/components/lesson/problem-panel';
import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';
import type { TestCase } from '@/lib/judge0';

interface LessonSectionsProps {
  introContent: unknown | null;
  sections: DbLessonSection[];
  outroContent: unknown | null;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

export function LessonSections({
  introContent,
  sections,
  outroContent,
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: LessonSectionsProps) {
  const hasContent =
    introContent !== null ||
    sections.length > 0 ||
    outroContent !== null ||
    !!problemSummary;

  if (!hasContent) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground/30">No content</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
      {introContent !== null && (
        <div className="mb-12">
          <SectionDivider label="intro" />
          {renderTemplate('lesson-intro', introContent)}
        </div>
      )}

      {sections.map((section, i) => (
        <div key={section.id} className="mb-12">
          <SectionDivider label={String(i + 1).padStart(2, '0')} />
          {renderTemplate(section.template as TemplateName, section.content)}
        </div>
      ))}

      {outroContent !== null && (
        <div className="mb-12">
          <SectionDivider label="outro" />
          {renderTemplate('lesson-outro', outroContent)}
        </div>
      )}

      {problemSummary && (
        <div className="mb-12">
          <SectionDivider label="challenge" />
          <ProblemPanel
            problemSummary={problemSummary}
            problemConstraints={problemConstraints}
            problemHints={problemHints}
            testCases={testCases}
            entryPoint={entryPoint}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Visual verification in the browser**

```bash
cd app && npm run dev
```

Navigate to any lesson (e.g. `/dashboard/course/python-fundamentals/hello-world/lesson/1`).

Check:
- [ ] Left pane scrolls continuously — no arrows, no dots
- [ ] Intro section is visible at the top (if lesson has intro)
- [ ] Code sections appear below intro with label dividers (`01`, `02`, etc.)
- [ ] Outro appears after sections (if present)
- [ ] Challenge (problem statement) appears at the bottom
- [ ] Scrolling within the left pane does not affect the right (code editor) pane
- [ ] Empty lesson (no content) shows "No content" fallback

**Step 4: Commit**

```bash
git add app/src/components/lesson/lesson-sections.tsx
git commit -m "refactor: replace paginated section nav with continuous scroll"
```
