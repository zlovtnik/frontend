/**
 * DynamicFilter Component
 * A clean, single-line dynamic filter with field selector, operator, and value input.
 * Beautiful, simple, and perfect for data filtering.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Select, Input, Button, Space, DatePicker, Tag, Tooltip } from 'antd';
import { FilterOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select';
  options?: { label: string; value: string }[];
}

export interface FilterOperator {
  key: string;
  label: string;
  symbol: string;
}

export interface ActiveFilter {
  id: string;
  field: string;
  fieldLabel: string;
  operator: string;
  operatorLabel: string;
  operatorSymbol: string;
  value: string;
  displayValue: string;
}

interface DynamicFilterProps {
  fields: FilterField[];
  onApply: (filters: ActiveFilter[]) => void;
  onClear: () => void;
  loading?: boolean;
}

// Operators by field type
const TEXT_OPERATORS: FilterOperator[] = [
  { key: 'contains', label: 'Contains', symbol: '~' },
  { key: 'equals', label: 'Equals', symbol: '=' },
];

const DATE_OPERATORS: FilterOperator[] = [
  { key: 'equals', label: 'Equals', symbol: '=' },
  { key: 'gt', label: 'After', symbol: '>' },
  { key: 'gte', label: 'On or After', symbol: '≥' },
  { key: 'lt', label: 'Before', symbol: '<' },
  { key: 'lte', label: 'On or Before', symbol: '≤' },
];

const NUMBER_OPERATORS: FilterOperator[] = [
  { key: 'equals', label: 'Equals', symbol: '=' },
  { key: 'gt', label: 'Greater Than', symbol: '>' },
  { key: 'gte', label: 'Greater or Equal', symbol: '≥' },
  { key: 'lt', label: 'Less Than', symbol: '<' },
  { key: 'lte', label: 'Less or Equal', symbol: '≤' },
];

const generateId = (): string => `f-${crypto.randomUUID().slice(0, 8)}`;

// Helper to get default operator based on field type
const getDefaultOperatorForType = (fieldType?: FilterField['type']): string => {
  switch (fieldType) {
    case 'date':
      return DATE_OPERATORS[0]?.key ?? 'equals';
    case 'number':
      return NUMBER_OPERATORS[0]?.key ?? 'equals';
    default:
      return TEXT_OPERATORS[0]?.key ?? 'contains';
  }
};

export const DynamicFilter: React.FC<DynamicFilterProps> = ({
  fields,
  onApply,
  onClear,
  loading = false,
}) => {
  const [selectedField, setSelectedField] = useState<string>(fields[0]?.key ?? '');
  const [selectedOperator, setSelectedOperator] = useState<string>(() =>
    getDefaultOperatorForType(fields[0]?.type)
  );
  const [filterValue, setFilterValue] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Get current field config
  const currentField = useMemo(
    () => fields.find(f => f.key === selectedField),
    [fields, selectedField]
  );

  // Get operators for current field type
  const operators = useMemo(() => {
    if (!currentField) return TEXT_OPERATORS;
    switch (currentField.type) {
      case 'date':
        return DATE_OPERATORS;
      case 'number':
        return NUMBER_OPERATORS;
      default:
        return TEXT_OPERATORS;
    }
  }, [currentField]);

  // Reset operator when field changes
  const handleFieldChange = useCallback(
    (value: string) => {
      setSelectedField(value);
      const newField = fields.find(f => f.key === value);

      // Determine operators based on field type
      let newOperators = TEXT_OPERATORS;
      if (newField?.type === 'date') {
        newOperators = DATE_OPERATORS;
      } else if (newField?.type === 'number') {
        newOperators = NUMBER_OPERATORS;
      }

      setSelectedOperator(newOperators[0]?.key ?? 'contains');
      setFilterValue('');
    },
    [fields]
  );

  // Format display value
  const formatDisplayValue = useCallback((value: string, fieldType?: string): string => {
    if (fieldType === 'date' && value) {
      const parsed = dayjs(value);
      if (parsed.isValid()) {
        return parsed.format('MMM D, YYYY h:mm A');
      }
      return value; // Return original if invalid
    }
    return value;
  }, []);

  // Add filter
  const handleAddFilter = useCallback(() => {
    const trimmedValue = filterValue.trim();
    if (!trimmedValue || !currentField) return;

    const operatorConfig = operators.find(o => o.key === selectedOperator);
    const newFilter: ActiveFilter = {
      id: generateId(),
      field: selectedField,
      fieldLabel: currentField.label,
      operator: selectedOperator,
      operatorLabel: operatorConfig?.label ?? selectedOperator,
      operatorSymbol: operatorConfig?.symbol ?? '=',
      value: trimmedValue,
      displayValue: formatDisplayValue(trimmedValue, currentField.type),
    };

    const updatedFilters = [...activeFilters, newFilter];
    setActiveFilters(updatedFilters);
    setFilterValue('');
    onApply(updatedFilters);
  }, [
    filterValue,
    currentField,
    selectedField,
    selectedOperator,
    operators,
    activeFilters,
    formatDisplayValue,
    onApply,
  ]);

  // Remove filter
  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      const updatedFilters = activeFilters.filter(f => f.id !== filterId);
      setActiveFilters(updatedFilters);
      if (updatedFilters.length === 0) {
        onClear();
      } else {
        onApply(updatedFilters);
      }
    },
    [activeFilters, onApply, onClear]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setActiveFilters([]);
    setFilterValue('');
    onClear();
  }, [onClear]);

  // Handle date change
  const handleDateChange = useCallback((date: Dayjs | null) => {
    if (date?.isValid()) {
      setFilterValue(date.toISOString());
    } else {
      setFilterValue('');
    }
  }, []);

  // Handle Enter key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && filterValue.trim()) {
        handleAddFilter();
      }
    },
    [filterValue, handleAddFilter]
  );

  // Render value input based on field type
  const renderValueInput = () => {
    if (!currentField) return null;

    if (currentField.type === 'date') {
      return (
        <DatePicker
          showTime
          allowClear
          placeholder="Select date..."
          value={filterValue ? dayjs(filterValue) : null}
          onChange={handleDateChange}
          style={{ width: 200 }}
          disabled={loading}
        />
      );
    }

    if (currentField.type === 'select' && currentField.options) {
      return (
        <Select
          placeholder="Select value..."
          value={filterValue || undefined}
          onChange={setFilterValue}
          style={{ width: 180 }}
          disabled={loading}
          options={currentField.options}
        />
      );
    }

    return (
      <Input
        type={currentField.type === 'number' ? 'number' : 'text'}
        placeholder="Enter value..."
        value={filterValue}
        onChange={e => setFilterValue(e.target.value)}
        onKeyDown={handleKeyPress}
        style={{ width: 180 }}
        disabled={loading}
        suffix={
          filterValue ? (
            <CloseCircleOutlined
              style={{ color: '#bfbfbf', cursor: 'pointer' }}
              onClick={() => setFilterValue('')}
            />
          ) : null
        }
      />
    );
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Filter Input Row */}
      <Space size="middle" wrap style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#64748b',
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          <FilterOutlined style={{ fontSize: 16 }} />
          <span>Filter by</span>
        </div>

        <Select
          value={selectedField}
          onChange={handleFieldChange}
          style={{ minWidth: 140 }}
          disabled={loading}
          options={fields.map(f => ({ label: f.label, value: f.key }))}
        />

        <Select
          value={selectedOperator}
          onChange={setSelectedOperator}
          style={{ minWidth: 140 }}
          disabled={loading}
          options={operators.map(o => ({
            label: (
              <span>
                <span style={{ fontFamily: 'monospace', marginRight: 6 }}>{o.symbol}</span>
                {o.label}
              </span>
            ),
            value: o.key,
          }))}
        />

        {renderValueInput()}

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleAddFilter}
          disabled={!filterValue.trim() || loading}
          loading={loading}
        >
          Add Filter
        </Button>

        {activeFilters.length > 0 && (
          <Button onClick={handleClearAll} disabled={loading}>
            Clear All
          </Button>
        )}
      </Space>

      {/* Active Filters Tags */}
      {activeFilters.length > 0 && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px dashed #e2e8f0',
          }}
        >
          <Space size={[8, 8]} wrap>
            <span style={{ color: '#64748b', fontSize: 13 }}>Active:</span>
            {activeFilters.map(filter => (
              <Tooltip
                key={filter.id}
                title={`${filter.fieldLabel} ${filter.operatorLabel.toLowerCase()} "${filter.displayValue}"`}
              >
                <Tag
                  closable
                  onClose={() => handleRemoveFilter(filter.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 13,
                    borderRadius: 6,
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#374151' }}>{filter.fieldLabel}</span>
                  <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>
                    {filter.operatorSymbol ?? '='}
                  </span>
                  <span style={{ color: '#1d4ed8' }}>"{filter.displayValue}"</span>
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

export default DynamicFilter;
