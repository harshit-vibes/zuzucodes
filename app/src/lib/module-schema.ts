import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root, Heading, Code as CodeNode, Image as ImageNode, Table as TableNode, List as ListNode } from 'mdast';
import { cache } from 'react';
import { splitMdxSections } from '@/lib/mdx-utils';

// ========================================
// TYPES
// ========================================

// --- v1 (flat string arrays) ---

export interface MdxRulesV1 {
  minSections: number;
  maxSections: number;
  maxTotalChars: number;
  maxSectionChars: number;
  allowedElements: string[];
  disallowedHtmlPatterns: string[];
  requiredElementsPerSection: string[];
}

// --- v2 (structured element map) ---

export interface ElementConstraints {
  maxPerSection?: number;
  // heading
  maxDepth?: number;
  requireH1?: boolean;
  // code
  requireLanguage?: boolean;
  allowedLanguages?: string[];
  // image
  requireAlt?: boolean;
  // table
  maxRows?: number;
  maxColumns?: number;
  // list
  maxNestingDepth?: number;
}

export interface MdxElementDescriptor {
  description: string;
  syntax: string;
  allowed: boolean;
  required: boolean;
  constraints: ElementConstraints;
}

export interface MdxRulesV2 {
  minSections: number;
  maxSections: number;
  maxTotalChars: number;
  maxSectionChars: number;
  elements: Record<string, MdxElementDescriptor>;
  disallowedHtmlPatterns: string[];
}

export type MdxRules = MdxRulesV1 | MdxRulesV2;

export function isMdxRulesV2(rules: MdxRules): rules is MdxRulesV2 {
  return 'elements' in rules;
}

export interface QuizRules {
  requiredFields: string[];
  minPassingScore: number;
  maxPassingScore: number;
  minQuestions: number;
  maxQuestions: number;
  optionsPerQuestion: number;
  requiredQuestionFields: string[];
  validCorrectOptions: string[];
}

export interface ModuleSchema {
  version: number;
  mdx_rules: MdxRules;
  quiz_rules: QuizRules;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ========================================
// SCHEMA FETCHING
// ========================================

function getSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET!,
  );
}

export const getActiveSchema = cache(async (): Promise<ModuleSchema | null> => {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('module_schema')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as ModuleSchema;
});

export async function getSchemaByVersion(version: number): Promise<ModuleSchema | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('module_schema')
    .select('*')
    .eq('version', version)
    .single();

  if (error || !data) return null;
  return data as ModuleSchema;
}

// ========================================
// MDX PARSING
// ========================================

const parser = unified().use(remarkParse).use(remarkGfm);

export function extractMdxElements(markdown: string): Set<string> {
  const tree = parser.parse(markdown) as Root;
  const types = new Set<string>();
  visit(tree, (node) => {
    types.add(node.type);
  });
  // Remove the root node type
  types.delete('root');
  return types;
}

export function findDisallowedHtml(
  markdown: string,
  patterns: string[],
): string[] {
  const matched: string[] = [];
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(markdown)) {
      matched.push(pattern);
    }
  }
  return matched;
}

// ========================================
// AST ANALYSIS (v2)
// ========================================

interface SectionAstStats {
  elementTypes: Set<string>;
  elementCounts: Map<string, number>;
  headingDepths: number[];
  hasH1: boolean;
  codeBlocksWithoutLang: number;
  codeLanguagesUsed: Set<string>;
  imagesWithoutAlt: number;
  tables: { rows: number; columns: number }[];
  maxListNestingDepth: number;
}

function computeMaxListDepth(node: ListNode, currentDepth: number): number {
  let max = currentDepth;
  for (const item of node.children) {
    for (const child of item.children) {
      if (child.type === 'list') {
        max = Math.max(max, computeMaxListDepth(child as ListNode, currentDepth + 1));
      }
    }
  }
  return max;
}

function analyzeSectionAst(sectionMarkdown: string): SectionAstStats {
  const tree = parser.parse(sectionMarkdown) as Root;
  const stats: SectionAstStats = {
    elementTypes: new Set(),
    elementCounts: new Map(),
    headingDepths: [],
    hasH1: false,
    codeBlocksWithoutLang: 0,
    codeLanguagesUsed: new Set(),
    imagesWithoutAlt: 0,
    tables: [],
    maxListNestingDepth: 0,
  };

  visit(tree, (node) => {
    if (node.type === 'root') return;
    stats.elementTypes.add(node.type);
    stats.elementCounts.set(node.type, (stats.elementCounts.get(node.type) ?? 0) + 1);

    switch (node.type) {
      case 'heading': {
        const h = node as Heading;
        stats.headingDepths.push(h.depth);
        if (h.depth === 1) stats.hasH1 = true;
        break;
      }
      case 'code': {
        const c = node as CodeNode;
        if (!c.lang) {
          stats.codeBlocksWithoutLang++;
        } else {
          stats.codeLanguagesUsed.add(c.lang);
        }
        break;
      }
      case 'image': {
        const img = node as ImageNode;
        if (!img.alt || img.alt.trim() === '') {
          stats.imagesWithoutAlt++;
        }
        break;
      }
      case 'table': {
        const tbl = node as TableNode;
        const rows = Math.max(0, tbl.children.length - 1); // exclude header row
        const columns = tbl.children[0]?.children.length ?? 0;
        stats.tables.push({ rows, columns });
        break;
      }
      case 'list': {
        const depth = computeMaxListDepth(node as ListNode, 1);
        stats.maxListNestingDepth = Math.max(stats.maxListNestingDepth, depth);
        break;
      }
    }
  });

  return stats;
}

