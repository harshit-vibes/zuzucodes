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

Click **Submit** — if all tests pass, the lesson is automatically marked complete.
`;

const lesson1Template = `def greet():
    # Return the string "Hello, World!"
    pass
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

Write a function \`make_greeting(name)\` that returns a greeting string using an f-string:

\`\`\`python
make_greeting("Alice")  # → "Hello, Alice!"
\`\`\`

Stuck? Use **Show Answer** to see the solution.
`;

const lesson2Template = `def make_greeting(name):
    # Return f"Hello, {name}!"
    pass
`;

const lesson2Solution = `def make_greeting(name):
    return f"Hello, {name}!"
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
    INSERT INTO lessons (id, module_id, lesson_index, title, content,
                         code_template, test_code, solution_code,
                         test_cases, entry_point)
    VALUES (
      'lesson-intro-python-hello-world-00',
      'module-intro-python-hello-world-001',
      0,
      'What is Python?',
      ${lesson0Content},
      NULL, NULL, NULL, NULL, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content,
      code_template = EXCLUDED.code_template,
      test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code,
      test_cases = EXCLUDED.test_cases, entry_point = EXCLUDED.entry_point
  `;
  console.log('✓ lesson 0 (theory — manual completion)');

  // Lesson 1 — greet() function, Judge0 test cases
  const lesson1TestCases = [
    { description: 'returns Hello World', args: [], expected: 'Hello, World!' }
  ];

  await sql`
    INSERT INTO lessons (id, module_id, lesson_index, title, content,
                         code_template, test_code, solution_code,
                         test_cases, entry_point)
    VALUES (
      'lesson-intro-python-hello-world-01',
      'module-intro-python-hello-world-001',
      1,
      'Your First Python Function',
      ${lesson1Content},
      ${lesson1Template},
      NULL,
      NULL,
      ${JSON.stringify(lesson1TestCases)}::jsonb,
      'greet'
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content,
      code_template = EXCLUDED.code_template,
      test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code,
      test_cases = EXCLUDED.test_cases, entry_point = EXCLUDED.entry_point
  `;
  console.log('✓ lesson 1 (greet — Judge0 test cases)');

  // Lesson 2 — make_greeting(name) f-string function, Judge0 test cases
  const lesson2TestCases = [
    { description: 'greets Python', args: ['Python'], expected: 'Hello, Python!' },
    { description: 'greets Alice', args: ['Alice'], expected: 'Hello, Alice!' },
  ];

  await sql`
    INSERT INTO lessons (id, module_id, lesson_index, title, content,
                         code_template, test_code, solution_code,
                         test_cases, entry_point)
    VALUES (
      'lesson-intro-python-hello-world-02',
      'module-intro-python-hello-world-001',
      2,
      'String Formatting with f-strings',
      ${lesson2Content},
      ${lesson2Template},
      NULL,
      ${lesson2Solution},
      ${JSON.stringify(lesson2TestCases)}::jsonb,
      'make_greeting'
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content,
      code_template = EXCLUDED.code_template,
      test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code,
      test_cases = EXCLUDED.test_cases, entry_point = EXCLUDED.entry_point
  `;
  console.log('✓ lesson 2 (make_greeting — Judge0 test cases)');

  console.log('\nDone. Navigate to /dashboard to see the course.');
}

seed().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
