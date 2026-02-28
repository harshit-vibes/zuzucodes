import { auth } from '@/lib/auth/server';
import { getRoadmapItems } from '@/lib/data';
import { RoadmapPage } from '@/components/shared/roadmap-page';

export default async function RoadmapRoute() {
  const { user } = await auth();
  const items = await getRoadmapItems(user?.id ?? null);
  return <RoadmapPage items={items} isAuthenticated={!!user} />;
}
