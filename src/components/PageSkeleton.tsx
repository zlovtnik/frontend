import React from 'react';
import { Skeleton } from '@/components/AntdComponents';

interface PageSkeletonProps {
  /** Type of skeleton to render */
  variant?: 'default' | 'table' | 'card' | 'form';
  /** Accessible label describing the loading page */
  ariaLabel?: string;
  /** Optional test id for queries */
  testId?: string;
  /** Number of card skeletons to render (only applies to 'card' variant) */
  cardCount?: number;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  variant = 'default',
  ariaLabel = 'Loading page',
  testId = 'page-skeleton',
  cardCount = 3,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid={testId}
      style={{ padding: '24px' }}
    >
      {variant === 'default' && (
        <>
          <Skeleton active title paragraph={false} style={{ marginBottom: 24 }} />
          <Skeleton active paragraph={{ rows: 6 }} />
          <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 24 }} />
        </>
      )}
      
      {variant === 'table' && (
        <>
          <Skeleton active title paragraph={false} style={{ marginBottom: 16 }} />
          <Skeleton active title={false} paragraph={{ rows: 8 }} />
        </>
      )}
      
      {variant === 'card' && (
        <>
          <Skeleton active title paragraph={false} style={{ marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {Array.from({ length: cardCount }).map((_, index) => (
              <div key={index} style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </div>
            ))}
          </div>
        </>
      )}
      
      {variant === 'form' && (
        <>
          <Skeleton active title paragraph={false} style={{ marginBottom: 24 }} />
          <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 16 }} />
          <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 16 }} />
          <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24 }} />
          <Skeleton.Button active size="large" style={{ marginRight: 8 }} />
          <Skeleton.Button active size="large" />
        </>
      )}
    </div>
  );
};
