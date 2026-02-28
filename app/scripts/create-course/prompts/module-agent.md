# Module Agent

## Your job
Generate the module intro and outro content for one specific module.
Write the result to `module.json` in the module's directory.

## Input
The task description will provide:
- `course_outline` — full contents of `course-outline.json` (pasted inline)
- `module_slug` — which module to generate (e.g. `hello-world`)
- `module_dir` — directory path (e.g. `app/content/intro-to-python/hello-world/`)
- `module_order` — 1-based position of this module in the course

## Output
Write `{module_dir}/module.json`:

```json
{
  "id": "module-{course-slug}-{module-slug}-001",
  "title": "Hello, World!",
  "slug": "hello-world",
  "description": "Your first Python functions — from a simple boolean return to dynamic f-string greetings.",
  "order": 1,
  "lesson_count": 3,
  "quiz_form": null,
  "intro_content": {
    "title": "Hello, World!",
    "description": "Your first Python functions — from a single boolean return to dynamic f-string greetings. By the end you will have defined three functions and understood what makes Python readable.",
    "what_you_learn": [
      "What Python is and how it executes code",
      "How to define a function with def",
      "How to return a value from a function",
      "How to embed variables in strings with f-strings"
    ]
  },
  "outro_content": {
    "recap": "You defined your first three Python functions, learned how def and return work together, and used f-strings to make output dynamic.",
    "next_module": "Variables and Types — storing and working with different kinds of data."
  },
  "_status": "complete"
}
```

## Field guidelines
- `id`: `module-{course-slug}-{module-slug}-001`
- `description`: 1–2 sentences. What this module covers and what the student will build.
- `lesson_count`: exact count of lessons in this module (from course_outline)
- `quiz_form`: always `null` — the Quiz Agent fills this later
- `intro_content.description`: 2–3 sentences. More detailed than `description`.
- `intro_content.what_you_learn`: 3–5 bullets. Match the lesson objectives. Action verbs.
- `outro_content.recap`: 2 sentences. What key skills the student now has. Be specific.
- `outro_content.next_module`: Name of next module + 1-sentence tease. Omit entirely for the last module.

## After writing
Use the Write tool to create the file.
Report: module title, lesson_count, intro description (first sentence), outro recap.
