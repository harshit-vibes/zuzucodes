'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IdeaCard } from './idea-card';
import { SubmitIdeaModal } from './submit-idea-modal';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/lib/data';

const STATUS_TABS = [
  { value: null,          label: 'All'         },
  { value: 'idea',        label: 'Ideas'        },
  { value: 'planned',     label: 'Planned'      },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'done',        label: 'Done'         },
] as const;

interface RoadmapPageProps {
  items: RoadmapItem[];
  isAuthenticated: boolean;
}

export function RoadmapPage({ items, isAuthenticated }: RoadmapPageProps) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const filtered = activeStatus
    ? items.filter((i) => i.status === activeStatus)
    : items;

  function handleSubmitClick() {
    if (!isAuthenticated) {
      router.push('/auth/sign-in');
      return;
    }
    setSubmitOpen(true);
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Idea Log</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vote on what we build next. Your voice shapes the roadmap.
            </p>
          </div>
          <Button size="sm" onClick={handleSubmitClick} className="shrink-0 ml-4">
            Submit an idea
          </Button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-0 mb-6 border-b border-border/50 overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setActiveStatus(value)}
              className={cn(
                'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                activeStatus === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No items in this category yet.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <IdeaCard key={item.id} item={item} isAuthenticated={isAuthenticated} />
            ))
          )}
        </div>
      </div>

      <SubmitIdeaModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
