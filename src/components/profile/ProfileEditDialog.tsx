import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import {
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  Navigation,
  Loader2,
  Save,
  Camera,
  Building2,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  Map
} from 'lucide-react';

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  userRole?: string;
}

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  company_name?: string;
  store_name?: string;
  bio?: string;
  website?: string;
  avatar_url?: string;
  address?: string;
  // Supplier-specific fields (from suppliers table)
  supplier_id?: string;
  contact_person?: string;
  company_logo_url?: string;
  county?: string;
}

const KENYAN_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu',
  'Machakos', 'Meru', 'Nyeri', 'Kakamega', 'Kisii', 'Garissa', 'Kitale',
  'Malindi', 'Naivasha', 'Kericho', 'Embu', 'Nanyuki', 'Lamu', 'Bungoma',
  'Migori', 'Homabay', 'Siaya', 'Busia', 'Vihiga', 'Bomet', 'Narok',
  'Kajiado', 'Trans-Nzoia', 'Uasin Gishu', 'Nandi', 'Baringo', 'Laikipia',
  'Samburu', 'West Pokot', 'Turkana', 'Elgeyo-Marakwet', 'Isiolo', 'Marsabit',
  'Mandera', 'Wajir', 'Tana River', 'Kilifi', 'Kwale', 'Taita-Taveta',
  'Makueni', 'Kitui', 'Tharaka-Nithi', 'Kirinyaga', 'Murang\'a', 'Nyamira'
];

