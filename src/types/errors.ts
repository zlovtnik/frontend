export const API_ERROR_TYPES = {
  Network: 'NETWORK_ERROR',
  Timeout: 'TIMEOUT_ERROR',
  Validation: 'VALIDATION_ERROR',
  Authentication: 'AUTH_ERROR',
  Authorization: 'FORBIDDEN_ERROR',
  NotFound: 'NOT_FOUND',
  Server: 'SERVER_ERROR',
  Tenant: 'TENANT_ERROR',
} as const;

export type ApiErrorType = (typeof API_ERROR_TYPES)[keyof typeof API_ERROR_TYPES];

export interface BaseError {
  readonly type: ApiErrorType;
  readonly message: string;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
  readonly retryable?: boolean;
  readonly statusCode?: number;
  /**
   * Identifier supplied by the upstream service (for example an `X-Request-Id` header)
   * that can be used to correlate logs and support tickets. Populate this for
   * errors originating from HTTP/API calls when the header is available; leave
   * undefined for client-only or synthetic errors where no server correlation ID exists.
   */
  readonly requestId?: string;
}

export interface ValidationError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Validation;
}

export interface ValidationErrorDetails {
  readonly issues?: unknown[];
  readonly [key: string]: unknown;
}

export interface TypedValidationError extends Omit<ValidationError, 'details'> {
  readonly details?: ValidationErrorDetails;
}

export interface NetworkError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Network;
}

export interface TimeoutError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Timeout;
}

export interface AuthError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Authentication;
}

export interface ForbiddenError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Authorization;
}

export interface NotFoundError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.NotFound;
}

export interface ServerError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Server;
}

export interface TenantError extends BaseError {
  readonly type: typeof API_ERROR_TYPES.Tenant;
}

export type AppError =
  | TypedValidationError
  | NetworkError
  | TimeoutError
  | AuthError
  | ForbiddenError
  | NotFoundError
  | ServerError
  | TenantError;

export const isValidationError = (error: AppError): error is TypedValidationError =>
  error.type === API_ERROR_TYPES.Validation;

export const isNetworkError = (error: AppError): error is NetworkError =>
  error.type === API_ERROR_TYPES.Network;

export const isTimeoutError = (error: AppError): error is TimeoutError =>
  error.type === API_ERROR_TYPES.Timeout;

export const isAuthError = (error: AppError): error is AuthError =>
  error.type === API_ERROR_TYPES.Authentication;

export const isForbiddenError = (error: AppError): error is ForbiddenError =>
  error.type === API_ERROR_TYPES.Authorization;

export const isNotFoundError = (error: AppError): error is NotFoundError =>
  error.type === API_ERROR_TYPES.NotFound;

export const isServerError = (error: AppError): error is ServerError =>
  error.type === API_ERROR_TYPES.Server;

export const isTenantError = (error: AppError): error is TenantError =>
  error.type === API_ERROR_TYPES.Tenant;

/** @internal Options consumed by the error factory helpers. */
interface ErrorFactoryOptions {
  code?: string;
  cause?: unknown;
  statusCode?: number;
  retryable?: boolean;
  requestId?: string;
  details?: Record<string, unknown>;
}

const createBaseError = <Type extends ApiErrorType>(
  type: Type,
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
) =>
  ({
    type,
    message,
    details,
    code: options?.code,
    cause: options?.cause,
    statusCode: options?.statusCode,
    retryable: options?.retryable,
    requestId: options?.requestId,
  }) as BaseError & { type: Type };

export const createValidationError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): TypedValidationError =>
  createBaseError(API_ERROR_TYPES.Validation, message, details, {
    ...options,
    retryable: options?.retryable ?? false,
  }) as TypedValidationError;

export const createNetworkError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): NetworkError =>
  createBaseError(API_ERROR_TYPES.Network, message, details, {
    ...options,
    retryable: options?.retryable ?? true,
  }) as NetworkError;

export const createTimeoutError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): TimeoutError =>
  createBaseError(API_ERROR_TYPES.Timeout, message, details, {
    ...options,
    retryable: options?.retryable ?? true,
  }) as TimeoutError;

export const createAuthError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): AuthError =>
  createBaseError(API_ERROR_TYPES.Authentication, message, details, {
    ...options,
    retryable: options?.retryable ?? false,
  }) as AuthError;

