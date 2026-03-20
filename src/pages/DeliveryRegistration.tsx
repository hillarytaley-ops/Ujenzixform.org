import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  Truck, 
  Upload, 
  Package, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail,
  Building2,
  User,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  KeyRound,
  FileText,
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User as SupabaseUser } from "@supabase/supabase-js";

// Kenyan counties
const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale",
  "Garissa", "Kakamega", "Machakos", "Meru", "Nyeri", "Kericho", "Embu", "Migori",
  "Kisii", "Naivasha", "Nanyuki", "Kilifi", "Lamu", "Kwale", "Turkana", "Marsabit"
];

// Vehicle types
const VEHICLE_TYPES = [
  { id: "motorcycle", name: "Motorcycle/Boda Boda", icon: "🏍️" },
  { id: "pickup", name: "Pickup Truck", icon: "🛻" },
  { id: "small_lorry", name: "Small Lorry (3 Ton)", icon: "🚛" },
  { id: "medium_lorry", name: "Medium Lorry (7 Ton)", icon: "🚚" },
  { id: "large_lorry", name: "Large Lorry (14 Ton)", icon: "🚛" },
  { id: "trailer", name: "Trailer Truck (25+ Ton)", icon: "🚛🚛" }
];

const DeliveryRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [existingUser, setExistingUser] = useState<SupabaseUser | null>(null);
  const [providerType, setProviderType] = useState<'individual' | 'company'>('individual');
  
  // Personal/Company Information
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  
  // Vehicle Information
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  
  // Service Areas
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState("");
  const [experience, setExperience] = useState("");
  
  // Documentation
  const [hasInsurance, setHasInsurance] = useState(false);
  const [hasGoodConduct, setHasGoodConduct] = useState(false);
  
  // Terms
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // Check if user is already logged in and pre-fill email
  useEffect(() => {
    const checkExistingUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('📝 DeliveryRegistration: User already logged in:', user.email);
        setExistingUser(user);
        setEmail(user.email || "");
        
        // Check if they already have a delivery role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (roleData?.role === 'delivery_provider' || roleData?.role === 'delivery') {
          toast({
            title: "Already Registered",
            description: "You're already registered as a delivery provider. Redirecting to your dashboard...",
            duration: 2000,
          });
          setTimeout(() => navigate('/delivery-dashboard'), 1000);
        } else if (roleData?.role === 'builder') {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You are registered as a Builder. Please use the Builder portal.",
            duration: 5000,
          });
          setTimeout(() => navigate('/delivery-dashboard'), 1000);
        } else if (roleData?.role === 'supplier') {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You are registered as a Supplier. Please use the Supplier portal.",
            duration: 5000,
          });
          setTimeout(() => navigate('/supplier-dashboard'), 1000);
        }
      }
    };
    checkExistingUser();
  }, [navigate, toast]);

  const handleAreaToggle = (area: string) => {
    setServiceAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const validateStep1 = () => {
    if (providerType === 'individual') {
      if (!fullName || !phone || !idNumber) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required personal information fields."
        });
        return false;
      }
    } else {
      if (!companyName || !phone) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required company information fields."
        });
        return false;
      }
    }
    
    if (!existingUser && (!email || !password)) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide email and password."
      });
      return false;
    }
    
    if (!existingUser && password.length < 8) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 8 characters long."
      });
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!vehicleType || !licensePlate || !drivingLicense) {
      toast({
        variant: "destructive",
        title: "Missing Vehicle Info",
        description: "Please provide your vehicle and license information."
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (serviceAreas.length === 0) {
      toast({
        variant: "destructive",
        title: "No Areas Selected",
        description: "Please select at least one service area."
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms || !acceptPrivacy) {
      toast({
        variant: "destructive",
        title: "Accept Terms",
        description: "Please accept the terms and conditions and privacy policy."
      });
      return;
    }

    setLoading(true);

    try {
      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        console.log('📝 DeliveryRegistration: Using existing user:', userId);
      } else {
        if (!password || password.length < 8) {
          toast({
            variant: "destructive",
            title: "Password Required",
            description: "Please enter a password with at least 8 characters."
          });
          setLoading(false);
          return;
        }

        console.log('📝 DeliveryRegistration: Creating new auth account for:', email);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              full_name: providerType === 'individual' ? fullName : companyName,
              phone: phone,
              user_type: 'delivery'
            }
          }
        });

        if (authError) {
          throw authError;
        }

        if (!authData.user) {
          throw new Error("Failed to create account");
        }

        userId = authData.user.id;
        console.log('📝 DeliveryRegistration: New user created with ID:', userId);
      }

      // Create/Update delivery provider profile with role and user_type for verification
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: email.trim().toLowerCase(),
          full_name: providerType === 'individual' ? fullName : companyName,
          phone: phone,
          company_name: providerType === 'company' ? companyName : null,
          location: `${town}, ${county}`,
          physical_address: physicalAddress,
          business_registration_number: providerType === 'company' ? businessRegNumber : null,
          role: 'delivery',
          user_type: 'delivery'
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      } else {
        console.log("✅ Profile created/updated with delivery role");
      }
      
      // Save to delivery_provider_registrations table for consistent role verification
      try {
        const { error: deliveryRegError } = await supabase
          .from('delivery_provider_registrations')
          .upsert({
            auth_user_id: userId,
            email: email.trim().toLowerCase(),
            full_name: providerType === 'individual' ? fullName : companyName,
            company_name: providerType === 'company' ? companyName : null,
            phone: phone,
            county: county,
            physical_address: physicalAddress,
            vehicle_type: vehicleType,
            vehicle_registration: licensePlate,
            driving_license_number: drivingLicense,
            service_areas: serviceAreas,
            status: 'approved',
            terms_accepted: acceptTerms,
            privacy_accepted: acceptPrivacy,
            background_check_consent: hasGoodConduct
          }, { onConflict: 'auth_user_id' });
        
        if (deliveryRegError) {
          console.warn("delivery_provider_registrations upsert warning:", deliveryRegError);
        } else {
          console.log("✅ Saved to delivery_provider_registrations table");
        }
      } catch (regErr) {
        console.warn("delivery_provider_registrations save error (non-blocking):", regErr);
      }

      // Supplier/builder dashboards read provider_name + phone from delivery_providers (linked by auth user id)
      try {
        const displayName =
          providerType === 'individual'
            ? fullName.trim()
            : (companyName.trim() || fullName.trim()) || 'Delivery Provider';
        const { data: dpExisting } = await supabase
          .from('delivery_providers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        const dpPayload = {
          provider_name: displayName,
          provider_type: providerType === 'company' ? ('company' as const) : ('individual' as const),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          address: physicalAddress?.trim() || county || null,
          vehicle_types: vehicleType ? [vehicleType] : (['motorcycle'] as string[]),
          service_areas: serviceAreas.length > 0 ? serviceAreas : [county].filter(Boolean),
          driving_license_number: drivingLicense?.trim() || 'Pending',
          is_verified: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        if (dpExisting?.id) {
          await supabase.from('delivery_providers').update(dpPayload).eq('user_id', userId);
        } else {
          await supabase.from('delivery_providers').insert({ user_id: userId, ...dpPayload });
        }
      } catch (dpSyncErr) {
        console.warn('delivery_providers row sync after registration (non-blocking):', dpSyncErr);
      }

      // Set user role as delivery
      let roleAssigned = false;
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingRole) {
        try {
          const { data: roleResult, error: rpcError } = await supabase
            .rpc('assign_user_role', { p_role: 'delivery' });
          
          if (!rpcError && roleResult?.success) {
            console.log("✅ Role assigned via RPC");
            roleAssigned = true;
          }
        } catch (rpcErr) {
          console.log("RPC not available, trying direct insert...");
        }
        
        if (!roleAssigned) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'delivery' });
          
          if (insertError) {
            console.error("Direct insert failed:", insertError);
            toast({
              variant: "destructive",
              title: "⚠️ Role Assignment Issue",
              description: "Profile created but role assignment failed. Please contact support.",
              duration: 8000
            });
          } else {
            console.log("✅ Role assigned via direct insert");
            roleAssigned = true;
          }
        }
      } else {
        roleAssigned = true;
      }

      if (roleAssigned) {
        localStorage.setItem('user_role', 'delivery');
        localStorage.setItem('user_role_id', userId);
      }

      // CRITICAL: Save role in Supabase Auth user metadata (survives logout/login)
      console.log("📝 Saving role to user metadata...");
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role: 'delivery', user_type: 'delivery' }
      });
      if (metaError) {
        console.error('❌ User metadata update error:', metaError);
      } else {
        console.log('✅ Role saved to user metadata (survives logout)');
      }

      // Success!
      if (existingUser) {
        toast({
          title: "✅ Registration Successful!",
          description: "Your delivery provider profile has been created. Redirecting to your dashboard...",
          duration: 3000,
        });
        setTimeout(() => {
          navigate('/delivery-dashboard');
        }, 2000);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          toast({
            title: "✅ Registration Successful!",
            description: "Your delivery provider account has been created. Redirecting to your dashboard...",
            duration: 3000,
          });
          setTimeout(() => {
            navigate('/delivery-dashboard');
          }, 2000);
        } else {
          toast({
            title: "✅ Account Created!",
            description: "Please check your email to confirm your account, then sign in.",
            duration: 8000,
          });
          setTimeout(() => {
            navigate('/delivery-signin');
          }, 3000);
        }
      }

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An error occurred during registration. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep >= step 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {step}
            </div>
            {step < 4 && (
              <div className={`w-16 h-1 mx-2 ${
                currentStep > step ? 'bg-teal-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-2">
        <span>Personal Info</span>
        <span>Vehicle</span>
        <span>Service Areas</span>
        <span>Review</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900">
        <div className="absolute inset-0 bg-[url('/construction-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white max-w-3xl mx-auto">
            <Truck className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Delivery Provider Registration
            </h1>
            <p className="text-xl text-teal-100 mb-4">
              Join Kenya's premier construction materials delivery network. Earn money delivering materials across all 47 counties.
            </p>
            <p className="text-teal-200">
              Already have a delivery account?{" "}
              <Link to="/delivery-signin" className="text-white font-semibold underline hover:text-teal-100">
                Sign In Here
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-2">
                🚚 Flexible Schedule
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-2">
                💰 Competitive Earnings
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-2">
                📱 Easy-to-Use App
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>
                {existingUser ? "Complete Your Delivery Provider Profile" : "Create Your Delivery Provider Account"}
              </CardTitle>
              <CardDescription>
                {existingUser 
                  ? "You're already signed in. Complete your delivery provider profile to start earning."
                  : "Complete all steps to start delivering construction materials on UjenziXform"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderProgressBar()}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Personal/Company Information */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <User className="h-5 w-5 text-teal-600" />
                      Provider Information
                    </div>

                    {/* Provider Type Selection */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <Card 
                        className={`cursor-pointer transition-all ${providerType === 'individual' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
                        onClick={() => setProviderType('individual')}
                      >
                        <CardContent className="p-4 text-center">
                          <User className="h-8 w-8 mx-auto mb-2 text-teal-600" />
                          <h3 className="font-semibold">Individual</h3>
                          <p className="text-xs text-muted-foreground">Own vehicle owner</p>
                        </CardContent>
                      </Card>
                      <Card 
                        className={`cursor-pointer transition-all ${providerType === 'company' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
                        onClick={() => setProviderType('company')}
                      >
                        <CardContent className="p-4 text-center">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-teal-600" />
                          <h3 className="font-semibold">Company</h3>
                          <p className="text-xs text-muted-foreground">Fleet owner</p>
                        </CardContent>
                      </Card>
                    </div>

                    {existingUser && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">You're signed in as {existingUser.email}</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Your delivery profile will be linked to this account.
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      {providerType === 'individual' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                              id="fullName"
                              placeholder="John Kamau"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="idNumber">National ID Number *</Label>
                            <Input
                              id="idNumber"
                              placeholder="12345678"
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              required
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name *</Label>
                            <Input
                              id="companyName"
                              placeholder="ABC Logistics Ltd"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="businessRegNumber">Business Registration Number</Label>
                            <Input
                              id="businessRegNumber"
                              placeholder="PVT-XXXXXX"
                              value={businessRegNumber}
                              onChange={(e) => setBusinessRegNumber(e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="delivery@example.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={!!existingUser}
                        />
                      </div>
                    </div>

                    {!existingUser && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Create Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            className="pr-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="0712 345 678"
                          className="pl-10"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Vehicle Information */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <Truck className="h-5 w-5 text-teal-600" />
                      Vehicle Information
                    </div>

                    <div className="space-y-2">
                      <Label>Vehicle Type *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {VEHICLE_TYPES.map((type) => (
                          <Card 
                            key={type.id}
                            className={`cursor-pointer transition-all ${vehicleType === type.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'}`}
                            onClick={() => setVehicleType(type.id)}
                          >
                            <CardContent className="p-3 text-center">
                              <span className="text-2xl">{type.icon}</span>
                              <p className="text-xs font-medium mt-1">{type.name}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="vehicleModel">Vehicle Make/Model</Label>
                        <Input
                          id="vehicleModel"
                          placeholder="e.g., Toyota Hilux"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleYear">Vehicle Year</Label>
                        <Input
                          id="vehicleYear"
                          type="number"
                          placeholder="e.g., 2020"
                          value={vehicleYear}
                          onChange={(e) => setVehicleYear(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="licensePlate">License Plate Number *</Label>
                        <Input
                          id="licensePlate"
                          placeholder="e.g., KCA 123A"
                          value={licensePlate}
                          onChange={(e) => setLicensePlate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="drivingLicense">Driving License Number *</Label>
                        <Input
                          id="drivingLicense"
                          placeholder="Enter your license number"
                          value={drivingLicense}
                          onChange={(e) => setDrivingLicense(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Required Documentation</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasInsurance"
                            checked={hasInsurance}
                            onCheckedChange={(checked) => setHasInsurance(checked as boolean)}
                          />
                          <label htmlFor="hasInsurance" className="text-sm">
                            I have valid vehicle insurance
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasGoodConduct"
                            checked={hasGoodConduct}
                            onCheckedChange={(checked) => setHasGoodConduct(checked as boolean)}
                          />
                          <label htmlFor="hasGoodConduct" className="text-sm">
                            I have a certificate of good conduct
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Service Areas */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <MapPin className="h-5 w-5 text-teal-600" />
                      Service Areas & Availability
                    </div>

                    <div className="space-y-3">
                      <Label>Select Counties You Can Serve *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-4 border rounded-lg">
                        {KENYAN_COUNTIES.map((area) => (
                          <div key={area} className="flex items-center space-x-2">
                            <Checkbox
                              id={area}
                              checked={serviceAreas.includes(area)}
                              onCheckedChange={() => handleAreaToggle(area)}
                            />
                            <label htmlFor={area} className="text-sm cursor-pointer">
                              {area}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selected: {serviceAreas.length} counties
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="county">Your Base County *</Label>
                        <Select value={county} onValueChange={setCounty}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your county" />
                          </SelectTrigger>
                          <SelectContent>
                            {KENYAN_COUNTIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="town">Town/City</Label>
                        <Input
                          id="town"
                          placeholder="e.g., Industrial Area"
                          value={town}
                          onChange={(e) => setTown(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="workingHours">Preferred Working Hours</Label>
                        <Input
                          id="workingHours"
                          placeholder="e.g., 6AM - 8PM"
                          value={workingHours}
                          onChange={(e) => setWorkingHours(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Delivery Experience</Label>
                        <Select value={experience} onValueChange={setExperience}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Less than 1 year</SelectItem>
                            <SelectItem value="intermediate">1-3 years</SelectItem>
                            <SelectItem value="experienced">3-5 years</SelectItem>
                            <SelectItem value="expert">5+ years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Submit */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <CheckCircle className="h-5 w-5 text-teal-600" />
                      Review & Submit
                    </div>

                    <Card className="bg-teal-50 border-teal-200">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                            <KeyRound className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Account Security</h3>
                            <p className="text-sm text-muted-foreground">
                              Your account will be secured with your email and password
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6 space-y-3">
                        <h3 className="font-semibold">Provider Information</h3>
                        <div className="grid gap-2 text-sm">
                          <p><strong>Type:</strong> {providerType === 'individual' ? 'Individual' : 'Company'}</p>
                          <p><strong>Name:</strong> {providerType === 'individual' ? fullName : companyName}</p>
                          <p><strong>Email:</strong> {email}</p>
                          <p><strong>Phone:</strong> {phone}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6 space-y-3">
                        <h3 className="font-semibold">Vehicle & Service</h3>
                        <div className="grid gap-2 text-sm">
                          <p><strong>Vehicle:</strong> {VEHICLE_TYPES.find(v => v.id === vehicleType)?.name}</p>
                          <p><strong>License Plate:</strong> {licensePlate}</p>
                          <p><strong>Service Areas:</strong> {serviceAreas.join(", ")}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          checked={acceptTerms}
                          onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                        />
                        <label htmlFor="terms" className="text-sm leading-none">
                          I accept the{" "}
                          <a href="/terms" className="text-primary hover:underline">
                            Terms and Conditions
                          </a>
                        </label>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="privacy"
                          checked={acceptPrivacy}
                          onCheckedChange={(checked) => setAcceptPrivacy(checked as boolean)}
                        />
                        <label htmlFor="privacy" className="text-sm leading-none">
                          I accept the{" "}
                          <a href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </a>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      ← Back
                    </Button>
                  )}
                  
                  <div className={currentStep === 1 ? "ml-auto" : ""}>
                    {currentStep < 4 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={loading}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        Next →
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading || !acceptTerms || !acceptPrivacy}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <Truck className="mr-2 h-4 w-4" />
                            Complete Registration
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card className="text-center">
              <CardContent className="pt-6">
                <DollarSign className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Earn More</h3>
                <p className="text-sm text-muted-foreground">
                  Competitive rates for construction material deliveries
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Package className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Consistent Work</h3>
                <p className="text-sm text-muted-foreground">
                  Regular delivery requests from builders and suppliers
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Insurance Support</h3>
                <p className="text-sm text-muted-foreground">
                  Access to partner insurance and support services
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DeliveryRegistration;


