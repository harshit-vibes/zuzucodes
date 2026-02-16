/**
 * Export zuzu.codes Curriculum to Notion
 *
 * Creates a hierarchical page structure:
 * - Root: zuzu.codes Curriculum
 *   - Course pages with modules and lessons
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

// ========================================
// CONFIGURATION
// ========================================

const PARENT_PAGE_ID = '2f840f4a-0e9a-8111-bd14-d68c6b51b583';
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// MCP server endpoint (Claude Code will use the Notion MCP)
// This script outputs the structure for manual creation via MCP tools

// ========================================
// SUPABASE CLIENT
// ========================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET
);

// ========================================
// DATA FETCHING
// ========================================

async function fetchAllContent() {
  console.log('Fetching curriculum data from Supabase...\n');

  // Fetch tracks with courses
  const { data: tracks, error: tracksError } = await supabase
    .from('tracks')
    .select(`
      id, title, description, course_code, status, order,
      track_courses (
        order,
        courses (
          id, title, description, duration, level
        )
      )
    `)
    .eq('status', 'published')
    .order('order');

  if (tracksError) {
    console.error('Error fetching tracks:', tracksError);
    return null;
  }

  // Fetch all modules with contents
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select(`
      id, course_id, title, description, order,
      module_contents (
        id, content_type, order, title_override, lesson_id, quiz_id
      )
    `)
    .order('order');

  if (modulesError) {
    console.error('Error fetching modules:', modulesError);
    return null;
  }

  // Fetch all lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, markdown_content, estimated_duration_minutes, lesson_type, learning_objectives, key_takeaways');

  if (lessonsError) {
    console.error('Error fetching lessons:', lessonsError);
    return null;
  }

  // Fetch all quizzes with prompts
  const { data: quizzes, error: quizzesError } = await supabase
    .from('quizzes')
    .select(`
      id, title, description, passing_score_percent,
      prompts (
        id, order, statement, option_a, option_b, option_c, option_d, correct_option, explanation
      )
    `);

  if (quizzesError) {
    console.error('Error fetching quizzes:', quizzesError);
    return null;
  }

  // Create lookup maps
  const lessonMap = new Map(lessons.map(l => [l.id, l]));
  const quizMap = new Map(quizzes.map(q => [q.id, q]));
  const modulesByCourse = new Map();

  for (const mod of modules) {
    if (!modulesByCourse.has(mod.course_id)) {
      modulesByCourse.set(mod.course_id, []);
    }
    modulesByCourse.get(mod.course_id).push(mod);
  }

  // Sort modules by order
  for (const [courseId, mods] of modulesByCourse) {
    mods.sort((a, b) => a.order - b.order);
  }

  return {
    tracks,
    modulesByCourse,
    lessonMap,
    quizMap
  };
}

// ========================================
// CONTENT FORMATTING
// ========================================

function groupTracksByPath(tracks) {
  const paths = {
    developer: { title: 'Developer Path', emoji: '🔵', tracks: [] },
    business: { title: 'Business Path', emoji: '🟢', tracks: [] },
    theory: { title: 'Theory', emoji: '📖', tracks: [] }
  };

  for (const track of tracks) {
    const code = track.course_code?.toLowerCase() || '';
    if (code.startsWith('dev-')) {
      paths.developer.tracks.push(track);
    } else if (code.startsWith('biz-')) {
      paths.business.tracks.push(track);
    } else if (code.startsWith('ai-')) {
      paths.theory.tracks.push(track);
    }
  }

  // Sort tracks within each path
  for (const path of Object.values(paths)) {
    path.tracks.sort((a, b) => {
      const aNum = parseInt(a.course_code?.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.course_code?.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });
  }

  return paths;
}

function formatLessonContent(lesson) {
  if (!lesson) return '*No content*';

  let content = '';

  // Add learning objectives if present
  if (lesson.learning_objectives?.length > 0) {
    content += '**Learning Objectives:**\n';
    for (const obj of lesson.learning_objectives) {
      content += `- ${obj}\n`;
    }
    content += '\n';
  }

  // Add main content (truncated for Notion)
  if (lesson.markdown_content) {
    // Truncate very long content
    const maxLength = 3000;
    let markdown = lesson.markdown_content;
    if (markdown.length > maxLength) {
      markdown = markdown.substring(0, maxLength) + '\n\n*[Content truncated for preview]*';
    }
    content += markdown;
  }

  // Add key takeaways if present
  if (lesson.key_takeaways?.length > 0) {
    content += '\n\n**Key Takeaways:**\n';
    for (const takeaway of lesson.key_takeaways) {
      content += `- ${takeaway}\n`;
    }
  }

  return content || '*No content*';
}

function formatQuizContent(quiz) {
  if (!quiz) return '*No quiz*';

  let content = '';

  if (quiz.description) {
    content += `*${quiz.description}*\n\n`;
  }

  content += `**Passing Score:** ${quiz.passing_score_percent}%\n\n`;

  const prompts = quiz.prompts?.sort((a, b) => a.order - b.order) || [];

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    content += `### Question ${i + 1}\n\n`;
    content += `${p.statement}\n\n`;
    content += `- A) ${p.option_a}\n`;
    content += `- B) ${p.option_b}\n`;
    content += `- C) ${p.option_c}\n`;
    content += `- D) ${p.option_d}\n\n`;
    content += `**Answer:** ${p.correct_option.toUpperCase()}\n`;
    if (p.explanation) {
      content += `**Explanation:** ${p.explanation}\n`;
    }
    content += '\n';
  }

  return content;
}

// ========================================
// NOTION PAGE GENERATION
// ========================================

function generateRootPageContent(paths, stats) {
  let content = `# zuzu.codes Curriculum

*Complete curriculum export - ${new Date().toLocaleDateString()}*

## Overview

| Metric | Count |
|--------|-------|
| Tracks | ${stats.trackCount} |
| Courses | ${stats.courseCount} |
| Lessons | ${stats.lessonCount} |
| Quizzes | ${stats.quizCount} |

## Learning Paths

`;

  for (const [pathKey, path] of Object.entries(paths)) {
    if (path.tracks.length === 0) continue;

    content += `### ${path.emoji} ${path.title}\n\n`;
    content += `| Track | Courses | Description |\n`;
    content += `|-------|---------|-------------|\n`;

    for (const track of path.tracks) {
      const courseCount = track.track_courses?.length || 0;
      const desc = track.description?.substring(0, 60) + (track.description?.length > 60 ? '...' : '') || '-';
      content += `| ${track.title} | ${courseCount} | ${desc} |\n`;
    }
    content += '\n';
  }

  return content;
}

function generatePathPageContent(path, pathKey) {
  let content = `# ${path.emoji} ${path.title}

`;

  for (const track of path.tracks) {
    const courses = track.track_courses
      ?.sort((a, b) => a.order - b.order)
      .map(tc => tc.courses)
      .filter(Boolean) || [];

    content += `## ${track.title}\n\n`;
    content += `*${track.description || 'No description'}*\n\n`;

    if (courses.length > 0) {
      content += `| # | Course | Description |\n`;
      content += `|---|--------|-------------|\n`;

      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        const desc = course.description?.substring(0, 80) + (course.description?.length > 80 ? '...' : '') || '-';
        content += `| ${i + 1} | ${course.title} | ${desc} |\n`;
      }
      content += '\n';
    }
  }

  return content;
}

function generateTrackPageContent(track, modulesByCourse, lessonMap, quizMap) {
  const courses = track.track_courses
    ?.sort((a, b) => a.order - b.order)
    .map(tc => tc.courses)
    .filter(Boolean) || [];

  let content = `# ${track.title}

*${track.description || 'No description'}*

**Course Code:** ${track.course_code || 'N/A'}

---

## Courses Overview

| # | Course | Modules | Description |
|---|--------|---------|-------------|
`;

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const modules = modulesByCourse.get(course.id) || [];
    const desc = course.description?.substring(0, 60) + (course.description?.length > 60 ? '...' : '') || '-';
    content += `| ${i + 1} | ${course.title} | ${modules.length} | ${desc} |\n`;
  }

  content += '\n---\n\n';

  // Add course details
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    content += generateCourseContent(course, i + 1, modulesByCourse, lessonMap, quizMap);
    content += '\n---\n\n';
  }

  return content;
}

function generateCourseContent(course, courseNum, modulesByCourse, lessonMap, quizMap) {
  const modules = modulesByCourse.get(course.id) || [];

  let content = `## Course ${courseNum}: ${course.title}

*${course.description || 'No description'}*

`;

  if (modules.length === 0) {
    content += '*No modules defined*\n';
    return content;
  }

  for (let m = 0; m < modules.length; m++) {
    const mod = modules[m];
    content += `### Module ${m + 1}: ${mod.title}\n\n`;

    if (mod.description) {
      content += `*${mod.description}*\n\n`;
    }

    const contents = mod.module_contents?.sort((a, b) => a.order - b.order) || [];

    // Group lessons and quizzes
    const lessonContents = contents.filter(c => c.content_type === 'lesson');
    const quizContents = contents.filter(c => c.content_type === 'quiz');

    // Lessons
    if (lessonContents.length > 0) {
      content += `#### Lessons\n\n`;

      for (let l = 0; l < lessonContents.length; l++) {
        const lc = lessonContents[l];
        const lesson = lessonMap.get(lc.lesson_id);
        const title = lc.title_override || lesson?.title || `Lesson ${l + 1}`;
        const duration = lesson?.estimated_duration_minutes ? ` (${lesson.estimated_duration_minutes} min)` : '';

        content += `**${l + 1}. ${title}**${duration}\n\n`;

        // Add abbreviated lesson content
        if (lesson?.markdown_content) {
          // Just show first paragraph or 200 chars
          const preview = lesson.markdown_content.split('\n\n')[0]?.substring(0, 200);
          if (preview) {
            content += `> ${preview}${lesson.markdown_content.length > 200 ? '...' : ''}\n\n`;
          }
        }
      }
    }

    // Quiz
    if (quizContents.length > 0) {
      content += `#### Quiz\n\n`;

      for (const qc of quizContents) {
        const quiz = quizMap.get(qc.quiz_id);
        if (quiz) {
          const promptCount = quiz.prompts?.length || 0;
          content += `**${quiz.title}** - ${promptCount} questions (${quiz.passing_score_percent}% to pass)\n\n`;
        }
      }
    }
  }

  return content;
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

function generateNotionExport(data) {
  const { tracks, modulesByCourse, lessonMap, quizMap } = data;

  // Group by path
  const paths = groupTracksByPath(tracks);

  // Calculate stats
  let lessonCount = 0;
  let quizCount = 0;
  let courseCount = 0;

  for (const track of tracks) {
    const courses = track.track_courses?.map(tc => tc.courses).filter(Boolean) || [];
    courseCount += courses.length;

    for (const course of courses) {
      const modules = modulesByCourse.get(course.id) || [];
      for (const mod of modules) {
        const contents = mod.module_contents || [];
        lessonCount += contents.filter(c => c.content_type === 'lesson').length;
        quizCount += contents.filter(c => c.content_type === 'quiz').length;
      }
    }
  }

  const stats = {
    trackCount: tracks.length,
    courseCount,
    lessonCount,
    quizCount
  };

  console.log('\n=== EXPORT STATISTICS ===');
  console.log(`Tracks: ${stats.trackCount}`);
  console.log(`Courses: ${stats.courseCount}`);
  console.log(`Lessons: ${stats.lessonCount}`);
  console.log(`Quizzes: ${stats.quizCount}`);
  console.log('');

  // Generate page structure
  const pages = [];

  // 1. Root page
  pages.push({
    id: 'root',
    parentId: PARENT_PAGE_ID,
    title: 'zuzu.codes Curriculum',
    content: generateRootPageContent(paths, stats)
  });

  // 2. Path pages
  for (const [pathKey, path] of Object.entries(paths)) {
    if (path.tracks.length === 0) continue;

    pages.push({
      id: `path-${pathKey}`,
      parentId: 'root',
      title: `${path.emoji} ${path.title}`,
      content: generatePathPageContent(path, pathKey)
    });

    // 3. Track pages
    for (const track of path.tracks) {
      pages.push({
        id: `track-${track.id}`,
        parentId: `path-${pathKey}`,
        title: track.title,
        content: generateTrackPageContent(track, modulesByCourse, lessonMap, quizMap)
      });
    }
  }

  return pages;
}

// ========================================
// OUTPUT FOR MCP TOOL CALLS
// ========================================

function outputMCPCalls(pages) {
  console.log('\n=== NOTION PAGE CREATION CALLS ===\n');
  console.log('Copy these to create pages via Notion MCP:\n');

  // Build parent ID mapping
  const pageIdMap = new Map();
  pageIdMap.set(PARENT_PAGE_ID, PARENT_PAGE_ID);

  for (const page of pages) {
    const parentId = page.parentId === PARENT_PAGE_ID
      ? PARENT_PAGE_ID
      : `<ID of "${pages.find(p => p.id === page.parentId)?.title}">`;

    console.log(`--- Page: ${page.title} ---`);
    console.log(`Parent: ${parentId}`);
    console.log(`Title: ${page.title}`);
    console.log(`Content length: ${page.content.length} chars`);
    console.log('');

    if (VERBOSE) {
      console.log('Content preview:');
      console.log(page.content.substring(0, 500) + '...\n');
    }
  }

  return pages;
}

// ========================================
// MAIN
// ========================================

async function main() {
  console.log('===========================================');
  console.log('  zuzu.codes Curriculum Export to Notion');
  console.log('===========================================\n');

  if (DRY_RUN) {
    console.log('🏃 DRY RUN MODE - No pages will be created\n');
  }

  // 1. Fetch all content
  const data = await fetchAllContent();
  if (!data) {
    console.error('Failed to fetch content. Exiting.');
    process.exit(1);
  }

  // 2. Generate export structure
  const pages = generateNotionExport(data);

  // 3. Output for MCP calls
  outputMCPCalls(pages);

  // 4. Write pages to files for reference
  console.log('\n=== WRITING PAGE FILES ===\n');

  const outputDir = resolve(process.cwd(), 'scripts/notion-export');

  // Create output directory
  const fs = await import('fs/promises');
  await fs.mkdir(outputDir, { recursive: true });

  for (const page of pages) {
    const filename = `${page.id.replace(/[^a-z0-9-]/g, '-')}.md`;
    const filepath = resolve(outputDir, filename);

    const fileContent = `# ${page.title}

Parent: ${page.parentId}

---

${page.content}`;

    await fs.writeFile(filepath, fileContent);
    console.log(`Written: ${filename}`);
  }

  console.log(`\n✅ Export complete! ${pages.length} page files written to scripts/notion-export/`);
  console.log('\nNext steps:');
  console.log('1. Review the generated markdown files');
  console.log('2. Use Notion MCP tools to create pages in order (root first, then paths, then tracks)');
}

main().catch(console.error);
