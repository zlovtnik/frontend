/**
 * @module hooks/useKeycloakAuth
 * @description Keycloak OAuth2/OIDC authentication integration hook
 *
 * Handles the OAuth2 authorization code flow with PKCE (RFC 7636):
 * 1. Frontend generates PKCE code_verifier and code_challenge
 * 2. Frontend stores code_verifier in sessionStorage
 * 3. Frontend redirects to Keycloak with code_challenge
 * 4. After callback, frontend sends code + code_verifier to stateless backend
 * 5. Backend exchanges code + code_verifier with Keycloak for tokens
 *
 * This implements a fully stateless backend architecture where all OAuth state
 * is managed on the frontend using PKCE for security.
 */

import { useState, useCallback } from 'react';
import { getEnv } from '../config/env';
import { setAuthToken, storageService, StorageKey } from '../services/StorageService';
import type { AuthResponse, User, Tenant } from '../types/auth';
import type { AppError } from '../types/errors';
import { createAuthError } from '../types/errors';
import { asTenantId, asUserId } from '../types/ids';
import {
  initiatePKCEFlow,
  retrievePKCEState,
  validateState,
  clearPKCEState,
  type PKCEState,
} from '../utils/pkce';
import { createDefaultTenant } from '../config/tenantDefaults';

interface KeycloakAuthState {
  isLoading: boolean;
  error: AppError | null;
  isCallback: boolean;
}

/**
 * Token exchange request payload for stateless backend
 */
interface TokenExchangeRequest {
  code: string;
  code_verifier: string;
  nonce?: string;
  redirect_uri: string;
  state?: string;
  session_state?: string;
}

/**
 * Validates the auth response structure from the backend
 */
function isValidAuthResponse(data: unknown): data is AuthResponse {
  return (
    data !== null &&
    typeof data === 'object' &&
    'success' in data &&
    (data as AuthResponse).success === true &&
    'token' in data &&
    typeof (data as AuthResponse).token === 'string'
  );
}

/**
 * JWT payload structure from Keycloak/backend tokens
 */
interface JwtPayload {
  user?: string;
  sub?: string;
  email?: string;
  preferred_username?: string;
  tenant_id?: string;
  tenantId?: string;
  roles?: string[];
  realm_access?: { roles?: string[] };
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decode JWT payload without verification (for extracting claims)
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }
    // Normalize base64url to standard base64
    let base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    // Add padding if needed (base64 strings must have length divisible by 4)
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const decoded = atob(base64);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract user and tenant from JWT token when backend doesn't provide them
 */
function extractUserAndTenantFromToken(token: string): { user: User | null; tenant: Tenant | null } {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    console.warn('Failed to decode JWT token');
    return { user: null, tenant: null };
  }

  if (import.meta.env.DEV) {
    // Only log non-sensitive fields in development
    console.log('JWT payload (sanitized):', {
      hasEmail: !!payload.email,
      hasSub: !!payload.sub,
      hasTenantId: !!(payload.tenant_id ?? payload.tenantId),
      hasRoles: !!(payload.roles ?? payload.realm_access?.roles),
      exp: payload.exp,
      iat: payload.iat,
    });
  }

  // Extract user ID - try multiple possible claim names
  const userId = payload.sub ?? payload.user ?? payload.preferred_username ?? '';
  const username = payload.preferred_username ?? payload.user ?? payload.sub ?? 'user';
  // Use a clearly-invalid placeholder email when not provided by token
  // This avoids fabricating a valid-looking email that could break downstream validation
  const email = payload.email ?? 'no-email@invalid.local';

  // Extract roles - try Keycloak format first, then direct roles
  let roles: string[] = [];
  if (payload.realm_access?.roles) {
    roles = payload.realm_access.roles;
  } else if (Array.isArray(payload.roles)) {
    roles = payload.roles;
  } else {
    roles = ['user'];
  }

  // Extract tenant ID
  const tenantId = payload.tenant_id ?? payload.tenantId ?? 'default';
  const now = new Date().toISOString();

  const user: User = {
    id: asUserId(userId),
    email,
    username,
    roles,
    tenantId: asTenantId(tenantId),
    createdAt: now,
    updatedAt: now,
  };

  // Use shared default tenant configuration
  const tenant: Tenant = createDefaultTenant(asTenantId(tenantId), tenantId);

  if (import.meta.env.DEV) {
    // Log sanitized info in development only
    console.log('Extracted user:', { id: user.id, hasEmail: !!user.email, roles: user.roles });
    console.log('Extracted tenant:', { id: tenant.id, name: tenant.name });
  }

  return { user, tenant };
}

