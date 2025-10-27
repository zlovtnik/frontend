import type { AppError } from './errors';

export interface ApiSuccessResponse<T> {
  readonly status: 'success';
  readonly data: T;
  readonly message?: string;
}

export interface ApiErrorResponse {
  readonly status: 'error';
  readonly error: AppError;
  readonly message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface LegacyApiSuccessResponse<T> {
  readonly message: 'ok';
  readonly data: T;
  readonly status?: 'success';
}

export type ApiResponseSuccessLike<T> = ApiSuccessResponse<T> | LegacyApiSuccessResponse<T>;
export type ApiResponseWithLegacy<T> = ApiResponse<T> | LegacyApiSuccessResponse<T>;

export const createSuccessResponse = <T>(data: T, message?: string): ApiSuccessResponse<T> => ({
  status: 'success',
  data,
  message,
});

export const createErrorResponse = (error: AppError, message?: string): ApiErrorResponse => ({
  status: 'error',
  error,
  message,
});

export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> =>
  response.status === 'success';

const isLegacyApiSuccessResponse = <T>(response: ApiResponseWithLegacy<T>): response is LegacyApiSuccessResponse<T> =>
  typeof (response as { message?: unknown }).message === 'string' && (response as { message?: string }).message === 'ok' &&
  'data' in response;

export const isApiResponseSuccess = <T>(
  response: ApiResponseWithLegacy<T>
): response is ApiResponseSuccessLike<T> =>
  isApiSuccess(response as ApiResponse<T>) || isLegacyApiSuccessResponse(response);

export const isApiError = <T>(response: ApiResponse<T>): response is ApiErrorResponse =>
  response.status === 'error';