export const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  userRole
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    console.log('📝 ProfileEditDialog: Loading profile... userRole:', userRole);
    
    // Get user info from localStorage FIRST (instant)
    let userId = '';
    let userEmail = '';
    
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        userId = parsed?.user?.id || '';
        userEmail = parsed?.user?.email || '';
      }
    } catch (e) {
      console.log('📝 ProfileEditDialog: localStorage session read failed');
    }

    // Fallback to other localStorage keys
    if (!userId) {
      userId = localStorage.getItem('user_id') || localStorage.getItem('user_role_id') || '';
      userEmail = localStorage.getItem('user_email') || '';
    }

    console.log('📝 ProfileEditDialog: User ID:', userId, 'Email:', userEmail);

    // If no user ID found, show error and close
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to edit your profile',
        variant: 'destructive'
      });
      setLoading(false);
      onClose();
      return;
    }

    // Set a default profile IMMEDIATELY so user sees something
    const defaultProfile: ProfileData = {
      id: userId,
      user_id: userId,
      full_name: userEmail?.split('@')[0] || 'User',
      email: userEmail
    };

    // Show loading but with a very short timeout
    setLoading(true);
    
    // Safety timeout - show default profile after 4 seconds max
    const timeoutId = setTimeout(() => {
      console.log('📝 ProfileEditDialog: Timeout - showing default profile');
      setProfile(defaultProfile);
      setLoading(false);
    }, 4000);

    // Try to fetch profile with short timeout
    try {
      // Get access token for authenticated request
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed?.access_token || '';
        }
      } catch (e) {}
      
      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || '';
      }

      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      };

      // Fetch profile from profiles table - use Supabase client for better auth handling
      let profileData: ProfileData = { ...defaultProfile };
      
      try {
        // Try using Supabase client first (handles auth automatically)
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profileError) {
          console.warn('📝 ProfileEditDialog: Supabase client fetch error:', profileError.message);
          // Fallback to REST API
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`,
            { headers, signal: controller.signal }
          );
          clearTimeout(fetchTimeout);

          if (response.ok) {
            const profiles = await response.json();
            if (profiles && profiles.length > 0) {
              profileData = { ...profiles[0], email: userEmail };
              console.log('✅ ProfileEditDialog: Profile loaded from REST API:', profiles[0].full_name);
            }
          }
        } else if (profiles) {
          profileData = { ...profiles, email: userEmail };
          console.log('✅ ProfileEditDialog: Profile loaded from Supabase client:', profiles.full_name);
        }
      } catch (fetchError) {
        console.warn('📝 ProfileEditDialog: Profile fetch error:', fetchError);
      }

      // If user is a supplier, ALSO fetch from suppliers table to get store/company name
      if (userRole === 'supplier') {
        console.log('📝 ProfileEditDialog: User is supplier, fetching supplier data...');
        
        try {
          const supplierController = new AbortController();
          const supplierTimeout = setTimeout(() => supplierController.abort(), 3000);

          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${userId}&select=*`,
            { headers, signal: supplierController.signal }
          );
          clearTimeout(supplierTimeout);

          if (supplierResponse.ok) {
            const suppliers = await supplierResponse.json();
            if (suppliers && suppliers.length > 0) {
              const supplierData = suppliers[0];
              console.log('✅ ProfileEditDialog: Supplier data loaded:', supplierData.company_name);
              
              // Merge supplier data into profile
              profileData = {
                ...profileData,
                supplier_id: supplierData.id,
                company_name: supplierData.company_name || profileData.company_name,
                store_name: supplierData.company_name || profileData.store_name,
                contact_person: supplierData.contact_person,
                phone: supplierData.phone || profileData.phone,
                location: supplierData.county || supplierData.location || profileData.location,
                county: supplierData.county,
                address: supplierData.address || supplierData.physical_address || profileData.address,
                avatar_url: supplierData.company_logo_url || profileData.avatar_url,
                company_logo_url: supplierData.company_logo_url,
                website: supplierData.website_url || profileData.website,
                bio: supplierData.description || profileData.bio,
              };
            }
          }
        } catch (supplierError) {
          console.log('📝 ProfileEditDialog: Supplier fetch failed:', supplierError);
        }
      }

      clearTimeout(timeoutId);
      setProfile(profileData);
      setLoading(false);
      return;
    } catch (fetchError) {
      console.log('📝 ProfileEditDialog: REST fetch failed:', fetchError);
    }

    // If REST failed, use default profile
    console.log('📝 ProfileEditDialog: Using default profile');
    clearTimeout(timeoutId);
    setProfile(defaultProfile);
    setLoading(false);
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude } = position.coords;
      console.log('📍 Got coordinates:', latitude, longitude);

      // Update profile with coordinates
      setProfile(prev => prev ? {
        ...prev,
        latitude,
        longitude
      } : null);

      // Try to get address from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'UjenziXform/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const address = data.display_name || '';
          const county = data.address?.county || data.address?.city || data.address?.state || '';
          
          console.log('📍 Reverse geocoded address:', address);
          console.log('📍 County:', county);

          // Find matching Kenyan county
          const matchedCounty = KENYAN_COUNTIES.find(c => 
            county.toLowerCase().includes(c.toLowerCase()) ||
            address.toLowerCase().includes(c.toLowerCase())
          );

          setProfile(prev => prev ? {
            ...prev,
            latitude,
            longitude,
            address: address.substring(0, 200), // Limit address length
            location: matchedCounty || prev.location
          } : null);

          toast({
            title: '📍 Location Updated!',
            description: matchedCounty 
              ? `Location set to ${matchedCounty}` 
              : 'Coordinates saved. Please select your county manually.'
          });
        }
      } catch (geoError) {
        console.log('📍 Reverse geocoding failed, using coordinates only');
        toast({
          title: '📍 Coordinates Saved',
          description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}. Please select your county manually.`
        });
      }
    } catch (error: any) {
      console.error('📍 Geolocation error:', error);
      let errorMessage = 'Failed to get your location';
      
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please allow location access in your browser settings.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please try again or enter manually.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }

      setLocationError(errorMessage);
      toast({
        title: 'Location Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSave = async () => {
    console.log('📝 ProfileEditDialog: handleSave called, profile:', profile);
    
    if (!profile) {
      console.error('📝 ProfileEditDialog: No profile to save!');
      toast({
        title: 'Error',
        description: 'No profile data to save. Please refresh and try again.',
        variant: 'destructive'
      });
      return;
    }

    if (!profile.user_id) {
      console.error('📝 ProfileEditDialog: No user_id in profile!');
      toast({
        title: 'Error',
        description: 'User ID missing. Please log out and log back in.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    console.log('📝 ProfileEditDialog: Saving profile for user:', profile.user_id);

    try {
      // Get access token - use Supabase's getSession() which handles token refresh automatically
      let accessToken = '';
      
      try {
        // First try Supabase's getSession() - this handles token refresh automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('📝 ProfileEditDialog: Session error:', sessionError.message);
        }
        
        if (session?.access_token) {
          accessToken = session.access_token;
          console.log('📝 ProfileEditDialog: Got fresh token from Supabase (length:', accessToken.length, ')');
        } else {
          // Fallback to localStorage
          console.log('📝 ProfileEditDialog: No session from Supabase, trying localStorage...');
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed?.access_token || '';
            if (accessToken) {
              console.log('📝 ProfileEditDialog: Got token from localStorage (length:', accessToken.length, ')');
            }
          }
        }
      } catch (e) {
        console.error('📝 ProfileEditDialog: Error getting session:', e);
      }

      if (!accessToken) {
        console.error('📝 ProfileEditDialog: No access token found!');
        toast({
          title: 'Authentication Error',
          description: 'Please refresh the page and try again. If the problem persists, please log out and log back in.',
          variant: 'destructive'
        });
        throw new Error('No access token found. Please refresh the page and try again.');
      }
      
      console.log('📝 ProfileEditDialog: Got access token, proceeding with save...');

      // Prepare update data - Include all fields that exist in profiles table
      // Based on migrations, profiles table has: full_name, phone, location, avatar_url, company_name, bio, website, county, etc.
      const updateData: Record<string, any> = {
        full_name: profile.full_name || '',
        phone: profile.phone || null,
        location: profile.location || null,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString()
      };

      // Add optional fields if they exist in the profile
      if (profile.company_name) updateData.company_name = profile.company_name;
      if (profile.bio) updateData.bio = profile.bio;
      if (profile.website) updateData.website = profile.website;
      if (profile.county) updateData.county = profile.county;

      console.log('📝 ProfileEditDialog: Update data:', updateData);

      // First try PATCH (update existing)
      let response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${profile.user_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        }
      );

      // Check if PATCH worked
      if (response.ok) {
        const result = await response.json();
        console.log('📝 ProfileEditDialog: PATCH result:', result);
        
        // If no rows updated, try INSERT (upsert)
        if (!result || result.length === 0) {
          console.log('📝 ProfileEditDialog: No rows updated, trying upsert...');
          
          // Use all fields that exist in profiles table
          const insertData: Record<string, any> = {
            id: profile.id || profile.user_id,
            user_id: profile.user_id,
            full_name: profile.full_name || '',
            phone: profile.phone || null,
            location: profile.location || null,
            avatar_url: profile.avatar_url || null,
            updated_at: new Date().toISOString()
          };

          // Add optional fields if they exist
          if (profile.company_name) insertData.company_name = profile.company_name;
          if (profile.bio) insertData.bio = profile.bio;
          if (profile.website) insertData.website = profile.website;
          if (profile.county) insertData.county = profile.county;
          
          response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify(insertData)
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('📝 ProfileEditDialog: Upsert error:', response.status, errorText);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('📝 ProfileEditDialog: Save error:', response.status, errorText);
        
        // If 401, try refreshing the session
        if (response.status === 401) {
          console.log('📝 ProfileEditDialog: 401 error, refreshing session...');
          try {
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('📝 ProfileEditDialog: Session refresh failed:', refreshError);
              throw new Error('Session expired. Please refresh the page and try again.');
            }
            if (newSession?.access_token) {
              accessToken = newSession.access_token;
              console.log('📝 ProfileEditDialog: Session refreshed, retrying save...');
              // Retry the PATCH with new token
              response = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${profile.user_id}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify(updateData)
                }
              );
              
              if (response.ok) {
                const result = await response.json();
                console.log('📝 ProfileEditDialog: Retry PATCH result:', result);
                // Continue with success flow - response is now ok
              }
            }
          } catch (refreshError) {
            console.error('📝 ProfileEditDialog: Session refresh error:', refreshError);
            throw new Error('Session expired. Please refresh the page and try again.');
          }
        }
        
        // If still not ok after retry, try upsert as fallback
        if (!response.ok) {
          console.log('📝 ProfileEditDialog: PATCH failed, trying upsert...');
          
          // Use all fields that exist in profiles table
          const insertData: Record<string, any> = {
            id: profile.id || profile.user_id,
            user_id: profile.user_id,
            full_name: profile.full_name || '',
            phone: profile.phone || null,
            location: profile.location || null,
            avatar_url: profile.avatar_url || null,
            updated_at: new Date().toISOString()
          };

          // Add optional fields if they exist
          if (profile.company_name) insertData.company_name = profile.company_name;
          if (profile.bio) insertData.bio = profile.bio;
          if (profile.website) insertData.website = profile.website;
          if (profile.county) insertData.county = profile.county;
          
          response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify(insertData)
            }
          );
          
          if (!response.ok) {
            const upsertError = await response.text();
            console.error('📝 ProfileEditDialog: Upsert also failed:', upsertError);
            throw new Error(`Save failed: ${response.status}. ${upsertError || 'Please try again.'}`);
          }
        }
      }

      // Also update supplier record if user is a supplier - THIS IS CRITICAL for store name, logo, etc.
      if (userRole === 'supplier') {
        console.log('📝 ProfileEditDialog: Updating supplier record...');
        
        const supplierUpdateData: Record<string, any> = {
          phone: profile.phone || null,
          county: profile.location || null,
          updated_at: new Date().toISOString()
        };

        // Include company_name if provided (store name)
        if (profile.store_name || profile.company_name) {
          supplierUpdateData.company_name = profile.store_name || profile.company_name;
        }

        // Include contact_person if provided
        if (profile.contact_person) {
          supplierUpdateData.contact_person = profile.contact_person;
        }

        // Include company_logo_url if avatar was uploaded
        if (profile.avatar_url) {
          supplierUpdateData.company_logo_url = profile.avatar_url;
        }

        // Include address if provided
        if (profile.address) {
          supplierUpdateData.physical_address = profile.address;
          supplierUpdateData.address = profile.address;
        }

        // Include website if provided
        if (profile.website) {
          supplierUpdateData.website_url = profile.website;
        }

        // Include bio/description if provided
        if (profile.bio) {
          supplierUpdateData.description = profile.bio;
        }

        console.log('📝 ProfileEditDialog: Supplier update data:', supplierUpdateData);

        try {
          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${profile.user_id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(supplierUpdateData)
            }
          );

          if (supplierResponse.ok) {
            const result = await supplierResponse.json();
            console.log('✅ ProfileEditDialog: Supplier record updated:', result);
          } else {
            const errorText = await supplierResponse.text();
            console.error('📝 ProfileEditDialog: Supplier update failed:', supplierResponse.status, errorText);
          }
        } catch (supplierError) {
          console.error('📝 ProfileEditDialog: Supplier update error:', supplierError);
        }
      }

      // Update delivery provider record if applicable (non-blocking)
      if (userRole === 'delivery' || userRole === 'delivery_provider') {
        // Fire and forget - don't block profile save
        fetch(
          `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${profile.user_id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              phone: profile.phone || null,
              location: profile.location || null,
              updated_at: new Date().toISOString()
            })
          }
        ).then(r => r.ok && console.log('✅ Delivery provider record updated'))
         .catch(() => console.log('📝 Delivery provider update skipped'));
      }

      // Update builder record if applicable (non-blocking)
      if (userRole === 'professional_builder' || userRole === 'private_client') {
        // Fire and forget - don't block profile save
        fetch(
          `${SUPABASE_URL}/rest/v1/builders?user_id=eq.${profile.user_id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              phone: profile.phone || null,
              location: profile.location || null,
              updated_at: new Date().toISOString()
            })
          }
        ).then(r => r.ok && console.log('✅ Builder record updated'))
         .catch(() => console.log('📝 Builder update skipped'));
      }

      console.log('✅ ProfileEditDialog: Profile saved successfully');
      toast({
        title: '✅ Profile Updated!',
        description: 'Your profile has been saved successfully'
      });

      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('📝 ProfileEditDialog: Save error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('📸 handleAvatarUpload called, file:', file?.name, 'profile:', !!profile);
    
    if (!file) {
      console.log('📸 No file selected');
      return;
    }
    
    if (!profile) {
      console.log('📸 No profile loaded');
      toast({
        title: 'Error',
        description: 'Profile not loaded. Please wait and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    console.log('📸 Starting avatar upload for user:', profile.user_id);
    
    try {
      // ALWAYS use data URL first - it's the most reliable
      // This ensures the user sees their photo immediately
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        console.log('📸 Data URL created, length:', dataUrl.length);
        setProfile(prev => prev ? { ...prev, avatar_url: dataUrl } : null);
        toast({
          title: '📸 Photo Added!',
          description: 'Photo preview ready. Click "Save Changes" to save your profile.',
        });
        setUploading(false);
      };
      
      reader.onerror = () => {
        console.error('📸 FileReader error');
        toast({
          title: 'Error',
          description: 'Failed to read image file. Please try again.',
          variant: 'destructive'
        });
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
      
      // Also try to upload to storage in background (don't block UI)
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${profile.user_id}/${fileName}`;

      console.log('📸 Attempting background upload to path:', filePath);

      // Try upload to storage in background
      supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })
        .then(({ data, error }) => {
          if (!error && data) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (urlData?.publicUrl) {
              console.log('📸 Background upload successful:', urlData.publicUrl);
              // Update to use the actual URL instead of data URL
              setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
            }
          } else {
            console.log('📸 Background upload failed (using data URL):', error?.message);
          }
        })
        .catch(err => {
          console.log('📸 Background upload error (using data URL):', err);
        });
        
    } catch (error: any) {
      console.error('📸 Error in avatar upload:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to process photo. Please try again.',
        variant: 'destructive'
      });
      setUploading(false);
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

  const isSupplier = userRole === 'supplier';
  const isDelivery = userRole === 'delivery' || userRole === 'delivery_provider';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Your Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile information. Your location helps connect you with nearby {isSupplier ? 'customers' : isDelivery ? 'deliveries' : 'suppliers'}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        ) : !profile ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load profile. Please try again.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6 py-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-primary text-white text-xl font-bold">
                    {getInitials(profile.store_name || profile.company_name || profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </div>
                </label>
              </div>
              <div>
                <h3 className="font-semibold">{profile.full_name}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                {userRole && (
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {userRole.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="mt-1"
                />
              </div>

              {/* Store Name (for Suppliers) */}
              {isSupplier && (
                <>
                  <div>
                    <Label htmlFor="storeName" className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-orange-500" />
                      Store / Business Name *
                    </Label>
                    <Input
                      id="storeName"
                      value={profile.store_name || profile.company_name || ''}
                      onChange={(e) => setProfile({ ...profile, store_name: e.target.value, company_name: e.target.value })}
                      placeholder="e.g., Mombasa Building Supplies"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This name will be shown to customers when they browse suppliers
                    </p>
                  </div>

                  {/* Contact Person (for Suppliers) */}
                  <div>
                    <Label htmlFor="contactPerson" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Contact Person
                    </Label>
                    <Input
                      id="contactPerson"
                      value={profile.contact_person || profile.full_name || ''}
                      onChange={(e) => setProfile({ ...profile, contact_person: e.target.value })}
                      placeholder="Primary contact name"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The person customers should ask for
                    </p>
                  </div>
                </>
              )}

              {/* Company Name (for non-suppliers) */}
              {!isSupplier && (
                <div>
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={profile.company_name || ''}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    placeholder="Your company name (optional)"
                    className="mt-1"
                  />
                </div>
              )}

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  className="mt-1"
                />
              </div>

              {/* Location Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  Location
                </Label>

                {/* GPS Location Button */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="flex-1"
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <Crosshair className="h-4 w-4 mr-2" />
                        📍 Use My Current Location
                      </>
                    )}
                  </Button>
                </div>

                {locationError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{locationError}</AlertDescription>
                  </Alert>
                )}

                {/* Coordinates Display */}
                {profile.latitude && profile.longitude && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Location Coordinates Saved
                    </div>
                    <div className="text-xs text-green-600 font-mono">
                      Lat: {profile.latitude.toFixed(6)}, Lng: {profile.longitude.toFixed(6)}
                    </div>
                    {profile.address && (
                      <div className="text-xs text-green-600 mt-1 truncate">
                        📍 {profile.address}
                      </div>
                    )}
                  </div>
                )}

                {/* County Selection */}
                <div>
                  <Label htmlFor="county" className="text-sm">County / Region</Label>
                  <Select
                    value={profile.location || ''}
                    onValueChange={(v) => setProfile({ ...profile, location: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your county" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {KENYAN_COUNTIES.sort().map(county => (
                        <SelectItem key={county} value={county}>{county}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio" className="flex items-center gap-2">
                  About
                </Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder={isSupplier 
                    ? "Tell customers about your store, products, and services..." 
                    : isDelivery 
                      ? "Tell clients about your delivery services and experience..."
                      : "Tell others about yourself and your projects..."
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  value={profile.website || ''}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !profile}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