/**
 * Stores all authentication data in localStorage
 * Required for AuthContext to recognize the authenticated session
 */
function storeAuthData(authData: AuthResponse): void {
  console.log('storeAuthData: Storing auth data...', {
    hasToken: !!authData.token,
    hasUser: !!authData.user,
    hasTenant: !!authData.tenant,
    hasRefreshToken: !!authData.refreshToken,
  });

  // Store the auth token
  const setTokenResult = setAuthToken(authData.token);
  if (setTokenResult.isErr()) {
    console.warn('Failed to store token:', setTokenResult.error);
  }

  // If user/tenant not provided, extract from JWT token
  const extracted = extractUserAndTenantFromToken(authData.token);
  const user = authData.user ?? extracted.user;
  const tenant = authData.tenant ?? extracted.tenant;

  // Store user data
  if (user) {
    storageService.set(StorageKey.USER, user);
    console.log('storeAuthData: User stored');
  }

  // Store tenant data
  if (tenant) {
    storageService.set(StorageKey.TENANT, tenant);
    console.log('storeAuthData: Tenant stored');
  }

  // Store refresh token if provided
  if (authData.refreshToken) {
    storageService.set(StorageKey.REFRESH_TOKEN, { token: authData.refreshToken });
  }

  // Verify storage using storageService for consistency (dev-only)
  if (import.meta.env.DEV) {
    console.log('storeAuthData: Verification:', {
      tokenStored: storageService.get(StorageKey.AUTH_TOKEN).isOk(),
      userStored: storageService.get(StorageKey.USER).isOk(),
      tenantStored: storageService.get(StorageKey.TENANT).isOk(),
    });
  }
}

/**
 * Extracts and validates OAuth callback parameters from the URL
 */
