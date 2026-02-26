# Sidebar + Seed + Nav Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a second module to seed data, add next-link to lesson intro overlay, and improve course player sidebar visual hierarchy.

**Architecture:** Three independent changes. Seed script gets a second `INSERT` block for module 2. `LessonOverlay` gets a `hasNext` prop and shows next link on intro view. `AppSidebar`'s `ModuleSection` gets an `isActiveModule` prop that wraps the section in a tinted container and makes the header a Link.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, `@neondatabase/serverless` (seed script), `tsx` runner. No new libraries. Verify with `npx tsc --noEmit`. Seed verified with `npx tsx app/scripts/seed-content.ts` from repo root.

---

## Task 1: Expand seed data to 2 modules

**Files:**
- Modify: `app/scripts/seed-content.ts`

### Context

The seed script currently inserts 1 course + 1 module (`hello-world`) + 3 lessons. We need a second module (`control-flow`) with 3 lessons, quiz, and intro/outro content. The existing module 1 data is **unchanged** — append module 2 content only.

The pattern to follow exactly:
- `assertValidContent(templateName, data)` validates + returns a typed object
- `JSON.stringify(result)` is passed as a tagged template param to `sql\`...\``
- All IDs are hand-coded strings (no UUIDs needed)
- `lesson_count` in the module INSERT must match the number of lessons inserted
- Every lesson needs `intro_content`, `outro_content`, and at least 1 `lesson_section`

### Step 1: Add module 2 insert

After `console.log('  inserted module')` (around line 95), add the second module and its quiz form:

```typescript
const quizForm2 = {
  title: 'Control Flow Quiz',
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      statement: 'Which keyword starts a conditional block in Python?',
      options: [
        { id: 'a', text: 'if' },
        { id: 'b', text: 'when' },
        { id: 'c', text: 'check' },
        { id: 'd', text: 'case' },
      ],
      correctOption: 'a',
      explanation: 'if is the keyword that introduces a conditional block in Python.',
    },
    {
      id: 'q2',
      statement: 'What does a while loop do?',
      options: [
        { id: 'a', text: 'Runs code once for every item in a list' },
        { id: 'b', text: 'Repeats code as long as a condition is True' },
        { id: 'c', text: 'Defines a function' },
        { id: 'd', text: 'Imports a module' },
      ],
      correctOption: 'b',
      explanation: 'A while loop repeats its body as long as the condition evaluates to True.',
    },
    {
      id: 'q3',
      statement: 'What does a for loop iterate over?',
      options: [
        { id: 'a', text: 'Only numbers' },
        { id: 'b', text: 'Only strings' },
        { id: 'c', text: 'Any sequence (list, string, range, etc.)' },
        { id: 'd', text: 'Only dictionaries' },
      ],
      correctOption: 'c',
      explanation: 'A for loop works on any iterable — lists, strings, ranges, tuples, and more.',
    },
  ],
};

await sql`
  INSERT INTO modules (id, course_id, title, slug, description, "order", lesson_count, quiz_form)
  VALUES (
    'module-intro-python-control-flow-001',
    'course-intro-python-001',
    'Control Flow',
    'control-flow',
    'Make decisions and repeat actions — the two most fundamental control structures in programming.',
    2,
    3,
    ${JSON.stringify(quizForm2)}
  )
`;
console.log('  inserted module 2');
```

### Step 2: Add module 2 lessons + test cases

After `console.log('  inserted lesson 2 + test cases')` (around line 204), add the three module-2 lessons:

