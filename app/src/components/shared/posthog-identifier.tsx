'use client';

import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

interface PostHogIdentifierProps {
  userId: string | null;
  email: string | null;
  name: string | null;
  subscriptionStatus: string;
}

export function PostHogIdentifier({
  userId,
  email,
  name,
  subscriptionStatus,
}: PostHogIdentifierProps) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!userId || !posthog) return;

    posthog.identify(userId, {
      email: email ?? undefined,
      name: name ?? undefined,
      subscription_status: subscriptionStatus,
    });

    // Fire sign_in_completed once per browser session (sessionStorage guard)
    const sessionKey = `ph_auth_${userId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    posthog.capture('sign_in_completed', { method: 'otp' });
  }, [userId, email, name, subscriptionStatus, posthog]);

  return null;
}
