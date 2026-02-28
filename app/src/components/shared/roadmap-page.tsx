'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { IdeaCard } from './idea-card';
import { SubmitIdeaModal } from './submit-idea-modal';
import type { RoadmapItem } from '@/lib/data';

type Status = RoadmapItem['status'];

interface KanbanColumn {
  status: Status;
  label: string;
  description: string;
  color: string;
  pulse?: boolean;
}

const COLUMNS: KanbanColumn[] = [
  {
    status: 'idea',
    label: 'Ideas',
    description: 'Community suggestions',
    color: '#94a3b8',
  },
  {
    status: 'planned',
    label: 'Planned',
    description: 'Confirmed for development',
    color: '#818cf8',
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    description: 'Building now',
    color: '#fbbf24',
    pulse: true,
  },
  {
    status: 'done',
    label: 'Done',
    description: 'Shipped',
    color: '#34d399',
  },
];

interface RoadmapPageProps {
  items: RoadmapItem[];
  isAuthenticated: boolean;
}

export function RoadmapPage({ items, isAuthenticated }: RoadmapPageProps) {
  const router = useRouter();
  const [submitOpen, setSubmitOpen] = useState(false);

  function handleSubmitClick() {
    if (!isAuthenticated) router.push('/auth/sign-in');
    else setSubmitOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">Roadmap</h1>
          <p className="text-[11px] font-mono text-muted-foreground/50 mt-0.5">
            vote · suggest · shape what we build
          </p>
        </div>
        <button
          onClick={handleSubmitClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          <Plus className="h-3.5 w-3.5" />
          Submit idea
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-3 p-5" style={{ width: 'max-content', minWidth: '100%' }}>
          {COLUMNS.map((col, colIdx) => {
            const colItems = items
              .filter((i) => i.status === col.status)
              .sort((a, b) => b.vote_count - a.vote_count);

            return (
              <div
                key={col.status}
                className="kanban-anim flex flex-col w-[268px] shrink-0 h-full rounded-xl overflow-hidden border border-border/25"
                style={{ animationDelay: `${colIdx * 55}ms` }}
              >
                {/* Column header */}
                <div
                  className="shrink-0 px-3.5 pt-4 pb-3 relative"
                  style={{ background: `${col.color}10` }}
                >
                  {/* Colored top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{ background: col.color }}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {col.pulse && (
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span
                              className="animate-ping absolute h-full w-full rounded-full opacity-60"
                              style={{ background: col.color }}
                            />
                            <span
                              className="relative h-1.5 w-1.5 rounded-full"
                              style={{ background: col.color }}
                            />
                          </span>
                        )}
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]"
                          style={{ color: col.color }}
                        >
                          {col.label}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">
                        {col.description}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold tabular-nums text-muted-foreground/30">
                      {colItems.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2 bg-muted/5">
                  {colItems.length === 0 ? (
                    <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border/20">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/20">
                        empty
                      </span>
                    </div>
                  ) : (
                    colItems.map((item, cardIdx) => (
                      <IdeaCard
                        key={item.id}
                        item={item}
                        isAuthenticated={isAuthenticated}
                        accentColor={col.color}
                        animDelay={colIdx * 55 + cardIdx * 28}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SubmitIdeaModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
