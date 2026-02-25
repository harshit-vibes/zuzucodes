#!/usr/bin/env node
/**
 * Content validation script.
 * Connects to Neon DB and checks all content integrity rules.
 * Exit 0 = clean. Exit 1 = violations found.
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
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

const sql = neon(loadEnv());
const errors = [];

function fail(msg) {
  errors.push(`✗ ${msg}`);
}

// ── Lessons ──────────────────────────────────────────────────────────────────
const lessons = await sql`SELECT * FROM lessons ORDER BY lesson_index`;

for (const l of lessons) {
  const id = l.id;

  if (!l.code_template) fail(`${id}: missing code_template`);
  if (!l.entry_point)   fail(`${id}: missing entry_point`);
  if (!l.solution_code) fail(`${id}: missing solution_code`);
  if (!l.problem_summary || l.problem_summary.trim() === '')
    fail(`${id}: problem_summary is null or empty`);

  // test_cases
  const tcs = await sql`SELECT * FROM test_cases WHERE lesson_id = ${id}`;
  if (tcs.length === 0) fail(`${id}: no test_cases`);
}

// ── Modules ───────────────────────────────────────────────────────────────────
const modules = await sql`SELECT * FROM modules`;

for (const m of modules) {
  // lesson_count accuracy
  const [{ count }] = await sql`
    SELECT COUNT(*)::INTEGER AS count FROM lessons WHERE module_id = ${m.id}
  `;
  if (m.lesson_count !== count)
    fail(`module ${m.id}: lesson_count=${m.lesson_count} but actual=${count}`);

  // quiz_form structure
  const qf = m.quiz_form;
  if (!qf) { fail(`module ${m.id}: quiz_form is null`); continue; }
  if (!qf.title) fail(`module ${m.id}: quiz_form missing title`);
  if (typeof qf.passingScore !== 'number' || qf.passingScore < 0 || qf.passingScore > 100)
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
  SELECT tc.id FROM test_cases tc
  LEFT JOIN lessons l ON l.id = tc.lesson_id
  WHERE l.id IS NULL
`;
if (orphanTc.length > 0)
  fail(`${orphanTc.length} orphaned test_cases rows`);

const orphanUc = await sql`
  SELECT uc.lesson_id FROM user_code uc
  LEFT JOIN lessons l ON l.id = uc.lesson_id
  WHERE l.id IS NULL
`;
if (orphanUc.length > 0)
  fail(`${orphanUc.length} orphaned user_code rows`);

// ── Result ────────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('\n' + errors.join('\n'));
  console.error(`\n${errors.length} error${errors.length > 1 ? 's' : ''} found.\n`);
  process.exit(1);
} else {
  console.log('✓ All content valid.');
  process.exit(0);
}
