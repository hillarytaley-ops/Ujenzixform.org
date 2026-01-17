import React, { useState, useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Award,
  FileText,
  Camera,
  Save,
  X,
  Loader2,
  CheckCircle,
  Shield,
  Globe,
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BuilderProfileEditProps {
  userId: string;
  builderCategory: 'professional' | 'private';
  onSave?: () => void;
  onCancel?: () => void;
}

interface ProfileData {
  full_name: string;
  phone: string;
  location: string;
  company_name?: string;
  description?: string;
  specialties?: string[];
  years_experience?: number;
  portfolio_url?: string;
  insurance_details?: string;
  registration_number?: string;
  license_number?: string;
  project_types?: string[];
  project_timeline?: string;
  budget_range?: string;
  property_type?: string;
  avatar_url?: string;
  company_logo_url?: string;
}

const kenyanCounties = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale",
  "Garissa", "Nyeri", "Machakos", "Meru", "Lamu", "Kiambu", "Kajiado", "Uasin Gishu",
  "Trans Nzoia", "Bungoma", "Kakamega", "Vihiga", "Busia", "Siaya", "Kisii", "Nyamira",
  "Migori", "Homa Bay", "Bomet", "Kericho", "Nandi", "Baringo", "Laikipia", "Samburu",
  "Turkana", "West Pokot", "Elgeyo Marakwet", "Nyandarua", "Muranga", "Kirinyaga",
  "Embu", "Tharaka Nithi", "Isiolo", "Marsabit", "Mandera", "Wajir", "Tana River",
  "Kilifi", "Kwale", "Taita Taveta"
];

const specialtiesList = [
  "Residential Construction",
  "Commercial Buildings",
  "Industrial Construction",
  "Road & Infrastructure",
  "Renovation & Remodeling",
  "Interior Design",
  "Landscaping",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Masonry",
  "Steel Structures",
  "Swimming Pools",
  "Solar Installation"
];

const projectTypesList = [
  "New Home Construction",
  "Home Renovation",
  "Kitchen Remodeling",
  "Bathroom Remodeling",
  "Room Addition",
  "Fence/Gate Installation",
  "Roofing",
  "Painting",
  "Flooring",
  "Plumbing Repairs",
  "Electrical Work"
];

