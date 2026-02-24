# Python Code Execution Design

**Date:** 2026-02-23
**Status:** Approved

## Overview

Every lesson on the platform gets a Python code editor alongside the prose content. Learners can write and run Python in-browser without any server-side execution infrastructure.

## Key Decisions

- **Every lesson has a code editor** — always-visible split pane, not conditional on `code_template`
- **In-browser execution via Pyodide** — Python compiled to WASM, loaded from CDN on first Run click
- **Mobile: tabs** — "Lesson" / "Code" tabs replace the split pane on small screens
- **Approach A: Monolithic `CodeLessonLayout`** — single client component wraps prose + editor

## Architecture

**Lesson page stays a Server Component.** It fetches:
1. Lesson `content` (markdown prose)
2. `code_template` from the `lessons` table (starter code, nullable)
3. `savedCode` from the `user_code` table (user's last saved code, nullable)

All three passed as props to `CodeLessonLayout`.

```
lesson/[order]/page.tsx (Server Component)
  ↓ props: { content, codeTemplate, savedCode, lessonId, courseId, ... }
  CodeLessonLayout (Client Component)
  ├── Desktop (md+): side-by-side columns
  │   ├── Left: <Markdown content={content} />
  │   └── Right: <CodeEditor> + <OutputPanel>
  └── Mobile (<md): tabbed
      ├── "Lesson" tab: <Markdown content={content} />
      └── "Code" tab: <CodeEditor> + <OutputPanel>
```

## New Files

| File | Purpose |
|---|---|
| `app/src/components/code-lesson-layout.tsx` | Split-pane / tab wrapper (client) |
| `app/src/components/code-editor.tsx` | CodeMirror 6 editor (client) |
| `app/src/components/output-panel.tsx` | Terminal-style output display (client) |
| `app/src/app/api/code/save/route.ts` | Upsert `user_code` |

## Modified Files

| File | Change |
|---|---|
| `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx` | Fetch `savedCode`, render `CodeLessonLayout` instead of prose-only layout |
| `app/src/lib/data.ts` | `getUserCode()` already exists — no change needed |

## Data Flow

### Editor initialization
```
initialCode = savedCode ?? codeTemplate ?? ''
```

### Auto-save
- 1500ms debounce after keystroke
- `POST /api/code/save` → `{ lessonId, code }`
- Silent: no spinner, no toast; small "Saved" indicator fades in/out
- Skipped if no user session (unauthenticated users can run code but not save)

### Python execution
```
User clicks "Run"
  1. If Pyodide not loaded:
     - Show "Loading Python (~6MB)..." in output panel
     - Load via loadPyodide() from CDN (one-time per session)
  2. Redirect sys.stdout/stderr to capture output
  3. await pyodide.runPythonAsync(code)
  4. Display stdout in output panel (white)
  5. Display stderr/exceptions in output panel (red)
  6. Clear output on next Run
```

### Pyodide singleton
Module-level: `let pyodide: PyodideInterface | null = null`
Loaded once per browser session. Subsequent runs skip initialization.

### API route
```sql
-- POST /api/code/save
INSERT INTO user_code (user_id, lesson_id, code, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
```
Returns `204 No Content`.

## UI Details

### Desktop (md+)
- Two equal-width columns, full height below header
- Left pane: scrollable prose
- Right pane: flex column — editor fills space, output panel fixed ~200px

### Mobile (< md)
- Tab bar: "Lesson" | "Code"
- Default tab: "Lesson"
- Each tab full-width, scrollable

### Output panel states
| State | Display |
|---|---|
| Empty | "Output will appear here" (muted) |
| Running (first load) | "Loading Python (~6MB)…" |
| Running | Spinner + "Running..." |
| Success | stdout (white text) |
| Error | stderr/exception (red text) |
| Load failure | "Failed to load Python. Check your connection and try again." |

## Error Handling

- **Pyodide load failure** → shown in output panel, retry available by clicking Run again
- **Python runtime errors** → caught, displayed in output panel (red), not thrown
- **Auto-save failure** → silently swallowed; in-memory state preserved
- **Unauthenticated** → code runs fine, save skipped

## Packages to Install

```bash
npm install @uiw/react-codemirror @codemirror/lang-python
```

Pyodide loaded from CDN — no npm package.

## What Is NOT in Scope

- Package installation in Pyodide (no `micropip` UI)
- Multiple files / filesystem in the editor
- Sharing code snippets
- Execution timeout UI (Pyodide handles WASM resource limits internally)
