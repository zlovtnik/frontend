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

import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth';
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
  const location = useLocation();
  const { handleKeycloakCallback, error: keycloakError } = useKeycloakAuth();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  
  // Ref to track if we've already processed the callback
  const hasProcessedRef = useRef(false);

  // Process the OAuth callback once
  useEffect(() => {
    // Prevent multiple executions - set synchronously before any async work
    if (hasProcessedRef.current) {
      return;
    }
    // Mark as processed immediately to prevent double-processing in Strict Mode
    hasProcessedRef.current = true;

    const processCallback = async () => {
      try {
        setIsProcessing(true);

        // Check for error parameters from Keycloak
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        const code = params.get('code');

        if (error) {
          const errorMsg = errorDescription ? `OAuth Error: ${error} - ${errorDescription}` : `OAuth Error: ${error}`;
          setCallbackError(errorMsg);
          setIsProcessing(false);
          return;
        }

        if (!code) {
          setCallbackError('No authorization code found in callback URL');
          setIsProcessing(false);
          return;
        }

        // Process OAuth callback
        const authResponse = await handleKeycloakCallback();

        if (!authResponse) {
          setCallbackError('Failed to process authentication callback');
          setIsProcessing(false);
          return;
        }

        // Success - AuthContext will pick up the stored data on reload
        // localStorage writes are synchronous, so we can navigate immediately
        setIsProcessing(false);
        
        const from =
          (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
        // Use location.replace for a full reload to ensure AuthContext picks up new data
        // without adding to browser history (prevents back button issues)
        globalThis.location.replace(from);
      } catch (error) {
        setCallbackError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setIsProcessing(false);
      }
    };

    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omitting location.search, handleKeycloakCallback to run once on mount only
  }, []);

  // Handle keycloak errors
  useEffect(() => {
    if (keycloakError && !callbackError) {
      setCallbackError(keycloakError.message || 'Failed to process callback');
      setIsProcessing(false);
    }
  }, [keycloakError, callbackError]);

  // Show loading state while processing
  if (isProcessing) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, var(--color-background-light) 0%, var(--color-info-light) 100%)',
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
            'linear-gradient(135deg, var(--color-background-light) 0%, var(--color-info-light) 100%)',
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
                  globalThis.location.href = '/login';
                }}
              >
                Return to Login
              </Button>
              <Button
                onClick={() => {
                  globalThis.location.reload();
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
