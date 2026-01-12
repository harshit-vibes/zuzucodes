# ZuzuCodes - Modular Course Platform

A data-driven course platform for structured educational content.

## Structure

```
data/
├── courses/          # Course definitions
├── modules/          # Module containers
├── module-items/     # Ordered lesson/quiz links
├── lessons/          # Lesson content (Theory → Demo → Practical)
├── quizzes/          # Quiz definitions
└── n8n-official/     # Reference content
```

## Current Course

**AI Automation for General Workflows**
- Beginner Module (6 lessons): UI, APIs, data processing, notifications, scheduling
- Advanced Module (6 lessons): Data structures, formats, merging, errors, best practices

## Schema

See `db-plan.md` for full entity definitions.

## Scripts

- `data/n8n-official/scrape.py` - Scrapes n8n course documentation
