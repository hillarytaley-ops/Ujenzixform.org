import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, User, Building, Truck, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/userProfile";
import { ImageUpload } from "@/components/ImageUpload";

interface BuilderProfileSetupProps {
  userId?: string;
}

export const BuilderProfileSetup = ({ userId }: BuilderProfileSetupProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Get current user ID
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const handleRoleSelection = (role: string) => {
    setSelectedRole(role);
    if (role === 'delivery_provider') {
      setSelectedType('individual'); // Default for delivery providers
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  };

  const handleComplete = async () => {
    if (!selectedRole || (!selectedType && selectedRole !== 'delivery_provider')) {
      toast({
        title: "Incomplete Selection",
        description: "Please select both role and type to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine which image field to update
      const imageField = selectedType === 'company' ? 'company_logo_url' : 'avatar_url';

      // Update profiles table (without role)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          user_type: selectedType,
          is_professional: selectedType === 'company' || selectedRole === 'delivery_provider',
          [imageField]: imageUrl,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Insert role into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: user.id,
          role: selectedRole as UserRole
        }]);

      if (roleError) throw roleError;

      toast({
        title: "Profile Updated!",
        description: "Your profile has been successfully configured.",
      });

      // Refresh the page to load the new profile
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    {
      value: 'builder',
      label: 'Builder/Constructor',
      icon: Building,
      description: 'Manage construction projects and materials'
    },
    {
      value: 'delivery_provider',
      label: 'Delivery Provider',
      icon: Truck,
      description: 'Provide delivery services for construction materials'
    }
  ];

  const typeOptions = [
    {
      value: 'individual',
      label: 'Individual/Private',
      icon: User,
      description: 'Personal or small-scale construction work'
    },
    {
      value: 'company',
      label: 'Company/Professional',
      icon: Building,
      description: 'Professional construction business or company'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Settings className="h-6 w-6 text-primary" />
            Complete Your Profile
          </CardTitle>
          <CardDescription>
            Set up your account to access the builder dashboard and tools
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
              <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 2 ? <CheckCircle className="h-4 w-4" /> : '2'}
              </div>
              <div className={`w-8 h-0.5 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 3 ? <CheckCircle className="h-4 w-4" /> : '3'}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Role Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Select Your Role</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  return (
                    <Card
                      key={role.value}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedRole === role.value ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleRoleSelection(role.value)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className="h-5 w-5 text-primary" />
                          {role.label}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {role.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Type Selection (for builders only) */}
          {currentStep === 2 && selectedRole === 'builder' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Select Your Builder Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {typeOptions.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedType === type.value ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedType(type.value);
                        setCurrentStep(3);
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className="h-5 w-5 text-primary" />
                          {type.label}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {type.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 3: Complete Your Profile</h3>
              
              {/* Image Upload */}
              <div className="flex justify-center py-4">
                <ImageUpload
                  currentImageUrl={imageUrl}
                  onImageUpload={setImageUrl}
                  bucket={selectedType === 'company' ? 'company-logos' : 'profile-images'}
                  folder={currentUserId}
                  label={selectedType === 'company' ? 'Upload Logo' : 'Upload Photo'}
                  fallbackText={selectedType === 'company' ? 'CO' : 'U'}
                  shape={selectedType === 'company' ? 'square' : 'circle'}
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Role:</span>
                  <Badge variant="outline">
                    {roleOptions.find(r => r.value === selectedRole)?.label}
                  </Badge>
                </div>
                {selectedRole === 'builder' && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Type:</span>
                    <Badge variant="outline">
                      {typeOptions.find(t => t.value === selectedType)?.label}
                    </Badge>
                  </div>
                )}
              </div>

              <Alert>
                <AlertDescription>
                  {selectedRole === 'builder' && selectedType === 'company' && 
                    "As a professional/company builder, you'll have access to purchase orders, invoicing, and advanced management tools."
                  }
                  {selectedRole === 'builder' && selectedType === 'individual' && 
                    "As an individual builder, you'll have access to direct purchasing and simplified payment tools."
                  }
                  {selectedRole === 'delivery_provider' && 
                    "As a delivery provider, you'll be able to view and respond to delivery requests from builders."
                  }
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(selectedRole === 'delivery_provider' ? 1 : 2);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};