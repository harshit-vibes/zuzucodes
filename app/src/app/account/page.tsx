import { auth } from '@/lib/auth/server';
import { getSubscriptionStatus } from '@/lib/data';
import { redirect } from 'next/navigation';
import { AccountContent } from '@/components/shared/account-content';

export default async function AccountPage() {
  const { user } = await auth();
  if (!user) redirect('/');

  const subscription = await getSubscriptionStatus(user.id);

  return (
    <main className="container max-w-xl py-8 px-4">
      <h1 className="text-xl font-semibold mb-8">Account</h1>
      <AccountContent subscription={subscription} />
    </main>
  );
}
