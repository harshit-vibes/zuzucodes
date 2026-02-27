'use client';

import { createContext, useContext } from 'react';

const SubscriptionContext = createContext<{ isPaid: boolean }>({ isPaid: false });

export function SubscriptionProvider({
  children,
  isPaid,
}: {
  children: React.ReactNode;
  isPaid: boolean;
}) {
  return (
    <SubscriptionContext.Provider value={{ isPaid }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
