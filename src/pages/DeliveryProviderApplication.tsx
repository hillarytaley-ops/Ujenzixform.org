import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Truck, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Shield, 
  CheckCircle, 
  Clock, 
  Star,
  Users,
  Package,
  Calendar,
  DollarSign,
  Send,
  Upload,
  AlertTriangle,
  Info
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CompanyApplication {
  // Company Information
  companyName: string;
  businessRegistration: string;
  taxId: string;
  yearEstablished: string;
  companySize: string;
  
  // Contact Information
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: string;
  operatingAreas: string[];
  
  // Service Details
  serviceTypes: string[];
  vehicleFleet: string;
  deliveryCapacity: string;
  operatingHours: string;
  specializations: string[];
  
  // Business Details
  yearsInBusiness: string;
  previousClients: string;
  insuranceCoverage: string;
  certifications: string[];
  
  // Additional Information
  whyJoinUjenziXform: string;
  additionalServices: string;
}

interface PrivateApplication {
  // Personal Information
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  address: string;
  
  // Vehicle Information
  vehicleType: string;
  vehicleModel: string;
  vehicleYear: string;
  licensePlate: string;
  drivingLicense: string;
  
  // Service Details
  availableAreas: string[];
  workingHours: string;
  deliveryTypes: string[];
  experience: string;
  
  // Documentation
  hasInsurance: boolean;
  hasGoodConductCert: boolean;
  emergencyContact: string;
  emergencyPhone: string;
  
  // Additional Information
  motivation: string;
  additionalSkills: string;
}

interface ExistingApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  full_name: string;
  company_name?: string;
  is_company: boolean;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
}

