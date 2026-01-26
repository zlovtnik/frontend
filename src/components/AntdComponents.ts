/**
 * Centralized Ant Design Component Imports
 *
 * This barrel file provides organizational and centralized dependency management
 * for Ant Design components across the codebase. All files should import from here
 * instead of directly from 'antd' to maintain consistent imports.
 *
 * Note: Modern bundlers (Webpack, Vite, etc.) already tree-shake direct 'antd' imports.
 * If bundle size optimization is needed, consider using explicit subpath imports
 * (e.g., 'antd/es/button' or 'antd/button') instead of this barrel.
 */

// Core components that are commonly used
export {
  Button,
  Card,
  Form,
  Input,
  Typography,
  Alert,
  Space,
  Divider,
  Select,
  Modal,
  Table,
  Row,
  Col,
  Layout,
  Flex,
  Checkbox,
  Spin,
  DatePicker,
  Statistic,
  List,
  Avatar,
  Tag,
  Skeleton,
  ConfigProvider,
  Popconfirm,
  App as AntdApp,
} from 'antd';

// Icons - import only what we use
export {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  SecurityScanOutlined,
  HomeOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  ContactsOutlined,
  BarsOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  ApiOutlined,
  CodeOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
