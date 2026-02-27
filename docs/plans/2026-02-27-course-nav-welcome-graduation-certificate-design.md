# Design: Welcome + Graduation + Certificate Course Navigation

**Date:** 2026-02-27
**Status:** Approved

## Summary

Replace the ad-hoc pre/post-survey buttons in the sidebar with three course-level navigation items: **Welcome**, **Graduation**, and **Certificate**. These mirror how quizzes work at the module level but operate at the course level.

---

## Sidebar Structure

```
[Course Name] → /dashboard/course/[slug]
[progress bar]
──────────────────────────────────────
⭐ Welcome       → /dashboard/course/[slug]
  Module 1
    ○ Lesson 1
    ◇ Quiz
  Module 2
    ...
🎓 Graduation    → /dashboard/course/[slug]/graduation
🏆 Certificate   → /dashboard/course/[slug]/certificate
```

Icons: `Sparkles` (Welcome), `GraduationCap` (Graduation), `Award` (Certificate) — all from lucide-react.
Active highlight matches current URL. No completion dot — plain nav anchors.
Remove pre-survey/post-survey buttons added in previous task.

---

## Pages

### Welcome (`/dashboard/course/[slug]` — existing overview repurposed)
- Course intro template
- Onboarding form (always accessible; shows "Already submitted" if done)
- Outcomes list
- Curriculum (module list)
- Remove: course outro, completion form, survey link row, progress CTA block

### Graduation (`/dashboard/course/[slug]/graduation` — new)
- Course outro template
- Completion form (or "Already submitted" message)

### Certificate (`/dashboard/course/[slug]/certificate` — new)
- `ReportCard` component (confidence delta, shown when both forms submitted)
- `CourseCertificate` component

---

## Cleanup
- Delete `/onboarding/page.tsx` and `/completion/page.tsx` (superseded)
- Remove survey link row from course overview page
- Remove pre-survey/post-survey buttons from sidebar
