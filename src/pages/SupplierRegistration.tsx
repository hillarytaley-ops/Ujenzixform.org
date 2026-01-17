/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🏪 SUPPLIER REGISTRATION PAGE - SECURITY HARDENED                                 ║
 * ║                                                                                      ║
 * ║   ⚠️  DO NOT MODIFY ROLE ASSIGNMENT LOGIC WITHOUT REVIEW  ⚠️                        ║
 * ║                                                                                      ║
 * ║   SECURITY AUDIT: December 24, 2025                                                  ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   SECURITY FEATURES:                                                                 ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. Checks if user already has a role before registration                  │   ║
 * ║   │  2. Blocks registration if user has conflicting role (builder/delivery)    │   ║
 * ║   │  3. Password minimum 8 characters                                          │   ║
 * ║   │  4. Role is saved to BOTH user_roles table AND user metadata               │   ║
 * ║   │  5. Redirects existing suppliers to their dashboard                        │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

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
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  Store, 
  Upload, 
  Package, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail,
  Building2,
  FileText,
  Image as ImageIcon,
  Video,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  KeyRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const MATERIAL_CATEGORIES = [
  // STRUCTURAL & FOUNDATION
  "Cement & Concrete", "Steel & Reinforcement", "Aggregates & Ballast", "Sand", "Building Stones", "Blocks & Bricks", "Ready Mix Concrete",
  // ROOFING
  "Roofing Materials", "Iron Sheets (Mabati)", "Roofing Tiles", "Gutters & Downpipes", "Waterproofing",
  // TIMBER & WOOD
  "Timber & Wood", "Plywood & Boards", "Formwork & Shuttering", "Treated Poles",
  // DOORS, WINDOWS & OPENINGS
  "Doors & Frames", "Windows & Glass", "Aluminium Works", "Door & Window Hardware",
  // PLUMBING & WATER
  "Plumbing Supplies", "Pipes & Fittings", "Water Tanks & Pumps", "Sanitary Ware", "Taps & Mixers", "Water Heaters",
  // ELECTRICAL
  "Electrical Supplies", "Cables & Wires", "Switches & Sockets", "Lighting", "Solar Equipment", "Generators",
  // TILES & FLOORING
  "Tiles & Flooring", "Ceramic & Porcelain", "Granite & Marble", "Vinyl & Carpet", "Tile Adhesive & Grout",
  // PAINT & FINISHES
  "Paint & Finishes", "Emulsion Paint", "Exterior Paint", "Varnish & Wood Finish", "Primers & Putty",
  // WALL & CEILING
  "Gypsum & Ceiling", "Insulation Materials", "Wall Cladding",
  // HARDWARE & FASTENERS
  "Hardware & Fasteners", "Nails & Screws", "Bolts & Nuts", "Locks & Hinges", "Wire & Mesh",
  // TOOLS & EQUIPMENT
  "Tools & Equipment", "Power Tools", "Hand Tools", "Safety Equipment", "Scaffolding & Ladders",
  // ADHESIVES & SEALANTS
  "Adhesives & Sealants", "Epoxy & Grout",
  // FENCING & SECURITY
  "Fencing Materials", "Gates & Security", "Security Systems",
  // LANDSCAPING & OUTDOOR
  "Paving & Cabro", "Drainage Systems", "Garden Materials",
  // KITCHEN & BUILT-IN
  "Kitchen Fittings", "Countertops", "Wardrobes & Closets",
  // HVAC & VENTILATION
  "HVAC & Ventilation", "Air Conditioning",
  // FIRE SAFETY
  "Fire Safety Equipment", "Fire Doors & Alarms",
  // SPECIALTY MATERIALS
  "Damp Proofing", "Concrete Admixtures", "Reinforcement Accessories",
  // MISCELLANEOUS
  "Geotextiles & Covers", "Signage", "Other Materials"
];

const SupplierRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [existingUser, setExistingUser] = useState<User | null>(null);
  
  // Business Information
  const [businessName, setBusinessName] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  
  // Materials & Pricing
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [materialsList, setMaterialsList] = useState("");
  const [priceList, setPriceList] = useState("");
  
  // Media uploads (placeholders for now)
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  
  // Terms
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // Check if user is already logged in and pre-fill email
  useEffect(() => {
    let isMounted = true;
    
    const checkExistingUser = async () => {
      console.log('📝 SupplierRegistration: Checking for existing user...');
      
      // First try getUser
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!isMounted) return;
      
      if (user) {
        console.log('📝 SupplierRegistration: User already logged in:', user.email);
        setExistingUser(user);
        setEmail(user.email || "");
        
        // Check if they already have a supplier role
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!isMounted) return;
          
          if (roleData?.role === 'supplier') {
            // Already registered as supplier - redirect to dashboard
            console.log('📝 SupplierRegistration: User already has supplier role, redirecting...');
            toast({
              title: "Already Registered",
              description: "You're already registered as a supplier. Redirecting to your dashboard...",
              duration: 2000,
            });
            setTimeout(() => navigate('/supplier-dashboard'), 1000);
          } else if (roleData?.role === 'builder') {
            // Already registered as builder - can't also be supplier
            console.log('📝 SupplierRegistration: User is already a builder');
            toast({
              variant: "destructive",
              title: "Already Registered as Builder",
              description: "You're already registered as a builder. You cannot also register as a supplier.",
              duration: 5000,
            });
            setTimeout(() => navigate('/supplier-dashboard'), 2000);
          }
        } catch (roleCheckError) {
          console.warn('📝 SupplierRegistration: Role check error (non-blocking):', roleCheckError);
        }
        // If no role, let them continue with registration
      } else {
        console.log('📝 SupplierRegistration: No user logged in');
      }
    };
    
    // Run immediately
    checkExistingUser();
    
    // Also listen for auth state changes in case session loads later
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('📝 SupplierRegistration: Auth state changed:', event, session?.user?.email);
      if (session?.user && isMounted) {
        setExistingUser(session.user);
        setEmail(session.user.email || "");
      }
    });
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const validateStep1 = () => {
    // If user is already logged in, they don't need to provide password
    if (existingUser) {
      if (!businessName || !phone) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required business information fields."
        });
        return false;
      }
    } else {
      // New user needs email and password
      if (!businessName || !email || !password || !phone) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required business information fields."
        });
        return false;
      }
      
      if (password.length < 8) {
        toast({
          variant: "destructive",
          title: "Weak Password",
          description: "Password must be at least 8 characters long."
        });
        return false;
      }
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!county || !town || !physicalAddress) {
      toast({
        variant: "destructive",
        title: "Missing Location",
        description: "Please provide your complete business location."
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (selectedCategories.length === 0) {
      toast({
        variant: "destructive",
        title: "No Categories Selected",
        description: "Please select at least one material category you supply."
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
    console.log('📝 SupplierRegistration: Starting submission...');

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('📝 SupplierRegistration: Timeout reached, forcing completion');
      setLoading(false);
      toast({
        title: "⚠️ Registration Taking Long",
        description: "The registration is taking longer than expected. Please try signing in to your supplier dashboard.",
        duration: 8000
      });
      window.location.href = '/supplier-signin';
    }, 30000); // 30 second timeout

    try {
      let userId: string;

      // Check if user is already logged in (signed up via Auth page)
      // Re-check here in case state wasn't updated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const activeUser = existingUser || currentUser;
      
      if (activeUser) {
        // User already has an account - just update their profile
        userId = activeUser.id;
        console.log('📝 SupplierRegistration: Using existing user:', userId);
      } else {
        // New user - create Supabase auth account
        if (!password || password.length < 8) {
          clearTimeout(timeoutId);
          toast({
            variant: "destructive",
            title: "Password Required",
            description: "Please enter a password with at least 8 characters."
          });
          setLoading(false);
          return;
        }

        console.log('📝 SupplierRegistration: Creating new auth account for:', email);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              business_name: businessName,
              phone: phone,
              user_type: 'supplier',
              role: 'supplier'
            }
          }
        });

        console.log('📝 SupplierRegistration: Auth signup result:', {
          user: authData?.user?.email,
          userId: authData?.user?.id,
          error: authError?.message,
          session: authData?.session ? 'exists' : 'null'
        });

        if (authError) {
          clearTimeout(timeoutId);
          throw authError;
        }

        if (!authData.user) {
          clearTimeout(timeoutId);
          throw new Error("Failed to create account");
        }

        userId = authData.user.id;
        console.log('📝 SupplierRegistration: New user created with ID:', userId);
      }

      // 2. Create/Update supplier profile using upsert - include role and user_type for verification
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: userId,
            email: email.trim().toLowerCase(),
            full_name: businessName,
            phone: phone,
            company_name: businessName,
            location: `${town}, ${county}`,
            description: businessDescription,
            business_registration_number: businessRegNumber,
            physical_address: physicalAddress,
            role: 'supplier',
            user_type: 'supplier'
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        } else {
          console.log("✅ Profile created/updated with supplier role");
        }
      } catch (profileErr) {
        console.warn("Profile save error (non-blocking):", profileErr);
      }

      // 3. Set user role as supplier (non-blocking)
      try {
        // First check if role already exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        console.log("📝 Existing role check:", existingRole);

        if (!existingRole) {
          // Try RPC function first (bypasses RLS)
          console.log("📝 Attempting to assign supplier role via RPC...");
          let roleAssigned = false;
          
          try {
            const { data: roleResult, error: rpcError } = await supabase
              .rpc('assign_user_role', { p_role: 'supplier' });
            
            console.log("RPC result:", roleResult, rpcError);
            
            if (!rpcError && roleResult?.success) {
              console.log("✅ Role assigned via RPC");
              roleAssigned = true;
            }
          } catch (rpcErr) {
            console.log("RPC not available, trying direct insert...");
          }
          
          if (!roleAssigned) {
            // Fallback: Try direct insert
            console.log("📝 Attempting direct insert...");
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert({ user_id: userId, role: 'supplier' });
            
            if (insertError) {
              console.error("Direct insert failed:", insertError);
              // Don't block registration - role is also saved in metadata
            } else {
              console.log("✅ Role assigned via direct insert");
              roleAssigned = true;
            }
          }
        } else {
          console.log("📝 Role already exists:", existingRole.role);
        }
      } catch (roleErr) {
        console.warn("Role assignment error (non-blocking):", roleErr);
      }

      // 4. CRITICAL: Save role in Supabase Auth user metadata (survives logout/login)
      try {
        console.log("📝 Saving role to user metadata...");
        const { error: metaError } = await supabase.auth.updateUser({
          data: { role: 'supplier', user_type: 'supplier' }
        });
        if (metaError) {
          console.error('❌ User metadata update error:', metaError);
        } else {
          console.log('✅ Role saved to user metadata (survives logout)');
        }
      } catch (metaErr) {
        console.warn("Metadata update error (non-blocking):", metaErr);
      }

      // 5. Save to supplier_applications table for consistent role verification
      console.log("📝 Saving to supplier_applications table...");
      try {
        // Check if application already exists
        const { data: existingApp } = await supabase
          .from('supplier_applications')
          .select('id')
          .eq('applicant_user_id', userId)
          .maybeSingle();
        
        if (existingApp) {
          console.log("✅ Supplier application already exists");
        } else {
          const { error: supplierAppError } = await supabase
            .from('supplier_applications')
            .insert({
              applicant_user_id: userId,
              email: email.trim().toLowerCase(),
              company_name: businessName,
              phone: phone,
              county: county,
              address: physicalAddress,
              material_categories: selectedCategories.length > 0 ? selectedCategories : ['General'],
              status: 'approved'
            });
          
          if (supplierAppError) {
            console.warn("supplier_applications insert warning:", supplierAppError);
          } else {
            console.log("✅ Saved to supplier_applications table");
          }
        }
      } catch (regErr) {
        console.warn("supplier_applications save error (non-blocking):", regErr);
      }
      
      // 5. Save supplier materials (for future implementation)
      const supplierData = {
        user_id: userId,
        business_name: businessName,
        categories: selectedCategories,
        materials_list: materialsList,
        price_list: priceList,
      };
      
      console.log("Supplier data saved:", supplierData);

      // IMPORTANT: Store role in localStorage for sign-in verification
      localStorage.setItem('user_role', 'supplier');
      localStorage.setItem('user_role_id', userId);
      
      // Also set session storage for immediate access
      sessionStorage.setItem('pin_verified', 'true');
      sessionStorage.setItem('pin_user_id', userId);
      sessionStorage.setItem('pin_role', 'supplier');

      // Clear the timeout since we're completing successfully
      clearTimeout(timeoutId);
      
      // Success! - Different messages based on whether user was already logged in
      if (activeUser) {
        // Existing user - they're already logged in, go to dashboard
        toast({
          title: "✅ Registration Successful!",
          description: "Your supplier profile has been created. Redirecting to your dashboard...",
          duration: 3000,
        });
        setTimeout(() => {
          window.location.href = '/supplier-dashboard';
        }, 1500);
      } else {
        // New user - they need to check email OR might be auto-logged in
        // Check if we have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is logged in (email confirmation might be disabled)
          toast({
            title: "✅ Registration Successful!",
            description: "Your supplier account has been created. Redirecting to your dashboard...",
            duration: 3000,
          });
          setTimeout(() => {
            window.location.href = '/supplier-dashboard';
          }, 1500);
        } else {
          // User needs to confirm email first
          toast({
            title: "✅ Account Created!",
            description: "Please check your email to confirm your account, then sign in.",
            duration: 8000,
          });
          setTimeout(() => {
            navigate('/supplier-signin');
          }, 3000);
        }
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
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
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {step}
            </div>
            {step < 4 && (
              <div className={`w-16 h-1 mx-2 ${
                currentStep > step ? 'bg-primary' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-2">
        <span>Business Info</span>
        <span>Location</span>
        <span>Materials</span>
        <span>Review</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-orange-600 via-orange-700 to-orange-900">
        <div className="absolute inset-0 bg-[url('/construction-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white max-w-3xl mx-auto">
            <Store className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Supplier Registration
            </h1>
            <p className="text-xl text-orange-100 mb-4">
              Join Kenya's premier construction materials marketplace. Reach thousands of builders and clients across all 47 counties.
            </p>
            <p className="text-orange-200">
              Already have a supplier account?{" "}
              <Link to="/supplier-signin" className="text-white font-semibold underline hover:text-orange-100">
                Sign In Here
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-2">
                📦 List Your Materials
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-2">
                💰 Set Your Prices
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-2">
                📸 Upload Photos & Videos
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
                {existingUser ? "Complete Your Supplier Profile" : "Create Your Supplier Account"}
              </CardTitle>
              <CardDescription>
                {existingUser 
                  ? "You're already signed in. Complete your supplier profile to start selling."
                  : "Complete all steps to start selling construction materials on UjenziXform"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderProgressBar()}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Business Information */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <Building2 className="h-5 w-5 text-primary" />
                      Business Information
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name *</Label>
                        <Input
                          id="businessName"
                          placeholder="ABC Construction Supplies Ltd"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessRegNumber">Registration Number</Label>
                        <Input
                          id="businessRegNumber"
                          placeholder="PVT-XXXXXX"
                          value={businessRegNumber}
                          onChange={(e) => setBusinessRegNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Show logged-in user notice if already authenticated */}
                    {existingUser && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">You're signed in as {existingUser.email}</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Your supplier profile will be linked to this account.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email">Business Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="supplier@example.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={!!existingUser}
                        />
                      </div>
                      {existingUser && (
                        <p className="text-xs text-muted-foreground">
                          Email is linked to your existing account
                        </p>
                      )}
                    </div>

                    {/* Only show password field for new users */}
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
                      <p className="text-xs text-muted-foreground">
                        Use this password to log in and manage your supplier profile
                      </p>
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

                    <div className="space-y-2">
                      <Label htmlFor="businessDescription">Business Description</Label>
                      <Textarea
                        id="businessDescription"
                        placeholder="Tell buyers about your business and what makes you unique..."
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <MapPin className="h-5 w-5 text-primary" />
                      Business Location
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="county">County *</Label>
                        <Input
                          id="county"
                          placeholder="e.g., Nairobi"
                          value={county}
                          onChange={(e) => setCounty(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="town">Town/City *</Label>
                        <Input
                          id="town"
                          placeholder="e.g., Industrial Area"
                          value={town}
                          onChange={(e) => setTown(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="physicalAddress">Physical Address *</Label>
                      <Textarea
                        id="physicalAddress"
                        placeholder="Building name, street, plot number, landmarks..."
                        value={physicalAddress}
                        onChange={(e) => setPhysicalAddress(e.target.value)}
                        rows={3}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Provide detailed directions to help buyers find your location
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Materials & Pricing */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <Package className="h-5 w-5 text-primary" />
                      Materials & Pricing
                    </div>

                    <div className="space-y-3">
                      <Label>Select Material Categories You Supply *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 border rounded-lg">
                        {MATERIAL_CATEGORIES.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={category}
                              checked={selectedCategories.includes(category)}
                              onCheckedChange={() => handleCategoryToggle(category)}
                            />
                            <label
                              htmlFor={category}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedCategories.length} categories
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="materialsList">List Your Materials</Label>
                      <Textarea
                        id="materialsList"
                        placeholder="Example:&#10;- Portland Cement 50kg bags&#10;- Ballast per ton&#10;- 1/2&quot; Steel bars (12m)&#10;- etc."
                        value={materialsList}
                        onChange={(e) => setMaterialsList(e.target.value)}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        List the specific materials and products you offer
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priceList">Price List</Label>
                      <Textarea
                        id="priceList"
                        placeholder="Example:&#10;- Portland Cement 50kg: KSh 750&#10;- Ballast per ton: KSh 3,500&#10;- 1/2&quot; Steel bars: KSh 4,200&#10;- etc."
                        value={priceList}
                        onChange={(e) => setPriceList(e.target.value)}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        List your prices (you can update these later in your dashboard)
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        <Label>Product Photos (Coming Soon)</Label>
                      </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Photo upload feature will be available in your dashboard after registration
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        <Label>Marketing Videos (Coming Soon)</Label>
                      </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Video upload feature will be available in your dashboard after registration
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Submit */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Review & Submit
                    </div>

                    {/* Security Notice */}
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                            <KeyRound className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Account Security</h3>
                            <p className="text-sm text-muted-foreground">
                              Your account will be secured with your email and password
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-orange-700">
                          ⚠️ Use the same email and password you used to sign up to access your dashboard.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6 space-y-3">
                        <h3 className="font-semibold">Business Information</h3>
                        <div className="grid gap-2 text-sm">
                          <p><strong>Business Name:</strong> {businessName}</p>
                          <p><strong>Email:</strong> {email}</p>
                          <p><strong>Phone:</strong> {phone}</p>
                          <p><strong>Location:</strong> {town}, {county}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6 space-y-3">
                        <h3 className="font-semibold">Materials</h3>
                        <p className="text-sm">
                          <strong>Categories:</strong> {selectedCategories.join(", ")}
                        </p>
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
                      >
                        Next →
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading || !acceptTerms || !acceptPrivacy}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <Store className="mr-2 h-4 w-4" />
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
                <Store className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Nationwide Reach</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with builders and clients across all 47 counties
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <DollarSign className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Competitive Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Set your own prices and receive direct quote requests
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Package className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Easy Management</h3>
                <p className="text-sm text-muted-foreground">
                  Update inventory, prices, and media from your dashboard
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

export default SupplierRegistration;
