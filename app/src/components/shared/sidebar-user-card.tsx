'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { AccountModal } from './account-modal';
import type { SubscriptionRow } from '@/lib/data';

interface SidebarUserCardProps {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  subscription: SubscriptionRow | null;
}

function StatusDot({ status }: { status: string | undefined }) {
  const colorMap: Record<string, string> = {
    ACTIVE:    'bg-green-500',
    CANCELLED: 'bg-destructive',
    SUSPENDED: 'bg-amber-500',
    EXPIRED:   'bg-muted-foreground/40',
  };
  const color = status ? (colorMap[status] ?? 'bg-muted-foreground/40') : 'bg-muted-foreground/30';
  const label = status === 'ACTIVE' ? 'Active' : status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Free';
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${color} shrink-0`} />
      {label}
    </span>
  );
}

export function SidebarUserCard({ user, subscription }: SidebarUserCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <div className="relative h-7 w-7 shrink-0">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              fill
              className="rounded-md object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-muted/50 font-mono text-[10px] font-medium tracking-wider text-foreground/60">
              {initials}
            </div>
          )}
        </div>

        {/* Name + badge — links to full account page */}
        <Link href="/account" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <p className="text-xs font-medium text-foreground truncate leading-none mb-0.5">
            {displayName}
          </p>
          <StatusDot status={subscription?.status} />
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setModalOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Account settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        subscription={subscription}
      />
    </>
  );
}
