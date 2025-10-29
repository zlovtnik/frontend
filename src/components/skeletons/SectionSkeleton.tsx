import React from 'react';
import { Skeleton } from 'antd';

const styles = {
  container: { width: '100%' } as const,
  titleSpacing: { marginBottom: 12 } as const,
};

export interface SectionSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Whether to render a title placeholder */
  hasTitle?: boolean;
  /** Accessible label describing the loading section */
  ariaLabel?: string;
  /** Optional test id for queries */
  testId?: string;
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  rows = 3,
  hasTitle = true,
  ariaLabel = 'Loading section',
  testId = 'section-skeleton',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid={testId}
      style={styles.container}
    >
      {hasTitle && <Skeleton active title paragraph={false} style={styles.titleSpacing} />}
      <Skeleton active paragraph={{ rows }} />
    </div>
  );
};
