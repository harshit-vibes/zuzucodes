# reveal.js Slides Pane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom `LessonSections` + `AnimatedCodeBlock` left pane with a reveal.js scroll-view `SlidesPane` component that owns all navigation, transitions, code animation, math, and fragments natively.

**Architecture:** `SlidesPane` is a `'use client'` component that mounts a `.reveal > .slides` container, sets the lesson markdown into a `<textarea data-template>` via a DOM ref (bypassing React's value/innerHTML mismatch), initialises reveal.js via dynamic import in `useEffect`, and renders `ProblemPanel` inside a plain `<section>` for the challenge slide. The parent passes `key={lessonId}` to force a full remount on lesson navigation — the `useEffect` cleanup calls `deck.destroy()`.

**Tech Stack:** `reveal.js` (npm), reveal.js markdown plugin, highlight plugin, math/KaTeX plugin. No new testing libraries — verification is TypeScript check + manual smoke test on `/mock-course`.

---

## Task 1: Install reveal.js and remove motion

**Files:**
- Modify: `app/package.json` (via npm)

**Step 1: Install reveal.js**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npm install reveal.js
```

Expected: `added N packages` with no errors.

**Step 2: Check reveal.js ships with TypeScript types**

```bash
ls node_modules/reveal.js/dist/ | grep -E '(reveal.d.ts|reveal.esm.js)'
```

Expected: both files present. No `@types/reveal.js` needed.

**Step 3: Check the math plugin path (needed for Task 2)**

```bash
ls node_modules/reveal.js/plugin/math/
```

Note the exact filenames. Typical output: `math.esm.js`, `math.js`. The ESM file is what we import.

**Step 4: Check the highlight plugin CSS themes available**

```bash
ls node_modules/reveal.js/plugin/highlight/ | grep css
```

Note available themes (e.g. `monokai.css`, `github.css`). We'll use `monokai.css`.

**Step 5: Remove motion**

```bash
npm uninstall motion
```

Expected: `removed N packages`.

**Step 6: Verify no remaining motion imports**

```bash
grep -r "from 'motion" ../app/src --include="*.tsx" --include="*.ts"
```

Expected: zero results. If any remain, remove the import (the `lesson-sections.tsx` file will be deleted in Task 7 anyway).

**Step 7: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/package.json app/package-lock.json
git commit -m "chore: install reveal.js, remove motion"
```

---

## Task 2: Create `SlidesPane` component

**Files:**
- Create: `app/src/components/lesson/slides-pane.tsx`

**Context:** This is the heart of the change. Key constraints:
- reveal.js's markdown plugin reads `textarea.innerHTML` (not `.value`), so we set it via a DOM ref after mount, before calling `deck.initialize()`
- Plugins are dynamically imported inside `useEffect` — avoids SSR issues since reveal.js requires DOM
- `key={lessonId}` in the parent (Task 4) ensures remount on lesson change; `useEffect` cleanup calls `deck.destroy()`
- `katex/dist/katex.min.css` is already imported in `globals.css` — do NOT import it again here
- reveal.js KaTeX plugin: configure `mathjax: undefined` to force KaTeX path; verify the plugin is found at `reveal.js/plugin/math/math.esm.js` (or `katex.esm.js` if separate) after Task 1's `ls` check

**Step 1: Write the component**

Create `app/src/components/lesson/slides-pane.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import type { TestCase } from '@/lib/judge0';

interface SlidesPaneProps {
  content: string;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

/**
 * Prepend <!-- .slide: data-auto-animate --> to any section that contains
 * a fenced code block, so reveal.js morphs code between adjacent slides.
 * Authors write plain markdown — this is injected automatically.
 */
function injectAutoAnimate(content: string): string {
  return content
    .split('\n---\n')
    .map((section) =>
      /^```/m.test(section)
        ? '<!-- .slide: data-auto-animate -->\n' + section.trimStart()
        : section
    )
    .join('\n---\n');
}

