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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/internal/modules/[id] - Get a single module
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }
      console.error('Error fetching module:', error);
      return NextResponse.json(
        { error: 'Failed to fetch module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in module get:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/internal/modules/[id] - Update a module
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      course_id,
      title,
      description,
      order,
      mdx_content,
      quiz_form,
    } = body;

    const supabaseAdmin = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (course_id !== undefined) updateData.course_id = course_id;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (mdx_content !== undefined) {
      updateData.mdx_content = mdx_content;
      updateData.section_count = mdx_content ? splitMdxSections(mdx_content).length : 0;
    }
    if (quiz_form !== undefined) updateData.quiz_form = quiz_form;

    // Validate content against active schema
    const schema = await getActiveSchema();
    if (schema && (mdx_content !== undefined || quiz_form !== undefined)) {
      // Fetch existing module to merge with update fields
      const { data: existing } = await supabaseAdmin
        .from('modules')
        .select('mdx_content, quiz_form')
        .eq('id', id)
        .single();

      const effectiveMdx = mdx_content !== undefined ? mdx_content : existing?.mdx_content;
      const effectiveQuiz = quiz_form !== undefined ? quiz_form : existing?.quiz_form;

      const result = validateModuleContent(effectiveMdx || null, effectiveQuiz || null, schema);
      if (!result.valid) {
        return NextResponse.json({
          error: 'Module content validation failed',
          validation_errors: result.errors,
          schema_version: schema.version,
        }, { status: 400 });
      }

      updateData.schema_version = schema.version;
    }

    const { data: module, error: moduleError } = await supabaseAdmin
      .from('modules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (moduleError) {
      if (moduleError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }
      console.error('Error updating module:', moduleError);
      return NextResponse.json(
        { error: 'Failed to update module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: module });
  } catch (error) {
    console.error('Error in module update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/internal/modules/[id] - Delete a module
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.from('modules').delete().eq('id', id);

    if (error) {
      console.error('Error deleting module:', error);
      return NextResponse.json(
        { error: 'Failed to delete module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in module delete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
