import { useMemo } from 'react';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import type { Result } from '../types/fp';
import { ok, err } from 'neverthrow';
import type { AuthFlowError, CredentialValidationError, StorageError } from '../types/errors';
import { AuthFlowErrors } from '../types/errors';
import { extractTenantId, extractUserId, type TokenError } from '../domain/auth';
import { validateTenantAccess, type AccessError } from '../domain/tenants';
import type { TenantId } from '../types/ids';
import { getAuthToken } from '../services/StorageService';
import type { LoginCredentials } from '../types/auth';

const mapStorageErrorToAuthFlowError = (error: StorageError): AuthFlowError => {
  switch (error.type) {
    case 'NOT_FOUND':
      return AuthFlowErrors.missingToken();
    case 'PARSE_ERROR':
      return AuthFlowErrors.initFailed(`Stored auth data is invalid: ${error.reason}`);
    case 'STRINGIFY_ERROR':
      return AuthFlowErrors.serverError(500, `Failed to serialize auth data: ${error.reason}`);
    case 'QUOTA_EXCEEDED':
      return AuthFlowErrors.serverError(507, 'Storage quota exceeded for authentication data');
    case 'STORAGE_UNAVAILABLE':
      return AuthFlowErrors.initFailed(`Storage unavailable: ${error.reason}`);
    case 'VERSION_MISMATCH':
      return AuthFlowErrors.initFailed(
        `Storage version mismatch for auth data (expected ${error.expected}, got ${error.got})`
      );
  }
};

const mapTokenErrorToAuthFlowError = (error: TokenError): AuthFlowError => {
  switch (error.type) {
    case 'EXPIRED':
      return AuthFlowErrors.tokenExpired();
    case 'INVALID_FORMAT':
      return AuthFlowErrors.tokenRefreshFailed(`Invalid token format: ${error.reason}`);
    case 'MISSING_CLAIMS':
      return AuthFlowErrors.tokenRefreshFailed(
        `Token missing required claims: ${error.claims.join(', ')}`
      );
    case 'VERIFICATION_FAILED':
      return AuthFlowErrors.tokenRefreshFailed(`Token verification failed: ${error.reason}`);
  }
};

const mapThrownErrorToAuthFlowError = (thrown: unknown): AuthFlowError => {
  if (thrown && typeof thrown === 'object' && 'type' in thrown) {
    const candidate = thrown as { type?: unknown; message?: unknown; statusCode?: unknown };
    
    // Verify that type is one of the known AuthFlowError discriminants
    const validTypes = [
      'INVALID_CREDENTIALS',
      'TOKEN_EXPIRED',
      'TOKEN_REFRESH_FAILED',
      'NETWORK_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'SERVER_ERROR',
      'LOGOUT_FAILED',
      'INIT_FAILED',
      'MISSING_TOKEN',
      'TENANT_MISMATCH',
    ];
    
    if (typeof candidate.type === 'string' && validTypes.includes(candidate.type)) {
      // Validate required fields per discriminant
      if (candidate.type === 'SERVER_ERROR') {
        // SERVER_ERROR requires both statusCode and message
        if (typeof candidate.statusCode === 'number' && typeof candidate.message === 'string') {
          return thrown as AuthFlowError;
        }
      } else if (candidate.type === 'TOKEN_EXPIRED' || candidate.type === 'MISSING_TOKEN') {
        // These discriminants intentionally have no extra fields
        return thrown as AuthFlowError;
      } else {
        // All other discriminants require message
        if (typeof candidate.message === 'string') {
          return thrown as AuthFlowError;
        }
      }
    }
  }

  const message =
    thrown instanceof Error
      ? thrown.message
      : typeof thrown === 'string'
      ? thrown
      : 'Unexpected authentication error';

  return AuthFlowErrors.serverError(500, message);
};

/**
 * Exposes authentication helpers that wrap the context API in `Result`-returning utilities.
 *
 * The hook keeps the original context state intact while providing railway-oriented helpers
 * (e.g., `requireRole`, `requireTenantAccess`) that can be composed without throwing.
 *
 * Note: useAuthContext now returns a safe fallback when called outside AuthProvider,
 * so this hook will always return a valid object (with unauthenticated state as fallback).
 *
 * @returns Auth state plus Result-based helpers for validating auth, roles, and tenant access
 * @example
 * ```typescript
 * const {
 *   isAuthenticated,
 *   requireRole,
 *   requireTenantAccess,
 *   getTenantResult,
 * } = useAuth();
 *
 * const guardResult = requireRole('admin').andThen(() =>
 *   requireTenantAccess(currentTenantId)
 * );
 *
 * if (guardResult.isErr()) {
 *   message.error(guardResult.error.message);
 * }
 * ```
 */
