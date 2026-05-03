import { clearSupabasePersistedSessionSync, readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
/**
 * ProfileViewDialog - Simple profile view popup
 * Shows user details with option to sign out
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  LogOut,
  Edit,
  Calendar,
  Shield
} from 'lucide-react';

interface ProfileViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
  onExitDashboard: () => void;
  userRole?: string; // Optional - if not provided, will be read from localStorage
}

export const ProfileViewDialog: React.FC<ProfileViewDialogProps> = ({
  isOpen,
  onClose,
  onEditProfile,
  onExitDashboard
}) => {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    
    try {
      // Get user info from localStorage
      const userRole = localStorage.getItem('user_role');
      const userName = localStorage.getItem('user_name');
      const userEmail = localStorage.getItem('user_email');
      const userId = localStorage.getItem('user_id');
      
      // Try to get from session
      let sessionData: any = null;
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          sessionData = JSON.parse(storedSession);
        }
      } catch (e) {}

      // Fetch profile from API
      const accessToken = sessionData?.access_token || '';
      
      const effectiveUserId = userId || sessionData?.user?.id;
      
      let profileData: any = null;
      let supplierData: any = null;
      let deliveryProviderData: any = null;
      
      if (effectiveUserId) {
        // Fetch from profiles table
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${effectiveUserId}&select=*`,
            { 
              headers: { 
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': accessToken ? `Bearer ${accessToken}` : ''
              }, 
              cache: 'no-store' 
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              profileData = data[0];
            }
          }
        } catch (e) {
          console.warn('Profile fetch failed');
        }
        
        // If user is a supplier, fetch supplier-specific data
        if (userRole === 'supplier') {
          try {
            const supplierResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${effectiveUserId}&select=*`,
              { 
                headers: { 
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': accessToken ? `Bearer ${accessToken}` : ''
                }, 
                cache: 'no-store' 
              }
            );
            
            if (supplierResponse.ok) {
              const supplierDataArr = await supplierResponse.json();
              if (supplierDataArr && supplierDataArr.length > 0) {
                supplierData = supplierDataArr[0];
              }
            }
          } catch (e) {
            console.warn('Supplier data fetch failed');
          }
        }
        
        // If user is a delivery provider, fetch delivery provider-specific data
        if (userRole === 'delivery' || userRole === 'delivery_provider') {
          try {
            const deliveryResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${effectiveUserId}&select=*`,
              { 
                headers: { 
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': accessToken ? `Bearer ${accessToken}` : ''
                }, 
                cache: 'no-store' 
              }
            );
            
            if (deliveryResponse.ok) {
              const deliveryDataArr = await deliveryResponse.json();
              if (deliveryDataArr && deliveryDataArr.length > 0) {
                deliveryProviderData = deliveryDataArr[0];
              }
            }
          } catch (e) {
            console.warn('Delivery provider data fetch failed');
          }
        }
      }

      // Merge data from all sources, prioritizing role-specific data
      const mergedProfile: any = {
        role: userRole,
        email: profileData?.email || sessionData?.user?.email || userEmail || 'Not provided',
        created_at: profileData?.created_at
      };
      
      if (userRole === 'supplier' && supplierData) {
        // For suppliers, prioritize supplier table data
        mergedProfile.full_name = supplierData.contact_person || supplierData.company_name || profileData?.full_name || userName || 'User';
        mergedProfile.company_name = supplierData.company_name || profileData?.store_name || profileData?.company_name;
        mergedProfile.phone = supplierData.phone || profileData?.phone;
        mergedProfile.location = supplierData.county || supplierData.physical_address || profileData?.location;
        mergedProfile.avatar_url = supplierData.company_logo_url || profileData?.avatar_url;
      } else if ((userRole === 'delivery' || userRole === 'delivery_provider') && deliveryProviderData) {
        // For delivery providers, prioritize delivery_providers table data
        mergedProfile.full_name = deliveryProviderData.full_name || deliveryProviderData.company_name || profileData?.full_name || userName || 'User';
        mergedProfile.company_name = deliveryProviderData.company_name;
        mergedProfile.phone = deliveryProviderData.phone || profileData?.phone;
        mergedProfile.location = deliveryProviderData.service_area || profileData?.location;
        mergedProfile.avatar_url = deliveryProviderData.profile_photo_url || profileData?.avatar_url;
      } else if (profileData) {
        // For other roles, use profiles table data
        mergedProfile.full_name = profileData.full_name || userName || 'User';
        mergedProfile.company_name = profileData.store_name || profileData.company_name;
        mergedProfile.phone = profileData.phone;
        mergedProfile.location = profileData.location;
        mergedProfile.avatar_url = profileData.avatar_url;
      } else {
        // Fallback to cached/session data
        mergedProfile.full_name = userName || sessionData?.user?.user_metadata?.full_name || 'User';
        mergedProfile.phone = sessionData?.user?.phone;
        mergedProfile.avatar_url = sessionData?.user?.user_metadata?.avatar_url;
      }
      
      setProfile(mergedProfile);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback
      const userRole = localStorage.getItem('user_role');
      const userName = localStorage.getItem('user_name');
      const userEmail = localStorage.getItem('user_email');
      setProfile({
        full_name: userName || 'User',
        email: userEmail || 'Not provided',
        phone: 'Not provided',
        role: userRole
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'professional_builder':
        return <Badge className="bg-blue-500">CO/Contractor</Badge>;
      case 'private_client':
        return <Badge className="bg-green-500">Private Client</Badge>;
      case 'supplier':
        return <Badge className="bg-amber-500">Supplier</Badge>;
      case 'delivery':
      case 'delivery_provider':
        return <Badge className="bg-purple-500">Delivery Provider</Badge>;
      case 'admin':
        return <Badge className="bg-red-500">Administrator</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                  {getInitials(profile.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{profile.full_name || 'User'}</h3>
                {getRoleBadge(profile.role)}
              </div>
            </div>

            <Separator />

            {/* Profile Details */}
            <div className="space-y-3">
              {/* Company/Business Name - Show prominently for suppliers */}
              {profile.company_name && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{profile.company_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{profile.email || 'Not provided'}</span>
              </div>
              
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{profile.phone || 'Not provided'}</span>
              </div>
              
              {profile.location && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}

              {profile.created_at && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              {onEditProfile && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    onClose();
                    onEditProfile();
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  onClose();
                  onExitDashboard();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => {
                  console.log('🚪 Logout: Starting sign out process...');
                  onClose();
                  // Clear auth data immediately
                  localStorage.removeItem('user_role');
                  localStorage.removeItem('user_role_id');
                  localStorage.removeItem('user_role_verified');
                  localStorage.removeItem('user_security_key');
                  localStorage.removeItem('user_email');
                  localStorage.removeItem('user_name');
                  localStorage.removeItem('user_id');
                  localStorage.removeItem('supplier_id');
                  clearSupabasePersistedSessionSync();
                  sessionStorage.clear();
                  // Redirect immediately - don't wait for Supabase signOut
                  window.location.replace('/auth');
                  // Sign out from Supabase in background (non-blocking)
                  signOut().catch(() => {});
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Unable to load profile
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
