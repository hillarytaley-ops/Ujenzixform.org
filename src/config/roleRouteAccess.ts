/**
 * Single source of truth for which `user_roles.role` values may open marketplace,
 * delivery hub, scanners, and monitoring routes (see `App.tsx` + `Navigation.tsx`).
 */

import { isDeliveryProviderRole } from '@/utils/deliveryProviderHiringApproval';

export const MARKETPLACE_AND_LOGISTICS_ROLES = [
  "private_client",
  "professional_builder",
  "builder",
  "supplier",
  "delivery",
  "delivery_provider",
  "admin",
  "super_admin",
] as const;

export const SCANNER_PORTAL_ROLES = [
  "supplier",
  "delivery",
  "delivery_provider",
  "admin",
  "super_admin",
] as const;

/** Monitoring uses the same gate as marketplace/logistics tools. */
export const MONITORING_PORTAL_ROLES = MARKETPLACE_AND_LOGISTICS_ROLES;

export type RoleAccessOptions = {
  /** Required true for delivery / delivery_provider operational routes. */
  deliveryHiringApproved?: boolean;
};

export function hasMarketplaceLogisticsAccess(
  role: string | null | undefined,
  options?: RoleAccessOptions
): boolean {
  if (isDeliveryProviderRole(role)) {
    return options?.deliveryHiringApproved === true;
  }
  return !!role && (MARKETPLACE_AND_LOGISTICS_ROLES as readonly string[]).includes(role);
}

export function hasScannerPortalAccess(
  role: string | null | undefined,
  options?: RoleAccessOptions
): boolean {
  if (isDeliveryProviderRole(role)) {
    return options?.deliveryHiringApproved === true;
  }
  return !!role && (SCANNER_PORTAL_ROLES as readonly string[]).includes(role);
}

export function hasMonitoringPortalAccess(
  role: string | null | undefined,
  options?: RoleAccessOptions
): boolean {
  return hasMarketplaceLogisticsAccess(role, options);
}
