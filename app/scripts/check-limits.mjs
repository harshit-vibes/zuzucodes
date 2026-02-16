import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET
);

async function checkLimits() {
  console.log('\n=== CONTENT LIMITS AUDIT ===\n');

  // 1. Check courses per track
  console.log('📚 COURSES PER TRACK (limit: 1-8)');
  console.log('-'.repeat(60));

  const { data: tracks } = await supabase
    .from('tracks')
    .select('id, title, track_courses(course_id)');

  for (const track of tracks || []) {
    const count = track.track_courses?.length || 0;
    const status = count < 1 ? '❌ BELOW MIN' : count > 8 ? '❌ ABOVE MAX' : '✅ OK';
    console.log(`${status} | ${count}/8 | ${track.title}`);
  }

  // 2. Check modules per course
  console.log('\n📖 MODULES PER COURSE (limit: 1-5)');
  console.log('-'.repeat(60));

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, modules(id)');

  let moduleViolations = [];
  for (const course of courses || []) {
    const count = course.modules?.length || 0;
    const status = count < 1 ? '❌ BELOW MIN' : count > 5 ? '❌ ABOVE MAX' : '✅ OK';
    if (count < 1 || count > 5) {
      moduleViolations.push({ title: course.title, count });
    }
    console.log(`${status} | ${count}/5 | ${course.title}`);
  }

  // 3. Check content per module
  console.log('\n📝 CONTENT PER MODULE (limit: 2-5)');
  console.log('-'.repeat(60));

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, course_id, module_contents(id), courses(title)');

  let contentViolations = [];
  for (const mod of modules || []) {
    const count = mod.module_contents?.length || 0;
    const status = count < 2 ? '❌ BELOW MIN' : count > 5 ? '❌ ABOVE MAX' : '✅ OK';
    if (count < 2 || count > 5) {
      contentViolations.push({
        module: mod.title,
        course: mod.courses?.title,
        count
      });
    }
  }

  if (contentViolations.length > 0) {
    console.log(`Found ${contentViolations.length} modules with violations:\n`);
    for (const v of contentViolations.slice(0, 20)) {
      const status = v.count < 2 ? '❌ BELOW MIN' : '❌ ABOVE MAX';
      console.log(`${status} | ${v.count}/5 | ${v.module} (${v.course})`);
    }
    if (contentViolations.length > 20) {
      console.log(`... and ${contentViolations.length - 20} more`);
    }
  } else {
    console.log('✅ All modules within limits');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Tracks: ${tracks?.length || 0}`);
  console.log(`Courses with module violations: ${moduleViolations.length}`);
  console.log(`Modules with content violations: ${contentViolations.length}`);
}

checkLimits().catch(console.error);
