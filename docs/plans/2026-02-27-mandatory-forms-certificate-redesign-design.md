# Design: Mandatory Forms + Certificate Redesign

**Date:** 2026-02-27
**Status:** Approved

## Summary

Two features:
1. **Mandatory form gates** — onboarding form must be completed before any module/lesson/quiz; completion form must be completed before certificate.
2. **Certificate redesign** — bold & premium dark-theme vertical portrait card.

---

## Mandatory Form Enforcement

### Onboarding gate (before lessons/modules)

Server-side redirect in module overview, lesson, and quiz pages:
- If `course.confidence_form` exists AND `user` is signed in AND `onboarding === null` → `redirect('/dashboard/course/[slug]')`
- Unauthenticated users: no redirect (no account to submit with)

### Completion gate (before certificate)

Already partially enforced. Add explicit redirect in the certificate page:
- If `course.confidence_form` exists AND `isCompleted` AND `completion === null` → `redirect('/dashboard/course/[slug]/graduation')`

### Welcome page — mandatory callout

Wrap `OnboardingFormWrapper` in an amber/warning callout:
- `border-2 border-warning/40 bg-warning/5` container
- Header row: warning triangle SVG + "Required before starting" in amber monospace
- Subtitle: "Complete this survey before accessing any lessons."
- Form sits inside the container
- Submitted badge replaces the entire container (existing behaviour)

---

## Certificate Redesign

**Orientation:** Portrait, 3:4 aspect ratio (600×800px rendered at 2× scale).

**Visual theme:** Dark background `#0f0f0f`, warm off-white text `#f5f0e8`, gold accents `#c9a84c`.

**Layout (top to bottom):**
```
══════════════════════════════  ← gold double rule (3px top + 1px bottom, spaced)
zuzu.codes              ★       ← monospace + decorative star, gold
══════════════════════════════

    CERTIFICATE OF COMPLETION   ← small-caps, letter-spaced, gold
    ─────────────────────────

       This certifies that      ← small italic, muted

    [Student Name]              ← Playfair Display, 2xl, gold

  has successfully completed    ← small, muted

    [Course Title]              ← semibold, white/off-white, large

       February 27, 2026        ← mono, small, muted gold

══════════════════════════════  ← gold rule
      zuzu.codes © 2026         ← tiny, muted
```

**PDF export:** `jsPDF` with `orientation: 'portrait'`, keeping existing `html2canvas` approach.

**Font:** `Playfair Display` is already loaded in the project as a CSS variable (`--font-playfair`). Use `font-[family-name:var(--font-playfair)]` Tailwind class for the student name.

---

## Files Changed

| File | Change |
|------|--------|
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx` | Add onboarding gate |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx` | Add onboarding gate |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx` | Add onboarding gate |
| `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx` | Add completion gate redirect |
| `app/src/app/dashboard/course/[courseSlug]/page.tsx` | Mandatory callout styling |
| `app/src/components/dashboard/course-certificate.tsx` | Full visual redesign |