```typescript
// ── Module 2 lessons ─────────────────────────────────────────────────────────

await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-control-flow-00',
    'module-intro-python-control-flow-001',
    0,
    'Making Decisions with if/else',
    ${'An if statement runs a block of code only when a condition is True. The else block runs when the condition is False.\n\n```python\nif x > 0:\n    print("positive")\nelse:\n    print("not positive")\n```\n\n---\n\nWhen there are more than two cases, elif (short for "else if") adds extra branches.\n\n```python\nif x > 0:\n    return "positive"\nelif x < 0:\n    return "negative"\nelse:\n    return "zero"\n```'},
    ${'def classify_number(n):\n    # Return "positive", "negative", or "zero"\n    pass'},
    ${'def classify_number(n):\n    if n > 0:\n        return "positive"\n    elif n < 0:\n        return "negative"\n    else:\n        return "zero"'},
    'classify_number',
    'Write classify_number(n) that returns "positive" if n > 0, "negative" if n < 0, or "zero" if n == 0.',
    ARRAY['Use if, elif, and else', 'Return the string, not print it'],
    ARRAY['Start with if n > 0', 'elif handles the second condition', 'else catches everything remaining']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES
    ('tc-cf-00-0', 'lesson-intro-python-control-flow-00', 0, 'positive number', '[5]', '"positive"', TRUE),
    ('tc-cf-00-1', 'lesson-intro-python-control-flow-00', 1, 'negative number', '[-3]', '"negative"', TRUE),
    ('tc-cf-00-2', 'lesson-intro-python-control-flow-00', 2, 'zero', '[0]', '"zero"', FALSE)
`;
console.log('  inserted module 2 lesson 0 + test cases');

await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-control-flow-01',
    'module-intro-python-control-flow-001',
    1,
    'Counting Down with while',
    ${'A while loop repeats its body as long as a condition is True. You need a variable to track state and update it each iteration, otherwise the loop runs forever.\n\n```python\ncount = 3\nwhile count >= 0:\n    print(count)\n    count -= 1\n```\n\n---\n\nTo collect results, start with an empty list and append each value. Return the list after the loop.\n\n```python\ndef countdown(n):\n    result = []\n    while n >= 0:\n        result.append(n)\n        n -= 1\n    return result\n```'},
    ${'def countdown(n):\n    # Return a list counting down from n to 0\n    pass'},
    ${'def countdown(n):\n    result = []\n    while n >= 0:\n        result.append(n)\n        n -= 1\n    return result'},
    'countdown',
    'Write countdown(n) that returns a list counting down from n to 0, inclusive.',
    ARRAY['Return a list, not individual values', 'Include 0 in the result'],
    ARRAY['Start with result = []', 'Use result.append(n) inside the loop', 'Decrement n with n -= 1']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES
    ('tc-cf-01-0', 'lesson-intro-python-control-flow-01', 0, 'counts down from 3', '[3]', '[3,2,1,0]', TRUE),
    ('tc-cf-01-1', 'lesson-intro-python-control-flow-01', 1, 'counts down from 1', '[1]', '[1,0]', TRUE),
    ('tc-cf-01-2', 'lesson-intro-python-control-flow-01', 2, 'zero only', '[0]', '[0]', FALSE)
`;
console.log('  inserted module 2 lesson 1 + test cases');

await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-control-flow-02',
    'module-intro-python-control-flow-001',
    2,
    'Summing a List with for',
    ${'A for loop iterates over every item in a sequence. Unlike while, you do not need to manage a counter — Python hands you each item in turn.\n\n```python\nfor item in [1, 2, 3]:\n    print(item)  # prints 1, then 2, then 3\n```\n\n---\n\nTo accumulate a running total, start a variable at zero and add each item to it inside the loop.\n\n```python\ndef sum_list(numbers):\n    total = 0\n    for n in numbers:\n        total += n\n    return total\n```'},
    ${'def sum_list(numbers):\n    # Return the sum of all numbers in the list\n    pass'},
    ${'def sum_list(numbers):\n    total = 0\n    for n in numbers:\n        total += n\n    return total'},
    'sum_list',
    'Write sum_list(numbers) that returns the sum of all integers in the list. Return 0 for an empty list.',
    ARRAY['Return an integer, not a list', 'An empty list should return 0'],
    ARRAY['Start with total = 0', 'Add each item: total += n', 'Return total after the loop']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES
    ('tc-cf-02-0', 'lesson-intro-python-control-flow-02', 0, 'sums [1,2,3]', '[[1,2,3]]', '6', TRUE),
    ('tc-cf-02-1', 'lesson-intro-python-control-flow-02', 1, 'empty list', '[[]]', '0', TRUE),
    ('tc-cf-02-2', 'lesson-intro-python-control-flow-02', 2, 'single item', '[[7]]', '7', FALSE)