export function useAuth() {
  const auth = useAuthContext();

  const hasErrorProperty = (value: unknown): value is { error: string | null } => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'error' in value &&
      (typeof (value as { error: unknown }).error === 'string' || (value as { error: unknown }).error === null)
    );
  };

  const hasClearErrorProperty = (value: unknown): value is { clearError: () => void } => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'clearError' in value &&
      typeof (value as { clearError?: unknown }).clearError === 'function'
    );
  };

  // Wrap imperative context operations in a memoized Result-based API for composability
  const loginApi = useMemo(() => {
    const isNeverthrowResult = (value: unknown): value is Result<unknown, unknown> => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }

      const candidate = value as { isOk?: unknown; isErr?: unknown };
      return typeof candidate.isOk === 'function' && typeof candidate.isErr === 'function';
    };

    const login = async (
      credentials: LoginCredentials
    ): Promise<Result<void, AuthFlowError | CredentialValidationError>> => {
      try {
        const maybeResult = await auth.login(credentials);

        if (isNeverthrowResult(maybeResult)) {
          // Validate or document that auth.login always returns Result<void, AuthFlowError | CredentialValidationError>
          return maybeResult as Result<void, AuthFlowError | CredentialValidationError>;
        }

        // Document: auth.login is expected to return Result or throw; any other return value is treated as success
        // Consider: if (maybeResult === false) return err(...) to handle explicit failure values
        return ok(undefined);
      } catch (error) {
        return err(mapThrownErrorToAuthFlowError(error));
      }
    };

    return {
      login,
    };
  }, [auth.login]);
  const requireAuthResult = (): Result<boolean, AuthFlowError> => {
    if (auth.isAuthenticated) {
      return ok(true);
    }
    return err(AuthFlowErrors.unauthorized('User is not authenticated'));
  };

  const ensureAuthenticated = (): Result<void, AuthFlowError> =>
    requireAuthResult().map(() => undefined);

  const getUserResult = (): Result<NonNullable<typeof auth.user>, AuthFlowError> => {
    if (auth.user) {
      return ok(auth.user);
    }
    return err(AuthFlowErrors.unauthorized('User context is unavailable'));
  };

  const getTenantResult = (): Result<NonNullable<typeof auth.tenant>, AuthFlowError> => {
    if (auth.tenant) {
      return ok(auth.tenant);
    }
    return err(AuthFlowErrors.unauthorized('Tenant context is unavailable'));
  };

  const getTokenResult = (): Result<string, AuthFlowError> =>
    getAuthToken()
      .map(stored => stored.token)
      .mapErr(mapStorageErrorToAuthFlowError);

  const getTenantIdFromToken = (): Result<string, AuthFlowError> =>
    getTokenResult().andThen(token =>
      extractTenantId(token).mapErr(mapTokenErrorToAuthFlowError)
    );

  const getUserIdFromToken = (): Result<string, AuthFlowError> =>
    getTokenResult().andThen(token =>
      extractUserId(token).mapErr(mapTokenErrorToAuthFlowError)
    );

  const requireRole = (role: string): Result<void, AuthFlowError> =>
    getUserResult().andThen(user =>
      user.roles.includes(role)
        ? ok(undefined)
        : err(AuthFlowErrors.forbidden(`Missing required role: ${role}`))
    );

  const requireAnyRole = (roles: string[]): Result<void, AuthFlowError> =>
    getUserResult().andThen(user =>
      roles.some(role => user.roles.includes(role))
        ? ok(undefined)
        : err(AuthFlowErrors.forbidden(`User lacks required roles: ${roles.join(', ')}`))
    );

  const requireAllRoles = (roles: string[]): Result<void, AuthFlowError> =>
    getUserResult().andThen(user =>
      roles.every(role => user.roles.includes(role))
        ? ok(undefined)
        : err(AuthFlowErrors.forbidden(`User must have roles: ${roles.join(', ')}`))
    );

  const requireTenantAccess = (
    tenantId: TenantId
  ): Result<void, AuthFlowError | AccessError> =>
    getUserResult().andThen(user => validateTenantAccess(user, tenantId));

  const error = hasErrorProperty(auth) ? auth.error : null;
  const clearError = hasClearErrorProperty(auth) ? auth.clearError : () => undefined;

  return {
    // Original auth state
    user: auth.user,
    tenant: auth.tenant,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error,
    clearError,
    logout: auth.logout,
    refreshToken: auth.refreshToken,
    requireAuth: requireAuthResult,
    ensureAuthenticated,
    getUserResult,
    getTenantResult,
    getTokenResult,
    getTenantIdFromToken,
    getUserIdFromToken,
    requireRole,
    requireAnyRole,
    requireAllRoles,
    requireTenantAccess,

    // Result-based API (spread last to ensure these override)
    ...loginApi,
  };
}
