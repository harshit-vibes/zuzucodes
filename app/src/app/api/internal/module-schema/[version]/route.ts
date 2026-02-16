import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth/server';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET!;
  return createClient(supabaseUrl, supabaseSecretKey);
}

interface RouteParams {
  params: Promise<{ version: string }>;
}

// GET /api/internal/module-schema/[version] - Get specific schema version
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { user } = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { version } = await params;
    const versionNum = parseInt(version, 10);

    if (isNaN(versionNum)) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('module_schema')
      .select('*')
      .eq('version', versionNum)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Schema version not found' }, { status: 404 });
      }
      console.error('Error fetching module schema:', error);
      return NextResponse.json({ error: 'Failed to fetch schema' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in module-schema get:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/internal/module-schema/[version] - Activate this schema version
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { user } = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { version } = await params;
    const versionNum = parseInt(version, 10);

    if (isNaN(versionNum)) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify the version exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('module_schema')
      .select('version')
      .eq('version', versionNum)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Schema version not found' }, { status: 404 });
    }

    // Deactivate current active schema
    await supabaseAdmin
      .from('module_schema')
      .update({ is_active: false })
      .eq('is_active', true);

    // Activate the requested version
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('module_schema')
      .update({ is_active: true })
      .eq('version', versionNum)
      .select()
      .single();

    if (updateError) {
      console.error('Error activating module schema:', updateError);
      return NextResponse.json({ error: 'Failed to activate schema' }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error in module-schema activate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
