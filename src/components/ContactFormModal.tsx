import React, { useCallback, useEffect, useMemo } from 'react';
import { Modal, Alert, Space, Divider, Button } from 'antd';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { FormField } from '@/components/FormField';
import { contactFormSchema } from '@/validation/schemas';
import { useDebouncedValidation } from '@/hooks/useDebouncedValidation';
import { useWarnOnUnsavedChanges } from '@/hooks/useWarnOnUnsavedChanges';
import { Gender } from '@/types/contact';

const genderOptions = [
  { value: Gender.male, label: 'Male' },
  { value: Gender.female, label: 'Female' },
  { value: Gender.other, label: 'Other' },
] as const;

export type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormModalProps {
  open: boolean;
  initialValues?: Partial<ContactFormValues>;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ContactFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export const contactFormDefaultValues: ContactFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: Gender.other,
  age: 25,
  street1: '',
  street2: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
};

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  open,
  initialValues,
  submitting = false,
  errorMessage,
  onSubmit,
  onCancel,
}) => {
  const mergedInitialValues = useMemo(
    () => ({ ...contactFormDefaultValues, ...initialValues }),
    [initialValues]
  );

  const methods = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onChange',
    defaultValues: mergedInitialValues,
  });

  const {
    handleSubmit,
    trigger,
    watch,
    reset,
    formState: { isDirty },
  } = methods;

  const watchedValues = watch();

  useDebouncedValidation({ trigger, values: watchedValues, delay: 250, shouldValidate: open });
  useWarnOnUnsavedChanges(isDirty && open && !submitting);

  const handleCancel = useCallback(() => {
    onCancel();
    reset(mergedInitialValues);
  }, [onCancel, reset, mergedInitialValues]);

  const prevOpenRef = React.useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(mergedInitialValues, { keepDirty: false, keepTouched: false });
    }
    prevOpenRef.current = open;
  }, [open, reset, mergedInitialValues]);

  return (
    <Modal
      title={initialValues ? 'Edit Contact' : 'Add New Contact'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      width={520}
    >
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(async values => {
            await onSubmit(values);
          })}
          noValidate
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {errorMessage && (
              <Alert
                message="Operation Failed"
                description={errorMessage}
                type="error"
                showIcon
                closable
              />
            )}

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <FormField
                name="firstName"
                label="First Name"
                type="text"
                required
                placeholder="Enter first name"
                disabled={submitting}
              />
              <FormField
                name="lastName"
                label="Last Name"
                type="text"
                required
                placeholder="Enter last name"
                disabled={submitting}
              />
            </Space>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <FormField
                name="email"
                label="Email"
                type="email"
                placeholder="Enter email address"
                disabled={submitting}
              />
              <FormField
                name="phone"
                label="Phone"
                type="text"
                placeholder="Enter phone number"
                disabled={submitting}
              />
            </Space>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <FormField
                name="gender"
                label="Gender"
                type="select"
                required
                placeholder="Select gender"
                options={genderOptions.map(option => ({
                  value: option.value,
                  label: option.label,
                }))}
                disabled={submitting}
              />
              <FormField
                name="age"
                label="Age"
                type="number"
                required
                placeholder="Enter age"
                min={1}
                max={120}
                disabled={submitting}
              />
            </Space>

            <Divider>Address</Divider>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <FormField
                name="street1"
                label="Street Address"
                type="text"
                required
                placeholder="Street address"
                disabled={submitting}
              />
              <FormField
                name="street2"
                label="Street Address 2"
                type="text"
                placeholder="Apartment, suite, etc."
                disabled={submitting}
              />
              <FormField
                name="city"
                label="City"
                type="text"
                required
                placeholder="City"
                disabled={submitting}
              />
              <FormField
                name="state"
                label="State"
                type="text"
                required
                placeholder="State"
                disabled={submitting}
              />
              <FormField
                name="zipCode"
                label="ZIP Code"
                type="text"
                required
                placeholder="ZIP / Postal code"
                disabled={submitting}
              />
              <FormField
                name="country"
                label="Country"
                type="text"
                required
                placeholder="Country"
                disabled={submitting}
              />
            </Space>

            <Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button
                type="default"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {submitting ? 'Saving...' : initialValues ? 'Update Contact' : 'Add Contact'}
              </Button>
            </Space>
          </Space>
        </form>
      </FormProvider>
    </Modal>
  );
};
