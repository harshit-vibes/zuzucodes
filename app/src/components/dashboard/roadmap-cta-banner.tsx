import Link from 'next/link';
import { ArrowRight, Lightbulb } from 'lucide-react';

export function RoadmapCTABanner() {
  return (
    <Link
      href="/roadmap"
      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-5 py-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Lightbulb className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">We're building this in public</p>
        <p className="text-xs text-muted-foreground mt-0.5">Vote on what we build next</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
