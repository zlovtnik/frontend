import { useEffect } from 'react';
import type { FieldValues, UseFormTrigger } from 'react-hook-form';

export interface UseDebouncedValidationParams<T extends FieldValues> {
  trigger: UseFormTrigger<T>;
  /**
   * Values to watch for triggering validation. Pass the output of `watch` or `useWatch`.
   * The hook will re-run whenever this reference changes.
   */
  values: unknown;
  /**
   * Debounce delay in milliseconds. Defaults to 300ms.
   */
  delay?: number;
  /**
   * When false, validation will be skipped.
   */
  shouldValidate?: boolean;
}

/**
 * Triggers react-hook-form validation after a debounce period when the provided values change.
 */
export function useDebouncedValidation<T extends FieldValues>(
  params: UseDebouncedValidationParams<T>
): void {
  const { trigger, values, delay = 300, shouldValidate = true } = params;

  useEffect(() => {
    let timerId: number | undefined;

    if (shouldValidate) {
      timerId = window.setTimeout(() => {
        void trigger();
      }, delay);
    }

    return () => {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
    };
  }, [trigger, delay, shouldValidate, values]);
}
