import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Tenant } from '../types/auth';

/**
 * TenantContext - Separated from AuthContext for better performance
 * Only re-renders components that depend on tenant data
 */
export interface TenantContextType {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
}

// TenantContext is kept private to enforce hook-based access via useTenant
const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const value: TenantContextType = useMemo(
    () => ({
      tenant,
      setTenant,
    }),
    [tenant, setTenant]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error(
        'useTenant called outside TenantProvider - component stack:',
        new Error().stack
      );
    }
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
