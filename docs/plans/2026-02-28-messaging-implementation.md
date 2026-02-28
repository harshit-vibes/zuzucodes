# Messaging Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Python-centric copy with coding/AI-era positioning across all 10 landing page components.

**Architecture:** Copy-only changes — no new files, no layout changes, no new components. Each task touches exactly one file. All 10 tasks are fully independent and can run in parallel. Design spec at `docs/plans/2026-02-28-messaging-redesign.md`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4. Verify with `cd web && npm run build` (must produce 0 errors). No unit tests — verification is build pass + visual review of changed strings.

---

## Parallel Group: All 10 tasks are independent — run in parallel

---

### Task 1: hero-section.tsx

**File:** `web/src/components/landing/hero-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/hero-section.tsx` in full.

**Step 2: Apply these exact copy changes**

| Location | Old | New |
|----------|-----|-----|
| Top badge | `"Young Learners Track — now open"` | `"Now open — Coding for the AI era"` |
| Headline | `"Python for the next generation of builders."` | `"The AI era rewards people who can build. Here's where you start."` |
| Subheading | `"Structured, hands-on Python learning for students and early-career learners. Build real skills. Build real things."` | `"Structured coding for students and early-career learners — starting from zero. Build real skills. Build real things."` |
| Milestone card 1 title | `"Hello, World"` | `"Write your first program"` |
| Milestone card 1 desc | `"Write your first line of Python"` | `"Understand how code actually works"` |
| Milestone card 2 title | `"Build functions"` | `"Solve real problems"` |
| Milestone card 2 desc | `"Solve real problems with code"` | `"Build logic, not just syntax"` |
| Milestone card 3 title | `"Automate tasks"` | `"Ship something real"` |
| Milestone card 3 desc | `"Replace hours of manual work"` | `"Go from learner to builder"` |
| Floating badge 2 | `"AI-ready Skills"` | `"Built for the AI era"` |

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/hero-section.tsx
git commit -m "feat(web): update hero copy — coding/AI era positioning"
```

---

### Task 2: shift-section.tsx

**File:** `web/src/components/landing/shift-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/shift-section.tsx` in full.

**Step 2: Replace the 3 body paragraphs entirely**

Replace all paragraph body text with:

**Paragraph 1:**
```
Something shifted. Tools that used to take years to build now get shipped in a weekend. AI is building apps, writing code, designing products — and it's only getting faster.
```

**Paragraph 2:**
```
But there's a gap between watching something get built and knowing how to build it yourself. Prompting is not programming. Clicking is not creating. The people who will run this era aren't just using the tools — they understand them.
```

**Paragraph 3:**
```
Coding is no longer a profession. It's a baseline. And the people who learn it properly — with the right structure, the right practice, the right guidance — become force multipliers in every room they walk into.
```

Keep the "The Shift" heading and all JSX structure identical. Only the text content of the three paragraphs changes.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/shift-section.tsx
git commit -m "feat(web): rewrite shift section — AI era narrative"
```

---

### Task 3: method-section.tsx

**File:** `web/src/components/landing/method-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/method-section.tsx` in full.

**Step 2: Apply these exact copy changes**

| Location | Old | New |
|----------|-----|-----|
| Intro copy | `"Every topic traverses four quadrants — a complete learning cycle that produces deep, transferable competence."` | `"Every topic traverses four quadrants — a complete learning cycle that produces deep, transferable understanding. Not just the ability to follow instructions. The ability to think in code."` |
| "Why this works" closing line | `"Complete the quadrant. Build lasting competence."` | `"Complete the quadrant. Think in code."` |

Keep heading "The Zuzu Method", subheading "We don't teach tools. We build instincts.", and all quadrant names/descriptions unchanged.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/method-section.tsx
git commit -m "feat(web): update method section copy — think in code"
```

---

### Task 4: audience-section.tsx

**File:** `web/src/components/landing/audience-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/audience-section.tsx` in full.

**Step 2: Replace the 4 persona descriptions and closing copy**

**Card 1 — The Student:**
```
You're watching the world change and you want to be ready for it — not playing catch-up when you graduate. Every line of code you write now is compound interest on your career.
```

**Card 2 — The Career Starter:**
```
You just started your first job and you can already see AI changing what gets valued. You'd rather be the person who builds the tools than the one who waits to be handed them.
```

**Card 3 — The Career Switcher:**
```
You're moving toward tech — or bringing technical depth to the profession you already love. You don't need a degree. You need a structured starting point.
```

**Card 4 — The Curious Builder:**
```
You've seen what people build with AI and you want to understand how it works. Not just use it. Actually understand it — and build something of your own.
```

**Closing copy:**
```
Whether you've never written a line of code or you've tinkered and gotten stuck, the Zuzu Method gives you the structured path to go from curious to capable.
```
(Keep the bold on **curious** and **capable** if it exists in the current markup.)

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/audience-section.tsx
git commit -m "feat(web): update audience personas — AI era framing"
```

---

### Task 5: courses-section.tsx

**File:** `web/src/components/landing/courses-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/courses-section.tsx` in full.

**Step 2: Apply these exact copy changes**

