import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Camera, 
  Monitor, 
  MapPin, 
  Calendar, 
  Clock,
  Shield,
  Eye,
  QrCode,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Lock,
  Key,
  Copy,
  RefreshCw,
  Video,
  Wifi,
  Play,
  Building2,
  FileText,
  DollarSign,
  Send,
  Plus,
  ArrowRight
} from "lucide-react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import {
  fetchMyMonitoringServiceRequests,
  monitoringRestOpts,
} from '@/utils/myMonitoringServiceRequests';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

interface MonitoringProject {
  id: string;
  project_name: string;
  project_location: string;
  access_code: string;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected';
  camera_count: number;
  start_date: string;
  end_date?: string;
  created_at: string;
  estimated_cost: number;
  quote_amount?: number;
  selected_services: string[];
  live_stream_url?: string;
}

interface ServiceRequest {
  projectName: string;
  projectLocation: string;
  projectSize: string;
  projectType: string;
  startDate: string;
  endDate: string;
  cameraCount: number;
  droneHours: number;
  selectedServices: string[];
  specialRequirements: string;
  budgetRange: string;
  urgency: string;
}

const MONITORING_SERVICES = [
  { id: 'live-cameras', name: 'Live Camera Monitoring', price: 15000, unit: '/camera/month', icon: Camera },
  { id: 'ai-analysis', name: 'AI Progress Analysis', price: 25000, unit: '/project/month', icon: BarChart3 },
  { id: 'drone-survey', name: 'Drone Aerial Survey', price: 35000, unit: '/survey', icon: Video },
  { id: 'security-monitoring', name: '24/7 Security Monitoring', price: 40000, unit: '/month', icon: Shield },
  { id: 'progress-reports', name: 'Weekly Progress Reports', price: 10000, unit: '/month', icon: FileText },
];

