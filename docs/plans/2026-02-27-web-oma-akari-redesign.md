# Web Landing Page: Oma-Akari Structural Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the zuzu.codes landing page from 5 to 12 scroll-snap sections matching the oma-akari structure, with header text-link navigation, new components (Benefits, Stats, Instructor, Testimonials, FAQ, CTA/Footer), and full responsive design — while keeping the zuzu.codes brand (cream/gold/Instrument Serif).

**Architecture:** All work is in `web/`. New section components are added to `web/src/components/sections/`. The fixed `Footer` is removed and its Terms/Privacy dialog logic moves into the new `CTASection`. Page wiring happens last in `page.tsx`.

**Tech Stack:** Next.js 16, React 19, Framer Motion (`motion/react`), Tailwind CSS v4, CSS custom properties, no additional packages needed.

---

## Task 1: Add CSS Tokens for New Sections + Nav Links

**Files:**
- Modify: `web/src/app/globals.css`

**Step 1: Add dark section tokens and new utility classes**

In `globals.css`, add after the `--shadow-gold` line (after line 45):

```css
/* Dark section */
--dark-bg: #1A1A1A;
--dark-text: #F5F3EF;
--dark-border: rgba(255, 255, 255, 0.1);
```

Add after `.bg-warm-gray`:

```css
.bg-dark {
  background: var(--dark-bg);
  color: var(--dark-text);
}
```

Add after `.btn-secondary:hover` block:

```css
/* Secondary button on dark backgrounds */
.btn-secondary-dark {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 16px 32px;
  background: transparent;
  color: var(--dark-text);
  font-weight: 500;
  font-size: 15px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  text-decoration: none;
  transition: all var(--duration-normal) var(--ease-out);
}

.btn-secondary-dark:hover {
  border-color: var(--gold);
  color: var(--gold);
  transform: translateY(-2px);
}
```

Add after `.section-dot.active` block (replacing or after section-dots styles):

```css
/* Nav text links (replaces section-dots) */
.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-medium);
  text-decoration: none;
  cursor: pointer;
  padding: 6px 2px;
  border-bottom: 1px solid transparent;
  transition: all var(--duration-normal) var(--ease-out);
  background: none;
  border: none;
  border-bottom: 1px solid transparent;
  font-family: 'DM Sans', system-ui, sans-serif;
}

.nav-link:hover,
.nav-link.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

/* Mobile menu */
.mobile-menu {
  position: absolute;
  top: var(--header-height);
  left: 0;
  right: 0;
  background: rgba(254, 253, 251, 0.97);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: var(--sp-md) var(--sp-lg);
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}
```

Add corner decoration CSS after `.quadrant-cell` block:

```css
/* Corner decorations for hero section */
.corner-line {
  position: absolute;
  width: 48px;
  height: 48px;
  pointer-events: none;
}

.corner-line::before,
.corner-line::after {
  content: '';
  position: absolute;
  background: var(--gold);
  opacity: 0.25;
}

.corner-line.tl { top: 24px; left: 24px; }
.corner-line.tl::before { top: 0; left: 0; width: 100%; height: 1px; }
.corner-line.tl::after  { top: 0; left: 0; width: 1px; height: 100%; }

.corner-line.tr { top: 24px; right: 24px; }
.corner-line.tr::before { top: 0; right: 0; width: 100%; height: 1px; }
.corner-line.tr::after  { top: 0; right: 0; width: 1px; height: 100%; }

.corner-line.bl { bottom: 24px; left: 24px; }
.corner-line.bl::before { bottom: 0; left: 0; width: 100%; height: 1px; }
.corner-line.bl::after  { bottom: 0; left: 0; width: 1px; height: 100%; }

.corner-line.br { bottom: 24px; right: 24px; }
.corner-line.br::before { bottom: 0; right: 0; width: 100%; height: 1px; }
.corner-line.br::after  { bottom: 0; right: 0; width: 1px; height: 100%; }

@media (min-width: 768px) {
  .corner-line { width: 64px; height: 64px; }
  .corner-line.tl, .corner-line.tr { top: 36px; }
  .corner-line.bl, .corner-line.br { bottom: 36px; }
  .corner-line.tl, .corner-line.bl { left: 36px; }
  .corner-line.tr, .corner-line.br { right: 36px; }
}
```

**Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds (CSS-only changes, no TS errors).

**Step 3: Commit**

```bash
cd web && git add src/app/globals.css
git commit -m "style(web): add dark section tokens, nav-link, corner decoration, and dark button CSS"
```

---

## Task 2: Rewrite Header — Text Links + Mobile Hamburger

**Files:**
- Modify: `web/src/components/sections/Header.tsx`

**Step 1: Replace the entire file content**

```tsx
'use client';

import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import { useState, useCallback } from 'react';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

const navLinks = [
  { label: 'Method', id: 'method' },
  { label: 'Courses', id: 'courses' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'FAQ', id: 'faq' },
];

interface HeaderProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function Header({ containerRef }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  return (
    <header className="header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
      {/* Progress bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--gold)] origin-left opacity-80"
        style={{ scaleX }}
      />

      <div className="header-inner">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href="#shift"
            onClick={(e) => { e.preventDefault(); scrollTo('shift'); }}
            className="text-lg font-medium text-[var(--text-dark)] no-underline"
          >
            zuzu<span className="text-[var(--gold)]">.</span>codes
          </a>
        </motion.div>

        {/* Desktop nav links */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:flex items-center gap-8"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="nav-link"
            >
              {link.label}
            </button>
          ))}
        </motion.nav>

        {/* Right: CTA + hamburger */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm py-2.5 px-5 hidden sm:inline-flex"
          >
            Get Started
          </a>

          {/* Hamburger (mobile only) */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="block w-5 h-[1.5px] bg-[var(--text-dark)] origin-center"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block w-5 h-[1.5px] bg-[var(--text-dark)]"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="block w-5 h-[1.5px] bg-[var(--text-dark)] origin-center"
            />
          </button>
        </motion.div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mobile-menu md:hidden"
          >
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="nav-link text-base py-2"
              >
                {link.label}
              </button>
            ))}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm py-2.5 px-5 mt-2 self-start"
            >
              Get Started
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit && npm run build
```

Expected: No TypeScript errors, build succeeds.

**Step 3: Commit**

```bash
git add web/src/components/sections/Header.tsx
git commit -m "feat(web): replace dot navigation with text links + mobile hamburger"
```

---

## Task 3: Update ShiftSection — Corner Decorations

**Files:**
- Modify: `web/src/components/sections/ShiftSection.tsx`

**Step 1: Add corner decorations to the section**

Change the section wrapper from:
```tsx
<section id="shift" className="section bg-cream">
```
to:
```tsx
<section id="shift" className="section bg-cream" style={{ position: 'relative' }}>
  {/* Corner decorations */}
  <div className="corner-line tl" aria-hidden="true" />
  <div className="corner-line tr" aria-hidden="true" />
  <div className="corner-line bl" aria-hidden="true" />
  <div className="corner-line br" aria-hidden="true" />
```

The full updated file:

