import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@/lib/neon'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { capstoneId?: string; code?: string; output?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { capstoneId, code, output } = body

  if (!capstoneId || !code) {
    return NextResponse.json({ error: 'Missing capstoneId or code' }, { status: 400 })
  }

  try {
    await sql`
      INSERT INTO user_capstone_submissions (user_id, capstone_id, code, output, submitted_at)
      VALUES (${session.user.id}, ${capstoneId}, ${code}, ${output ?? null}, NOW())
      ON CONFLICT (user_id, capstone_id) DO UPDATE SET
        code         = EXCLUDED.code,
        output       = EXCLUDED.output,
        submitted_at = NOW()
    `
  } catch {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
