/**
 * Login Page - React Hook Form Implementation
 *
 * Provides:
 * - Zod-powered validation with React Hook Form
 * - Debounced real-time feedback and success indicators
 * - Result-aware submission handling with functional error mapping
 *
 * @module LoginPage
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth';
import { getEnv } from '@/config/env';
import type { LoginCredentials } from '@/types/auth';
import type { AuthFlowError } from '@/types/errors';
import { formatAuthFlowError } from '@/types/errors';
import type { TenantId } from '@/types/ids';
import {
  Card,
  Button,
  Typography,
  Alert,
  Flex,
  Space,
  Checkbox,
} from '@/components/AntdComponents';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { FormField } from '@/components/FormField';
import { loginSchema } from '@/validation/schemas';
import { useDebouncedValidation } from '@/hooks/useDebouncedValidation';
import { useWarnOnUnsavedChanges } from '@/hooks/useWarnOnUnsavedChanges';
import {
  formatCredentialValidationError,
  type CredentialValidationError,
} from '@/utils/validation';

type LoginFormValues = z.infer<typeof loginSchema>;

const credentialFieldMap: Record<CredentialValidationError['type'], keyof LoginFormValues> = {
  EMPTY_USERNAME: 'usernameOrEmail',
  USERNAME_TOO_SHORT: 'usernameOrEmail',
  USERNAME_TOO_LONG: 'usernameOrEmail',
  INVALID_USERNAME_FORMAT: 'usernameOrEmail',
  INVALID_EMAIL_FORMAT: 'usernameOrEmail',
  EMPTY_PASSWORD: 'password',
  PASSWORD_TOO_SHORT: 'password',
  PASSWORD_TOO_WEAK: 'password',
  EMPTY_TENANT_ID: 'tenantId',
  INVALID_TENANT_ID_FORMAT: 'tenantId',
};

const isCredentialValidationError = (error: unknown): error is CredentialValidationError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { type?: unknown };
  return typeof candidate.type === 'string' && candidate.type in credentialFieldMap;
};

/**
 * Type for location state
 */
interface LocationState {
  from?: { pathname: string };
}

const isLocationState = (state: unknown): state is LocationState => {
  if (state === null || typeof state !== 'object') {
    return false;
  }

  const candidate = state as { from?: unknown };
  if (candidate.from === undefined || candidate.from === null) {
    return true;
  }

  return typeof (candidate.from as { pathname?: unknown }).pathname === 'string';
};

/**
 * Login Page Component with FP Patterns
 */