export const createForbiddenError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): ForbiddenError =>
  createBaseError(API_ERROR_TYPES.Authorization, message, details, {
    ...options,
    retryable: options?.retryable ?? false,
  }) as ForbiddenError;

export const createNotFoundError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): NotFoundError =>
  createBaseError(API_ERROR_TYPES.NotFound, message, details, {
    ...options,
    retryable: options?.retryable ?? false,
  }) as NotFoundError;

export const createServerError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): ServerError =>
  createBaseError(API_ERROR_TYPES.Server, message, details, {
    ...options,
    retryable: options?.retryable ?? true,
  }) as ServerError;

export const createTenantError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): TenantError =>
  createBaseError(API_ERROR_TYPES.Tenant, message, details, {
    ...options,
    retryable: options?.retryable ?? false,
  }) as TenantError;

/**
 * @deprecated Use createServerError instead. Will be removed in v2.0.0.
 */
export const createBusinessLogicError = (
  message: string,
  details?: Record<string, unknown>,
  options?: ErrorFactoryOptions
): ServerError => createServerError(message, details, options);

/**
 * Backwards-compatible alias for server errors.
 */
export type BusinessLogicError = ServerError;

/**
 * Backwards-compatible alias for authorization errors.
 */
export type AuthorizationError = ForbiddenError;

/**
 * Storage-related errors for FP patterns
 */
export type StorageError =
  | { type: 'NOT_FOUND'; key: string }
  | { type: 'PARSE_ERROR'; key: string; reason: string }
  | { type: 'STRINGIFY_ERROR'; key: string; reason: string }
  | { type: 'QUOTA_EXCEEDED'; key: string }
  | { type: 'STORAGE_UNAVAILABLE'; reason: string }
  | { type: 'VERSION_MISMATCH'; key: string; expected: number; got: number };

/**
 * Parse-related errors for JSON and JWT parsing
 */
export type ParseError =
  | { type: 'INVALID_JSON'; raw: string; reason: string }
  | { type: 'INVALID_JWT_FORMAT'; token: string }
  | { type: 'MISSING_JWT_FIELDS'; fields: string[] }
  | { type: 'EXPIRED_TOKEN'; exp: number; now: number }
  | { type: 'INVALID_USER_STRUCTURE'; reason: string }
  | { type: 'INVALID_TENANT_STRUCTURE'; reason: string };

/**
 * API call specific errors for retry logic and enhanced error handling
 */
export interface ApiCallError {
  readonly attemptNumber?: number;
  readonly maxRetries?: number;
  readonly retryable?: boolean;
}

/**
 * Validation errors for credentials (discriminated unions)
 */
export type CredentialValidationError =
  | { type: 'EMPTY_USERNAME' }
  | { type: 'USERNAME_TOO_SHORT'; min: number; actual: number }
  | { type: 'USERNAME_TOO_LONG'; max: number; actual: number }
  | { type: 'INVALID_USERNAME_FORMAT'; pattern: string }
  | { type: 'EMPTY_PASSWORD' }
  | { type: 'PASSWORD_TOO_SHORT'; min: number; actual: number }
  | { type: 'PASSWORD_TOO_WEAK'; requirements: string[] }
  | { type: 'EMPTY_TENANT_ID' }
  | { type: 'INVALID_TENANT_ID_FORMAT'; pattern: string }
  | { type: 'INVALID_EMAIL_FORMAT'; email: string };

/**
 * Authentication-related errors for FP patterns
 */
export type AuthFlowError =
  | { type: 'INVALID_CREDENTIALS'; message: string }
  | { type: 'TOKEN_EXPIRED' }
  | { type: 'TOKEN_REFRESH_FAILED'; reason: string }
  | { type: 'NETWORK_ERROR'; statusCode?: number; message: string }
  | { type: 'UNAUTHORIZED'; message: string }
  | { type: 'FORBIDDEN'; message: string }
  | { type: 'SERVER_ERROR'; statusCode: number; message: string }
  | { type: 'LOGOUT_FAILED'; reason: string }
  | { type: 'INIT_FAILED'; reason: string }
  | { type: 'MISSING_TOKEN' }
  | { type: 'TENANT_MISMATCH'; expected: string; actual: string };

/**
 * Helper functions to create error instances
 */
