import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// ── Content ───────────────────────────────────────────────────────────────────

const lesson0Content = `## What is Python?

Python is a **high-level, interpreted programming language** known for its clean, readable syntax. Created by Guido van Rossum in 1991, it has become the most popular language for beginners and experts alike.

### Why Python?

- **Readable** — code looks almost like plain English
- **Versatile** — used for web apps, data science, AI, automation, scripting
- **Huge ecosystem** — thousands of libraries for everything
- **Beginner-friendly** — less boilerplate than most languages

### Where is Python used?

| Domain | Example |
|--------|------------------|
| AI / ML | PyTorch, scikit-learn |
| Web | Django, FastAPI |
| Data | Pandas, Jupyter |
| Automation | scripts, bots |

### Your first taste

Every Python program is a plain text file. The interpreter reads it line by line:

\`\`\`python
print("Hello, World!")
\`\`\`

Run that and you'll see \`Hello, World!\` printed to the screen.

In the next lesson you'll write and run this yourself.
`;

const lesson1Content = `## Your First Python Function

In Python, a **function** is a reusable block of code you give a name to.

You define one with the \`def\` keyword:

\`\`\`python
def greet():
    return "Hello, World!"
\`\`\`

### Breaking it down

| Part | Meaning |
|------|---------|
| \`def\` | "I am defining a function" |
| \`greet\` | the function's name |
| \`()\` | no inputs needed |
| \`return\` | send this value back to the caller |

### Task

Complete the \`greet()\` function so it **returns** the string \`"Hello, World!"\`.

Click **Run** — if the test passes, the lesson is automatically marked complete.
`;

const lesson1Template = `def greet():
    # Return the string "Hello, World!"
    pass
`;

const lesson1TestCode = `result = greet()
assert result == "Hello, World!", f"Expected 'Hello, World!', got {result!r}"
`;

const lesson2Content = `## String Formatting with f-strings

Hardcoding \`"Hello, World!"\` is fine for a first program, but real programs greet *people*.

Python's **f-strings** let you embed variables directly in a string:

\`\`\`python
name = "Alice"
greeting = f"Hello, {name}!"
print(greeting)  # Hello, Alice!
\`\`\`

Prefix the string with \`f\` and wrap any variable in \`{}\` — Python substitutes its value at runtime.

### Task

You are given a \`name\` variable. Build a \`greeting\` string using an f-string so that:

\`\`\`
greeting == f"Hello, {name}!"
\`\`\`

Stuck? Use **Show Answer** to see the solution.
`;

const lesson2Template = `name = "Python"
# Build greeting using an f-string
greeting = ""
`;

const lesson2TestCode = `assert greeting == f"Hello, {name}!", f"Expected 'Hello, {name}!', got {greeting!r}"
`;

const lesson2Solution = `name = "Python"
greeting = f"Hello, {name}!"
`;

const quizForm = {
  title: "Hello, World! Quiz",
  passingScore: 70,
  questions: [
    {
      id: "q1",
      statement: "Which function is used to display output in Python?",
      options: [
        { id: "a", text: "print()" },
        { id: "b", text: "echo()" },
        { id: "c", text: "console.log()" },
        { id: "d", text: "write()" },
      ],
      correctOption: "a",
      explanation: "print() is the built-in Python function for writing output to the console.",
    },
    {
      id: "q2",
      statement: "What keyword does a function use to send a value back to the caller?",
      options: [
        { id: "a", text: "print" },
        { id: "b", text: "output" },
        { id: "c", text: "return" },
        { id: "d", text: "send" },
      ],
      correctOption: "c",
      explanation: "The return keyword sends a value back from a function to wherever it was called.",
    },
  ],
};

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  // Course
  await sql`
    INSERT INTO courses (id, title, slug, description, outcomes, tag, "order")
    VALUES (
      'course-intro-python-001',
      'Introduction to Python',
      'intro-to-python',
      'Learn Python from scratch — the most readable language for beginners and the backbone of AI.',
      ${['Write and run your first Python program', 'Understand variables, types, and functions', 'Read and write clean Python code']},
      'Python',
      10
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      outcomes = EXCLUDED.outcomes
  `;
  console.log('✓ course');

  // Module
  await sql`
    INSERT INTO modules (id, course_id, title, slug, description, "order", mdx_content, quiz_form)
    VALUES (
      'module-intro-python-hello-world-001',
      'course-intro-python-001',
      'Hello, World!',
      'hello-world',
      'Write your first lines of Python and learn how functions and variables work.',
      1,
      '',
      ${JSON.stringify(quizForm)}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      quiz_form = EXCLUDED.quiz_form
  `;
  console.log('✓ module');

  // Lesson 0 — theory only, no code (manual Mark as Complete)
  await sql`
    INSERT INTO lessons (id, module_id, lesson_index, title, content, code_template, test_code, solution_code)
    VALUES (
      'lesson-intro-python-hello-world-00',
      'module-intro-python-hello-world-001',
      0,
      'What is Python?',
      ${lesson0Content},
      NULL, NULL, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content,
      code_template = EXCLUDED.code_template,
      test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code
  `;
  console.log('✓ lesson 0 (theory — manual completion)');

  // Lesson 1 — code + test_code only (auto-complete, no Show Answer)
  await sql`
    INSERT INTO lessons (id, module_id, lesson_index, title, content, code_template, test_code, solution_code)
    VALUES (
      'lesson-intro-python-hello-world-01',
      'module-intro-python-hello-world-001',
      1,
      'Your First Python Function',
      ${lesson1Content},
      ${lesson1Template},
      ${lesson1TestCode},
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content,
      code_template = EXCLUDED.code_template,
      test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code
  `;
  console.log('✓ lesson 1 (code + test_code — auto-complete)');

  // Lesson 2 — code + test_code + solution_code (auto-complete + Show Answer)
  await sql`
    INSERT INTO lessons (id, module_id, lesson_index, title, content, code_template, test_code, solution_code)
    VALUES (
      'lesson-intro-python-hello-world-02',
      'module-intro-python-hello-world-001',
      2,
      'String Formatting with f-strings',
      ${lesson2Content},
      ${lesson2Template},
      ${lesson2TestCode},
      ${lesson2Solution}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content,
      code_template = EXCLUDED.code_template,
      test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code
  `;
  console.log('✓ lesson 2 (code + test_code + solution_code — auto-complete + Show Answer)');

  console.log('\nDone. Navigate to /dashboard to see the course.');
}

seed().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