`;
console.log('  inserted module 2 lesson 2 + test cases');
```

### Step 3: Add module 2 lesson sections + intro/outro

After `console.log('  seeded lesson_sections, intro_content, and outro_content for lesson 2')` (around line 379), add the module-2 lesson content:

```typescript
// ── Module 2 lesson sections + intro/outro ────────────────────────────────────

const cf0Id = 'lesson-intro-python-control-flow-00';

const cf0Intro = assertValidContent('lesson-intro', {
  hook: 'Every program needs to make choices. The if statement is how Python decides which code to run based on a condition.',
  outcomes: [
    'Use if, elif, and else to branch program flow',
    'Compare values with > < == operators',
    'Write a function that returns different strings for different inputs',
  ],
  estimated_minutes: 5,
});
await sql`UPDATE lessons SET intro_content = ${JSON.stringify(cf0Intro)} WHERE id = ${cf0Id}`;

const cf0Outro = assertValidContent('lesson-outro', {
  recap: 'You used if, elif, and else to branch based on whether a number is positive, negative, or zero. Each branch returns a different string — Python only runs the first matching branch.',
  next_lesson_teaser: 'Next: while loops let you repeat code until a condition changes.',
});
await sql`UPDATE lessons SET outro_content = ${JSON.stringify(cf0Outro)} WHERE id = ${cf0Id}`;

const cf0Sec0 = assertValidContent('code-section', {
  explanation: 'An if statement runs its indented body only when the condition is True. The else block runs when all conditions above it are False. Together they guarantee exactly one branch runs.',
  code: 'x = 5\nif x > 0:\n    print("positive")\nelse:\n    print("not positive")',
  language: 'python',
  takeaway: 'if/else guarantees exactly one branch runs.',
});
await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (${'ls-cf-00-0'}, ${cf0Id}, ${0}, 'code-section', ${JSON.stringify(cf0Sec0)})
  ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
`;

const cf0Sec1 = assertValidContent('code-section', {
  explanation: 'When there are more than two cases, elif adds extra branches between if and else. Python checks each condition in order and runs the first matching branch — the rest are skipped.',
  code: 'def classify_number(n):\n    if n > 0:\n        return "positive"\n    elif n < 0:\n        return "negative"\n    else:\n        return "zero"',
  language: 'python',
  takeaway: 'elif chains multiple conditions — only the first match runs.',
});
await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (${'ls-cf-00-1'}, ${cf0Id}, ${1}, 'code-section', ${JSON.stringify(cf0Sec1)})
  ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
`;

console.log('  seeded lesson_sections, intro_content, and outro_content for module 2 lesson 0');

const cf1Id = 'lesson-intro-python-control-flow-01';

const cf1Intro = assertValidContent('lesson-intro', {
  hook: 'Sometimes you need to repeat an action until something changes. while loops keep running as long as a condition stays True.',
  outcomes: [
    'Write a while loop with a condition and an update step',
    'Collect results in a list using append()',
    'Return a list from a function',
  ],
  estimated_minutes: 6,
});
await sql`UPDATE lessons SET intro_content = ${JSON.stringify(cf1Intro)} WHERE id = ${cf1Id}`;

const cf1Outro = assertValidContent('lesson-outro', {
  recap: 'You built a while loop that counts down from n to 0, collecting each value in a list. The key pattern is: start a container, append inside the loop, return after.',
  next_lesson_teaser: "Next: for loops iterate over sequences without manual counters — Python handles the tracking for you.",
});
await sql`UPDATE lessons SET outro_content = ${JSON.stringify(cf1Outro)} WHERE id = ${cf1Id}`;

const cf1Sec0 = assertValidContent('code-section', {
  explanation: 'A while loop checks its condition before each iteration. When the condition becomes False, the loop stops. You must update the variable inside the loop — if the condition never becomes False, the loop runs forever.',
  code: 'count = 3\nwhile count >= 0:\n    print(count)  # prints 3, 2, 1, 0\n    count -= 1    # count -= 1 is shorthand for count = count - 1',
  language: 'python',
  takeaway: 'Always update the loop variable — otherwise it runs forever.',
});
await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (${'ls-cf-01-0'}, ${cf1Id}, ${0}, 'code-section', ${JSON.stringify(cf1Sec0)})
  ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
`;

