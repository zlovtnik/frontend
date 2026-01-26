import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, AntdApp } from '@/components/AntdComponents';
import { App } from './App';
import { preloadCommonPasswords } from './domain/rules/authRules';
import './styles/index.css';
import 'antd/dist/reset.css';

const theme = {
  token: {
    colorPrimary: '#0066ff', // Electric Blue
    colorSuccess: '#22c55e', // Electric Green
    colorWarning: '#f59e0b', // Amber
    colorError: '#f43f5e', // Electric Rose
    colorInfo: '#00b4d8', // Electric Cyan
    colorBgBase: '#f0f4f8', // Light blue-gray
    colorBgContainer: '#ffffff', // White for containers
    colorBgElevated: '#ffffff', // White elevated
    colorBgLayout: '#f0f4f8', // Light blue-gray layout
    colorTextBase: '#243b53', // Deep blue-gray text
    colorText: '#243b53', // Regular text
    colorTextSecondary: '#627d98', // Medium blue-gray
    colorTextDisabled: '#9fb3c8', // Light blue-gray
    colorBorder: '#bcccdc', // Blue-tinted border
    colorBorderSecondary: '#d9e2ec', // Lighter border
    colorFill: '#d9e2ec', // Fill color
    colorFillSecondary: '#e0fcff', // Cyan tint fill
    colorFillTertiary: '#f3e8ff', // Violet tint fill
    colorBlack: '#102a43', // Deep navy
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  components: {
    Menu: {
      darkItemBg: '#001433', // primary-900
      darkItemSelectedBg: '#0052cc', // primary-600
      darkItemColor: '#cce0ff', // primary-100
      darkItemSelectedColor: '#ffffff',
      darkIconColor: '#99c2ff', // primary-200
      darkSubMenuItemBg: '#000a1a', // primary-950
      darkItemHoverColor: '#ffffff',
      darkItemHoverBg: '#003d99', // primary-700
      itemBg: '#f0f4f8', // Light background
      itemColor: '#243b53', // Deep text
      itemSelectedBg: '#e6f0ff', // primary-50
      itemSelectedColor: '#0066ff', // primary-500
      itemHoverBg: '#cce0ff', // primary-100
    },
    Table: {
      headerBg: '#e6f0ff',
      headerColor: '#0066ff',
      rowHoverBg: '#f0f4f8',
      rowSelectedBg: '#e6f0ff',
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
    Button: {
      primaryShadow: '0 2px 8px rgba(0, 102, 255, 0.25)',
      colorPrimaryHover: '#0052cc', // primary-600
    },
  },
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);

// Preload common passwords lazily (non-blocking)
preloadCommonPasswords().catch((error: unknown) => {
  console.warn('Failed to preload common passwords:', error);
});

root.render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <AntdApp>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
