import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Building, 
  Phone, 
  Mail,
  MapPin,
  Calendar,
  RefreshCw,
  Send,
  Eye,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const applicationSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  contact_person: z.string().min(2, "Contact person name required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  materials_offered: z.array(z.string()).min(1, "Select at least one material"),
  specialties: z.array(z.string()).min(1, "Select at least one specialty"),
  business_registration_number: z.string().min(3, "Business registration number required"),
  years_in_business: z.string().min(1, "Years in business required"),
  application_notes: z.string().optional()
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface SupplierApplication {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  materials_offered: string[];
  specialties: string[];
  business_registration_number: string;
  years_in_business: number;
  application_notes: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

const materialOptions = [
  "Cement", "Steel Bars", "Blocks", "Sand", "Ballast", "Timber", 
  "Roofing Sheets", "Tiles", "Paint", "Electrical Supplies", 
  "Plumbing Supplies", "Hardware", "Glass", "Insulation"
];

const specialtyOptions = [
  "Building Materials", "Electrical Supplies", "Plumbing Supplies", 
  "Roofing Materials", "Flooring", "Paint & Finishes", 
  "Hardware & Tools", "Landscaping", "Safety Equipment", "Concrete Products"
];

export const SupplierApplicationManager: React.FC = () => {
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [userApplication, setUserApplication] = useState<SupplierApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("apply");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema)
  });

  useEffect(() => {
    checkUserRole();
    loadApplications();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      setIsAdmin(roleData?.role === 'admin');
      
      if (roleData?.role === 'admin') {
        setActiveTab("review");
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        // Load all applications for admin
        const { data: allApplications, error } = await supabase
          .from('supplier_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApplications(allApplications || []);
      } else {
        // Load user's own application
        const { data: userApp, error } = await supabase
          .from('supplier_applications')
          .select('*')
          .eq('applicant_user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        setUserApplication(userApp);
      }
    } catch (error: any) {
      console.error('Error loading applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const applicationData = {
        ...data,
        applicant_user_id: user.id,
        materials_offered: selectedMaterials,
        specialties: selectedSpecialties,
        years_in_business: parseInt(data.years_in_business)
      };

      const { error } = await supabase
        .from('supplier_applications')
        .insert([applicationData]);

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Your supplier application has been submitted successfully. You will be notified once it's reviewed.",
      });

      reset();
      setSelectedMaterials([]);
      setSelectedSpecialties([]);
      loadApplications();

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      if (action === 'approve') {
        const { data, error } = await supabase.rpc('approve_supplier_application', {
          application_id: applicationId
        });

        if (error) throw error;

        toast({
          title: "Application Approved",
          description: "Supplier application has been approved and supplier account created.",
        });
      } else {
        const { error } = await supabase.rpc('reject_supplier_application', {
          application_id: applicationId,
          rejection_reason_text: rejectionReason || 'No reason provided'
        });

        if (error) throw error;

        toast({
          title: "Application Rejected",
          description: "Supplier application has been rejected.",
        });
      }

      loadApplications();
    } catch (error: any) {
      console.error('Error processing application:', error);
      toast({
        title: "Action Failed",
        description: error.message || "Failed to process application",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading applications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Applications</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Review and manage supplier applications" : "Apply to become a verified supplier"}
          </p>
        </div>
        <Button variant="outline" onClick={loadApplications}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={isAdmin ? "grid w-full grid-cols-2" : "grid w-full grid-cols-1"}>
          {!isAdmin && <TabsTrigger value="apply">Apply</TabsTrigger>}
          {isAdmin && <TabsTrigger value="review">Review Applications</TabsTrigger>}
          {!isAdmin && userApplication && <TabsTrigger value="status">Application Status</TabsTrigger>}
        </TabsList>

        {!isAdmin && (
          <TabsContent value="apply" className="space-y-4">
            {userApplication ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Application Already Submitted</AlertTitle>
                <AlertDescription>
                  You have already submitted a supplier application. Check the "Application Status" tab for updates.
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Application Form</CardTitle>
                  <CardDescription>
                    Complete this form to apply as a verified supplier on UjenziPro
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          {...register("company_name")}
                          placeholder="Your company name"
                        />
                        {errors.company_name && (
                          <p className="text-sm text-red-600">{errors.company_name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_person">Contact Person *</Label>
                        <Input
                          id="contact_person"
                          {...register("contact_person")}
                          placeholder="Primary contact name"
                        />
                        {errors.contact_person && (
                          <p className="text-sm text-red-600">{errors.contact_person.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register("email")}
                          placeholder="company@example.com"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          {...register("phone")}
                          placeholder="+254712345678"
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-600">{errors.phone.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business_registration_number">Business Registration Number *</Label>
                        <Input
                          id="business_registration_number"
                          {...register("business_registration_number")}
                          placeholder="Business registration number"
                        />
                        {errors.business_registration_number && (
                          <p className="text-sm text-red-600">{errors.business_registration_number.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="years_in_business">Years in Business *</Label>
                        <Input
                          id="years_in_business"
                          type="number"
                          {...register("years_in_business")}
                          placeholder="5"
                        />
                        {errors.years_in_business && (
                          <p className="text-sm text-red-600">{errors.years_in_business.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Business Address *</Label>
                      <Textarea
                        id="address"
                        {...register("address")}
                        placeholder="Complete business address"
                        rows={3}
                      />
                      {errors.address && (
                        <p className="text-sm text-red-600">{errors.address.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Materials Offered *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {materialOptions.map((material) => (
                          <label key={material} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedMaterials.includes(material)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMaterials([...selectedMaterials, material]);
                                } else {
                                  setSelectedMaterials(selectedMaterials.filter(m => m !== material));
                                }
                              }}
                            />
                            <span className="text-sm">{material}</span>
                          </label>
                        ))}
                      </div>
                      {selectedMaterials.length === 0 && (
                        <p className="text-sm text-red-600">Select at least one material</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Specialties *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {specialtyOptions.map((specialty) => (
                          <label key={specialty} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedSpecialties.includes(specialty)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSpecialties([...selectedSpecialties, specialty]);
                                } else {
                                  setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
                                }
                              }}
                            />
                            <span className="text-sm">{specialty}</span>
                          </label>
                        ))}
                      </div>
                      {selectedSpecialties.length === 0 && (
                        <p className="text-sm text-red-600">Select at least one specialty</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="application_notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="application_notes"
                        {...register("application_notes")}
                        placeholder="Any additional information about your business"
                        rows={4}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={submitting || selectedMaterials.length === 0 || selectedSpecialties.length === 0}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {!isAdmin && userApplication && (
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>Track the progress of your supplier application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(userApplication.status)}
                      <div>
                        <h3 className="font-medium">{userApplication.company_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Submitted on {format(new Date(userApplication.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(userApplication.status)}>
                      {userApplication.status}
                    </Badge>
                  </div>

                  {userApplication.status === 'rejected' && userApplication.rejection_reason && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Application Rejected</AlertTitle>
                      <AlertDescription>{userApplication.rejection_reason}</AlertDescription>
                    </Alert>
                  )}

                  {userApplication.status === 'approved' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Application Approved</AlertTitle>
                      <AlertDescription>
                        Congratulations! Your supplier application has been approved. You can now access supplier features.
                      </AlertDescription>
                    </Alert>
                  )}

                  {userApplication.status === 'pending' && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertTitle>Application Under Review</AlertTitle>
                      <AlertDescription>
                        Your application is being reviewed by our team. We'll notify you once a decision is made.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Applications Review</CardTitle>
                <CardDescription>Review and approve/reject supplier applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Applications</h3>
                      <p className="text-muted-foreground">No supplier applications to review at this time.</p>
                    </div>
                  ) : (
                    applications.map((application) => (
                      <div key={application.id} className="border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-medium text-lg">{application.company_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Applied on {format(new Date(application.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <Badge className={getStatusColor(application.status)}>
                              {application.status}
                            </Badge>
                          </div>
                          {application.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplicationAction(application.id, 'reject', 'Application does not meet requirements')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApplicationAction(application.id, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Contact Person</p>
                              <p className="font-medium">{application.contact_person}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-medium">{application.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Phone</p>
                              <p className="font-medium">{application.phone}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Years in Business</p>
                              <p className="font-medium">{application.years_in_business} years</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Business Registration</p>
                            <p className="font-medium">{application.business_registration_number}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Address</p>
                            <p className="font-medium">{application.address}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Materials Offered</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {application.materials_offered.map((material) => (
                                <Badge key={material} variant="secondary" className="text-xs">
                                  {material}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Specialties</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {application.specialties.map((specialty) => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {application.application_notes && (
                            <div>
                              <p className="text-sm text-muted-foreground">Additional Notes</p>
                              <p className="font-medium">{application.application_notes}</p>
                            </div>
                          )}

                          {application.rejection_reason && (
                            <div>
                              <p className="text-sm text-muted-foreground">Rejection Reason</p>
                              <p className="font-medium text-red-600">{application.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
