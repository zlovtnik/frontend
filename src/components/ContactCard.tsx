import React, { memo } from 'react';
import { Card, Space, Button, Typography, Tag } from '@/components/AntdComponents';
import { EditOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons';
import type { Contact } from '@/types/contact';

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (id: Contact['id']) => void;
  isLoading?: boolean;
}

/**
 * ContactCard Component - Memoized for performance
 *
 * Uses React.memo with custom comparison to prevent unnecessary re-renders.
 * Only re-renders when contact data or handlers actually change.
 */
const ContactCardComponent: React.FC<ContactCardProps> = ({
  contact,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const handleEdit = () => {
    onEdit(contact);
  };
  const handleDelete = () => {
    onDelete(contact.id);
  };

  return (
    <Card
      hoverable
      style={{ height: '100%' }}
      actions={[
        <Button
          key="edit"
          type="text"
          icon={<EditOutlined />}
          onClick={handleEdit}
          disabled={isLoading}
        >
          Edit
        </Button>,
        <Button
          key="delete"
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          disabled={isLoading}
        >
          Delete
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Typography.Title level={5} style={{ margin: 0 }}>
          {contact.fullName}
        </Typography.Title>

        {contact.email && (
          <Space size="small">
            <MailOutlined />
            <Typography.Text type="secondary">{contact.email}</Typography.Text>
          </Space>
        )}

        {contact.phone && <Typography.Text type="secondary">📞 {contact.phone}</Typography.Text>}

        {contact.address && (
          <Typography.Text type="secondary" ellipsis>
            {[
              contact.address.street1,
              contact.address.city,
              contact.address.state,
              contact.address.zipCode,
              contact.address.country,
            ]
              .filter(Boolean)
              .join(', ')}
          </Typography.Text>
        )}

        {contact.gender && <Tag color="blue">{contact.gender}</Tag>}

        {contact.age && <Typography.Text type="secondary">Age: {contact.age}</Typography.Text>}
      </Space>
    </Card>
  );
};

/**
 * Custom comparison function for React.memo
 * Only re-render if:
 * - Contact ID changes
 * - Contact updatedAt timestamp changes
 * - Loading state changes
 */
export const ContactCard = memo(ContactCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.contact.id === nextProps.contact.id &&
    prevProps.contact.updatedAt === nextProps.contact.updatedAt &&
    prevProps.isLoading === nextProps.isLoading
  );
});

ContactCard.displayName = 'ContactCard';

export default ContactCard;
