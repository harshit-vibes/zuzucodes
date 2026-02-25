# Design: reveal.js Slides Pane

**Date:** 2026-02-25
**Status:** Approved
**Scope:** Left pane of the lesson player — replaces `LessonSections` + `AnimatedCodeBlock` entirely with reveal.js scroll view.

---

## Problem

The custom fade/snap-scroll implementation of `LessonSections` has been unstable across iterations. We've tried CSS snap-scroll, `AnimatePresence`, and debounced scroll tracking — none feel right. The underlying need is a battle-tested slide-based experience with code evolution animation, math, and fragments.

---

## Decision

Replace the left pane ("slides pane") entirely with **reveal.js** in scroll view mode. reveal.js is purpose-built for this shape: sections as slides, scroll snap, auto-animate for code morphing, KaTeX math, highlight.js code rendering, and fragment-based progressive reveals. No custom navigation, no custom transitions, no custom code animation.

The right pane (code editor, Judge0, output panel) is **untouched**.

---

## Architecture

### What changes

| | Before | After |
|---|---|---|
| DB schema | `content TEXT` | **unchanged** |
| Content format | markdown + `---` | markdown + `---` + reveal.js HTML comments |
| Left pane component | `LessonSections` + `AnimatedCodeBlock` | `SlidesPane` (new) |
| Navigation | custom dots + arrows | reveal.js scroll view (native) |
| Code animation | custom LCS diff | reveal.js auto-animate |
| Math | rehype-katex in Markdown component | reveal.js KaTeX plugin |
| Right pane | unchanged | unchanged |

### What gets deleted

```
app/src/components/lesson/lesson-sections.tsx
app/src/components/lesson/animated-code-block.tsx
app/src/lib/parse-lesson-sections.ts
```

### Package changes

```bash
# add
cd app && npm install reveal.js

# remove
cd app && npm uninstall motion
```

---

## Component: `SlidesPane`

**File:** `app/src/components/lesson/slides-pane.tsx`

**Type:** `'use client'` — reveal.js requires DOM access.

### Props

```ts
interface SlidesPaneProps {
  content: string;
  lessonTitle: string;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}
```

### DOM structure

```html
<div class="reveal" ref={deckRef}>
  <div class="slides">

    <!-- Full lesson markdown — reveal.js splits on --- into slides -->
    <section data-markdown>
      <textarea data-template>{content}</textarea>
    </section>

    <!-- Challenge slide — React portal renders ProblemPanel into this -->
    <section ref={challengeRef} />   <!-- only rendered if problemSummary exists -->

  </div>
</div>
```

### Mount lifecycle

```
useEffect:
  deck = new Reveal(deckRef.current, config)
  deck.initialize()
  return () => deck.destroy()
```

One Reveal instance per mount. Lesson navigation triggers unmount → remount → fresh `initialize()`. No stale deck risk.

### Challenge slide

`createPortal(<ProblemPanel ... />, challengeRef.current)` after `Reveal.initialize()` resolves. reveal.js treats the `<section>` as a normal slide for scroll/transition — does not touch its inner HTML.

### CSS scoping

`reveal.js/dist/reveal.css` imported inside `slides-pane.tsx`. The `.reveal` class acts as the style boundary — reveal.js global styles don't leak outside the component. Tailwind and CSS variables are unaffected.

---

## reveal.js Configuration

```ts
{
  // Embedding
  embedded: true,
  disableLayout: true,
  hash: false,
  respondToHashChanges: false,

  // Scroll view
  view: 'scroll',
  scrollSnap: 'mandatory',

  // Transitions
  transition: 'none',
  backgroundTransition: 'none',

  // Auto-animate
  autoAnimate: true,
  autoAnimateDuration: 0.4,
  autoAnimateEasing: 'ease',
  autoAnimateUnmatched: true,

  // Chrome — all off, reveal.js owns nothing visual
  controls: false,
  progress: false,
  slideNumber: false,
  help: false,

  // Navigation
  keyboard: true,
  touch: true,
  navigationMode: 'linear',

  // Plugins
  plugins: [RevealMarkdown, RevealHighlight, RevealMath.KaTeX],
}
```

**Key:** `embedded: true` + `disableLayout: true` prevent reveal.js from taking over the viewport or applying scale transforms. Our CSS owns sizing — `SlidesPane` fills the prose pane at `height: 100%`.

---

## Content Format & Authoring Conventions

**Schema: no change.** `content` remains a `TEXT` field with `---` section separators.

### Auto-animate injection

The `SlidesPane` renderer automatically prepends `<!-- .slide: data-auto-animate -->` to any section whose markdown contains a fenced code block. Authors write plain markdown — they never write this comment manually.

### Fragments

```markdown
- First point <!-- .element: class="fragment" -->
- Second point <!-- .element: class="fragment" -->
```

### Math

```markdown
Inline: $O(n \log n)$
Block:  $$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$
```

### Code with step-through line highlights

````markdown
```python [1-2|3-4]
def greet(name):
    return f'Hello, {name}!'
```
````

### Lesson normalisation

Existing DB lessons are updated via `seed-content.mjs` to follow these conventions. The mock data in `app/src/mock-data/lessons.json` is the reference format updated first.

---

## Integration: `CodeLessonLayout`

`LessonSections` import and `parseLessonSections` memo are removed. `SlidesPane` is dropped in directly:

```tsx
// ProsePane — after
<SlidesPane
  content={content}
  lessonTitle={lessonTitle}
  problemSummary={problemSummary}
  problemConstraints={problemConstraints}
  problemHints={problemHints}
  testCases={testCases}
  entryPoint={entryPoint}
/>
```

The `<h1>{lessonTitle}</h1>` heading above the pane is removed — the lesson title lives inside the first slide's markdown content.

The `/mock-course` route is updated in parallel to use `SlidesPane`, making it a live testbed before touching the real lesson player.

---

## Out of Scope

- **Presentation state persistence** (`Reveal.getState()` → DB): overkill now. Add `last_section_index` to `user_code` later if users request resume-within-lesson.
- **Right pane changes**: zero.
- **Vertical slides**: not used. Scroll view flattens to linear — matches our section model exactly.
- **Speaker notes**: available if needed for instructor authoring (Phase 2).
