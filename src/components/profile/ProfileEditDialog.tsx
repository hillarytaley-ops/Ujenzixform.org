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
    setLoading(true);
    console.log('📝 ProfileEditDialog: Loading profile...');

    // Safety timeout - don't let loading hang forever
    const timeoutId = setTimeout(() => {
      console.log('📝 ProfileEditDialog: Timeout reached, using default profile');
      setLoading(false);
    }, 8000);

    try {
      // Get user from localStorage (fastest)
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
        console.log('📝 ProfileEditDialog: localStorage read failed');
      }

      if (!userId) {
        // Fallback to Supabase with timeout
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 5000)
          );
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          userId = session?.user?.id || '';
          userEmail = session?.user?.email || '';
        } catch (e) {
          console.log('📝 ProfileEditDialog: Session fetch timeout');
        }
      }

      if (!userId) {
        // Last resort - check localStorage for cached user info
        userId = localStorage.getItem('user_id') || localStorage.getItem('user_role_id') || '';
        userEmail = localStorage.getItem('user_email') || '';
      }

      if (!userId) {
        clearTimeout(timeoutId);
        toast({
          title: 'Error',
          description: 'You must be logged in to edit your profile',
          variant: 'destructive'
        });
        setLoading(false);
        onClose();
        return;
      }

      console.log('📝 ProfileEditDialog: User ID:', userId, 'Email:', userEmail);

      // Fetch profile with timeout
      try {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            signal: controller.signal
          }
        );
        clearTimeout(fetchTimeout);

        if (response.ok) {
          const profiles = await response.json();
          if (profiles && profiles.length > 0) {
            setProfile(profiles[0]);
            console.log('✅ ProfileEditDialog: Profile loaded:', profiles[0].full_name);
            clearTimeout(timeoutId);
            setLoading(false);
            return;
          }
        }
      } catch (fetchError) {
        console.log('📝 ProfileEditDialog: REST fetch failed, trying Supabase client');
      }

      // Fallback to Supabase client
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('📝 ProfileEditDialog: Error fetching profile:', error);
        }

        if (profileData) {
          setProfile(profileData);
          console.log('✅ ProfileEditDialog: Profile loaded via client:', profileData.full_name);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }
      } catch (clientError) {
        console.log('📝 ProfileEditDialog: Supabase client fetch failed');
      }

      // Create default profile if nothing found
      console.log('📝 ProfileEditDialog: No profile found, creating default');
      setProfile({
        id: userId,
        user_id: userId,
        full_name: userEmail?.split('@')[0] || 'User',
        email: userEmail
      });
      
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (error) {
      console.error('📝 ProfileEditDialog: Error:', error);
      clearTimeout(timeoutId);
      
      // Even on error, try to show a default profile
      const cachedEmail = localStorage.getItem('user_email') || '';
      const cachedUserId = localStorage.getItem('user_id') || localStorage.getItem('user_role_id') || '';
      
      if (cachedUserId) {
        setProfile({
          id: cachedUserId,
          user_id: cachedUserId,
          full_name: cachedEmail?.split('@')[0] || 'User',
          email: cachedEmail
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load profile. Please try again.',
          variant: 'destructive'
        });
      }
      setLoading(false);
    }
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
    if (!profile) return;

    setSaving(true);
    console.log('📝 ProfileEditDialog: Saving profile...');

    try {
      // Get access token
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

      if (!accessToken) {
        throw new Error('No access token found. Please log out and log back in.');
      }

      // Prepare update data
      const updateData: Record<string, any> = {
        full_name: profile.full_name,
        updated_at: new Date().toISOString()
      };

      // Add optional fields
      if (profile.phone) updateData.phone = profile.phone;
      if (profile.location) updateData.location = profile.location;
      if (profile.company_name) updateData.company_name = profile.company_name;
      if (profile.store_name) updateData.store_name = profile.store_name;
      if (profile.bio) updateData.bio = profile.bio;
      if (profile.website) updateData.website = profile.website;
      if (profile.address) updateData.address = profile.address;
      if (profile.latitude) updateData.latitude = profile.latitude;
      if (profile.longitude) updateData.longitude = profile.longitude;

      console.log('📝 ProfileEditDialog: Update data:', updateData);

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${profile.user_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📝 ProfileEditDialog: Save error:', response.status, errorText);
        throw new Error(`Save failed: ${response.status}`);
      }

      // Also update supplier record if user is a supplier
      if (userRole === 'supplier' && profile.store_name) {
        try {
          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${profile.user_id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                company_name: profile.store_name,
                location: profile.location,
                latitude: profile.latitude,
                longitude: profile.longitude,
                updated_at: new Date().toISOString()
              })
            }
          );
          
          if (supplierResponse.ok) {
            console.log('✅ ProfileEditDialog: Supplier record updated');
          }
        } catch (e) {
          console.log('📝 ProfileEditDialog: Supplier update skipped (may not exist)');
        }
      }

      // Update delivery provider record if applicable
      if (userRole === 'delivery' || userRole === 'delivery_provider') {
        try {
          const deliveryResponse = await fetch(
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
                full_name: profile.full_name,
                phone: profile.phone,
                location: profile.location,
                latitude: profile.latitude,
                longitude: profile.longitude,
                updated_at: new Date().toISOString()
              })
            }
          );
          
          if (deliveryResponse.ok) {
            console.log('✅ ProfileEditDialog: Delivery provider record updated');
          }
        } catch (e) {
          console.log('📝 ProfileEditDialog: Delivery provider update skipped');
        }
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
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile({ ...profile, avatar_url: data.publicUrl });

      toast({
        title: 'Photo Uploaded!',
        description: 'Your profile photo has been updated'
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive'
      });
    } finally {
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
                <div>
                  <Label htmlFor="storeName" className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-orange-500" />
                    Store / Business Name
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