```tsx
'use client';

import { motion } from 'motion/react';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

export function ShiftSection() {
  return (
    <section id="shift" className="section bg-cream" style={{ position: 'relative' }}>
      {/* Corner decorations */}
      <div className="corner-line tl" aria-hidden="true" />
      <div className="corner-line tr" aria-hidden="true" />
      <div className="corner-line bl" aria-hidden="true" />
      <div className="corner-line br" aria-hidden="true" />

      <div className="w-full max-w-[680px]">
        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10"
        >
          <span className="tag">The New Professional Baseline</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-display mb-14 text-balance"
        >
          AI-native upskilling for the modern professional
        </motion.h1>

        {/* Body */}
        <div className="space-y-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-body text-[var(--text-medium)]"
          >
            AI-native tools are no longer optional. They&apos;re the new professional baseline.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-body text-[var(--text-medium)]"
          >
            But there&apos;s a gap. MBAs teach strategy. Bootcamps teach tools. Neither teaches{' '}
            <span className="text-[var(--text-dark)] font-medium">AI-native operations thinking</span>{' '}
            — the instinct to identify, design, and manage automated processes.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-body text-[var(--text-medium)]"
          >
            Surface-level tool familiarity isn&apos;s enough. The professionals who master AI-native automation
            management become{' '}
            <span className="text-[var(--gold)] font-medium">force multipliers</span>{' '}
            — personally and organizationally.
          </motion.p>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-14 flex flex-col sm:flex-row gap-4"
        >
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Get Started
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <button
            onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary"
          >
            View Courses
          </button>
        </motion.div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/ShiftSection.tsx
git commit -m "feat(web): add corner decorations and dual CTA to hero section"
```

---

## Task 4: Create BenefitsSection

**Files:**
- Create: `web/src/components/sections/BenefitsSection.tsx`

**Step 1: Write the component**

```tsx
'use client';

import { motion } from 'motion/react';

const benefits = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Learn by doing',
    description: 'Code challenges and real-world exercises — not passive video watching.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
    title: 'Expert-designed paths',
    description: 'Structured learning tracks built by AI practitioners, not content farms.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'AI-native from day one',
    description: 'Built around the tools and workflows professionals actually use in 2025.',
  },
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="section bg-warm-gray">
      <div className="w-full max-w-[1000px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <span className="tag mb-8 inline-block">Why zuzu.codes</span>
          <h2 className="text-heading text-balance">
            Built for how professionals<br className="hidden sm:block" /> actually learn.
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="card-on-gray"
            >
              <div className="text-[var(--gold)] mb-6">
                {benefit.icon}
              </div>
              <h3 className="text-title font-medium text-[var(--text-dark)] mb-3">
                {benefit.title}
              </h3>
              <p className="text-small text-[var(--text-medium)]">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/BenefitsSection.tsx
git commit -m "feat(web): add BenefitsSection with 3 feature cards"
```

---

## Task 5: Update MethodSection — Background Swap + Desktop Two-Column Layout

**Files:**
- Modify: `web/src/components/sections/MethodSection.tsx`

**Step 1: Replace the full component**

```tsx
'use client';

import { motion } from 'motion/react';

const quadrants = [
  { title: 'Core Theory', description: 'Principles and mental models that transfer' },
  { title: 'Pattern Recognition', description: 'Real-world cases with expert analysis' },
  { title: 'Independent Application', description: 'Build it yourself, make mistakes, learn' },
  { title: 'Expert Guidance', description: 'Feedback and refinement from practitioners' },
];

const whyItWorks = [
  'Theory without application fades.',
  'Application without theory is imitation.',
  'Independence without guidance plateaus.',
  'Guidance without independence creates dependency.',
];

export function MethodSection() {
  return (
    <section id="method" className="section bg-cream">
      <div className="w-full max-w-[1000px]">
        {/* Desktop: two-column. Mobile: stacked */}
        <div className="flex flex-col lg:flex-row lg:gap-16 lg:items-center">
          {/* Left: heading + why-it-works */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="lg:w-2/5 mb-12 lg:mb-0"
          >
            <span className="tag mb-8 inline-block">The Zuzu Method</span>
            <h2 className="text-heading mb-8 text-balance">
              We don&apos;t teach tools. We build instincts.
            </h2>
            <p className="text-body text-[var(--text-medium)] mb-10">
              Every topic traverses four quadrants — a complete learning cycle that produces
              deep, transferable competence.
            </p>

            {/* Why it works */}
            <div className="space-y-3">
              {whyItWorks.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-small text-[var(--text-medium)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <p className="mt-10 text-body text-[var(--text-dark)] font-medium">
              Complete the quadrant. Build lasting competence.
            </p>
          </motion.div>

          {/* Right: quadrant grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:w-3/5"
          >
            <div className="quadrant-grid">
              {quadrants.map((quadrant, i) => (
                <div key={quadrant.title} className="quadrant-cell group">
                  <span className="number text-sm mb-6 block opacity-40 group-hover:opacity-100 transition-opacity">
                    0{i + 1}
                  </span>
                  <h3 className="text-title text-[var(--text-dark)] mb-4 group-hover:text-[var(--gold)] transition-colors">
                    {quadrant.title}
                  </h3>
                  <p className="text-small text-[var(--text-medium)]">
                    {quadrant.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/MethodSection.tsx
git commit -m "feat(web): MethodSection two-column desktop layout, swap bg to cream"
```

