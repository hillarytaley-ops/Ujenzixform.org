import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Camera,
  Upload,
  Save,
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Shield,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface BuilderProfile {
  id: string;
  user_id: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
  website?: string;
  is_verified?: boolean;
  years_experience?: number;
  team_size?: number;
  service_areas?: string[];
  certifications?: string[];
  specialties?: string[];
  price_range?: string;
  show_phone?: boolean;
  show_email?: boolean;
  allow_messages?: boolean;
  allow_calls?: boolean;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
}

interface BuilderProfileEditProps {
  // Dialog mode props
  isOpen?: boolean;
  onClose?: () => void;
  // Embedded mode props (for dashboard)
  userId?: string;
  builderCategory?: string;
  // Common props
  onSave?: () => void;
}

const KENYAN_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu',
  'Machakos', 'Meru', 'Nyeri', 'Kakamega', 'Kisii', 'Garissa', 'Kitale',
  'Malindi', 'Naivasha', 'Kericho', 'Embu', 'Nanyuki', 'Lamu'
];

const CONSTRUCTION_SPECIALTIES = [
  'Residential Construction',
  'Commercial Construction',
  'Industrial Construction',
  'Road Construction',
  'Renovation & Remodeling',
  'Interior Design',
  'Electrical Installation',
  'Plumbing Systems',
  'Roofing',
  'Foundation Work',
  'Masonry',
  'Carpentry',
  'Solar Installation',
  'HVAC Systems',
  'Landscaping',
  'Steel Construction'
];

const PRICE_RANGES = [
  'Under KES 500K',
  'KES 500K - 2M',
  'KES 2M - 10M',
  'KES 10M - 50M',
  'KES 50M+',
  'Custom Quote'
];

