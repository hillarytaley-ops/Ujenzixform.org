import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  HardHat, 
  Package, 
  Truck, 
  ArrowRight,
  CheckCircle,
  Building2,
  User
} from "lucide-react";

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  color: string;
  bgColor: string;
  redirectTo: string;
}

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleOptions: RoleOption[] = [
    {
      id: 'builder',
      title: 'Builder / Contractor',
      description: 'I need construction materials and delivery services for my projects',
      icon: <HardHat className="h-10 w-10" />,
      benefits: [
        'Browse 850+ verified suppliers',
        'Request quotes & compare prices',
        'Track deliveries in real-time',
        'Access project management tools'
      ],
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      redirectTo: '/home'
    },
    {
      id: 'supplier',
      title: 'Material Supplier',
      description: 'I sell construction materials and want to reach more customers',
      icon: <Package className="h-10 w-10" />,
      benefits: [
        'List your products to thousands of builders',
        'Receive quote requests directly',
        'Manage orders & inventory',
        'Grow your business across Kenya'
      ],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      redirectTo: '/supplier-registration'
    },
    {
      id: 'delivery_provider',
      title: 'Delivery Provider',
      description: 'I have vehicles and want to deliver construction materials',
      icon: <Truck className="h-10 w-10" />,
      benefits: [
        'Get delivery jobs from builders & suppliers',
        'Set your own rates & availability',
        'Earn steady income',
        'Flexible working hours'
      ],
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
      redirectTo: '/delivery/apply'
    }
  ];

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      toast({
        title: "Please select a role",
        description: "Choose how you want to use MradiPro",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to continue",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      console.log('🎯 RoleSelection: Selected role:', selectedRole);
      console.log('🎯 RoleSelection: User ID:', user.id);

      // First check if user already has a role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🎯 RoleSelection: Existing role check:', existingRole, checkError);

      if (existingRole) {
        // User already has a role - update it instead
        console.log('🎯 RoleSelection: Updating existing role from', existingRole.role, 'to', selectedRole);
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: selectedRole })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('🎯 RoleSelection: Update error:', updateError);
          throw updateError;
        }

        console.log('🎯 RoleSelection: Role updated successfully');
        toast({
          title: "Role Updated! 🎉",
          description: `You're now registered as a ${selectedRole === 'builder' ? 'Builder' : selectedRole === 'supplier' ? 'Supplier' : 'Delivery Provider'}`,
        });
      } else {
        // Insert the role into user_roles table
        console.log('🎯 RoleSelection: Inserting new role:', selectedRole);
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: selectedRole
          });

        if (error) {
          console.error('🎯 RoleSelection: Insert error:', error);
          throw error;
        }

        console.log('🎯 RoleSelection: Role inserted successfully');
        toast({
          title: "Welcome to MradiPro! 🎉",
          description: `You're now registered as a ${selectedRole === 'builder' ? 'Builder' : selectedRole === 'supplier' ? 'Supplier' : 'Delivery Provider'}`,
        });
      }

      // Store in localStorage for quick access
      localStorage.setItem('user_role', selectedRole);
      localStorage.setItem('user_role_id', user.id);

      // Find the selected role option and redirect
      const selectedOption = roleOptions.find(r => r.id === selectedRole);
      
      // Small delay to show the success message
      setTimeout(() => {
        navigate(selectedOption?.redirectTo || '/home');
      }, 500);

    } catch (error: any) {
      console.error('Error setting role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set your role. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to MradiPro! 👋
          </h1>
          <p className="text-lg text-gray-600">
            How would you like to use the platform?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {roleOptions.map((role) => (
            <Card 
              key={role.id}
              className={`cursor-pointer transition-all duration-200 border-2 ${
                selectedRole === role.id 
                  ? `${role.bgColor} border-current ring-2 ring-offset-2 ${role.color.replace('text-', 'ring-')}`
                  : 'bg-white hover:shadow-lg border-gray-200'
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <CardHeader className="text-center pb-2">
                <div className={`mx-auto mb-3 p-3 rounded-full ${selectedRole === role.id ? role.bgColor : 'bg-gray-100'}`}>
                  <div className={selectedRole === role.id ? role.color : 'text-gray-500'}>
                    {role.icon}
                  </div>
                </div>
                <CardTitle className={`text-lg ${selectedRole === role.id ? role.color : ''}`}>
                  {role.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {role.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {role.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${selectedRole === role.id ? role.color : 'text-gray-400'}`} />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                {selectedRole === role.id && (
                  <div className={`mt-4 p-2 rounded-lg ${role.bgColor} text-center`}>
                    <span className={`text-sm font-medium ${role.color}`}>
                      ✓ Selected
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            onClick={handleRoleSelect}
            disabled={!selectedRole || isSubmitting}
            className="px-8 py-6 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Setting up your account...
              </>
            ) : (
              <>
                Continue as {selectedRole === 'builder' ? 'Builder' : selectedRole === 'supplier' ? 'Supplier' : selectedRole === 'delivery_provider' ? 'Delivery Provider' : '...'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          
          <p className="mt-4 text-sm text-gray-500">
            You can change your role later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;