export const StorageErrors = {
  notFound: (key: string): StorageError => ({ type: 'NOT_FOUND', key }),
  parseError: (key: string, reason: string): StorageError => ({ type: 'PARSE_ERROR', key, reason }),
  stringifyError: (key: string, reason: string): StorageError => ({
    type: 'STRINGIFY_ERROR',
    key,
    reason,
  }),
  quotaExceeded: (key: string): StorageError => ({ type: 'QUOTA_EXCEEDED', key }),
  unavailable: (reason: string): StorageError => ({ type: 'STORAGE_UNAVAILABLE', reason }),
  versionMismatch: (key: string, expected: number, got: number): StorageError => ({
    type: 'VERSION_MISMATCH',
    key,
    expected,
    got,
  }),
};

export const ParseErrors = {
  invalidJson: (raw: string, reason: string): ParseError => ({ type: 'INVALID_JSON', raw, reason }),
  invalidJwtFormat: (token: string): ParseError => ({ type: 'INVALID_JWT_FORMAT', token }),
  missingJwtFields: (fields: string[]): ParseError => ({ type: 'MISSING_JWT_FIELDS', fields }),
  expiredToken: (exp: number, now: number): ParseError => ({ type: 'EXPIRED_TOKEN', exp, now }),
  invalidUserStructure: (reason: string): ParseError => ({
    type: 'INVALID_USER_STRUCTURE',
    reason,
  }),
  invalidTenantStructure: (reason: string): ParseError => ({
    type: 'INVALID_TENANT_STRUCTURE',
    reason,
  }),
};

/**
 * Type guard to check if an unknown error is a ParseError
 * Use this instead of string literal checks for type safety
 */
export function isParseError(error: unknown): error is ParseError {
  if (!error || typeof error !== 'object') return false;
  const e = error as { type?: string };
  return (
    e.type === 'INVALID_JSON' ||
    e.type === 'INVALID_JWT_FORMAT' ||
    e.type === 'MISSING_JWT_FIELDS' ||
    e.type === 'EXPIRED_TOKEN' ||
    e.type === 'INVALID_USER_STRUCTURE' ||
    e.type === 'INVALID_TENANT_STRUCTURE'
  );
}

export const ValidationErrors = {
  emptyUsername: (): CredentialValidationError => ({ type: 'EMPTY_USERNAME' }),
  usernameTooShort: (min: number, actual: number): CredentialValidationError => ({
    type: 'USERNAME_TOO_SHORT',
    min,
    actual,
  }),
  usernameTooLong: (max: number, actual: number): CredentialValidationError => ({
    type: 'USERNAME_TOO_LONG',
    max,
    actual,
  }),
  invalidUsernameFormat: (pattern: string): CredentialValidationError => ({
    type: 'INVALID_USERNAME_FORMAT',
    pattern,
  }),
  emptyPassword: (): CredentialValidationError => ({ type: 'EMPTY_PASSWORD' }),
  passwordTooShort: (min: number, actual: number): CredentialValidationError => ({
    type: 'PASSWORD_TOO_SHORT',
    min,
    actual,
  }),
  passwordTooWeak: (requirements: string[]): CredentialValidationError => ({
    type: 'PASSWORD_TOO_WEAK',
    requirements,
  }),
  emptyTenantId: (): CredentialValidationError => ({ type: 'EMPTY_TENANT_ID' }),
  invalidTenantIdFormat: (pattern: string): CredentialValidationError => ({
    type: 'INVALID_TENANT_ID_FORMAT',
    pattern,
  }),
  invalidEmailFormat: (email: string): CredentialValidationError => ({
    type: 'INVALID_EMAIL_FORMAT',
    email,
  }),
};

export const AuthFlowErrors = {
  invalidCredentials: (message: string): AuthFlowError => ({
    type: 'INVALID_CREDENTIALS',
    message,
  }),
  tokenExpired: (): AuthFlowError => ({ type: 'TOKEN_EXPIRED' }),
  tokenRefreshFailed: (reason: string): AuthFlowError => ({ type: 'TOKEN_REFRESH_FAILED', reason }),
  networkError: (message: string, statusCode?: number): AuthFlowError => ({
    type: 'NETWORK_ERROR',
    statusCode,
    message,
  }),
  unauthorized: (message: string): AuthFlowError => ({ type: 'UNAUTHORIZED', message }),
  forbidden: (message: string): AuthFlowError => ({ type: 'FORBIDDEN', message }),
  serverError: (statusCode: number, message: string): AuthFlowError => ({
    type: 'SERVER_ERROR',
    statusCode,
    message,
  }),
  logoutFailed: (reason: string): AuthFlowError => ({ type: 'LOGOUT_FAILED', reason }),
  initFailed: (reason: string): AuthFlowError => ({ type: 'INIT_FAILED', reason }),
  missingToken: (): AuthFlowError => ({ type: 'MISSING_TOKEN' }),
  tenantMismatch: (expected: string, actual: string): AuthFlowError => ({
    type: 'TENANT_MISMATCH',
    expected,
    actual,
  }),
};

