import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Form, Button, Typography, Alert, Flex, Input, Steps } from 'antd';

interface RequestResetFormValues {
  email: string;
}

interface ConfirmResetFormValues {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const PasswordResetPage: React.FC = () => {
  const { requestPasswordReset, confirmPasswordReset, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = request reset, 1 = confirm reset
  const [resetEmail, setResetEmail] = useState('');

  const onRequestReset = async (values: RequestResetFormValues) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await requestPasswordReset(values.email);
      
      if (result.isSuccess) {
        setSubmitSuccess(result.message);
        setResetEmail(values.email);
        setCurrentStep(1); // Move to confirmation step
      } else {
        setSubmitError(result.message);
      }
    } catch (error) {
      console.error('Password reset request error', error);
      setSubmitError(error instanceof Error ? error.message : 'Password reset request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onConfirmReset = async (values: ConfirmResetFormValues) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await confirmPasswordReset({
        token: values.token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      
      if (result.isSuccess) {
        setSubmitSuccess(result.message);
        // After successful reset, navigate to login page after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setSubmitError(result.message);
      }
    } catch (error) {
      console.error('Password reset confirmation error', error);
      setSubmitError(error instanceof Error ? error.message : 'Password reset confirmation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBackToRequest = () => {
    setCurrentStep(0);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

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
            Password Reset
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
        <Steps
          size="small"
          current={currentStep}
          items={[
            {
              title: 'Request',
            },
            {
              title: 'Reset',
            },
          ]}
          style={{ marginBottom: '32px' }}
        />

        {currentStep === 0 ? (
          <>
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
              Enter your email to receive a password reset link
            </Typography.Text>

            <Form
              form={form}
              onFinish={onRequestReset}
              size="large"
              layout="vertical"
              data-testid="request-reset-form"
            >
              <Form.Item
                label={
                  <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                    Email
                  </span>
                }
                name="email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  placeholder="Enter your email"
                  className="reset-input"
                  aria-label="Email"
                  data-testid="email-input"
                  maxLength={254}
                />
              </Form.Item>

              {submitError && (
                <Form.Item>
                  <Alert
                    message={submitError}
                    type="error"
                    closable
                    onClose={() => {
                      setSubmitError(null);
                    }}
                    role="alert"
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--danger-300)',
                      backgroundColor: 'var(--danger-50)',
                    }}
                  />
                </Form.Item>
              )}

              {submitSuccess && (
                <Form.Item>
                  <Alert
                    message={submitSuccess}
                    type="success"
                    role="alert"
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--success-300)',
                      backgroundColor: 'var(--success-50)',
                    }}
                  />
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading || isSubmitting}
                  disabled={isLoading || isSubmitting}
                  className="reset-submit-button"
                  data-testid="submit-button"
                >
                  Send Reset Link
                </Button>
              </Form.Item>
            </Form>
          </>
        ) : (
          <>
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
              Check your email for the reset token and enter it below
            </Typography.Text>

            <Form
              form={form}
              onFinish={onConfirmReset}
              size="large"
              layout="vertical"
              data-testid="confirm-reset-form"
            >
              <Form.Item
                label={
                  <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                    Reset Token
                  </span>
                }
                name="token"
                rules={[{ required: true, message: 'Reset token is required' }]}
              >
                <Input
                  placeholder="Enter the token from your email"
                  className="reset-input"
                  aria-label="Reset Token"
                  data-testid="token-input"
                  maxLength={255}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>New Password</span>}
                name="newPassword"
                rules={[
                  { required: true, message: 'New password is required' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                ]}
              >
                <Input.Password
                  placeholder="Enter your new password"
                  className="reset-input"
                  aria-label="New Password"
                  data-testid="new-password-input"
                  maxLength={128}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                    Confirm New Password
                  </span>
                }
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="Confirm your new password"
                  className="reset-input"
                  aria-label="Confirm New Password"
                  data-testid="confirm-password-input"
                  maxLength={128}
                />
              </Form.Item>

              {submitError && (
                <Form.Item>
                  <Alert
                    message={submitError}
                    type="error"
                    closable
                    onClose={() => {
                      setSubmitError(null);
                    }}
                    role="alert"
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--danger-300)',
                      backgroundColor: 'var(--danger-50)',
                    }}
                  />
                </Form.Item>
              )}

              {submitSuccess && (
                <Form.Item>
                  <Alert
                    message={submitSuccess}
                    type="success"
                    role="alert"
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--success-300)',
                      backgroundColor: 'var(--success-50)',
                    }}
                  />
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading || isSubmitting}
                  disabled={isLoading || isSubmitting}
                  className="reset-submit-button"
                  data-testid="submit-button"
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Typography.Text>
            <Button 
              type="link" 
              onClick={currentStep === 0 ? () => navigate('/login') : onBackToRequest}
              style={{ padding: 0 }}
            >
              {currentStep === 0 ? 'Back to Sign In' : 'Back to Request Reset'}
            </Button>
          </Typography.Text>
        </div>
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
        Securely reset your password for your multi-tenant application
      </Typography.Text>
    </Flex>
  );
};