export const LoginPageFP: React.FC = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { initiateKeycloakLogin, isLoading: keycloakLoading } = useKeycloakAuth();
  const env = getEnv();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = isLocationState(location.state) ? location.state : null;
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Get the intended destination
  const from = locationState?.from?.pathname || '/dashboard';
  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: useMemo(
      () => ({
        usernameOrEmail: '',
        password: '',
        tenantId: '',
        rememberMe: false,
      }),
      []
    ),
  });

  const {
    handleSubmit,
    trigger,
    watch,
    reset,
    setError,
    formState: { isDirty, isSubmitting, submitCount },
  } = methods;

  const watchedValues = watch();
  const shouldValidate = useMemo(() => isDirty || submitCount > 0, [isDirty, submitCount]);

  useDebouncedValidation({ trigger, values: watchedValues, delay: 250, shouldValidate });
  useWarnOnUnsavedChanges(isDirty && !isSubmitting);

  const handleSubmissionError = (error: AuthFlowError | CredentialValidationError | unknown) => {
    if (isCredentialValidationError(error)) {
      const field = credentialFieldMap[error.type];
      setError(field, {
        type: 'manual',
        message: formatCredentialValidationError(error),
      });
      return;
    }

    if (error && typeof error === 'object' && 'type' in error) {
      setSubmissionError(formatAuthFlowError(error as AuthFlowError));
      return;
    }

    setSubmissionError('Login failed. Please try again.');
  };

  const onSubmit = async (formValues: LoginFormValues) => {
    setSubmissionError(null);

    const credentials: LoginCredentials = {
      usernameOrEmail: formValues.usernameOrEmail,
      password: formValues.password,
      tenantId: formValues.tenantId as TenantId,
      rememberMe: formValues.rememberMe ?? false,
    };

    try {
      const result = await login(credentials);

      if ('isErr' in result && typeof result.isErr === 'function') {
        if (result.isErr()) {
          handleSubmissionError(result.error);
          return;
        }
      }

      reset(undefined, { keepValues: false });
      navigate(from, { replace: true });
    } catch (error) {
      handleSubmissionError(error);
    }
  };

  const isFormLoading = authLoading || isSubmitting;

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, var(--color-natural-light) 0%, var(--color-healing-light) 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: 420,
          borderRadius: '16px',
          border: '2px solid var(--primary-200)',
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(247,242,240,0.9) 100%)',
          boxShadow: '0 20px 40px rgba(38, 70, 83, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
        }}
        title={
          <Typography.Title
            level={2}
            style={{
              color: 'var(--color-healing-dark)',
              margin: 0,
              textAlign: 'center',
              fontSize: '2rem',
              fontWeight: 700,
            }}
          >
            Welcome Back
          </Typography.Title>
        }
        styles={{
          header: {
            border: 'none',
            padding: '40px 30px 20px',
            textAlign: 'center',
          },
          body: {
            padding: '30px',
          },
        }}
      >
        <Typography.Text
          type="secondary"
          style={{
            textAlign: 'center',
            display: 'block',
            fontSize: '16px',
            marginBottom: '32px',
            color: 'var(--primary-600)',
          }}
        >
          Access your multi-tenant application
        </Typography.Text>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {submissionError && (
                <Alert
                  message="Unable to sign in"
                  description={submissionError}
                  type="error"
                  closable
                  onClose={() => {
                    setSubmissionError(null);
                  }}
                  role="alert"
                />
              )}

              <FormField
                name="usernameOrEmail"
                label="Username or Email"
                type="text"
                required
                placeholder="Enter your username or email"
                disabled={isFormLoading}
              />

              <FormField
                name="password"
                label="Password"
                type="password"
                required
                placeholder="Enter your password"
                disabled={isFormLoading}
              />

              <FormField
                name="tenantId"
                label="Tenant ID"
                type="text"
                required
                placeholder="Enter your tenant ID"
                disabled={isFormLoading}
              />

              <Controller
                name="rememberMe"
                render={({ field }) => (
                  <Checkbox
                    {...field}
                    checked={field.value}
                    disabled={isFormLoading}
                    style={{ color: 'var(--primary-600)' }}
                  >
                    Remember me
                  </Checkbox>
                )}
              />

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isFormLoading}
                disabled={isFormLoading}
                className="login-submit-button"
              >
                {isSubmitting ? 'Validating…' : authLoading ? 'Signing In…' : 'Sign In'}
              </Button>

              {env.useKeycloakOAuth && (
                <Button
                  type="default"
                  htmlType="button"
                  block
                  loading={keycloakLoading}
                  disabled={keycloakLoading || isFormLoading}
                  onClick={async () => {
                    try {
                      await initiateKeycloakLogin();
                    } catch (error) {
                      console.error('Keycloak login failed:', error);
                      setSubmissionError('Failed to initiate Keycloak login. Please try again.');
                    }
                  }}
                  className="mt-4"
                >
                  {keycloakLoading ? 'Redirecting to Keycloak…' : 'Sign In with Keycloak'}
                </Button>
              )}
            </Space>
          </form>
        </FormProvider>
      </Card>

      <Typography.Text
        type="secondary"
        style={{
          textAlign: 'center',
          marginTop: '32px',
          display: 'block',
          maxWidth: '400px',
          color: 'var(--primary-500)',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
      >
        Secure multi-tenant authentication powered by functional programming
      </Typography.Text>
    </Flex>
  );
};

export default LoginPageFP;
