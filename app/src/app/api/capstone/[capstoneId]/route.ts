import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getUserCapstoneSubmission } from '@/lib/data'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ capstoneId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { capstoneId } = await params
  const submission = await getUserCapstoneSubmission(session.user.id, capstoneId)
  return NextResponse.json(submission ?? null)
}
