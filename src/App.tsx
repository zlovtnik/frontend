import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvironmentErrorUI } from './components/EnvironmentErrorUI';
import { PageSkeleton } from './components/PageSkeleton';
import { getEnv, EnvironmentError } from './config/env';

const HomePage = lazy(() =>
  import('./pages/HomePage').then(module => ({ default: module.HomePage }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage.fp').then(module => ({ default: module.LoginPageFP }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage }))
);
const AddressBookPage = lazy(() =>
  import('./pages/AddressBookPage').then(module => ({ default: module.AddressBookPage }))
);
const TenantsPage = lazy(() =>
  import('./pages/TenantsPage').then(module => ({ default: module.TenantsPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage }))
);
const PasswordResetPage = lazy(() =>
  import('./pages/PasswordResetPage').then(module => ({ default: module.PasswordResetPage }))
);
const OAuthCallbackPage = lazy(() =>
  import('./pages/OAuthCallbackPage').then(module => ({ default: module.OAuthCallbackPage }))
);

// Validate environment configuration at module load time
let envError: Error | null = null;
try {
  getEnv();
} catch (error) {
  envError =
    error instanceof EnvironmentError
      ? error
      : new Error('Failed to initialize application configuration');
}

export const App: React.FC = () => {
  // Check for environment errors and render error UI if present
  if (envError) {
    return <EnvironmentErrorUI error={envError} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-natural-light text-natural-dark">
        <AuthProvider>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<PasswordResetPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton variant="default" />}>
                        <DashboardPage />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/address-book"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton variant="card" />}>
                        <AddressBookPage />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/tenants"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton variant="table" />}>
                        <TenantsPage />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
};
