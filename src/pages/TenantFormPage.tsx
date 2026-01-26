/**
 * Tenant Form Page - Dedicated page for creating and editing tenants
 * Replaces the modal-based approach with a proper form page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Spin,
  AntdApp,
  Divider,
  Alert,
} from '@/components/AntdComponents';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { tenantService } from '@/services/api';
import { isApiSuccess } from '@/types/api';
import { isValidPostgresConnectionString } from '@/validation/schemas';
import type { Tenant, CreateTenantDTO } from '@/types/tenant';

const { Title, Text } = Typography;

type TenantFormValues = {
  name: string;
  db_url: string;
};

export const TenantFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<TenantFormValues>();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [showDbUrl, setShowDbUrl] = useState(false);

  const isEditMode = Boolean(id);

  // Load tenant data when editing
  useEffect(() => {
    if (id) {
      loadTenant(id);
    }
  }, [id]);

  const loadTenant = async (tenantId: string) => {
    setLoading(true);
    try {
      const result = await tenantService.getById(tenantId);

      if (result.isErr()) {
        message.error(result.error.message);
        navigate('/tenants');
        return;
      }

      const apiResponse = result.value;
      if (!isApiSuccess(apiResponse)) {
        message.error(apiResponse.error?.message || 'Failed to load tenant');
        navigate('/tenants');
        return;
      }

      const tenantData = apiResponse.data;
      setTenant(tenantData);
      form.setFieldsValue({
        name: tenantData.name,
        db_url: tenantData.db_url,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to load tenant');
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: TenantFormValues) => {
    setSubmitting(true);

    try {
      if (isEditMode && id) {
        // Update existing tenant
        const updateResult = await tenantService.update(id, {
          name: values.name,
          ...(values.db_url && { db_url: values.db_url }),
        });

        if (updateResult.isErr()) {
          throw new Error(updateResult.error.message);
        }

        if (!isApiSuccess(updateResult.value)) {
          throw new Error(updateResult.value.error?.message || 'Failed to update tenant');
        }

        message.success('Tenant updated successfully!');
      } else {
        // Create new tenant
        const createPayload: CreateTenantDTO = {
          id: crypto.randomUUID(),
          name: values.name,
          db_url: values.db_url,
        };

        const createResult = await tenantService.create(createPayload);

        if (createResult.isErr()) {
          throw new Error(createResult.error.message);
        }

        if (!isApiSuccess(createResult.value)) {
          throw new Error(createResult.value.error?.message || 'Failed to create tenant');
        }

        message.success('Tenant created successfully!');
      }

      // Navigate back to tenants list
      navigate('/tenants');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'An error occurred while saving');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/tenants');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 800 }}>
      {/* Header */}
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleCancel}
          style={{ marginBottom: 16, padding: 0 }}
        >
          Back to Tenants
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          {isEditMode ? 'Edit Tenant' : 'Create New Tenant'}
        </Title>
        <Text type="secondary">
          {isEditMode
            ? `Editing tenant: ${tenant?.name || id}`
            : 'Add a new tenant to your platform'}
        </Text>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: '',
            db_url: '',
          }}
          requiredMark="optional"
        >
          <Form.Item
            name="name"
            label="Tenant Name"
            rules={[
              { required: true, message: 'Please enter a tenant name' },
              { min: 2, message: 'Name must be at least 2 characters' },
              { max: 100, message: 'Name must be less than 100 characters' },
            ]}
            tooltip="A unique name to identify this tenant"
          >
            <Input
              placeholder="Enter tenant name"
              size="large"
              autoFocus={!isEditMode}
            />
          </Form.Item>

          <Form.Item
            name="db_url"
            label="Database Connection URL"
            rules={[
              {
                required: !isEditMode,
                message: 'Please enter a database URL',
              },
              {
                validator: (_rule, value) => {
                  // Let required rule handle empty values
                  if (!value) {
                    return Promise.resolve();
                  }
                  return isValidPostgresConnectionString(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Invalid PostgreSQL connection string format'));
                },
              },
            ]}
            tooltip="PostgreSQL connection string (e.g., postgres://user:pass@host:5432/db)"
            extra={isEditMode ? 'Leave empty to keep the existing database URL' : undefined}
          >
            <Input.Password
              placeholder="postgres://username:password@localhost:5432/database"
              size="large"
              style={{ fontFamily: 'monospace', fontSize: 13 }}
              visibilityToggle={{
                visible: showDbUrl,
                onVisibleChange: setShowDbUrl,
              }}
            />
          </Form.Item>

          <Alert
            message="Security Notice"
            description="Database credentials are stored securely and encrypted. The connection string is hidden by default to prevent accidental exposure."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                size="large"
              >
                {isEditMode ? 'Update Tenant' : 'Create Tenant'}
              </Button>
              <Button onClick={handleCancel} size="large" disabled={submitting}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
};
