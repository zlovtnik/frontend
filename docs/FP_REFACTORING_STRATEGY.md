# Functional Programming (FP) Refactoring Strategy

## Overview

This document outlines the strategy for migrating the frontend codebase from imperative error handling patterns to Railway-Oriented Programming (ROP) using `neverthrow` and discriminated union types.

**Status**: Phase 1 Complete - Foundation laid, Feature Flags Implemented, Ready for Gradual Migration

## Architecture

### Existing FP Foundation ✅

The following are already implemented using FP patterns:

- **api.ts**: HttpClient with AsyncResult, retry logic, circuit breaker
- **auth.ts**: Authorization validation with Result types
- **validation/**: Zod schemas with FP validation pipelines
- **services/**: TenantIsolationService with Result-based error handling

### New FP Components

#### 1. **AuthContextFP** - FP-based Authentication
- Location: `src/contexts/AuthContextFP.tsx`
- Replaces imperative AuthContext with discriminated union state
- All async operations return AsyncResult<T, AppError>
- No try-catch blocks in user-facing code

**State Shape:**
```typescript
type AuthStateFP =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'authenticated'; user: User; tenant: Tenant; token: string }
  | { type: 'error'; error: AppError; previousState?: ... };
```

**Usage:**
```typescript
const { state, login, logout } = useAuthFP();

// Pattern match on state
state.match({
  idle: () => <LoginPage />,
  loading: () => <Spinner />,
  authenticated: ({ user }) => <Dashboard />,
  error: ({ error }) => <ErrorAlert error={error} />,
});

// Use Result-based operations
const result = await login(credentials);
result.match(
  (response) => console.log('Success!', response),
  (error) => console.error('Failed:', error.message)
);
```

#### 2. **Feature Flags** - Gradual Migration
- Location: `src/config/featureFlags.ts`
- Enables running both old and new implementations in parallel
- Environment variables: `VITE_USE_FP_AUTH`, `VITE_USE_FP_SERVICES`, `VITE_USE_FP_HOOKS`
- Runtime updates via localStorage for testing

**Available Flags:**
```typescript
interface FeatureFlags {
  useFPAuth: boolean;           // Use AuthContextFP instead of AuthContext
  useFPServices: boolean;       // Use FP patterns in service layer
  useFPHooks: boolean;          // Use FP patterns in React hooks
  verboseFPLogging: boolean;    // Enable debug logging
}
```

**Usage:**
```typescript
import { isFeatureEnabled, updateFeatureFlags } from '@/config/featureFlags';

if (isFeatureEnabled('useFPAuth')) {
  // Use FP implementation
} else {
  // Use traditional implementation
}

// Enable at runtime for testing
updateFeatureFlags({ useFPAuth: true });
```

#### 3. **useAuthAdapter Hook** - Unified Interface
- Location: `src/hooks/useAuthAdapter.ts`
- Provides uniform interface regardless of which auth implementation is active
- Automatically switches between old and new based on feature flags
- Zero API change for components

**Usage:**
```typescript
import { useAuthAdapter } from '@/hooks/useAuthAdapter';

const { state, operations } = useAuthAdapter();

// Same interface works with both implementations
if (state.isLoading) return <Spinner />;
if (!state.isAuthenticated) return <LoginPage onLogin={operations.login} />;
return <Dashboard user={state.user} />;
```

### Feature Flag Wiring Patterns

#### 1. Canonical Adapter Pattern

Always import and export both implementations, choosing between them via the flag to keep both code paths compiled and discoverable:

```typescript
// src/adapters/authAdapter.ts
import { AuthContext, useAuth } from '@/contexts/AuthContext';
import { AuthContextFP, useAuthFP } from '@/contexts/AuthContextFP';
import { isFeatureEnabled } from '@/config/featureFlags';

// Export both implementations
export { AuthContext, AuthContextFP };

// Adapter hook that delegates to the appropriate implementation
export const useAuthAdapter = () => {
  const useFP = isFeatureEnabled('useFPAuth');
  
  if (useFP) {
    return useAuthFP();
  } else {
    return useAuth();
  }
};

// Provider component that delegates to the appropriate implementation
export const AuthProviderAdapter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useFP = isFeatureEnabled('useFPAuth');
  
  if (useFP) {
    return <AuthContextFP.Provider value={/* FP context value */}>{children}</AuthContextFP.Provider>;
  } else {
    return <AuthContext.Provider value={/* traditional context value */}>{children}</AuthContext.Provider>;
  }
};
```

#### 2. Consistent Naming and API Shapes

Prescribe consistent naming and exported shapes for FP vs legacy APIs to avoid drift:

```typescript
// Legacy: use descriptive suffixes
export const useAuth = () => { /* traditional implementation */ };
export const AuthContext = createContext<TraditionalAuthContextType>(/* ... */);

