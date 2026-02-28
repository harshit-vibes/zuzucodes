import { auth } from '@/lib/auth/server';
import { getSubscriptionStatus } from '@/lib/data';
import { redirect } from 'next/navigation';
import { AccountContent } from '@/components/shared/account-content';

export default async function AccountPage() {
  const { user } = await auth();
  if (!user) redirect('/auth/sign-in');

  const subscription = await getSubscriptionStatus(user.id);

  return <AccountContent subscription={subscription} />;
}
