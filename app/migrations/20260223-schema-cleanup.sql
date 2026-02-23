BEGIN;

ALTER TABLE modules DROP COLUMN lesson_count;
ALTER TABLE modules DROP COLUMN mdx_content;
DROP TABLE IF EXISTS content_schema;
ALTER TABLE lessons ADD COLUMN test_code TEXT;
ALTER TABLE lessons ADD COLUMN solution_code TEXT;

COMMIT;
