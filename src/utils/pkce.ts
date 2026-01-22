/**
 * @module utils/pkce
 * @description PKCE (Proof Key for Code Exchange) utilities for OAuth2 authentication
 *
 * Implements RFC 7636 - Proof Key for Code Exchange by OAuth Public Clients
 * https://datatracker.ietf.org/doc/html/rfc7636
 *
 * PKCE Flow:
 * 1. Generate a cryptographically random code_verifier (43-128 chars)
 * 2. Create code_challenge = BASE64URL(SHA256(code_verifier))
 * 3. Send code_challenge in authorization request
 * 4. Send code_verifier in token exchange request
 */

// Storage keys for PKCE state
const PKCE_STORAGE_KEY = 'oauth_pkce_state';

export interface PKCEState {
  codeVerifier: string;
  codeChallenge: string;
  state: string; // CSRF protection
  nonce: string; // Replay attack prevention
  createdAt: number; // Timestamp for expiration check
}

/**
 * Generate a cryptographically random string for PKCE
 * Uses Web Crypto API for secure random generation
 *
 * @param length - Length of the string (43-128 for code_verifier per RFC 7636)
 * @returns URL-safe random string
 */
function generateRandomString(length: number = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Base64url encoding (URL-safe alphabet without padding)
  return btoa(String.fromCodePoint(...array))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
    .substring(0, length);
}

/**
 * Generate SHA-256 hash using Web Crypto API
 *
 * @param message - String to hash
 * @returns Base64url-encoded hash
 */
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert ArrayBuffer to Base64url
  const hashArray = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCodePoint(...hashArray));

  // Base64url encoding (URL-safe alphabet without padding)
  return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/**
 * Generate PKCE code_verifier and code_challenge
 *
 * Per RFC 7636:
 * - code_verifier: 43-128 character random string
 * - code_challenge: BASE64URL(SHA256(code_verifier)) for S256 method
 *
 * @returns PKCE parameters
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate code_verifier (64 chars is a good balance of security and size)
  const codeVerifier = generateRandomString(64);

  // Generate code_challenge using S256 method (SHA-256)
  const codeChallenge = await sha256(codeVerifier);

  return { codeVerifier, codeChallenge };
}

/**
 * Generate a CSRF state token
 * Used to prevent cross-site request forgery attacks
 *
 * @returns Random state string
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Generate a nonce for ID token validation
 * Used to prevent replay attacks
 *
 * @returns Random nonce string
 */
export function generateNonce(): string {
  return generateRandomString(32);
}

/**
 * Store PKCE state in sessionStorage
 * Using sessionStorage ensures state is cleared when browser tab closes
 *
 * @param state - PKCE state to store
 */
export function storePKCEState(state: PKCEState): void {
  try {
    sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to store PKCE state:', error);
    throw new Error('Failed to store OAuth state. Please enable sessionStorage.');
  }
}

/**
 * Retrieve and validate stored PKCE state
 * Automatically clears state after retrieval (one-time use)
 *
 * @param maxAgeMs - Maximum age of state in milliseconds (default: 10 minutes)
 * @returns PKCE state or null if not found/expired
 */
export function retrievePKCEState(maxAgeMs: number = 10 * 60 * 1000): PKCEState | null {
  try {
    const stored = sessionStorage.getItem(PKCE_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    // Clear state immediately (one-time use)
    sessionStorage.removeItem(PKCE_STORAGE_KEY);

    const state = JSON.parse(stored) as PKCEState;

    // Validate state has required fields
    if (!state.codeVerifier || !state.state || !state.nonce || !state.createdAt) {
      console.warn('Invalid PKCE state structure');
      return null;
    }

    // Check expiration
    const age = Date.now() - state.createdAt;
    if (age > maxAgeMs) {
      console.warn('PKCE state expired');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to retrieve PKCE state:', error);
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
    return null;
  }
}

/**
 * Clear any stored PKCE state
 * Useful for cleanup on logout or error recovery
 */
export function clearPKCEState(): void {
  try {
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
  } catch {
    // Ignore errors when clearing
  }
}

/**
 * Validate that the returned state matches the stored state
 * This prevents CSRF attacks
 *
 * Uses constant-time comparison to prevent timing attacks.
 * The comparison iterates over the maximum length and folds the
 * length difference into the result to avoid early exits.
 *
 * @param returnedState - State parameter from OAuth callback
 * @param storedState - State from stored PKCE state
 * @returns True if states match
 */
export function validateState(returnedState: string, storedState: string): boolean {
  if (!returnedState || !storedState) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  // Fold length difference into result instead of early return
  let result = returnedState.length ^ storedState.length;
  const maxLen = Math.max(returnedState.length, storedState.length);

  for (let i = 0; i < maxLen; i++) {
    result |= (returnedState.codePointAt(i) ?? 0) ^ (storedState.codePointAt(i) ?? 0);
  }

  return result === 0;
}

/**
 * Build OAuth2 authorization URL with PKCE parameters
 *
 * @param params - Authorization URL parameters
 * @returns Complete authorization URL
 */
export function buildAuthorizationUrl(params: {
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  nonce: string;
  scope?: string;
  /** Optional custom authorization endpoint URL. If not provided, defaults to Keycloak's OIDC path. */
  authEndpoint?: string;
}): string {
  const {
    issuerUrl,
    clientId,
    redirectUri,
    codeChallenge,
    state,
    nonce,
    scope = 'openid profile email',
    authEndpoint: customAuthEndpoint,
  } = params;

  // Use custom endpoint if provided, otherwise default to Keycloak's OIDC authorization path.
  // Note: The default is Keycloak-specific. For other OIDC providers, pass a custom authEndpoint
  // or implement OpenID Connect discovery to fetch the authorization_endpoint from issuerUrl.
  const authEndpoint = customAuthEndpoint ?? `${issuerUrl}/protocol/openid-connect/auth`;

  const urlParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${authEndpoint}?${urlParams.toString()}`;
}

/**
 * Generate complete PKCE state and build authorization URL
 * Convenience function that combines generation and URL building
 *
 * @param params - OAuth configuration
 * @returns Authorization URL and stored state
 */
export async function initiatePKCEFlow(params: {
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  /** Optional custom authorization endpoint URL. Defaults to Keycloak's OIDC path if not provided. */
  authEndpoint?: string;
}): Promise<{
  authorizationUrl: string;
  state: PKCEState;
}> {
  // Generate PKCE challenge
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Generate state (CSRF) and nonce (replay prevention)
  const stateToken = generateState();
  const nonce = generateNonce();

  // Create complete PKCE state
  const pkceState: PKCEState = {
    codeVerifier,
    codeChallenge,
    state: stateToken,
    nonce,
    createdAt: Date.now(),
  };

  // Store state in sessionStorage
  storePKCEState(pkceState);

  // Build authorization URL
  const authorizationUrl = buildAuthorizationUrl({
    issuerUrl: params.issuerUrl,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge,
    state: stateToken,
    nonce,
    scope: params.scope,
    authEndpoint: params.authEndpoint,
  });

  return { authorizationUrl, state: pkceState };
}
