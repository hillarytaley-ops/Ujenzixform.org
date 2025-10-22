import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecureProviderContact {
  id: string;
  provider_name: string;
  provider_type: string;
  vehicle_types: string[];
  service_areas: string[];
  capacity_kg: number;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_deliveries: number;
  can_access_contact: boolean;
  contact_field_access: string;
  phone_number: string | null;
  email_address: string | null;
  physical_address: string | null;
  security_message: string;
  access_restrictions: string;
}

interface AdminProviderListing {
  id: string;
  provider_name: string;
  provider_type: string;
  vehicle_types: string[];
  service_areas: string[];
  capacity_kg: number;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_deliveries: number;
  created_at: string;
  updated_at: string;
  contact_status: string;
}

interface LimitedProviderListing {
  id: string;
  provider_name: string;
  vehicle_types: string[];
  service_areas: string[];
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  contact_status: string;
}

type SafeProviderListing = AdminProviderListing | LimitedProviderListing;

export const useSecureProviders = () => {
  const [providers, setProviders] = useState<SafeProviderListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get secure provider listings (ULTRA STRICT - Admin only or very limited for active deliveries)
  const fetchSafeProviderListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First try admin access - ONLY way to get full provider data
      const { data: adminData, error: adminError } = await supabase.rpc('get_delivery_providers_admin_only');
      
      if (!adminError && adminData && adminData.length > 0) {
        setProviders(adminData as SafeProviderListing[]);
        toast({
          title: "Admin Provider Directory",
          description: `Found ${adminData.length} providers. Full administrative access granted. All access is logged.`,
          variant: "default"
        });
        return;
      }

      // If not admin, try limited access for active deliveries (heavily restricted)
      const { data: limitedData, error: limitedError } = await supabase.rpc('get_providers_for_active_delivery_only');
      
      if (!limitedError && limitedData && limitedData.length > 0) {
        setProviders(limitedData as SafeProviderListing[]);
        toast({
          title: "Limited Provider Access",
          description: `Found ${limitedData.length} anonymous providers. Names and contact details fully protected.`,
          variant: "default"
        });
        return;
      }

      // NO ACCESS GRANTED - Maximum security
      setProviders([]);
      toast({
        title: "DRIVER DATA PROTECTED",
        description: "Driver names, contact details, and personal information are strictly admin-only for privacy protection.",
        variant: "destructive"
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch provider listings');
      console.error('Secure provider listings fetch error:', err);
      
      toast({
        title: "CRITICAL SECURITY: Access Blocked",
        description: "Driver personal information is ultra-protected. Only administrators can access driver data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Get secure provider contact (ULTRA STRICT - Admin only access)
  const getSecureProviderContact = useCallback(async (
    providerId: string, 
    requestedField: 'basic' | 'phone' | 'email' | 'address' | 'all' = 'basic'
  ): Promise<SecureProviderContact | null> => {
    try {
      const { data, error } = await supabase.rpc('get_ultra_secure_provider_contact', {
        provider_uuid: providerId,
        requested_field: requestedField
      });

      if (error) {
        throw new Error(error.message);
      }

      const providerData = data?.[0];
      
      if (!providerData) {
        toast({
          title: "DRIVER DATA PROTECTED",
          description: "Driver personal information is strictly admin-only. Unauthorized access blocked.",
          variant: "destructive"
        });
        return null;
      }

      // Show security notice - ONLY admin should get any real data
      if (!providerData.can_access_contact) {
        toast({
          title: "CRITICAL SECURITY: Access Blocked",
          description: providerData.security_message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Admin Access Granted",
          description: "Administrator accessing driver information. All access is logged for security.",
          variant: "default"
        });
      }

      return providerData;
    } catch (err: any) {
      console.error('Secure provider contact error:', err);
      toast({
        title: "DRIVER PERSONAL DATA PROTECTED",
        description: "Driver names, contact details, and personal information are ultra-secure admin-only.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Request specific contact field with justification
  const requestProviderContact = useCallback(async (
    providerId: string,
    contactType: 'phone' | 'email' | 'address',
    justification: string = 'business_contact_request'
  ): Promise<{
    success: boolean;
    contact_info: string | null;
    security_message: string;
  }> => {
    try {
      const providerData = await getSecureProviderContact(providerId, contactType);
      
      if (!providerData) {
        return {
          success: false,
          contact_info: null,
          security_message: 'Provider not found or access denied'
        };
      }

      let contactInfo: string | null = null;
      
      switch (contactType) {
        case 'phone':
          contactInfo = providerData.phone_number;
          break;
        case 'email':
          contactInfo = providerData.email_address;
          break;
        case 'address':
          contactInfo = providerData.physical_address;
          break;
      }

      if (contactInfo && providerData.can_access_contact) {
        toast({
          title: "Contact Information Accessed",
          description: `${contactType} information provided. All access is logged for security.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Contact Access Restricted",
          description: providerData.access_restrictions,
          variant: "destructive"
        });
      }

      return {
        success: !!contactInfo && providerData.can_access_contact,
        contact_info: contactInfo,
        security_message: providerData.security_message
      };
    } catch (err: any) {
      console.error('Provider contact request error:', err);
      return {
        success: false,
        contact_info: null,
        security_message: 'Error accessing provider contact information'
      };
    }
  }, [getSecureProviderContact, toast]);

  // Check if user can access provider contact info
  const canAccessProviderContact = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      const providerData = await getSecureProviderContact(providerId, 'basic');
      return providerData?.can_access_contact || false;
    } catch (err) {
      console.error('Error checking provider contact access:', err);
      return false;
    }
  }, [getSecureProviderContact]);

  // Log provider access attempt (for security auditing)
  const logProviderAccess = useCallback(async (
    providerId: string,
    accessType: string,
    justification: string = 'provider_profile_view'
  ) => {
    try {
      // The access is automatically logged by the secure function
      // This is an additional client-side log for UI interactions
      console.log(`Provider access: ${providerId}, type: ${accessType}, justification: ${justification}`);
    } catch (err) {
      console.error('Failed to log provider access:', err);
    }
  }, []);

  return {
    providers,
    loading,
    error,
    fetchSafeProviderListings,
    getSecureProviderContact,
    requestProviderContact,
    canAccessProviderContact,
    logProviderAccess,
    refetch: fetchSafeProviderListings
  };
};