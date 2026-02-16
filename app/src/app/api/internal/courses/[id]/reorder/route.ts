import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth/server';
import { validateMoves, type MoveInput } from '@/lib/validation';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET!;
  return createClient(supabaseUrl, supabaseSecretKey);
}

interface ReorderRequest {
  moves: MoveInput[];
}

/**
 * PATCH /api/internal/courses/[id]/reorder
 * Reorder modules within a course
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const body: ReorderRequest = await req.json();
    const { moves } = body;

    // Validate moves
    const validation = validateMoves(moves);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validation_errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify course exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get current modules to validate the IDs
    const { data: currentModules, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select('id, title, order')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    const moduleIds = new Set((currentModules || []).map(m => m.id));
    const typedMoves = moves as MoveInput[];

    // Validate that all move IDs are valid module_ids in this course
    const invalidIds = typedMoves.filter(m => !moduleIds.has(m.id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid module IDs',
          invalid_ids: invalidIds.map(m => m.id),
        },
        { status: 400 }
      );
    }

    // Update each module's order
    let updatedCount = 0;
    for (const move of typedMoves) {
      const { error: updateError } = await supabase
        .from('modules')
        .update({ order: move.new_order })
        .eq('id', move.id)
        .eq('course_id', courseId);

      if (updateError) {
        console.error('Error updating module order:', updateError);
        continue;
      }
      updatedCount++;
    }

    // Get updated order
    const { data: updatedModules } = await supabaseAdmin
      .from('modules')
      .select('id, title, order')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    return NextResponse.json({
      data: {
        updated: updatedCount,
        current_order: (updatedModules || []).map(m => ({
          id: m.id,
          order: m.order,
          title: m.title,
        })),
      },
    });
  } catch (error) {
    console.error('Error in course reorder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
