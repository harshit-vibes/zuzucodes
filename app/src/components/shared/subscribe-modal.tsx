'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PayPalProvider, PayPalSubscriptionButton } from '@paypal/react-paypal-js/sdk-v6';

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
}

export function SubscribeModal({ open, onOpenChange, planId }: SubscribeModalProps) {
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const createdSubscriptionId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setClientToken(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/paypal/client-token')
      .then((res) => res.json())
      .then((data: { clientToken?: string; error?: string }) => {
        if (cancelled) return;
        if (data.error || !data.clientToken) {
          setError(data.error ?? 'Failed to load payment provider');
        } else {
          setClientToken(data.clientToken);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load payment provider');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Unused at runtime but satisfies the linter that planId is referenced
  void planId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to zuzu.codes</DialogTitle>
          <DialogDescription>
            Get full access to all lessons, quizzes, and code challenges.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 min-h-[80px] flex items-center justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading payment options…
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && clientToken && (
            <PayPalProvider
              clientToken={clientToken}
              components={['paypal-payments']}
              pageType="checkout"
            >
              <PayPalSubscriptionButton
                createSubscription={async () => {
                  const res = await fetch('/api/paypal/subscription/create', {
                    method: 'POST',
                  });
                  const data = (await res.json()) as { subscriptionId?: string; error?: string };
                  if (!data.subscriptionId) {
                    throw new Error(data.error ?? 'Failed to create subscription');
                  }
                  createdSubscriptionId.current = data.subscriptionId;
                  return { subscriptionId: data.subscriptionId };
                }}
                onApprove={async (data) => {
                  // billingToken carries the subscription ID in the PayPal subscription flow
                  const subscriptionId =
                    data.billingToken ?? createdSubscriptionId.current ?? undefined;
                  if (subscriptionId) {
                    await fetch('/api/paypal/subscription/activate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscriptionId }),
                    });
                  }
                  router.push('/dashboard');
                  router.refresh();
                }}
                presentationMode="auto"
              />
            </PayPalProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
