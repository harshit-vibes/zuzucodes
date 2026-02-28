import posthog from 'posthog-js';

const APP_SIGN_IN = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-in`
  : 'https://app.zuzu.codes/auth/sign-in';

export function getSignUpUrl(): string {
  try {
    const distinctId = posthog.get_distinct_id();
    if (distinctId) {
      return `${APP_SIGN_IN}?phDistinctId=${encodeURIComponent(distinctId)}`;
    }
  } catch {
    // posthog not yet initialized
  }
  return APP_SIGN_IN;
}
