/**
 * Centralized sync for delivery provider details.
 *
 * Ensures delivery_providers + profiles always have provider_name/phone
 * so supplier/builder dashboards display correctly.
 *
 * Use this in ALL registration flows and profile edits for delivery role.
 */

import { supabase } from '@/integrations/supabase/client';

export interface DeliveryProviderSyncPayload {
  userId: string;
  providerName: string;
  phone: string;
  email?: string;
  address?: string;
  providerType?: 'individual' | 'company';
  vehicleTypes?: string[];
  serviceAreas?: string[];
  contactPerson?: string;
  drivingLicenseNumber?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

/**
 * Syncs delivery provider details to delivery_providers and profiles.
 * Call after registration, profile edit, or admin approval.
 */
export async function syncDeliveryProviderDetails(
  payload: DeliveryProviderSyncPayload
): Promise<{ success: boolean; error?: string }> {
  const {
    userId,
    providerName,
    phone,
    email,
    address,
    providerType = 'individual',
    vehicleTypes = ['motorcycle'],
    serviceAreas = [],
    contactPerson,
    drivingLicenseNumber,
    isVerified = false,
    isActive = true,
  } = payload;

  const displayName = (providerName || '').trim() || 'Delivery Provider';
  const phoneTrim = (phone || '').trim() || '0000000000';

  try {
    // 1) Sync profiles (full_name, phone) - dashboards/RPCs use as fallback
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: displayName,
        phone: phoneTrim,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (profileErr) {
      console.warn('DeliveryProviderSync: profile update failed', profileErr);
    }

    // 2) Upsert delivery_providers (primary source for supplier/builder display)
    const dpPayload = {
      provider_name: displayName,
      provider_type: providerType,
      phone: phoneTrim,
      email: (email || '').trim() || null,
      address: (address || '').trim() || null,
      contact_person: contactPerson?.trim() || null,
      vehicle_types: Array.isArray(vehicleTypes) && vehicleTypes.length > 0 ? vehicleTypes : ['motorcycle'],
      service_areas: Array.isArray(serviceAreas) ? serviceAreas : [],
      driving_license_number: drivingLicenseNumber?.trim() || null,
      is_verified: isVerified,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('delivery_providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('delivery_providers')
        .update(dpPayload)
        .eq('user_id', userId);
      if (updateErr) {
        console.warn('DeliveryProviderSync: delivery_providers update failed', updateErr);
        return { success: false, error: updateErr.message };
      }
    } else {
      const { error: insertErr } = await supabase
        .from('delivery_providers')
        .insert({
          user_id: userId,
          ...dpPayload,
        });
      if (insertErr) {
        console.warn('DeliveryProviderSync: delivery_providers insert failed', insertErr);
        return { success: false, error: insertErr.message };
      }
    }

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('DeliveryProviderSync: unexpected error', msg);
    return { success: false, error: msg };
  }
}
