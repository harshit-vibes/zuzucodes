#!/usr/bin/env node
/**
 * Seed script — purges all content and inserts fully compliant data.
 * Runs validate-content.mjs at the end. Exits 1 if validation fails.
 *
 * Usage: npm run seed  (from app/)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';
import { assertValidContent } from '../src/lib/templates/validate';

function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

async function main() {
  const sql = neon(loadEnv());

  console.log('Seeding content...');

  await sql`DELETE FROM courses`;
  console.log('  purged existing content');

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
      ${'Python is a programming language known for its clear, readable syntax. Every Python program you write is executed — Python reads your code line by line and runs it.\n\n```python\nprint("Hello!")  # Python runs this and displays Hello!\n```\n\n---\n\nFunctions are the building blocks of Python programs. You define one with the `def` keyword, give it a name, and use `return` to send a value back.\n\n```python\ndef greet():\n    return "Hello!"\n```'},
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
      ${'A function is a named block of code you can call by name. You define one with `def`, followed by the function\'s name and parentheses. The `pass` keyword is a placeholder that does nothing — useful while you\'re building up.\n\n```python\ndef greet():\n    pass  # placeholder — does nothing yet\n```\n\n---\n\nThe `return` keyword sends a value back to whoever called the function. String literals are text enclosed in quotes.\n\n```python\ndef greet():\n    return "Hello, World!"\n```'},
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
      ${'Hard-coded strings only work for one specific value. If you want to greet different people, you need a variable. String concatenation works, but it\'s clunky and error-prone.\n\n```python\nname = "Alice"\ngreeting = "Hello, " + name + "!"\n```\n\n---\n\nf-strings let you embed variables directly inside a string using curly braces. The `f` prefix before the opening quote tells Python to interpret `{name}` as the variable\'s value.\n\n```python\nname = "Alice"\ngreeting = f"Hello, {name}!"\n```'},
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

  const lesson0Id = 'lesson-intro-python-hello-world-00';

  const lesson0Intro = assertValidContent('lesson-intro', {
    hook: 'Python is one of the most readable and versatile programming languages in the world — and it runs exactly the code you write.',
    outcomes: [
      'Understand what Python is and why it matters',
      'Write a function that returns a value',
      'Recognise Python syntax basics: def, return, and booleans',
    ],
    estimated_minutes: 5,
  });

  await sql`
    UPDATE lessons
    SET intro_content = ${JSON.stringify(lesson0Intro)}
    WHERE id = ${lesson0Id}
  `;

  const lesson0Outro = assertValidContent('lesson-outro', {
    recap: "You learned that Python executes code line by line, and that functions use def and return to produce values. True (capital T) is Python's boolean for yes.",
    next_lesson_teaser: 'Next up: write your very first function from scratch.',
  });

  await sql`
    UPDATE lessons
    SET outro_content = ${JSON.stringify(lesson0Outro)}
    WHERE id = ${lesson0Id}
  `;

  const lesson0Section0 = assertValidContent('code-section', {
    explanation: 'Every Python program you write is executed from top to bottom. Python reads your code line by line and runs it. The simplest thing you can do is display some output with print().',
    code: 'print("Hello!")  # Python runs this and displays Hello!',
    language: 'python',
    takeaway: 'print() is how Python shows output to the console.',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (
      ${'ls-intro-python-hello-world-00-0'},
      ${lesson0Id},
      ${0},
      'code-section',
      ${JSON.stringify(lesson0Section0)}
    )
    ON CONFLICT (lesson_id, position) DO UPDATE
      SET template = EXCLUDED.template,
          content  = EXCLUDED.content
  `;

  const lesson0Section1 = assertValidContent('code-section', {
    explanation: 'Functions are the building blocks of Python programs. You define one with the def keyword, give it a name, and use return to send a value back to whoever called it.',
    code: 'def greet():\n    return "Hello!"\n\nresult = greet()  # result is now "Hello!"',
    language: 'python',
    takeaway: 'def names a function; return sends a value back.',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (
      ${'ls-intro-python-hello-world-00-1'},
      ${lesson0Id},
      ${1},
      'code-section',
      ${JSON.stringify(lesson0Section1)}
    )
    ON CONFLICT (lesson_id, position) DO UPDATE
      SET template = EXCLUDED.template,
          content  = EXCLUDED.content
  `;

  console.log('  seeded lesson_sections, intro_content, and outro_content for lesson 0');

  // ── Lesson 1: Your First Python Function ─────────────────────────────────

  const lesson1Id = 'lesson-intro-python-hello-world-01';

  const lesson1Intro = assertValidContent('lesson-intro', {
    hook: 'Every useful Python program is built from functions — named blocks of code you define once and call whenever you need them.',
    outcomes: [
      'Define a function using the def keyword',
      'Use return to send a value back to the caller',
      'Write and call your first Python function',
    ],
    estimated_minutes: 5,
  });

  await sql`UPDATE lessons SET intro_content = ${JSON.stringify(lesson1Intro)} WHERE id = ${lesson1Id}`;

  const lesson1Outro = assertValidContent('lesson-outro', {
    recap: "You wrote a function named greet that returns the string \"Hello, World!\". You used def to define it and return to send a value back — the two keywords at the heart of every Python function.",
    next_lesson_teaser: 'Next up: make your greeting dynamic with f-strings.',
  });

  await sql`UPDATE lessons SET outro_content = ${JSON.stringify(lesson1Outro)} WHERE id = ${lesson1Id}`;

  const lesson1Section0 = assertValidContent('code-section', {
    explanation: 'A function starts with the def keyword, followed by the function name and parentheses. The body is indented — Python uses indentation instead of braces. The pass keyword is a temporary placeholder that does nothing.',
    code: 'def greet():\n    pass  # placeholder — does nothing yet',
    language: 'python',
    takeaway: 'def starts a function; the body must be indented.',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (${'ls-intro-python-hello-world-01-0'}, ${lesson1Id}, ${0}, 'code-section', ${JSON.stringify(lesson1Section0)})
    ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
  `;

  const lesson1Section1 = assertValidContent('code-section', {
    explanation: 'The return keyword sends a value back to whoever called the function. String literals are text in quotes. Once you add return, calling greet() produces a value you can use.',
    code: 'def greet():\n    return "Hello, World!"\n\nresult = greet()  # result is "Hello, World!"',
    language: 'python',
    takeaway: 'return sends a value out of the function to the caller.',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (${'ls-intro-python-hello-world-01-1'}, ${lesson1Id}, ${1}, 'code-section', ${JSON.stringify(lesson1Section1)})
    ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
  `;

  console.log('  seeded lesson_sections, intro_content, and outro_content for lesson 1');

  // ── Lesson 2: String Formatting with f-strings ────────────────────────────

  const lesson2Id = 'lesson-intro-python-hello-world-02';

  const lesson2Intro = assertValidContent('lesson-intro', {
    hook: 'Hard-coded strings are fine for fixed output, but real programs need to respond to data. f-strings let you embed any variable directly inside a string.',
    outcomes: [
      'Understand why hard-coded strings are limiting',
      'Use an f-string to embed a variable in a string',
      'Write a function that greets any name dynamically',
    ],
    estimated_minutes: 5,
  });

  await sql`UPDATE lessons SET intro_content = ${JSON.stringify(lesson2Intro)} WHERE id = ${lesson2Id}`;

  const lesson2Outro = assertValidContent('lesson-outro', {
    recap: "You used an f-string to build a greeting that works for any name. The f prefix tells Python to treat text inside curly braces as code, not as literal characters.",
    next_lesson_teaser: "You've finished the module — take the quiz to lock in what you've learned.",
  });

  await sql`UPDATE lessons SET outro_content = ${JSON.stringify(lesson2Outro)} WHERE id = ${lesson2Id}`;

  const lesson2Section0 = assertValidContent('code-section', {
    explanation: 'When you hard-code a string, it only works for one specific value. String concatenation with + lets you combine strings and variables, but it gets unwieldy quickly and breaks if the variable is not a string.',
    code: 'name = "Alice"\ngreeting = "Hello, " + name + "!"  # clunky\nprint(greeting)  # Hello, Alice!',
    language: 'python',
    takeaway: 'Concatenation works but is error-prone — there is a better way.',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (${'ls-intro-python-hello-world-02-0'}, ${lesson2Id}, ${0}, 'code-section', ${JSON.stringify(lesson2Section0)})
    ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
  `;

  const lesson2Section1 = assertValidContent('code-section', {
    explanation: 'f-strings start with the letter f before the opening quote. Anything inside curly braces is treated as a Python expression — the variable\'s value is substituted in at runtime.',
    code: 'name = "Alice"\ngreeting = f"Hello, {name}!"\nprint(greeting)  # Hello, Alice!',
    language: 'python',
    takeaway: 'f"...{variable}..." embeds any variable directly in a string.',
  });

  await sql`
    INSERT INTO lesson_sections (id, lesson_id, position, template, content)
    VALUES (${'ls-intro-python-hello-world-02-1'}, ${lesson2Id}, ${1}, 'code-section', ${JSON.stringify(lesson2Section1)})
    ON CONFLICT (lesson_id, position) DO UPDATE SET template = EXCLUDED.template, content = EXCLUDED.content
  `;

  console.log('  seeded lesson_sections, intro_content, and outro_content for lesson 2');

  // ── Module intro/outro ────────────────────────────────────────────────────

  const moduleId = 'module-intro-python-hello-world-001';

  const moduleIntro = assertValidContent('module-intro', {
    title: 'Hello, World!',
    description: 'Your first Python functions — from a single boolean return to dynamic f-string greetings. By the end you will have defined three functions and understood what makes Python readable.',
    what_you_learn: [
      'What Python is and how it executes code',
      'How to define a function with def',
      'How to return a value from a function',
      'How to embed variables in strings with f-strings',
    ],
  });

  await sql`UPDATE modules SET intro_content = ${JSON.stringify(moduleIntro)} WHERE id = ${moduleId}`;

  const moduleOutro = assertValidContent('module-outro', {
    recap: "You defined your first three Python functions, learned how def and return work together, and used f-strings to make output dynamic. These are the building blocks of every Python program you will write.",
    next_module: 'Variables and Types — storing and working with different kinds of data.',
  });

  await sql`UPDATE modules SET outro_content = ${JSON.stringify(moduleOutro)} WHERE id = ${moduleId}`;

  console.log('  seeded intro_content and outro_content for module');

  // ── Course intro/outro ────────────────────────────────────────────────────

  const courseId = 'course-intro-python-001';

  const courseIntro = assertValidContent('course-intro', {
    hook: 'Python is the most readable programming language ever designed — and one of the most powerful. This course takes you from your very first line to writing clean, functional code with confidence.',
    outcomes: [
      'Write and run Python programs from scratch',
      'Define functions that take inputs and return outputs',
      'Work with variables, types, and string formatting',
      'Read and understand real Python code',
    ],
    who_is_this_for: 'Complete beginners who want a solid, no-shortcuts foundation in Python.',
  });

  await sql`UPDATE courses SET intro_content = ${JSON.stringify(courseIntro)} WHERE id = ${courseId}`;

  const courseOutro = assertValidContent('course-outro', {
    recap: "You have gone from printing your first line of output to writing functions that handle dynamic input. You understand Python's syntax, how functions work, and how to format strings — skills that underpin everything else in the language.",
    certificate_info: 'Complete all lessons and pass the module quiz to earn your Introduction to Python certificate.',
  });

  await sql`UPDATE courses SET outro_content = ${JSON.stringify(courseOutro)} WHERE id = ${courseId}`;

  console.log('  seeded intro_content and outro_content for course');

  console.log('\nRunning validation...');
  try {
    execSync('node app/scripts/validate-content.mjs', { stdio: 'inherit', cwd: join(__dirname, '..', '..') });
  } catch {
    console.error('Seed failed validation — fix errors above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
