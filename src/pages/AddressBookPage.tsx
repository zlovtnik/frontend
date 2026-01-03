import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import type { Contact } from '@/types/contact';
import { Gender } from '@/types/contact';
import { normalizePersonDTO, type PersonDTO } from '@/types/person';
import { addressBookService } from '@/services/api';
import { getEnv } from '@/config/env';
import {
  Button,
  Input,
  Card,
  Table,
  Alert,
  Space,
  Typography,
  Divider,
  AntdApp,
  Select,
} from '@/components/AntdComponents';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
  ContactFormModal,
  type ContactFormValues,
  contactFormDefaultValues,
} from '@/components/ContactFormModal';
import { TableSkeleton } from '@/components/TableSkeleton';
import {
  type ApiResponseSuccessLike,
  type ApiResponseWithLegacy,
  isApiResponseSuccess,
  isApiSuccess,
} from '@/types/api';
import { asContactId, asTenantId, asUserId } from '@/types/ids';

let cachedDefaultCountry: string | null = null;

function getDefaultCountry(): string {
  if (cachedDefaultCountry === null) {
    try {
      const value = getEnv().defaultCountry;
      cachedDefaultCountry =
        typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
    } catch {
      // Fallback if environment not available during tests
      cachedDefaultCountry = '';
    }
  }
  return cachedDefaultCountry;
}

const DEFAULT_COUNTRY = getDefaultCountry();

/**
 * Resolve the contact identifier from a backend person payload.
 * Expects a normalized PersonDTO - do not call normalizePersonDTO again.
 */
export const resolveContactId = (
  normalized: PersonDTO,
  fallback: () => Contact['id']
): Contact['id'] => {
  if (typeof normalized.id === 'string' && normalized.id.trim()) {
    return asContactId(normalized.id.trim());
  }

  if (typeof normalized.id === 'number') {
    return asContactId(normalized.id.toString());
  }

  return fallback();
};

/**
 * Parse the most complete name representation available from the person payload.
 * Expects a normalized PersonDTO - do not call normalizePersonDTO again.
 */
export const parseContactName = (
  normalized: PersonDTO
): { rawName: string; firstName: string; lastName: string } => {
  const computedFullName =
    normalized.fullName ??
    [normalized.firstName, normalized.lastName]
      .filter((segment): segment is string => Boolean(segment?.trim()))
      .join(' ')
      .trim();

  const rawName = computedFullName;
  const nameParts = rawName ? rawName.split(/\s+/) : [];
  const firstName = normalized.firstName ?? nameParts[0] ?? '';
  const lastName = normalized.lastName ?? nameParts.slice(1).join(' ');

  return { rawName, firstName, lastName };
};

/**
 * Resolve gender from multiple potential backend encodings.
 * Expects a normalized PersonDTO - do not call normalizePersonDTO again.
 */
export const resolveContactGender = (normalized: PersonDTO): Gender | undefined => {
  if (normalized.gender === null || normalized.gender === undefined) {
    return undefined;
  }

  if (
    normalized.gender === Gender.male ||
    normalized.gender === Gender.female ||
    normalized.gender === Gender.other
  ) {
    return normalized.gender;
  }

  return undefined;
};

/**
 * Normalise address information into the Contact schema.
 * Expects a normalized PersonDTO - do not call normalizePersonDTO again.
 */
export const normalizeContactAddress = (
  normalized: PersonDTO,
  defaultCountry: string
): Contact['address'] | undefined => {
  const address = normalized.address;

  if (!address) {
    return undefined;
  }

  return {
    street1: address.street1 ?? '',
    street2: address.street2,
    city: address.city ?? '',
    state: address.state ?? '',
    zipCode: address.zipCode ?? '',
    country: address.country ?? defaultCountry,
  };
};

