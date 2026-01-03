# Copilot Instructions

## Architecture Snapshot
- Entry stack lives in `src/main.tsx` (theme + providers) and `src/App.tsx` (lazy routes + `EnvironmentErrorUI` fallback); every page is lazy-loaded and wrapped by `Layout` + `PrivateRoute` for authenticated flows.
- Keep the clean layering: pure business logic in `src/domain/**`, async/IO inside `src/services/api.ts`, async orchestration in hooks like `src/hooks/useApiCall.ts`, and presentation inside `src/components`/`src/pages`.
- All cross-layer data travels as `Result`/`ResultAsync` from `neverthrow`; compose with `.match`, `.andThen`, and `ts-pattern` instead of `try/catch`.
- Path aliases (`@/…`) are configured in `tsconfig.json`; new modules should respect this structure to avoid brittle relative imports.

## Build & Env Workflow
- Install with `bun install`, run dev via `NODE_ENV=development bun run dev`; production builds (`bun run build`) prepend `scripts/validate-env.js`, so missing `VITE_*` vars fail fast.
- Add env values to `.env(.local|.development|.production)` and read them through `src/config/env.ts#getEnv()`; rendering fails into `EnvironmentErrorUI` until validation passes.
- Asset checks live in `scripts/analyze-assets.js` and `scripts/verify-optimization.js`; trigger via `bun run build:analyze` when touching Vite config, Tailwind, or large media.
- Tests preload `loadenv.ts` (syncs `process.env` and `import.meta.env`) so new test helpers should rely on `getEnvVar` rather than poking globals directly.

## Service & Auth Patterns
- `src/services/api.ts` exposes the shared HttpClient (retry, exponential backoff, circuit breaker, tenant header, schema validation); always add endpoints here and return `AsyncResult`.
- JWT/session management lives in `src/contexts/AuthContext.tsx`; tokens, tenant, and user are JSON-wrapped in localStorage, and refresh flows must call `attemptTokenRefresh` to keep `X-Tenant-ID` in sync.
- Feature flags (`src/config/featureFlags.ts`) let us dogfood FP rewrites—check `getFeatureFlags()` before flipping behavior and persist overrides via `updateFeatureFlags`.
- Storage access must go through `StorageService` and branded ID helpers (e.g., `asTenantId` in `src/types/ids.ts`) to keep multi-tenant isolation guarantees.

## UI, Routing & Performance
- Pages orchestrate services/hooks only; keep forms inside `useFormValidation` pipelines and surface typed props to Ant Design shells (`src/components/README.md` documents shared pieces).
- Skeletons (`PageSkeleton`, `CardSkeletonGrid`, `TableSkeleton`) and `LazyImage`/`ResponsiveImage` provide the expected loading UX—reuse them instead of bespoke spinners.
- `main.tsx` preloads password dictionaries via `preloadCommonPasswords()` from `domain/rules/authRules`; if you add new blocking async work, defer with `setTimeout` like the existing preload to avoid delaying first paint.
- Performance knobs are centralized in `vite.config.ts` (manualChunks, `VitePWA`, `viteImagemin`, `assetsInlineLimit`) plus runtime caching definitions in `src/config/cacheStrategies.ts`; update both when touching bundling/service-worker behavior.

## Testing Playbook
- Default test target is Bun: `bun test` (all), `bun test:watch`, `bun test:coverage`, `bun test:ui` (forces Happy DOM). Coverage thresholds live in `src/test-utils/README.md`.
- `bunfig.toml` preloads `loadenv.ts`, `happydom.ts`, and `src/test-utils/setup.ts`; new global setups should be added there instead of ad-hoc `beforeAll` blocks.
- Use helpers from `src/test-utils/render.tsx` (`renderWithProviders`, `renderWithAuth`, MSW server utilities) so Router/Auth/AntD contexts stay consistent.
- When stubbing network flows, prefer MSW handlers in `src/test-utils/mocks/**`; remember to reset handlers via `server.resetHandlers()` or `resetMockData()` in `beforeEach` like the existing suites.
