import { auth } from '@/lib/auth/server';
import { submitRoadmapIdea } from '@/lib/data';

export async function POST(request: Request) {
  const { user } = await auth();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = body?.title?.trim();
  const description = body?.description?.trim() ?? '';

  if (!title) {
    return Response.json({ error: 'Title required' }, { status: 400 });
  }
  if (title.length > 80) {
    return Response.json({ error: 'Title too long (max 80 chars)' }, { status: 400 });
  }
  if (description.length > 300) {
    return Response.json({ error: 'Description too long (max 300 chars)' }, { status: 400 });
  }

  try {
    await submitRoadmapIdea(user.id, title, description);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to submit idea' }, { status: 500 });
  }
}
