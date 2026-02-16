"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignInForm, SignUpForm } from "@neondatabase/auth/react/ui";

type AuthView = "sign-in" | "sign-up";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultView?: AuthView;
}

export function AuthDialog({ open, onOpenChange, defaultView = "sign-in" }: AuthDialogProps) {
  const [view, setView] = useState<AuthView>(defaultView);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "sign-in" ? "Sign in to your account" : "Create an account"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {view === "sign-in" ? (
            <>
              <SignInForm localization={{}} />
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <button
                  onClick={() => setView("sign-up")}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
            </>
          ) : (
            <>
              <SignUpForm localization={{}} />
              <div className="text-center text-sm">
                Already have an account?{" "}
                <button
                  onClick={() => setView("sign-in")}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
