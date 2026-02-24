# Codebase Structure Design

**Date:** 2026-02-24
**Status:** Approved

---

## Problem

`src/components/` root has grown flat — 15+ files with no grouping. Dashboard, lesson-player, and shared components are all at the same level, making the tree hard to navigate.

## Goal

Group components into four logical folders. No logic changes. Pure file moves + import updates.

---

## New Structure

```
src/components/
├── ui/           — shadcn primitives (unchanged)
├── dashboard/    — all dashboard UI (2 new additions)
├── lesson/       — lesson player components (new folder, 5 files)
├── landing/      — landing page sections (unchanged)
└── shared/       — global/reusable components (new folder, 11 files)

src/context/      — gains tenant-provider.tsx (was providers/)
```

---

## File Movements

### dashboard/ (additions)
| From | To |
|------|----|
| `components/dashboard-header.tsx` | `components/dashboard/header.tsx` |
| `components/dashboard-main.tsx` | `components/dashboard/main.tsx` |

### lesson/ (new folder)
| From | To |
|------|----|
| `components/code-editor.tsx` | `components/lesson/code-editor.tsx` |
| `components/code-lesson-layout.tsx` | `components/lesson/code-lesson-layout.tsx` |
| `components/lesson-completion.tsx` | `components/lesson/lesson-completion.tsx` |
| `components/output-panel.tsx` | `components/lesson/output-panel.tsx` |
| `components/rate-limit-indicator.tsx` | `components/lesson/rate-limit-indicator.tsx` |

### shared/ (new folder)
| From | To |
|------|----|
| `components/app-sidebar.tsx` | `components/shared/app-sidebar.tsx` |
| `components/auth-dialog.tsx` | `components/shared/auth-dialog.tsx` |
| `components/auth-trigger.tsx` | `components/shared/auth-trigger.tsx` |
| `components/brand-logo.tsx` | `components/shared/brand-logo.tsx` |
| `components/breadcrumb.tsx` | `components/shared/breadcrumb.tsx` |
| `components/email-verification.tsx` | `components/shared/email-verification.tsx` |
| `components/markdown.tsx` | `components/shared/markdown.tsx` |
| `components/settings-dialog.tsx` | `components/shared/settings-dialog.tsx` |
| `components/theme-provider.tsx` | `components/shared/theme-provider.tsx` |
| `components/theme-toggle.tsx` | `components/shared/theme-toggle.tsx` |
| `components/user-button.tsx` | `components/shared/user-button.tsx` |

### context/ (addition)
| From | To |
|------|----|
| `providers/tenant-provider.tsx` | `context/tenant-provider.tsx` |

---

## Import Updates Required

Every file that imports from the moved paths needs updating. Key callers:

- `app/layout.tsx` — imports theme-provider, auth components
- `app/dashboard/layout.tsx` — imports app-sidebar, dashboard-header, dashboard-main, rate-limit-indicator
- `app/dashboard/page.tsx` — imports course-grid, continue-learning
- `app/dashboard/course/[courseId]/page.tsx` — no component imports from root
- `app/dashboard/course/.../lesson/.../page.tsx` — imports code-lesson-layout
- `components/code-lesson-layout.tsx` (→ lesson/) — imports code-editor, output-panel, markdown, theme-toggle, user-button
- `components/app-sidebar.tsx` (→ shared/) — imports brand-logo, ui/*
- Any landing page components importing auth-trigger, brand-logo

---

## Verification

- `npx tsc --noEmit` passes with zero errors after all moves
- Dev server starts and all pages render without import errors
