import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/api';
import type {
  User,
  Tenant,
  LoginCredentials,
  RegisterData,
  PasswordResetConfirm,
  AuthResponse,
} from '../types/auth';
import { asTenantId, asUserId } from '../types/ids';
import { verifyToken } from '../domain/auth';

export interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ isSuccess: boolean; message: string }>;
  confirmPasswordReset: (
    data: PasswordResetConfirm
  ) => Promise<{ isSuccess: boolean; message: string }>;
  // JWT Authentication Integration with backend API
  // - Real authentication endpoints integration with existing Actix Web backend
  // - JWT token storage and automatic Authorization header inclusion
  // - Robust error handling with proper logout on auth failures
}

interface JwtPayload {
  user: string;
  tenant_id: string;
  exp: number;
  iat?: number;
  [key: string]: unknown;
}

// JWT decoding utility
const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      throw new Error('Invalid JWT format');
    }
    const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decoded) as JwtPayload;

    // Validate required fields
    if (!payload.user || !payload.tenant_id || typeof payload.exp !== 'number') {
      throw new Error('Invalid JWT payload structure');
    }

    return payload;
  } catch (error) {
    return null;
  }
};

// Validation helper functions
const validateUser = (user: any): user is User => {
  return (
    user &&
    typeof user.id === 'string' &&
    user.id.trim() !== '' &&
    typeof user.email === 'string' &&
    user.email.trim() !== '' &&
    typeof user.username === 'string' &&
    user.username.trim() !== '' &&
    Array.isArray(user.roles) &&
    user.roles.every((role: unknown) => typeof role === 'string')
  );
};

const validateTenant = (tenant: any): tenant is Tenant => {
  return (
    tenant &&
    typeof tenant.id === 'string' &&
    tenant.id.trim() !== '' &&
    typeof tenant.name === 'string' &&
    tenant.name.trim() !== '' &&
    typeof tenant.settings === 'object' &&
    tenant.settings !== null
  );
};

