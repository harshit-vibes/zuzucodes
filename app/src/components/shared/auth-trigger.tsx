"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./auth-dialog";

export function AuthTrigger() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authPath, setAuthPath] = useState<"sign-in" | "sign-up">("sign-in");

  const openSignIn = () => {
    setAuthPath("sign-in");
    setDialogOpen(true);
  };

  const openSignUp = () => {
    setAuthPath("sign-up");
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex gap-3">
        <Button variant="outline" onClick={openSignIn}>
          Sign in
        </Button>
        <Button onClick={openSignUp}>
          Sign up
        </Button>
      </div>

      <AuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        path={authPath}
      />
    </>
  );
}