const cf1Sec1 = assertValidContent('code-section', {
  explanation: 'To return multiple values from a loop, collect them in a list. Start with an empty list before the loop, use append() inside to add each value, then return the list after the loop exits.',
  code: 'def countdown(n):\n    result = []\n    while n >= 0:\n        result.append(n)\n        n -= 1\n    return result\n\ncountdown(3)  # [3, 2, 1, 0]',
  language: 'python',
  takeaway: 'result = [] → append inside loop → return after loop.',
});
await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (${'ls-cf-01-1'}, ${cf1Id}, ${1}, 'code-section', ${JSON.stringify(cf1Sec1)})
  ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
`;

console.log('  seeded lesson_sections, intro_content, and outro_content for module 2 lesson 1');

const cf2Id = 'lesson-intro-python-control-flow-02';

const cf2Intro = assertValidContent('lesson-intro', {
  hook: 'for loops are the most common loop in Python. They hand you each item from a sequence in turn — no counter variable needed.',
  outcomes: [
    'Use a for loop to iterate over a list',
    'Accumulate a running total with +=',
    'Write a function that reduces a list to a single value',
  ],
  estimated_minutes: 5,
});
await sql`UPDATE lessons SET intro_content = ${JSON.stringify(cf2Intro)} WHERE id = ${cf2Id}`;

const cf2Outro = assertValidContent('lesson-outro', {
  recap: 'You used a for loop to sum every item in a list into a running total. The accumulator pattern — start at zero, add each item — works for sums, products, counts, and more.',
  next_lesson_teaser: "You've finished the module — take the quiz to lock in what you've learned.",
});
await sql`UPDATE lessons SET outro_content = ${JSON.stringify(cf2Outro)} WHERE id = ${cf2Id}`;

const cf2Sec0 = assertValidContent('code-section', {
  explanation: 'A for loop iterates over any sequence — list, string, range. Python automatically assigns each element to the loop variable. You never need to track an index or worry about going out of bounds.',
  code: 'for item in [10, 20, 30]:\n    print(item)  # prints 10, then 20, then 30',
  language: 'python',
  takeaway: 'for gives you each item directly — no index management.',
});
await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (${'ls-cf-02-0'}, ${cf2Id}, ${0}, 'code-section', ${JSON.stringify(cf2Sec0)})
  ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
`;

const cf2Sec1 = assertValidContent('code-section', {
  explanation: 'The accumulator pattern starts a variable at a neutral value (0 for addition) and updates it with each item in the loop. After the loop, the variable holds the final result.',
  code: 'def sum_list(numbers):\n    total = 0\n    for n in numbers:\n        total += n  # total = total + n\n    return total\n\nsum_list([1, 2, 3])  # 6',
  language: 'python',
  takeaway: 'Start at 0, += each item, return after the loop.',
});
await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (${'ls-cf-02-1'}, ${cf2Id}, ${1}, 'code-section', ${JSON.stringify(cf2Sec1)})
  ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
