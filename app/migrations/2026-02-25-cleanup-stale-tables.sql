-- Cleanup: drop stale Auth.js tables and legacy columns
-- All items confirmed not referenced in any app code (src/).
-- Auth is handled by Neon Auth (neon_auth schema); these are orphaned leftovers.

-- Auth.js legacy tables
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS magic_links CASCADE;
DROP TABLE IF EXISTS verification_token CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;

-- Old content validation table (superseded; content_schema was the intended replacement)
DROP TABLE IF EXISTS module_schema CASCADE;

-- Dead columns on modules (content now lives in lessons table)
ALTER TABLE modules DROP COLUMN IF EXISTS mdx_content;
ALTER TABLE modules DROP COLUMN IF EXISTS schema_version;
