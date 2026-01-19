import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Camera, 
  Plane,
  Shield, 
  Clock, 
  MapPin, 
  Users, 
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  Radio,
  Battery,
  Wifi,
  Activity,
  BarChart3,
  FileText,
  Calculator,
  Send,
  Info,
  Star,
  Zap,
  Building2,
  Truck,
  Phone,
  Mail,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MonitoringService {
  id: string;
  name: string;
  description: string;
  features: string[];
  basePrice: number;
  unit: string;
  category: 'cameras' | 'drones' | 'security' | 'analytics';
  icon: React.ReactNode;
  popular?: boolean;
}

interface ServiceRequest {
  // Builder Type
  builderType: 'private' | 'professional' | '';
  
  // Project Information
  projectName: string;
  projectLocation: string;
  projectSize: string;
  projectType: string;
  projectDuration: string;
  startDate: string;
  
  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  
  // Service Requirements
  selectedServices: string[];
  cameraCount: number;
  droneHours: number;
  securityLevel: string;
  specialRequirements: string;
  
  // Budget & Timeline
  budgetRange: string;
  urgency: string;
  
  // Additional Information
  additionalNotes: string;
}

// Pricing discount for Private Builders (50% lower due to smaller project sizes)
const PRIVATE_CLIENT_DISCOUNT = 0.5; // 50% discount

// Base prices for professional builders (companies)
const PROFESSIONAL_BASE_PRICES = {
  'ai-cameras': 15000,
  'drone-surveillance': 25000,
  'security-monitoring': 50000,
  'analytics-reporting': 20000
};

// Private Builder prices (50% lower due to smaller project sizes - homeowner friendly pricing)
const PRIVATE_BASE_PRICES = {
  'ai-cameras': 7500,       // 15000 * 0.5 = 7,500
  'drone-surveillance': 12500, // 25000 * 0.5 = 12,500
  'security-monitoring': 25000, // 50000 * 0.5 = 25,000
  'analytics-reporting': 10000  // 20000 * 0.5 = 10,000
};

const getMonitoringServices = (builderType: 'private' | 'professional' | ''): MonitoringService[] => {
  const prices = builderType === 'private' ? PRIVATE_BASE_PRICES : PROFESSIONAL_BASE_PRICES;
  
  return [
    {
      id: 'ai-cameras',
      name: 'AI-Powered Camera Monitoring',
      description: 'Advanced surveillance with AI activity detection and real-time alerts',
      features: [
        '24/7 Live monitoring with HD quality',
        'AI-powered activity and safety detection',
        'Real-time alerts and notifications',
        'Cloud storage and playback',
        'Mobile app access',
        'Weather-resistant cameras'
      ],
      basePrice: prices['ai-cameras'],
      unit: 'per camera/month',
      category: 'cameras',
      icon: <Camera className="h-6 w-6" />,
      popular: true
    },
    {
      id: 'drone-surveillance',
      name: 'Drone Aerial Surveillance',
      description: 'Comprehensive aerial monitoring and progress tracking',
      features: [
        'High-resolution aerial photography',
        'Real-time flight monitoring',
        'Progress tracking and documentation',
        'Site mapping and surveying',
        'Emergency response capability',
        'Professional drone operators'
      ],
      basePrice: prices['drone-surveillance'],
      unit: 'per flight hour',
      category: 'drones',
      icon: <Plane className="h-6 w-6" />
    },
    {
      id: 'security-monitoring',
      name: '24/7 Security Monitoring',
      description: 'Round-the-clock security with professional monitoring team',
      features: [
        'Professional security team monitoring',
        'Immediate incident response',
        'Access control management',
        'Visitor and vehicle tracking',
        'Emergency alert system',
        'Security reports and analytics'
      ],
      basePrice: prices['security-monitoring'],
      unit: 'per site/month',
      category: 'security',
      icon: <Shield className="h-6 w-6" />
    },
    {
      id: 'analytics-reporting',
      name: 'Analytics & Reporting',
      description: 'Comprehensive data analysis and progress reporting',
      features: [
        'Daily progress reports',
        'Performance analytics dashboard',
        'Resource utilization tracking',
        'Safety compliance monitoring',
        'Custom report generation',
        'Data export capabilities'
      ],
      basePrice: prices['analytics-reporting'],
      unit: 'per project/month',
      category: 'analytics',
      icon: <BarChart3 className="h-6 w-6" />
    }
  ];
};

