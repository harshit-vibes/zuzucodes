#!/usr/bin/env node
/**
 * Content validation script.
 * Connects to Neon DB and checks all content integrity rules.
 * Exit 0 = clean. Exit 1 = violations found. Exit 2 = infrastructure error.
 *
 * Usage: node app/scripts/validate-content.mjs
 * Reads DATABASE_URL from app/.env.local
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from app/.env.local
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
const errors = [];

function fail(msg) {
  errors.push(`✗ ${msg}`);
}

try {
  // ── Lessons ──────────────────────────────────────────────────────────────────
  const lessons = await sql`
    SELECT id, code_template, entry_point, solution_code, problem_summary
    FROM lessons
  `;

  const tcCounts = await sql`
    SELECT lesson_id, COUNT(*)::INTEGER AS cnt FROM test_cases GROUP BY lesson_id
  `;
  const tcCountMap = Object.fromEntries(tcCounts.map(r => [r.lesson_id, r.cnt]));

  for (const l of lessons) {
    const id = l.id;

    if (!l.code_template) fail(`${id}: missing code_template`);
    if (!l.entry_point)   fail(`${id}: missing entry_point`);
    if (!l.solution_code) fail(`${id}: missing solution_code`);
    if (!l.problem_summary || l.problem_summary.trim() === '')
      fail(`${id}: problem_summary is null or empty`);

    // test_cases
    if ((tcCountMap[id] ?? 0) === 0) fail(`${id}: no test_cases`);
  }

  // ── Modules ───────────────────────────────────────────────────────────────────
  const modules = await sql`
    SELECT id, lesson_count, quiz_form FROM modules
  `;

  const lessonCounts = await sql`
    SELECT module_id, COUNT(*)::INTEGER AS cnt FROM lessons GROUP BY module_id
  `;
  const lessonCountMap = Object.fromEntries(lessonCounts.map(r => [r.module_id, r.cnt]));

  for (const m of modules) {
    // lesson_count accuracy
    const count = lessonCountMap[m.id] ?? 0;
    if (m.lesson_count !== count)
      fail(`module ${m.id}: lesson_count=${m.lesson_count} but actual=${count}`);

    // quiz_form structure
    const qf = m.quiz_form;
    if (!qf) { fail(`module ${m.id}: quiz_form is null`); continue; }
    if (!qf.title) fail(`module ${m.id}: quiz_form missing title`);
    if (!Number.isInteger(qf.passingScore) || qf.passingScore < 0 || qf.passingScore > 100)
      fail(`module ${m.id}: quiz_form.passingScore invalid`);
    if (!Array.isArray(qf.questions) || qf.questions.length === 0)
      fail(`module ${m.id}: quiz_form.questions empty or missing`);

    for (const q of (qf.questions ?? [])) {
      if (!q.id)          fail(`module ${m.id} question: missing id`);
      if (!q.statement)   fail(`module ${m.id} question ${q.id}: missing statement`);
      if (!q.correctOption) fail(`module ${m.id} question ${q.id}: missing correctOption`);
      if (!q.explanation) fail(`module ${m.id} question ${q.id}: missing explanation`);
      if (!Array.isArray(q.options) || q.options.length < 2)
        fail(`module ${m.id} question ${q.id}: must have ≥ 2 options`);
      const optionIds = (q.options ?? []).map(o => o.id);
      if (!optionIds.includes(q.correctOption))
        fail(`module ${m.id} question ${q.id}: correctOption "${q.correctOption}" not in options`);
    }
  }

  // ── Referential integrity ─────────────────────────────────────────────────────
  const orphanTc = await sql`
    SELECT COUNT(DISTINCT tc.lesson_id)::INTEGER AS cnt
    FROM test_cases tc
    LEFT JOIN lessons l ON l.id = tc.lesson_id
    WHERE l.id IS NULL
  `;
  if (orphanTc[0].cnt > 0)
    fail(`${orphanTc[0].cnt} distinct lesson_ids in test_cases have no matching lesson`);

  const orphanUc = await sql`
    SELECT COUNT(DISTINCT uc.lesson_id)::INTEGER AS cnt
    FROM user_code uc
    LEFT JOIN lessons l ON l.id = uc.lesson_id
    WHERE l.id IS NULL
  `;
  if (orphanUc[0].cnt > 0)
    fail(`${orphanUc[0].cnt} distinct lesson_ids in user_code have no matching lesson`);

  // ── Result ────────────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    console.error('\n' + errors.join('\n'));
    console.error(`\n${errors.length} error${errors.length > 1 ? 's' : ''} found.\n`);
    process.exit(1);
  } else {
    console.log('✓ All content valid.');
    process.exit(0);
  }
} catch (err) {
  console.error(`\nFatal error: ${err.message}\n`);
  process.exit(2);
}