| Location | Old | New |
|----------|-----|-----|
| Section heading | `"The Python Learning Track"` | `"Your Coding Foundation"` |
| Section subheading | `"One focused track. Twelve lessons. Real Python, from the very first line."` | `"One focused track. Twelve lessons. Real code, from the very first line."` |
| Course card title | `"Python Foundations"` | `"Coding Foundations"` |
| Course card description | `"From zero to confidently writing Python that solves real problems."` | `"From zero to confidently writing code that solves real problems."` |
| Outcome 1 | `"Write Python programs from scratch with confidence"` | `"Write programs from scratch with confidence"` |
| Outcome 3 | `"The foundation to learn any framework or library next"` | `"The foundation to learn any framework, language, or AI tool next"` |
| More tracks copy | `"Applied Python for every profession — bringing real coding skills to the domains that need them most."` | `"Applied coding for every profession — bringing real programming skills to the domains that need them most."` |
| Track labels | `"Python for Law"`, `"Python for Medicine"`, `"Python for Finance"`, `"Python for Marketing"` | `"Coding for Law"`, `"Coding for Medicine"`, `"Coding for Finance"`, `"Coding for Marketing"` |

Also add a small badge/tag on the course card that reads `"Taught in Python"` — place it near the course card title or as a subtitle label, styled as a muted text tag (e.g. `<span className="text-xs text-muted-foreground">Taught in Python</span>`).

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/courses-section.tsx
git commit -m "feat(web): reframe courses section — coding identity, Python as detail"
```

---

### Task 6: social-proof-section.tsx

**File:** `web/src/components/landing/social-proof-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/social-proof-section.tsx` in full.

**Step 2: Update testimonials 2 and 3**

**Testimonial 2 (Rohan K.)** — replace quote only:
```
I don't work in tech. But I kept seeing people around me use AI to build things and I felt completely left out. Three weeks in, I wrote a script that saved me two hours a week. That feeling was worth every rupee.
```

**Testimonial 3 (Aanya S.)** — replace quote only:
```
The 4-quadrant method is unlike anything I've seen. It made me actually think — not just copy examples. I feel like I'm learning to code, not learning to pass a course.
```

Keep testimonial 1 (Priya M.) unchanged. Keep all names, roles, and card structure unchanged.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/social-proof-section.tsx
git commit -m "feat(web): update testimonials — AI era / FOMO angle"
```

---

### Task 7: pricing-section.tsx

**File:** `web/src/components/landing/pricing-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/pricing-section.tsx` in full.

**Step 2: Apply these exact copy changes**

| Location | Old | New |
|----------|-----|-----|
| Section subheading | `"Try it first. Commit only if it works for you."` | `"Start free. Commit only when it clicks."` |
| Trial plan feature 1 | `"Full access to Python Foundations track"` | `"Full access to the Coding Foundations track"` |
| Full Access feature 2 | `"Continue after trial"` (or similar) | `"Continue building past day 7"` |

Keep all pricing amounts (`$XX`), plan titles, CTA buttons, and structure unchanged.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/pricing-section.tsx
git commit -m "feat(web): update pricing copy — coding identity"
```

---

### Task 8: faq-section.tsx

**File:** `web/src/components/landing/faq-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/faq-section.tsx` in full.

**Step 2: Update answers for Q1, Q4, Q5**

**Q1 answer** (question: "Do I need any prior coding experience?"):
```
None at all. We start from the very first concept — what code is, how a computer reads it, and how to write your first program. No shortcuts, no assumptions.
```

**Q4 answer** (question: "Is this for me if I'm not planning a career in tech?"):
```
Absolutely. In the AI era, knowing how to code makes you better at almost any job — it's like knowing Excel was 20 years ago, but far more powerful. It gives you the ability to build tools, automate work, and understand what AI is actually doing.
```

**Q5 answer** (question: "How is this different from freeCodeCamp or Codecademy?"):
```
Those platforms give you exercises. zuzu.codes gives you a learning system built for this moment — when AI makes coding relevant to everyone, not just developers. The 4-quadrant method builds genuine understanding, not just the ability to pass tests.
```

Keep questions 2, 3, 6 and all question text unchanged.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/faq-section.tsx
git commit -m "feat(web): update FAQ answers — AI era context"
```

---

### Task 9: footer-cta-section.tsx

**File:** `web/src/components/landing/footer-cta-section.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/footer-cta-section.tsx` in full.

**Step 2: Update the subheading only**

| Location | Old | New |
|----------|-----|-----|
| Subheading | `"Join the students already learning Python the right way. Try it free for 7 days."` | `"Join the next generation of builders. Try it free for 7 days."` |

Keep heading "Ready to start building?", CTA button "Start 7-Day Trial", and supporting text unchanged.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/footer-cta-section.tsx
git commit -m "feat(web): update footer CTA subheading"
```

---

### Task 10: footer.tsx

**File:** `web/src/components/landing/footer.tsx`

**Step 1: Read the file**
Read `web/src/components/landing/footer.tsx` in full.

**Step 2: Apply these exact copy changes**

| Location | Old | New |
|----------|-----|-----|
| Brand tagline | `"Structured Python learning for the next generation of builders."` | `"Structured coding for the AI era."` |
| Product nav link label | `"Python Foundations"` | `"Coding Foundations"` |

Keep all other links, copyright, and structure unchanged.

**Step 3: Verify build**
```bash
cd web && npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

**Step 4: Commit**
```bash
git add web/src/components/landing/footer.tsx
git commit -m "feat(web): update footer tagline and nav — coding identity"
```
