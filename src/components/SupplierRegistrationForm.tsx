import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Store, Phone, Mail, Globe } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { HoneypotField } from "@/components/security/HoneypotField";
import { useRateLimiting } from "@/hooks/useRateLimiting";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const supplierFormSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact person name required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  location: z.string().min(2, "City/Town required"),
  county: z.string().min(1, "County required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().min(20, "Description must be at least 20 characters"),
  yearsInBusiness: z.string().min(1, "Years in business required"),
  businessRegistration: z.string().min(3, "Business registration number required"),
  categories: z.array(z.string()).optional(),
  companyLogoUrl: z.string().optional()
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

const SupplierRegistrationForm = () => {
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      categories: []
    }
  });
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [botDetected, setBotDetected] = useState(false);
  const { checkRateLimit } = useRateLimiting();
  const { toast } = useToast();

  // Get current user ID
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const kenyanCounties = [
    "Nairobi", "Mombasa", "Nakuru", "Kisumu", "Eldoret", "Kericho", "Naivasha", 
    "Nyahururu", "Thika", "Machakos", "Nyeri", "Meru", "Garissa", "Kakamega", 
    "Kitale", "Embu", "Kisii", "Malindi", "Narok", "Voi"
  ];

  const materialCategories = [
    "Cement", "Steel", "Tiles", "Paint", "Timber", "Hardware", 
    "Plumbing", "Electrical", "Aggregates", "Roofing", "Insulation", 
    "Tools", "Stone", "Sand", "Plywood", "Doors", "Wire", "Iron Sheets"
  ];

  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked 
        ? [...prev, category]
        : prev.filter(c => c !== category)
    );
  };

  const onSubmit = async (data: SupplierFormData) => {
    if (botDetected) {
      toast({
        title: "Error",
        description: "Suspicious activity detected",
        variant: "destructive"
      });
      return;
    }

    // Rate limiting check
    const canProceed = await checkRateLimit({
      identifier: `supplier_registration_${userId}`,
      maxRequests: 3,
      windowMs: 3600000 // 1 hour
    });

    if (!canProceed) {
      return;
    }

    const formData = { 
      ...data, 
      categories: selectedCategories,
      companyLogoUrl 
    };
    
    console.log('Supplier registration data:', formData);
    
    toast({
      title: "Registration Submitted",
      description: "Your supplier application has been received.",
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <HoneypotField onBotDetected={() => setBotDetected(true)} />
      
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Store className="h-6 w-6 text-red-600" />
          Register as a Supplier
        </CardTitle>
        <CardDescription>
          Join our network of verified material suppliers across Kenya
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Logo Upload */}
            <div className="flex justify-center py-4">
              <ImageUpload
                currentImageUrl={companyLogoUrl}
                onImageUpload={setCompanyLogoUrl}
                bucket="company-logos"
                folder={userId}
                label="Upload Logo"
                fallbackText="CO"
                shape="square"
              />
            </div>

            {/* Business Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Business Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+254 7XX XXX XXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      County *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select County" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kenyanCounties.map((county) => (
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
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City/Town *</FormLabel>
                    <FormControl>
                      <Input placeholder="City or Town" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physical Address *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your physical business address"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourwebsite.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearsInBusiness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years in Business *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="less-than-1">Less than 1 year</SelectItem>
                        <SelectItem value="1-5">1-5 years</SelectItem>
                        <SelectItem value="6-10">6-10 years</SelectItem>
                        <SelectItem value="11-20">11-20 years</SelectItem>
                        <SelectItem value="more-than-20">More than 20 years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="businessRegistration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Registration Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your business registration number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Material Categories */}
            <div>
              <Label className="text-base font-medium mb-4 block">
                Material Categories * (Select all that apply)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {materialCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => 
                        handleCategoryChange(category, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={category}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your business, products, and services"
                      className="resize-none h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                type="submit" 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                Register as Supplier
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SupplierRegistrationForm;
