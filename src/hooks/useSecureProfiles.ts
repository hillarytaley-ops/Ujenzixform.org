import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DataPrivacyService } from '@/services/DataPrivacyService';

interface SecureProfile {
  id: string;
  business_name: string;
  location: string;
  is_professional: boolean;
  rating: number;
  member_since: string;
  // Personal data like phone, email, full_name are NOT exposed
  // Note: role is now stored in user_roles table, not in profiles
}

interface FullProfile {
  id: string;
  user_id: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  location: string;
  user_type: string;
  is_professional: boolean;
  rating: number;
  description?: string;
  specialties?: string[];
  years_experience?: number;
  created_at: string;
  updated_at: string;
  // Note: role is now stored in user_roles table, not in profiles
}

export const useSecureProfiles = () => {
  const [profiles, setProfiles] = useState<SecureProfile[]>([]);
  const [ownProfile, setOwnProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get user's own complete profile
  const fetchOwnProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error } = await supabase.functions.invoke('secure-profile-access', {
        body: { action: 'get_own' }
      });

      if (error) {
        throw new Error(error.message);
      }

      setOwnProfile(response.data);

      // Log access
      await DataPrivacyService.logDataProcessing({
        user_id: response.data.user_id,
        action: 'read',
        data_type: 'profile',
        purpose: 'account_management',
        legal_basis: 'contract_performance'
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
      console.error('Secure profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search public business profiles (no personal data exposed)
  const searchPublicProfiles = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error } = await supabase.functions.invoke('secure-profile-access', {
        body: { 
          action: 'search_public',
          search_query: searchQuery
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setProfiles(response.data || []);

      // Log the search
      await DataPrivacyService.logDataProcessing({
        user_id: 'current_user', // In production, get actual user ID
        action: 'read',
        data_type: 'public_profile',
        purpose: 'service_discovery',
        legal_basis: 'legitimate_interest'
      });

    } catch (err: any) {
      setError(err.message || 'Failed to search profiles');
      console.error('Secure profile search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get business contact info (only if user has business relationship)
  const getBusinessContact = useCallback(async (profileId: string): Promise<SecureProfile | null> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('secure-profile-access', {
        body: { 
          action: 'get_business_contact',
          profile_id: profileId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return response.data as SecureProfile;
    } catch (err: any) {
      console.error('Business contact access error:', err);
      toast({
        title: "Access Restricted",
        description: "You can only view business contact information for users you have active business relationships with.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Update user's own profile
  const updateOwnProfile = useCallback(async (updateData: Partial<FullProfile>): Promise<boolean> => {
    try {
      // Validate phone number if provided
      if (updateData.phone) {
        const validation = DataPrivacyService.validateKenyanPhone(updateData.phone);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid phone number');
        }
        updateData.phone = validation.formatted;
      }

      // Sanitize all string inputs
      const sanitizedData: any = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (typeof value === 'string') {
          sanitizedData[key] = DataPrivacyService.sanitizeInput(value);
        } else {
          sanitizedData[key] = value;
        }
      }

      const { data: response, error } = await supabase.functions.invoke('secure-profile-access', {
        body: { 
          action: 'update_own',
          update_data: sanitizedData
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      if (ownProfile) {
        setOwnProfile(prev => prev ? { ...prev, ...response.data } : null);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });

      return true;
    } catch (err: any) {
      console.error('Secure profile update error:', err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile",
        variant: "destructive"
      });
      return false;
    }
  }, [ownProfile, toast]);

  // Secure function to mask sensitive data for display
  const maskSensitiveData = useCallback((profile: FullProfile): Partial<FullProfile> => {
    return {
      ...profile,
      phone: profile.phone ? DataPrivacyService.maskPhoneNumber(profile.phone) : undefined,
      email: profile.email ? DataPrivacyService.maskEmail(profile.email) : undefined,
      full_name: profile.full_name 
        ? profile.full_name.split(' ')[0] + ' ' + profile.full_name.split(' ').slice(1).map(n => n[0] + '***').join(' ')
        : undefined
    };
  }, []);

  // Check if user has permission to view contact details
  const canViewContactDetails = useCallback(async (targetProfileId: string): Promise<boolean> => {
    try {
      // Check if user has business relationship
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // In production, this would check for active orders, quotes, or business relationships
      const { data: businessRelationship } = await supabase
        .from('deliveries')
        .select('id')
        .or(`builder_id.eq.${targetProfileId},supplier_id.eq.${targetProfileId}`)
        .limit(1);

      return businessRelationship && businessRelationship.length > 0;
    } catch (error) {
      console.error('Business relationship check error:', error);
      return false;
    }
  }, []);

  return {
    profiles,
    ownProfile,
    loading,
    error,
    fetchOwnProfile,
    searchPublicProfiles,
    getBusinessContact,
    updateOwnProfile,
    maskSensitiveData,
    canViewContactDetails,
    refetch: fetchOwnProfile
  };
};