// Generate unique access code
const generateAccessCode = () => {
  const prefix = 'MON';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const MonitoringAccessManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<MonitoringProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<MonitoringProject | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  
  // Form state
  const [formData, setFormData] = useState<ServiceRequest>({
    projectName: '',
    projectLocation: '',
    projectSize: '',
    projectType: '',
    startDate: '',
    endDate: '',
    cameraCount: 2,
    droneHours: 0,
    selectedServices: [],
    specialRequirements: '',
    budgetRange: '',
    urgency: 'normal'
  });
  
  const [estimatedCost, setEstimatedCost] = useState(0);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    calculateEstimate();
  }, [formData]);

  const loadProjects = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { rows: data } = await fetchMyMonitoringServiceRequests(
        supabase as any,
        monitoringRestOpts(SUPABASE_URL, SUPABASE_ANON_KEY, user?.id)
      );

      // Transform to MonitoringProject format
      const transformedProjects: MonitoringProject[] = (data || []).map((req: any) => ({
        id: req.id,
        project_name: req.project_name,
        project_location: req.project_location,
        access_code: req.access_code || generateAccessCode(),
        status: req.status,
        camera_count: req.camera_count || 0,
        start_date: req.start_date,
        end_date: req.end_date,
        created_at: req.created_at,
        estimated_cost: req.estimated_cost || 0,
        quote_amount: req.quote_amount,
        selected_services: req.selected_services || [],
        live_stream_url: req.live_stream_url
      }));
      
      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimate = () => {
    let total = 0;
    
    // Camera costs
    if (formData.selectedServices.includes('live-cameras')) {
      total += formData.cameraCount * 15000;
    }
    
    // Other services
    formData.selectedServices.forEach(serviceId => {
      const service = MONITORING_SERVICES.find(s => s.id === serviceId);
      if (service && serviceId !== 'live-cameras') {
        total += service.price;
      }
    });
    
    // Drone hours
    if (formData.droneHours > 0) {
      total += formData.droneHours * 35000;
    }
    
    setEstimatedCost(total);
  };

  const toggleService = (serviceId: string) => {
    const updated = formData.selectedServices.includes(serviceId)
      ? formData.selectedServices.filter(id => id !== serviceId)
      : [...formData.selectedServices, serviceId];
    setFormData(prev => ({ ...prev, selectedServices: updated }));
  };

  const handleSubmitRequest = async () => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "Please sign in to submit a monitoring request."
      });
      return;
    }

    if (!formData.projectName || !formData.projectLocation || formData.selectedServices.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in project name, location, and select at least one service."
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const accessCode = generateAccessCode();
      
      // Get session for direct fetch
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      // Use direct fetch to avoid Supabase client hanging issues
      const response = await fetch(`${(supabase as any).supabaseUrl}/rest/v1/monitoring_service_requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': (supabase as any).supabaseKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: user.id,
          project_name: formData.projectName,
          project_location: formData.projectLocation,
          project_size: formData.projectSize,
          project_type: formData.projectType,
          start_date: formData.startDate || null,
          contact_name: user.email?.split('@')[0] || 'Builder',
          contact_email: user.email,
          contact_phone: '',
          selected_services: formData.selectedServices,
          camera_count: formData.cameraCount,
          drone_hours: formData.droneHours,
          special_requirements: formData.specialRequirements,
          budget_range: formData.budgetRange,
          urgency: formData.urgency,
          estimated_cost: estimatedCost,
          access_code: accessCode,
          status: 'pending'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit monitoring request');
      }

      toast({
        title: "✅ Request Submitted!",
        description: `Your monitoring request has been submitted. Access code: ${accessCode}`,
      });

      // Reset form
      setFormData({
        projectName: '',
        projectLocation: '',
        projectSize: '',
        projectType: '',
        startDate: '',
        endDate: '',
        cameraCount: 2,
        droneHours: 0,
        selectedServices: [],
        specialRequirements: '',
        budgetRange: '',
        urgency: 'normal'
      });
      
      setShowRequestDialog(false);
      loadProjects();
      
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit monitoring request."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccessMonitoring = (project: MonitoringProject) => {
    if (project.status === 'active' || project.status === 'approved') {
      // Navigate to monitoring page with access code
      navigate(`/monitoring?access_code=${project.access_code}&project=${encodeURIComponent(project.project_name)}`);
    } else {
      toast({
        variant: "destructive",
        title: "Access Not Available",
        description: "Monitoring access is only available for approved and active projects."
      });
    }
  };

  const handleVerifyAccessCode = () => {
    const project = projects.find(p => p.access_code === accessCodeInput.toUpperCase());
    
    if (project) {
      if (project.status === 'active' || project.status === 'approved') {
        navigate(`/monitoring?access_code=${project.access_code}&project=${encodeURIComponent(project.project_name)}`);
      } else {
        toast({
          variant: "destructive",
          title: "Project Not Active",
          description: `This project is currently ${project.status}. Please wait for approval.`
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Access Code",
        description: "The access code you entered is not valid or doesn't belong to your account."
      });
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Access code copied to clipboard."
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border-blue-300',
      active: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      active: <Video className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      rejected: <AlertTriangle className="h-3 w-3 mr-1" />
    };
    
    return (
      <Badge className={`${styles[status] || styles.pending} flex items-center`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'approved');
  const [showPricing, setShowPricing] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6 text-red-500" />
            Project Monitoring
          </h2>
          <p className="text-muted-foreground">
            Request monitoring services and access live camera feeds for your projects
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                <Key className="h-4 w-4 mr-2" />
                Enter Access Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  Enter Monitoring Access Code
                </DialogTitle>
                <DialogDescription>
                  Enter the access code provided for your project to view live camera feeds
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Access Code</Label>
                  <Input
                    placeholder="e.g., MON-ABC123-XYZ"
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAccessDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyAccessCode} className="bg-red-600 hover:bg-red-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Access Cameras
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Request Monitoring
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-red-500" />
                  Request Monitoring Service
                </DialogTitle>
                <DialogDescription>
                  Fill in the details below to request monitoring services for your project
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Project Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Project Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name *</Label>
                      <Input
                        placeholder="e.g., Kilimani Apartments"
                        value={formData.projectName}
                        onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Location *</Label>
                      <Input
                        placeholder="e.g., Kilimani, Nairobi"
                        value={formData.projectLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, projectLocation: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Type</Label>
                      <Select 
                        value={formData.projectType} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, projectType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Services Selection */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Select Services *
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {MONITORING_SERVICES.map((service) => {
                      const Icon = service.icon;
                      const isSelected = formData.selectedServices.includes(service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 hover:border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-red-100' : 'bg-gray-100'}`}>
                                <Icon className={`h-5 w-5 ${isSelected ? 'text-red-600' : 'text-gray-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  KES {service.price.toLocaleString()} {service.unit}
                                </p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Camera Count */}
                {formData.selectedServices.includes('live-cameras') && (
                  <div className="space-y-2">
                    <Label>Number of Cameras</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={formData.cameraCount}
                        onChange={(e) => setFormData(prev => ({ ...prev, cameraCount: parseInt(e.target.value) || 1 }))}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        KES {(formData.cameraCount * 15000).toLocaleString()} /month
                      </span>
                    </div>
                  </div>
                )}

                {/* Special Requirements */}
                <div className="space-y-2">
                  <Label>Special Requirements</Label>
                  <Textarea
                    placeholder="Any specific requirements or notes..."
                    value={formData.specialRequirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Urgency */}
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select 
                    value={formData.urgency} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, urgency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (5-7 business days)</SelectItem>
                      <SelectItem value="urgent">Urgent (2-3 business days)</SelectItem>
                      <SelectItem value="emergency">Emergency (24-48 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cost Estimate */}
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-700">Estimated Monthly Cost</p>
                        <p className="text-2xl font-bold text-red-800">
                          KES {estimatedCost.toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-10 w-10 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitRequest} 
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Access for Active Projects */}
      {activeProjects.length > 0 && (
        <Alert className="bg-green-50 border-green-200">
          <Video className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Active Monitoring Available</AlertTitle>
          <AlertDescription className="text-green-700">
            You have {activeProjects.length} project(s) with active monitoring. Click below to access live cameras.
          </AlertDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeProjects.map(project => (
              <Button
                key={project.id}
                size="sm"
                onClick={() => handleAccessMonitoring(project)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-1" />
                {project.project_name}
              </Button>
            ))}
          </div>
        </Alert>
      )}

      {/* Service Pricing Overview */}
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-red-800">
              <DollarSign className="h-5 w-5" />
              Monitoring Service Pricing
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowPricing(!showPricing)}
              className="text-red-600 hover:text-red-700"
            >
              {showPricing ? 'Hide' : 'Show'} Pricing
            </Button>
          </div>
          <CardDescription className="text-red-700/70">
            Transparent pricing for all monitoring services
          </CardDescription>
        </CardHeader>
        {showPricing && (
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MONITORING_SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <div 
                    key={service.id}
                    className="p-4 rounded-lg bg-white border border-red-100 hover:border-red-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100">
                        <Icon className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{service.name}</h4>
                        <div className="mt-1">
                          <span className="text-lg font-bold text-red-600">
                            KES {service.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">{service.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-red-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <span className="font-medium">💡 Tip:</span> Bundle multiple services for comprehensive project coverage
              </p>
              <Button 
                onClick={() => setShowRequestDialog(true)}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Request Quote
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Projects List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">My Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="active">Active Monitoring ({activeProjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-red-500" />
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Monitoring Requests Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Request monitoring services to get live camera access for your construction projects
                </p>
                <Button onClick={() => setShowRequestDialog(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Monitoring
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{project.project_name}</h3>
                          {getStatusBadge(project.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {project.project_location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Camera className="h-4 w-4" />
                            {project.camera_count} cameras
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Access Code */}
                        <div className="mt-3 p-2 bg-gray-100 rounded-lg inline-flex items-center gap-2">
                          <Key className="h-4 w-4 text-gray-500" />
                          <span className="font-mono font-medium">{project.access_code}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyAccessCode(project.access_code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {(project.status === 'active' || project.status === 'approved') ? (
                          <Button 
                            onClick={() => handleAccessMonitoring(project)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            View Cameras
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : project.status === 'pending' ? (
                          <Button variant="outline" disabled>
                            <Clock className="h-4 w-4 mr-2" />
                            Awaiting Approval
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            {project.status === 'completed' ? 'Completed' : 'Unavailable'}
                          </Button>
                        )}
                        
                        {project.quote_amount && (
                          <p className="text-sm text-center text-muted-foreground">
                            Quote: KES {project.quote_amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Monitoring</h3>
                <p className="text-muted-foreground text-center">
                  Your approved projects will appear here with live camera access
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeProjects.map((project) => (
                <Card key={project.id} className="border-green-200 bg-green-50/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        {project.project_name}
                      </CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                    <CardDescription>{project.project_location}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cameras</span>
                        <span className="font-medium">{project.camera_count} active</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Access Code</span>
                        <span className="font-mono font-medium">{project.access_code}</span>
                      </div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleAccessMonitoring(project)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Access Live Feed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringAccessManager;

