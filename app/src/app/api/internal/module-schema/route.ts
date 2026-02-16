import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth/server';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET!;
  return createClient(supabaseUrl, supabaseSecretKey);
}

// GET /api/internal/module-schema - List all schema versions
export async function GET() {
  try {
    const { user } = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('module_schema')
      .select('*')
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching module schemas:', error);
      return NextResponse.json({ error: 'Failed to fetch schemas' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in module-schema list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/internal/module-schema - Create new schema version
export async function POST(req: Request) {
  try {
    const { user } = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mdx_rules, quiz_rules, description, activate } = body;

    if (!mdx_rules || typeof mdx_rules !== 'object') {
      return NextResponse.json({ error: 'mdx_rules is required and must be an object' }, { status: 400 });
    }
    if (!quiz_rules || typeof quiz_rules !== 'object') {
      return NextResponse.json({ error: 'quiz_rules is required and must be an object' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // If activate, deactivate current active schema first
    if (activate) {
      await supabaseAdmin
        .from('module_schema')
        .update({ is_active: false })
        .eq('is_active', true);
    }

    const { data: schema, error } = await supabaseAdmin
      .from('module_schema')
      .insert({
        mdx_rules,
        quiz_rules,
        description: description || null,
        is_active: !!activate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating module schema:', error);
      return NextResponse.json({ error: 'Failed to create schema' }, { status: 500 });
    }

    return NextResponse.json({ data: schema }, { status: 201 });
  } catch (error) {
    console.error('Error in module-schema create:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
