import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { RegisterData } from '@/types/auth';
import { Card, Form, Button, Typography, Alert, Flex, Input } from '@/components/AntdComponents';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const onSubmit = async (values: RegisterFormValues) => {
    // Early return if already submitting
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      setSubmitError(null);
      const registerData: RegisterData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTerms: acceptTerms,
      };
      await register(registerData);
      // After successful registration, navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Registration error occurred', error);
      setSubmitError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
            Create Account
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
          Create your multi-tenant application account
        </Typography.Text>

        <Form
          form={form}
          onFinish={onSubmit}
          size="large"
          layout="vertical"
          data-testid="register-form"
        >
          <Form.Item
            label={<span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>First Name</span>}
            name="firstName"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input
              placeholder="Enter your first name"
              className="register-input"
              aria-label="First Name"
              data-testid="first-name-input"
              maxLength={50}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Last Name</span>}
            name="lastName"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input
              placeholder="Enter your last name"
              className="register-input"
              aria-label="Last Name"
              data-testid="last-name-input"
              maxLength={50}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              placeholder="Enter your email"
              className="register-input"
              aria-label="Email"
              data-testid="email-input"
              maxLength={254}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Password</span>}
            name="password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              placeholder="Enter your password"
              className="register-input"
              aria-label="Password"
              data-testid="password-input"
              maxLength={128}
            />
          </Form.Item>

          <Form.Item
            label={
              <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Confirm Password</span>
            }
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm your password"
              className="register-input"
              aria-label="Confirm Password"
              data-testid="confirm-password-input"
              maxLength={128}
            />
          </Form.Item>

          <Form.Item
            name="acceptTerms"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('You must accept the terms and conditions')),
              },
            ]}
          >
            <Flex align="center" gap="small">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={e => {
                  setAcceptTerms(e.target.checked);
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <label
                htmlFor="acceptTerms"
                style={{ color: 'var(--primary-600)', marginLeft: '8px' }}
              >
                I accept the{' '}
                <a href="https://www.example.com/terms" target="_blank" rel="noopener noreferrer">
                  Terms and Conditions
                </a>
              </label>
            </Flex>
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

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isLoading || isSubmitting}
              disabled={isLoading || isSubmitting}
              className="register-submit-button"
              data-testid="submit-button"
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Typography.Text>
            Already have an account?{' '}
            <Button
              type="link"
              onClick={() => {
                navigate('/login');
              }}
              style={{ padding: 0 }}
            >
              Sign in
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
        Create an account to access your secure multi-tenant workspace
      </Typography.Text>
    </Flex>
  );
};
