import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { LoginCredentials, RegisterData, PasswordResetConfirm } from '../types/auth';

/**
 * AuthLoadingContext - Exposes read-only loading state
 * Loading state is managed internally by each auth operation in AuthContext
 * Consumers that only read loading state will re-render when loading changes
 * Consumers that only call operations should use AuthOperationsContext instead
 */
export interface AuthLoadingContextType {
  isLoading: boolean;
}

const AuthLoadingContext = createContext<AuthLoadingContextType | undefined>(undefined);

/**
 * AuthOperationsContext - Exposes stable memoized callback functions
 * Consumers that only call operations won't re-render when loading state changes
 * All callbacks are wrapped in useCallback to preserve identity across renders
 */
export interface AuthOperationsContextType {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ isSuccess: boolean; message: string }>;
  confirmPasswordReset: (
    data: PasswordResetConfirm
  ) => Promise<{ isSuccess: boolean; message: string }>;
}

const AuthOperationsContext = createContext<AuthOperationsContextType | undefined>(undefined);

export { AuthLoadingContext, AuthOperationsContext };

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

  // Memoize loading context - read-only, only depends on isLoading
  // Note: setIsLoading is kept internal for potential future use (e.g., initialization)
  // but is not exposed to consumers. All auth operations manage their own loading state.
  const loadingValue: AuthLoadingContextType = useMemo(
    () => ({
      isLoading,
    }),
    [isLoading]
  );

  // Wrap operations with loading state management
  // Each wrapper sets isLoading before calling the operation and clears it in finally block
  const memoizedLogin = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      try {
        return await login(credentials);
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  const memoizedLogout = useCallback(
    async () => {
      setIsLoading(true);
      try {
        return await logout();
      } finally {
        setIsLoading(false);
      }
    },
    [logout]
  );

  const memoizedRefreshToken = useCallback(
    async () => {
      setIsLoading(true);
      try {
        return await refreshToken();
      } finally {
        setIsLoading(false);
      }
    },
    [refreshToken]
  );

  const memoizedRegister = useCallback(
    async (data: RegisterData) => {
      setIsLoading(true);
      try {
        return await register(data);
      } finally {
        setIsLoading(false);
      }
    },
    [register]
  );

  const memoizedRequestPasswordReset = useCallback(
    async (email: string) => {
      setIsLoading(true);
      try {
        return await requestPasswordReset(email);
      } finally {
        setIsLoading(false);
      }
    },
    [requestPasswordReset]
  );

  const memoizedConfirmPasswordReset = useCallback(
    async (data: PasswordResetConfirm) => {
      setIsLoading(true);
      try {
        return await confirmPasswordReset(data);
      } finally {
        setIsLoading(false);
      }
    },
    [confirmPasswordReset]
  );

  const operationsValue: AuthOperationsContextType = useMemo(
    () => ({
      login: memoizedLogin,
      logout: memoizedLogout,
      refreshToken: memoizedRefreshToken,
      register: memoizedRegister,
      requestPasswordReset: memoizedRequestPasswordReset,
      confirmPasswordReset: memoizedConfirmPasswordReset,
    }),
    [
      memoizedLogin,
      memoizedLogout,
      memoizedRefreshToken,
      memoizedRegister,
      memoizedRequestPasswordReset,
      memoizedConfirmPasswordReset,
    ]
  );

  return (
    <AuthLoadingContext.Provider value={loadingValue}>
      <AuthOperationsContext.Provider value={operationsValue}>
        {children}
      </AuthOperationsContext.Provider>
    </AuthLoadingContext.Provider>
  );
};

export const useAuthLoading = (): AuthLoadingContextType => {
  const context = useContext(AuthLoadingContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error(
        'useAuthLoading called outside AuthStateProvider - component stack:',
        new Error().stack
      );
    }
    throw new Error('useAuthLoading must be used within an AuthStateProvider');
  }
  return context;
};

export const useAuthOperations = (): AuthOperationsContextType => {
  const context = useContext(AuthOperationsContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error(
        'useAuthOperations called outside AuthStateProvider - component stack:',
        new Error().stack
      );
    }
    throw new Error('useAuthOperations must be used within an AuthStateProvider');
  }
  return context;
};

/**
 * Backward compatibility hook - combines both contexts
 * Use useAuthLoading and useAuthOperations separately for better performance
 */
export const useAuthState = (): AuthLoadingContextType & AuthOperationsContextType => {
  const loading = useAuthLoading();
  const operations = useAuthOperations();
  return useMemo(() => ({ ...loading, ...operations }), [loading, operations]);
};
