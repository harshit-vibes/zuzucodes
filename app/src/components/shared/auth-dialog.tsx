"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthView } from "@neondatabase/auth/react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path?: string;
}

export function AuthDialog({ open, onOpenChange, path = "sign-in" }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm overflow-hidden p-0 [&>button:last-child]:hidden">
        <AuthView path={path} localization={path === 'sign-up' ? { SIGN_IN_WITH: 'Sign up with' } : undefined} />
      </DialogContent>
    </Dialog>
  );
}
