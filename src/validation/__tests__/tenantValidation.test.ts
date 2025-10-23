import { issuesToErrors } from '../tenantValidation';
import type { ZodIssue } from 'zod';

describe('issuesToErrors', () => {
  it('should accumulate multiple messages for the same path', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Name must be a string',
      },
      {
        code: 'too_small',
        minimum: 3,
        type: 'string',
        inclusive: true,
        exact: false,
        path: ['name'],
        message: 'Name must be at least 3 characters',
      },
    ];

    const result = issuesToErrors(issues);
    expect(result.name).toContain('Name must be a string');
    expect(result.name).toContain('Name must be at least 3 characters');
    expect(result.name).toContain('; ');
  });

  it('should handle single messages correctly', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['db_url'],
        message: 'Database URL must be a string',
      },
    ];

    const result = issuesToErrors(issues);
    expect(result.db_url).toBe('Database URL must be a string');
  });
});
