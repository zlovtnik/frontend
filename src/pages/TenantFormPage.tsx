/**
 * Tenant Form Page - Dedicated page for creating and editing tenants
 * Supports PostgreSQL, Oracle, MySQL and other database types
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Select,
  Row,
  Col,
} from '@/components/AntdComponents';
import { ArrowLeftOutlined, SaveOutlined, DatabaseOutlined } from '@ant-design/icons';
import { tenantService } from '@/services/api';
import { isApiSuccess } from '@/types/api';
import type { Tenant, CreateTenantDTO } from '@/types/tenant';

const { Title, Text } = Typography;

type DatabaseType = 'postgres' | 'oracle' | 'mysql' | 'custom';

/** Result of a tenant operation */
interface OperationResult {
  success: boolean;
  message: string;
}

interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  // Oracle specific
  serviceName?: string;
  sid?: string;
  // Custom
  customUrl?: string;
}

type TenantFormValues = {
  name: string;
  db_config: DatabaseConfig;
};

const DATABASE_PRESETS: Record<
  DatabaseType,
  { label: string; defaultPort: string; color: string; icon: string }
> = {
  postgres: { label: 'PostgreSQL', defaultPort: '5432', color: '#1890ff', icon: '🐘' },
  oracle: { label: 'Oracle', defaultPort: '1521', color: '#f5222d', icon: '🔶' },
  mysql: { label: 'MySQL', defaultPort: '3306', color: '#fa8c16', icon: '🐬' },
  custom: { label: 'Custom URL', defaultPort: '', color: '#8c8c8c', icon: '🔧' },
};

// Build connection string from config
const buildConnectionString = (config: DatabaseConfig): string => {
  if (config.type === 'custom') {
    return config.customUrl || '';
  }

  const { host, port, database, username, password } = config;

  if (!host) return '';

  // URL-encode credentials to handle special characters (e.g., @, :, /, etc.)
  const encodedUser = encodeURIComponent(username || '');
  const encodedPass = encodeURIComponent(password || '');
  const encodedDb = encodeURIComponent(database || '');

  switch (config.type) {
    case 'postgres':
      return `postgres://${encodedUser}:${encodedPass}@${host}:${port || '5432'}/${encodedDb}`;
    case 'oracle': {
      // Oracle connection string format
      if (config.serviceName) {
        const encodedService = encodeURIComponent(config.serviceName);
        return `oracle://${encodedUser}:${encodedPass}@${host}:${port || '1521'}/${encodedService}`;
      } else if (config.sid) {
        const encodedSid = encodeURIComponent(config.sid);
        return `oracle://${encodedUser}:${encodedPass}@${host}:${port || '1521'}:${encodedSid}`;
      }
      return `oracle://${encodedUser}:${encodedPass}@${host}:${port || '1521'}/${encodedDb}`;
    }
    case 'mysql':
      return `mysql://${encodedUser}:${encodedPass}@${host}:${port || '3306'}/${encodedDb}`;
    default:
      return '';
  }
};

