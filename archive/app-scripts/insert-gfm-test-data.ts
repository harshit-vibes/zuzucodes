#!/usr/bin/env tsx
/**
 * Insert GFM test data into the database
 * Usage: npx tsx scripts/insert-gfm-test-data.ts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: join(__dirname, '../.env.local') });

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  // Read the GFM test content
  const gfmContent = readFileSync(
    join(__dirname, '../docs/GFM_TEST_CONTENT.md'),
    'utf-8'
  );

  console.log('📝 Inserting GFM test data...\n');

  try {
    // 1. Insert test course
    console.log('1️⃣ Creating test course...');
    await sql`
      INSERT INTO public.courses (id, title, slug, description, "order", created_at, updated_at)
      VALUES (
        'course-gfm-test-001',
        'GFM Test Course',
        'gfm-test',
        'Test course for GitHub Flavored Markdown feature verification',
        999,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        updated_at = NOW()
    `;
    console.log('   ✅ Test course created\n');

    // 2. Insert test module with GFM content
    console.log('2️⃣ Creating test module with GFM content...');
    const sectionCount = gfmContent.split(/\n---\n/).filter(s => s.trim()).length;

    await sql`
      INSERT INTO public.modules (id, course_id, title, slug, description, "order", mdx_content, section_count, created_at, updated_at)
      VALUES (
        'module-gfm-test-001',
        'course-gfm-test-001',
        'GFM Feature Test Module',
        'gfm-features',
        'Comprehensive test of all GitHub Flavored Markdown features',
        1,
        ${gfmContent},
        ${sectionCount},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        mdx_content = EXCLUDED.mdx_content,
        section_count = EXCLUDED.section_count,
        updated_at = NOW()
    `;
    console.log(`   ✅ Test module created with ${sectionCount} sections\n`);

    // 3. Verify data was inserted
    console.log('3️⃣ Verifying insertion...');
    const courses = await sql`
      SELECT id, title, slug
      FROM public.courses
      WHERE id = 'course-gfm-test-001'
    `;

    const modules = await sql`
      SELECT id, title, slug, section_count
      FROM public.modules
      WHERE id = 'module-gfm-test-001'
    `;

    if (courses.length > 0 && modules.length > 0) {
      console.log('   ✅ Data verified\n');
      console.log('📊 Test Data Summary:');
      console.log('   Course:', courses[0]);
      console.log('   Module:', modules[0]);
      console.log('\n🎉 GFM test data inserted successfully!');
      console.log('\n📍 Access the test module at:');
      console.log(`   /dashboard (look for "${courses[0].title}")`);
    } else {
      console.error('❌ Data verification failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error inserting test data:', error);
    process.exit(1);
  }
}

main();
