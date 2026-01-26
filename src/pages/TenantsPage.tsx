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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: TenantRecord, b: TenantRecord) => a.name.localeCompare(b.name),
    },
    {
      title: 'Database URL',
      dataIndex: 'db_url',
      key: 'db_url',
      width: 250,
      ellipsis: true,
      render: (dbUrl: string) => {
        const masked = formatDbUrl(dbUrl);
        return (
          <span
            title={masked}
            style={{
              fontSize: '12px',
              color: 'var(--tertiary-600)',
              fontFamily: 'monospace',
            }}
          >
            {masked.length > 30 ? masked.substring(0, 27) + '...' : masked}
          </span>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDate(date),
      sorter: (a: TenantRecord, b: TenantRecord) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => formatDate(date),
      sorter: (a: TenantRecord, b: TenantRecord) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, tenant: TenantRecord) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              handleEdit(tenant);
            }}
            style={{
              color: '#1890ff',
            }}
          />
          <Popconfirm
            title="Delete Tenant"
            description="Are you sure you want to delete this tenant? This action cannot be undone."
            onConfirm={() => handleDelete(tenant.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
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
        <Card>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      );
    }

    if (tenants.length === 0) {
      return (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Typography.Title level={4}>No Tenants Found</Typography.Title>
            <Typography.Text type="secondary">
              Create your first tenant to get started.
            </Typography.Text>
            <Button type="primary" onClick={handleNewTenant} style={{ marginTop: 16 }}>
              Create Tenant
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <>
        {/* Dynamic Filter */}
        <div style={{ marginTop: 16 }} data-testid="search-filters-card">
          <DynamicFilter
            fields={TENANT_FILTER_FIELDS}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
            loading={filterLoading}
          />
        </div>

        {/* Tenants Table */}
        <Card
          title={`Tenants (${tenants.length})`}
          style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <Table
            columns={columns}
            dataSource={tenants}
            rowKey="id"
            loading={loading}
            rowClassName={(_record, index) => (index % 2 === 0 ? 'stripe-row' : '')}
            pagination={tablePagination}
            data-testid="tenants-table"
            locale={{ emptyText: 'No tenants match your search.' }}
            style={{
              border: '1px solid #e8e8e8',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          />
        </Card>
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