function extractCallbackParams(): {
  code: string;
  returnedState: string | null;
  sessionState: string | null;
} {
  const params = new URLSearchParams(globalThis.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const sessionState = params.get('session_state');

  if (!code) {
    throw new Error('No authorization code found in callback URL');
  }

  return { code, returnedState, sessionState };
}

/**
 * Validates and retrieves PKCE state, performing CSRF validation
 */
function validatePKCEState(returnedState: string | null): PKCEState {
  // Retrieve PKCE state from sessionStorage (one-time use)
  const pkceState = retrievePKCEState();

  if (!pkceState) {
    throw new Error(
      'OAuth session expired or not found. Please try logging in again. ' +
        'This can happen if you waited too long or opened the login in a different tab.'
    );
  }

  // Validate state parameter (CSRF protection) - reject if missing or mismatched
  if (!returnedState || !validateState(returnedState, pkceState.state)) {
    throw new Error(
      'Invalid or missing state parameter. This may indicate a CSRF attack or session mismatch. ' +
        'Please try logging in again.'
    );
  }

  return pkceState;
}

/**
 * Hook to handle Keycloak OAuth2 authentication flow with frontend PKCE
 *
 * Implements a stateless backend architecture where:
 * - Frontend manages PKCE state (code_verifier stored in sessionStorage)
 * - Frontend generates code_challenge for authorization URL
 * - Frontend sends code_verifier to backend for token exchange
 * - Backend is stateless and only forwards to Keycloak
 */
export function useKeycloakAuth() {
  const [authState, setAuthState] = useState<KeycloakAuthState>({
    isLoading: false,
    error: null,
    isCallback: false,
  });

  const env = getEnv();

  /**
   * Initiates Keycloak OAuth2 login flow with PKCE
   *
   * Flow:
   * 1. Generate PKCE code_verifier (random 64-char string)
   * 2. Generate code_challenge = BASE64URL(SHA256(code_verifier))
   * 3. Generate state (CSRF) and nonce (replay prevention)
   * 4. Store all in sessionStorage
   * 5. Redirect to Keycloak authorization endpoint with code_challenge
   */
  const initiateKeycloakLogin = useCallback(async () => {
    try {
      setAuthState({ isLoading: true, error: null, isCallback: false });

      // Validate required Keycloak configuration
      if (!env.keycloakIssuerUrl || !env.keycloakClientId || !env.keycloakRedirectUrl) {
        throw new Error(
          'Keycloak configuration is incomplete. Please check VITE_KEYCLOAK_ISSUER_URL, ' +
            'VITE_KEYCLOAK_CLIENT_ID, and VITE_KEYCLOAK_REDIRECT_URL environment variables.'
        );
      }

      // Generate PKCE challenge, state, and nonce
      // This stores everything in sessionStorage automatically
      const { authorizationUrl } = await initiatePKCEFlow({
        issuerUrl: env.keycloakIssuerUrl,
        clientId: env.keycloakClientId,
        redirectUri: env.keycloakRedirectUrl,
        scope: 'openid profile email',
      });

      // Redirect to Keycloak authorization endpoint
      // Keycloak will authenticate the user and redirect back with an authorization code
      globalThis.location.href = authorizationUrl;
    } catch (error) {
      const appError = createAuthError(
        error instanceof Error ? error.message : 'Failed to initiate Keycloak login',
        { originalError: error },
        { code: 'KEYCLOAK_LOGIN_INIT_FAILED' }
      );
      setAuthState({ isLoading: false, error: appError, isCallback: false });
    }
  }, [env.keycloakIssuerUrl, env.keycloakClientId, env.keycloakRedirectUrl]);

  /**
   * Processes OAuth callback from Keycloak with PKCE verification
   *
   * Flow:
   * 1. Extract authorization code and state from URL parameters
   * 2. Retrieve stored PKCE state from sessionStorage
   * 3. Validate state parameter matches (CSRF protection)
   * 4. Send code + code_verifier + nonce to backend for token exchange
   * 5. Backend sends both to Keycloak and returns tokens
   * 6. Store tokens and return auth data
   */
  const handleKeycloakCallback = useCallback(async (): Promise<AuthResponse | null> => {
    try {
      setAuthState({ isLoading: true, error: null, isCallback: true });

      // Extract and validate callback parameters
      const { code, returnedState, sessionState } = extractCallbackParams();

      // Validate PKCE state and CSRF token
      const pkceState = validatePKCEState(returnedState);

      // Validate redirect_uri is configured before sending token request
      if (!env.keycloakRedirectUrl) {
        throw new Error(
          'Keycloak redirect URL is not configured. Please check VITE_KEYCLOAK_REDIRECT_URL environment variable.'
        );
      }

      // Build token exchange request with PKCE code_verifier
      const tokenRequest: TokenExchangeRequest = {
        code,
        code_verifier: pkceState.codeVerifier,
        nonce: pkceState.nonce,
        redirect_uri: env.keycloakRedirectUrl,
        state: returnedState || undefined,
        session_state: sessionState || undefined,
      };

      // Send code + code_verifier to backend for token exchange
      const response = await fetch(`${env.apiUrl}/auth/callback/keycloak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(tokenRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { message?: string; detail?: string }).message ||
          (errorData as { message?: string; detail?: string }).detail ||
          `Token exchange failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const authData = await response.json();
      if (import.meta.env.DEV) {
        // Log sanitized response - redact sensitive tokens
        console.log('handleKeycloakCallback: Backend response:', {
          success: authData?.success,
          hasToken: !!authData?.token,
          hasUser: !!authData?.user,
          hasTenant: !!authData?.tenant,
          hasRefreshToken: !!authData?.refreshToken,
        });
      }

      if (!isValidAuthResponse(authData)) {
        console.error('handleKeycloakCallback: Invalid response structure:', authData);
        throw new Error('Invalid auth response from server');
      }

      // Store all auth data in localStorage for AuthContext
      storeAuthData(authData);

      // Clean up URL by removing OAuth params
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);

      setAuthState({ isLoading: false, error: null, isCallback: true });
      return authData;
    } catch (error) {
      // Clear any remaining PKCE state on error
      clearPKCEState();

      const appError = createAuthError(
        error instanceof Error ? error.message : 'Failed to process Keycloak callback',
        { originalError: error },
        { code: 'KEYCLOAK_CALLBACK_FAILED' }
      );
      setAuthState({ isLoading: false, error: appError, isCallback: true });
      return null;
    }
  }, [env.apiUrl, env.keycloakRedirectUrl]);

  /**
   * Check if we're in OAuth callback redirect
   * Requires both code and state query params to avoid false positives,
   * and validates the pathname ends with /auth/callback (supports subpaths).
   */
  const isKeycloakCallbackPage = useCallback((): boolean => {
    const params = new URLSearchParams(globalThis.location.search);
    const hasRequiredParams = params.has('code') && params.has('state');
    const isCallbackPath = globalThis.location.pathname.endsWith('/auth/callback');
    return isCallbackPath && hasRequiredParams;
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
