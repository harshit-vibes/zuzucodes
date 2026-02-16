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
 * PATCH /api/internal/modules/[id]/reorder
 * Reorder contents (lessons/quizzes) within a module
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

    const { id: moduleId } = await params;
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

    // Verify module exists
    const { data: module, error: moduleError } = await supabaseAdmin
      .from('modules')
      .select('id, title')
      .eq('id', moduleId)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Get current contents to validate the IDs
    const { data: currentContents, error: contentsError } = await supabaseAdmin
      .from('module_contents')
      .select('id, content_type, lesson_id, quiz_id, order, title_override')
      .eq('module_id', moduleId)
      .order('order', { ascending: true });

    if (contentsError) {
      console.error('Error fetching module contents:', contentsError);
      return NextResponse.json(
        { error: 'Failed to fetch module contents' },
        { status: 500 }
      );
    }

    const contentIds = new Set((currentContents || []).map(c => c.id));
    const typedMoves = moves as MoveInput[];

    // Validate that all move IDs are valid content_ids in this module
    const invalidIds = typedMoves.filter(m => !contentIds.has(m.id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid content IDs',
          invalid_ids: invalidIds.map(m => m.id),
        },
        { status: 400 }
      );
    }

    // Update each content's order
    let updatedCount = 0;
    for (const move of typedMoves) {
      const { error: updateError } = await supabase
        .from('module_contents')
        .update({ order: move.new_order })
        .eq('id', move.id)
        .eq('module_id', moduleId);

      if (updateError) {
        console.error('Error updating content order:', updateError);
        continue;
      }
      updatedCount++;
    }

    // Get updated order with titles from lessons/quizzes
    const { data: updatedContents } = await supabaseAdmin
      .from('module_contents')
      .select(`
        id,
        content_type,
        order,
        title_override,
        lessons(title),
        quizzes(title)
      `)
      .eq('module_id', moduleId)
      .order('order', { ascending: true });

    return NextResponse.json({
      data: {
        updated: updatedCount,
        current_order: (updatedContents || []).map(c => {
          const lessons = c.lessons as { title: string }[] | null;
          const quizzes = c.quizzes as { title: string }[] | null;
          return {
            id: c.id,
            order: c.order,
            content_type: c.content_type,
            title: c.title_override || lessons?.[0]?.title || quizzes?.[0]?.title,
          };
        }),
      },
    });
  } catch (error) {
    console.error('Error in module reorder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
