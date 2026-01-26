import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import type { Tenant as TenantRecord } from '@/types/tenant';
import { isApiSuccess } from '@/types/api';
import {
  Button,
  Input,
  Card,
  Table,
  Space,
  Typography,
  Divider,
  Select,
  AntdApp,
  DatePicker,
  Spin,
  Skeleton,
} from '@/components/AntdComponents';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
} from '@/components/AntdComponents';
import { tenantService } from '@/services/api';

// Field type constants to avoid duplication
const TEXT_FIELDS = ['id', 'name', 'db_url'] as const;
const DATE_FIELDS = ['created_at', 'updated_at'] as const;

const operatorLabels: Record<string, string> = {
  contains: 'Contains',
  equals: 'Equals',
  gt: 'Greater Than',
  gte: 'Greater or Equal',
  lt: 'Less Than',
  lte: 'Less or Equal',
};

// Power filter type with stable unique id
type PowerFilter = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

// Generate unique filter ID
const generateFilterId = (): string => `filter-${crypto.randomUUID().slice(0, 8)}`;

export const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const { message } = AntdApp.useApp();

  const [deleteTenantId, setDeleteTenantId] = useState<TenantRecord['id'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [powerFilters, setPowerFilters] = useState<PowerFilter[]>([
    { id: generateFilterId(), field: 'name', operator: 'contains', value: '' },
  ]);
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
  const handlePaginationChange = async (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }));

    // Calculate offset for backend API
    const offset = (page - 1) * pageSize;
    await loadTenants({ offset, limit: pageSize });
  };

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

  // Handle delete - open confirmation modal
  const handleDelete = (id: TenantRecord['id']) => {
    setDeleteTenantId(id);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (deleteTenantId) {
      try {
        const deleteResult = await tenantService.delete(deleteTenantId);
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
      } finally {
        setDeleteTenantId(null);
      }
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteTenantId(null);
  };

  // Open form for new tenant - navigate to create page
  const handleNewTenant = () => {
    navigate('/tenants/new');
  };

  // Power search functions
  const addFilter = () => {
    setPowerFilters([
      ...powerFilters,
      { id: generateFilterId(), field: 'name', operator: 'contains', value: '' },
    ]);
  };

  const removeFilter = (index: number) => {
    setPowerFilters(powerFilters.filter((_, i) => i !== index));
  };

  // Helper function to get valid operators for a field type
  const getOperatorsForField = (field: string): string[] => {
    if ((TEXT_FIELDS as readonly string[]).includes(field)) {
      return ['contains', 'equals'];
    } else if ((DATE_FIELDS as readonly string[]).includes(field)) {
      return ['equals', 'gt', 'gte', 'lt', 'lte'];
    }

    // Default fallback
    return ['contains', 'equals'];
  };

  // Helper function to check if a field is a date field
  const isDateField = (field: string): boolean =>
    (DATE_FIELDS as readonly string[]).includes(field);

  // Helper function to convert ISO string to dayjs object
  const isoToDayjs = (isoString: string): Dayjs | null => {
    if (!isoString) return null;
    const d = dayjs(isoString);
    return d.isValid() ? d : null;
  };

  const updateFilter = (
    index: number,
    key: 'field' | 'operator' | 'value',
    value: string
  ): void => {
    const updated = [...powerFilters];
    const currentFilter = updated[index];

    if (!currentFilter) {
      return;
    }

    // If field is changing, check if current operator is still valid and clear stale values
    if (key === 'field') {
      const validOperators = getOperatorsForField(value);
      const currentOperator = currentFilter.operator;
      const isDateFieldValue = isDateField(value);
      const wasDateField = isDateField(currentFilter.field);

      // If field type changed (date <-> text), clear the value
      const shouldClearValue = isDateFieldValue !== wasDateField;

      // If current operator is valid for the new field, keep it; otherwise reset to first valid
      if (validOperators.includes(currentOperator)) {
        updated[index] = {
          ...currentFilter,
          [key]: value,
          value: shouldClearValue ? '' : currentFilter.value,
        };
      } else {
        updated[index] = {
          ...currentFilter,
          [key]: value,
          operator: validOperators[0] ?? 'contains',
          value: shouldClearValue ? '' : currentFilter.value,
        };
      }
    } else {
      updated[index] = { ...currentFilter, [key]: value };
    }

    setPowerFilters(updated);
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const validFilters = powerFilters.filter(f => f.value.trim() !== '');
      if (validFilters.length === 0) {
        // No filters, load all
        setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
        await loadTenants({ offset: 0, limit: pagination.pageSize });
        return;
      }

      // Validate date fields before sending
      // Note: DatePicker already provides ISO strings, so we only validate format
      const validatedFilters = validFilters.map(filter => {
        if (isDateField(filter.field)) {
          // Just validate that the value is a valid date string
          const dateValue = new Date(filter.value);
          if (Number.isNaN(dateValue.getTime())) {
            throw new TypeError(`Invalid date format for field ${filter.field}: ${filter.value}`);
          }
          // Return filter as-is since DatePicker already provides ISO format
          return filter;
        }
        return filter;
      });

      const response = await tenantService.filter({
        filters: validatedFilters,
        limit: pagination.pageSize, // Use current page size for filtered results
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
        // Data is already TenantRecord[] from the API
        setTenants(data);
        setPagination(prev => ({ ...prev, current: 1, total: data.length }));
      } else {
        const paginated = data;
        setTenants(paginated.data);
        setPagination(prev => ({
          ...prev,
          current: 1,
          total: paginated.total,
        }));
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to filter tenants');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setPowerFilters([{ id: generateFilterId(), field: 'name', operator: 'contains', value: '' }]);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
    await loadTenants({ offset: 0, limit: pagination.pageSize });
  };

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
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              handleDelete(tenant.id);
            }}
          />
        </Space>
      ),
    },
  ];

  // For filter validation, add error state for invalid dates
  // Filter errors handled in applyFilters

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
        {/* Search Filters */}
        <Card
          title="Search Filters"
          size="small"
          style={{ borderRadius: '8px', marginTop: '16px' }}
          data-testid="search-filters-card"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {powerFilters.map((filter, index) => (
              <div
                key={filter.id}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                data-testid={`filter-row-${index}`}
              >
                <Select
                  style={{ width: 150 }}
                  value={filter.field}
                  onChange={value => {
                    updateFilter(index, 'field', value);
                  }}
                  placeholder="Field"
                  data-testid={`filter-field-select-${index}`}
                >
                  <Select.Option value="id">ID</Select.Option>
                  <Select.Option value="name">Name</Select.Option>
                  <Select.Option value="db_url">Database URL</Select.Option>
                  <Select.Option value="created_at">Created At</Select.Option>
                  <Select.Option value="updated_at">Updated At</Select.Option>
                </Select>

                <Select
                  style={{ width: 120 }}
                  value={filter.operator}
                  onChange={value => {
                    updateFilter(index, 'operator', value);
                  }}
                  placeholder="Operator"
                  data-testid={`filter-operator-select-${index}`}
                >
                  {getOperatorsForField(filter.field).map(op => (
                    <Select.Option key={op} value={op}>
                      {operatorLabels[op] ?? op}
                    </Select.Option>
                  ))}
                </Select>

                {isDateField(filter.field) ? (
                  <DatePicker
                    style={{ width: 200, flex: 1, minWidth: '150px' }}
                    placeholder="Select date"
                    showTime
                    allowClear
                    value={isoToDayjs(filter.value)}
                    onChange={date => {
                      if (date?.isValid()) {
                        const iso = date.toDate().toISOString();
                        updateFilter(index, 'value', iso);
                      } else {
                        updateFilter(index, 'value', '');
                      }
                    }}
                    data-testid={`filter-value-date-${index}`}
                  />
                ) : (
                  <Input
                    style={{ width: 200, flex: 1, minWidth: '150px' }}
                    placeholder="Value"
                    value={filter.value}
                    onChange={e => {
                      updateFilter(index, 'value', e.target.value);
                    }}
                    data-testid={`filter-value-input-${index}`}
                  />
                )}

                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => {
                    removeFilter(index);
                  }}
                  disabled={powerFilters.length <= 1}
                  data-testid={`remove-filter-${index}`}
                >
                  Remove
                </Button>

                {index === powerFilters.length - 1 && (
                  <Button
                    type="text"
                    icon={<PlusCircleOutlined />}
                    onClick={addFilter}
                    data-testid="add-filter-button"
                  >
                    Add Filter
                  </Button>
                )}
              </div>
            ))}

            <Divider style={{ margin: '8px 0' }} />

            <Space>
              <Button
                type="primary"
                onClick={applyFilters}
                disabled={loading}
                data-testid="apply-filters-button"
              >
                Apply Filters
              </Button>
              <Button
                onClick={clearFilters}
                disabled={loading}
                data-testid="clear-filters-button"
              >
                Clear All
              </Button>
            </Space>

            <div style={{ fontSize: '14px', color: '#666' }}>
              <Typography.Text strong>Note:</Typography.Text> Pick a date/time; it's sent as
              ISO-8601 (UTC). Empty values are ignored.
            </div>
          </Space>
        </Card>

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
