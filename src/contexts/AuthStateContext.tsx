import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { LoginCredentials, RegisterData, PasswordResetConfirm } from '../types/auth';

/**
 * AuthStateContext - Separated from AuthContext for better performance
 * Handles authentication operations and loading state
 * Only re-renders components that depend on auth operations
 */
export interface AuthStateContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ isSuccess: boolean; message: string }>;
  confirmPasswordReset: (
    data: PasswordResetConfirm
  ) => Promise<{ isSuccess: boolean; message: string }>;
}

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);

export { AuthStateContext };

interface AuthStateProviderProps {
  children: ReactNode;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ isSuccess: boolean; message: string }>;
  confirmPasswordReset: (
    data: PasswordResetConfirm
  ) => Promise<{ isSuccess: boolean; message: string }>;
}

export const AuthStateProvider: React.FC<AuthStateProviderProps> = ({
  children,
  login,
  logout,
  refreshToken,
  register,
  requestPasswordReset,
  confirmPasswordReset,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const value: AuthStateContextType = useMemo(
    () => ({
      isLoading,
      setIsLoading,
      login,
      logout,
      refreshToken,
      register,
      requestPasswordReset,
      confirmPasswordReset,
    }),
    [isLoading, login, logout, refreshToken, register, requestPasswordReset, confirmPasswordReset]
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
};

export const useAuthState = (): AuthStateContextType => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error(
        'useAuthState called outside AuthStateProvider - component stack:',
        new Error().stack
      );
    }
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  return context;
};