export const MonitoringServiceRequest: React.FC = () => {
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState<ServiceRequest>({
    builderType: '',
    projectName: '',
    projectLocation: '',
    projectSize: '',
    projectType: '',
    projectDuration: '',
    startDate: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyName: '',
    selectedServices: [],
    cameraCount: 0,
    droneHours: 0,
    securityLevel: '',
    specialRequirements: '',
    budgetRange: '',
    urgency: '',
    additionalNotes: ''
  });
  
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Get monitoring services based on builder type
  const monitoringServices = getMonitoringServices(formData.builderType);
  
  // Auto-detect builder type from user profile
  useEffect(() => {
    const detectBuilderType = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check user_roles table
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (roleData?.role === 'private_client') {
            setFormData(prev => ({ ...prev, builderType: 'private' }));
          } else if (roleData?.role === 'professional_builder' || roleData?.role === 'builder') {
            // Also check if is_professional in profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('is_professional, user_type')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (profileData?.is_professional || profileData?.user_type === 'company') {
              setFormData(prev => ({ ...prev, builderType: 'professional' }));
            } else if (roleData?.role === 'private_client') {
              setFormData(prev => ({ ...prev, builderType: 'private' }));
            }
          }
          
          // Pre-fill contact info
          if (user.email) {
            setFormData(prev => ({ ...prev, contactEmail: user.email || '' }));
          }
        }
      } catch (error) {
        console.error('Error detecting builder type:', error);
      }
    };
    
    detectBuilderType();
  }, []);

  const updateFormData = (field: keyof ServiceRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    calculateEstimate();
  };

  const toggleService = (serviceId: string) => {
    const updatedServices = formData.selectedServices.includes(serviceId)
      ? formData.selectedServices.filter(id => id !== serviceId)
      : [...formData.selectedServices, serviceId];
    
    updateFormData('selectedServices', updatedServices);
  };

  const calculateEstimate = () => {
    let total = 0;
    const prices = formData.builderType === 'private' ? PRIVATE_BASE_PRICES : PROFESSIONAL_BASE_PRICES;
    
    formData.selectedServices.forEach(serviceId => {
      const basePrice = prices[serviceId as keyof typeof prices];
      if (!basePrice) return;
      
      switch (serviceId) {
        case 'ai-cameras':
          total += basePrice * Math.max(formData.cameraCount, 1);
          break;
        case 'drone-surveillance':
          total += basePrice * Math.max(formData.droneHours, 1);
          break;
        case 'security-monitoring':
        case 'analytics-reporting':
          total += basePrice;
          break;
      }
    });
    
    setEstimatedCost(total);
  };
  
  // Recalculate when builder type or services change
  useEffect(() => {
    calculateEstimate();
  }, [formData.builderType, formData.selectedServices, formData.cameraCount, formData.droneHours]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      const requiredFields = [
        'projectName', 'projectLocation', 'contactName', 
        'contactEmail', 'contactPhone'
      ];
      
      const missingFields = requiredFields.filter(field => !formData[field as keyof ServiceRequest]);
      
      if (missingFields.length > 0) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }
      
      if (formData.selectedServices.length === 0) {
        toast({
          title: 'No Services Selected',
          description: 'Please select at least one monitoring service',
          variant: 'destructive'
        });
        return;
      }

      // Get current user and session
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!user || !session?.access_token) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to submit a service request',
          variant: 'destructive'
        });
        return;
      }

      // Generate access code (MON-timestamp-random)
      const accessCode = `MON-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Prepare submission data
      const submissionData = {
        user_id: user.id,
        builder_type: formData.builderType || 'professional', // Default to professional if not set
        project_name: formData.projectName,
        project_location: formData.projectLocation,
        project_size: formData.projectSize,
        project_type: formData.projectType,
        project_duration: formData.projectDuration,
        start_date: formData.startDate || null,
        contact_name: formData.contactName,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        company_name: formData.companyName || null,
        selected_services: formData.selectedServices,
        camera_count: formData.cameraCount,
        drone_hours: formData.droneHours,
        security_level: formData.securityLevel || null,
        special_requirements: formData.specialRequirements || null,
        budget_range: formData.budgetRange || null,
        urgency: formData.urgency || null,
        estimated_cost: estimatedCost,
        additional_notes: formData.additionalNotes || null,
        access_code: accessCode,
        status: 'pending'
      };

      // Submit to database using direct fetch to avoid Supabase client hanging
      const response = await fetch(`${(supabase as any).supabaseUrl}/rest/v1/monitoring_service_requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': (supabase as any).supabaseKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit monitoring request');
      }

      const data = await response.json();

      console.log('Service request submitted successfully:', data);
      
      toast({
        title: 'Request Submitted Successfully!',
        description: 'We will contact you within 24 hours with a detailed quotation.',
      });
      
      // Reset form (but keep builder type)
      const currentBuilderType = formData.builderType;
      setFormData({
        builderType: currentBuilderType,
        projectName: '',
        projectLocation: '',
        projectSize: '',
        projectType: '',
        projectDuration: '',
        startDate: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        companyName: '',
        selectedServices: [],
        cameraCount: 0,
        droneHours: 0,
        securityLevel: '',
        specialRequirements: '',
        budgetRange: '',
        urgency: '',
        additionalNotes: ''
      });
      setEstimatedCost(0);
      setActiveTab('info');
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try again or contact support',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ServiceCard = ({ service }: { service: MonitoringService }) => {
    const professionalPrice = PROFESSIONAL_BASE_PRICES[service.id as keyof typeof PROFESSIONAL_BASE_PRICES];
    const isPrivate = formData.builderType === 'private';
    const savings = professionalPrice - service.basePrice;
    
    return (
      <Card className={`cursor-pointer transition-all ${
        formData.selectedServices.includes(service.id) 
          ? 'ring-2 ring-primary bg-primary/5' 
          : 'hover:shadow-md'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {service.icon}
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {service.name}
                  {service.popular && (
                    <Badge className="bg-orange-100 text-orange-800">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </div>
            </div>
            <Checkbox
              checked={formData.selectedServices.includes(service.id)}
              onCheckedChange={() => toggleService(service.id)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className={`text-lg font-semibold ${isPrivate ? 'text-green-600' : 'text-primary'}`}>
                KES {service.basePrice.toLocaleString()} {service.unit}
              </div>
              {isPrivate && savings > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-muted-foreground">
                    KES {professionalPrice.toLocaleString()}
                  </span>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Save KES {savings.toLocaleString()}
                  </Badge>
                </div>
              )}
            </div>
            
            <ul className="space-y-1">
              {service.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Eye className="h-8 w-8 text-primary" />
          Project Monitoring Services
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Professional monitoring solutions to keep your construction projects secure, 
          on-track, and compliant with safety standards.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Sticky Tab Navigation */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mx-4 px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Service</span> Info
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Select</span> Services
            </TabsTrigger>
            <TabsTrigger value="request" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Request</span> Quote
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Service Information Tab */}
        <TabsContent value="info" className="space-y-6">
          {/* Builder Type Selection */}
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Select Your Builder Type
              </CardTitle>
              <CardDescription>
                Choose your category to see tailored pricing for your project size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Private Builder Option */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.builderType === 'private' 
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                  onClick={() => updateFormData('builderType', 'private')}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${formData.builderType === 'private' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <User className={`h-6 w-6 ${formData.builderType === 'private' ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        Private Builder
                        <Badge className="bg-green-100 text-green-800 text-xs">40% Lower Prices</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Individual homeowners building or renovating their personal property
                      </p>
                      <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                        <li>• Residential projects</li>
                        <li>• Home renovations</li>
                        <li>• Smaller project sites</li>
                        <li>• Budget-friendly options</li>
                      </ul>
                    </div>
                    {formData.builderType === 'private' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
                
                {/* Professional Builder Option */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.builderType === 'professional' 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                  onClick={() => updateFormData('builderType', 'professional')}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${formData.builderType === 'professional' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Building2 className={`h-6 w-6 ${formData.builderType === 'professional' ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        Professional Builder / Company
                        <Badge className="bg-blue-100 text-blue-800 text-xs">Full Features</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Contractors, construction companies, and commercial developers
                      </p>
                      <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                        <li>• Commercial projects</li>
                        <li>• Multi-site monitoring</li>
                        <li>• Larger scale operations</li>
                        <li>• Advanced analytics</li>
                      </ul>
                    </div>
                    {formData.builderType === 'professional' && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
              
              {formData.builderType && (
                <Alert className={`mt-4 ${formData.builderType === 'private' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <DollarSign className={`h-4 w-4 ${formData.builderType === 'private' ? 'text-green-600' : 'text-blue-600'}`} />
                  <AlertTitle className={formData.builderType === 'private' ? 'text-green-800' : 'text-blue-800'}>
                    {formData.builderType === 'private' ? 'Private Builder Pricing Active' : 'Professional Pricing Active'}
                  </AlertTitle>
                  <AlertDescription className={formData.builderType === 'private' ? 'text-green-700' : 'text-blue-700'}>
                    {formData.builderType === 'private' 
                      ? 'You\'ll see discounted pricing tailored for smaller residential projects. Save up to 40% on monitoring services!'
                      : 'You\'ll see full-featured pricing designed for commercial and multi-site operations with comprehensive support.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Why Choose Our Monitoring Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Why Choose Our Monitoring?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Enhanced Security</h4>
                      <p className="text-sm text-muted-foreground">
                        24/7 surveillance prevents theft, vandalism, and unauthorized access
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Safety Compliance</h4>
                      <p className="text-sm text-muted-foreground">
                        AI-powered safety monitoring ensures compliance with regulations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Progress Tracking</h4>
                      <p className="text-sm text-muted-foreground">
                        Real-time monitoring helps keep projects on schedule
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Cost Savings</h4>
                      <p className="text-sm text-muted-foreground">
                        Prevent losses and optimize resource utilization
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technology Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Advanced Technology
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <Camera className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <h4 className="font-medium text-sm">AI Cameras</h4>
                    <p className="text-xs text-muted-foreground">Smart detection</p>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <Plane className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <h4 className="font-medium text-sm">Drone Fleet</h4>
                    <p className="text-xs text-muted-foreground">Aerial monitoring</p>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <Wifi className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <h4 className="font-medium text-sm">IoT Sensors</h4>
                    <p className="text-xs text-muted-foreground">Environmental data</p>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <h4 className="font-medium text-sm">Analytics</h4>
                    <p className="text-xs text-muted-foreground">Data insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Service Benefits & ROI</CardTitle>
              <CardDescription>
                How our monitoring services add value to your construction projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold">Risk Reduction</h3>
                  <p className="text-sm text-muted-foreground">
                    Reduce theft, accidents, and project delays by up to 70%
                  </p>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Time Savings</h3>
                  <p className="text-sm text-muted-foreground">
                    Automated monitoring saves 20+ hours per week of manual oversight
                  </p>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Cost Efficiency</h3>
                  <p className="text-sm text-muted-foreground">
                    Typical ROI of 300-500% through loss prevention and efficiency
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Navigation for Info Tab */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 pb-4 -mx-4 px-4 mt-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex justify-center">
              <Button onClick={() => setActiveTab('services')} size="lg" className="shadow-lg">
                Explore Our Services
                <Zap className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Service Selection Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Monitoring Services</CardTitle>
              <CardDescription>
                Select the services that best fit your project needs. You can combine multiple services for comprehensive coverage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {monitoringServices.map(service => (
                  <div key={service.id} onClick={() => toggleService(service.id)}>
                    <ServiceCard service={service} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Service Configuration */}
          {formData.selectedServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Configure Your Services</CardTitle>
                <CardDescription>
                  Specify the requirements for your selected services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.selectedServices.includes('ai-cameras') && (
                    <div className="space-y-2">
                      <Label htmlFor="cameraCount">Number of Cameras Needed</Label>
                      <Input
                        id="cameraCount"
                        type="number"
                        min="1"
                        max="50"
                        value={formData.cameraCount}
                        onChange={(e) => updateFormData('cameraCount', parseInt(e.target.value) || 0)}
                        placeholder="e.g., 8"
                      />
                    </div>
                  )}
                  
                  {formData.selectedServices.includes('drone-surveillance') && (
                    <div className="space-y-2">
                      <Label htmlFor="droneHours">Drone Hours per Month</Label>
                      <Input
                        id="droneHours"
                        type="number"
                        min="1"
                        max="200"
                        value={formData.droneHours}
                        onChange={(e) => updateFormData('droneHours', parseInt(e.target.value) || 0)}
                        placeholder="e.g., 20"
                      />
                    </div>
                  )}
                  
                  {formData.selectedServices.includes('security-monitoring') && (
                    <div className="space-y-2">
                      <Label htmlFor="securityLevel">Security Level Required</Label>
                      <Select value={formData.securityLevel} onValueChange={(value) => updateFormData('securityLevel', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select security level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (Business hours)</SelectItem>
                          <SelectItem value="enhanced">Enhanced (Extended hours)</SelectItem>
                          <SelectItem value="premium">Premium (24/7 monitoring)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialRequirements">Special Requirements</Label>
                  <Textarea
                    id="specialRequirements"
                    value={formData.specialRequirements}
                    onChange={(e) => updateFormData('specialRequirements', e.target.value)}
                    placeholder="Any specific monitoring requirements, access restrictions, or special considerations..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estimated Cost */}
          {estimatedCost > 0 && (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>Estimated Monthly Cost</AlertTitle>
              <AlertDescription>
                <div className="text-2xl font-bold text-primary mt-2">
                  KES {estimatedCost.toLocaleString()}
                </div>
                <p className="text-sm mt-1">
                  This is a preliminary estimate. Final pricing will be provided in your detailed quotation.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Sticky Navigation for Services Tab */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 pb-4 -mx-4 px-4 mt-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <Button variant="outline" onClick={() => setActiveTab('info')}>
                Back to Information
              </Button>
              
              {/* Show estimated cost in the middle */}
              {estimatedCost > 0 && (
                <div className="hidden md:block text-center">
                  <div className="text-sm text-muted-foreground">Estimated Monthly Cost</div>
                  <div className="text-lg font-bold text-primary">KES {estimatedCost.toLocaleString()}</div>
                </div>
              )}
              
              <Button 
                onClick={() => setActiveTab('request')}
                disabled={formData.selectedServices.length === 0}
                className="shadow-lg"
              >
                Request Detailed Quote
                <FileText className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Request Form Tab */}
        <TabsContent value="request" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Detailed Quotation</CardTitle>
              <CardDescription>
                Provide your project details to receive a comprehensive quotation within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Project Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={formData.projectName}
                      onChange={(e) => updateFormData('projectName', e.target.value)}
                      placeholder="e.g., Westlands Commercial Complex"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectLocation">Project Location *</Label>
                    <Input
                      id="projectLocation"
                      value={formData.projectLocation}
                      onChange={(e) => updateFormData('projectLocation', e.target.value)}
                      placeholder="e.g., Westlands, Nairobi"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectType">Project Type</Label>
                    <Select value={formData.projectType} onValueChange={(value) => updateFormData('projectType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="mixed-use">Mixed Use</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectSize">Project Size</Label>
                    <Select value={formData.projectSize} onValueChange={(value) => updateFormData('projectSize', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (&lt; 1,000 sqm)</SelectItem>
                        <SelectItem value="medium">Medium (1,000 - 5,000 sqm)</SelectItem>
                        <SelectItem value="large">Large (5,000 - 20,000 sqm)</SelectItem>
                        <SelectItem value="mega">Mega (&gt; 20,000 sqm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectDuration">Project Duration</Label>
                    <Select value={formData.projectDuration} onValueChange={(value) => updateFormData('projectDuration', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3-months">3 months</SelectItem>
                        <SelectItem value="6-months">6 months</SelectItem>
                        <SelectItem value="12-months">12 months</SelectItem>
                        <SelectItem value="18-months">18 months</SelectItem>
                        <SelectItem value="24-months">24+ months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Expected Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateFormData('startDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contact Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => updateFormData('contactName', e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => updateFormData('companyName', e.target.value)}
                      placeholder="Your company name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email Address *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => updateFormData('contactEmail', e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone Number *</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => updateFormData('contactPhone', e.target.value)}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                </div>
              </div>

              {/* Budget and Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget & Timeline
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budgetRange">Monthly Budget Range</Label>
                    <Select value={formData.budgetRange} onValueChange={(value) => updateFormData('budgetRange', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50k-100k">KES 50,000 - 100,000</SelectItem>
                        <SelectItem value="100k-250k">KES 100,000 - 250,000</SelectItem>
                        <SelectItem value="250k-500k">KES 250,000 - 500,000</SelectItem>
                        <SelectItem value="500k-1m">KES 500,000 - 1,000,000</SelectItem>
                        <SelectItem value="1m+">KES 1,000,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={formData.urgency} onValueChange={(value) => updateFormData('urgency', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (30+ days)</SelectItem>
                        <SelectItem value="medium">Medium (14-30 days)</SelectItem>
                        <SelectItem value="high">High (7-14 days)</SelectItem>
                        <SelectItem value="urgent">Urgent (&lt; 7 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                  placeholder="Any additional information, specific requirements, or questions you'd like to include..."
                  rows={4}
                />
              </div>

              {/* Selected Services Summary */}
              {formData.selectedServices.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Selected Services</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      {formData.selectedServices.map(serviceId => {
                        const service = monitoringServices.find(s => s.id === serviceId);
                        return service ? (
                          <div key={serviceId} className="flex items-center gap-2">
                            {service.icon}
                            <span>{service.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                    {estimatedCost > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-lg font-semibold">
                          Estimated Cost: KES {estimatedCost.toLocaleString()}/month
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Submit Button - Sticky at bottom */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 pb-4 -mx-4 px-4 mt-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <Button variant="outline" onClick={() => setActiveTab('services')}>
                Back to Services
              </Button>
              
              {/* Estimated Cost Summary */}
              {estimatedCost > 0 && (
                <div className="hidden md:block text-center">
                  <div className="text-sm text-muted-foreground">Estimated Monthly Cost</div>
                  <div className="text-lg font-bold text-primary">KES {estimatedCost.toLocaleString()}</div>
                </div>
              )}
              
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || formData.selectedServices.length === 0}
                size="lg"
                className="bg-primary hover:bg-primary/90 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringServiceRequest;
