# ZuzuCodes

**An opinionated course platform for AI-era learning.**

zuzu.codes is a focused platform for creating and consuming structured educational content. We believe in deep, practical learning over breadth—each course follows a consistent Theory → Demonstration → Practice methodology.

## Vision

### Phase 1: Learner Platform (Current)
A premium course consumption experience focused on AI Automation. Learners access structured courses designed to take them from zero to production-ready skills.

### Phase 2: Instructor Platform (Future)
Tools for educators to create and manage courses using our opinionated content structure. The same methodology that makes learning effective also makes course creation systematic.

---

## First Offerings: AI Automation Courses

We're launching with courses teaching AI-powered workflow automation for any process—business or personal.

See **[brochure.md](./brochure.md)** for course details.

| Course | Focus | Level |
|--------|-------|-------|
| AI Automation for General Workflows | Foundation skills for any automation | Beginner → Advanced |
| AI Automation for Business Processes | Enterprise workflows, integrations, compliance | Intermediate → Advanced |

---

## Platform Architecture

```
data/
├── courses/          # Course definitions
├── modules/          # Module containers
├── module-items/     # Ordered lesson/quiz links
├── lessons/          # Lesson content (Theory → Demo → Practical)
├── quizzes/          # Quiz definitions
└── reference/        # Source documentation
```

### Content Hierarchy
```
Course → Module → ModuleItem → Lesson (or Quiz)
```

### Lesson Structure
Every lesson follows a three-part structure:
1. **Theory** - Understand the concepts
2. **Demonstration** - Watch it in action
3. **Practice** - Build it yourself

---

## Technology

- **Web**: Next.js 16, React 19, Tailwind CSS 4, Motion
- **Data**: Supabase (PostgreSQL) + local JSON fallback
- **Content**: Markdown with structured metadata

---

## Development

```bash
cd web
npm install
npm run dev
```

See `web/` for the learner platform.

---

## Schema

See `db-plan.md` for full entity definitions.
