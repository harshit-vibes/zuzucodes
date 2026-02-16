#!/usr/bin/env node

/**
 * Validates that DATABASE_URL and NEON_AUTH_BASE_URL are from the same Neon branch.
 *
 * Run with: npm run check-branch
 */

const databaseUrl = process.env.DATABASE_URL;
const authUrl = process.env.NEON_AUTH_BASE_URL;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if environment variables are set
if (!databaseUrl || !authUrl) {
  log('❌ Missing required environment variables', 'red');
  log('   Please ensure the following are set in .env.local:', 'yellow');

  if (!databaseUrl) {
    log('   - DATABASE_URL', 'yellow');
  }
  if (!authUrl) {
    log('   - NEON_AUTH_BASE_URL', 'yellow');
  }

  log('\nExample .env.local:', 'cyan');
  log('DATABASE_URL=postgresql://user:pass@ep-branch-xxx.neonauth.c-4.us-east-1.aws.neon.tech/neondb', 'cyan');
  log('NEON_AUTH_BASE_URL=https://ep-branch-xxx.neonauth.c-4.us-east-1.aws.neon.tech', 'cyan');

  process.exit(1);
}

// Extract branch endpoint identifier from URLs
// Database URL format: postgresql://...@ep-<branch-id>.neonauth...
// Auth URL format: https://ep-<branch-id>.neonauth...
const dbMatch = databaseUrl.match(/ep-([^.]+)/);
const authMatch = authUrl.match(/ep-([^.]+)/);

if (!dbMatch || !authMatch) {
  log('⚠️  Unable to parse branch identifiers from URLs', 'yellow');
  log(`   DATABASE_URL: ${databaseUrl}`, 'yellow');
  log(`   NEON_AUTH_BASE_URL: ${authUrl}`, 'yellow');
  log('\nURLs should contain "ep-<branch-id>" pattern', 'cyan');
  process.exit(0);
}

const dbBranch = dbMatch[1];
const authBranch = authMatch[1];

// Check if they match
if (dbBranch === authBranch) {
  log(`✅ Branch configuration is valid`, 'green');
  log(`   Branch identifier: ${dbBranch}`, 'cyan');
  log(`   Database and Auth URLs are correctly paired`, 'green');
} else {
  log('⚠️  WARNING: DATABASE_URL and NEON_AUTH_BASE_URL may be from different branches', 'yellow');
  log(`   Database branch: ${dbBranch}`, 'yellow');
  log(`   Auth branch:     ${authBranch}`, 'yellow');
  log('\nThis configuration may cause authentication issues.', 'red');
  log('Ensure both URLs are from the same Neon branch.', 'cyan');
  process.exit(1);
}
