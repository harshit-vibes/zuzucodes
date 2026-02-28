# Unified Auth Design

**Date:** 2026-02-28
**Status:** Approved

## Goal

Add Google OAuth + unify all auth UI to use Neon's native `<AuthView>` component everywhere — both the full-page route and the in-app dialog modal. Remove the hand-rolled state machine.

## Changes

| File | Change |
|------|--------|
| `app/src/app/layout.tsx` | Add `social={{ providers: ['google'] }}` to `NeonAuthUIProvider` |
| `app/src/components/shared/auth-dialog.tsx` | Replace state machine with Dialog + `<AuthView path="sign-in" />` |
| `app/src/components/shared/auth-trigger.tsx` | Simplify — remove `authView` state, keep two buttons |
| `app/src/components/shared/email-verification.tsx` | Delete (absorbed by `AuthView`) |
| `app/src/app/auth/[path]/page.tsx` | No change |

## Design Details

**Google OAuth:** `social={{ providers: ['google'] }}` on `NeonAuthUIProvider` makes Google button auto-appear in every `<AuthView>` across the app.

**Modal:** Dialog wrapping `<AuthView path="sign-in" />` — no custom view state, OTP verification, or redirect handling needed. `redirectTo="/dashboard"` on the provider handles post-auth navigation.

**Route:** Keep `/auth/[path]` dynamic — `AuthView` handles sign-in/sign-up/OTP internally.

**Cleanup:** `email-verification.tsx` is deleted. `AuthView` handles OTP entry as part of its own flow.
