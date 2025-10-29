import { useEffect } from 'react';

/**
 * Warns the user before leaving the page when there are unsaved changes.
 *
 * @param isDirty Whether the form has unsaved changes.
 */
export function useWarnOnUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [isDirty]);
}
