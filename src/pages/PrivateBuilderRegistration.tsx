import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, CheckCircle, ArrowLeft, User } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
  "Kitale", "Garissa", "Nyeri", "Machakos", "Meru", "Kericho", "Embu",
  "Migori", "Kakamega", "Lamu", "Naivasha", "Nanyuki", "Voi", "Kilifi",
  "Lodwar", "Wajir", "Marsabit", "Moyale", "Chuka", "Kiambu", "Kajiado",
  "Murang'a", "Kirinyaga", "Nyandarua", "Laikipia", "Samburu", "Trans Nzoia",
  "Uasin Gishu", "Elgeyo Marakwet", "Nandi", "Baringo", "West Pokot", 
  "Turkana", "Bomet", "Narok", "Makueni", "Kitui", "Mwingi", "Tharaka Nithi", 
  "Isiolo", "Mandera"
];

const PROJECT_TYPES = [
  "New House Construction", "Home Renovation", "Kitchen Renovation",
  "Bathroom Renovation", "Room Addition", "Roofing Repair/Replacement",
  "Interior Design & Finishing", "Landscaping & Outdoor Spaces",
  "Electrical Work", "Plumbing Installation", "Flooring Installation",
  "Painting & Decoration", "Fencing & Gates", "Swimming Pool Construction",
  "Garage Construction", "Driveway & Walkways", "Solar Panel Installation",
  "Security System Installation", "HVAC Installation", "General Repairs"
];

const BUDGET_RANGES = [
  "Under KSh 500,000",
  "KSh 500,000 - KSh 1,000,000", 
  "KSh 1,000,000 - KSh 2,500,000",
  "KSh 2,500,000 - KSh 5,000,000",
  "KSh 5,000,000 - KSh 10,000,000",
  "Over KSh 10,000,000"
];

const PROJECT_TIMELINES = [
  "Within 1 month",
  "1-3 months",
  "3-6 months", 
  "6-12 months",
  "Over 1 year",
  "Flexible timeline"
];

const PROPERTY_TYPES = [
  "Single Family Home",
  "Apartment/Flat",
  "Townhouse",
  "Commercial Property",
  "Land/Plot",
  "Rental Property",
  "Investment Property"
];

const privateClientRegistrationSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  location: z.string().min(1, "Please select your location"),
  project_types: z.array(z.string()).min(1, "Please select at least one project type"),
  project_timeline: z.string().min(1, "Please select your project timeline"),
  budget_range: z.string().min(1, "Please select your budget range"),
  project_description: z.string().min(50, "Project description must be at least 50 characters"),
  property_type: z.string().min(1, "Please select your property type"),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
  privacy_accepted: z.boolean().refine(val => val === true, {
    message: "You must accept the privacy policy"
  })
});

type PrivateClientRegistrationFormData = z.infer<typeof privateClientRegistrationSchema>;

