-- ========================================
-- SEED DATA FOR ZUZUCODES COURSE PLATFORM
-- Run with: supabase db reset (applies migrations + seed)
-- ========================================

-- Courses
INSERT INTO courses (id, title, description, thumbnail_url, author_name, category, duration, level, prerequisites, outcomes, created_at, updated_at)
VALUES (
  'course-ai-automation-001',
  'AI Automation for General Workflows',
  'Learn to build AI-powered automation agents using workflow tools. Start from basics, progress to complex multi-workflow systems. Covers UI navigation, API integration, data processing, error handling, and production deployment.',
  NULL,
  'AI Assistant',
  'Data/AI',
  '10+ hours',
  'Beginner to Advanced',
  ARRAY['Basic understanding of APIs and JSON'],
  ARRAY['Build automated workflows from scratch', 'Connect APIs and process data', 'Handle errors and monitor executions', 'Deploy production-ready automations'],
  '2025-01-12T00:00:00Z',
  '2025-01-12T00:00:00Z'
);

-- Lessons (must be inserted before module_items due to FK)
INSERT INTO lessons (id, title, markdown_content, created_at, updated_at) VALUES
('lesson-beginner-01', 'Introduction to Workflow Automation', E'## Theory\nUnderstand what workflow automation is and why it matters. Learn the core interface: canvas, nodes, triggers, and execution controls.\n\n## Demonstration\nTour the editor UI. Add a trigger node and explore the node panel.\n\n## Practical\nBuild a 2-node workflow: fetch articles from an API and view the output.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-beginner-02', 'Problem Solving with Automation', E'## Theory\nIdentify automation opportunities. Translate repetitive business tasks into workflow designs.\n\n## Demonstration\nAnalyze a scenario: manual reporting with errors. Map the problem to an automation solution.\n\n## Practical\nDocument your own use case. Sketch the workflow before building.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-beginner-03', 'Data Retrieval and Integration', E'## Theory\nHow APIs work. HTTP methods, headers, authentication, and connecting to data sources.\n\n## Demonstration\nConfigure an HTTP node with credentials. Fetch data from an external API.\n\n## Practical\nRetrieve data from an API and insert it into a spreadsheet.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-beginner-04', 'Data Processing and Transformation', E'## Theory\nConditional logic with If/Switch. Field mapping and data filtering techniques.\n\n## Demonstration\nFilter records by status. Select and rename columns using Edit Fields.\n\n## Practical\nBuild a workflow that filters data and outputs a transformed format.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-beginner-05', 'Logic and Notifications', E'## Theory\nCode nodes for calculations. Notification integrations: email, Slack, Discord.\n\n## Demonstration\nCalculate totals with JavaScript. Send results to a messaging platform.\n\n## Practical\nCreate a workflow that aggregates data and sends a notification summary.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-beginner-06', 'Scheduling and Deployment', E'## Theory\nTime-based triggers. Workflow activation, monitoring, and export/import.\n\n## Demonstration\nReplace manual trigger with a schedule. Publish and review execution logs.\n\n## Practical\nDeploy a complete workflow that runs automatically on a schedule.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-advanced-01', 'Mastering Data Structures', E'## Theory\nHow data flows between nodes: arrays, objects, items. The JSON wrapper format.\n\n## Demonstration\nInspect data between nodes. Use Split Out and Aggregate for transformations.\n\n## Practical\nTransform nested data: one-to-many and many-to-one operations.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-advanced-02', 'Working with Different Data Types', E'## Theory\nProcessing XML, HTML, dates, and binary files. Format conversions.\n\n## Demonstration\nExtract HTML with selectors. Convert dates. Handle file uploads.\n\n## Practical\nBuild a workflow that processes multiple formats into a unified output.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-advanced-03', 'Data Operations: Merge and Split', E'## Theory\nMerge modes: append, combine by fields/position. Batch processing with loops.\n\n## Demonstration\nMerge data from two APIs. Split large datasets into batches.\n\n## Practical\nCombine data from 3+ sources and process in optimized batches.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-advanced-04', 'Error Handling Strategies', E'## Theory\nMonitoring executions. Error workflows. Validation and explicit errors.\n\n## Demonstration\nSet up Error Trigger workflow. Use Stop and Error for validation.\n\n## Practical\nBuild error monitoring that alerts via multiple channels on failure.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-advanced-05', 'Building Business Workflows', E'## Theory\nMulti-workflow architecture. Breaking complex automation into connected parts.\n\n## Demonstration\nDesign a system: data merge workflow feeding report generation.\n\n## Practical\nBuild a 2-workflow system: data pipeline + automated reporting.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('lesson-advanced-06', 'Production Best Practices', E'## Theory\nWorkflow maintenance, versioning, performance optimization, documentation.\n\n## Demonstration\nReview settings. Export and organize backups.\n\n## Practical\nAudit an existing workflow. Document it for team handoff.', '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z');

-- Modules
INSERT INTO modules (id, course_id, title, description, "order", lesson_count, duration, outcomes, prerequisites, created_at, updated_at) VALUES
('module-beginner-001', 'course-ai-automation-001', 'Beginner: Foundations of Workflow Automation', 'Master the fundamentals. Learn the UI, build your first workflow, connect to APIs, process data, send notifications, and deploy on a schedule.', 1, 6, '5 hours', ARRAY['Navigate the workflow editor', 'Retrieve and insert data via APIs', 'Filter and transform data', 'Send automated notifications', 'Schedule and monitor workflows'], NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('module-advanced-001', 'course-ai-automation-001', 'Advanced: Complex Workflows and Best Practices', 'Go deeper. Master data structures, handle multiple formats, merge sources, implement error handling, build multi-workflow systems, and follow production best practices.', 2, 6, '5 hours', ARRAY['Transform complex data structures', 'Process XML, HTML, dates, binary files', 'Merge and batch process data', 'Build robust error handling', 'Design multi-workflow architectures'], ARRAY['Complete Beginner module'], '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z');

-- Module Items
INSERT INTO module_items (id, module_id, "order", item_type, lesson_id, quiz_id, created_at, updated_at) VALUES
('mi-beginner-01', 'module-beginner-001', 1, 'lesson', 'lesson-beginner-01', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-beginner-02', 'module-beginner-001', 2, 'lesson', 'lesson-beginner-02', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-beginner-03', 'module-beginner-001', 3, 'lesson', 'lesson-beginner-03', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-beginner-04', 'module-beginner-001', 4, 'lesson', 'lesson-beginner-04', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-beginner-05', 'module-beginner-001', 5, 'lesson', 'lesson-beginner-05', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-beginner-06', 'module-beginner-001', 6, 'lesson', 'lesson-beginner-06', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-advanced-01', 'module-advanced-001', 1, 'lesson', 'lesson-advanced-01', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-advanced-02', 'module-advanced-001', 2, 'lesson', 'lesson-advanced-02', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-advanced-03', 'module-advanced-001', 3, 'lesson', 'lesson-advanced-03', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-advanced-04', 'module-advanced-001', 4, 'lesson', 'lesson-advanced-04', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-advanced-05', 'module-advanced-001', 5, 'lesson', 'lesson-advanced-05', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),
('mi-advanced-06', 'module-advanced-001', 6, 'lesson', 'lesson-advanced-06', NULL, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z');
