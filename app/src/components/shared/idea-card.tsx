'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, Sparkles, Bug, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/lib/data';

const TYPE_MAP = {
  feature:  { label: 'Feature',  Icon: Sparkles, color: '#818cf8', bg: '#818cf818' },
  bug:      { label: 'Bug',      Icon: Bug,       color: '#f87171', bg: '#f8717118' },
  learning: { label: 'Learning', Icon: BookOpen,  color: '#34d399', bg: '#34d39918' },
} satisfies Record<RoadmapItem['type'], { label: string; Icon: React.ComponentType<{ className?: string }>; color: string; bg: string }>;

interface IdeaCardProps {
  item: RoadmapItem;
  isAuthenticated: boolean;
  animDelay?: number;
}

export function IdeaCard({ item, isAuthenticated, animDelay = 0 }: IdeaCardProps) {
  const router = useRouter();
  const [voted, setVoted] = useState(item.user_voted);
  const [count, setCount] = useState(item.vote_count);
  const [loading, setLoading] = useState(false);

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

  const isCommunity = item.created_by !== 'admin';
  const typeInfo = TYPE_MAP[item.type] ?? TYPE_MAP.feature;

  return (
    <div
      className="kanban-anim relative rounded-lg border border-border/30 bg-card overflow-hidden
                 hover:border-border/50 hover:shadow-sm transition-all duration-200"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Left accent bar — type color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: typeInfo.color }}
      />

      {/* Card content */}
      <div className="pl-4 pr-3 pt-3 pb-2.5 flex flex-col gap-2">
        {/* Type pill */}
        <div
          className="self-start inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium uppercase tracking-wider"
          style={{ background: typeInfo.bg, color: typeInfo.color }}
        >
          <typeInfo.Icon className="h-2.5 w-2.5" />
          {typeInfo.label}
        </div>

        <p className="text-[12px] font-medium text-foreground leading-snug">
          {item.title}
        </p>

        {item.description && (
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30">
            {isCommunity ? 'community' : 'zuzu team'}
          </span>

          <button
            onClick={handleVote}
            disabled={loading}
            aria-label={voted ? 'Remove vote' : 'Upvote'}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold tabular-nums',
              'transition-all duration-150 active:scale-95 disabled:opacity-60',
              voted
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/50',
            )}
          >
            <ChevronUp className={cn('h-3 w-3 transition-transform duration-150', voted && 'scale-110')} />
            {count}
          </button>
        </div>
      </div>
    </div>
  );
}
