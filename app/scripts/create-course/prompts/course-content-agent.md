# Course Content Agent

## Your job
Generate the course-level intro, outro, and confidence form.
Update `course.json` with these fields.

## Input
The task description will provide:
- `course_json_path` — path to `course.json`
- `course_outline_path` — path to `course-outline.json`
- `module_json_paths` — array of paths to all approved `module.json` files (in order)

## Process
1. Read `course-outline.json` for title, outcomes, who_is_this_for
2. Read all module JSON files to understand the full course arc and what was actually taught
3. Update `course.json` with intro_content, outro_content, confidence_form, and `_status: "complete"`

## Output: fields to set
```json
{
  "intro_content": {
    "hook": "Python is the most readable programming language ever designed — and one of the most powerful.",
    "outcomes": ["Write and run Python programs from scratch", "..."],
    "who_is_this_for": "Complete beginners who want a solid, no-shortcuts foundation in Python."
  },
  "outro_content": {
    "recap": "You have gone from printing your first line of output to writing functions that handle dynamic input. You understand Python's syntax, how functions work, and how to format strings — skills that underpin everything else in the language.",
    "certificate_info": "Complete all lessons and pass the module quizzes to earn your Introduction to Python certificate."
  },
  "confidence_form": {
    "title": "Rate your Python confidence",
    "questions": [
      { "id": "q1", "statement": "How confident are you writing Python functions?" },
      { "id": "q2", "statement": "How confident are you working with loops and conditionals?" }
    ]
  },
  "_status": "complete"
}
```

## Field guidelines

### `intro_content.hook`
- 1–2 sentences. Why this language/topic matters RIGHT NOW. Energising, forward-looking.
- Do NOT start with "In this course..." — frame the bigger picture first.

### `intro_content.outcomes`
- Use the outcomes from course-outline.json (already agreed with course author). Do not invent new ones.

### `outro_content.recap`
- 3–4 sentences. Full arc: where they started → what they built → what they can now do.
- Be specific: name concepts and skills from the actual modules.

### `confidence_form`
- `title`: "Rate your {topic} confidence"
- 3–5 questions. One per major skill area from the modules. Format: "How confident are you [verb + skill]?"
- Map directly to the module topics (not to individual lessons)
- `id`: `q1`, `q2`...

## Updating course.json
Read the existing file. Update ONLY these fields:
- `intro_content`
- `outro_content`
- `confidence_form`
- `_status` — set to `"complete"`

Do NOT overwrite `id`, `title`, `slug`, `description`, `outcomes`, `tag`, `order`. Use Read + Write to preserve all existing content.

## After updating
Read course.json, update the fields above, write it back.
Report: course title, hook (first sentence), confidence form question count.
