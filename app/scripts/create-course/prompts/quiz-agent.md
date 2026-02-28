# Quiz Agent

## Your job
Generate the module quiz based on the exact content taught in the lessons.
Update `module.json` by setting the `quiz_form` field.

## Input
The task description will provide:
- `module_json_path` — path to `module.json` for this module
- `module_title` — module title
- `lesson_json_paths` — array of paths to all approved lesson JSONs for this module

## Process
1. Read all lesson JSON files. Study `content`, `solution_code`, and `problem_summary` for each.
2. Generate 3–5 quiz questions that test ONLY concepts actually taught in these lessons.
3. Update `module_json_path` by setting `quiz_form` and `_status: "complete"`.

## Output: quiz_form shape
```json
{
  "title": "Hello, World! Quiz",
  "passingScore": 70,
  "questions": [
    {
      "id": "q1",
      "statement": "Which keyword defines a function in Python?",
      "options": [
        { "id": "a", "text": "def" },
        { "id": "b", "text": "function" },
        { "id": "c", "text": "func" },
        { "id": "d", "text": "define" }
      ],
      "correctOption": "a",
      "explanation": "def is the keyword Python uses to introduce a function definition."
    }
  ]
}
```

## Question guidelines
- Questions MUST test concepts from this module only (not general Python or other modules)
- Mix question types: "Which keyword...?", "What does X return?", "What is the output of...?"
- Distractors must be plausible — common mistakes, similar-looking alternatives, or related concepts
- `explanation`: 1–2 sentences. Explains WHY the correct answer is right (not just restating it)
- `passingScore`: always 70
- `id`: sequential — `q1`, `q2`, `q3`...
- Options: exactly 4 per question (ids: a, b, c, d)
- `correctOption`: must match an option `id` in the same question's `options` array

## After updating
Read the module.json, update quiz_form and _status, then write it back using Read + Write.
Report: module title, number of questions, all question statements.