`;

console.log('  seeded lesson_sections, intro_content, and outro_content for module 2 lesson 2');

// ── Module 2 intro/outro ──────────────────────────────────────────────────────

const mod2Id = 'module-intro-python-control-flow-001';

const mod2Intro = assertValidContent('module-intro', {
  title: 'Control Flow',
  description: 'Conditional branches and loops are what make programs dynamic. In this module you will learn to make decisions with if/elif/else and repeat actions with while and for.',
  what_you_learn: [
    'Use if, elif, and else to branch based on conditions',
    'Write while loops that repeat until a condition changes',
    'Use for loops to iterate over any sequence',
    'Apply the accumulator pattern to reduce a list to a single value',
  ],
});
await sql`UPDATE modules SET intro_content = ${JSON.stringify(mod2Intro)} WHERE id = ${mod2Id}`;

const mod2Outro = assertValidContent('module-outro', {
  recap: "You now control when code runs (if/elif/else) and how many times it runs (while, for). These two capabilities — branching and looping — underpin almost every algorithm you will ever write.",
  next_module: 'Data Structures — lists, dictionaries, and how to work with collections of data.',
});
await sql`UPDATE modules SET outro_content = ${JSON.stringify(mod2Outro)} WHERE id = ${mod2Id}`;

console.log('  seeded intro_content and outro_content for module 2');
```

### Step 4: Run seed and verify

```bash
cd /path/to/repo && npx tsx app/scripts/seed-content.ts
```

Expected output:
```
Seeding content...
  purged existing content
  inserted course
  inserted module
  inserted module 2
  inserted lesson 0 + test cases
  ...
  inserted module 2 lesson 0 + test cases
  inserted module 2 lesson 1 + test cases
  inserted module 2 lesson 2 + test cases
  seeded lesson_sections, intro_content, and outro_content for lesson 0
  ...
  seeded lesson_sections, intro_content, and outro_content for module 2 lesson 2
  seeded intro_content and outro_content for module
  seeded intro_content and outro_content for module 2
  seeded intro_content and outro_content for course

Running validation...
✓ All content valid.
```

### Step 5: Commit

```bash
git add app/scripts/seed-content.ts
git commit -m "feat: add control-flow module to seed data"
```

---

## Task 2: Add next link to lesson intro overlay

**Files:**
- Modify: `app/src/components/lesson/lesson-overlay.tsx`
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

### Step 1: Update `lesson-overlay.tsx`

Add `hasNext: boolean` to the interface and destructuring, then show the next link on the intro view (top-right slot currently only shows next for outro).

The current top-right `<div>` (lines 56–68) is:
```tsx
<div className="w-20 flex justify-end">
  {view === 'outro' ? (
    <Link href={nextHref} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors">
      next
      <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  ) : null}
</div>
```

Replace with (showing next on both intro and outro):
```tsx
<div className="w-20 flex justify-end">
  {(view === 'outro' || (view === 'intro' && hasNext)) ? (
    <Link href={nextHref} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors">
      next
      <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  ) : null}
</div>
```

Full updated interface and destructuring:

```tsx
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
  hasNext: boolean;   // ← add this
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
  hasNext,           // ← add this
  onEnterLesson,
}: LessonOverlayProps) {
```

### Step 2: Update `code-lesson-layout.tsx`

`hasNext` is already computed at line ~90:
```typescript
const hasNext = position < lessonCount;
```

Find the `<LessonOverlay` JSX block and add the `hasNext` prop:

```tsx
// Before:
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

// After:
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
  hasNext={hasNext}
  onEnterLesson={() => setView('content')}
/>
```

### Step 3: Type-check

```bash
cd /path/to/repo/app && npx tsc --noEmit
```

Expected: no errors.

### Step 4: Commit

```bash
git add app/src/components/lesson/lesson-overlay.tsx app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: show next link on lesson intro overlay"
```

---