export const TenantFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<TenantFormValues>();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Watch form values for database type (single source of truth from Form)
  const watchedDbType = Form.useWatch(['db_config', 'type'], form) as DatabaseType | undefined;
  const oracleConnectMethod = Form.useWatch(['db_config', 'oracleConnectMethod'], form) as 'serviceName' | 'sid' | undefined;
  
  // Use watched value with fallback to postgres
  const dbType = watchedDbType || 'postgres';

  const isEditMode = Boolean(id);

  const currentPreset = useMemo(() => DATABASE_PRESETS[dbType], [dbType]);

  // Load tenant data when editing
  useEffect(() => {
    if (id) {
      loadTenant(id);
    }
  }, [id]);

  // Parse existing connection string to config
  const parseConnectionString = (url: string): Partial<DatabaseConfig> => {
    try {
      // Detect type from URL
      let type: DatabaseType = 'custom';
      if (url.startsWith('postgres://')) type = 'postgres';
      else if (url.startsWith('oracle://')) type = 'oracle';
      else if (url.startsWith('mysql://')) type = 'mysql';

      if (type === 'custom') {
        return { type: 'custom', customUrl: url };
      }

      const urlObj = new URL(url);
      return {
        type,
        host: urlObj.hostname,
        port: urlObj.port || DATABASE_PRESETS[type].defaultPort,
        database: urlObj.pathname.slice(1),
        username: urlObj.username,
        password: urlObj.password,
      };
    } catch {
      return { type: 'custom', customUrl: url };
    }
  };

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

      // Parse existing db_url into config - Form is source of truth for type
      const parsedConfig = parseConnectionString(tenantData.db_url);

      form.setFieldsValue({
        name: tenantData.name,
        db_config: {
          type: parsedConfig.type || 'custom',
          host: parsedConfig.host || '',
          port: parsedConfig.port || '',
          database: parsedConfig.database || '',
          username: parsedConfig.username || '',
          password: parsedConfig.password || '',
          customUrl: parsedConfig.customUrl || '',
        },
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to load tenant');
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

  /** Update an existing tenant */
  const updateTenant = async (tenantId: string, name: string, dbUrl: string): Promise<OperationResult> => {
    const updateResult = await tenantService.update(tenantId, {
      name,
      ...(dbUrl && { db_url: dbUrl }),
    });

    if (updateResult.isErr()) {
      return { success: false, message: updateResult.error.message };
    }

    if (!isApiSuccess(updateResult.value)) {
      return { success: false, message: updateResult.value.error?.message || 'Failed to update tenant' };
    }

    return { success: true, message: 'Tenant updated successfully!' };
  };

  /** Create a new tenant */
  const createTenant = async (name: string, dbUrl: string): Promise<OperationResult> => {
    const createPayload: CreateTenantDTO = {
      id: crypto.randomUUID(),
      name,
      db_url: dbUrl,
    };

    const createResult = await tenantService.create(createPayload);

    if (createResult.isErr()) {
      return { success: false, message: createResult.error.message };
    }

    if (!isApiSuccess(createResult.value)) {
      return { success: false, message: createResult.value.error?.message || 'Failed to create tenant' };
    }

    return { success: true, message: 'Tenant created successfully!' };
  };

  const handleSubmit = async (values: TenantFormValues) => {
    setSubmitting(true);

    const dbUrl = buildConnectionString(values.db_config);

    if (!dbUrl && !isEditMode) {
      message.error('Please fill in the database connection details');
      setSubmitting(false);
      return;
    }

    try {
      const result = isEditMode && id
        ? await updateTenant(id, values.name, dbUrl)
        : await createTenant(values.name, dbUrl);

      if (result.success) {
        message.success(result.message);
        navigate('/tenants');
      } else {
        throw new Error(result.message);
      }
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
            : 'Add a new tenant with database connection'}
        </Text>
      </div>

      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: '',
            db_config: {
              type: 'postgres',
              host: '',
              port: '5432',
              database: '',
              username: '',
              password: '',
              customUrl: '',
            },
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
          >
            <Input placeholder="Enter tenant name" size="large" autoFocus={!isEditMode} />
          </Form.Item>

          <Divider style={{ margin: '24px 0' }}>
            <Space>
              <DatabaseOutlined />
              <span>Database Connection</span>
            </Space>
          </Divider>

          {/* Database Type Selector */}
          <Form.Item name={['db_config', 'type']} label="Database Type">
            <Select
              size="large"
              onChange={(type: DatabaseType) => {
                form.setFieldValue(['db_config', 'port'], DATABASE_PRESETS[type].defaultPort);
              }}
              options={Object.entries(DATABASE_PRESETS).map(([key, preset]) => ({
                value: key,
                label: (
                  <Space>
                    <span>{preset.icon}</span>
                    <span style={{ color: preset.color, fontWeight: 500 }}>{preset.label}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          {dbType === 'custom' ? (
            /* Custom URL Input */
            <Form.Item
              name={['db_config', 'customUrl']}
              label="Connection String"
              rules={[{ required: true, message: 'Please enter a connection string' }]}
              extra="Enter the full database connection URL"
            >
              <Input.TextArea
                placeholder="postgres://user:pass@host:5432/db or oracle://..."
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            </Form.Item>
          ) : (
            /* Structured Database Fields */
            <>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name={['db_config', 'host']}
                    label="Host"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="localhost or db.example.com" size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['db_config', 'port']}
                    label="Port"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder={currentPreset.defaultPort} size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name={['db_config', 'database']}
                label={dbType === 'oracle' ? 'Database / Service Name' : 'Database Name'}
                rules={[{ required: true, message: 'Please enter the database name' }]}
              >
                <Input
                  placeholder={dbType === 'oracle' ? 'ORCL or service_name' : 'my_database'}
                  size="large"
                />
              </Form.Item>

              {watchedDbType === 'oracle' && (
                <>
                  <Form.Item
                    name={['db_config', 'oracleConnectMethod']}
                    label="Connection Method"
                    initialValue="serviceName"
                  >
                    <Select
                      size="large"
                      options={[
                        { value: 'serviceName', label: 'Service Name' },
                        { value: 'sid', label: 'SID' },
                      ]}
                      onChange={() => {
                        // Clear both fields when switching method
                        form.setFieldValue(['db_config', 'serviceName'], undefined);
                        form.setFieldValue(['db_config', 'sid'], undefined);
                      }}
                    />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name={['db_config', 'serviceName']}
                        label="Service Name"
                        rules={[
                          {
                            required: oracleConnectMethod === 'serviceName',
                            message: 'Service Name is required',
                          },
                        ]}
                      >
                        <Input
                          placeholder="orcl.example.com"
                          size="large"
                          disabled={oracleConnectMethod !== 'serviceName'}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={['db_config', 'sid']}
                        label="SID"
                        rules={[
                          {
                            required: oracleConnectMethod === 'sid',
                            message: 'SID is required',
                          },
                        ]}
                      >
                        <Input
                          placeholder="ORCL"
                          size="large"
                          disabled={oracleConnectMethod !== 'sid'}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              <Divider dashed style={{ margin: '16px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Credentials
                </Text>
              </Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['db_config', 'username']}
                    label="Username"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="db_user" size="large" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['db_config', 'password']}
                    label="Password"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input.Password
                      placeholder="••••••••"
                      size="large"
                      autoComplete="new-password"
                      visibilityToggle={{
                        visible: showPassword,
                        onVisibleChange: setShowPassword,
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Alert
            message="Security Notice"
            description="Database credentials are stored securely. The connection is tested before saving."
            type="info"
            showIcon
            style={{ marginBottom: 24, marginTop: 16 }}
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
