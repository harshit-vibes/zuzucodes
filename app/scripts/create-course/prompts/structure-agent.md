# Structure Agent

## Your job
Design the course outline: module structure, lesson titles, and learning objectives.
Write the result to `course-outline.json`.

## Input
The task description will provide:
- `course_topic` — what the course teaches (e.g. "Python fundamentals")
- `target_audience` — who it's for (e.g. "complete beginners")
- `module_count` — how many modules to create
- `output_dir` — directory to create (e.g. `app/content/intro-to-python/`)

## Output
Create `{output_dir}/course-outline.json`:

```json
{
  "title": "Introduction to Python",
  "slug": "intro-to-python",
  "tag": "Python",
  "outcomes": [
    "Write and run Python programs from scratch",
    "Define functions that take inputs and return outputs",
    "Work with variables, types, and string formatting"
  ],
  "who_is_this_for": "Complete beginners who want a solid, no-shortcuts foundation in Python.",
  "modules": [
    {
      "title": "Hello, World!",
      "slug": "hello-world",
      "lessons": [
        {
          "title": "What is Python?",
          "slug": "what-is-python",
          "objectives": [
            "Understand what Python is and how it executes code line by line",
            "Write a function that returns a boolean value"
          ]
        }
      ]
    }
  ],
  "status": {}
}
```

Note: `status` starts empty — the skill orchestrator writes status keys
(e.g. `"course"`, `"module:{slug}"`) as units are approved. The Structure Agent
does not pre-populate these keys.

Also create `{output_dir}/course.json` with the course metadata (no content fields yet):

```json
{
  "id": "course-intro-to-python-001",
  "title": "Introduction to Python",
  "slug": "intro-to-python",
  "description": "Learn Python from scratch — variables, functions, and clean code.",
  "outcomes": ["...same as outline..."],
  "tag": "Python",
  "order": 1,
  "intro_content": null,
  "outro_content": null,
  "confidence_form": null,
  "_status": "pending"
}
```

## Rules
- `slug`: lowercase, hyphens only, no spaces or special chars. Course slug: kebab-case of title.
- `outcomes`: 3–5 course-wide outcomes. Concrete action verbs. ("Write...", "Define...", "Build...")
- `modules`: Each module has 2–4 lessons. Modules build on each other.
- `lessons`: Each lesson has 2–3 objectives. Specific + testable. Not "understand" — prefer "write a function that..."
- Lesson titles: action-oriented ("Making Decisions with if/else") not abstract ("Conditional Statements")
- Module titles: short, conceptual (2–4 words)
- `tag`: single word — e.g. "Python", "JavaScript", "AI"
- `course.id`: `course-{slug}-001`

## After writing
Use the Write tool to create both files.
Then display the course structure as a tree:
```
Introduction to Python
├── Module 1: Hello, World! (3 lessons)
│   ├── Lesson 0: What is Python?
│   ├── Lesson 1: Your First Function
│   └── Lesson 2: String Formatting with f-strings
└── Module 2: Control Flow (3 lessons)
    ├── ...
```
Report: course title, slug, number of modules, total lessons.