// ========================================
// MDX VALIDATION
// ========================================

export function validateMdxContent(
  mdxContent: string,
  rules: MdxRules,
): ValidationResult {
  if (isMdxRulesV2(rules)) {
    return validateMdxContentV2(mdxContent, rules);
  }
  return validateMdxContentV1(mdxContent, rules as MdxRulesV1);
}

// --- v1 validation (flat string arrays) ---

function validateMdxContentV1(
  mdxContent: string,
  rules: MdxRulesV1,
): ValidationResult {
  const errors: ValidationError[] = [];
  const sections = splitMdxSections(mdxContent);

  // Section count limits
  if (sections.length < rules.minSections) {
    errors.push({
      field: 'mdx_content',
      message: `Content must have at least ${rules.minSections} section(s), found ${sections.length}`,
      code: 'MIN_SECTIONS',
    });
  }
  if (sections.length > rules.maxSections) {
    errors.push({
      field: 'mdx_content',
      message: `Content must have at most ${rules.maxSections} section(s), found ${sections.length}`,
      code: 'MAX_SECTIONS',
    });
  }

  // Total character limit
  const totalChars = mdxContent.length;
  if (totalChars > rules.maxTotalChars) {
    errors.push({
      field: 'mdx_content',
      message: `Total content exceeds ${rules.maxTotalChars} characters (found ${totalChars})`,
      code: 'MAX_TOTAL_CHARS',
    });
  }

  // Disallowed HTML in full content
  const disallowed = findDisallowedHtml(mdxContent, rules.disallowedHtmlPatterns);
  if (disallowed.length > 0) {
    errors.push({
      field: 'mdx_content',
      message: `Content contains disallowed HTML patterns: ${disallowed.join(', ')}`,
      code: 'DISALLOWED_HTML',
    });
  }

  // Per-section checks
  sections.forEach((section, i) => {
    // Section character limit
    if (section.length > rules.maxSectionChars) {
      errors.push({
        field: `mdx_content.sections[${i}]`,
        message: `Section ${i + 1} exceeds ${rules.maxSectionChars} characters (found ${section.length})`,
        code: 'MAX_SECTION_CHARS',
      });
    }

    // Element checks
    const elements = extractMdxElements(section);

    // Check for disallowed elements
    for (const el of elements) {
      if (!rules.allowedElements.includes(el) && el !== 'html') {
        errors.push({
          field: `mdx_content.sections[${i}]`,
          message: `Section ${i + 1} contains disallowed element type: ${el}`,
          code: 'DISALLOWED_ELEMENT',
        });
      }
    }

    // Check for required elements
    for (const required of rules.requiredElementsPerSection) {
      if (!elements.has(required)) {
        errors.push({
          field: `mdx_content.sections[${i}]`,
          message: `Section ${i + 1} is missing required element: ${required}`,
          code: 'MISSING_REQUIRED_ELEMENT',
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

// --- v2 validation (structured element map) ---

function validateMdxContentV2(
  mdxContent: string,
  rules: MdxRulesV2,
): ValidationResult {
  const errors: ValidationError[] = [];
  const sections = splitMdxSections(mdxContent);

  // Section count limits
  if (sections.length < rules.minSections) {
    errors.push({
      field: 'mdx_content',
      message: `Content must have at least ${rules.minSections} section(s), found ${sections.length}`,
      code: 'MIN_SECTIONS',
    });
  }
  if (sections.length > rules.maxSections) {
    errors.push({
      field: 'mdx_content',
      message: `Content must have at most ${rules.maxSections} section(s), found ${sections.length}`,
      code: 'MAX_SECTIONS',
    });
  }

  // Total character limit
  const totalChars = mdxContent.length;
  if (totalChars > rules.maxTotalChars) {
    errors.push({
      field: 'mdx_content',
      message: `Total content exceeds ${rules.maxTotalChars} characters (found ${totalChars})`,
      code: 'MAX_TOTAL_CHARS',
    });
  }

  // Disallowed HTML in full content
  const disallowed = findDisallowedHtml(mdxContent, rules.disallowedHtmlPatterns);
  if (disallowed.length > 0) {
    errors.push({
      field: 'mdx_content',
      message: `Content contains disallowed HTML patterns: ${disallowed.join(', ')}`,
      code: 'DISALLOWED_HTML',
    });
  }

  // Derive allowed/required sets from elements map
  const allowedSet = new Set<string>();
  const requiredSet = new Set<string>();
  for (const [type, descriptor] of Object.entries(rules.elements)) {
    if (descriptor.allowed) allowedSet.add(type);
    if (descriptor.required) requiredSet.add(type);
  }

  // Per-section checks
  sections.forEach((section, i) => {
    const field = `mdx_content.sections[${i}]`;
    const sectionNum = i + 1;

    // Section character limit
    if (section.length > rules.maxSectionChars) {
      errors.push({
        field,
        message: `Section ${sectionNum} exceeds ${rules.maxSectionChars} characters (found ${section.length})`,
        code: 'MAX_SECTION_CHARS',
      });
    }

    // Analyze AST
    const stats = analyzeSectionAst(section);

    // Disallowed elements
    for (const el of stats.elementTypes) {
      if (!allowedSet.has(el) && el !== 'html') {
        errors.push({
          field,
          message: `Section ${sectionNum} contains disallowed element type: ${el}`,
          code: 'DISALLOWED_ELEMENT',
        });
      }
    }

    // Required elements
    for (const req of requiredSet) {
      if (!stats.elementTypes.has(req)) {
        errors.push({
          field,
          message: `Section ${sectionNum} is missing required element: ${req}`,
          code: 'MISSING_REQUIRED_ELEMENT',
        });
      }
    }

    // Per-element constraint checks
    for (const [type, descriptor] of Object.entries(rules.elements)) {
      if (!descriptor.allowed) continue;
      const c = descriptor.constraints;
      const count = stats.elementCounts.get(type) ?? 0;

      // Generic maxPerSection
      if (c.maxPerSection !== undefined && count > c.maxPerSection) {
        errors.push({
          field,
          message: `Section ${sectionNum} has ${count} ${type} element(s), max allowed is ${c.maxPerSection}`,
          code: 'MAX_PER_SECTION_EXCEEDED',
        });
      }

      // Heading constraints
      if (type === 'heading' && count > 0) {
        if (c.maxDepth !== undefined && stats.headingDepths.some((d) => d > c.maxDepth!)) {
          const deepest = Math.max(...stats.headingDepths);
          errors.push({
            field,
            message: `Section ${sectionNum} contains h${deepest}, max allowed depth is h${c.maxDepth}`,
            code: 'HEADING_DEPTH_EXCEEDED',
          });
        }
        if (c.requireH1 && !stats.hasH1) {
          errors.push({
            field,
            message: `Section ${sectionNum} is missing a required H1 heading`,
            code: 'MISSING_H1',
          });
        }
      }

      // Code constraints
      if (type === 'code' && count > 0) {
        if (c.requireLanguage && stats.codeBlocksWithoutLang > 0) {
          errors.push({
            field,
            message: `Section ${sectionNum} has ${stats.codeBlocksWithoutLang} code block(s) without a language specified`,
            code: 'CODE_MISSING_LANGUAGE',
          });
        }
        if (c.allowedLanguages && c.allowedLanguages.length > 0) {
          for (const lang of stats.codeLanguagesUsed) {
            if (!c.allowedLanguages.includes(lang)) {
              errors.push({
                field,
                message: `Section ${sectionNum} uses disallowed code language: ${lang}`,
                code: 'CODE_DISALLOWED_LANGUAGE',
              });
            }
          }
        }
      }

      // Image constraints
      if (type === 'image' && count > 0) {
        if (c.requireAlt && stats.imagesWithoutAlt > 0) {
          errors.push({
            field,
            message: `Section ${sectionNum} has ${stats.imagesWithoutAlt} image(s) without alt text`,
            code: 'IMAGE_MISSING_ALT',
          });
        }
      }

      // Table constraints
      if (type === 'table' && count > 0) {
        for (const tbl of stats.tables) {
          if (c.maxRows !== undefined && tbl.rows > c.maxRows) {
            errors.push({
              field,
              message: `Section ${sectionNum} has a table with ${tbl.rows} data rows, max allowed is ${c.maxRows}`,
              code: 'TABLE_MAX_ROWS_EXCEEDED',
            });
          }
          if (c.maxColumns !== undefined && tbl.columns > c.maxColumns) {
            errors.push({
              field,
              message: `Section ${sectionNum} has a table with ${tbl.columns} columns, max allowed is ${c.maxColumns}`,
              code: 'TABLE_MAX_COLUMNS_EXCEEDED',
            });
          }
        }
      }

      // List constraints
      if (type === 'list' && count > 0) {
        if (c.maxNestingDepth !== undefined && stats.maxListNestingDepth > c.maxNestingDepth) {
          errors.push({
            field,
            message: `Section ${sectionNum} has list nesting depth ${stats.maxListNestingDepth}, max allowed is ${c.maxNestingDepth}`,
            code: 'LIST_NESTING_DEPTH_EXCEEDED',
          });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

// ========================================
// QUIZ VALIDATION
// ========================================

export function validateQuizForm(
  quizForm: unknown,
  rules: QuizRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!quizForm || typeof quizForm !== 'object' || Array.isArray(quizForm)) {
    errors.push({
      field: 'quiz_form',
      message: 'quiz_form must be a non-null object',
      code: 'INVALID_TYPE',
    });
    return { valid: false, errors };
  }

  const quiz = quizForm as Record<string, unknown>;

  // Required top-level fields
  for (const field of rules.requiredFields) {
    if (!(field in quiz)) {
      errors.push({
        field: `quiz_form.${field}`,
        message: `Missing required field: ${field}`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  // Passing score range
  if (typeof quiz.passingScore === 'number') {
    if (quiz.passingScore < rules.minPassingScore) {
      errors.push({
        field: 'quiz_form.passingScore',
        message: `passingScore must be at least ${rules.minPassingScore}`,
        code: 'MIN_PASSING_SCORE',
      });
    }
    if (quiz.passingScore > rules.maxPassingScore) {
      errors.push({
        field: 'quiz_form.passingScore',
        message: `passingScore must be at most ${rules.maxPassingScore}`,
        code: 'MAX_PASSING_SCORE',
      });
    }
  }

  // Questions validation
  if (!Array.isArray(quiz.questions)) {
    if ('questions' in quiz) {
      errors.push({
        field: 'quiz_form.questions',
        message: 'questions must be an array',
        code: 'INVALID_QUESTIONS_TYPE',
      });
    }
    return { valid: errors.length === 0, errors };
  }

  const questions = quiz.questions as Record<string, unknown>[];

  // Question count limits
  if (questions.length < rules.minQuestions) {
    errors.push({
      field: 'quiz_form.questions',
      message: `Must have at least ${rules.minQuestions} question(s), found ${questions.length}`,
      code: 'MIN_QUESTIONS',
    });
  }
  if (questions.length > rules.maxQuestions) {
    errors.push({
      field: 'quiz_form.questions',
      message: `Must have at most ${rules.maxQuestions} question(s), found ${questions.length}`,
      code: 'MAX_QUESTIONS',
    });
  }

  // Per-question validation
  const seenIds = new Set<string>();

  questions.forEach((q, i) => {
    // Required fields
    for (const field of rules.requiredQuestionFields) {
      if (!(field in q)) {
        errors.push({
          field: `quiz_form.questions[${i}].${field}`,
          message: `Question ${i + 1} is missing required field: ${field}`,
          code: 'MISSING_QUESTION_FIELD',
        });
      }
    }

    // Duplicate ID check
    if (typeof q.id === 'string') {
      if (seenIds.has(q.id)) {
        errors.push({
          field: `quiz_form.questions[${i}].id`,
          message: `Duplicate question ID: ${q.id}`,
          code: 'DUPLICATE_QUESTION_ID',
        });
      }
      seenIds.add(q.id);
    }

    // Option count
    if (Array.isArray(q.options)) {
      if (q.options.length !== rules.optionsPerQuestion) {
        errors.push({
          field: `quiz_form.questions[${i}].options`,
          message: `Question ${i + 1} must have exactly ${rules.optionsPerQuestion} options, found ${q.options.length}`,
          code: 'INVALID_OPTION_COUNT',
        });
      }
    }

    // Valid correct option
    if (typeof q.correctOption === 'string') {
      if (!rules.validCorrectOptions.includes(q.correctOption)) {
        errors.push({
          field: `quiz_form.questions[${i}].correctOption`,
          message: `Question ${i + 1} has invalid correctOption: ${q.correctOption}. Must be one of: ${rules.validCorrectOptions.join(', ')}`,
          code: 'INVALID_CORRECT_OPTION',
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

// ========================================
// COMBINED VALIDATION
// ========================================

export function validateModuleContent(
  mdxContent: string | null,
  quizForm: unknown | null,
  schema: ModuleSchema,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (mdxContent) {
    const mdxResult = validateMdxContent(mdxContent, schema.mdx_rules);
    errors.push(...mdxResult.errors);
  }

  if (quizForm) {
    const quizResult = validateQuizForm(quizForm, schema.quiz_rules);
    errors.push(...quizResult.errors);
  }

  return { valid: errors.length === 0, errors };
}
