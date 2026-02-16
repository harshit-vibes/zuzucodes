import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth/server';
import { splitMdxSections } from '@/lib/mdx-utils';
import { getActiveSchema, validateModuleContent } from '@/lib/module-schema';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET!;
  return createClient(supabaseUrl, supabaseSecretKey);
}

// GET /api/internal/modules - List all modules
export async function GET(req: Request) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const courseId = searchParams.get('course_id');

    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('modules')
      .select('*', { count: 'exact' })
      .order('order', { ascending: true })
      .range(offset, offset + limit - 1);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching modules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error in modules list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/internal/modules - Create a new module
export async function POST(req: Request) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      course_id,
      title,
      description,
      order,
      mdx_content,
      quiz_form,
    } = body;

    if (!title || !course_id) {
      return NextResponse.json(
        { error: 'Title and course_id are required' },
        { status: 400 }
      );
    }

    const sectionCount = mdx_content ? splitMdxSections(mdx_content).length : 0;

    // Validate content against active schema
    const schema = await getActiveSchema();
    if (schema) {
      const result = validateModuleContent(mdx_content || null, quiz_form || null, schema);
      if (!result.valid) {
        return NextResponse.json({
          error: 'Module content validation failed',
          validation_errors: result.errors,
          schema_version: schema.version,
        }, { status: 400 });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: module, error: moduleError } = await supabaseAdmin
      .from('modules')
      .insert({
        id,
        course_id,
        title,
        description,
        order: order || 0,
        mdx_content: mdx_content || null,
        quiz_form: quiz_form || null,
        section_count: sectionCount,
        schema_version: schema?.version ?? null,
      })
      .select()
      .single();

    if (moduleError) {
      console.error('Error creating module:', moduleError);
      return NextResponse.json(
        { error: 'Failed to create module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: module }, { status: 201 });
  } catch (error) {
    console.error('Error in module create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
