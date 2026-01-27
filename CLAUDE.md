# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An opinionated course platform for AI-era learning.

### Vision
- **Phase 1 (Current)**: Learner platform for course consumption
- **Phase 2 (Future)**: Instructor platform for course creation and management

### First Offerings
Two courses on AI Automation management for any process—business or personal:
1. AI Automation for General Workflows (Beginner → Advanced)
2. AI Automation for Business Processes (Intermediate → Advanced)

See `brochure.md` for detailed course offerings.

---

## Data Architecture

```
Course → Module → ModuleItem → Lesson (or Quiz)
```

### Directory Structure
```
data/
├── courses/          # Course definitions (JSON)
├── modules/          # Module definitions (JSON)
├── module-items/     # Links modules to lessons/quizzes (JSON)
├── lessons/          # Lesson content (markdown)
├── quizzes/          # Quiz definitions (JSON)
└── reference/        # Source documentation

web/                  # Next.js learner platform
├── src/app/          # App router pages
├── src/components/   # React components
├── src/lib/          # Data loading, utilities
└── src/types/        # TypeScript definitions
```

### Entity Schema

**Course**: `{courseId, title, description, category, outcomes[], prerequisites, duration, level}`

**Module**: `{moduleId, courseId, title, description, order, duration, outcomes[]}`

**ModuleItem**: `{itemId, moduleId, order, itemType, lessonId|quizId}`

**Lesson**: `{lessonId, title, markdownContent}`
- Content structure: Theory → Demonstration → Practical (always)

---

## ID Conventions

- `course-{name}-001`
- `module-{course}-{level}-001`
- `lesson-{module}-{##}`
- `mi-{module}-{##}`

---

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS variables for theming
- **Animation**: Motion (motion.dev)
- **Database**: Supabase (PostgreSQL) with local JSON fallback
- **Content**: Markdown with structured metadata

---

## Key Files

| File | Purpose |
|------|---------|
| `brochure.md` | Course offerings and descriptions |
| `db-plan.md` | Database schema and entity definitions |
| `web/src/app/page.tsx` | Main landing page |
| `web/src/lib/data.ts` | Data loading functions (JSON + Supabase) |
| `web/src/components/sections/` | Landing page section components |

---

## Development Commands

```bash
cd web
npm install
npm run dev      # Start dev server
npm run build    # Production build
```