export const AddressBookPage: React.FC = () => {
  const { tenant } = useAuth();
  const { message } = AntdApp.useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<Contact['id'] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactFormInitialValues, setContactFormInitialValues] = useState<
    Partial<ContactFormValues>
  >({ ...contactFormDefaultValues, country: DEFAULT_COUNTRY });

  // Pagination state
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const { current: currentPage, pageSize: currentPageSize } = paginationState;

  // Sorting state
  const [sorting, setSorting] = useState<{
    field: string;
    order: 'asc' | 'desc';
  } | null>(null);
  // Helper function to transform backend Person to frontend Contact
  const generateFallbackContactId = () => `contact-${Math.random().toString(36).slice(2, 10)}`;

  /**
   * Transform backend PersonDTO to frontend Contact type
   * @param person - Person data from backend API
   * @returns Properly typed Contact object for frontend use
   */
  const personToContact = useCallback(
    (person: PersonDTO): Contact => {
      const normalized = normalizePersonDTO(person);

      const resolvedId = resolveContactId(normalized, () =>
        asContactId(generateFallbackContactId())
      );

      const resolvedTenantId = (() => {
        if (typeof normalized.tenantId === 'string' && normalized.tenantId.trim()) {
          return asTenantId(normalized.tenantId.trim());
        }
        if (tenant?.id) return tenant.id;
        return asTenantId('tenant-fallback');
      })();

      const { rawName, firstName, lastName } = parseContactName(normalized);

      const resolvedGender = resolveContactGender(normalized);

      const resolvedAddress = normalizeContactAddress(normalized, DEFAULT_COUNTRY);

      const createdBy = normalized.createdBy ? asUserId(normalized.createdBy) : asUserId('system');

      const updatedBy = normalized.updatedBy ? asUserId(normalized.updatedBy) : createdBy;

      return {
        id: resolvedId,
        tenantId: resolvedTenantId,
        firstName,
        lastName,
        fullName: rawName || [firstName, lastName].filter(Boolean).join(' '),
        email: normalized.email,
        phone: normalized.phone,
        gender: resolvedGender,
        age: normalized.age,
        address: resolvedAddress,
        createdAt: normalized.createdAt ?? new Date(),
        updatedAt: normalized.updatedAt ?? normalized.createdAt ?? new Date(),
        createdBy,
        updatedBy,
        isActive: normalized.isActive ?? true,
      };
    },
    [tenant]
  );

  // Helper function to transform frontend Contact to backend PersonDTO
  const contactToPersonDTO = (formValues: ContactFormValues) => {
    const name = `${formValues.firstName} ${formValues.lastName}`.trim();
    const addressSegments = [
      formValues.street1,
      formValues.street2,
      formValues.city,
      formValues.state,
      formValues.zipCode,
      formValues.country,
    ]
      .map(segment => (segment ?? '').trim())
      .filter(segment => segment.length > 0);

    return {
      name: name || formValues.street1,
      address: addressSegments.join(', ') || formValues.street1,
      phone: formValues.phone ?? '',
      email: formValues.email ?? '',
      gender: formValues.gender,
      age: typeof formValues.age === 'number' ? formValues.age : 25,
    };
  };

  const toPositiveInteger = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const normalized = Math.trunc(value);
      return normalized > 0 ? normalized : fallback;
    }

    return fallback;
  };

  const toNonNegativeInteger = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const normalized = Math.trunc(value);
      return normalized >= 0 ? normalized : fallback;
    }

    return fallback;
  };

  const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  };

  interface NormalizedContacts {
    contacts: PersonDTO[];
    page: number;
    pageSize: number;
    total: number;
  }

  const normalizeContactListPayload = (
    response: unknown,
    isProperSuccess: boolean,
    hasRawSuccessFormat: boolean
  ): NormalizedContacts | null => {
    interface PartialContactData {
      contacts?: unknown;
      page?: unknown;
      current?: unknown;
      limit?: unknown;
      pageSize?: unknown;
      perPage?: unknown;
      total?: unknown;
    }

    const responseObject = asRecord(response);
    if (!responseObject) {
      return null;
    }

    let payload: PartialContactData | null = null;

    if (isProperSuccess) {
      const candidateObject = asRecord(responseObject.data);
      if (!candidateObject) {
        return null;
      }

      payload = candidateObject as PartialContactData;
    } else if (hasRawSuccessFormat) {
      const rawData = responseObject.data;
      const metadataRecord = asRecord(responseObject.metadata);

      if (!Array.isArray(rawData)) {
        return null;
      }

      const readMetadata = (key: string): unknown =>
        metadataRecord && key in metadataRecord ? metadataRecord[key] : undefined;

      payload = {
        contacts: rawData,
        page: readMetadata('page'),
        current: readMetadata('current'),
        limit: readMetadata('limit') ?? readMetadata('pageSize') ?? readMetadata('perPage'),
        pageSize: readMetadata('pageSize'),
        perPage: readMetadata('perPage'),
        total:
          readMetadata('total') ??
          readMetadata('count') ??
          readMetadata('totalCount') ??
          rawData.length,
      };
    }

    if (!payload) {
      return null;
    }

    const isPersonDTO = (candidate: unknown): candidate is PersonDTO => {
      if (!candidate || typeof candidate !== 'object') {
        return false;
      }

      const record = candidate as Record<string, unknown>;

      const id = record.id;
      const fullName = record.fullName ?? record.name ?? record.firstName;
      const email = record.email;
      const phone = record.phone;

      const hasValidId =
        (typeof id === 'string' && id.trim().length > 0) ||
        (typeof id === 'number' && Number.isFinite(id));
      const hasValidName = typeof fullName === 'string' && fullName.trim().length > 0;
      const hasValidEmail = email === undefined || typeof email === 'string';
      const hasValidPhone = phone === undefined || typeof phone === 'string';

      return hasValidId && hasValidName && hasValidEmail && hasValidPhone;
    };

    const contacts = Array.isArray(payload.contacts)
      ? payload.contacts.filter(candidate => isPersonDTO(candidate))
      : [];

    const page = toPositiveInteger(payload.page ?? payload.current, 1);
    const pageSize = toPositiveInteger(payload.limit ?? payload.pageSize ?? payload.perPage, 10);
    const total = toNonNegativeInteger(payload.total, contacts.length);

    return {
      contacts,
      page,
      pageSize,
      total,
    };
  };

  interface SuccessShape {
    isProperSuccess: boolean;
    hasRawSuccessFormat: boolean;
  }

  type LegacySuccessPayload = {
    message?: unknown;
    data?: unknown;
    metadata?: unknown;
  } & Record<string, unknown>;

  const isPotentialRawSuccess = (payload: unknown): payload is LegacySuccessPayload =>
    asRecord(payload) !== null;

  const deriveSuccessShape = (apiResponse: unknown): SuccessShape => {
    const isProperSuccess = isApiSuccess(apiResponse as never);

    if (isProperSuccess) {
      return { isProperSuccess: true, hasRawSuccessFormat: false };
    }

    const rawResponse = asRecord(apiResponse);
    const hasRawSuccessFormat = Boolean(
      rawResponse?.data !== undefined && rawResponse.message === 'ok'
    );

    return {
      isProperSuccess,
      hasRawSuccessFormat,
    };
  };

  const getResponseMessage = (apiResponse: unknown, fallback: string): string => {
    const rawResponse = asRecord(apiResponse);
    if (rawResponse && typeof rawResponse.message === 'string' && rawResponse.message.trim()) {
      return rawResponse.message;
    }

    return fallback;
  };

  const extractNormalizedContacts = (
    apiResponse: unknown,
    successShape: SuccessShape
  ): NormalizedContacts | null =>
    normalizeContactListPayload(
      apiResponse,
      successShape.isProperSuccess,
      successShape.hasRawSuccessFormat
    );

  const getNormalizedContactData = (
    apiResponse: ApiResponseWithLegacy<unknown>
  ): NormalizedContacts | null => {
    if (!isApiResponseSuccess(apiResponse)) {
      return null;
    }
    const successShape = deriveSuccessShape(apiResponse);
    return extractNormalizedContacts(apiResponse, successShape);
  };

  const loadContactsWithParams = useCallback(
    async (params: {
      page?: number;
      limit?: number;
      search?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      if (!tenant) {
        setContacts([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const fullParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search || undefined,
        ...(params.sortField &&
          params.sortOrder && { sort: `${params.sortField},${params.sortOrder}` }),
      };
      const result = await addressBookService.getAll(fullParams);

      if (result.isErr()) {
        const errorMessage = 'Failed to load contacts';
        setError(errorMessage);
        message.error(errorMessage);
        setLoading(false);
        return;
      }

      const apiResponse = result.value as ApiResponseWithLegacy<unknown>;

      const normalizedData = getNormalizedContactData(apiResponse);

      if (!normalizedData) {
        const errorMessage = 'Failed to load contacts';
        setError(errorMessage);
        message.error(errorMessage);
        setLoading(false);
        return;
      }

      const { contacts: rawContacts, page, pageSize, total } = normalizedData;
      const transformedContacts = rawContacts.map(personToContact);
      setContacts(transformedContacts);
      setPaginationState(prev => {
        const next = {
          current: page,
          pageSize,
          total,
        };

        if (
          prev.current === next.current &&
          prev.pageSize === next.pageSize &&
          prev.total === next.total
        ) {
          return prev;
        }

        return next;
      });
      setLoading(false);
    },
    [tenant, message, personToContact]
  );

  const loadContacts = useCallback(() => {
    return loadContactsWithParams({
      page: currentPage,
      limit: currentPageSize,
      search: searchTerm || undefined,
      ...(sorting && {
        sortField: sorting.field,
        sortOrder: sorting.order,
      }),
    });
  }, [loadContactsWithParams, currentPage, currentPageSize, searchTerm, sorting]);

  useEffect(() => {
    const loadData = async () => {
      await loadContacts();
    };
    loadData();
  }, [loadContacts]);

  // Use all contacts since filtering is now done on the backend
  const filteredContacts = contacts;

  // Handle form submission
  const handleContactSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    setFormError(null);
    const dto = contactToPersonDTO(values);

    const isUpdating = Boolean(editingContact);
    const result = isUpdating
      ? await addressBookService.update(editingContact!.id, dto)
      : await addressBookService.create(dto);

    if (result.isErr()) {
      const errorMessage = 'Operation Failed';
      setFormError(errorMessage);
      setOperationError(errorMessage);
      message.error(errorMessage);
      setIsSubmitting(false);
      // Don't close modal on error - let user see the error and retry
      return;
    }

    const apiResponse = result.value;

    const successShape = deriveSuccessShape(apiResponse);
    const isSuccess = successShape.isProperSuccess || successShape.hasRawSuccessFormat;

    if (!isSuccess) {
      const errorMessage = getResponseMessage(apiResponse, 'Operation Failed');
      setFormError(errorMessage);
      setOperationError(errorMessage);
      message.error(errorMessage);
      setIsSubmitting(false);
      // Don't close modal on error - let user see the error and retry
      return;
    }

    const fallbackMsg = isUpdating
      ? 'Contact updated successfully!'
      : 'Contact created successfully!';
    const rawMsg = getResponseMessage(apiResponse, fallbackMsg);
    const successMsg = rawMsg && rawMsg.toLowerCase() !== 'ok' ? rawMsg : fallbackMsg;
    message.success(successMsg);

    await loadContacts();

    setEditingContact(null);
    setIsFormOpen(false);
    setContactFormInitialValues({ ...contactFormDefaultValues, country: DEFAULT_COUNTRY });
    setIsSubmitting(false);
    setOperationError(null); // Clear operation error on success
  };

  // Handle edit - memoized to maintain stable reference for ActionButtons
  const handleEdit = useCallback((contact: Contact) => {
    setEditingContact(contact);
    setFormError(null);
    setContactFormInitialValues({
      ...contactFormDefaultValues,
      firstName: contact.firstName ?? '',
      lastName: contact.lastName ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      gender: contact.gender ?? Gender.other,
      age: contact.age ?? 25,
      street1: contact.address?.street1 ?? '',
      street2: contact.address?.street2 ?? '',
      city: contact.address?.city ?? '',
      state: contact.address?.state ?? '',
      zipCode: contact.address?.zipCode ?? '',
      country: contact.address?.country ?? DEFAULT_COUNTRY,
    });
    setIsFormOpen(true);
  }, []);

  // Handle delete - open confirmation modal - memoized to maintain stable reference for ActionButtons
  const handleDelete = useCallback((id: Contact['id']) => {
    setDeleteContactId(id);
  }, []);

  // Confirm delete
  const confirmDelete = async () => {
    if (deleteContactId) {
      const result = await addressBookService.delete(deleteContactId);

      if (result.isErr()) {
        const errorMessage = 'Operation Failed';
        setOperationError(errorMessage);
        message.error(errorMessage);
        return;
      }

      const apiResponse = result.value as ApiResponseWithLegacy<Record<string, unknown>>;

      const isSuccess = isApiResponseSuccess(apiResponse);

      if (!isSuccess) {
        const errorMessage = 'Operation Failed';
        setOperationError(errorMessage);
        message.error(errorMessage);
        return;
      }

      setDeleteContactId(null);
      await loadContacts();
      message.success(
        typeof apiResponse.message === 'string' && apiResponse.message.toLowerCase() !== 'ok'
          ? apiResponse.message
          : 'Contact deleted successfully!'
      );
      setOperationError(null); // Clear operation error on success
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteContactId(null);
  };

  // Open form for new contact
  const handleNewContact = () => {
    setEditingContact(null);
    setFormError(null);
    setContactFormInitialValues({ ...contactFormDefaultValues, country: DEFAULT_COUNTRY });
    setIsFormOpen(true);
  };

  // Memoize address rendering function
  const renderAddress = useCallback((address: Contact['address']) => {
    if (!address) return '-';

    const parts = [];

    if (address.street1) parts.push(address.street1);
    if (address.city) parts.push(address.city);
    if (address.state && address.zipCode) {
      parts.push(`${address.state} ${address.zipCode}`);
    } else {
      if (address.state) parts.push(address.state);
      if (address.zipCode) parts.push(address.zipCode);
    }
    if (address.country) parts.push(address.country);

    return parts.length > 0 ? parts.join(', ') : '-';
  }, []);

  // Memoize action buttons component
  const ActionButtons = memo(({ contact, isLoading }: { contact: Contact; isLoading: boolean }) => (
    <Space size="middle">
      <Button
        type="link"
        icon={<EditOutlined />}
        data-testid={`edit-${contact.id}`}
        onClick={() => {
          handleEdit(contact);
        }}
      >
        Edit
      </Button>
      <Button
        type="link"
        danger
        icon={<DeleteOutlined />}
        onClick={() => {
          handleDelete(contact.id);
        }}
        disabled={isLoading}
      >
        Delete
      </Button>
    </Space>
  ));

  ActionButtons.displayName = 'ActionButtons';

  // Table columns for contacts display - memoized
  const columns = useMemo(
    () => [
      {
        title: 'Name',
        dataIndex: 'fullName',
        key: 'fullName',
        sorter: (a: Contact, b: Contact) => a.fullName.localeCompare(b.fullName),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: 'Phone',
        dataIndex: 'phone',
        key: 'phone',
      },
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        render: renderAddress,
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, contact: Contact) => (
          <ActionButtons contact={contact} isLoading={loading} />
        ),
      },
    ],
    [renderAddress, loading]
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Address Book
          </Typography.Title>
          <Typography.Text type="secondary">Manage your contacts and addresses</Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewContact}
          loading={loading}
          disabled={loading}
        >
          Add Contact
        </Button>
      </div>

      <Divider />

      {/* Search Bar */}
      <Input
        placeholder="Search contacts..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={e => {
          const newSearchTerm = e.target.value;
          setSearchTerm(newSearchTerm);
          // Trigger search with backend filtering, reset to first page
          loadContactsWithParams({
            page: 1,
            limit: paginationState.pageSize,
            search: newSearchTerm,
          });
        }}
        style={{ maxWidth: 400 }}
      />

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error Loading Contacts"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => {
            setError(null);
          }}
          action={
            <Button size="small" onClick={loadContacts} loading={loading}>
              Retry
            </Button>
          }
        />
      )}

      {/* Operation Error Alert */}
      {operationError && (
        <Alert
          message="Operation Failed"
          description={operationError}
          type="error"
          showIcon
          closable
          onClose={() => {
            setOperationError(null);
          }}
        />
      )}

      {/* Contacts Table */}
      <Card title={`Contacts (${filteredContacts.length})`}>
        {loading ? (
          <TableSkeleton
            rows={6}
            ariaLabel="Loading contacts"
            testId="address-book-table-skeleton"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredContacts}
            rowKey="id"
            pagination={{
              current: paginationState.current,
              pageSize: paginationState.pageSize,
              total: paginationState.total,
              onChange: (page, pageSize) => {
                setPaginationState({ current: page, pageSize, total: paginationState.total });
                // Reload with new params
                loadContactsWithParams({
                  page,
                  limit: pageSize,
                  search: searchTerm || undefined,
                  ...(sorting && {
                    sortField: sorting.field,
                    sortOrder: sorting.order,
                  }),
                });
              },
            }}
            onChange={(pagination, filters, sorter) => {
              const sorterResult = Array.isArray(sorter) ? sorter[0] : sorter;
              if (sorterResult?.field && sorterResult?.order) {
                const order = sorterResult.order === 'ascend' ? 'asc' : 'desc';
                const field = sorterResult.field as string;
                setSorting({ field, order });
                // Reload with sorting, preserving active filters
                loadContactsWithParams({
                  page: pagination.current,
                  limit: pagination.pageSize,
                  search: searchTerm || undefined,
                  sortField: field,
                  sortOrder: order,
                });
              } else {
                setSorting(null);
                loadContactsWithParams({
                  page: pagination.current,
                  limit: pagination.pageSize,
                  search: searchTerm || undefined,
                });
              }
            }}
            locale={{
              emptyText:
                contacts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <Typography.Text>No contacts yet. Add your first contact!</Typography.Text>
                    <br />
                    <br />
                    <Button
                      type="primary"
                      onClick={handleNewContact}
                      loading={loading}
                      disabled={loading}
                    >
                      Add Contact
                    </Button>
                  </div>
                ) : (
                  'No contacts match your search.'
                ),
            }}
          />
        )}
      </Card>

      {/* Contact Form Modal */}
      <ContactFormModal
        open={isFormOpen}
        initialValues={contactFormInitialValues}
        submitting={isSubmitting}
        errorMessage={formError}
        onSubmit={handleContactSubmit}
        onCancel={() => {
          setIsFormOpen(false);
          setContactFormInitialValues({ ...contactFormDefaultValues, country: DEFAULT_COUNTRY });
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteContactId !== null}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </Space>
  );
};
