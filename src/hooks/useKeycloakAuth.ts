/**
 * @module hooks/useKeycloakAuth
 * @description Keycloak OAuth2/OIDC authentication integration hook
 *
 * Handles the OAuth2 authorization code flow with Keycloak:
 * 1. Initiates login by redirecting to /api/auth/login/keycloak
 * 2. Keycloak redirects back to /api/callback with authorization code
 * 3. Backend exchanges code for tokens and sets secure HttpOnly cookie
 * 4. Frontend processes callback and stores tokens in local storage
 *
 * Uses PKCE for code exchange protection and CSRF token validation.
 */

import { useEffect, useState, useCallback } from 'react';
import { getEnv } from '../config/env';
import { getAuthToken, setAuthToken } from '../services/StorageService';
import type { AuthResponse } from '../types/auth';
import type { AppError } from '../types/errors';
import { createAuthError } from '../types/errors';

interface KeycloakAuthState {
  isLoading: boolean;
  error: AppError | null;
  isCallback: boolean;
}

/**
 * Hook to handle Keycloak OAuth2 authentication flow
 */
export function useKeycloakAuth() {
  const [authState, setAuthState] = useState<KeycloakAuthState>({
    isLoading: false,
    error: null,
    isCallback: false,
  });

  const env = getEnv();

  /**
   * Initiates Keycloak OAuth2 login flow
   * Redirects to /api/auth/login/keycloak which handles the OAuth flow
   */
  const initiateKeycloakLogin = useCallback(async () => {
    try {
      setAuthState({ isLoading: true, error: null, isCallback: false });

      // Redirect to backend OAuth endpoint
      // Backend will:
      // 1. Generate PKCE challenge
      // 2. Store session state (PKCE verifier, CSRF token, nonce) in secure HttpOnly cookie
      // 3. Redirect to Keycloak authorization endpoint
      window.location.href = `${env.apiUrl}/auth/login/keycloak`;
    } catch (error) {
      const appError = createAuthError(
        error instanceof Error ? error.message : 'Failed to initiate Keycloak login',
        { originalError: error },
        { code: 'KEYCLOAK_LOGIN_INIT_FAILED' }
      );
      setAuthState({ isLoading: false, error: appError, isCallback: false });
    }
  }, [env.apiUrl]);

  /**
   * Processes OAuth callback from Keycloak
   * Called after user logs in and Keycloak redirects to /api/callback
   *
   * Backend handles:
   * 1. Validating authorization code
   * 2. Exchanging code for tokens using PKCE verifier
   * 3. Validating CSRF token and nonce
   * 4. Setting secure HttpOnly cookies with tokens
   *
   * This function retrieves any stored authentication state from the callback
   */
  const handleKeycloakCallback = useCallback(async (): Promise<AuthResponse | null> => {
    try {
      setAuthState({ isLoading: true, error: null, isCallback: true });

      // Check if we have token in storage (backend may have set it)
      const storedAuthResult = getAuthToken();
      if (storedAuthResult.isOk()) {
        const storedAuth = storedAuthResult.value;
        if (storedAuth?.token) {
          // Token exists in storage, but we still need full AuthResponse from backend
          // Continue to fetch user info below
        }
      }

      // Attempt to fetch auth state from backend
      // Backend should set secure HttpOnly cookie with tokens
      const response = await fetch(`${env.apiUrl}/auth/user`, {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user info after OAuth callback: ${response.statusText}`
        );
      }

      const authData = await response.json() as unknown;

      // Store the auth data if we got a token
      if (authData && typeof authData === 'object' && 'token' in authData && typeof (authData as { token?: unknown }).token === 'string') {
        const token = (authData as { token: string }).token;
        const setTokenResult = setAuthToken(token);
        if (setTokenResult.isErr()) {
          console.warn('Failed to store token:', setTokenResult.error);
        }
      }

      setAuthState({ isLoading: false, error: null, isCallback: true });
      return authData as AuthResponse | null;
    } catch (error) {
      const appError = createAuthError(
        error instanceof Error ? error.message : 'Failed to process Keycloak callback',
        { originalError: error },
        { code: 'KEYCLOAK_CALLBACK_FAILED' }
      );
      setAuthState({ isLoading: false, error: appError, isCallback: true });
      return null;
    }
  }, [env.apiUrl]);

  /**
   * Check if we're in OAuth callback redirect
   */
  const isKeycloakCallbackPage = useCallback((): boolean => {
    const params = new URLSearchParams(window.location.search);
    // Backend redirects from /api/callback, so we check if this is the path
    return window.location.pathname === '/auth/callback' || params.has('code');
  }, []);

  return {
    ...authState,
    initiateKeycloakLogin,
    handleKeycloakCallback,
    isKeycloakCallbackPage,
    isKeycloakEnabled: env.useKeycloakOAuth,
  };
}

export default useKeycloakAuth;