// FP: use FP suffix/prefix
export const useAuthFP = () => { /* FP implementation */ };
export const AuthContextFP = createContext<FPAuthContextType>(/* ... */);

// Adapters: use Adapter suffix
export const useAuthAdapter = () => { /* unified interface */ };
export const AuthProviderAdapter = () => { /* unified provider */ };
```

#### 3. Runtime Flag Change Semantics

Document runtime flag-change semantics to ensure consistent behavior:

- Components automatically re-render when feature flags change
- Recommend preserving internal state by using a stable adapter/provider that delegates rather than unmounting implementations
- Explicitly reset state if desired when flags change

```typescript
// src/config/featureFlags.ts
import { useEffect, useState } from 'react';

// Stable flag management with change notifications
export const useFeatureFlags = () => {
  const [flags, setFlags] = useState(getCurrentFlags());
  
  useEffect(() => {
    const handleFlagChange = () => {
      setFlags(getCurrentFlags());
    };
    
    // Listen for flag changes (localStorage, remote config, etc.)
    window.addEventListener('featureFlagsChanged', handleFlagChange);
    return () => window.removeEventListener('featureFlagsChanged', handleFlagChange);
  }, []);
  
  return flags;
};

// Stable adapter that preserves state across flag changes
export const useStableAuthAdapter = () => {
  const flags = useFeatureFlags();
  
  // Preserve state references even when implementation changes
  const traditionalState = useAuth();
  const fpState = useAuthFP();
  
  // Return appropriate state based on current flags
  return flags.useFPAuth ? fpState : traditionalState;
};
```

#### 4. Runtime Diagnostics and Testing

Add runtime diagnostics and tests to exercise both branches:

```typescript
// src/config/featureFlags.ts

// Verbose logging for debugging
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  const enabled = getCurrentFlags()[flag];
  
  if (getCurrentFlags().verboseFPLogging) {
    console.log(`[FeatureFlag] ${flag}: ${enabled}`);
  }
  
  return enabled;
};

