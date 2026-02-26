"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignInForm, SignUpForm } from "@neondatabase/auth/react/ui";
import { EmailVerification } from "@/components/shared/email-verification";

type AuthView = "sign-in" | "sign-up" | "verify-email";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultView?: "sign-in" | "sign-up";
}

export function AuthDialog({ open, onOpenChange, defaultView = "sign-in" }: AuthDialogProps) {
  const [view, setView] = useState<AuthView>(defaultView);
  const [userEmail, setUserEmail] = useState<string>("");

  // Handle verification completion
  const handleVerified = () => {
    onOpenChange(false);
    window.location.href = '/dashboard';
  };

  // Handle back to sign-in from verification
  const handleBackToSignIn = () => {
    setView("sign-in");
    setUserEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "sign-in" && "Sign in to your account"}
            {view === "sign-up" && "Create an account"}
            {view === "verify-email" && "Verify Your Email"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {view === "verify-email" ? (
            <>
              <EmailVerification email={userEmail} onVerified={handleVerified} />
              <div className="text-center text-sm">
                <button
                  onClick={handleBackToSignIn}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : view === "sign-in" ? (
            <>
              <SignInForm localization={{}} />
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
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
              <div className="text-xs text-muted-foreground text-center mt-2">
                After signing up, check your email for a verification code
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
