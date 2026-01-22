/**
 * @module config/tenantDefaults
 * @description Default tenant configuration values
 *
 * These defaults are used when creating new tenants or when tenant data
 * is extracted from JWT tokens that don't include full tenant configuration.
 * Centralizing these values allows environment-specific overrides and
 * simplifies testing.
 */

import type { Tenant } from '../types/auth';

/**
 * Default tenant settings used when creating a new tenant
 */
export const DEFAULT_TENANT_SETTINGS: Tenant['settings'] = {
  theme: 'natural',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  features: [],
  branding: {
    primaryColor: '#1890ff',
    secondaryColor: '#52c41a',
    accentColor: '#faad14',
  },
};

/**
 * Default subscription configuration for new tenants
 */
export const DEFAULT_TENANT_SUBSCRIPTION: Tenant['subscription'] = {
  plan: 'basic',
  status: 'active',
  limits: {
    users: 10,
    contacts: 1000,
    storage: 1024,
  },
};

/**
 * Creates a complete default tenant object with the given ID and name
 *
 * @param id - Tenant ID (branded type)
 * @param name - Tenant display name (defaults to ID if not provided)
 * @returns Complete Tenant object with default settings
 */
export function createDefaultTenant(
  id: Tenant['id'],
  name?: string
): Tenant {
  return {
    id,
    name: name ?? String(id),
    settings: { ...DEFAULT_TENANT_SETTINGS },
    subscription: { ...DEFAULT_TENANT_SUBSCRIPTION },
  };
}
