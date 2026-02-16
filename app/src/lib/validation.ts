// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validation result returned by all validators
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Resource type for lesson resources
 */
export interface ResourceInput {
  type: 'link' | 'file' | 'code';
  title: string;
  url: string;
  description?: string;
}

// ========================================
// JSONB VALIDATORS
// ========================================

/**
 * Validate learning objectives array
 * - Max 10 items
 * - Each item max 200 characters
 */
export function validateLearningObjectives(data: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (data === null || data === undefined) {
    return { valid: true, errors: [] };
  }

  if (!Array.isArray(data)) {
    errors.push({
      field: 'learning_objectives',
      message: 'Must be an array',
      code: 'INVALID_TYPE',
    });
    return { valid: false, errors };
  }

  if (data.length > 10) {
    errors.push({
      field: 'learning_objectives',
      message: 'Cannot exceed 10 items',
      code: 'MAX_ITEMS_EXCEEDED',
    });
  }

  data.forEach((item, index) => {
    if (typeof item !== 'string') {
      errors.push({
        field: `learning_objectives[${index}]`,
        message: 'Each item must be a string',
        code: 'INVALID_ITEM_TYPE',
      });
    } else if (item.length > 200) {
      errors.push({
        field: `learning_objectives[${index}]`,
        message: 'Item exceeds 200 characters',
        code: 'ITEM_TOO_LONG',
      });
    } else if (item.trim().length === 0) {
      errors.push({
        field: `learning_objectives[${index}]`,
        message: 'Item cannot be empty',
        code: 'ITEM_EMPTY',
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate key takeaways array
 * - Max 10 items
 * - Each item max 200 characters
 */
export function validateKeyTakeaways(data: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (data === null || data === undefined) {
    return { valid: true, errors: [] };
  }

  if (!Array.isArray(data)) {
    errors.push({
      field: 'key_takeaways',
      message: 'Must be an array',
      code: 'INVALID_TYPE',
    });
    return { valid: false, errors };
  }

  if (data.length > 10) {
    errors.push({
      field: 'key_takeaways',
      message: 'Cannot exceed 10 items',
      code: 'MAX_ITEMS_EXCEEDED',
    });
  }

  data.forEach((item, index) => {
    if (typeof item !== 'string') {
      errors.push({
        field: `key_takeaways[${index}]`,
        message: 'Each item must be a string',
        code: 'INVALID_ITEM_TYPE',
      });
    } else if (item.length > 200) {
      errors.push({
        field: `key_takeaways[${index}]`,
        message: 'Item exceeds 200 characters',
        code: 'ITEM_TOO_LONG',
      });
    } else if (item.trim().length === 0) {
      errors.push({
        field: `key_takeaways[${index}]`,
        message: 'Item cannot be empty',
        code: 'ITEM_EMPTY',
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate resources array
 * - Max 20 items
 * - Each item must have type (link|file|code), title, and url
 */
export function validateResources(data: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const validTypes = ['link', 'file', 'code'];

  if (data === null || data === undefined) {
    return { valid: true, errors: [] };
  }

  if (!Array.isArray(data)) {
    errors.push({
      field: 'resources',
      message: 'Must be an array',
      code: 'INVALID_TYPE',
    });
    return { valid: false, errors };
  }

  if (data.length > 20) {
    errors.push({
      field: 'resources',
      message: 'Cannot exceed 20 items',
      code: 'MAX_ITEMS_EXCEEDED',
    });
  }

  data.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      errors.push({
        field: `resources[${index}]`,
        message: 'Each item must be an object',
        code: 'INVALID_ITEM_TYPE',
      });
      return;
    }

    const resource = item as Record<string, unknown>;

    // Validate type
    if (!resource.type) {
      errors.push({
        field: `resources[${index}].type`,
        message: 'Type is required',
        code: 'MISSING_FIELD',
      });
    } else if (!validTypes.includes(resource.type as string)) {
      errors.push({
        field: `resources[${index}].type`,
        message: `Type must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Validate title
    if (!resource.title) {
      errors.push({
        field: `resources[${index}].title`,
        message: 'Title is required',
        code: 'MISSING_FIELD',
      });
    } else if (typeof resource.title !== 'string') {
      errors.push({
        field: `resources[${index}].title`,
        message: 'Title must be a string',
        code: 'INVALID_TYPE',
      });
    } else if ((resource.title as string).length > 200) {
      errors.push({
        field: `resources[${index}].title`,
        message: 'Title exceeds 200 characters',
        code: 'FIELD_TOO_LONG',
      });
    }

    // Validate url
    if (!resource.url) {
      errors.push({
        field: `resources[${index}].url`,
        message: 'URL is required',
        code: 'MISSING_FIELD',
      });
    } else if (typeof resource.url !== 'string') {
      errors.push({
        field: `resources[${index}].url`,
        message: 'URL must be a string',
        code: 'INVALID_TYPE',
      });
    } else {
      try {
        new URL(resource.url as string);
      } catch {
        errors.push({
          field: `resources[${index}].url`,
          message: 'URL must be a valid URL',
          code: 'INVALID_URL',
        });
      }
    }

    // Validate optional description
    if (resource.description !== undefined && resource.description !== null) {
      if (typeof resource.description !== 'string') {
        errors.push({
          field: `resources[${index}].description`,
          message: 'Description must be a string',
          code: 'INVALID_TYPE',
        });
      } else if ((resource.description as string).length > 500) {
        errors.push({
          field: `resources[${index}].description`,
          message: 'Description exceeds 500 characters',
          code: 'FIELD_TOO_LONG',
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

// ========================================
// ENTITY VALIDATORS
// ========================================

export interface LessonInput {
  title?: string;
  markdown_content?: string;
  lesson_type?: string;
  video_url?: string;
  video_provider?: string;
  video_duration_seconds?: number;
  learning_objectives?: unknown;
  key_takeaways?: unknown;
  resources?: unknown;
}

/**
 * Validate lesson data for creation/update
 */
export function validateLesson(data: LessonInput, isCreate = true): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Title required for creation
  if (isCreate && !data.title) {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'MISSING_FIELD',
    });
  }

  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Title must be a string',
        code: 'INVALID_TYPE',
      });
    } else if (data.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title exceeds 200 characters',
        code: 'FIELD_TOO_LONG',
      });
    } else if (data.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Title cannot be empty',
        code: 'FIELD_EMPTY',
      });
    }
  }

  // Validate lesson_type
  const validLessonTypes = ['theory-demo-practical', 'video', 'interactive', 'reading'];
  if (data.lesson_type !== undefined && !validLessonTypes.includes(data.lesson_type)) {
    errors.push({
      field: 'lesson_type',
      message: `Lesson type must be one of: ${validLessonTypes.join(', ')}`,
      code: 'INVALID_VALUE',
    });
  }

  // Validate video_provider
  const validProviders = ['youtube', 'vimeo', 'loom', 'wistia', 'custom'];
  if (data.video_provider !== undefined && data.video_provider !== null) {
    if (!validProviders.includes(data.video_provider)) {
      errors.push({
        field: 'video_provider',
        message: `Video provider must be one of: ${validProviders.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }
  }

  // Validate JSONB fields
  const objectivesResult = validateLearningObjectives(data.learning_objectives);
  errors.push(...objectivesResult.errors);

  const takeawaysResult = validateKeyTakeaways(data.key_takeaways);
  errors.push(...takeawaysResult.errors);

  const resourcesResult = validateResources(data.resources);
  errors.push(...resourcesResult.errors);

  return { valid: errors.length === 0, errors };
}

export interface QuizInput {
  title?: string;
  description?: string;
  passing_score_percent?: number;
  max_attempts?: number;
  prompts?: PromptInput[];
}

/**
 * Validate quiz data for creation/update
 */
export function validateQuiz(data: QuizInput, isCreate = true): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Title required for creation
  if (isCreate && !data.title) {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'MISSING_FIELD',
    });
  }

  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Title must be a string',
        code: 'INVALID_TYPE',
      });
    } else if (data.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title exceeds 200 characters',
        code: 'FIELD_TOO_LONG',
      });
    } else if (data.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Title cannot be empty',
        code: 'FIELD_EMPTY',
      });
    }
  }

  // Validate passing_score_percent
  if (data.passing_score_percent !== undefined) {
    if (typeof data.passing_score_percent !== 'number') {
      errors.push({
        field: 'passing_score_percent',
        message: 'Passing score must be a number',
        code: 'INVALID_TYPE',
      });
    } else if (data.passing_score_percent < 0 || data.passing_score_percent > 100) {
      errors.push({
        field: 'passing_score_percent',
        message: 'Passing score must be between 0 and 100',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Validate max_attempts
  if (data.max_attempts !== undefined && data.max_attempts !== null) {
    if (typeof data.max_attempts !== 'number') {
      errors.push({
        field: 'max_attempts',
        message: 'Max attempts must be a number',
        code: 'INVALID_TYPE',
      });
    } else if (data.max_attempts < 1) {
      errors.push({
        field: 'max_attempts',
        message: 'Max attempts must be at least 1',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Validate embedded prompts if provided
  if (data.prompts !== undefined && data.prompts !== null) {
    if (!Array.isArray(data.prompts)) {
      errors.push({
        field: 'prompts',
        message: 'Prompts must be an array',
        code: 'INVALID_TYPE',
      });
    } else {
      data.prompts.forEach((prompt, index) => {
        const promptResult = validatePrompt(prompt, true);
        promptResult.errors.forEach((err) => {
          errors.push({
            ...err,
            field: `prompts[${index}].${err.field}`,
          });
        });
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface PromptInput {
  quiz_id?: string;
  order?: number;
  statement?: string;
  explanation?: string;
  points?: number;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  feedback_a?: string;
  feedback_b?: string;
  feedback_c?: string;
  feedback_d?: string;
}

/**
 * Validate prompt (quiz question) data for creation/update
 */
export function validatePrompt(data: PromptInput, isCreate = true): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Required fields for creation
  if (isCreate) {
    if (!data.statement) {
      errors.push({
        field: 'statement',
        message: 'Statement is required',
        code: 'MISSING_FIELD',
      });
    }
    if (!data.correct_option) {
      errors.push({
        field: 'correct_option',
        message: 'Correct option is required',
        code: 'MISSING_FIELD',
      });
    }
    if (!data.option_a) {
      errors.push({
        field: 'option_a',
        message: 'Option A is required',
        code: 'MISSING_FIELD',
      });
    }
    if (!data.option_b) {
      errors.push({
        field: 'option_b',
        message: 'Option B is required',
        code: 'MISSING_FIELD',
      });
    }
    if (!data.option_c) {
      errors.push({
        field: 'option_c',
        message: 'Option C is required',
        code: 'MISSING_FIELD',
      });
    }
    if (!data.option_d) {
      errors.push({
        field: 'option_d',
        message: 'Option D is required',
        code: 'MISSING_FIELD',
      });
    }
  }

  // Validate statement
  if (data.statement !== undefined) {
    if (typeof data.statement !== 'string') {
      errors.push({
        field: 'statement',
        message: 'Statement must be a string',
        code: 'INVALID_TYPE',
      });
    } else if (data.statement.trim().length === 0) {
      errors.push({
        field: 'statement',
        message: 'Statement cannot be empty',
        code: 'FIELD_EMPTY',
      });
    }
  }

  // Validate correct_option
  const validOptions = ['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'];
  if (data.correct_option !== undefined) {
    if (!validOptions.includes(data.correct_option)) {
      errors.push({
        field: 'correct_option',
        message: 'Correct option must be a, b, c, or d',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Validate points
  if (data.points !== undefined && data.points !== null) {
    if (typeof data.points !== 'number') {
      errors.push({
        field: 'points',
        message: 'Points must be a number',
        code: 'INVALID_TYPE',
      });
    } else if (data.points < 0) {
      errors.push({
        field: 'points',
        message: 'Points cannot be negative',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Validate order
  if (data.order !== undefined && data.order !== null) {
    if (typeof data.order !== 'number') {
      errors.push({
        field: 'order',
        message: 'Order must be a number',
        code: 'INVALID_TYPE',
      });
    } else if (data.order < 0) {
      errors.push({
        field: 'order',
        message: 'Order cannot be negative',
        code: 'INVALID_VALUE',
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// BULK VALIDATION
// ========================================

export interface BulkValidationResult<T> {
  valid: boolean;
  validItems: T[];
  invalidItems: Array<{
    index: number;
    item: T;
    errors: ValidationResult['errors'];
  }>;
}

/**
 * Validate an array of lessons for bulk creation
 */
export function validateBulkLessons(lessons: LessonInput[]): BulkValidationResult<LessonInput> {
  const validItems: LessonInput[] = [];
  const invalidItems: BulkValidationResult<LessonInput>['invalidItems'] = [];

  lessons.forEach((lesson, index) => {
    const result = validateLesson(lesson, true);
    if (result.valid) {
      validItems.push(lesson);
    } else {
      invalidItems.push({ index, item: lesson, errors: result.errors });
    }
  });

  return {
    valid: invalidItems.length === 0,
    validItems,
    invalidItems,
  };
}

/**
 * Validate an array of quizzes for bulk creation
 */
export function validateBulkQuizzes(quizzes: QuizInput[]): BulkValidationResult<QuizInput> {
  const validItems: QuizInput[] = [];
  const invalidItems: BulkValidationResult<QuizInput>['invalidItems'] = [];

  quizzes.forEach((quiz, index) => {
    const result = validateQuiz(quiz, true);
    if (result.valid) {
      validItems.push(quiz);
    } else {
      invalidItems.push({ index, item: quiz, errors: result.errors });
    }
  });

  return {
    valid: invalidItems.length === 0,
    validItems,
    invalidItems,
  };
}

/**
 * Validate an array of prompts for bulk creation
 */
export function validateBulkPrompts(prompts: PromptInput[]): BulkValidationResult<PromptInput> {
  const validItems: PromptInput[] = [];
  const invalidItems: BulkValidationResult<PromptInput>['invalidItems'] = [];

  prompts.forEach((prompt, index) => {
    const result = validatePrompt(prompt, true);
    if (result.valid) {
      validItems.push(prompt);
    } else {
      invalidItems.push({ index, item: prompt, errors: result.errors });
    }
  });

  return {
    valid: invalidItems.length === 0,
    validItems,
    invalidItems,
  };
}

// ========================================
// REORDER VALIDATION
// ========================================

export interface MoveInput {
  id: string;
  new_order: number;
}

/**
 * Validate moves array for reordering
 */
export function validateMoves(moves: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!Array.isArray(moves)) {
    errors.push({
      field: 'moves',
      message: 'Moves must be an array',
      code: 'INVALID_TYPE',
    });
    return { valid: false, errors };
  }

  if (moves.length === 0) {
    errors.push({
      field: 'moves',
      message: 'At least one move is required',
      code: 'EMPTY_ARRAY',
    });
    return { valid: false, errors };
  }

  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();

  moves.forEach((move, index) => {
    if (typeof move !== 'object' || move === null) {
      errors.push({
        field: `moves[${index}]`,
        message: 'Each move must be an object',
        code: 'INVALID_ITEM_TYPE',
      });
      return;
    }

    const m = move as Record<string, unknown>;

    // Validate id
    if (!m.id) {
      errors.push({
        field: `moves[${index}].id`,
        message: 'ID is required',
        code: 'MISSING_FIELD',
      });
    } else if (typeof m.id !== 'string') {
      errors.push({
        field: `moves[${index}].id`,
        message: 'ID must be a string',
        code: 'INVALID_TYPE',
      });
    } else {
      if (seenIds.has(m.id as string)) {
        errors.push({
          field: `moves[${index}].id`,
          message: 'Duplicate ID in moves',
          code: 'DUPLICATE_ID',
        });
      }
      seenIds.add(m.id as string);
    }

    // Validate new_order
    if (m.new_order === undefined || m.new_order === null) {
      errors.push({
        field: `moves[${index}].new_order`,
        message: 'New order is required',
        code: 'MISSING_FIELD',
      });
    } else if (typeof m.new_order !== 'number') {
      errors.push({
        field: `moves[${index}].new_order`,
        message: 'New order must be a number',
        code: 'INVALID_TYPE',
      });
    } else if (m.new_order < 0) {
      errors.push({
        field: `moves[${index}].new_order`,
        message: 'New order cannot be negative',
        code: 'INVALID_VALUE',
      });
    } else {
      if (seenOrders.has(m.new_order as number)) {
        errors.push({
          field: `moves[${index}].new_order`,
          message: 'Duplicate order value in moves',
          code: 'DUPLICATE_ORDER',
        });
      }
      seenOrders.add(m.new_order as number);
    }
  });

  return { valid: errors.length === 0, errors };
}