export const BuilderProfileEdit: React.FC<BuilderProfileEditProps> = ({
  isOpen,
  onClose,
  userId,
  builderCategory,
  onSave
}) => {
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newServiceArea, setNewServiceArea] = useState('');
  const { toast } = useToast();

  // Determine if we're in dialog mode or embedded mode
  const isDialogMode = isOpen !== undefined;
  const isEmbeddedMode = !isDialogMode;

  // Helper: wrap promise with timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  };

  useEffect(() => {
    // Load profile when dialog opens OR when in embedded mode
    if (isDialogMode && isOpen) {
      loadProfile();
    } else if (isEmbeddedMode) {
      loadProfile();
    }
  }, [isOpen, isEmbeddedMode]);

  const loadProfile = async () => {
    setLoading(true);
    console.log('📝 BuilderProfileEdit: Loading profile...');
    
    // Safety timeout - show form after 8 seconds max with default profile
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ BuilderProfileEdit: Safety timeout reached, using default profile');
      createDefaultProfile();
      setLoading(false);
    }, 8000);
    
    try {
      // Use getSession() instead of getUser() - it's faster and uses cached session
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        5000,
        { data: { session: null }, error: null }
      );
      
      let user = sessionResult.data?.session?.user;
      
      // If session timeout, try to get user from localStorage as fallback
      if (!user) {
        console.log('📝 BuilderProfileEdit: Session timeout, trying localStorage fallback');
        try {
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            user = parsed?.user;
            console.log('📝 BuilderProfileEdit: Got user from localStorage:', user?.email);
          }
        } catch (e) {
          console.log('📝 BuilderProfileEdit: localStorage fallback failed');
        }
      }
      
      if (!user) {
        console.log('📝 BuilderProfileEdit: No user found, showing error');
        toast({
          title: 'Error',
          description: 'You must be logged in to edit your profile',
          variant: 'destructive'
        });
        clearTimeout(safetyTimeout);
        setLoading(false);
        if (onClose) onClose();
        return;
      }

      console.log('📝 BuilderProfileEdit: Fetching profile for user:', user.id);
      
      const profileResult = await withTimeout(
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        8000,
        { data: null, error: { message: 'Timeout' } }
      );

      if (profileResult.error) {
        console.log('📝 BuilderProfileEdit: Profile fetch error, creating default:', profileResult.error.message);
        // Create default profile with user info so they can still edit
        const defaultProfile: BuilderProfile = {
          id: user.id,
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'User',
          email: user.email,
          specialties: [],
          certifications: [],
          service_areas: [],
          show_phone: true,
          show_email: true,
          allow_messages: true,
          allow_calls: true
        };
        setProfile(defaultProfile);
        setIsOwner(true);
        clearTimeout(safetyTimeout);
        setLoading(false);
        return;
      }

      const profileData = profileResult.data;
      
      // Verify ownership
      if (profileData && profileData.user_id !== user.id) {
        toast({
          title: 'Access Denied',
          description: 'You can only edit your own profile',
          variant: 'destructive'
        });
        clearTimeout(safetyTimeout);
        setLoading(false);
        if (onClose) onClose();
        return;
      }

      console.log('✅ BuilderProfileEdit: Profile loaded successfully');
      setProfile(profileData);
      setIsOwner(true);
    } catch (error) {
      console.error('Error loading profile:', error);
      // On error, create default profile so user can still edit
      createDefaultProfile();
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const defaultProfile: BuilderProfile = {
          id: user.id,
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'User',
          email: user.email,
          specialties: [],
          certifications: [],
          service_areas: [],
          show_phone: true,
          show_email: true,
          allow_messages: true,
          allow_calls: true
        };
        setProfile(defaultProfile);
        setIsOwner(true);
        console.log('📝 BuilderProfileEdit: Using default profile');
      }
    } catch (e) {
      console.error('Error creating default profile:', e);
    }
  };

  const handleSave = async () => {
    if (!profile || !isOwner) return;

    setSaving(true);
    console.log('📝 BuilderProfileEdit: Saving profile...');
    
    try {
      const userResult = await withTimeout(
        supabase.auth.getUser(),
        3000,
        { data: { user: null }, error: null }
      );
      
      const user = userResult.data?.user;
      
      // Double-check ownership before saving
      if (!user || profile.user_id !== user.id) {
        throw new Error('You can only edit your own profile');
      }

      const updateResult = await withTimeout(
        supabase.from('profiles').update({
          full_name: profile.full_name,
          company_name: profile.company_name,
          phone: profile.phone,
          location: profile.location,
          bio: profile.bio,
          website: profile.website,
          years_experience: profile.years_experience,
          team_size: profile.team_size,
          service_areas: profile.service_areas,
          certifications: profile.certifications,
          specialties: profile.specialties,
          price_range: profile.price_range,
          show_phone: profile.show_phone,
          show_email: profile.show_email,
          allow_messages: profile.allow_messages,
          allow_calls: profile.allow_calls,
          facebook_url: profile.facebook_url,
          twitter_url: profile.twitter_url,
          instagram_url: profile.instagram_url,
          linkedin_url: profile.linkedin_url,
          updated_at: new Date().toISOString()
        }).eq('user_id', user.id),
        8000,
        { data: null, error: { message: 'Save timeout - please try again' } }
      );

      if (updateResult.error) throw updateResult.error;

      console.log('✅ BuilderProfileEdit: Profile saved successfully');
      toast({
        title: 'Profile Updated!',
        description: 'Your profile has been saved successfully'
      });

      onSave?.();
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Error saving profile:', error);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || profile.user_id !== user.id) {
        throw new Error('Unauthorized');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: data.publicUrl });

      toast({
        title: 'Avatar Updated!',
        description: 'Your profile photo has been updated'
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || profile.user_id !== user.id) {
        throw new Error('Unauthorized');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_photo_url: data.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, cover_photo_url: data.publicUrl });

      toast({
        title: 'Cover Photo Updated!',
        description: 'Your cover photo has been updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload cover photo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const addToArray = (field: 'specialties' | 'certifications' | 'service_areas', value: string) => {
    if (!profile || !value.trim()) return;
    const currentArray = profile[field] || [];
    if (!currentArray.includes(value)) {
      setProfile({ ...profile, [field]: [...currentArray, value] });
    }
  };

  const removeFromArray = (field: 'specialties' | 'certifications' | 'service_areas', value: string) => {
    if (!profile) return;
    const currentArray = profile[field] || [];
    setProfile({ ...profile, [field]: currentArray.filter(item => item !== value) });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // For dialog mode, don't render if not open
  if (isDialogMode && !isOpen) return null;

  // The main form content
  const formContent = (
    <>
      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      ) : !profile ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load profile. Please try again.</AlertDescription>
        </Alert>
      ) : !isOwner ? (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>You don't have permission to edit this profile</AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6 mt-4">
              {/* Avatar & Cover */}
              <div className="relative">
                {/* Cover Photo */}
                <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg overflow-hidden relative">
                  {profile.cover_photo_url && (
                    <img 
                      src={profile.cover_photo_url} 
                      alt="Cover" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  <label className="absolute bottom-2 right-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                      disabled={uploading}
                    />
                    <Button size="sm" variant="secondary" className="gap-1" asChild>
                      <span>
                        <Camera className="h-3 w-3" />
                        Change Cover
                      </span>
                    </Button>
                  </label>
                </div>

                {/* Avatar */}
                <div className="absolute -bottom-10 left-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                        {getInitials(profile.company_name || profile.full_name)}
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
                      <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                        <Camera className="h-3.5 w-3.5" />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-12 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={profile.company_name || ''}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                      placeholder="Your company name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Select 
                      value={profile.location || ''} 
                      onValueChange={(v) => setProfile({ ...profile, location: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select county" />
                      </SelectTrigger>
                      <SelectContent>
                        {KENYAN_COUNTIES.map(county => (
                          <SelectItem key={county} value={county}>{county}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Bio / About</Label>
                  <Textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell potential clients about yourself and your work..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Website</Label>
                  <Input
                    value={profile.website || ''}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Business Tab */}
            <TabsContent value="business" className="space-y-6 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={profile.years_experience || ''}
                    onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || undefined })}
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <Label>Team Size</Label>
                  <Input
                    type="number"
                    value={profile.team_size || ''}
                    onChange={(e) => setProfile({ ...profile, team_size: parseInt(e.target.value) || undefined })}
                    placeholder="e.g., 25"
                  />
                </div>
                <div>
                  <Label>Price Range</Label>
                  <Select 
                    value={profile.price_range || ''} 
                    onValueChange={(v) => setProfile({ ...profile, price_range: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_RANGES.map(range => (
                        <SelectItem key={range} value={range}>{range}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Specialties */}
              <div>
                <Label>Specialties</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={newSpecialty} onValueChange={setNewSpecialty}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTRUCTION_SPECIALTIES.filter(s => !profile.specialties?.includes(s)).map(spec => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      addToArray('specialties', newSpecialty);
                      setNewSpecialty('');
                    }}
                    disabled={!newSpecialty}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.specialties?.map(spec => (
                    <Badge key={spec} variant="secondary" className="gap-1">
                      {spec}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFromArray('specialties', spec)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Service Areas */}
              <div>
                <Label>Service Areas</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={newServiceArea} onValueChange={setNewServiceArea}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add service area" />
                    </SelectTrigger>
                    <SelectContent>
                      {KENYAN_COUNTIES.filter(c => !profile.service_areas?.includes(c)).map(county => (
                        <SelectItem key={county} value={county}>{county}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      addToArray('service_areas', newServiceArea);
                      setNewServiceArea('');
                    }}
                    disabled={!newServiceArea}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.service_areas?.map(area => (
                    <Badge key={area} variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {area}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFromArray('service_areas', area)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <Label>Certifications</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="e.g., NCA License, ISO 9001"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('certifications', newCertification);
                        setNewCertification('');
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      addToArray('certifications', newCertification);
                      setNewCertification('');
                    }}
                    disabled={!newCertification}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.certifications?.map(cert => (
                    <Badge key={cert} variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {cert}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFromArray('certifications', cert)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-4 mt-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                </Label>
                <Input
                  value={profile.facebook_url || ''}
                  onChange={(e) => setProfile({ ...profile, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-sky-500" />
                  Twitter / X
                </Label>
                <Input
                  value={profile.twitter_url || ''}
                  onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  Instagram
                </Label>
                <Input
                  value={profile.instagram_url || ''}
                  onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-700" />
                  LinkedIn
                </Label>
                <Input
                  value={profile.linkedin_url || ''}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6 mt-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Control what information is visible to visitors and how they can contact you.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Phone Number</Label>
                    <p className="text-sm text-muted-foreground">Allow visitors to see your phone number</p>
                  </div>
                  <Switch
                    checked={profile.show_phone !== false}
                    onCheckedChange={(checked) => setProfile({ ...profile, show_phone: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Email</Label>
                    <p className="text-sm text-muted-foreground">Allow visitors to see your email address</p>
                  </div>
                  <Switch
                    checked={profile.show_email !== false}
                    onCheckedChange={(checked) => setProfile({ ...profile, show_email: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Direct Messages</Label>
                    <p className="text-sm text-muted-foreground">Let logged-in users send you messages</p>
                  </div>
                  <Switch
                    checked={profile.allow_messages !== false}
                    onCheckedChange={(checked) => setProfile({ ...profile, allow_messages: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Phone Calls</Label>
                    <p className="text-sm text-muted-foreground">Show "Call Now" button on your profile</p>
                  </div>
                  <Switch
                    checked={profile.allow_calls !== false}
                    onCheckedChange={(checked) => setProfile({ ...profile, allow_calls: checked })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Save Button - shown for both modes */}
        {profile && isOwner && (
          <div className={`flex ${isDialogMode ? 'justify-end gap-2' : 'justify-start'} mt-6 pt-4 border-t`}>
            {isDialogMode && onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving || !isOwner} size={isDialogMode ? 'default' : 'lg'}>
              {saving ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </>
    );

  // Render based on mode
  if (isDialogMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Your Profile
            </DialogTitle>
            <DialogDescription>
              Update your builder profile information. Only you can edit this profile.
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Embedded mode - render directly without dialog wrapper
  return <div className="space-y-6">{formContent}</div>;
};

export default BuilderProfileEdit;
