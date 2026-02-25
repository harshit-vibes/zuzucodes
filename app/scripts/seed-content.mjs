#!/usr/bin/env node
/**
 * Seed script — purges all content and inserts fully compliant data.
 * Runs validate-content.mjs at the end. Exits 1 if validation fails.
 *
 * Usage: node app/scripts/seed-content.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

const sql = neon(loadEnv());

console.log('Seeding content...');

// ── Purge ─────────────────────────────────────────────────────────────────────
await sql`DELETE FROM courses`;
console.log('  purged existing content');

// ── Course ───────────────────────────────────────────────────────────────────
await sql`
  INSERT INTO courses (id, title, slug, description, outcomes, tag, "order")
  VALUES (
    'course-intro-python-001',
    'Introduction to Python',
    'intro-to-python',
    'Learn Python from scratch — variables, functions, and clean code.',
    ARRAY[
      'Write and run your first Python program',
      'Understand variables, types, and functions',
      'Read and write clean Python code'
    ],
    'Python',
    1
  )
`;
console.log('  inserted course');

// ── Module ───────────────────────────────────────────────────────────────────
const quizForm = {
  title: 'Hello, World! Quiz',
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      statement: 'Which function is used to display output in Python?',
      options: [
        { id: 'a', text: 'print()' },
        { id: 'b', text: 'echo()' },
        { id: 'c', text: 'console.log()' },
        { id: 'd', text: 'write()' },
      ],
      correctOption: 'a',
      explanation: 'print() is the built-in Python function for writing output to the console.',
    },
    {
      id: 'q2',
      statement: 'What keyword does a function use to send a value back to the caller?',
      options: [
        { id: 'a', text: 'print' },
        { id: 'b', text: 'output' },
        { id: 'c', text: 'return' },
        { id: 'd', text: 'send' },
      ],
      correctOption: 'c',
      explanation: 'The return keyword sends a value back from a function to wherever it was called.',
    },
  ],
};

await sql`
  INSERT INTO modules (id, course_id, title, slug, description, "order", lesson_count, quiz_form)
  VALUES (
    'module-intro-python-hello-world-001',
    'course-intro-python-001',
    'Hello, World!',
    'hello-world',
    'Your first Python functions — from a simple return to dynamic f-strings.',
    1,
    3,
    ${JSON.stringify(quizForm)}
  )
`;
console.log('  inserted module');

// ── Lesson 0: What is Python? ─────────────────────────────────────────────────
await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-hello-world-00',
    'module-intro-python-hello-world-001',
    0,
    'What is Python?',
    ${'Python is a programming language known for its clear, readable syntax.\n\nEvery Python program you write will be **executed** — Python reads your code and runs it. Your job is to write functions that return values.\n\n**Functions** are the building blocks of Python programs:\n\n```python\ndef greet():\n    return "Hello!"\n```\n\nThe `def` keyword defines a function. The `return` keyword sends a value back.\n\nTry it: write a function called `is_python` that returns `True`.'},
    ${'def is_python():\n    # Return True to confirm we\'re in Python\n    pass'},
    ${'def is_python():\n    return True'},
    'is_python',
    'Python is a language that runs code you write. Prove it by writing a function that returns True.',
    ARRAY[]::TEXT[],
    ARRAY['Use the return keyword', 'True with a capital T is Python''s boolean value']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES (
    'tc-lesson-intro-python-hello-world-00-0',
    'lesson-intro-python-hello-world-00',
    0,
    'confirms we''re using Python',
    '[]',
    'true',
    TRUE
  )
`;
console.log('  inserted lesson 0 + test cases');

// ── Lesson 1: Your First Python Function ──────────────────────────────────────
await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-hello-world-01',
    'module-intro-python-hello-world-001',
    1,
    'Your First Python Function',
    ${'Now that you know what Python is, let\'s write a real function.\n\nA function is defined with `def`, has a name, and uses `return` to send back a value:\n\n```python\ndef greet():\n    return "Hello, World!"\n```\n\nThe string `"Hello, World!"` is a **string literal** — text enclosed in quotes.\n\nWrite a function called `greet` that returns exactly `"Hello, World!"`.'},
    ${'def greet():\n    # Return the string "Hello, World!"\n    pass'},
    ${'def greet():\n    return "Hello, World!"'},
    'greet',
    'Write a function named greet that returns the string ''Hello, World!'' — the classic first program.',
    ARRAY[]::TEXT[],
    ARRAY['Functions use the def keyword', 'Use return, not print()']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES (
    'tc-lesson-intro-python-hello-world-01-0',
    'lesson-intro-python-hello-world-01',
    0,
    'returns Hello, World!',
    '[]',
    '"Hello, World!"',
    TRUE
  )
`;
console.log('  inserted lesson 1 + test cases');

// ── Lesson 2: String Formatting with f-strings ────────────────────────────────
await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-hello-world-02',
    'module-intro-python-hello-world-001',
    2,
    'String Formatting with f-strings',
    ${'Hard-coded strings are fine for `"Hello, World!"`, but what if you want to greet *anyone*?\n\n**f-strings** let you embed variables directly inside a string:\n\n```python\nname = "Alice"\nprint(f"Hello, {name}!")  # Hello, Alice!\n```\n\nThe `f` prefix tells Python this is a formatted string. Curly braces `{}` embed the variable\'s value.\n\nWrite a function `make_greeting(name)` that returns `f"Hello, {name}!"`.'},
    ${'def make_greeting(name):\n    # Use an f-string to return "Hello, {name}!"\n    pass'},
    ${'def make_greeting(name):\n    return f"Hello, {name}!"'},
    'make_greeting',
    'Use an f-string to greet someone by name. make_greeting(''Python'') should return ''Hello, Python!''.',
    ARRAY['Use an f-string (f''...'')', 'Parameter is named name'],
    ARRAY['f-strings start with f before the quote', 'Embed variables with {curly braces}']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES
    (
      'tc-lesson-intro-python-hello-world-02-0',
      'lesson-intro-python-hello-world-02',
      0,
      'greets Python',
      '["Python"]',
      '"Hello, Python!"',
      TRUE
    ),
    (
      'tc-lesson-intro-python-hello-world-02-1',
      'lesson-intro-python-hello-world-02',
      1,
      'greets World',
      '["World"]',
      '"Hello, World!"',
      FALSE
    )
`;
console.log('  inserted lesson 2 + test cases');

// ── Validate ──────────────────────────────────────────────────────────────────
console.log('\nRunning validation...');
try {
  execSync('node app/scripts/validate-content.mjs', { stdio: 'inherit', cwd: join(__dirname, '..', '..') });
} catch {
  console.error('Seed failed validation — fix errors above.');
  process.exit(1);
}