// Helper to attempt token refresh and validate/construct user and tenant objects
const attemptTokenRefresh = async (
  storedUser: string,
  storedTenant: string,
  signal?: AbortSignal
): Promise<{ user: User; tenant: Tenant; token: string } | null> => {
  try {
    if (signal?.aborted) {
      return null;
    }

    const refreshResult = await authService.refreshToken();
    if (refreshResult.isErr()) {
      return null;
    }

    const refreshedAuth = refreshResult.value;
    if (!refreshedAuth.success) {
      return null;
    }

    const newToken = refreshedAuth.token;
    if (!newToken) {
      return null;
    }

    if (signal?.aborted) {
      return null;
    }

    const newPayload = decodeJwtPayload(newToken);
    if (!newPayload || typeof newPayload !== 'object') {
      return null;
    }

    if (!newPayload.user?.trim() || !newPayload.tenant_id?.trim()) {
      return null;
    }

    let refreshedUser: User | null = refreshedAuth.user ?? null;
    let refreshedTenant: Tenant | null = refreshedAuth.tenant ?? null;

    if (refreshedUser) {
      refreshedUser = {
        ...refreshedUser,
        username: newPayload.user,
        tenantId: asTenantId(newPayload.tenant_id),
      };
    }

    if (refreshedTenant) {
      refreshedTenant = {
        ...refreshedTenant,
        id: asTenantId(newPayload.tenant_id),
      };
    }

    if (!refreshedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (
          parsedUser &&
          typeof parsedUser === 'object' &&
          typeof parsedUser.id === 'string' &&
          parsedUser.id.trim() !== '' &&
          typeof parsedUser.email === 'string' &&
          parsedUser.email.trim() !== '' &&
          typeof parsedUser.username === 'string' &&
          parsedUser.username.trim() !== '' &&
          Array.isArray(parsedUser.roles) &&
          parsedUser.roles.every((role: unknown) => typeof role === 'string')
        ) {
          refreshedUser = {
            ...parsedUser,
            id: asUserId(newPayload.user),
            username: newPayload.user,
            tenantId: asTenantId(newPayload.tenant_id),
          };
        }
      } catch (parseError) {
        if (import.meta.env.DEV) {
          console.debug('AuthContext: Failed to parse stored user data', parseError);
        }
      }
    }

    if (!refreshedTenant) {
      try {
        const parsedTenant = JSON.parse(storedTenant);
        if (
          parsedTenant &&
          typeof parsedTenant === 'object' &&
          typeof parsedTenant.id === 'string' &&
          parsedTenant.id.trim() !== '' &&
          typeof parsedTenant.name === 'string' &&
          parsedTenant.name.trim() !== '' &&
          typeof parsedTenant.settings === 'object' &&
          parsedTenant.settings !== null
        ) {
          refreshedTenant = {
            ...parsedTenant,
            id: asTenantId(newPayload.tenant_id),
          } as Tenant;
        }
      } catch (parseError) {
        if (import.meta.env.DEV) {
          console.debug('AuthContext: Failed to parse stored tenant data', parseError);
        }
      }
    }

    if (refreshedUser && refreshedTenant) {
      return { user: refreshedUser, tenant: refreshedTenant, token: newToken };
    } else {
      return null;
    }
  } catch (refreshError) {
    if (signal?.aborted) {
      return null;
    }
    return null;
  }
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context for testing purposes
export { AuthContext };

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = React.useRef(true);

  // In a multi-tenant system, authentication requires both user and tenant
  const isAuthenticated = !!user && !!tenant;

  // Initialize auth state by validating stored token and data
  useEffect(() => {
    const abortController = new AbortController();

    const initAuth = async () => {
      try {
        // First check for localStorage data (traditional login)
        const storedTokenData = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');
        const storedTenant = localStorage.getItem('tenant');

        // Also check for OAuth cookie-based authentication
        const hasStoredData = storedTokenData && storedUser && storedTenant;
        const isOAuthCallbackRoute = window.location.pathname === '/auth/callback';

        if (import.meta.env.DEV) {
          console.log('AuthContext init:', {
            pathname: window.location.pathname,
            hasStoredData,
            isOAuthCallbackRoute,
          });
        }

        if (hasStoredData) {
          // Parse token data and extract JWT token
          let token: string;
          try {
            const tokenObj = JSON.parse(storedTokenData);
            token = tokenObj?.token;
            if (!token || typeof token !== 'string') {
              throw new Error('Invalid token data structure');
            }
          } catch {
            // Fallback for legacy plain string format (for backward compatibility)
            token = storedTokenData;
          }

          // Decode and validate the JWT token
          const tokenPayload = decodeJwtPayload(token);
          if (!tokenPayload) {
            throw new Error('Invalid stored token');
          }

          // Check if token is expired
          const now = Math.floor(Date.now() / 1000);
          if (tokenPayload.exp && tokenPayload.exp < now) {
            const result = await attemptTokenRefresh(
              storedUser,
              storedTenant,
              abortController.signal
            );
            if (result && !abortController.signal.aborted) {
              if (!abortController.signal.aborted) {
                localStorage.setItem('auth_token', JSON.stringify({ token: result.token }));
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('tenant', JSON.stringify(result.tenant));
              }
              if (isMountedRef.current && !abortController.signal.aborted) {
                setUser(result.user);
                setTenant(result.tenant);
              }
            } else if (!abortController.signal.aborted) {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
              localStorage.removeItem('tenant');
            }
            return;
          } else {
            // Validate stored user and tenant data structure
            const parsedUser = JSON.parse(storedUser) as User;
            const parsedTenant = JSON.parse(storedTenant) as Tenant;

            const isValidUser =
              parsedUser &&
              typeof parsedUser.id === 'string' &&
              parsedUser.id.trim() !== '' &&
              typeof parsedUser.email === 'string' &&
              parsedUser.email.trim() !== '' &&
              typeof parsedUser.username === 'string' &&
              parsedUser.username.trim() !== '' &&
              Array.isArray(parsedUser.roles) &&
              parsedUser.roles.every((role: unknown) => typeof role === 'string');

            const isValidTenant =
              parsedTenant &&
              typeof parsedTenant.id === 'string' &&
              parsedTenant.id.trim() !== '' &&
              typeof parsedTenant.name === 'string' &&
              parsedTenant.name.trim() !== '' &&
              typeof parsedTenant.settings === 'object' &&
              parsedTenant.settings !== null;

            if (isValidUser && isValidTenant) {
              // Cross-reference with token payload if possible
              const tokenUsername = tokenPayload.user;
              const tokenTenantId = tokenPayload.tenant_id;

              if (parsedUser.username === tokenUsername && parsedTenant.id === tokenTenantId) {
                if (isMountedRef.current && !abortController.signal.aborted) {
                  setUser(parsedUser);
                  setTenant(parsedTenant);
                }
              } else if (!abortController.signal.aborted) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                localStorage.removeItem('tenant');
              }
            } else if (!abortController.signal.aborted) {
              // Invalid data structure, clear stored data
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
              localStorage.removeItem('tenant');
            }
          }
        } else if (isOAuthCallbackRoute) {
          // No localStorage data found, check for OAuth cookie authentication
          // This handles the case where OAuth callback has completed but AuthContext hasn't updated yet
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/user`, {
              method: 'GET',
              credentials: 'include',
              signal: abortController.signal,
            });

            if (response.ok) {
              const authData = (await response.json()) as AuthResponse;

              if (authData.success && authData.user && authData.tenant && authData.token) {
                // Validate the JWT token before storing
                const tokenValidation = verifyToken(authData.token);

                if (tokenValidation.isOk() && isMountedRef.current && !abortController.signal.aborted) {
                  // Validate user and tenant data before storing and setting
                  if (validateUser(authData.user) && validateTenant(authData.tenant)) {
                    // Store in localStorage for future use and update context
                    localStorage.setItem('auth_token', JSON.stringify({ token: authData.token }));
                    localStorage.setItem('user', JSON.stringify(authData.user));
                    localStorage.setItem('tenant', JSON.stringify(authData.tenant));

                    setUser(authData.user);
                    setTenant(authData.tenant);
                  } else {
                    // Validation failed - clear any existing auth data and log error
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('tenant');
                    if (import.meta.env.DEV) {
                      console.error('AuthContext: OAuth user/tenant validation failed');
                    }
                  }
                }
                // If token is invalid or aborted, skip storing and handling
              }
            }
          } catch (oauthCheckError) {
            // OAuth check failed, continue with unauthenticated state
            if (import.meta.env.DEV) {
              console.debug('OAuth cookie check failed:', oauthCheckError);
            }
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          // Authentication initialization failed - clear all auth data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('tenant');
        }
      } finally {
        if (isMountedRef.current && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      abortController.abort();
      isMountedRef.current = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      // Use "tenant1" for demo purposes, as hardcoded in backend when tenant is missing
      const tenantId = credentials.tenantId ?? asTenantId('tenant1');
      const modifiedCredentials: LoginCredentials = { ...credentials, tenantId };
      const loginResult = await authService.login(modifiedCredentials);

      if (loginResult.isErr()) {
        throw new Error(loginResult.error.message || 'Login failed');
      }

      const authPayload = loginResult.value;

      if (!authPayload.success) {
        throw new Error(authPayload.message ?? 'Login failed');
      }

      const token = authPayload.token;
      if (!token) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('auth_token', JSON.stringify({ token }));

      const tokenPayload = decodeJwtPayload(token);
      if (!tokenPayload) {
        throw new Error('Invalid token format');
      }

      if (!tokenPayload.user || !tokenPayload.tenant_id) {
        throw new Error('Required fields missing in token');
      }

      const tenantIdentifier = asTenantId(tokenPayload.tenant_id);

      const user: User = {
        ...authPayload.user,
        username: tokenPayload.user,
        tenantId: tenantIdentifier,
      };

      const tenant: Tenant = {
        ...authPayload.tenant,
        id: tenantIdentifier,
      };

      setUser(user);
      setTenant(tenant);

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenant', JSON.stringify(tenant));
    } catch (error: unknown) {
      // Clear any partial data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');

      // Re-throw with the actual error message from the server
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      // Always clear local data regardless of API call success
      setUser(null);
      setTenant(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const refreshResult = await authService.refreshToken();

      if (refreshResult.isErr()) {
        const error = refreshResult.error;

        if (error.statusCode === 401 || error.statusCode === 403) {
          await logout();
          throw new Error('Authentication expired');
        }

        throw new Error('Token refresh failed - please check your connection');
      }

      const refreshResponse = refreshResult.value;

      if (!refreshResponse.success) {
        throw new Error(refreshResponse.message || 'Token refresh failed');
      }

      const newToken = refreshResponse.token;
      if (!newToken) {
        throw new Error('No token received from server during refresh');
      }

      localStorage.setItem('auth_token', JSON.stringify({ token: newToken }));
      const payload = decodeJwtPayload(newToken);
      if (!payload?.user || !payload.tenant_id) {
        throw new Error('Invalid token payload during refresh');
      }

      const refreshedTenantId = asTenantId(payload.tenant_id);

      const updatedUser: User = {
        ...refreshResponse.user,
        username: payload.user,
        tenantId: refreshedTenantId,
      };

      const updatedTenant: Tenant = {
        ...refreshResponse.tenant,
        id: refreshedTenantId,
      };

      setUser(updatedUser);
      setTenant(updatedTenant);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('tenant', JSON.stringify(updatedTenant));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication expired') {
          throw error;
        }

        throw error;
      }

      throw new Error('Token refresh failed');
    }
  }, [logout]);

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const registerResult = await authService.register(data);

      if (registerResult.isErr()) {
        throw new Error(registerResult.error.message || 'Registration failed');
      }

      const authPayload = registerResult.value;

      if (!authPayload.success) {
        throw new Error(authPayload.message ?? 'Registration failed');
      }

      const token = authPayload.token;
      if (!token) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('auth_token', JSON.stringify({ token }));

      const tokenPayload = decodeJwtPayload(token);
      if (!tokenPayload) {
        throw new Error('Invalid token format');
      }

      if (!tokenPayload.user || !tokenPayload.tenant_id) {
        throw new Error('Required fields missing in token');
      }

      const tenantIdentifier = asTenantId(tokenPayload.tenant_id);

      const user: User = {
        ...authPayload.user,
        username: tokenPayload.user,
        tenantId: tenantIdentifier,
      };

      const tenant: Tenant = {
        ...authPayload.tenant,
        id: tenantIdentifier,
      };

      setUser(user);
      setTenant(tenant);

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenant', JSON.stringify(tenant));
    } catch (error: unknown) {
      // Clear any partial data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');

      // Re-throw with the actual error message from the server
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ isSuccess: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const resetResult = await authService.requestPasswordReset(email);

      if (resetResult.isErr()) {
        throw new Error(resetResult.error.message || 'Password reset request failed');
      }

      const response = resetResult.value;

      if (response.status === 'error') {
        throw new Error(response.error.message || 'Password reset request failed');
      }

      return {
        isSuccess: true,
        message: response.message ?? 'Password reset email sent successfully',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          isSuccess: false,
          message: error.message,
        };
      }

      return {
        isSuccess: false,
        message: 'Password reset request failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (
    data: PasswordResetConfirm
  ): Promise<{ isSuccess: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const resetResult = await authService.confirmPasswordReset(data);

      if (resetResult.isErr()) {
        throw new Error(resetResult.error.message || 'Password reset confirmation failed');
      }

      const response = resetResult.value;

      if (response.status === 'error') {
        throw new Error(response.error.message || 'Password reset confirmation failed');
      }

      return {
        isSuccess: true,
        message: response.message ?? 'Password reset successfully completed',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          isSuccess: false,
          message: error.message,
        };
      }

      return {
        isSuccess: false,
        message: 'Password reset confirmation failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tenant,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshToken,
      register,
      requestPasswordReset,
      confirmPasswordReset,
    }),
    [
      user,
      tenant,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshToken,
      register,
      requestPasswordReset,
      confirmPasswordReset,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error('useAuth called outside AuthProvider - component stack:', new Error().stack);
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
