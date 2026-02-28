import { getRoadmapItems } from '@/lib/data';
import { RoadmapPage } from '@/components/shared/roadmap-page';
import { auth } from '@/lib/auth/server';

export default async function RoadmapRoute() {
  const { user } = await auth();
  const items = await getRoadmapItems(user?.id ?? null);
  return <RoadmapPage items={items} isAuthenticated={!!user} />;
}
