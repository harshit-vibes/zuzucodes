'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface TenantContext {
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLogo: string | null;
  isTenant: true;
}

export interface NoTenantContext {
  orgId: null;
  orgSlug: null;
  orgName: null;
  orgLogo: null;
  isTenant: false;
}

export type TenantContextType = TenantContext | NoTenantContext;

const TenantCtx = createContext<TenantContextType>({
  orgId: null,
  orgSlug: null,
  orgName: null,
  orgLogo: null,
  isTenant: false,
});

interface TenantProviderProps {
  children: ReactNode;
  org?: {
    id: string;
    slug: string | null;
    name: string;
    logo_url: string | null;
  } | null;
}

export function TenantProvider({ children, org }: TenantProviderProps) {
  const value: TenantContextType =
    org && org.slug
      ? {
          orgId: org.id,
          orgSlug: org.slug,
          orgName: org.name,
          orgLogo: org.logo_url,
          isTenant: true,
        }
      : {
          orgId: null,
          orgSlug: null,
          orgName: null,
          orgLogo: null,
          isTenant: false,
        };

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

/**
 * Hook to access tenant context
 */
export function useTenant(): TenantContextType {
  return useContext(TenantCtx);
}

/**
 * Hook that throws if not in a tenant context
 */
export function useRequiredTenant(): TenantContext {
  const ctx = useContext(TenantCtx);
  if (!ctx.isTenant) {
    throw new Error('useRequiredTenant must be used within a tenant context');
  }
  return ctx;
}