/**
 * Error formatting utilities for FP patterns
 */
export const formatStorageError = (error: StorageError): string => {
  switch (error.type) {
    case 'NOT_FOUND':
      return `Storage key not found: ${error.key}`;
    case 'PARSE_ERROR':
      return `Failed to parse stored data for '${error.key}': ${error.reason}`;
    case 'STRINGIFY_ERROR':
      return `Failed to stringify data for '${error.key}': ${error.reason}`;
    case 'QUOTA_EXCEEDED':
      return `Storage quota exceeded for key: ${error.key}`;
    case 'STORAGE_UNAVAILABLE':
      return `Storage unavailable: ${error.reason}`;
    case 'VERSION_MISMATCH':
      return `Storage version mismatch for '${error.key}': expected ${error.expected}, got ${error.got}`;
  }
};

export const formatParseError = (error: ParseError): string => {
  switch (error.type) {
    case 'INVALID_JSON':
      return `Invalid JSON: ${error.reason}`;
    case 'INVALID_JWT_FORMAT':
      return 'Invalid JWT token format';
    case 'MISSING_JWT_FIELDS':
      return `Missing required JWT fields: ${error.fields.join(', ')}`;
    case 'EXPIRED_TOKEN':
      return `Token expired at ${new Date(error.exp * 1000).toISOString()}`;
    case 'INVALID_USER_STRUCTURE':
      return `Invalid user data structure: ${error.reason}`;
    case 'INVALID_TENANT_STRUCTURE':
      return `Invalid tenant data structure: ${error.reason}`;
  }
};

export const formatCredentialValidationError = (error: CredentialValidationError): string => {
  switch (error.type) {
    case 'EMPTY_USERNAME':
      return 'Username cannot be empty';
    case 'USERNAME_TOO_SHORT':
      return `Username must be at least ${error.min} characters (got ${error.actual})`;
    case 'USERNAME_TOO_LONG':
      return `Username must be at most ${error.max} characters (got ${error.actual})`;
    case 'INVALID_USERNAME_FORMAT':
      return `Username format is invalid (expected: ${error.pattern})`;
    case 'EMPTY_PASSWORD':
      return 'Password cannot be empty';
    case 'PASSWORD_TOO_SHORT':
      return `Password must be at least ${error.min} characters (got ${error.actual})`;
    case 'PASSWORD_TOO_WEAK':
      return `Password must meet requirements: ${error.requirements.join(', ')}`;
    case 'EMPTY_TENANT_ID':
      return 'Tenant ID cannot be empty';
    case 'INVALID_TENANT_ID_FORMAT':
      return `Tenant ID format is invalid (expected: ${error.pattern})`;
    case 'INVALID_EMAIL_FORMAT':
      return `Invalid email format: ${error.email}`;
  }
};

export const formatAuthFlowError = (error: AuthFlowError): string => {
  switch (error.type) {
    case 'INVALID_CREDENTIALS':
      return error.message || 'Invalid username or password';
    case 'TOKEN_EXPIRED':
      return 'Your session has expired. Please log in again';
    case 'TOKEN_REFRESH_FAILED':
      return `Failed to refresh token: ${error.reason}`;
    case 'NETWORK_ERROR':
      return `Network error: ${error.message}${error.statusCode ? ` (${error.statusCode})` : ''}`;
    case 'UNAUTHORIZED':
      return error.message || 'Unauthorized access';
    case 'FORBIDDEN':
      return error.message || 'Access forbidden';
    case 'SERVER_ERROR':
      return `Server error (${error.statusCode}): ${error.message}`;
    case 'LOGOUT_FAILED':
      return `Logout failed: ${error.reason}`;
    case 'INIT_FAILED':
      return `Authentication initialization failed: ${error.reason}`;
    case 'MISSING_TOKEN':
      return 'Authentication token is missing';
    case 'TENANT_MISMATCH':
      return `Tenant mismatch: expected '${error.expected}', got '${error.actual}'`;
  }
};
