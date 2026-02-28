// app/scripts/create-course/seeder.ts
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { neon } from '@neondatabase/serverless';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { CourseOutline, CourseJson, ModuleJson, LessonJson } from './types';

function loadDatabaseUrl(): string {
  const envPath = join(__dirname, '..', '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

async function seedCourse(
  sql: NeonQueryFunction<false, false>,
  courseSlug: string,
  contentRoot: string,
  allowIncomplete: boolean,
): Promise<void> {
  const courseDir = join(contentRoot, courseSlug);
  const outline   = readJson<CourseOutline>(join(courseDir, 'course-outline.json'));
  const course    = readJson<CourseJson>(join(courseDir, 'course.json'));

  if (!allowIncomplete && course._status !== 'complete') {
    throw new Error(`course.json._status is "${course._status}" — run with --allow-incomplete to seed anyway`);
  }
  if (course._status === 'todo') {
    console.log(`  skip course ${courseSlug}: marked todo`);
    return;
  }

  // Upsert course
  await sql`
    INSERT INTO courses (id, title, slug, description, outcomes, tag, "order", intro_content, outro_content, confidence_form)
    VALUES (
      ${course.id}, ${course.title}, ${course.slug}, ${course.description},
      ${course.outcomes}, ${course.tag}, ${course.order},
      ${JSON.stringify(course.intro_content)},
      ${JSON.stringify(course.outro_content)},
      ${JSON.stringify(course.confidence_form)}
    )
    ON CONFLICT (id) DO UPDATE SET
      title            = EXCLUDED.title,
      slug             = EXCLUDED.slug,
      description      = EXCLUDED.description,
      outcomes         = EXCLUDED.outcomes,
      tag              = EXCLUDED.tag,
      "order"          = EXCLUDED."order",
      intro_content    = EXCLUDED.intro_content,
      outro_content    = EXCLUDED.outro_content,
      confidence_form  = EXCLUDED.confidence_form
  `;
  console.log(`  upserted course: ${course.title}`);

  for (const outlineMod of outline.modules) {
    const moduleDir  = join(courseDir, outlineMod.slug);
    const modulePath = join(moduleDir, 'module.json');

    if (!existsSync(modulePath)) {
      if (allowIncomplete) { console.log(`  skip module ${outlineMod.slug}: no module.json`); continue; }
      throw new Error(`module.json missing for ${outlineMod.slug}`);
    }

    const mod = readJson<ModuleJson>(modulePath);
    if (mod._status === 'todo') { console.log(`  skip module ${mod.slug}: marked todo`); continue; }
    if (!allowIncomplete && mod._status !== 'complete') {
      throw new Error(`module ${mod.slug}._status is "${mod._status}" — use --allow-incomplete`);
    }

    const lessonsDir = join(moduleDir, 'lessons');
    if (!existsSync(lessonsDir)) {
      if (allowIncomplete) { console.log(`  skip lessons for ${mod.slug}: no lessons/ dir`); continue; }
      throw new Error(`lessons/ dir missing for ${mod.slug}`);
    }

    // Read all lesson files first so we can compute the actual insertable count
    const lessonFiles = readdirSync(lessonsDir).filter(f => f.endsWith('.json')).sort();
    const lessonsToInsert: LessonJson[] = [];
    for (const lessonFile of lessonFiles) {
      const lesson = readJson<LessonJson>(join(lessonsDir, lessonFile));
      if (lesson._status === 'todo') { console.log(`    skip lesson ${lessonFile}: marked todo`); continue; }
      if (!allowIncomplete && lesson._status !== 'complete') {
        throw new Error(`lesson ${lessonFile}._status is "${lesson._status}" — use --allow-incomplete`);
      }
      lessonsToInsert.push(lesson);
    }

    // Fix 2: use actual insertable lesson count instead of the JSON value
    const actualLessonCount = lessonsToInsert.length;

    await sql`
      INSERT INTO modules (id, course_id, title, slug, description, "order", lesson_count, quiz_form, intro_content, outro_content)
      VALUES (
        ${mod.id}, ${course.id}, ${mod.title}, ${mod.slug}, ${mod.description},
        ${mod.order}, ${actualLessonCount},
        ${mod.quiz_form ? JSON.stringify(mod.quiz_form) : null},
        ${JSON.stringify(mod.intro_content)},
        ${JSON.stringify(mod.outro_content)}
      )
      ON CONFLICT (id) DO UPDATE SET
        title         = EXCLUDED.title,
        description   = EXCLUDED.description,
        "order"       = EXCLUDED."order",
        lesson_count  = EXCLUDED.lesson_count,
        quiz_form     = EXCLUDED.quiz_form,
        intro_content = EXCLUDED.intro_content,
        outro_content = EXCLUDED.outro_content
    `;
    console.log(`  upserted module: ${mod.title} (lesson_count=${actualLessonCount})`);

    for (const lesson of lessonsToInsert) {
      await sql`
        INSERT INTO lessons (
          id, module_id, lesson_index, title, content,
          code_template, solution_code, entry_point,
          problem_summary, problem_constraints, problem_hints,
          intro_content, outro_content
        ) VALUES (
          ${lesson.id}, ${mod.id}, ${lesson.lesson_index}, ${lesson.title}, ${lesson.content},
          ${lesson.code_template}, ${lesson.solution_code}, ${lesson.entry_point},
          ${lesson.problem_summary}, ${lesson.problem_constraints}, ${lesson.problem_hints},
          ${JSON.stringify(lesson.intro_content)}, ${JSON.stringify(lesson.outro_content)}
        )
        ON CONFLICT (id) DO UPDATE SET
          title               = EXCLUDED.title,
          content             = EXCLUDED.content,
          code_template       = EXCLUDED.code_template,
          solution_code       = EXCLUDED.solution_code,
          entry_point         = EXCLUDED.entry_point,
          problem_summary     = EXCLUDED.problem_summary,
          problem_constraints = EXCLUDED.problem_constraints,
          problem_hints       = EXCLUDED.problem_hints,
          intro_content       = EXCLUDED.intro_content,
          outro_content       = EXCLUDED.outro_content
      `;

      // Fix 1: wrap DELETE + INSERT test_cases in a transaction to prevent partial state
      await sql.transaction([
        sql`DELETE FROM test_cases WHERE lesson_id = ${lesson.id}`,
        ...lesson.test_cases.map(tc =>
          sql`INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
              VALUES (
                ${tc.id}, ${lesson.id}, ${tc.position}, ${tc.description},
                ${JSON.stringify(tc.args)}, ${JSON.stringify(tc.expected)}, ${tc.visible}
              )`
        ),
      ]);
      console.log(`    upserted lesson: ${lesson.title} (${lesson.test_cases.length} test cases)`);
    }
  }
}

async function main(): Promise<void> {
  const args          = process.argv.slice(2);
  const courseArg     = args.find(a => a.startsWith('--course='))?.split('=')[1];
  const allowIncomplete = args.includes('--allow-incomplete');

  const sql        = neon(loadDatabaseUrl());
  const contentRoot = join(__dirname, '..', '..', 'content');

  if (!existsSync(contentRoot)) {
    throw new Error('app/content/ not found — create a course first with /create-course');
  }

  const slugs = courseArg
    ? [courseArg]
    : readdirSync(contentRoot, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

  for (const slug of slugs) {
    console.log(`\nSeeding: ${slug}`);
    await seedCourse(sql, slug, contentRoot, allowIncomplete);
  }

  console.log('\nRunning validation...');
  try {
    execSync('node app/scripts/validate-content.mjs', { stdio: 'inherit', cwd: join(__dirname, '..', '..', '..') });
  } catch {
    console.error('Seed failed validation — fix errors above.');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
