import React, { useState } from 'react';
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
  Drone, 
  Shield, 
  Clock, 
  MapPin, 
  Users, 
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

const monitoringServices: MonitoringService[] = [
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
    basePrice: 15000,
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
    basePrice: 25000,
    unit: 'per flight hour',
    category: 'drones',
    icon: <Drone className="h-6 w-6" />
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
    basePrice: 50000,
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
    basePrice: 20000,
    unit: 'per project/month',
    category: 'analytics',
    icon: <BarChart3 className="h-6 w-6" />
  }
];

export const MonitoringServiceRequest: React.FC = () => {
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState<ServiceRequest>({
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
    
    formData.selectedServices.forEach(serviceId => {
      const service = monitoringServices.find(s => s.id === serviceId);
      if (!service) return;
      
      switch (serviceId) {
        case 'ai-cameras':
          total += service.basePrice * formData.cameraCount;
          break;
        case 'drone-surveillance':
          total += service.basePrice * formData.droneHours;
          break;
        case 'security-monitoring':
        case 'analytics-reporting':
          total += service.basePrice;
          break;
      }
    });
    
    setEstimatedCost(total);
  };

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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to submit a service request',
          variant: 'destructive'
        });
        return;
      }

      // Prepare submission data
      const submissionData = {
        user_id: user.id,
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
        status: 'pending'
      };

      // Submit to database
      const { data, error } = await supabase
        .from('monitoring_service_requests')
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Service request submitted successfully:', data);
      
      toast({
        title: 'Request Submitted Successfully!',
        description: 'We will contact you within 24 hours with a detailed quotation.',
      });
      
      // Reset form
      setFormData({
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

  const ServiceCard = ({ service }: { service: MonitoringService }) => (
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
          <div className="text-lg font-semibold text-primary">
            KES {service.basePrice.toLocaleString()} {service.unit}
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Service Information
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Select Services
          </TabsTrigger>
          <TabsTrigger value="request" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Request Quote
          </TabsTrigger>
        </TabsList>

        {/* Service Information Tab */}
        <TabsContent value="info" className="space-y-6">
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
                    <Drone className="h-8 w-8 mx-auto mb-2 text-green-500" />
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

          <div className="text-center">
            <Button onClick={() => setActiveTab('services')} size="lg">
              Explore Our Services
              <Zap className="h-4 w-4 ml-2" />
            </Button>
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

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('info')}>
              Back to Information
            </Button>
            <Button 
              onClick={() => setActiveTab('request')}
              disabled={formData.selectedServices.length === 0}
            >
              Request Detailed Quote
              <FileText className="h-4 w-4 ml-2" />
            </Button>
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

          {/* Submit Button */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('services')}>
              Back to Services
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || formData.selectedServices.length === 0}
              size="lg"
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringServiceRequest;
