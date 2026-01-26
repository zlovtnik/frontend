import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicFilter, type ActiveFilter, type FilterField } from '@/components/DynamicFilter';
import type { Tenant as TenantRecord } from '@/types/tenant';
import { isApiSuccess } from '@/types/api';
import {
  Button,
  Card,
  Table,
  Space,
  Typography,
  Divider,
  AntdApp,
  Skeleton,
  Popconfirm,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@/components/AntdComponents';
import { tenantService } from '@/services/api';

// Define filter fields for tenants
const TENANT_FILTER_FIELDS: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'db_url', label: 'Database URL', type: 'text' },
  { key: 'created_at', label: 'Created At', type: 'date' },
  { key: 'updated_at', label: 'Updated At', type: 'date' },
];

export const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const { message } = AntdApp.useApp();

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [currentApiFilters, setCurrentApiFilters] = useState<
    { id: string; field: string; operator: string; value: string }[] | null
  >(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0,
  });

  // Load tenants from API with pagination
  const loadTenants = useCallback(async (params?: { offset?: number; limit?: number }) => {
    try {
      setLoading(true);
      const result = await tenantService.getAllWithPagination(params);

      if (result.isErr()) {
        message.error(result.error.message);
        setTenants([]);
        setPagination(prev => ({ ...prev, total: 0 }));
        return;
      }

      const apiResponse = result.value;

      // Handle both expected API response format and actual backend format
      // The backend returns { message: "ok", data: [...], metadata: {...} }
      // instead of { status: "success", data: {...}, message: "ok" }
      const isSuccess =
        isApiSuccess(apiResponse) ||
        (apiResponse.message === 'ok' && 'data' in apiResponse && apiResponse.data !== undefined);

      if (!isSuccess) {
        const errorMessage = 'error' in apiResponse ? apiResponse.error?.message : undefined;
        message.error(errorMessage || 'Failed to load tenants');
        setTenants([]);
        setPagination(prev => ({ ...prev, total: 0 }));
        return;
      }

      // Type assertion is safe here because isSuccess guarantees data exists
      const data = (apiResponse as { data: { data: TenantRecord[]; total: number } }).data;
      setTenants(data.data);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to load tenants');
      setTenants([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [message]);

  // Load tenants on component mount
  useEffect(() => {
    loadTenants({ offset: 0, limit: pagination.pageSize });
  }, [loadTenants, pagination.pageSize]);

  // Handle pagination changes (page size and page number)
  const handlePaginationChange = useCallback(
    async (page: number, pageSize: number) => {
      setPagination(prev => ({ ...prev, current: page, pageSize }));
      const offset = (page - 1) * pageSize;

      // If we have active filters, use filter API with offset
      if (currentApiFilters && currentApiFilters.length > 0) {
        try {
          setFilterLoading(true);
          const response = await tenantService.filter({
            filters: currentApiFilters,
            limit: pageSize,
            offset,
          });

          if (response.isErr()) {
            throw new Error(response.error.message);
          }

          const apiResponse = response.value;
          if (!isApiSuccess(apiResponse)) {
            throw new Error(apiResponse.error?.message || 'Failed to filter tenants');
          }

          const data = apiResponse.data;
          if (Array.isArray(data)) {
            setTenants(data);
          } else {
            setTenants(data.data);
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Failed to load filtered tenants');
        } finally {
          setFilterLoading(false);
        }
      } else {
        // No filters, load all with pagination
        await loadTenants({ offset, limit: pageSize });
      }
    },
    [currentApiFilters, loadTenants, message]
  );

  // Custom pagination config that extends pharmacyPaginationConfig with dynamic values
  const tablePagination = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    onChange: handlePaginationChange,
    showSizeChanger: false,
    showQuickJumper: false,
  };

  // Handle edit - navigate to edit page
  const handleEdit = (tenant: TenantRecord) => {
    navigate(`/tenants/${tenant.id}/edit`);
  };

  // Handle delete - call API directly
  const handleDelete = async (id: TenantRecord['id']) => {
    try {
      const deleteResult = await tenantService.delete(id);
      if (deleteResult.isErr()) {
        throw new Error(deleteResult.error.message);
      }

      if (!isApiSuccess(deleteResult.value)) {
        throw new Error(deleteResult.value.error?.message || 'Failed to delete tenant');
      }
      // Update tenants state after successful API response
      await loadTenants({
        offset: (pagination.current - 1) * pagination.pageSize,
        limit: pagination.pageSize,
      });
      message.success('Tenant deleted successfully!');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete tenant');
    }
  };

  // Open form for new tenant - navigate to create page
  const handleNewTenant = () => {
    navigate('/tenants/new');
  };

  // Handle filter apply from DynamicFilter component
  const handleFilterApply = useCallback(
    async (filters: ActiveFilter[]) => {
      try {
        setFilterLoading(true);

        // Convert ActiveFilter to API format and store for pagination
        const apiFilters = filters.map(f => ({
          id: f.id,
          field: f.field,
          operator: f.operator,
          value: f.value,
        }));
        setCurrentApiFilters(apiFilters);

        const response = await tenantService.filter({
          filters: apiFilters,
          limit: pagination.pageSize,
          offset: 0, // Reset to first page when applying new filters
        });

        if (response.isErr()) {
          throw new Error(response.error.message);
        }

        const apiResponse = response.value;

        if (!isApiSuccess(apiResponse)) {
          throw new Error(apiResponse.error?.message || 'Failed to filter tenants');
        }

        const data = apiResponse.data;

        if (Array.isArray(data)) {
          setTenants(data);
          setPagination(prev => ({ ...prev, current: 1, total: data.length }));
        } else {
          setTenants(data.data);
          setPagination(prev => ({
            ...prev,
            current: 1,
            total: data.total,
          }));
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to filter tenants');
      } finally {
        setFilterLoading(false);
      }
    },
    [message, pagination.pageSize]
  );

  // Handle filter clear
  const handleFilterClear = useCallback(async () => {
    setCurrentApiFilters(null);
    setPagination(prev => ({ ...prev, current: 1 }));
    await loadTenants({ offset: 0, limit: pagination.pageSize });
  }, [loadTenants, pagination.pageSize]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format database URL for display (hide password if present)
  const formatDbUrl = (url: string) => {
    try {
      // Hide password from display
      const displayUrl = url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
      return displayUrl;
    } catch {
      return '<invalid-db-url>';
    }
  };

  // Table columns for tenants display
  const columns = [
    {
      title: 'Tenant',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: TenantRecord, b: TenantRecord) => a.name.localeCompare(b.name),
      render: (name: string, record: TenantRecord) => (
        <div>
          <div style={{ fontWeight: 500, color: '#262626', marginBottom: 2 }}>{name}</div>
          <div
            style={{
              fontSize: 12,
              color: '#8c8c8c',
              fontFamily: 'monospace',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={record.id}
          >
            {record.id}
          </div>
        </div>
      ),
    },
    {
      title: 'Database',
      dataIndex: 'db_url',
      key: 'db_url',
      width: 280,
      render: (dbUrl: string) => {
        const masked = formatDbUrl(dbUrl);

        // Detect database type from URL (case-insensitive)
        const getDbType = (url: string): string => {
          const lower = url.toLowerCase();
          if (lower.includes('oracle')) return 'Oracle';
          if (lower.includes('postgres')) return 'PostgreSQL';
          if (lower.includes('mysql')) return 'MySQL';
          return 'Database';
        };

        const getTypeColor = (type: string): string => {
          const colors: Record<string, string> = {
            Oracle: '#f5222d',
            PostgreSQL: '#1890ff',
            MySQL: '#fa8c16',
          };
          return colors[type] || '#8c8c8c';
        };

        const dbType = getDbType(dbUrl);
        const typeColor = getTypeColor(dbType);

        return (
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: `${typeColor}15`,
                color: typeColor,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {dbType}
            </span>
            <div
              style={{
                fontSize: 12,
                color: '#595959',
                fontFamily: 'monospace',
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={masked}
            >
              {masked}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => (
        <span style={{ color: '#595959', fontSize: 13 }}>{formatDate(date)}</span>
      ),
      sorter: (a: TenantRecord, b: TenantRecord) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, tenant: TenantRecord) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(tenant)}
            style={{
              color: '#595959',
              width: 32,
              height: 32,
              borderRadius: 6,
            }}
          />
          <Popconfirm
            title="Delete Tenant"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(tenant.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              style={{
                color: '#8c8c8c',
                width: 32,
                height: 32,
                borderRadius: 6,
              }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Render content based on loading/empty/data states
  const renderContent = () => {
    if (loading) {
      return (
        <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      );
    }

    return (
      <>
        {/* Dynamic Filter - Always visible */}
        <div data-testid="search-filters-card">
          <DynamicFilter
            fields={TENANT_FILTER_FIELDS}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
            loading={filterLoading}
          />
        </div>

        {/* Tenants Table */}
        <Card
          style={{
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            marginTop: 16,
          }}
          styles={{
            header: {
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 24px',
            },
            body: {
              padding: 0,
            },
          }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Tenants</span>
              <span
                style={{
                  background: '#f0f5ff',
                  color: '#1890ff',
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {pagination.total}
              </span>
            </div>
          }
        >
          {tenants.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <PlusOutlined style={{ fontSize: 28, color: '#1890ff' }} />
              </div>
              <Typography.Title level={4} style={{ marginBottom: 8, color: '#262626' }}>
                No tenants yet
              </Typography.Title>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
                {currentApiFilters && currentApiFilters.length > 0
                  ? 'No tenants match your filter criteria. Try adjusting your filters.'
                  : 'Get started by creating your first tenant.'}
              </Typography.Text>
              {!(currentApiFilters && currentApiFilters.length > 0) && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleNewTenant}>
                  Create First Tenant
                </Button>
              )}
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={tenants}
              rowKey="id"
              loading={filterLoading}
              pagination={{
                ...tablePagination,
                style: { padding: '12px 24px', margin: 0 },
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} tenants`,
              }}
              data-testid="tenants-table"
              style={{ overflow: 'hidden' }}
              rowClassName={() => 'tenant-table-row'}
            />
          )}
        </Card>

        <style>{`
          .tenant-table-row:hover {
            background: #fafafa !important;
          }
          .tenant-table-row td {
            padding: 16px 24px !important;
            border-bottom: 1px solid #f5f5f5 !important;
          }
          .ant-table-thead > tr > th {
            background: #fafafa !important;
            font-weight: 600 !important;
            color: #595959 !important;
            font-size: 13px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            padding: 14px 24px !important;
            border-bottom: 1px solid #f0f0f0 !important;
          }
          .ant-table-tbody > tr > td {
            transition: background 0.2s ease !important;
          }
        `}</style>
      </>
    );
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header - always visible */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Tenants
          </Typography.Title>
          <Typography.Text type="secondary">
            Manage tenant configurations and database connections
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewTenant}>
          Add Tenant
        </Button>
      </div>

      <Divider />

      {renderContent()}
    </Space>
  );
};
