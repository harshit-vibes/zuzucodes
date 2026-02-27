'use client';

import { AccountSettingsCards, SecuritySettingsCards } from '@neondatabase/auth/react';
import type { SubscriptionRow } from '@/lib/data';

interface AccountContentProps {
  subscription: SubscriptionRow | null;
}

function SubscriptionBadge({ status }: { status: string | undefined }) {
  if (!status || status === 'FREE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        Free
      </span>
    );
  }
  const map: Record<string, { label: string; color: string }> = {
    ACTIVE:    { label: 'Active',    color: 'bg-green-500' },
    CANCELLED: { label: 'Cancelled', color: 'bg-destructive' },
    SUSPENDED: { label: 'Suspended', color: 'bg-amber-500' },
    EXPIRED:   { label: 'Expired',   color: 'bg-muted-foreground/50' },
  };
  const cfg = map[status] ?? { label: status, color: 'bg-muted-foreground/50' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AccountContent({ subscription }: AccountContentProps) {
  return (
    <div className="space-y-8">
      {/* Profile */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Profile</h2>
        <AccountSettingsCards />
      </section>

      {/* Security */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Security</h2>
        <SecuritySettingsCards />
      </section>

      {/* Subscription */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Subscription</h2>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Subscription</span>
            <SubscriptionBadge status={subscription?.status} />
          </div>
          {subscription?.trial_end_at && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Trial ends</span>
              <span>{formatDate(subscription.trial_end_at)}</span>
            </div>
          )}
          {subscription?.next_billing_at && subscription.status === 'ACTIVE' && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Next billing</span>
              <span>{formatDate(subscription.next_billing_at)}</span>
            </div>
          )}
          {!subscription && (
            <p className="text-xs text-muted-foreground">
              No active subscription. Subscribe to unlock all lessons and quizzes.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
