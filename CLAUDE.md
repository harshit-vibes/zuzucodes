# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Modular Course Learning Platform** - A system for creating and managing structured educational content with courses, modules, and lessons.

## Data Architecture

```
Course → Module → ModuleItem → Lesson (or Quiz)
```

### Directory Structure
```
data/
├── n8n-official/     # Reference content (scraped from n8n docs)
├── courses/          # Course definitions
├── modules/          # Module definitions
├── module-items/     # Links modules to lessons/quizzes
├── lessons/          # Lesson content (markdown)
└── quizzes/          # Quiz definitions
```

### Entity Schema (from db-plan.md)

**Course**: `{courseId, title, description, category, outcomes[]}`

**Module**: `{moduleId, courseId, title, order, outcomes[]}`

**ModuleItem**: `{itemId, moduleId, order, itemType, lessonId|quizId}`

**Lesson**: `{lessonId, title, markdownContent}`
- Content structure: Theory → Demonstration → Practical

## Current Content

- **Course**: AI Automation for General Workflows
- **Modules**: Beginner (6 lessons) + Advanced (6 lessons)
- **Reference**: n8n course documentation in `data/n8n-official/`

## ID Conventions

- `course-{name}-001`
- `module-{level}-001`
- `lesson-{level}-{##}`
- `mi-{level}-{##}`
