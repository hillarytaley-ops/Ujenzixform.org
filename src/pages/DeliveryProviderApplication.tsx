import React, { useState } from 'react';
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
  whyJoinUjenziPro: string;
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

const DeliveryProviderApplication = () => {
  const [activeTab, setActiveTab] = useState("company");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
    whyJoinUjenziPro: "",
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
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        whyJoinUjenziPro: "",
        additionalServices: ""
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivateSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Application Submitted Successfully",
        description: "Your private provider application has been submitted for review. We'll contact you within 2-3 business days.",
      });
      
      // Reset form
      setPrivateForm({
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
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
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

  const vehicleTypes = [
    "Motorcycle", "Pickup truck", "Small truck", "Medium truck", "Large truck", "Van"
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
            Join UjenziPro's network of trusted delivery partners and grow your business
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
              <strong>Join Kenya's Leading Construction Platform:</strong> Partner with UjenziPro to access 
              thousands of builders and suppliers who need reliable delivery services across all 47 counties.
            </AlertDescription>
          </Alert>
        </div>

        {/* Application Tabs */}
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
                  Apply as a registered delivery company to join UjenziPro's network of trusted partners
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
                      <Label htmlFor="whyJoinUjenziPro">Why do you want to join UjenziPro? *</Label>
                      <Textarea
                        id="whyJoinUjenziPro"
                        placeholder="Tell us about your motivation and how you can contribute to our platform"
                        value={companyForm.whyJoinUjenziPro}
                        onChange={(e) => handleCompanyFormChange('whyJoinUjenziPro', e.target.value)}
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
                            <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <Label htmlFor="motivation">Why do you want to join UjenziPro? *</Label>
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













