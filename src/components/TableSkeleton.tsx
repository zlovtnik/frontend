import React from 'react';
import { Skeleton } from 'antd';

interface TableSkeletonProps {
  rows?: number;
  ariaLabel?: string;
  testId?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  ariaLabel = 'Loading table',
  testId = 'table-skeleton',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid={testId}
      style={{ width: '100%' }}
    >
      <Skeleton active title paragraph={false} style={{ marginBottom: 16 }} />
      <Skeleton active paragraph={{ rows }} />
    </div>
  );
};
