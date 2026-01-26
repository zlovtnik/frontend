import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Layout,
  Typography,
  Button,
  Space,
  Divider,
  Row,
  Col,
  Card,
  SecurityScanOutlined,
  HomeOutlined,
  ThunderboltOutlined,
  ApiOutlined,
} from '@/components/AntdComponents';

/**
 * Centralized theme object for HomePage colors.
 * These align with CSS variables defined in src/styles/index.css.
 */
const theme = {
  colors: {
    primary: 'var(--primary-500)',
    headerBackground: 'var(--neutral-50)',
    headerBorder: 'var(--neutral-200)',
    contentBackground: 'var(--color-background-light)',
    footerBackground: 'var(--primary-900)',
    featureCardGradientStart: 'var(--primary-50)',
    featureCardGradientEnd: 'var(--secondary-50)',
    sectionBackground: 'var(--neutral-50)',
    white: '#ffffff',
  },
} as const;

const styles = {
  header: {
    background: theme.colors.headerBackground,
    borderBottom: `1px solid ${theme.colors.headerBorder}`,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  title: {
    margin: 0,
    color: theme.colors.primary,
  },
};

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const features = [
    {
      id: 1,
      icon: <SecurityScanOutlined style={{ fontSize: 32 }} />,
      title: 'Secure Authentication',
      description:
        'JWT-based login system with comprehensive security measures and multi-tenant support.',
    },
    {
      id: 2,
      icon: <HomeOutlined style={{ fontSize: 32 }} />,
      title: 'Multi-Tenant Architecture',
      description:
        'Complete tenant isolation ensuring data security and privacy across different organizations.',
    },
    {
      id: 3,
      icon: <ThunderboltOutlined style={{ fontSize: 32 }} />,
      title: 'High Performance',
      description:
        'Built with Bun runtime for exceptional speed and TypeScript for reliable development.',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={styles.header}>
        <div style={styles.headerContent}>
          <Typography.Title level={4} style={styles.title}>
            <ApiOutlined style={{ marginRight: 8 }} />
            Nexus
          </Typography.Title>
        </div>
      </Layout.Header>

      <Layout.Content style={{ background: theme.colors.contentBackground }}>
        {/* Hero Section */}
        <div
          style={{ padding: '64px 24px', textAlign: 'center', maxWidth: 1000, margin: '0 auto' }}
        >
          <Typography.Title level={1}>Welcome to Nexus</Typography.Title>
          <Typography.Paragraph style={{ fontSize: 18, marginBottom: 32 }}>
            A modern, secure multi-tenant platform for managing your organization's data with
            enterprise-grade authentication and comprehensive tenant isolation.
          </Typography.Paragraph>

          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={handleGetStarted}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGetStarted();
                }
              }}
              aria-label="Get Started - Navigate to registration page"
            >
              Get Started
            </Button>
            <Button
              size="large"
              onClick={handleSignIn}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSignIn();
                }
              }}
              aria-label="Sign In - Navigate to login page"
            >
              Sign In
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Features Section */}
        <div style={{ background: theme.colors.sectionBackground, padding: '64px 24px' }}>
          <Row gutter={[24, 24]}>
            {features.map(feature => (
              <Col xs={24} md={8} key={feature.id}>
                <Card
                  style={{ textAlign: 'center', height: '100%' }}
                  hoverable
                  aria-labelledby={`feature-title-${feature.id}`}
                  cover={
                    <div
                      style={{
                        padding: '24px 0',
                        background: `linear-gradient(135deg, ${theme.colors.featureCardGradientStart} 0%, ${theme.colors.featureCardGradientEnd} 100%)`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: '0 0 24px 0',
                      }}
                      aria-label={`${feature.title} icon`}
                    >
                      {feature.icon}
                    </div>
                  }
                >
                  <Card.Meta
                    title={
                      <Typography.Title level={4} id={`feature-title-${feature.id}`}>
                        {feature.title}
                      </Typography.Title>
                    }
                    description={<Typography.Paragraph>{feature.description}</Typography.Paragraph>}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Layout.Content>

      <Layout.Footer style={{ textAlign: 'center', background: theme.colors.footerBackground, color: theme.colors.white }}>
        © {new Date().getFullYear()} Nexus Platform. Built with React, TypeScript, and Bun runtime.
      </Layout.Footer>
    </Layout>
  );
};
