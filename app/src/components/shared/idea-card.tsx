'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/lib/data';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  idea:        { label: 'Idea',        color: 'bg-muted text-muted-foreground' },
  planned:     { label: 'Planned',     color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  done:        { label: 'Done',        color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
};

interface IdeaCardProps {
  item: RoadmapItem;
  isAuthenticated: boolean;
}

export function IdeaCard({ item, isAuthenticated }: IdeaCardProps) {
  const router = useRouter();
  const [voted, setVoted] = useState(item.user_voted);
  const [count, setCount] = useState(item.vote_count);
  const [loading, setLoading] = useState(false);

  const status = STATUS_MAP[item.status] ?? STATUS_MAP.idea;

  async function handleVote() {
    if (!isAuthenticated) {
      router.push('/auth/sign-in');
      return;
    }
    if (loading) return;
    setLoading(true);
    const wasVoted = voted;
    setVoted(!wasVoted);
    setCount((c) => (wasVoted ? c - 1 : c + 1));
    try {
      const res = await fetch('/api/roadmap/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setVoted(data.voted);
        setCount(data.count);
      } else {
        setVoted(wasVoted);
        setCount((c) => (wasVoted ? c + 1 : c - 1));
      }
    } catch {
      setVoted(wasVoted);
      setCount((c) => (wasVoted ? c + 1 : c - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-border/80 transition-colors">
      {/* Upvote column */}
      <button
        onClick={handleVote}
        disabled={loading}
        className={cn(
          'flex flex-col items-center justify-center gap-1 min-w-[3rem] rounded-lg border px-2 py-2 transition-all disabled:opacity-70',
          voted
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary',
        )}
        aria-label={voted ? 'Remove vote' : 'Upvote'}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-mono font-semibold tabular-nums leading-none">{count}</span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', status.color)}>
            {status.label}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {item.created_by === 'admin' ? 'by zuzu team' : 'suggested by community'}
          </span>
        </div>
      </div>
    </div>
  );
}
