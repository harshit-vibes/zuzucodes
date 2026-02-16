const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function checkAuthSetup() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('🔍 Checking Neon Auth setup...\n');

  try {
    // Check for Neon Auth tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%auth%'
      ORDER BY table_name;
    `;

    console.log('📊 Auth-related tables found:');
    if (tables.length === 0) {
      console.log('  ❌ No auth tables found!');
      console.log('\n💡 This might be the issue. Neon Auth needs specific tables.');
    } else {
      tables.forEach(t => console.log(`  ✓ ${t.table_name}`));
    }

    console.log('\n🔗 Environment variables:');
    console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '❌ Missing'}`);
    console.log(`  NEON_AUTH_BASE_URL: ${process.env.NEON_AUTH_BASE_URL ? '✓ Set' : '❌ Missing'}`);
    console.log(`  NEXT_PUBLIC_NEON_AUTH_URL: ${process.env.NEXT_PUBLIC_NEON_AUTH_URL ? '✓ Set' : '❌ Missing'}`);
    console.log(`  NEON_AUTH_COOKIE_SECRET: ${process.env.NEON_AUTH_COOKIE_SECRET ? '✓ Set' : '❌ Missing'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuthSetup();
