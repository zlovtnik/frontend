import React from 'react';
import { Card, Skeleton, Row, Col } from 'antd';

interface CardSkeletonGridProps {
  count?: number;
  gutter?: number;
  ariaLabel?: string;
  testId?: string;
}

export const CardSkeletonGrid: React.FC<CardSkeletonGridProps> = ({
  count = 3,
  gutter = 16,
  ariaLabel = 'Loading cards',
  testId = 'card-skeleton-grid',
}) => {
  return (
    <Row
      gutter={[gutter, gutter]}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Col key={index} xs={24} md={8}>
          <Card bordered={false} style={{ height: '100%' }}>
            <Skeleton active title paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
};
