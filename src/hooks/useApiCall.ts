import { useAsync } from './useAsync';
import type { AsyncResult, Result } from '../types/fp';
import type { AppError, ApiCallError } from '../types/errors';
import { createNetworkError } from '../types/errors';
import { err, ok } from 'neverthrow';

/**
 * Type guard to check if an error is an AppError
 */
function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'type' in error &&
    typeof (error as AppError).type === 'string' &&
    typeof (error as AppError).message === 'string'
  );
}

/**
 * Configuration options for API calls
 */
export interface ApiCallOptions<TIn, EIn, TOut = TIn, EOut = EIn> {
  /** Function to transform the Result before consumers receive it */
  transformResult?: (result: Result<TIn, EIn>) => Result<TOut, EOut>;
  /** Optional mapper for unexpected errors (sync throws, etc.) */
  transformError?: (error: unknown) => EOut;
  /** Function to handle errors automatically */
  onError?: (error: EOut & ApiCallError) => void;
  /** Function to handle success automatically */
  onSuccess?: (data: TOut) => void;
  /** Whether to retry on failure */
  retryOnError?: boolean;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
}

/**
 * Executes an async API request with retry support and Result composition semantics.
 *
 * The hook keeps transport concerns (retry metadata, transient error mapping) outside of
 * the component tree, letting callers focus on handling `Result` values. Automatic retry
 * metadata is attached to errors so the UI can present actionable feedback.
 *
 * @template TIn The raw data type returned by the API function
 * @template EIn The error type returned by the API function
 * @template TOut The transformed success type exposed to consumers
 * @template EOut The transformed error type exposed to consumers
 * @param apiFunction Async function that returns a `ResultAsync`
 * @param options Optional configuration for transforming results and handling retries
 * @returns Async state containing loading status, latest `Result`, and an `execute` trigger
 * @example
 * ```typescript
 * const fetchContacts = useCallback(
 *   () => addressBookService.list(),
 *   []
 * );
 *
 * const { loading, result, execute } = useApiCall(fetchContacts, {
 *   onError: error => notification.error({ message: error.message }),
 *   onSuccess: data => console.log('Loaded', data),
 * });
 *
 * useEffect(() => {
 *   execute();
 * }, [execute]);
 * ```
 */
export function useApiCall<
  TIn,
  EIn extends AppError = AppError,
  TOut = TIn,
  EOut extends AppError = EIn,
>(apiFunction: () => AsyncResult<TIn, EIn>, options: ApiCallOptions<TIn, EIn, TOut, EOut> = {}) {
  const {
    transformResult,
    transformError,
    onError,
    onSuccess,
    retryOnError = false,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  // Helper functions for better code organization
  const totalAttempts = maxRetries + 1;
  const createRetryMetadata = (error: EOut, attempt: number): EOut & ApiCallError => ({
    ...error,
    attemptNumber: attempt,
    maxRetries,
    retryable: retryOnError && attempt < totalAttempts,
  });

  const coerceResult = (result: Result<TIn, EIn>): Result<TOut, EOut> => {
    if (transformResult) {
      return transformResult(result);
    }

    // Type assertion is safe here because we trust the transformResult to handle type conversion
    return result as unknown as Result<TOut, EOut>;
  };

  const mapUnknownError = (error: unknown): EOut => {
    if (transformError) {
      return transformError(error);
    }

    if (isAppError(error)) {
      return error as EOut;
    }

    // Normalize unexpected failures into a network error so consumers can rely on typed errors
    const base = createNetworkError(
      error instanceof Error ? error.message : 'Unexpected request failure',
      undefined,
      {
        cause: error instanceof Error ? error : undefined,
      }
    );

    return base as unknown as EOut;
  };

  const handleSuccess = (data: TOut): Result<TOut, EOut & ApiCallError> => {
    if (onSuccess) {
      onSuccess(data);
    }
    // Type assertion is safe because success data type is already TOut
    return ok(data as TOut & EOut & ApiCallError) as Result<TOut, EOut & ApiCallError>;
  };

  const handleError = (
    error: EOut,
    attempt: number
  ): Result<TOut, EOut & ApiCallError> | null => {
    const enrichedError = createRetryMetadata(error, attempt);

    if (onError) {
      onError(enrichedError);
    }

    // If not retrying or this was the last attempt, return the error
    if (!retryOnError || attempt >= totalAttempts) {
      return err(enrichedError);
    }

    // Continue to retry - return null to indicate retry should happen
    return null;
  };

  const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Processes an error during an API call attempt, determining whether to retry or return.
   * @returns The final error result if no more retries, or null to signal a retry should occur.
   */
  const processAttemptError = async (
    error: EOut,
    attempt: number,
    totalAttempts: number
  ): Promise<Result<TOut, EOut & ApiCallError> | null> => {
    const errorResult = handleError(error, attempt);
    if (errorResult !== null) {
      return errorResult;
    }

    // Wait before retry if more attempts remain
    const hasMoreAttempts = attempt < totalAttempts;
    if (retryDelay > 0 && hasMoreAttempts) {
      await delay(retryDelay);
    }

    return null;
  };

  /**
   * Executes a single API call attempt.
   * @returns Success result, error result (no more retries), or null (should retry).
   */
  const executeAttempt = async (
    attempt: number,
    totalAttempts: number
  ): Promise<Result<TOut, EOut & ApiCallError> | null> => {
    try {
      const rawResult = await apiFunction();
      const finalResult = coerceResult(rawResult);

      if (finalResult.isOk()) {
        return handleSuccess(finalResult.value);
      }

      return processAttemptError(finalResult.error, attempt, totalAttempts);
    } catch (error) {
      const mappedError = mapUnknownError(error);
      return processAttemptError(mappedError, attempt, totalAttempts);
    }
  };

  // Enhanced API function with error handling and retry logic
  const enhancedApiCall = async (): Promise<Result<TOut, EOut & ApiCallError>> => {
    // Total attempts = 1 initial + maxRetries retries
    const totalAttempts = retryOnError ? maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      const attemptResult = await executeAttempt(attempt, totalAttempts);

      if (attemptResult !== null) {
        return attemptResult;
      }
    }

    // Fallback if all retries exhausted without returning (defensive)
    return err(
      createRetryMetadata(
        mapUnknownError(new Error('Request failed without details')),
        totalAttempts
      )
    );
  };

  // Use the useAsync hook with our enhanced API call
  const asyncState = useAsync<TOut, EOut & ApiCallError>(
    () => enhancedApiCall(),
    [] // We don't auto-execute, let the user control execution
  );

  // Return asyncState with the execute method from useAsync
  // This ensures loading/result state updates properly
  return asyncState;
}

/**
 * Creates a typed wrapper hook that pre-binds an API function and forwards optional options.
 *
 * @template TData Success payload type
 * @template TError Error type emitted by the API function
 * @param baseApiFunction Async function to execute when the generated hook runs
 * @returns Hook that can be used directly inside components while still accepting options
 * @example
 * ```typescript
 * const useFetchTenants = createApiCallHook(tenantService.list);
 *
 * export const TenantsPage: React.FC = () => {
 *   const { loading, result, execute } = useFetchTenants();
 *   useEffect(() => {
 *     execute();
 *   }, [execute]);
 *   // ...
 * };
 * ```
 */
export function createApiCallHook<TData, TError extends AppError = AppError>(
  baseApiFunction: () => AsyncResult<TData, TError>
) {
  return (options?: ApiCallOptions<TData, TError>) => useApiCall(baseApiFunction, options);
}
