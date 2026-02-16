import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth/server';
import { splitMdxSections } from '@/lib/mdx-utils';
import { getActiveSchema, validateModuleContent, type ValidationError } from '@/lib/module-schema';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET!;
  return createClient(supabaseUrl, supabaseSecretKey);
}

interface ModuleInput {
  title: string;
  description?: string;
  mdx_content?: string;
  quiz_form?: object;
}

interface BulkModulesRequest {
  course_id: string;
  modules: ModuleInput[];
  start_order?: number;
}

/**
 * POST /api/internal/bulk/modules
 * Create multiple modules for a course at once
 */
export async function POST(req: Request) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: BulkModulesRequest = await req.json();
    const { course_id, modules, start_order } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      );
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json(
        { error: 'Modules array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate modules
    const errors: Array<{ index: number; message: string }> = [];
    modules.forEach((module, index) => {
      if (!module.title || typeof module.title !== 'string' || module.title.trim().length === 0) {
        errors.push({ index, message: 'Title is required' });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validation_errors: errors,
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify course exists
    const { data: courseExists, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .single();

    if (courseError || !courseExists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Validate all modules against active schema
    const schema = await getActiveSchema();
    if (schema) {
      const validationErrors: { index: number; errors: ValidationError[] }[] = [];
      modules.forEach((m, i) => {
        const result = validateModuleContent(m.mdx_content || null, m.quiz_form || null, schema);
        if (!result.valid) validationErrors.push({ index: i, errors: result.errors });
      });
      if (validationErrors.length > 0) {
        return NextResponse.json({
          error: 'Module content validation failed',
          validation_errors: validationErrors,
          schema_version: schema.version,
        }, { status: 400 });
      }
    }

    // Get current max order in course
    const { data: maxOrderResult } = await supabaseAdmin
      .rpc('get_next_module_order', { p_course_id: course_id });

    const baseOrder = start_order ?? maxOrderResult ?? 1;

    // Prepare module data
    const moduleData = modules.map((module, index) => ({
      course_id,
      title: module.title,
      description: module.description || null,
      order: baseOrder + index,
      mdx_content: module.mdx_content || null,
      quiz_form: module.quiz_form || null,
      section_count: module.mdx_content ? splitMdxSections(module.mdx_content).length : 0,
      schema_version: schema?.version ?? null,
    }));

    // Insert all modules
    const { data: createdModules, error: insertError } = await supabaseAdmin
      .from('modules')
      .insert(moduleData)
      .select();

    if (insertError) {
      console.error('Error creating modules:', insertError);
      return NextResponse.json(
        { error: 'Failed to create modules' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { created: createdModules } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in bulk modules create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