export function BuilderProfileEdit({ userId, builderCategory, onSave, onCancel }: BuilderProfileEditProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    phone: '',
    location: '',
    company_name: '',
    description: '',
    specialties: [],
    years_experience: 0,
    portfolio_url: '',
    insurance_details: '',
    registration_number: '',
    license_number: '',
    project_types: [],
    project_timeline: '',
    budget_range: '',
    property_type: '',
    avatar_url: '',
    company_logo_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          location: data.location || '',
          company_name: data.company_name || '',
          description: data.description || '',
          specialties: data.specialties || [],
          years_experience: data.years_experience || 0,
          portfolio_url: data.portfolio_url || '',
          insurance_details: data.insurance_details || '',
          registration_number: data.registration_number || '',
          license_number: data.license_number || '',
          project_types: data.project_types || [],
          project_timeline: data.project_timeline || '',
          budget_range: data.budget_range || '',
          property_type: data.property_type || '',
          avatar_url: data.avatar_url || '',
          company_logo_url: data.company_logo_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      if (type === 'avatar') {
        setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      } else {
        setProfile(prev => ({ ...prev, company_logo_url: publicUrl }));
      }

      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties?.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...(prev.specialties || []), specialty]
    }));
  };

  const handleProjectTypeToggle = (projectType: string) => {
    setProfile(prev => ({
      ...prev,
      project_types: prev.project_types?.includes(projectType)
        ? prev.project_types.filter(p => p !== projectType)
        : [...(prev.project_types || []), projectType]
    }));
  };

  const handleSave = async () => {
    if (!profile.full_name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const updateData: any = {
        full_name: profile.full_name,
        phone: profile.phone,
        location: profile.location,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      };

      if (builderCategory === 'professional') {
        updateData.company_name = profile.company_name;
        updateData.description = profile.description;
        updateData.specialties = profile.specialties;
        updateData.years_experience = profile.years_experience;
        updateData.portfolio_url = profile.portfolio_url;
        updateData.insurance_details = profile.insurance_details;
        updateData.registration_number = profile.registration_number;
        updateData.license_number = profile.license_number;
        updateData.company_logo_url = profile.company_logo_url;
      } else {
        updateData.project_types = profile.project_types;
        updateData.project_timeline = profile.project_timeline;
        updateData.budget_range = profile.budget_range;
        updateData.property_type = profile.property_type;
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast({
        title: "Profile updated!",
        description: "Your profile has been saved successfully"
      });

      onSave?.();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save failed",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {builderCategory === 'professional' ? 'Professional Profile' : 'Personal Profile'}
          </CardTitle>
          <CardDescription>
            Update your profile information visible to suppliers and other users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'avatar')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button variant="outline" size="sm" disabled={uploading}>
                  <Camera className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </Button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+254 7XX XXX XXX"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={profile.location}
                  onValueChange={(value) => setProfile(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your county" />
                  </SelectTrigger>
                  <SelectContent>
                    {kenyanCounties.map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Builder Fields */}
      {builderCategory === 'professional' && (
        <>
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Company Logo */}
                <div className="flex flex-col items-center gap-4">
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                    {profile.company_logo_url ? (
                      <img src={profile.company_logo_url} alt="Company Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <Button variant="outline" size="sm" disabled={uploading}>
                      Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={profile.company_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Your company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      min="0"
                      value={profile.years_experience || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input
                      id="registration_number"
                      value={profile.registration_number}
                      onChange={(e) => setProfile(prev => ({ ...prev, registration_number: e.target.value }))}
                      placeholder="NCA Registration"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_number">License Number</Label>
                    <Input
                      id="license_number"
                      value={profile.license_number}
                      onChange={(e) => setProfile(prev => ({ ...prev, license_number: e.target.value }))}
                      placeholder="Business License"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) => setProfile(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your company, services, and expertise..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio Website</Label>
                  <Input
                    id="portfolio_url"
                    value={profile.portfolio_url}
                    onChange={(e) => setProfile(prev => ({ ...prev, portfolio_url: e.target.value }))}
                    placeholder="https://yourportfolio.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_details">Insurance Details</Label>
                  <Input
                    id="insurance_details"
                    value={profile.insurance_details}
                    onChange={(e) => setProfile(prev => ({ ...prev, insurance_details: e.target.value }))}
                    placeholder="Insurance provider & policy"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Specialties
              </CardTitle>
              <CardDescription>Select your areas of expertise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {specialtiesList.map((specialty) => (
                  <Badge
                    key={specialty}
                    variant={profile.specialties?.includes(specialty) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      profile.specialties?.includes(specialty)
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleSpecialtyToggle(specialty)}
                  >
                    {profile.specialties?.includes(specialty) && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {specialty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Private Builder Fields */}
      {builderCategory === 'private' && (
        <>
          {/* Project Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-600" />
                Project Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type</Label>
                  <Select
                    value={profile.property_type}
                    onValueChange={(value) => setProfile(prev => ({ ...prev, property_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="land">Land/Plot</SelectItem>
                      <SelectItem value="rental">Rental Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_range">Budget Range</Label>
                  <Select
                    value={profile.budget_range}
                    onValueChange={(value) => setProfile(prev => ({ ...prev, budget_range: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_100k">Under KES 100,000</SelectItem>
                      <SelectItem value="100k_500k">KES 100,000 - 500,000</SelectItem>
                      <SelectItem value="500k_1m">KES 500,000 - 1,000,000</SelectItem>
                      <SelectItem value="1m_5m">KES 1,000,000 - 5,000,000</SelectItem>
                      <SelectItem value="above_5m">Above KES 5,000,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project_timeline">Project Timeline</Label>
                  <Select
                    value={profile.project_timeline}
                    onValueChange={(value) => setProfile(prev => ({ ...prev, project_timeline: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (Within 1 month)</SelectItem>
                      <SelectItem value="1_3_months">1-3 Months</SelectItem>
                      <SelectItem value="3_6_months">3-6 Months</SelectItem>
                      <SelectItem value="6_12_months">6-12 Months</SelectItem>
                      <SelectItem value="planning">Just Planning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Project Types of Interest
              </CardTitle>
              <CardDescription>Select the types of projects you're interested in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {projectTypesList.map((projectType) => (
                  <Badge
                    key={projectType}
                    variant={profile.project_types?.includes(projectType) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      profile.project_types?.includes(projectType)
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleProjectTypeToggle(projectType)}
                  >
                    {profile.project_types?.includes(projectType) && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {projectType}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