// Integration tests that exercise both branches
// src/__tests__/featureFlags.test.ts
describe('Feature Flags', () => {
  test.each([
    { flag: false, name: 'Traditional Implementation' },
    { flag: true, name: 'FP Implementation' },
  ])('$name - authentication flow works', async ({ flag }) => {
    // Set flag
    updateFeatureFlags({ useFPAuth: flag });
    
    // Test authentication flow
    const { result } = renderHook(() => useAuthAdapter());
    
    // Assert consistent behavior regardless of implementation
    expect(result.current.isAuthenticated).toBe(false);
    
    await act(async () => {
      await result.current.login(validCredentials);
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });
});
```

## Migration Strategy

### Phase 1: Foundation & Gradual Migration (Complete ✅)

**What's Done:**
- ✅ Created AuthContextFP with discriminated union state
- ✅ Implemented feature flags system
- ✅ Created useAuthAdapter for gradual component migration
- ✅ All tests passing (701 pass/0 fail)
- ✅ No breaking changes (backward compatible)

**How to Use:**
1. Components can optionally use `useAuthAdapter` instead of `useAuth`
2. Enable feature flags to test new implementation: `VITE_USE_FP_AUTH=true`
3. Traditional code continues working unchanged

### Phase 2: Gradual Component Migration

**Next Steps:**
1. Update high-value components to use `useAuthAdapter`
2. Test both implementations in parallel
3. Incrementally move components to FP patterns
4. Monitor test coverage and error rates

**Prioritization:**
```
1. LoginPage (most critical, highest impact)
2. PrivateRoute (fundamental routing logic)
3. Layout/Navigation components
4. Dashboard & main pages
5. Modal components
6. Forms & validation
```

### Phase 3: Service Layer Migration

**Scope:**
- Migrate service layer hooks (useAsync, useFetch) to FP patterns
- Convert component error handling to use Result types instead of exceptions
- Implement comprehensive form validation using Zod + Result patterns

**High Priority Hooks/Services:**
1. `useAsync` → `useAsyncFP` with proper Result handling
2. `useFetch` → `useFetchFP` with error recovery patterns
3. `useForm` → `useFormFP` with Zod validation
4. `useApi` → `useApiFP` with AsyncResult return types

**Rollout Cadence:**
- Week 1: Implement FP versions of core hooks
- Week 2: Migrate 3-5 high-traffic components
- Week 3: Expand to remaining components
- Week 4: Verify all error paths use Result types

**Verification of Result Types Usage:**
- Code scanning for try/catch blocks outside of designated wrappers
- ESLint rules to prevent direct Promise usage in components
- Type checking to ensure all async operations return AsyncResult<T, E>
- Test coverage for error paths in all migrated components

**Risk Mitigation:**
- Maintain backward compatibility with adapter pattern
- Gradual rollout with feature flags
- Comprehensive error boundary implementation
- Performance monitoring during migration

### Phase 4: Complete & Document

**Acceptance Criteria:**
- ✅ 100% of new features use FP patterns
- ✅ 90%+ of existing code migrated to FP
- ✅ Zero production incidents during migration
- ✅ Team demonstrates proficiency in FP patterns
- ✅ Error rate remains ≤ baseline or improves
- ✅ Performance metrics stable or improved

**Completion Steps:**
- Remove feature flags (all components using FP)
- Update documentation and examples
- Performance metrics and optimization
- Create comprehensive migration guide
- Conduct team knowledge transfer sessions
- Establish FP best practices committee

**Risk Mitigation:**
- Staged flag removal with rollback capability
- Extensive testing before final deployment
- Monitoring dashboard for error rates
- Performance benchmarking against baseline
- Team training and certification program

## Patterns & Best Practices

### 1. Railway-Oriented Programming

**Imperative (Old Pattern):**
```typescript
try {
  const user = await fetchUser(id);
  const tenant = await fetchTenant(user.tenantId);
  return { user, tenant };
} catch (error) {
  console.error('Failed:', error);
  throw error;
}
```

**FP Pattern (New):**
```typescript
const result = await fetchUser(id)
  .andThen((user) => fetchTenant(user.tenantId)
    .map((tenant) => ({ user, tenant }))
  );

result.match(
  ({ user, tenant }) => console.log('Success'),
  (error) => console.error('Failed:', error.message)
);
```

### 2. State Machines with Discriminated Unions

**Imperative (Old Pattern):**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [user, setUser] = useState<User | null>(null);
// Problem: Can represent invalid states (loading + user both true)
```

**FP Pattern (New):**
```typescript
type State =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; user: User }
  | { type: 'error'; error: Error };

// Impossible to represent invalid states
```

### 3. Async Result Patterns

**Error Handling:**
```typescript
// FP pattern - all errors are values, not exceptions
async function login(creds: Credentials): AsyncResult<User, AuthError> {
  return authService.login(creds)
    .andThen((response) => validateResponse(response))
    .andThen((validated) => storeAuth(validated))
    .map(({ user }) => user);
}

// Usage
const result = await login(credentials);
result.match(
  (user) => { /* success path */ },
  (error) => { /* error path */ }
);
```

## Testing Strategy

### Unit Tests

Test Result type handling:
```typescript
import { describe, it, expect } from 'bun:test';
import { ok, err } from 'neverthrow';

describe('login', () => {
  it('returns ok with user on success', async () => {
    const result = await login(validCredentials);
    
    expect(result.isOk()).toBe(true);
    result.map((user) => {
      expect(user.id).toBe('123');
    });
  });

  it('returns err with AuthError on failure', async () => {
    const result = await login(invalidCredentials);
    
    expect(result.isErr()).toBe(true);
    result.mapErr((error) => {
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
```

### Integration Tests

Test state transitions:
```typescript
describe('AuthContextFP', () => {
  it('transitions from idle → loading → authenticated', async () => {
    const { state, login } = renderWithAuthFP(<App />);
    
    expect(state.type).toBe('idle');
    
    const loginPromise = login(credentials);
    expect(state.type).toBe('loading');
    
    await loginPromise;
    expect(state.type).toBe('authenticated');
  });
});
```

### Feature Flag Testing

Test both implementations in parallel:
```typescript
describe('Auth Flow (Both Implementations)', () => {
  test.each([
    { flag: false, name: 'Traditional' },
    { flag: true, name: 'FP-Based' },
  ])('$name - login succeeds', async ({ flag }) => {
    updateFeatureFlags({ useFPAuth: flag });
    const { state, operations } = renderWithAuthAdapter(<App />);
    
    await operations.login(credentials);
    expect(state.isAuthenticated).toBe(true);
  });
});
```

### Advanced Testing Strategies

#### 1. Behavioral Equivalence Tests

Run both implementations against identical inputs and assert identical observable side-effects using mock/spy hooks and checksum comparisons:

```typescript
describe('Behavioral Equivalence', () => {
  test.each([
    { flag: false, name: 'Traditional' },
    { flag: true, name: 'FP-Based' },
  ])('$name - produces identical side effects', async ({ flag }) => {
    // Mock external dependencies
    const localStorageMock = mockLocalStorage();
    const analyticsMock = mockAnalytics();
    const apiMock = mockApi();
    
    // Set feature flag
    updateFeatureFlags({ useFPAuth: flag });
    
    // Capture side effects
    const sideEffects: any[] = [];
    localStorageMock.onSet((key, value) => sideEffects.push({ type: 'localStorage', key, value }));
    analyticsMock.onEvent((event) => sideEffects.push({ type: 'analytics', event }));
    apiMock.onRequest((request) => sideEffects.push({ type: 'api', request }));
    
    // Execute the same operation
    const { operations } = renderWithAuthAdapter(<App />);
    await operations.login(validCredentials);
    
    // Create checksum of side effects
    const checksum = createChecksum(sideEffects);
    
    // Assert consistent behavior
    expect(checksum).toMatchSnapshot();
  });
});
```

#### 2. Performance Regression Tests

Add CI steps to measure bundle size diffs and runtime metrics with thresholds and fail-build on regressions, plus automated profiling runs:

```typescript
// ci/performance.test.ts
describe('Performance Regression', () => {
  test('bundle size within threshold', () => {
    const mainBundleSize = getBundleSize('main.js');
    const threshold = 500 * 1024; // 500KB
    
    expect(mainBundleSize).toBeLessThanOrEqual(threshold);
  });
  
  test('cold startup time within threshold', async () => {
    const startTime = performance.now();
    await renderApp();
    const endTime = performance.now();
    
    const startupTime = endTime - startTime;
    const threshold = 2000; // 2 seconds
    
    expect(startupTime).toBeLessThanOrEqual(threshold);
  });
  
  test('memory usage within threshold', () => {
    const memoryUsage = getMemoryUsage();
    const threshold = 50 * 1024 * 1024; // 50MB
    
    expect(memoryUsage).toBeLessThanOrEqual(threshold);
  });
  
  test('API response time within threshold', async () => {
    const startTime = performance.now();
    await api.login(credentials);
    const endTime = performance.now();
    
    const responseTime = endTime - startTime;
    const threshold = 100; // 100ms
    
    expect(responseTime).toBeLessThanOrEqual(threshold);
  });
});
```

#### 3. State Consistency Tests

Simulate toggling the feature flag at runtime across various app states and assert no data loss/corruption and consistent state transitions:

```typescript
describe('State Consistency', () => {
  test('no data loss when toggling feature flags', async () => {
    // Start with traditional implementation
    updateFeatureFlags({ useFPAuth: false });
    
    // Login and create some state
    const { operations, state } = renderWithAuthAdapter(<App />);
    await operations.login(validCredentials);
    
    // Capture current state
    const initialState = {
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      // ... other state properties
    };
    
    // Toggle to FP implementation
    updateFeatureFlags({ useFPAuth: true });
    
    // Assert state consistency
    expect(state.isAuthenticated).toBe(initialState.isAuthenticated);
    expect(state.user?.id).toBe(initialState.user?.id);
    // ... other assertions
  });
  
  test('consistent state transitions across implementations', async () => {
    // Test deterministic fixtures to reproduce edge cases
    const testScenarios = [
      { name: 'idle to loading to authenticated', actions: ['login'] },
      { name: 'authenticated to error', actions: ['login', 'logout', 'loginWithInvalidCredentials'] },
      { name: 'error recovery', actions: ['loginWithInvalidCredentials', 'login'] },
    ];
    
    for (const scenario of testScenarios) {
      for (const flag of [false, true]) {
        updateFeatureFlags({ useFPAuth: flag });
        
        const { operations, state } = renderWithAuthAdapter(<App />);
        const stateTransitions: string[] = [];
        
        // Track state transitions
        const unsubscribe = state.subscribe((newState) => {
          stateTransitions.push(newState.type);
        });
        
        // Execute scenario actions
        for (const action of scenario.actions) {
          await operations[action]();
        }
        
        unsubscribe();
        
        // Assert consistent state transitions
        expect(stateTransitions).toMatchSnapshot(`${scenario.name}-${flag ? 'fp' : 'traditional'}`);
      }
    }
  });
});
```

## Environment Configuration

### Development

Enable FP features for testing:
```bash
# .env.local
VITE_USE_FP_AUTH=true
VITE_USE_FP_SERVICES=false
VITE_USE_FP_HOOKS=false
VITE_VERBOSE_FP_LOGGING=true
```

### Production

Start with features disabled, gradually enable:
```bash
# .env.production
VITE_USE_FP_AUTH=false
VITE_USE_FP_SERVICES=false
VITE_USE_FP_HOOKS=false
VITE_VERBOSE_FP_LOGGING=false
```

### Runtime Testing

Update features without rebuilding:
```typescript
// In browser console
import { updateFeatureFlags } from '@/config/featureFlags';
updateFeatureFlags({ useFPAuth: true });
```

## Rollback Plan

If issues occur during the FP migration, follow this comprehensive rollback procedure:

### Pre-Rollback Checks

Before initiating rollback, perform these validation steps:

1. **Data Consistency Validation**:
   - Run data consistency checks between new and old implementations
   - Execute divergence validation scripts to identify any data discrepancies
   - Owner: Backend Team
   - Command: `bun run validate-data-consistency`

2. **Backup/Snapshot Verification**:
   - Verify database backups are current and restorable
   - Confirm application state snapshots exist
   - Owner: DevOps Team
   - Command: `bun run verify-backups`

3. **Smoke Tests**:
   - Run critical path smoke tests on both implementations
   - Validate core user flows work as expected
   - Owner: QA Team
   - Command: `bun run smoke-tests`

### User Communication Strategy

Prepare and execute communication before and during rollback:

1. **Templated User-Facing Messages**:
   - Draft "Service Degradation" and "Maintenance" notifications
   - Owner: Product Team
   - Runbook: `docs/runbooks/user-communication.md`

2. **Internal Incident Notes**:
   - Create incident report template with rollback steps
   - Owner: Engineering Manager
   - Runbook: `docs/runbooks/incident-template.md`

3. **Notification Channels**:
   - Notify affected users via in-app messages, email, and status page
   - Owner: Product Team
   - Command: `bun run notify-users "rollback-initiated"`

### Rollback Execution

1. **Immediate**: Disable feature flag
   ```bash
   VITE_USE_FP_AUTH=false
   ```
   - Owner: DevOps Team
   - Criteria: Execute immediately upon decision to rollback

2. **Runtime**: Reset from browser console
   ```typescript
   import { resetFeatureFlags } from '@/config/featureFlags';
   resetFeatureFlags();
   ```
   - Owner: Frontend Team
   - Criteria: Execute for active user sessions

3. **Complete**: Revert to previous git state
   ```bash
   git revert <commit-hash>
   ```
   - Owner: DevOps Team
   - Criteria: Only if feature flag approach is insufficient

### Post-Rollback Validation

After rollback execution, perform these validation steps:

1. **Monitoring**:
   - Monitor key metrics, error rates, and logs for 2 hours
   - Execute automated health checks every 5 minutes
   - Owner: SRE Team
   - Command: `bun run monitor-health --duration=120m`
   - Success Criteria: Metrics return to baseline within 30 minutes

2. **Regression Tests**:
   - Run full regression test suite
   - Validate core user flows
   - Owner: QA Team
   - Command: `bun run test:regression`
   - Success Criteria: 100% test pass rate

### In-Flight Operations Handling

Manage active operations during rollback:

1. **Queue Management**:
   - Drain or pause message queues
   - Owner: Backend Team
   - Command: `bun run queue-drain --pause`

2. **Partial Writes Reconciliation**:
   - Idempotently reconcile any partial writes
   - Owner: Backend Team
   - Command: `bun run reconcile-partial-writes`

3. **Cache Management**:
   - Flush application caches
   - Owner: DevOps Team
   - Command: `bun run flush-caches`

4. **Feature Flag Toggling**:
   - Safely toggle flags without corrupting shared storage
   - Owner: DevOps Team
   - Runbook: `docs/runbooks/safe-flag-toggle.md`

### Rollback Success Criteria

Declare rollback successful when:
- Error rates return to baseline (<1%)
- All core user flows functional
- No data corruption detected
- Health checks passing for 30+ minutes

### Escalation Criteria

Escalate if:
- Rollback takes >30 minutes
- Data corruption detected
- Error rates remain >5% after 1 hour
- Critical user flows broken

Escalation Contact: Engineering Manager (24/7) - [phone number]

## Metrics & Monitoring

### Alert Thresholds

Establish clear thresholds for monitoring and alerting:

1. **Error Rate Alerts**:
   - Alert at 2× baseline OR >5% errors/minute
   - Page on >1% user-impacting errors
   - Owner: SRE Team
   - Configuration: `monitoring/alerts/error-rate.yaml`

2. **Performance Degradation**:
   - Page load time >2× baseline
   - API response time >2× baseline
   - Owner: SRE Team
   - Configuration: `monitoring/alerts/performance.yaml`

3. **Resource Utilization**:
   - CPU usage >80% for 5+ minutes
   - Memory usage >85% for 5+ minutes
   - Owner: SRE Team
   - Configuration: `monitoring/alerts/resources.yaml`

### Type Safety Measurement

Track and enforce type safety improvements:

1. **Result Type Adoption**:
   - Add lint rule reporting % of functions returning Result
   - CI gate fails if adoption drops below target
   - Owner: Frontend Team
   - Command: `bun run lint:type-safety`
   - Target: 90%+ of async functions return Result/AsyncResult

2. **Exception Usage Reduction**:
   - Track try/catch blocks outside designated wrappers
   - Owner: Frontend Team
   - Command: `bun run lint:exceptions`
   - Target: <5 try/catch blocks in application code

### Performance Thresholds

Define concrete performance boundaries:

1. **Bundle Size Limits**:
   - Max JS bundle: 200KB
   - Bundle size increase limit: +5%
   - Owner: Frontend Team
   - Command: `bun run build --analyze`

2. **Runtime Performance**:
   - p95 latency increase: <=10%
   - Cold start time: <=2 seconds
   - Owner: SRE Team
   - Command: `bun run perf:benchmark`

3. **Memory Usage**:
   - Memory increase: <=10%
   - Peak memory usage: <50MB
   - Owner: SRE Team
   - Command: `bun run perf:memory`

### Automated Actions

Configure automated responses to critical metrics:

1. **Automatic Rollback Triggers**:
   - Sustained error rate >2× baseline for 5 minutes
   - Owner: SRE Team
   - Command: `bun run auto-rollback --trigger=error-rate`

2. **Auto-Scaling**:
   - CPU usage >80% for 2+ minutes
   - Owner: DevOps Team
   - Command: `bun run autoscale --trigger=cpu`

3. **Health Checks**:
   - Automated health checks every 30 seconds
   - Owner: SRE Team
   - Command: `bun run health-check --continuous`

### Feature-Flag Variant Tracking

Monitor implementations independently with proper labeling:

1. **Separate Metrics Collection**:
   - Track metrics separately per feature-flag variant (A/B style)
   - Owner: SRE Team
   - Configuration: `monitoring/dashboards/feature-flags.json`

2. **Tagged Observability**:
   - Label/tag all metrics with feature flag status
   - Owner: SRE Team
   - Configuration: `monitoring/config/tags.yaml`

3. **Dashboard Views**:
   - Create dashboards showing both implementations side-by-side
   - Owner: SRE Team
   - URL: `https://monitoring.company.com/d/feature-flags`

### Commands:

```bash
# Type checking
bun run type-check

# Linting
bun run lint

# Testing with coverage
bun run test:coverage

# Build
bun run build

# Performance benchmarking
bun run perf:benchmark

# Memory profiling
bun run perf:memory

# Health checks
bun run health-check

# Metrics collection
bun run collect-metrics
```

## FAQ

### Q: Will this break existing code?
**A:** No. Feature flags default to `false`, so existing code runs unchanged. New FP features are opt-in.

### Q: How long will migration take?
**A:** Estimated 2-4 weeks with 1-2 developers working gradually on components. Can be parallelized.

### Q: Do I need to refactor all at once?
**A:** No. Use feature flags to enable FP gradually per component. Recommend 1-2 components per week.

### Q: What if I'm not familiar with FP patterns?
**A:** Start with the examples above. The `useAuthAdapter` provides a familiar interface while using FP under the hood. Team training recommended.

### Q: How is error handling different?
**A:** Instead of try-catch and throwing, use `match()` to handle success/failure. All errors are values (Result types) not exceptions.

### Q: Can I use both implementations simultaneously?
**A:** Yes! That's the point of feature flags. Enables A/B testing and gradual migration.

## Resources

- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [Railway-Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [Discriminated Unions in TypeScript](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions)
- [Async Result Patterns](https://github.com/supermacro/neverthrow#asyncresult)

## Next Steps

1. **Immediate**: Review this document and AuthContextFP implementation
2. **Week 1**: Convert LoginPage to use useAuthAdapter
3. **Week 2**: Convert PrivateRoute and Layout components
4. **Week 3**: Convert dashboard and pages
5. **Week 4**: Enable feature flag in production (with monitoring)
6. **Week 5-6**: Gradual rollout to all users

---

**Last Updated**: Phase 1 Complete - Ready for Phase 2 Migration
**Test Status**: 701 pass / 0 fail / 71.12% coverage
**Breaking Changes**: None (fully backward compatible)