## Task 3: Sidebar visual hierarchy

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx`

### Step 1: Add `isActiveModule` prop to `ModuleSection`

Add `isActiveModule: boolean` to the props interface and destructuring:

```tsx
// Before:
const ModuleSection = memo(function ModuleSection({
  module,
  courseSlug,
  activeModuleSlug,
  activeContentType,
  activeOrder,
  contentCompletion,
}: {
  module: CourseWithModules["modules"][number];
  courseSlug: string;
  activeModuleSlug: string | null;
  activeContentType: "lesson" | "quiz" | null;
  activeOrder: number | null;
  contentCompletion: Record<string, boolean>;
}) {

// After:
const ModuleSection = memo(function ModuleSection({
  module,
  courseSlug,
  activeModuleSlug,
  activeContentType,
  activeOrder,
  contentCompletion,
  isActiveModule,
}: {
  module: CourseWithModules["modules"][number];
  courseSlug: string;
  activeModuleSlug: string | null;
  activeContentType: "lesson" | "quiz" | null;
  activeOrder: number | null;
  contentCompletion: Record<string, boolean>;
  isActiveModule: boolean;
}) {
```

### Step 2: Replace the module header div with a Link and apply active tint

Replace the entire `return (` block inside `ModuleSection` with:

```tsx
return (
  <div className={isActiveModule ? 'rounded-lg bg-primary/5 ring-1 ring-primary/10 px-1 py-1' : ''}>
    {/* Module header — link to module overview */}
    <Link
      href={`/dashboard/course/${courseSlug}/${module.slug}`}
      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
    >
      <span className="text-xs font-semibold text-foreground truncate flex-1">
        {module.title}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
        {completedCount}/{totalCount}
      </span>
    </Link>

    {/* Content items — always visible */}
    <div className="ml-3 pl-3 border-l border-border/50 mt-0.5 space-y-0.5">
      {module.contentItems.map((item) => {
        const completionKey = item.type === "quiz" ? `${module.id}:quiz` : `${module.id}:lesson-${item.index}`;
        const isCompleted = contentCompletion[completionKey] ?? false;

        const order = item.type === "lesson" ? item.index + 1 : null;
        const isActive =
          activeModuleSlug === module.slug &&
          activeContentType === item.type &&
          (item.type === "quiz" || activeOrder === order);

        const href =
          item.type === "quiz"
            ? `/dashboard/course/${courseSlug}/${module.slug}/quiz`
            : `/dashboard/course/${courseSlug}/${module.slug}/lesson/${order}`;

        return (
          <Link
            key={completionKey}
            href={href}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : isCompleted
                  ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {isActive ? (
              <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : item.type === "quiz" ? (
              <Diamond className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  </div>
);
```

### Step 3: Update the modules map — pass `isActiveModule`, increase spacing

Find the `activeCourse.modules.map` call inside the main component. Currently wrapped in `<div className="space-y-0.5">`:

```tsx
// Before:
<div className="space-y-0.5">
  {activeCourse.modules.map((mod) => (
    <ModuleSection
      key={mod.id}
      module={mod}
      courseSlug={activeCourse.slug}
      activeModuleSlug={moduleSlug}
      activeContentType={contentType}
      activeOrder={order}
      contentCompletion={contentCompletion}
    />
  ))}
</div>

// After:
<div className="space-y-3">
  {activeCourse.modules.map((mod) => (
    <ModuleSection
      key={mod.id}
      module={mod}
      courseSlug={activeCourse.slug}
      activeModuleSlug={moduleSlug}
      activeContentType={contentType}
      activeOrder={order}
      contentCompletion={contentCompletion}
      isActiveModule={moduleSlug === mod.slug}
    />
  ))}
</div>
```

### Step 4: Type-check

```bash
cd /path/to/repo/app && npx tsc --noEmit
```

Expected: no errors.

### Step 5: Commit

```bash
git add app/src/components/shared/app-sidebar.tsx
git commit -m "feat: sidebar module headers as links, active tint, semibold, wider spacing"
```
