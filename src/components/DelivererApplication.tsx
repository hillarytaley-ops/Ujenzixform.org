import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Truck, User, MapPin, Building } from "lucide-react";

const DelivererApplication = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    providerName: "",
    providerType: "individual",
    phone: "",
    email: "",
    address: "",
    vehicleTypes: [],
    serviceAreas: [],
    capacityKg: "",
    hourlyRate: "",
    perKmRate: "",
    drivingLicenseNumber: "",
    drivingLicenseClass: "",
    drivingLicenseExpiry: "",
    contactPerson: "",
    // Company-specific fields
    companyRegistrationNumber: "",
    taxIdentificationNumber: "",
    businessLicenseNumber: "",
    fleetSize: "",
    operatingYears: "",
    insurancePolicyNumber: "",
    // Individual-specific fields
    nationalIdNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    workExperience: ""
  });
  const [documents, setDocuments] = useState({
    cv: null as File | null,
    drivingLicense: null as File | null,
    nationalId: null as File | null,
    goodConduct: null as File | null
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();

  const vehicleOptions = [
    { value: "van", label: "Van" },
    { value: "truck", label: "Truck" },
    { value: "pickup", label: "Pickup Truck" },
    { value: "trailer", label: "Trailer" },
    { value: "motorcycle", label: "Motorcycle" },
    { value: "bicycle", label: "Bicycle" }
  ];

  const serviceAreaOptions = [
    { value: "nairobi", label: "Nairobi" },
    { value: "mombasa", label: "Mombasa" },
    { value: "kisumu", label: "Kisumu" },
    { value: "nakuru", label: "Nakuru" },
    { value: "eldoret", label: "Eldoret" },
    { value: "thika", label: "Thika" }
  ];

  const handleVehicleTypeChange = (vehicleType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      vehicleTypes: checked
        ? [...prev.vehicleTypes, vehicleType]
        : prev.vehicleTypes.filter(type => type !== vehicleType)
    }));
  };

  const handleServiceAreaChange = (area: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: checked
        ? [...prev.serviceAreas, area]
        : prev.serviceAreas.filter(a => a !== area)
    }));
  };

  const handleDocumentUpload = (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for documents
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a file smaller than 10MB"
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload PDF, JPG, or PNG files only"
        });
        return;
      }

      setDocuments(prev => ({
        ...prev,
        [documentType]: file
      }));
    }
  };

  const uploadDocument = async (userId: string, documentType: string, file: File) => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('provider-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${documentType}:`, error);
      throw error;
    }

    return data.path;
  };

  const uploadAllDocuments = async (userId: string) => {
    const documentPaths: any = {};

    for (const [docType, file] of Object.entries(documents)) {
      if (file) {
        documentPaths[`${docType}_document_path`] = await uploadDocument(userId, docType, file);
      }
    }

    return documentPaths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        variant: "destructive",
        title: "Terms Required",
        description: "Please agree to the terms and conditions"
      });
      return;
    }

    if (formData.vehicleTypes.length === 0) {
      toast({
        variant: "destructive",
        title: "Vehicle Type Required",
        description: "Please select at least one vehicle type"
      });
      return;
    }

    if (formData.serviceAreas.length === 0) {
      toast({
        variant: "destructive",
        title: "Service Area Required",
        description: "Please select at least one service area"
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Upload all documents
      const documentPaths = await uploadAllDocuments(profile.id);

      // delivery_providers.user_id must be auth.users.id (FK), not profiles.id — required for RPCs / dashboards
      const { error } = await supabase
        .from('delivery_providers')
        .insert({
          user_id: user.id,
          provider_name: formData.providerName.trim(),
          provider_type: formData.providerType,
          phone: formData.phone.trim(),
          email: formData.email?.trim() || null,
          address: formData.address,
          contact_person: formData.contactPerson,
          vehicle_types: formData.vehicleTypes,
          service_areas: formData.serviceAreas,
          capacity_kg: formData.capacityKg ? parseFloat(formData.capacityKg) : null,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          per_km_rate: formData.perKmRate ? parseFloat(formData.perKmRate) : null,
          driving_license_number: formData.drivingLicenseNumber,
          driving_license_class: formData.drivingLicenseClass,
          driving_license_expiry: formData.drivingLicenseExpiry || null,
          driving_license_document_path: documentPaths.drivingLicense_document_path || null,
          cv_document_path: documentPaths.cv_document_path || null,
          national_id_document_path: documentPaths.nationalId_document_path || null,
          good_conduct_document_path: documentPaths.goodConduct_document_path || null,
          driving_license_verified: false,
          cv_verified: false,
          national_id_verified: false,
          good_conduct_verified: false,
          is_verified: false,
          is_active: true
        });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({
          full_name: formData.providerName.trim(),
          phone: formData.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      toast({
        title: "Application Submitted",
        description: "Your deliverer application has been submitted for review"
      });

      // Reset form
      setFormData({
        providerName: "",
        providerType: "individual",
        phone: "",
        email: "",
        address: "",
        vehicleTypes: [],
        serviceAreas: [],
        capacityKg: "",
        hourlyRate: "",
        perKmRate: "",
        drivingLicenseNumber: "",
        drivingLicenseClass: "",
        drivingLicenseExpiry: "",
        contactPerson: ""
      });
      setDocuments({
        cv: null,
        drivingLicense: null,
        nationalId: null,
        goodConduct: null
      });
      setAgreedToTerms(false);

    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit application. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Become a Delivery Provider
          </CardTitle>
          <CardDescription>
            Apply to join our network of verified delivery providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="providerName">Provider Name *</Label>
                  <Input
                    id="providerName"
                    value={formData.providerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, providerName: e.target.value }))}
                    placeholder="Your name or company name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providerType">Provider Type *</Label>
                  <Select
                    value={formData.providerType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, providerType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Private Delivery Provider</SelectItem>
                      <SelectItem value="company">Delivery Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+254 700 000 000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Your business or home address"
                />
              </div>

              {/* Company-specific fields */}
              {formData.providerType === "company" && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <h4 className="text-md font-semibold text-blue-800 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Delivery Company Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Primary Contact Person *</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                        placeholder="Contact person name"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyRegistrationNumber">Company Registration Number</Label>
                      <Input
                        id="companyRegistrationNumber"
                        value={formData.companyRegistrationNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyRegistrationNumber: e.target.value }))}
                        placeholder="e.g., C.123456"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fleetSize">Fleet Size</Label>
                      <Input
                        id="fleetSize"
                        type="number"
                        value={formData.fleetSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, fleetSize: e.target.value }))}
                        placeholder="Number of vehicles"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="operatingYears">Years in Operation</Label>
                      <Input
                        id="operatingYears"
                        type="number"
                        value={formData.operatingYears}
                        onChange={(e) => setFormData(prev => ({ ...prev, operatingYears: e.target.value }))}
                        placeholder="Years in business"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurancePolicyNumber">Commercial Insurance Policy</Label>
                    <Input
                      id="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                      placeholder="Commercial vehicle insurance policy number"
                    />
                  </div>
                </div>
              )}

              {/* Individual-specific fields */}
              {formData.providerType === "individual" && (
                <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                  <h4 className="text-md font-semibold text-green-800 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Private Provider Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nationalIdNumber">National ID Number</Label>
                      <Input
                        id="nationalIdNumber"
                        value={formData.nationalIdNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, nationalIdNumber: e.target.value }))}
                        placeholder="National ID number"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="workExperience">Delivery Experience (Years)</Label>
                      <Input
                        id="workExperience"
                        type="number"
                        value={formData.workExperience}
                        onChange={(e) => setFormData(prev => ({ ...prev, workExperience: e.target.value }))}
                        placeholder="Years of delivery experience"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                      <Input
                        id="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                        placeholder="Emergency contact person"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                        placeholder="+254 700 000 000"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle & Service Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle & Service Information
              </h3>

              <div className="space-y-2">
                <Label>Vehicle Types * (Select all that apply)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {vehicleOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={formData.vehicleTypes.includes(option.value)}
                        onCheckedChange={(checked) => handleVehicleTypeChange(option.value, checked as boolean)}
                      />
                      <Label htmlFor={option.value} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Service Areas * (Select all that apply)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {serviceAreaOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${option.value}`}
                        checked={formData.serviceAreas.includes(option.value)}
                        onCheckedChange={(checked) => handleServiceAreaChange(option.value, checked as boolean)}
                      />
                      <Label htmlFor={`area-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacityKg">Vehicle Capacity (kg)</Label>
                  <Input
                    id="capacityKg"
                    type="number"
                    value={formData.capacityKg}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacityKg: e.target.value }))}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    placeholder="25.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perKmRate">Per KM Rate (USD)</Label>
                  <Input
                    id="perKmRate"
                    type="number"
                    step="0.01"
                    value={formData.perKmRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, perKmRate: e.target.value }))}
                    placeholder="1.50"
                  />
                </div>
              </div>
            </div>

            {/* Driving License Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Driving License Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.drivingLicenseNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, drivingLicenseNumber: e.target.value }))}
                    placeholder="DL123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseClass">License Class</Label>
                  <Select
                    value={formData.drivingLicenseClass}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, drivingLicenseClass: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Class A - Motorcycle</SelectItem>
                      <SelectItem value="B">Class B - Light Vehicle</SelectItem>
                      <SelectItem value="C">Class C - Medium Vehicle</SelectItem>
                      <SelectItem value="D">Class D - Heavy Vehicle</SelectItem>
                      <SelectItem value="E">Class E - Articulated Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseExpiry">License Expiry Date</Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    value={formData.drivingLicenseExpiry}
                    onChange={(e) => setFormData(prev => ({ ...prev, drivingLicenseExpiry: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Document Upload Portal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Required Documents Upload Portal
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-4">
                  Please upload all required documents. All files must be in PDF, JPG, or PNG format and under 10MB.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CV/Resume Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="cvUpload" className="font-medium text-gray-700">
                      CV/Resume *
                    </Label>
                    <Input
                      id="cvUpload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('cv', e)}
                      className="cursor-pointer"
                      required
                    />
                    {documents.cv && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {documents.cv.name}
                      </span>
                    )}
                  </div>

                  {/* Driving License Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="drivingLicenseUpload" className="font-medium text-gray-700">
                      Driving License *
                    </Label>
                    <Input
                      id="drivingLicenseUpload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('drivingLicense', e)}
                      className="cursor-pointer"
                      required
                    />
                    {documents.drivingLicense && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {documents.drivingLicense.name}
                      </span>
                    )}
                  </div>

                  {/* National ID/Passport Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="nationalIdUpload" className="font-medium text-gray-700">
                      National ID/Passport *
                    </Label>
                    <Input
                      id="nationalIdUpload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('nationalId', e)}
                      className="cursor-pointer"
                      required
                    />
                    {documents.nationalId && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {documents.nationalId.name}
                      </span>
                    )}
                  </div>

                  {/* Certificate of Good Conduct Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="goodConductUpload" className="font-medium text-gray-700">
                      Certificate of Good Conduct (CID) *
                    </Label>
                    <Input
                      id="goodConductUpload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('goodConduct', e)}
                      className="cursor-pointer"
                      required
                    />
                    {documents.goodConduct && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {documents.goodConduct.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Certificate of Good Conduct must be obtained from Kenya's Criminal Investigation Department (CID). 
                    All documents will be securely stored and used only for verification purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the terms and conditions and privacy policy *
                </Label>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting Application..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelivererApplication;