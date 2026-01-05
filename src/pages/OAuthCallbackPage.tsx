/**
 * OAuth Callback Handler Page
 *
 * This page is rendered when Keycloak redirects back to the frontend after
 * successful authentication. The backend handles the OAuth code exchange,
 * but we need to:
 * 1. Show loading state while processing callback
 * 2. Extract and store authentication data
 * 3. Redirect to dashboard on success
 * 4. Show error page on failure
 *
 * URL: /auth/callback
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth';
import { useAuth } from '@/hooks/useAuth';
import { Card, Spin, Typography, Alert, Button, Space, Flex } from '@/components/AntdComponents';

/**
 * OAuth Callback Handler Component
 *
 * Handles the redirect after successful Keycloak authentication.
 * Backend has already:
 * 1. Exchanged authorization code for tokens
 * 2. Validated CSRF token and nonce
 * 3. Set secure HttpOnly cookies with tokens
 *
 * This page retrieves user info and redirects to dashboard.
 */
export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleKeycloakCallback, error: keycloakError, isLoading } = useKeycloakAuth();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        setIsProcessing(true);

        // Check for error parameters from Keycloak
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
          setCallbackError(
            `OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`
          );
          setIsProcessing(false);
          return;
        }

        // Process OAuth callback
        const authResponse = await handleKeycloakCallback();

        // If handleKeycloakCallback returned null but there's no error,
        // it might just mean the backend didn't return user data in the response
        // (which is expected since it sets cookies instead)
        if (!authResponse && keycloakError) {
          setCallbackError(keycloakError.message || 'Failed to process callback');
          setIsProcessing(false);
          return;
        }

        // Implement retry logic for authentication state update
        let retryCount = 0;
        const maxRetries = 5;
        const retryDelay = 500; // 500ms between retries

        const checkAuthState = () => {
          if (isAuthenticated) {
            // Success - redirect to dashboard or intended location
            const from =
              (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
            return true;
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkAuthState, retryDelay);
            return false;
          } else {
            // Max retries reached - authentication failed
            setCallbackError('Authentication failed: Unable to verify identity');
            setIsProcessing(false);
            return false;
          }
        };

        // Start checking auth state with retries
        checkAuthState();
      } catch (error) {
        setCallbackError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [handleKeycloakCallback, keycloakError, isAuthenticated, navigate, location]);

  // Show loading state while processing
  if (isProcessing || isLoading || authLoading) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, var(--color-natural-light) 0%, var(--color-healing-light) 100%)',
        }}
      >
        <Card
          style={{
            width: 400,
            borderRadius: '16px',
            border: '2px solid var(--primary-200)',
            textAlign: 'center',
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Spin size="large" />
            <Typography.Title level={3}>Completing Authentication</Typography.Title>
            <Typography.Text type="secondary">
              Please wait while we verify your credentials with Keycloak...
            </Typography.Text>
          </Space>
        </Card>
      </Flex>
    );
  }

  // Show error state if callback failed
  if (callbackError) {
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
            width: 500,
            borderRadius: '16px',
            border: '2px solid var(--primary-200)',
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Typography.Title level={2} style={{ color: 'var(--color-accent-error)' }}>
              Authentication Failed
            </Typography.Title>

            <Alert
              message="OAuth Callback Error"
              description={callbackError}
              type="error"
              showIcon
            />

            <Typography.Paragraph>
              There was a problem completing your authentication with Keycloak. This could be due
              to:
            </Typography.Paragraph>

            <ul>
              <li>Session expired (took too long to log in)</li>
              <li>Browser blocked cookies</li>
              <li>Keycloak configuration mismatch</li>
              <li>Network connectivity issue</li>
            </ul>

            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                onClick={() => {
                  navigate('/login', { replace: true });
                }}
              >
                Return to Login
              </Button>
              <Button
                onClick={() => {
                  window.location.reload();
                }}
              >
                Try Again
              </Button>
            </Space>

            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              If the problem persists, please contact support.
            </Typography.Text>
          </Space>
        </Card>
      </Flex>
    );
  }

  // This shouldn't be reached as we redirect on success
  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
      <Typography.Text>Redirecting...</Typography.Text>
    </Flex>
  );
};

export default OAuthCallbackPage;
