# Web Landing Page Redesign
**Date:** 2026-02-28
**Approach:** Reorder + Add (Approach B)
**Goal:** Direct platform signup (`app.zuzu.codes/auth/sign-up`)

---

## Context

The current `web/` landing page has strong design fundamentals (dark/tech aesthetic, good animation system, solid copy) but suffers from:
- **Wrong positioning**: "AI-native operations / MBA-level automation management" doesn't match the actual product (Python fundamentals for beginners)
- **Missing sections**: No social proof, no FAQ, no footer CTA, no actual prices
- **Placeholder elements**: 0% progress bar in hero card, play button with no video
- **Dead code**: `components/sections/` directory (15+ files) + unused root-level components + unused libraries (GSAP, Motion, OGL)

---

## Product & Positioning

**What zuzu.codes is (Phase 1):**
Python / coding fundamentals for non-coders. Structured, hands-on, interactive coding exercises with Judge0 execution. The young learners track is live; professional tracks (lawyers, doctors, etc.) are coming.

**Vision:**
"Applied mini software engineering for every profession" — tracks tailored to each domain, starting with young learners.

**Positioning:**
Aspirational, not fear-based. "Python for the next generation of builders." The AI wave makes coding skills more valuable, not less. zuzu.codes is the structured on-ramp.

**Primary audience (now):**
Young learners / students / early-career people who want to build real skills before (or at the start of) their careers.

**Pricing:**
7-day trial (minimal price) → monthly subscription. Prices TBD.

---

## Section Architecture

| # | Section | Status | Key Change |
|---|---------|--------|------------|
| 1 | Header | Evolve | Minor polish, keep glassmorphism |
| 2 | Hero | Rebuild | New headline/positioning, remove placeholder card |
| 3 | Shift | Evolve | Rewrite copy: "AI raises the bar, not lowers it" |
| 4 | Method | Evolve | Light copy update to connect to Python learning |
| 5 | Audience | Rebuild | Replace professional personas with young learner personas |
| 6 | Courses | Evolve | Reframe as "Python Learning Track", tease future tracks |
| 7 | Social Proof | **New** | 3 stat bars + 3-4 testimonial cards |
| 8 | Pricing | Rebuild | Trial → Subscription (2-state), remove 3-tier complexity |
| 9 | FAQ | **New** | 5-6 questions covering objections |
| 10 | Footer CTA | **New** | Big bold final signup nudge |
| 11 | Footer | Evolve | Minor polish |

---

## Section Designs

### 1. Header
Keep existing structure. Minor polish: update nav links if needed when section names change.

### 2. Hero (Rebuild)

**Tone:** Aspirational, not fear-based.
**Headline direction:** "Python for the next generation of builders." or "The place to learn coding if you're serious about what's coming."
**Subheading:** "Structured, hands-on Python learning for students and early-career learners. Build real skills. Build real things."
**CTA:** Single primary button — "Start 7-Day Trial" → `app.zuzu.codes/auth/sign-up`
**Secondary:** "See what's inside ↓" anchor link
**Visual:** Remove the "Featured Course Card" with 0% progress bar. Replace with a code editor visual or step-progression showing beginner → intermediate journey.
**Keep:** Neural grid background, particle effects, floating badges (update copy: "Python for beginners", "AI-ready skills")

### 3. Shift (Evolve)

Reframe narrative: AI is raising the bar for what professionals and learners need. People who can code + use AI will outperform those who can't. This isn't about automation tools — it's about having foundational coding instincts.

### 4. Method (Evolve)

Keep 4-quadrant framework, it's genuinely differentiated. Update copy to connect to "learning Python" context rather than "AI operations."

### 5. Audience (Rebuild)

Replace 4 professional personas with young learner personas:
- **The Student (16-22)** — Learning to code before starting their career
- **The Career Starter (22-28)** — First job, needs coding to advance faster
- **The Career Switcher** — Moving into tech or adding technical skills to their existing role
- **The Curious Learner** — Wants to understand how software works, not career-driven

### 6. Courses (Evolve)

Reframe the section heading as "The Python Learning Track." Keep the detailed module/lesson breakdown. Add a small callout at the bottom: "More tracks coming: Law, Medicine, Finance, and more — bringing applied coding to every profession."

### 7. Social Proof (New)

**Stats bar (3 items):**
- Interactive coding exercises
- Lessons written
- Python problems to solve
*(Use real numbers when available, or placeholder aspirational stats for launch)*

**Testimonials (3-4 cards):**
Short quotes from beta students or early users. Dark glassmorphism cards with name, role/background.

### 8. Pricing (Rebuild)

**Structure:** Two-state display, not 3 tiers.
- **Trial**: $X for 7 days — full access to try the course
- **Full Access**: $X/month — continue after trial

Clean card layout. Single CTA per option. No complex tier comparison. Emphasize "cancel anytime."

### 9. FAQ (New)

Questions to include:
1. Do I need any prior coding experience?
2. How long does the course take?
3. What happens after the 7-day trial ends?
4. Is this for me if I'm not planning a career in tech?
5. How is this different from freeCodeCamp or Codecademy?
6. Can I cancel anytime?

### 10. Footer CTA (New)

Full-width dark section. Large headline ("Ready to start building?"), 1 line of copy, single "Start 7-Day Trial" button with gradient border animation. Last conversion touch before footer.

### 11. Footer (Evolve)

Minor polish. Centralize the WhatsApp number. Update nav links to match new section names.

---

## Code Cleanup (In Scope)

These should be done alongside or before the redesign:
- Delete `web/src/components/sections/` directory (15+ unused files)
- Delete unused root-level components: `Hero.tsx`, `Outcomes.tsx`, `Curriculum.tsx`, `LessonFormat.tsx`, `Footer.tsx`, `BlurText.tsx`, `FadeContent.tsx`, `GlareHover.tsx`, `SpotlightCard.tsx`
- Remove unused `components/index.ts`
- Remove unused packages from `package.json`: `gsap`, `@gsap/react`, `motion`, `ogl`
- Centralize contact info (WhatsApp number) into `lib/constants.ts`

---

## Design System

Keep current:
- Dark/tech aesthetic with neural grid + particle effects
- Purple accent color system (OKLch-based CSS variables)
- DM Sans (body) / Playfair Display (headings) / JetBrains Mono (code)
- Glassmorphism, gradient borders, card-lift hover effects
- `@media (prefers-reduced-motion: reduce)` compliance

---

## Out of Scope

- Backend changes
- App/ platform changes
- New animations beyond what the current system supports
- Email capture / newsletter integration (can be added later)
- Blog / SEO content
