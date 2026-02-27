'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscribeModal } from './subscribe-modal';

interface PaywallOverlayProps {
  planId: string;
}

export function PaywallOverlay({ planId }: PaywallOverlayProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Subscribe to unlock</h3>
          <p className="text-muted-foreground text-sm">
            Get full access to all lessons, quizzes, and code challenges.
          </p>
          <Button onClick={() => setOpen(true)} size="lg" className="w-full">
            Subscribe Now
          </Button>
        </div>
      </div>
      <SubscribeModal open={open} onOpenChange={setOpen} planId={planId} />
    </>
  );
}
