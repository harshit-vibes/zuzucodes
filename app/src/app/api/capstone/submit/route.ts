import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@/lib/neon'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { capstoneId?: string; code?: string; output?: string }
  const { capstoneId, code, output } = body

  if (!capstoneId || !code) {
    return NextResponse.json({ error: 'Missing capstoneId or code' }, { status: 400 })
  }

  await sql`
    INSERT INTO user_capstone_submissions (user_id, capstone_id, code, output, submitted_at)
    VALUES (${session.user.id}, ${capstoneId}, ${code}, ${output ?? null}, NOW())
    ON CONFLICT (user_id, capstone_id) DO UPDATE SET
      code         = EXCLUDED.code,
      output       = EXCLUDED.output,
      submitted_at = NOW()
  `

  return NextResponse.json({ ok: true })
}