---

## Task 6: Update AudienceSection — Background Swap + Responsive Widen

**Files:**
- Modify: `web/src/components/sections/AudienceSection.tsx`

**Step 1: Change `bg-cream` to `bg-warm-gray` and widen container**

Change line 14:
```tsx
<section id="audience" className="section bg-cream">
  <div className="w-full max-w-[640px]">
```
to:
```tsx
<section id="audience" className="section bg-warm-gray">
  <div className="w-full max-w-[800px]">
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/AudienceSection.tsx
git commit -m "feat(web): AudienceSection swap bg to warm-gray, widen container"
```

---

## Task 7: Create StatsSection

**Files:**
- Create: `web/src/components/sections/StatsSection.tsx`

**Step 1: Write the component**

```tsx
'use client';

import { motion } from 'motion/react';

const stats = [
  { number: '500+', label: 'Students enrolled' },
  { number: '90%', label: 'Completion rate' },
  { number: '12h+', label: 'Course content' },
  { number: '2', label: 'AI courses' },
];

export function StatsSection() {
  return (
    <section id="stats" className="section bg-cream">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="tag mb-8 inline-block">The numbers</span>
          <h2 className="text-heading text-balance">
            Professionals who commit, progress.
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-[var(--cream)] flex flex-col items-center justify-center py-12 px-6 text-center"
            >
              <span
                className="text-display text-[var(--gold)] mb-3"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 'clamp(40px, 6vw, 72px)' }}
              >
                {stat.number}
              </span>
              <span className="text-small text-[var(--text-medium)] uppercase tracking-wide">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/StatsSection.tsx
git commit -m "feat(web): add StatsSection with 4 key metrics"
```

---

## Task 8: Update CoursesSection — Widen Container + Mobile Touch Fixes

**Files:**
- Modify: `web/src/components/sections/CoursesSection.tsx`

**Step 1: Widen container from 680px to 900px and fix mobile truncation**

Change line 131–132:
```tsx
<section id="courses" className="section bg-warm-gray">
  <div className="w-full max-w-[680px]">
```
to:
```tsx
<section id="courses" className="section bg-warm-gray">
  <div className="w-full max-w-[900px]">
```

In the Accordion trigger (line 80), change the module title from `truncate` to `line-clamp-1`:
```tsx
<h4 className="text-title text-[var(--text-dark)] text-left line-clamp-1">{module.title}</h4>
<p className="text-small text-[var(--text-medium)] line-clamp-1">{module.subtitle}</p>
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/CoursesSection.tsx
git commit -m "feat(web): widen CoursesSection container and fix mobile accordion truncation"
```

---

## Task 9: Update PricingSection — Mobile Stack Fix

**Files:**
- Modify: `web/src/components/sections/PricingSection.tsx`

**Step 1: Widen container max-width from 960px to 1040px**

