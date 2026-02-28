'use client';

import {
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  SessionsCard,
  DeleteAccountCard,
} from '@neondatabase/auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SubscribeModal } from './subscribe-modal';
import { useState } from 'react';
import { PLAN_ID } from '@/lib/paypal';
import type { SubscriptionRow } from '@/lib/data';

interface AccountContentProps {
  subscription: SubscriptionRow | null;
}

// ─── Subscription status badge ───────────────────────────────────────────────

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
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── Subscription card ────────────────────────────────────────────────────────

function SubscriptionCard({ subscription }: { subscription: SubscriptionRow | null }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isPaid = subscription?.status === 'ACTIVE';

  return (
    <>
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

        {subscription?.next_billing_at && isPaid && (
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

        <div className="pt-1">
          {isPaid ? (
            <a
              href="https://www.paypal.com/myaccount/autopay/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Manage on PayPal →
            </a>
          ) : (
            <Button size="sm" onClick={() => setUpgradeOpen(true)}>
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <SubscribeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        planId={PLAN_ID}
      />
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AccountContent({ subscription }: AccountContentProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6 w-full justify-start">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
      </TabsList>

      {/* ── Profile ── */}
      <TabsContent value="profile" className="space-y-6 mt-0">
        <UpdateNameCard />
        <SubscriptionCard subscription={subscription} />
      </TabsContent>

      {/* ── Security ── */}
      <TabsContent value="security" className="space-y-6 mt-0">
        <ChangeEmailCard />
        <ChangePasswordCard />
      </TabsContent>

      {/* ── Sessions ── */}
      <TabsContent value="sessions" className="space-y-6 mt-0">
        <div className="rounded-lg border bg-muted/30 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Maximum 2 active sessions allowed per account.
          </p>
        </div>
        <SessionsCard />
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="uppercase tracking-wider">Danger zone</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <DeleteAccountCard />
        </div>
      </TabsContent>
    </Tabs>
  );
}
