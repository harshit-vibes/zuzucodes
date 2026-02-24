# Codebase Structure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize `src/components/` into logical subdirectories (`dashboard/`, `lesson/`, `shared/`) with zero logic changes.

**Architecture:** Pure file moves using `git mv` to preserve history, followed by targeted find-and-replace on import strings. TypeScript compiler validates correctness before the final commit.

**Tech Stack:** Next.js 16, TypeScript, path alias `@/*` → `./src/*`

---

### Task 1: Move all files into new locations

**Files:**
- Create: `src/components/lesson/` (new dir)
- Create: `src/components/shared/` (new dir)
- Move: 18 component files + 1 context file

All commands run from `app/` directory. Do **not** commit until Task 3 — imports are broken between Task 1 and Task 2.

**Step 1: Create new directories**

```bash
mkdir -p src/components/lesson src/components/shared
```

**Step 2: Move dashboard components (root → dashboard/)**

```bash
git mv src/components/dashboard-header.tsx src/components/dashboard/header.tsx
git mv src/components/dashboard-main.tsx src/components/dashboard/main.tsx
```

**Step 3: Move lesson-player components (root → lesson/)**

```bash
git mv src/components/code-editor.tsx         src/components/lesson/code-editor.tsx
git mv src/components/code-lesson-layout.tsx  src/components/lesson/code-lesson-layout.tsx
git mv src/components/lesson-completion.tsx   src/components/lesson/lesson-completion.tsx
git mv src/components/output-panel.tsx        src/components/lesson/output-panel.tsx
git mv src/components/rate-limit-indicator.tsx src/components/lesson/rate-limit-indicator.tsx
```

**Step 4: Move shared/global components (root → shared/)**

```bash
git mv src/components/app-sidebar.tsx          src/components/shared/app-sidebar.tsx
git mv src/components/auth-dialog.tsx          src/components/shared/auth-dialog.tsx
git mv src/components/auth-trigger.tsx         src/components/shared/auth-trigger.tsx
git mv src/components/brand-logo.tsx           src/components/shared/brand-logo.tsx
git mv src/components/breadcrumb.tsx           src/components/shared/breadcrumb.tsx
git mv src/components/email-verification.tsx   src/components/shared/email-verification.tsx
git mv src/components/markdown.tsx             src/components/shared/markdown.tsx
git mv src/components/settings-dialog.tsx      src/components/shared/settings-dialog.tsx
git mv src/components/theme-provider.tsx       src/components/shared/theme-provider.tsx
git mv src/components/theme-toggle.tsx         src/components/shared/theme-toggle.tsx
git mv src/components/user-button.tsx          src/components/shared/user-button.tsx
```

**Step 5: Move tenant-provider into context/**

```bash
git mv src/providers/tenant-provider.tsx src/context/tenant-provider.tsx
```

---

### Task 2: Update all import paths

All commands run from `app/` directory. Each `sed` call finds files that still reference the old path and rewrites the import string in-place.

**Step 1: Dashboard component imports**

```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/dashboard-header" | \
  xargs sed -i '' 's|@/components/dashboard-header|@/components/dashboard/header|g'

find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/dashboard-main" | \
  xargs sed -i '' 's|@/components/dashboard-main|@/components/dashboard/main|g'
```

**Step 2: Lesson component imports**

```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/code-editor" | \
  xargs sed -i '' 's|@/components/code-editor|@/components/lesson/code-editor|g'

find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/code-lesson-layout" | \
  xargs sed -i '' 's|@/components/code-lesson-layout|@/components/lesson/code-lesson-layout|g'

find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/lesson-completion" | \
  xargs sed -i '' 's|@/components/lesson-completion|@/components/lesson/lesson-completion|g'

find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/output-panel" | \
  xargs sed -i '' 's|@/components/output-panel|@/components/lesson/output-panel|g'

find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/rate-limit-indicator" | \
  xargs sed -i '' 's|@/components/rate-limit-indicator|@/components/lesson/rate-limit-indicator|g'
```

**Step 3: Shared component imports**

```bash
for comp in app-sidebar auth-dialog auth-trigger brand-logo breadcrumb \
            email-verification markdown settings-dialog theme-provider \
            theme-toggle user-button; do
  find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "components/$comp" 2>/dev/null | \
    xargs sed -i '' "s|@/components/$comp|@/components/shared/$comp|g"
done
```

**Step 4: Tenant-provider import**

```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "providers/tenant-provider" | \
  xargs sed -i '' 's|@/providers/tenant-provider|@/context/tenant-provider|g'
```

---

### Task 3: Verify, clean up, commit

**Step 1: Type-check**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors). If any `Cannot find module` errors appear, grep for the old import path and fix manually:

```bash
# Example: find stray old-style import
grep -r "components/theme-toggle'" src --include="*.tsx" --include="*.ts"
```

**Step 2: Remove now-empty providers/ directory**

```bash
rmdir src/providers 2>/dev/null; echo "done"
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: reorganize components into dashboard/, lesson/, shared/ subdirectories"
```