Change line 49–50:
```tsx
<section id="pricing" className="section bg-cream">
  <div className="w-full max-w-[960px]">
```
to:
```tsx
<section id="pricing" className="section bg-cream">
  <div className="w-full max-w-[1040px]">
```

No other changes needed — `pricing-grid` CSS already handles responsive layout.

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/PricingSection.tsx
git commit -m "feat(web): widen PricingSection container for better desktop spacing"
```

---

## Task 10: Create InstructorSection

**Files:**
- Create: `web/src/components/sections/InstructorSection.tsx`

**Step 1: Write the component**

```tsx
'use client';

import { motion } from 'motion/react';

const credentials = [
  '10+ years in enterprise operations and process design',
  'Built automation systems serving 50,000+ daily users',
  'Former consultant at Fortune 500 companies',
  'Certified AI practitioner and workflow architect',
];

export function InstructorSection() {
  return (
    <section id="instructor" className="section bg-warm-gray">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-14"
        >
          <span className="tag mb-8 inline-block">Your instructor</span>
          <h2 className="text-heading text-balance">
            Learn from someone who&apos;s built it in production.
          </h2>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-start">
          {/* Left: Avatar + name */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center md:items-start text-center md:text-left flex-shrink-0"
          >
            {/* Avatar placeholder */}
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mb-6 border-2 border-[var(--gold)]"
              style={{ background: 'var(--gold-soft)' }}
            >
              <span
                className="text-4xl font-medium text-[var(--gold)]"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif' }}
              >
                K
              </span>
            </div>
            <h3 className="text-subhead text-[var(--gold)] mb-1">Kuma</h3>
            <p className="text-small text-[var(--text-medium)]">Founder, Kuma Learn</p>
            <p className="text-small text-[var(--text-light)] mt-1">AI Automation Practitioner</p>
          </motion.div>

          {/* Right: Bio + credentials */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex-1"
          >
            <p className="text-body text-[var(--text-medium)] mb-8">
              I&apos;ve spent a decade designing automation systems for businesses — from scrappy
              startups to global enterprises. I built zuzu.codes because most learning resources
              teach you to copy workflows, not to think in workflows. This curriculum is everything
              I wish I had when I started.
            </p>

            <div className="space-y-4">
              {credentials.map((cred, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0 mt-2" />
                  <span className="text-small text-[var(--text-medium)]">{cred}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/InstructorSection.tsx
git commit -m "feat(web): add InstructorSection with two-column bio layout"
```

---

## Task 11: Create TestimonialsSection

**Files:**
- Create: `web/src/components/sections/TestimonialsSection.tsx`

**Step 1: Write the component**

```tsx
'use client';

import { motion } from 'motion/react';

const testimonials = [
  {
    quote: 'I went from manually processing spreadsheets to fully automated pipelines in 6 weeks. This isn\'t just a course — it\'s a mindset shift.',
    name: 'Priya S.',
    role: 'Operations Lead, Mumbai',
  },
  {
    quote: 'The Zuzu Method actually sticks. I\'ve done other courses but the instincts I built here transfer to every new tool I pick up.',
    name: 'Arjun M.',
    role: 'Founder, SaaS Startup',
  },
  {
    quote: 'As a consultant, being able to design and pitch automation systems changed how clients value my work. ROI was immediate.',
    name: 'Fatima R.',
    role: 'Business Consultant, Bangalore',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section bg-cream">
      <div className="w-full max-w-[1040px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <span className="tag mb-8 inline-block">What students say</span>
          <h2 className="text-heading text-balance">
            Real results from real professionals.
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="card-on-cream flex flex-col"
            >
              {/* Quote mark */}
              <span
                className="text-5xl leading-none text-[var(--gold)] mb-6 opacity-60"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif' }}
                aria-hidden="true"
              >
                &ldquo;
              </span>

              <p className="text-body text-[var(--text-medium)] flex-grow mb-8 italic">
                {t.quote}
              </p>

              <div className="border-t border-[var(--border)] pt-6">
                <p className="text-title font-medium text-[var(--text-dark)]">{t.name}</p>
                <p className="text-small text-[var(--text-light)] mt-1">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/TestimonialsSection.tsx
git commit -m "feat(web): add TestimonialsSection with 3 student quote cards"
```

---

## Task 12: Create FAQSection

**Files:**
- Create: `web/src/components/sections/FAQSection.tsx`

**Step 1: Write the component**

```tsx
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

const faqs = [
  {
    question: 'Do I need prior coding experience?',
    answer: 'No. The curriculum is designed for professionals, not developers. You\'ll learn to think in automation patterns and use no-code/low-code tools effectively.',
  },
  {
    question: 'How long does each course take?',
    answer: 'Each course is 6–8 weeks at roughly 3–5 hours per week. The content is designed to be applied immediately at work, so learning and applying happen in parallel.',
  },
  {
    question: 'What\'s the difference between the pricing tiers?',
    answer: 'Essential is self-paced with community support. Pro adds live sessions and structured exercises with instructor feedback. Premium includes 1:1 mentorship and a personalized learning path.',
  },
  {
    question: 'Will I get a certificate?',
    answer: 'Yes. Completing each course earns a zuzu.codes completion certificate. Pro and Premium tiers include a practitioner credential you can share on LinkedIn.',
  },
  {
    question: 'Can my company sponsor my enrollment?',
    answer: 'Absolutely. We offer team pricing and corporate billing. Reach out via WhatsApp and we\'ll put together a proposal for your organization.',
  },
  {
    question: 'What tools will I learn to use?',
    answer: 'The curriculum focuses on concepts and patterns that transfer across tools. You\'ll build fluency with modern automation platforms (n8n, Zapier, Make) plus AI-native tools used in professional workflows.',
  },
];

function FAQItem({ faq, index }: { faq: { question: string; answer: string }; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="accordion-item"
      data-state={open ? 'open' : 'closed'}
    >
      <button className="accordion-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="text-title text-[var(--text-dark)] text-left pr-4">{faq.question}</span>
        <span className="accordion-icon flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            )}
          </svg>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="accordion-content">
              <p className="text-body text-[var(--text-medium)]">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="section bg-warm-gray">
      <div className="w-full max-w-[1000px]">
        {/* Desktop: two-column. Mobile: stacked. */}
        <div className="flex flex-col lg:flex-row lg:gap-20">
          {/* Left: heading */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="lg:w-2/5 mb-12 lg:mb-0 lg:sticky lg:top-28 self-start"
          >
            <span className="tag mb-8 inline-block">Common questions</span>
            <h2 className="text-heading mb-6 text-balance">
              Everything you need to know.
            </h2>
            <p className="text-body text-[var(--text-medium)]">
              Still have questions? Reach out on WhatsApp — we respond within a few hours.
            </p>
          </motion.div>

          {/* Right: accordion */}
          <div className="lg:w-3/5 space-y-4">
            {faqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/FAQSection.tsx
git commit -m "feat(web): add FAQSection with two-column layout and expandable accordion"
```

---

## Task 13: Create CTASection (absorbs Footer)

The current `Footer.tsx` is a fixed element with Terms/Privacy dialogs. In the new design, the footer content moves inside `CTASection` as an in-flow dark section at the bottom of the page.

**Files:**
- Create: `web/src/components/sections/CTASection.tsx`

**Step 1: Write the component** (copies Dialog + terms/privacy content from `Footer.tsx`)

```tsx
'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

const termsContent = `
# Terms of Service

**Last updated: January 2026**

zuzu.codes is operated by **Kuma Learn**.

## 1. Acceptance of Terms

By accessing and using zuzu.codes, you agree to be bound by these Terms of Service.

## 2. Services

zuzu.codes provides AI-native upskilling courses and educational content. Course access is subject to enrollment and payment terms.

## 3. User Responsibilities

- Provide accurate information during registration
- Maintain confidentiality of your account
- Use the platform for lawful purposes only
- Respect intellectual property rights

## 4. Intellectual Property

All course content, materials, and branding are owned by Kuma Learn. Unauthorized reproduction or distribution is prohibited.

## 5. Payment & Refunds

Payment terms are specified at checkout. Refund policies vary by course tier and are communicated during enrollment.

## 6. Limitation of Liability

Kuma Learn is not liable for indirect, incidental, or consequential damages arising from use of our services.

## 7. Contact

For questions, reach out via WhatsApp.
`;

const privacyContent = `
# Privacy Policy

**Last updated: January 2026**

zuzu.codes is operated by **Kuma Learn**.

## 1. Information We Collect

- **Account Information**: Name, email, payment details
- **Usage Data**: Course progress, interactions, preferences
- **Technical Data**: Browser type, IP address, device information

## 2. How We Use Your Information

- Provide and improve our services
- Process payments and enrollments
- Send course updates and communications
- Analyze usage patterns to enhance experience

## 3. Data Sharing

We do not sell your personal information. We may share data with:
- Payment processors for transactions
- Service providers who assist our operations
- Legal authorities when required by law

## 4. Data Security

We implement industry-standard security measures to protect your information.

## 5. Your Rights

You may request access to, correction of, or deletion of your personal data by contacting us.

## 6. Cookies

We use essential cookies for site functionality and analytics cookies to improve our services.

## 7. Contact

For privacy inquiries, reach out via WhatsApp.
`;

function Dialog({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--cream)] rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-[var(--border)]">
        <div
          className="flex items-center justify-between bg-[var(--cream)] border-b border-[var(--border)]"
          style={{ padding: '20px 28px' }}
        >
          <h2 className="font-medium text-lg text-[var(--text-dark)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--warm-gray)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--text-medium)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]" style={{ padding: '28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function CTASection() {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <section
        id="cta"
        className="section bg-dark"
        style={{ minHeight: '100vh', scrollSnapAlign: 'start' }}
      >
        <div className="w-full max-w-[720px] flex flex-col items-center text-center flex-grow justify-center">
          {/* CTA content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
          >
            <span
              className="tag mb-10 inline-block"
              style={{ background: 'rgba(184, 134, 11, 0.15)', color: 'var(--gold)' }}
            >
              Start today
            </span>
            <h2
              className="text-heading mb-8 text-balance"
              style={{ color: 'var(--dark-text)' }}
            >
              Start your AI journey today.
            </h2>
            <p
              className="text-body mb-12"
              style={{ color: 'rgba(245, 243, 239, 0.65)' }}
            >
              Join 500+ professionals building AI-native instincts. The next cohort starts soon.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <button
                onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary-dark"
              >
                View Courses
              </button>
            </div>
          </motion.div>
        </div>

        {/* Footer strip */}
        <div
          className="w-full border-t mt-auto pt-8 pb-4"
          style={{ borderColor: 'var(--dark-border)' }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm max-w-[1200px] mx-auto px-6">
            <span
              className="font-medium"
              style={{ color: 'var(--dark-text)' }}
            >
              zuzu<span style={{ color: 'var(--gold)' }}>.</span>codes
            </span>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--gold)] transition-colors"
              style={{ color: 'rgba(245, 243, 239, 0.5)' }}
            >
              Contact
            </a>
            <button
              onClick={() => setTermsOpen(true)}
              className="hover:text-[var(--gold)] transition-colors"
              style={{ color: 'rgba(245, 243, 239, 0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
            >
              Terms
            </button>
            <button
              onClick={() => setPrivacyOpen(true)}
              className="hover:text-[var(--gold)] transition-colors"
              style={{ color: 'rgba(245, 243, 239, 0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
            >
              Privacy
            </button>
            <span style={{ color: 'rgba(245, 243, 239, 0.4)' }}>
              &copy; {new Date().getFullYear()} Kuma Learn
            </span>
          </div>
        </div>
      </section>

      <Dialog isOpen={termsOpen} onClose={() => setTermsOpen(false)} title="Terms of Service">
        <div className="prose-content">
          <ReactMarkdown>{termsContent}</ReactMarkdown>
        </div>
      </Dialog>

      <Dialog isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy Policy">
        <div className="prose-content">
          <ReactMarkdown>{privacyContent}</ReactMarkdown>
        </div>
      </Dialog>
    </>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/sections/CTASection.tsx
git commit -m "feat(web): add CTASection with dark background, dual CTAs, and embedded footer"
```

---

## Task 14: Wire All 12 Sections in page.tsx

**Files:**
- Modify: `web/src/app/page.tsx`

**Step 1: Replace the entire file**

```tsx
'use client';

import { useRef } from 'react';
import { Header } from '@/components/sections/Header';
import { ShiftSection } from '@/components/sections/ShiftSection';
import { BenefitsSection } from '@/components/sections/BenefitsSection';
import { MethodSection } from '@/components/sections/MethodSection';
import { AudienceSection } from '@/components/sections/AudienceSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { CoursesSection } from '@/components/sections/CoursesSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { InstructorSection } from '@/components/sections/InstructorSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { CTASection } from '@/components/sections/CTASection';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Fixed Header */}
      <Header containerRef={containerRef} />

      {/* Main content — 12 scroll-snap sections */}
      <main ref={containerRef} className="bg-[var(--cream)]">
        <ShiftSection />
        <BenefitsSection />
        <MethodSection />
        <AudienceSection />
        <StatsSection />
        <CoursesSection />
        <PricingSection />
        <InstructorSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
    </>
  );
}
```

Note: `<Footer />` is removed — its content now lives in `CTASection`. The `pb-[var(--footer-height)]` padding on `<main>` is also removed since the footer is no longer fixed.

**Step 2: Full build + type check + lint**

```bash
cd web && npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass with no errors.

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat(web): wire all 12 sections, remove fixed Footer"
```

---

## Verification Checklist

```bash
cd web && npm run dev
# Open http://localhost:3000
```

Walk through the page and verify:

- [ ] 1. **ShiftSection** — corner decorations visible, dual CTAs, scroll-snap locks
- [ ] 2. **BenefitsSection** — 3 cards in a row on desktop, stacked on mobile
- [ ] 3. **MethodSection** — two-column on desktop (text left, grid right), stacked on mobile
- [ ] 4. **AudienceSection** — warm-gray background (not cream), wider container
- [ ] 5. **StatsSection** — 4 stats in a 4-col grid (desktop) / 2-col (mobile)
- [ ] 6. **CoursesSection** — wider container, accordion touch targets ok on mobile
- [ ] 7. **PricingSection** — 3 cards desktop, stacked mobile, featured card gold border
- [ ] 8. **InstructorSection** — two-column desktop (avatar left, bio right)
- [ ] 9. **TestimonialsSection** — 3 quote cards in a row, gold quotation marks
- [ ] 10. **FAQSection** — two-column desktop (heading left, accordion right), accordion opens/closes
- [ ] 11. **CTASection** — dark background, headline cream, gold CTA, footer strip at bottom
- [ ] 12. **Header** — text links (Method, Courses, Pricing, FAQ) scroll to sections; hamburger appears on mobile
- [ ] 13. **Progress bar** — gold bar at top of header advances on scroll
- [ ] 14. **Dialogs** — Terms and Privacy buttons in footer open modals correctly
- [ ] 15. **Responsive** — test at 390px (mobile), 768px (tablet), 1440px (desktop)
- [ ] 16. **Scroll-snap** — each section snaps correctly during scroll

```bash
cd web && npm run build && npm run lint && npx tsc --noEmit
```

All three should pass clean.