const DeliveryProviderApplication = () => {
  const [activeTab, setActiveTab] = useState("company");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingApplication, setExistingApplication] = useState<ExistingApplication | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);
  const { toast } = useToast();

  // Get current user and check for existing application
  useEffect(() => {
    const getUser = async () => {
      try {
        // Try to get user with timeout
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { user: null } }), 3000)
        );
        
        let { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
        
        // If no user from Supabase, try localStorage fallback
        if (!user) {
          try {
            const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (storedSession) {
              const parsed = JSON.parse(storedSession);
              if (parsed.user) {
                user = parsed.user;
                console.log('📋 DeliveryProviderApplication: Got user from localStorage:', user?.email);
              }
            }
          } catch (e) {
            console.warn('Could not parse localStorage session');
          }
        }
        
        setCurrentUser(user);
        console.log('📋 DeliveryProviderApplication: User set:', user?.email || 'No user');
        
        if (user?.email) {
          // Pre-fill email fields
          setCompanyForm(prev => ({ ...prev, contactEmail: user.email || '' }));
          setPrivateForm(prev => ({ ...prev, email: user.email || '' }));
        }
        
        // Check for existing application
        if (user?.id) {
          try {
            const { data: application, error } = await supabase
              .from('delivery_provider_registrations')
              .select('id, status, full_name, company_name, is_company, created_at, updated_at, admin_notes')
              .eq('auth_user_id', user.id)
              .maybeSingle();
            
            if (application && !error) {
              setExistingApplication(application as ExistingApplication);
            }
          } catch (appError) {
            console.warn('Error checking existing application:', appError);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
        
        // Final fallback - try localStorage
        try {
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            if (parsed.user) {
              setCurrentUser(parsed.user);
              console.log('📋 DeliveryProviderApplication: Fallback - Got user from localStorage:', parsed.user?.email);
              if (parsed.user?.email) {
                setCompanyForm(prev => ({ ...prev, contactEmail: parsed.user.email || '' }));
                setPrivateForm(prev => ({ ...prev, email: parsed.user.email || '' }));
              }
            }
          }
        } catch (e) {
          console.warn('Could not parse localStorage session');
        }
      } finally {
        setIsLoadingApplication(false);
      }
    };
    getUser();
  }, []);

  const [companyForm, setCompanyForm] = useState<CompanyApplication>({
    companyName: "",
    businessRegistration: "",
    taxId: "",
    yearEstablished: "",
    companySize: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    businessAddress: "",
    operatingAreas: [],
    serviceTypes: [],
    vehicleFleet: "",
    deliveryCapacity: "",
    operatingHours: "",
    specializations: [],
    yearsInBusiness: "",
    previousClients: "",
    insuranceCoverage: "",
    certifications: [],
    whyJoinUjenziXform: "",
    additionalServices: ""
  });

  const [privateForm, setPrivateForm] = useState<PrivateApplication>({
    fullName: "",
    idNumber: "",
    phoneNumber: "",
    email: "",
    address: "",
    vehicleType: "",
    vehicleModel: "",
    vehicleYear: "",
    licensePlate: "",
    drivingLicense: "",
    availableAreas: [],
    workingHours: "",
    deliveryTypes: [],
    experience: "",
    hasInsurance: false,
    hasGoodConductCert: false,
    emergencyContact: "",
    emergencyPhone: "",
    motivation: "",
    additionalSkills: ""
  });

  const handleCompanyFormChange = (field: keyof CompanyApplication, value: any) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivateFormChange = (field: keyof PrivateApplication, value: any) => {
    setPrivateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (form: 'company' | 'private', field: string, value: string) => {
    if (form === 'company') {
      const currentArray = (companyForm as any)[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item: string) => item !== value)
        : [...currentArray, value];
      handleCompanyFormChange(field as keyof CompanyApplication, newArray);
    } else {
      const currentArray = (privateForm as any)[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item: string) => item !== value)
        : [...currentArray, value];
      handlePrivateFormChange(field as keyof PrivateApplication, newArray);
    }
  };

  const handleCompanySubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit your application.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert into delivery_provider_registrations table
      const { error } = await supabase
        .from('delivery_provider_registrations')
        .insert({
          auth_user_id: currentUser.id,
          full_name: companyForm.contactPerson,
          email: companyForm.contactEmail,
          phone: companyForm.contactPhone,
          company_name: companyForm.companyName,
          business_registration_number: companyForm.businessRegistration,
          is_company: true,
          county: companyForm.operatingAreas[0] || 'Nairobi',
          physical_address: companyForm.businessAddress,
          service_areas: companyForm.operatingAreas.length > 0 ? companyForm.operatingAreas : ['Nairobi'],
          vehicle_type: 'lorry_medium', // Company fleet default
          vehicle_registration: 'Fleet - Multiple Vehicles',
          vehicle_capacity_description: companyForm.deliveryCapacity,
          driving_license_number: 'Company Fleet',
          insurance_provider: companyForm.insuranceCoverage,
          pricing_notes: `Operating Hours: ${companyForm.operatingHours}. Service Types: ${companyForm.serviceTypes.join(', ')}. Specializations: ${companyForm.specializations.join(', ')}. Why join: ${companyForm.whyJoinUjenziXform}`,
          available_hours_start: '06:00',
          available_hours_end: '20:00',
          terms_accepted: true,
          privacy_accepted: true,
          background_check_consent: true,
          status: 'pending'
        });

      if (error) throw error;
      
      toast({
        title: "Application Submitted Successfully",
        description: "Your company application has been submitted for review. We'll contact you within 3-5 business days.",
      });
      
      // Reset form
      setCompanyForm({
        companyName: "",
        businessRegistration: "",
        taxId: "",
        yearEstablished: "",
        companySize: "",
        contactPerson: "",
        contactEmail: currentUser?.email || "",
        contactPhone: "",
        businessAddress: "",
        operatingAreas: [],
        serviceTypes: [],
        vehicleFleet: "",
        deliveryCapacity: "",
        operatingHours: "",
        specializations: [],
        yearsInBusiness: "",
        previousClients: "",
        insuranceCoverage: "",
        certifications: [],
        whyJoinUjenziXform: "",
        additionalServices: ""
      });
    } catch (error: any) {
      console.error('Company application error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivateSubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit your application.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert into delivery_provider_registrations table
      const { error } = await supabase
        .from('delivery_provider_registrations')
        .insert({
          auth_user_id: currentUser.id,
          full_name: privateForm.fullName,
          email: privateForm.email,
          phone: privateForm.phoneNumber,
          id_number: privateForm.idNumber,
          is_company: false,
          county: privateForm.availableAreas[0] || 'Nairobi',
          physical_address: privateForm.address,
          service_areas: privateForm.availableAreas.length > 0 ? privateForm.availableAreas : ['Nairobi'],
          vehicle_type: privateForm.vehicleType || 'motorcycle',
          vehicle_registration: privateForm.licensePlate || 'Pending',
          vehicle_capacity_description: `${privateForm.vehicleModel} (${privateForm.vehicleYear})`,
          driving_license_number: privateForm.drivingLicense || 'Pending',
          years_driving_experience: privateForm.experience === 'beginner' ? 1 : 
                                    privateForm.experience === 'intermediate' ? 2 : 
                                    privateForm.experience === 'experienced' ? 4 : 6,
          ntsa_compliance: privateForm.hasInsurance,
          pricing_notes: `Working Hours: ${privateForm.workingHours}. Motivation: ${privateForm.motivation}. Skills: ${privateForm.additionalSkills}. Emergency: ${privateForm.emergencyContact} (${privateForm.emergencyPhone})`,
          available_hours_start: '08:00',
          available_hours_end: '18:00',
          terms_accepted: true,
          privacy_accepted: true,
          background_check_consent: privateForm.hasGoodConductCert,
          status: 'pending'
        });

      if (error) throw error;
      
      toast({
        title: "Application Submitted Successfully",
        description: "Your private provider application has been submitted for review. We'll contact you within 2-3 business days.",
      });
      
      // Reset form
      setPrivateForm({
        fullName: "",
        idNumber: "",
        phoneNumber: "",
        email: currentUser?.email || "",
        address: "",
        vehicleType: "",
        vehicleModel: "",
        vehicleYear: "",
        licensePlate: "",
        drivingLicense: "",
        availableAreas: [],
        workingHours: "",
        deliveryTypes: [],
        experience: "",
        hasInsurance: false,
        hasGoodConductCert: false,
        emergencyContact: "",
        emergencyPhone: "",
        motivation: "",
        additionalSkills: ""
      });
    } catch (error: any) {
      console.error('Private application error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const kenyanCounties = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale",
    "Garissa", "Kakamega", "Machakos", "Meru", "Nyeri", "Kericho", "Embu", "Migori"
  ];

  const serviceTypes = [
    "Same-day delivery", "Next-day delivery", "Scheduled delivery", "Express delivery",
    "Bulk delivery", "Fragile items", "Heavy materials", "Long-distance delivery"
  ];

  // Vehicle types must match database constraint exactly
  const vehicleTypes = [
    { value: "motorcycle", label: "Motorcycle" },
    { value: "tuk_tuk", label: "Tuk Tuk / Bajaj" },
    { value: "pickup", label: "Pickup Truck" },
    { value: "lorry_small", label: "Small Lorry (up to 3 tons)" },
    { value: "lorry_medium", label: "Medium Lorry (3-7 tons)" },
    { value: "lorry_large", label: "Large Lorry (7+ tons)" },
    { value: "trailer", label: "Trailer" }
  ];

  const deliverySpecializations = [
    "Construction materials", "Cement & aggregates", "Steel & metal", "Timber & wood",
    "Tiles & ceramics", "Plumbing materials", "Electrical supplies", "Paint & chemicals"
  ];

  return (
    <div className="min-h-screen bg-gradient-construction">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Become a Delivery Provider
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Join UjenziXform's network of trusted delivery partners and grow your business
          </p>
          
          {/* Benefits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="p-4 border rounded-lg bg-white">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold mb-1">Steady Income</h3>
              <p className="text-sm text-muted-foreground">Regular delivery orders from construction projects</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold mb-1">Growing Network</h3>
              <p className="text-sm text-muted-foreground">Connect with builders and suppliers across Kenya</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold mb-1">Professional Support</h3>
              <p className="text-sm text-muted-foreground">Training, insurance support, and business growth</p>
            </div>
          </div>

          <Alert className="max-w-2xl mx-auto mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Join Kenya's Leading Construction Platform:</strong> Partner with UjenziXform to access 
              thousands of builders and suppliers who need reliable delivery services across all 47 counties.
            </AlertDescription>
          </Alert>
        </div>

        {/* Application Status Banner */}
        {isLoadingApplication ? (
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>Checking application status...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : existingApplication ? (
          <div className="max-w-4xl mx-auto mb-8">
            {existingApplication.status === 'approved' && (
              <Card className="border-green-300 bg-green-50">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-green-800">🎉 Congratulations! Your Application is Approved</h3>
                        <p className="text-green-700">
                          Welcome to UjenziXform's delivery network, {existingApplication.company_name || existingApplication.full_name}!
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          Approved on: {new Date(existingApplication.updated_at).toLocaleDateString('en-KE', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </p>
                        {existingApplication.admin_notes && (
                          <p className="text-sm text-green-600 mt-2 italic">
                            Note: {existingApplication.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        APPROVED
                      </Badge>
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => window.location.href = '/delivery-dashboard'}
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {existingApplication.status === 'rejected' && (
              <Card className="border-red-300 bg-red-50">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-red-100">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-800">Application Not Approved</h3>
                        <p className="text-red-700">
                          Unfortunately, your application was not approved at this time.
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                          Reviewed on: {new Date(existingApplication.updated_at).toLocaleDateString('en-KE', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </p>
                        {existingApplication.admin_notes && (
                          <p className="text-sm text-red-600 mt-2 italic">
                            Reason: {existingApplication.admin_notes}
                          </p>
                        )}
                        <p className="text-sm text-red-600 mt-2">
                          You may contact support at <a href="mailto:delivery@UjenziXform.com" className="underline">delivery@UjenziXform.com</a> for more information.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-red-600 text-white text-lg px-4 py-2">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      NOT APPROVED
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {existingApplication.status === 'pending' && (
              <Card className="border-yellow-300 bg-yellow-50">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-yellow-100">
                        <Clock className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-yellow-800">Application Pending Review</h3>
                        <p className="text-yellow-700">
                          Your application for {existingApplication.company_name || existingApplication.full_name} is being reviewed.
                        </p>
                        <p className="text-sm text-yellow-600 mt-1">
                          Submitted on: {new Date(existingApplication.created_at).toLocaleDateString('en-KE', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-yellow-600 mt-2">
                          We typically review applications within 2-5 business days. You'll receive an email notification once reviewed.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-600 text-white text-lg px-4 py-2">
                      <Clock className="h-4 w-4 mr-2" />
                      PENDING
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {existingApplication.status === 'under_review' && (
              <Card className="border-blue-300 bg-blue-50">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-blue-100">
                        <Info className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-blue-800">Application Under Review</h3>
                        <p className="text-blue-700">
                          Your application is currently being reviewed by our team.
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          Submitted on: {new Date(existingApplication.created_at).toLocaleDateString('en-KE', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-blue-600 mt-2">
                          A member of our team is actively reviewing your application. Expect a decision within 1-2 business days.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
                      <Info className="h-4 w-4 mr-2" />
                      UNDER REVIEW
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {/* Application Tabs - Only show if no existing application or if rejected */}
        {(!existingApplication || existingApplication.status === 'rejected') && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Delivery Company
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Private Provider
            </TabsTrigger>
          </TabsList>

          {/* Company Application Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Delivery Company Application
                </CardTitle>
                <CardDescription>
                  Apply as a registered delivery company to join UjenziXform's network of trusted partners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        placeholder="Enter your company name"
                        value={companyForm.companyName}
                        onChange={(e) => handleCompanyFormChange('companyName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessRegistration">Business Registration Number *</Label>
                      <Input
                        id="businessRegistration"
                        placeholder="Enter business registration number"
                        value={companyForm.businessRegistration}
                        onChange={(e) => handleCompanyFormChange('businessRegistration', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID/PIN Number *</Label>
                      <Input
                        id="taxId"
                        placeholder="Enter tax identification number"
                        value={companyForm.taxId}
                        onChange={(e) => handleCompanyFormChange('taxId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearEstablished">Year Established</Label>
                      <Input
                        id="yearEstablished"
                        type="number"
                        placeholder="e.g., 2020"
                        value={companyForm.yearEstablished}
                        onChange={(e) => handleCompanyFormChange('yearEstablished', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person *</Label>
                      <Input
                        id="contactPerson"
                        placeholder="Primary contact person"
                        value={companyForm.contactPerson}
                        onChange={(e) => handleCompanyFormChange('contactPerson', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Business Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="business@company.com"
                        value={companyForm.contactEmail}
                        onChange={(e) => handleCompanyFormChange('contactEmail', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Business Phone *</Label>
                      <Input
                        id="contactPhone"
                        placeholder="+254 xxx xxx xxx"
                        value={companyForm.contactPhone}
                        onChange={(e) => handleCompanyFormChange('contactPhone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select value={companyForm.companySize} onValueChange={(value) => handleCompanyFormChange('companySize', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (1-10 employees)</SelectItem>
                          <SelectItem value="medium">Medium (11-50 employees)</SelectItem>
                          <SelectItem value="large">Large (51+ employees)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address *</Label>
                    <Textarea
                      id="businessAddress"
                      placeholder="Enter your complete business address"
                      value={companyForm.businessAddress}
                      onChange={(e) => handleCompanyFormChange('businessAddress', e.target.value)}
                    />
                  </div>
                </div>

                {/* Operating Areas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Operating Areas</h3>
                  <p className="text-sm text-muted-foreground">Select the counties where you provide delivery services</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {kenyanCounties.map((county) => (
                      <div key={county} className="flex items-center space-x-2">
                        <Checkbox
                          id={`county-${county}`}
                          checked={companyForm.operatingAreas.includes(county)}
                          onCheckedChange={() => handleArrayToggle('company', 'operatingAreas', county)}
                        />
                        <Label htmlFor={`county-${county}`} className="text-sm">{county}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Types */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Service Types</h3>
                  <p className="text-sm text-muted-foreground">Select the delivery services you offer</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {serviceTypes.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={companyForm.serviceTypes.includes(service)}
                          onCheckedChange={() => handleArrayToggle('company', 'serviceTypes', service)}
                        />
                        <Label htmlFor={`service-${service}`} className="text-sm">{service}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fleet Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Fleet & Capacity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleFleet">Vehicle Fleet Size *</Label>
                      <Input
                        id="vehicleFleet"
                        placeholder="e.g., 5 trucks, 10 motorcycles"
                        value={companyForm.vehicleFleet}
                        onChange={(e) => handleCompanyFormChange('vehicleFleet', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryCapacity">Daily Delivery Capacity</Label>
                      <Input
                        id="deliveryCapacity"
                        placeholder="e.g., 50 deliveries per day"
                        value={companyForm.deliveryCapacity}
                        onChange={(e) => handleCompanyFormChange('deliveryCapacity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operatingHours">Operating Hours</Label>
                      <Input
                        id="operatingHours"
                        placeholder="e.g., 6AM - 8PM, Monday to Saturday"
                        value={companyForm.operatingHours}
                        onChange={(e) => handleCompanyFormChange('operatingHours', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insuranceCoverage">Insurance Coverage</Label>
                      <Input
                        id="insuranceCoverage"
                        placeholder="Insurance provider and coverage amount"
                        value={companyForm.insuranceCoverage}
                        onChange={(e) => handleCompanyFormChange('insuranceCoverage', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Delivery Specializations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deliverySpecializations.map((spec) => (
                      <div key={spec} className="flex items-center space-x-2">
                        <Checkbox
                          id={`spec-${spec}`}
                          checked={companyForm.specializations.includes(spec)}
                          onCheckedChange={() => handleArrayToggle('company', 'specializations', spec)}
                        />
                        <Label htmlFor={`spec-${spec}`} className="text-sm">{spec}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whyJoinUjenziXform">Why do you want to join UjenziXform? *</Label>
                      <Textarea
                        id="whyJoinUjenziXform"
                        placeholder="Tell us about your motivation and how you can contribute to our platform"
                        value={companyForm.whyJoinUjenziXform}
                        onChange={(e) => handleCompanyFormChange('whyJoinUjenziXform', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="previousClients">Previous Major Clients</Label>
                      <Textarea
                        id="previousClients"
                        placeholder="List some of your major clients or projects"
                        value={companyForm.previousClients}
                        onChange={(e) => handleCompanyFormChange('previousClients', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={handleCompanySubmit}
                    disabled={isSubmitting || !companyForm.companyName || !companyForm.contactEmail}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Company Application
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Private Provider Application Tab */}
          <TabsContent value="private" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Private Delivery Provider Application
                </CardTitle>
                <CardDescription>
                  Apply as an individual delivery provider to earn income with your own vehicle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={privateForm.fullName}
                        onChange={(e) => handlePrivateFormChange('fullName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idNumber">National ID Number *</Label>
                      <Input
                        id="idNumber"
                        placeholder="Enter your ID number"
                        value={privateForm.idNumber}
                        onChange={(e) => handlePrivateFormChange('idNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        placeholder="+254 xxx xxx xxx"
                        value={privateForm.phoneNumber}
                        onChange={(e) => handlePrivateFormChange('phoneNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={privateForm.email}
                        onChange={(e) => handlePrivateFormChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Residential Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your complete address"
                      value={privateForm.address}
                      onChange={(e) => handlePrivateFormChange('address', e.target.value)}
                    />
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Vehicle Type *</Label>
                      <Select value={privateForm.vehicleType} onValueChange={(value) => handlePrivateFormChange('vehicleType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel">Vehicle Make/Model *</Label>
                      <Input
                        id="vehicleModel"
                        placeholder="e.g., Toyota Hilux, Honda CB 150"
                        value={privateForm.vehicleModel}
                        onChange={(e) => handlePrivateFormChange('vehicleModel', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleYear">Vehicle Year</Label>
                      <Input
                        id="vehicleYear"
                        type="number"
                        placeholder="e.g., 2020"
                        value={privateForm.vehicleYear}
                        onChange={(e) => handlePrivateFormChange('vehicleYear', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licensePlate">License Plate Number *</Label>
                      <Input
                        id="licensePlate"
                        placeholder="e.g., KCA 123A"
                        value={privateForm.licensePlate}
                        onChange={(e) => handlePrivateFormChange('licensePlate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drivingLicense">Driving License Number *</Label>
                      <Input
                        id="drivingLicense"
                        placeholder="Enter your driving license number"
                        value={privateForm.drivingLicense}
                        onChange={(e) => handlePrivateFormChange('drivingLicense', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Service Areas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Available Service Areas</h3>
                  <p className="text-sm text-muted-foreground">Select areas where you can provide delivery services</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {kenyanCounties.map((county) => (
                      <div key={county} className="flex items-center space-x-2">
                        <Checkbox
                          id={`private-county-${county}`}
                          checked={privateForm.availableAreas.includes(county)}
                          onCheckedChange={() => handleArrayToggle('private', 'availableAreas', county)}
                        />
                        <Label htmlFor={`private-county-${county}`} className="text-sm">{county}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Work Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workingHours">Preferred Working Hours</Label>
                      <Input
                        id="workingHours"
                        placeholder="e.g., 8AM - 6PM, Flexible"
                        value={privateForm.workingHours}
                        onChange={(e) => handlePrivateFormChange('workingHours', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Delivery Experience</Label>
                      <Select value={privateForm.experience} onValueChange={(value) => handlePrivateFormChange('experience', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner (Less than 1 year)</SelectItem>
                          <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                          <SelectItem value="experienced">Experienced (3-5 years)</SelectItem>
                          <SelectItem value="expert">Expert (5+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Documentation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Required Documentation</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasInsurance"
                        checked={privateForm.hasInsurance}
                        onCheckedChange={(checked) => handlePrivateFormChange('hasInsurance', checked)}
                      />
                      <Label htmlFor="hasInsurance">I have valid vehicle insurance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasGoodConductCert"
                        checked={privateForm.hasGoodConductCert}
                        onCheckedChange={(checked) => handlePrivateFormChange('hasGoodConductCert', checked)}
                      />
                      <Label htmlFor="hasGoodConductCert">I have a certificate of good conduct</Label>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                      <Input
                        id="emergencyContact"
                        placeholder="Next of kin or emergency contact"
                        value={privateForm.emergencyContact}
                        onChange={(e) => handlePrivateFormChange('emergencyContact', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                      <Input
                        id="emergencyPhone"
                        placeholder="+254 xxx xxx xxx"
                        value={privateForm.emergencyPhone}
                        onChange={(e) => handlePrivateFormChange('emergencyPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Motivation */}
                <div className="space-y-2">
                  <Label htmlFor="motivation">Why do you want to join UjenziXform? *</Label>
                  <Textarea
                    id="motivation"
                    placeholder="Tell us about your motivation and goals as a delivery provider"
                    value={privateForm.motivation}
                    onChange={(e) => handlePrivateFormChange('motivation', e.target.value)}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={handlePrivateSubmit}
                    disabled={isSubmitting || !privateForm.fullName || !privateForm.email || !privateForm.phoneNumber}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Private Application
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}

        {/* Application Process */}
        <Card className="max-w-4xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Application Process & Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Delivery Companies
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Business Registration Required</p>
                      <p className="text-muted-foreground">Valid business license and tax compliance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Fleet Documentation</p>
                      <p className="text-muted-foreground">Vehicle registration and insurance coverage</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Review Process: 3-5 Business Days</p>
                      <p className="text-muted-foreground">Background check and verification</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-green-500" />
                  Private Providers
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Valid Documentation</p>
                      <p className="text-muted-foreground">ID, driving license, and good conduct certificate</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Vehicle Requirements</p>
                      <p className="text-muted-foreground">Roadworthy vehicle with valid insurance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Review Process: 2-3 Business Days</p>
                      <p className="text-muted-foreground">Quick verification and onboarding</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                What Happens Next?
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</div>
                  <span>Application review and background verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                  <span>Phone interview and document verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</div>
                  <span>Training session and platform onboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">4</div>
                  <span>Account activation and first delivery assignments</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DeliveryProviderApplication;


















