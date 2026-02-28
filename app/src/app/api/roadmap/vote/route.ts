import { auth } from '@/lib/auth/server';
import { toggleRoadmapVote } from '@/lib/data';

export async function POST(request: Request) {
  const { user } = await auth();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const itemId = body?.itemId;
  if (!itemId || typeof itemId !== 'string') {
    return Response.json({ error: 'itemId required' }, { status: 400 });
  }

  try {
    const result = await toggleRoadmapVote(user.id, itemId);
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Failed to toggle vote' }, { status: 500 });
  }
}