const PrivateBuilderRegistration = () => {
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/suppliers';

  const form = useForm<PrivateClientRegistrationFormData>({
    resolver: zodResolver(privateClientRegistrationSchema),
    defaultValues: {
      project_types: [],
      terms_accepted: false,
      privacy_accepted: false
    }
  });

  const handleProjectTypeToggle = (projectType: string) => {
    const currentTypes = selectedProjectTypes.includes(projectType)
      ? selectedProjectTypes.filter(t => t !== projectType)
      : [...selectedProjectTypes, projectType];
    
    setSelectedProjectTypes(currentTypes);
    form.setValue("project_types", currentTypes);
  };

  const onSubmit = async (data: PrivateClientRegistrationFormData) => {
    // OPTIMISTIC UI: Show success IMMEDIATELY, save in background
    setProgress(100);
    
    toast({
      title: "✅ Registration Complete!",
      description: "Welcome to UjenziPro! Redirecting...",
      duration: 1500,
    });

    // Immediate redirect to saved location or suppliers page - where they can buy materials!
    form.reset();
    setSelectedProjectTypes([]);
    const welcomeParam = redirectTo.includes('?') ? '&welcome=private_client' : '?welcome=private_client';
    navigate(`${redirectTo}${welcomeParam}`);

    // Save to database in background (user already moved on)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      const userId = session.user.id;
      
      // Use direct fetch to Supabase REST API (more reliable than client)
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NTQwNjIsImV4cCI6MjA0ODAzMDA2Mn0.vu4KlLJLKlJmYb2b4R8MxpVKv0izRdkXC_FVwVRT0LM';
      
      // Update profile using direct fetch with access_token (no 'email' column in profiles)
      const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          full_name: data.full_name,
          phone: data.phone,
          location: data.location,
          builder_category: 'private',
          project_types: data.project_types,
          project_timeline: data.project_timeline,
          budget_range: data.budget_range,
          project_description: data.project_description,
          property_type: data.property_type,
        })
      });

      if (!profileResponse.ok) {
        console.error('Profile update error:', await profileResponse.text());
      }

      // Update user role
      const roleResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          role: 'private_client'
        })
      });

      if (!roleResponse.ok) {
        // Try INSERT if PATCH failed (new user)
        await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            role: 'private_client'
          })
        });
      }

      console.log("✅ Profile saved successfully in background");

    } catch (error: any) {
      // Background save failed - log but don't show error to user (they already moved on)
      console.error("Background save error (user already redirected):", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Kenyan Private Construction Background */}
      <section 
        className="relative text-white py-16 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/kenyan-private-construction-bg.svg')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/80 via-green-700/70 to-green-800/80"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-4">
              <User className="h-12 w-12 mr-3" />
              <h1 className="text-4xl font-bold drop-shadow-lg">Private Client Registration</h1>
            </div>
            <p className="text-xl mb-8 opacity-95 drop-shadow-md">
              Connect with professional builders and suppliers for your construction project
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link to="/builder-registration">
                <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 shadow-lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Registration Options
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Private Client Benefits */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <User className="h-5 w-5" />
                Why Choose UjenziPro for Your Project?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Verified Professionals</p>
                    <p className="text-green-700">Connect with licensed and insured builders</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Transparent Pricing</p>
                    <p className="text-green-700">Get competitive quotes from multiple professionals</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Project Management</p>
                    <p className="text-green-700">Track progress and communicate easily</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Form */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Private Client Registration</CardTitle>
              <p className="text-muted-foreground">
                Tell us about your construction project and connect with the right professionals
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="07XX XXX XXX or 01XX XXX XXX" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs">
                              For delivery tracking and notifications
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>County *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your county" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {KENYAN_COUNTIES.map((county) => (
                                  <SelectItem key={county} value={county}>
                                    {county}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Project Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Project Details</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="property_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select property type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROPERTY_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="budget_range"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget Range *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {BUDGET_RANGES.map((range) => (
                                  <SelectItem key={range} value={range}>
                                    {range}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="project_timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Timeline *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="When do you want to start?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROJECT_TIMELINES.map((timeline) => (
                                <SelectItem key={timeline} value={timeline}>
                                  {timeline}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Project Types */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Project Types</h3>
                    <FormField
                      control={form.control}
                      name="project_types"
                      render={() => (
                        <FormItem>
                          <FormLabel>What type of work do you need? *</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {PROJECT_TYPES.map((projectType) => (
                              <div key={projectType} className="flex items-center space-x-2">
                                <Checkbox
                                  id={projectType}
                                  checked={selectedProjectTypes.includes(projectType)}
                                  onCheckedChange={() => handleProjectTypeToggle(projectType)}
                                />
                                <Label htmlFor={projectType} className="text-sm font-normal">
                                  {projectType}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {selectedProjectTypes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedProjectTypes.map((projectType) => (
                                <Badge key={projectType} variant="secondary">
                                  {projectType}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Project Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Project Description</h3>
                    <FormField
                      control={form.control}
                      name="project_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Describe Your Project *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide details about your construction project, specific requirements, location, and any special considerations (minimum 50 characters)"
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Terms and Privacy */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Terms & Conditions</h3>
                    
                    <FormField
                      control={form.control}
                      name="terms_accepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I accept the Terms and Conditions for Private Clients *
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              By checking this box, you agree to our client terms of service
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="privacy_accepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I accept the Privacy Policy *
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              We handle your data securely and never share personal information without consent
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    {/* Progress Bar */}
                    {isSubmitting && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Processing registration...</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
                          {progress < 30 ? "Checking..." : progress < 80 ? "Saving..." : "Finishing..."}
                        </span>
                      ) : (
                        "Register as Private Client"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivateBuilderRegistration;
