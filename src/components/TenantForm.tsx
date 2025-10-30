/**
 * Enhanced Tenant Form Component
 * Provides comprehensive validation and error handling for tenant operations
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Divider,
  Row,
  Col,
  Typography,
  Card,
  Tag,
  Tooltip,
  Spin,
} from 'antd';
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { Tenant } from '@/types/tenant';
import { useTenantNotifications, type TenantOperationResult } from '@/hooks/useTenantNotifications';
import { isValidPostgresConnectionString } from '@/validation/schemas';
import { getEnv } from '@/config/env';

type ConnectionTestResult =
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

const { Title, Text } = Typography;

const DATABASE_URL_ERROR_MESSAGE =
  'Please enter a valid PostgreSQL URL (postgres://...) or connection string (key=value pairs)';

const CONNECTION_TEST_TIMEOUT_MS = 10000;

interface TenantFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TenantFormValues) => Promise<TenantOperationResult>;
  initialValues?: Partial<TenantFormValues>;
  mode: 'create' | 'edit';
  loading?: boolean;
}

interface TenantFormValues {
  name: string;
  db_url: string;
  description?: string;
  settings?: {
    theme?: string;
    timezone?: string;
    features?: string[];
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export const TenantForm: React.FC<TenantFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: {},
    warnings: [],
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const latestConnectionTestRef = useRef(0);
  const connectionTestAbortControllerRef = useRef<AbortController | null>(null);

  const extractConnectionErrorMessage = useCallback(
    (errorBody: unknown, defaultMessage: string): string => {
      if (errorBody && typeof errorBody === 'object') {
        const { message: errorMessage, error: errorDetails } = errorBody as {
          message?: string;
          error?: { reason?: string; message?: string };
        };

        if (errorMessage) {
          return errorMessage;
        }

        if (errorDetails?.reason || errorDetails?.message) {
          return errorDetails.reason ?? errorDetails.message ?? defaultMessage;
        }
      }

      return defaultMessage;
    },
    []
  );

  const isConnectionTestPayload = (payload: unknown): payload is ConnectionTestResult => {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as { status?: unknown };
    return candidate.status === 'success' || candidate.status === 'error';
  };

  const notifications = useTenantNotifications();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      }
      setValidationResult({ isValid: true, errors: {}, warnings: [] });
      setConnectionStatus('idle');
      setConnectionMessage('');
    }
  }, [open, initialValues, form]);

  useEffect(() => {
    return () => {
      if (connectionTestAbortControllerRef.current) {
        connectionTestAbortControllerRef.current.abort();
        connectionTestAbortControllerRef.current = null;
      }
    };
  }, []);

  // Validate tenant name
  const validateTenantName = useCallback((name: string): string | null => {
    if (name?.trim().length === 0) {
      return 'Tenant name is required';
    }
    if (name.trim().length < 3) {
      return 'Tenant name must be at least 3 characters long';
    }
    if (name.trim().length > 50) {
      return 'Tenant name must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      return 'Tenant name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return null;
  }, []);

  // Validate database URL
  const validateDatabaseUrl = useCallback((url: string): string | null => {
    const trimmed = url?.trim() ?? '';

    if (trimmed.length === 0) {
      return 'Database URL is required';
    }

    if (!isValidPostgresConnectionString(trimmed)) {
      return DATABASE_URL_ERROR_MESSAGE;
    }

    return null;
  }, []);

  // Test database connection
  const testDatabaseConnection = useCallback(async (url: string) => {
    const trimmed = url?.trim() ?? '';
    const requestId = latestConnectionTestRef.current + 1;
    latestConnectionTestRef.current = requestId;

    if (connectionTestAbortControllerRef.current) {
      connectionTestAbortControllerRef.current.abort();
      connectionTestAbortControllerRef.current = null;
    }

    if (trimmed.length === 0) {
      setConnectionStatus('idle');
      setConnectionMessage('');
      return;
    }

    if (!isValidPostgresConnectionString(trimmed)) {
      setConnectionStatus('error');
      setConnectionMessage(DATABASE_URL_ERROR_MESSAGE);
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('');

    let controller: AbortController | null = null;
    let timeoutId: number | null = null;

    try {
      const baseUrl = getEnv().apiUrl ?? '';
      controller = new AbortController();
      connectionTestAbortControllerRef.current = controller;
      timeoutId = window.setTimeout(() => controller?.abort(), CONNECTION_TEST_TIMEOUT_MS);

      const response = await fetch(`${baseUrl}/tenant/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ db_url: trimmed }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (latestConnectionTestRef.current !== requestId) {
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        const message = extractConnectionErrorMessage(
          errorBody,
          'Unable to verify database connection'
        );

        if (latestConnectionTestRef.current === requestId) {
          setConnectionStatus('error');
          setConnectionMessage(message);
        }
        return;
      }

      const payload = (await response.json().catch(() => undefined)) as unknown;

      if (!isConnectionTestPayload(payload)) {
        if (latestConnectionTestRef.current === requestId) {
          setConnectionStatus('success');
          setConnectionMessage('Connection successful');
        }
        return;
      }

      if (payload.status === 'error') {
        if (latestConnectionTestRef.current === requestId) {
          setConnectionStatus('error');
          setConnectionMessage(payload.message);
        }
        return;
      }

      const successMessage = payload.message ?? 'Connection successful';
      if (latestConnectionTestRef.current === requestId) {
        setConnectionStatus('success');
        setConnectionMessage(successMessage);
      }
    } catch (error) {
      if (latestConnectionTestRef.current !== requestId) {
        return;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const fallbackMessage =
        error instanceof Error ? error.message : 'Unexpected error while testing connection';
      setConnectionStatus('error');
      setConnectionMessage(fallbackMessage);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (controller && connectionTestAbortControllerRef.current === controller) {
        connectionTestAbortControllerRef.current = null;
      }
    }
  }, [extractConnectionErrorMessage]);

  // Comprehensive form validation
  const validateForm = useCallback(
    (values: TenantFormValues): ValidationResult => {
      const errors: Record<string, string> = {};
      const warnings: string[] = [];

      // Validate name
      const nameError = validateTenantName(values.name);
      if (nameError) {
        errors.name = nameError;
      }

      // Validate database URL
      const urlError = validateDatabaseUrl(values.db_url);
      if (urlError) {
        errors.db_url = urlError;
      }

      // Additional validations
      if (values.description && values.description.length > 500) {
        errors.description = 'Description must be less than 500 characters';
      }

      // Warnings
      if (values.db_url && /(?:localhost|127\.0\.0\.1|\[::1\])/i.test(values.db_url)) {
        warnings.push(
          'Using a localhost database URL (localhost, 127.0.0.1, or ::1) may not be accessible in production'
        );
      }

      if (values.name?.toLowerCase().includes('test')) {
        warnings.push('Tenant name contains "test" - ensure this is intentional');
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings,
      };
    },
    [validateTenantName, validateDatabaseUrl]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: TenantFormValues) => {
      setSubmitting(true);

      try {
        // Validate form
        const validation = validateForm(values);
        setValidationResult(validation);

        if (!validation.isValid) {
          notifications.notifyValidationError(validation.errors);
          return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => {
            notifications.showWarningNotification('Warning', warning);
          });
        }

        // Submit form
        const result = await onSubmit(values);
        notifications.handleOperationResult(result, mode);

        if (result.success) {
          form.resetFields();
          onClose();
        }
      } catch (error) {
        notifications.notifyTenantError(
          mode === 'create' ? 'create' : 'update',
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [mode, validateForm, onSubmit, notifications, form, onClose]
  );

  // Handle database URL change
  const handleDatabaseUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      testDatabaseConnection(url);
    },
    [testDatabaseConnection]
  );

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <LoadingOutlined />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'testing':
        return 'Testing connection...';
      case 'success':
        return connectionMessage || 'Connection successful';
      case 'error':
        return connectionMessage || 'Connection failed';
      default:
        return 'Enter database URL to test connection';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <DatabaseOutlined />
          <Text>{mode === 'create' ? 'Create New Tenant' : 'Edit Tenant'}</Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
        disabled={submitting}
      >
        {/* Validation Errors */}
        {!validationResult.isValid && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {Object.entries(validationResult.errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Warnings */}
        {validationResult.warnings.length > 0 && (
          <Alert
            message="Warnings"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Basic Information */}
        <Card title="Basic Information" size="small" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="name"
            label="Tenant Name"
            rules={[
              { required: true, message: 'Please enter tenant name' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 50, message: 'Name must be less than 50 characters' },
              {
                pattern: /^[a-zA-Z0-9\s\-_]+$/,
                message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
              },
            ]}
            hasFeedback
          >
            <Input placeholder="Enter tenant name" maxLength={50} showCount />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
            rules={[{ max: 500, message: 'Description must be less than 500 characters' }]}
          >
            <Input.TextArea
              placeholder="Enter tenant description"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Card>

        {/* Database Configuration */}
        <Card title="Database Configuration" size="small" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="db_url"
            label="Database URL"
            rules={[
              { required: true, message: 'Please enter database URL' },
              {
                validator: async (_, value?: string) => {
                  const trimmedValue = value?.trim() ?? '';

                  if (trimmedValue.length === 0) {
                    return Promise.resolve();
                  }

                  if (isValidPostgresConnectionString(trimmedValue)) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error(DATABASE_URL_ERROR_MESSAGE));
                },
              },
            ]}
            hasFeedback
          >
            <Input
              placeholder="postgresql://username:password@localhost:5432/database"
              onChange={handleDatabaseUrlChange}
              suffix={getConnectionStatusIcon()}
            />
          </Form.Item>

          {/* Connection Status */}
          <div style={{ marginTop: '8px' }}>
            <Space>
              {getConnectionStatusIcon()}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {getConnectionStatusText()}
              </Text>
            </Space>
          </div>

          {/* Database URL Examples */}
          <div style={{ marginTop: '12px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Examples:
            </Text>
            <div style={{ marginTop: '4px' }}>
              <Tag>postgresql://user:pass@localhost:5432/db</Tag>
              <Tag>mysql://user:pass@localhost:3306/db</Tag>
              <Tag>sqlite:///path/to/database.db</Tag>
            </div>
          </div>
        </Card>

        {/* Advanced Settings */}
        <Card title="Advanced Settings" size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['settings', 'theme']} label="Theme">
                <Input placeholder="light" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['settings', 'timezone']} label="Timezone">
                <Input placeholder="UTC" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Form Actions */}
        <Divider />
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={!validationResult.isValid}
            >
              {mode === 'create' ? 'Create Tenant' : 'Update Tenant'}
            </Button>
          </Space>
        </div>

        {/* Submission Loading */}
        {submitting && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Spin size="default" />
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
              {mode === 'create' ? 'Creating tenant...' : 'Updating tenant...'}
            </Text>
          </div>
        )}
      </Form>
    </Modal>
  );
};
