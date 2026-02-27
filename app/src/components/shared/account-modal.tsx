'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { AccountContent } from './account-content';
import type { SubscriptionRow } from '@/lib/data';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionRow | null;
}

export function AccountModal({ open, onOpenChange, subscription }: AccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Account</DialogTitle>
        <div className="overflow-y-auto max-h-[80vh] p-6">
          <AccountContent subscription={subscription} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