export function SlidesPane({
  content,
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: SlidesPaneProps) {
  const deckRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const processedContent = injectAutoAnimate(content);

  useEffect(() => {
    const container = deckRef.current;
    const textarea = textareaRef.current;
    if (!container || !textarea) return;

    // reveal.js markdown plugin reads textarea.innerHTML, not .value.
    // Set it directly before initialising the deck.
    textarea.innerHTML = processedContent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deck: any;

    async function init() {
      const [
        { default: Reveal },
        { default: RevealMarkdown },
        { default: RevealHighlight },
        RevealMathModule,
      ] = await Promise.all([
        import('reveal.js'),
        import('reveal.js/plugin/markdown/markdown.esm.js'),
        import('reveal.js/plugin/highlight/highlight.esm.js'),
        import('reveal.js/plugin/math/math.esm.js'),
      ]);

      // Import reveal.js core CSS (global, but scoped under .reveal by the library)
      await import('reveal.js/dist/reveal.css');
      await import('reveal.js/plugin/highlight/monokai.css');

      // RevealMath.KaTeX is the KaTeX sub-plugin. If the import shape differs
      // after checking node_modules (Task 1 Step 3), adjust accordingly.
      const KaTeXPlugin = RevealMathModule.KaTeX ?? RevealMathModule.default?.KaTeX ?? RevealMathModule.default;

      deck = new Reveal(container, {
        // ── Embedding ──────────────────────────────────────────
        embedded: true,        // don't take over the full page
        disableLayout: true,   // our CSS controls sizing
        hash: false,           // Next.js router owns the URL
        respondToHashChanges: false,

        // ── Scroll view ────────────────────────────────────────
        view: 'scroll',
        scrollSnap: 'mandatory',

        // ── Transitions ────────────────────────────────────────
        transition: 'none',
        backgroundTransition: 'none',

        // ── Auto-animate ───────────────────────────────────────
        autoAnimate: true,
        autoAnimateDuration: 0.4,
        autoAnimateEasing: 'ease',
        autoAnimateUnmatched: true,

        // ── Chrome — reveal.js owns nothing visual ─────────────
        controls: false,
        progress: false,
        slideNumber: false,
        help: false,

        // ── Navigation ─────────────────────────────────────────
        keyboard: true,
        touch: true,
        navigationMode: 'linear',

        // ── Plugins ────────────────────────────────────────────
        plugins: [
          RevealMarkdown,
          RevealHighlight,
          ...(KaTeXPlugin ? [KaTeXPlugin] : []),
        ],
      });

      await deck.initialize();
    }

    init();

    return () => {
      deck?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — key={lessonId} on parent forces remount between lessons

  return (
    <div ref={deckRef} className="reveal h-full w-full">
      <div className="slides">

        {/* Markdown sections — reveal.js splits on --- and renders each as a slide */}
        <section data-markdown>
          <textarea ref={textareaRef} data-template readOnly />
        </section>

        {/* Challenge slide — ProblemPanel rendered as a normal React child */}
        {problemSummary && (
          <section>
            <div className="overflow-y-auto h-full px-8 py-8">
              <ProblemPanel
                problemSummary={problemSummary}
                problemConstraints={problemConstraints}
                problemHints={problemHints}
                testCases={testCases}
                entryPoint={entryPoint}
              />
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
```

**Step 2: Run TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors. If there are type errors from reveal.js dynamic imports, add `// @ts-ignore` on the specific import lines and note them — they can be typed properly later.

**Step 3: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/lesson/slides-pane.tsx
git commit -m "feat: add SlidesPane component with reveal.js scroll view"
```

---

## Task 3: Add reveal.js sizing overrides to `globals.css`

**Files:**
- Modify: `app/src/app/globals.css`

**Context:** `disableLayout: true` means reveal.js doesn't set width/height/transforms on `.reveal` or `.slides`. We need CSS to make the reveal container fill the prose pane and slides flow correctly in scroll view.

**Step 1: Append the overrides at the bottom of `globals.css`**

Add this block at the very end of `app/src/app/globals.css`:

```css
/* ═══════════════════════════════════════════════════════════════════
   reveal.js — sizing overrides (disableLayout: true)
   Scoped under .reveal so they don't affect the rest of the app.
   ══════════════════════════════════════════════════════════════════ */

.reveal {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.reveal .slides {
  height: 100%;
  width: 100%;
}

/* Scroll view: each slide fills the pane height */
.reveal.scroll-view .slides > section,
.reveal.scroll-view .slides > section > section {
  min-height: 100%;
  box-sizing: border-box;
}

/* Reset reveal.js prose styles to inherit from our Tailwind tokens */
.reveal h1, .reveal h2, .reveal h3 {
  font-family: inherit;
  color: inherit;
  text-transform: none;
  letter-spacing: inherit;
}

.reveal p, .reveal li {
  font-family: inherit;
  color: inherit;
  line-height: inherit;
}

/* Code blocks — ensure reveal.js highlight theme doesn't break our layout */
.reveal pre {
  width: 100%;
  box-shadow: none;
  margin: 1.5rem 0;
}

.reveal pre code {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.6;
  max-height: none;
  padding: 1rem;
}
```

**Step 2: TypeScript check (catches any syntax issues in adjacent files)**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 3: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/app/globals.css
git commit -m "feat: add reveal.js sizing overrides to globals.css"
```

---

## Task 4: Wire `SlidesPane` into `CodeLessonLayout`

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Context:** Remove `LessonSections`, `parseLessonSections`, and the `sections` memo. Replace with `SlidesPane`. Add `key={lessonId}` to `SlidesPane` so React fully remounts it when navigating between lessons. Remove the `<h1>` title above the pane — it will live inside the lesson's first markdown section instead.

**Step 1: Open `app/src/components/lesson/code-lesson-layout.tsx` and make these changes**

Remove these imports (lines ~5–6):
```tsx
// DELETE these two lines:
import { parseLessonSections } from '@/lib/parse-lesson-sections';
import { LessonSections } from '@/components/lesson/lesson-sections';
```

Add this import (after remaining imports):
```tsx
import { SlidesPane } from '@/components/lesson/slides-pane';
```

Remove the `sections` memo (lines ~76–79):
```tsx
// DELETE this block:
const sections = useMemo(
  () => parseLessonSections(content, problemSummary),
  [content, problemSummary],
);
```

Also remove `useMemo` from the React import if it's no longer used elsewhere in the file. Check the remaining usages before removing.

Replace the `ProsePane` JSX — find the block starting with `<div className="h-full relative overflow-hidden flex flex-col">` (around line 236). Replace the entire ProsePane JSX with:

```tsx
const ProsePane = (
  <div className="h-full overflow-hidden flex flex-col">
    <SlidesPane
      key={lessonId}
      content={content}
      problemSummary={problemSummary}
      problemConstraints={problemConstraints}
      problemHints={problemHints}
      testCases={testCases}
      entryPoint={entryPoint}
    />
  </div>
);
```

Note: the `<h1>{lessonTitle}</h1>` title header div is removed. The lesson title lives in the first section of the lesson's markdown content.

**Step 2: TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors. The most likely error is unused `useMemo` import — remove it if flagged.

**Step 3: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: wire SlidesPane into CodeLessonLayout, remove LessonSections"
```

---

## Task 5: Update `/mock-course` route

**Files:**
- Modify: `app/src/app/mock-course/page.tsx`

**Context:** The mock route is our live testbed. Update it to use `SlidesPane` so we can verify the full reveal.js experience at `http://localhost:3000/mock-course` before touching any real lesson data.

**Step 1: Update `app/src/app/mock-course/page.tsx`**

Remove the `LessonSections` import and `parseLessonSections` call. Replace with `SlidesPane`. The page no longer needs `parseLessonSections` since `SlidesPane` takes raw `content`.

Replace the current imports at the top:
```tsx
// REMOVE:
import { parseLessonSections } from '@/lib/parse-lesson-sections';
import { LessonSections } from '@/components/lesson/lesson-sections';

// ADD:
import { SlidesPane } from '@/components/lesson/slides-pane';
```

In the page component body, remove the `parseLessonSections` call:
```tsx
// REMOVE:
const sections = parseLessonSections(lesson.content, lesson.problemSummary);
```

Replace the left pane content (currently the `<div>` containing the `<h1>` and `<LessonSections>`) with:
```tsx
{/* Left — slides pane */}
<div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">
  <SlidesPane
    key={lesson.id}
    content={lesson.content}
    problemSummary={lesson.problemSummary}
    problemConstraints={lesson.problemConstraints}
    problemHints={lesson.problemHints}
    testCases={lesson.testCases}
    entryPoint={lesson.entryPoint}
  />
</div>
```

**Step 2: TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 3: Smoke test — start dev server and open mock route**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npm run dev
```

Open `http://localhost:3000/mock-course` and verify:
- [ ] Slides pane renders (no blank white box)
- [ ] Lesson content appears (markdown rendered)
- [ ] Code blocks syntax highlighted
- [ ] Scrolling through sections works
- [ ] Click `?lesson=1` and `?lesson=2` in the URL — slides change
- [ ] Arrow keys advance slides
- [ ] Challenge slide (section 5) shows `ProblemPanel`
- [ ] No console errors

If the slides pane renders blank: the most likely cause is `textarea.innerHTML` not being set before `deck.initialize()`. Check browser devtools — inspect the `textarea[data-template]` and confirm it has text content.

**Step 4: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/app/mock-course/page.tsx
git commit -m "feat: update mock-course to use SlidesPane"
```

---

## Task 6: Update mock lesson content for reveal.js conventions

**Files:**
- Modify: `app/src/mock-data/lessons.json`

**Context:** The current content strings have 4 code sections + an implied challenge section. The `injectAutoAnimate` function already handles the `data-auto-animate` injection. What we need to verify is that the `---` separators are exactly `\n---\n` (no surrounding whitespace) and optionally add a lesson title heading to the first section so the removed `<h1>` from the layout is covered.

**Step 1: For each lesson in `lessons.json`, add a title heading to the first section**

Each lesson's `content` field currently starts with `## Your First Python Program` etc. Prepend an `# {title}` heading to the very first section:

For `lesson-hello-python`, change the start of `content` from:
```
"## Your First Python Program\n\n..."
```
to:
```
"# Hello, Python!\n\n## Your First Python Program\n\n..."
```

Do the same for lessons 2 and 3 (`# Numbers & Arithmetic` and `# Lists`).

**Step 2: Verify `---` separator format**

Open the JSON and confirm each separator in the `content` strings is exactly `\n---\n` (newline, three hyphens, newline) with no extra spaces. Search for `--- ` or ` ---` which would break the reveal.js parser.

**Step 3: Reload mock route and verify titles appear**

Reload `http://localhost:3000/mock-course`. The first slide of each lesson should now show the lesson title as an `<h1>`.

**Step 4: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/mock-data/lessons.json
git commit -m "content: add title headings to mock lesson sections for reveal.js"
```

---

## Task 7: Delete deprecated files

**Files:**
- Delete: `app/src/components/lesson/lesson-sections.tsx`
- Delete: `app/src/components/lesson/animated-code-block.tsx`
- Delete: `app/src/lib/parse-lesson-sections.ts`

**Step 1: Confirm nothing imports these files**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
grep -r "lesson-sections\|animated-code-block\|parse-lesson-sections" src --include="*.tsx" --include="*.ts"
```

Expected: zero results. If any imports remain, fix them before deleting.

**Step 2: Delete the files**

```bash
rm app/src/components/lesson/lesson-sections.tsx
rm app/src/components/lesson/animated-code-block.tsx
rm app/src/lib/parse-lesson-sections.ts
```

**Step 3: TypeScript check — confirm no broken imports**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 4: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add -A
git commit -m "refactor: delete LessonSections, AnimatedCodeBlock, parseLessonSections"
```

---

## Task 8: Final verification checklist

**No file changes — this task is manual verification only.**

**Step 1: Full TypeScript check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 2: Dev server smoke test on `/mock-course`**

Navigate through all three mock lessons (`?lesson=0`, `?lesson=1`, `?lesson=2`).

For each lesson verify:
- [ ] All 4 code sections visible by scrolling
- [ ] Code evolves between sections (auto-animate morphing — existing lines stay in place, new lines appear)
- [ ] Syntax highlighting active on code blocks
- [ ] Challenge slide renders with `ProblemPanel` content
- [ ] Keyboard arrow keys work
- [ ] Touch/swipe works (test on mobile or devtools device mode)
- [ ] Math renders (if any `$...$` in content — add a test expression to one lesson if not present)
- [ ] No console errors or warnings about reveal.js

**Step 3: If auto-animate not triggering**

Check `textarea.innerHTML` in devtools after page load — if empty, the `textarea.innerHTML = processedContent` in `useEffect` ran before the ref was available. Fix: move the innerHTML assignment inside the `init()` async function, after awaiting the imports, ensuring it runs in the same tick before `deck.initialize()`.

**Step 4: Commit final state**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add -A
git commit -m "feat: reveal.js slides pane complete — scroll view, auto-animate, KaTeX"
```

---

## Notes for implementer

**KaTeX plugin shape:** After `npm install reveal.js`, run `node -e "const m = require('./node_modules/reveal.js/plugin/math/math.esm.js'); console.log(Object.keys(m))"` to inspect what the math module exports. Adjust the `KaTeXPlugin` extraction in `slides-pane.tsx` accordingly.

**CSS conflicts:** reveal.js `reveal.css` resets some global styles. If the rest of the app looks broken after the CSS import, move the `import 'reveal.js/dist/reveal.css'` from inside the `init()` function to a dedicated `slides-pane.css` that only loads when `SlidesPane` mounts — or scope the problematic rules under `.reveal` in `globals.css`.

**Highlight theme:** `monokai.css` is dark. If the app's light mode makes it look mismatched, switch to `github.css` or `github-dark-dimmed.css` from the highlight plugin folder.

**`motion` package:** If `npm uninstall motion` leaves orphaned types or lock file oddities, run `npm install` to clean up.
