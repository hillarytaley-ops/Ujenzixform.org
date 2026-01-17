import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  HardHat, 
  Package, 
  Truck, 
  CreditCard, 
  Home,
  LogOut,
  User,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Building2,
  Users,
  Briefcase,
  Headphones,
  MessageSquare,
  Video,
  Camera,
  Send,
  MapPin,
  Calendar,
  Upload,
  Play
} from "lucide-react";
import { BuilderProfileEdit } from "@/components/builders/BuilderProfileEdit";
import { BuilderVideoPortfolio } from "@/components/builders/BuilderVideoPortfolio";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SupplierQuoteReview } from "@/components/builders/SupplierQuoteReview";

const ProfessionalBuilderDashboardPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingOrders: 0,
    completedProjects: 0,
    totalSpent: 0,
  });
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false);
  const [monitoringRequest, setMonitoringRequest] = useState({
    projectName: '',
    projectLocation: '',
    projectDescription: '',
    preferredStartDate: '',
    numberOfCameras: '1',
    additionalNotes: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [monitoringRequests, setMonitoringRequests] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/professional-builder-signin');
        return;
      }

      setUser(user);

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);

      // Verify role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role !== 'professional_builder') {
        toast({
          title: "Access Denied",
          description: "This dashboard is for Professional Builders only.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Mock stats - replace with real data
      setStats({
        activeProjects: 5,
        pendingOrders: 8,
        completedProjects: 23,
        totalSpent: 1850000,
      });

      // Fetch monitoring requests - use user_id (original schema column)
      const { data: monitoringData, error: monitoringError } = await supabase
        .from('monitoring_service_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (monitoringError) {
        console.log('Monitoring requests fetch info:', monitoringError.message);
        // Table might not exist yet - not critical
      }
      
      if (monitoringData) {
        setMonitoringRequests(monitoringData);
      }

    } catch (error) {
      console.error('Auth error:', error);
      navigate('/professional-builder-signin');
    } finally {
      setLoading(false);
    }
  };

  const handleMonitoringRequest = async () => {
    if (!monitoringRequest.projectName || !monitoringRequest.projectLocation) {
      toast({
        title: "Missing Information",
        description: "Please fill in the project name and location.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingRequest(true);
    try {
      const { error } = await supabase
        .from('monitoring_service_requests')
        .insert({
          user_id: user.id,
          contact_name: profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'User',
          contact_email: user?.email || '',
          contact_phone: profile?.phone || '',
          company_name: profile?.company_name || '',
          project_name: monitoringRequest.projectName,
          project_location: monitoringRequest.projectLocation,
          selected_services: ['cctv'],
          camera_count: parseInt(monitoringRequest.numberOfCameras) || 1,
          additional_requirements: monitoringRequest.additionalNotes,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: "Your monitoring service request has been sent to admin for review.",
      });

      setMonitoringDialogOpen(false);
      setMonitoringRequest({
        projectName: '',
        projectLocation: '',
        projectDescription: '',
        preferredStartDate: '',
        numberOfCameras: '1',
        additionalNotes: ''
      });

      // Refresh monitoring requests
      const { data: newData } = await supabase
        .from('monitoring_service_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (newData) setMonitoringRequests(newData);

    } catch (error: any) {
      console.error('Error submitting monitoring request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 text-white py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <HardHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome, {profile?.full_name || profile?.company_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-blue-100">Professional Builder Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/suppliers">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Order Materials
                </Button>
              </Link>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto max-w-7xl px-4 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedProjects}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">KES {(stats.totalSpent / 1000000).toFixed(1)}M</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-white shadow-sm border flex-wrap h-auto p-1">
            <TabsTrigger value="projects" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="quotes" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Quotes
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Truck className="h-4 w-4 mr-2" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <Camera className="h-4 w-4 mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Video className="h-4 w-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white">
              <Headphones className="h-4 w-4 mr-2" />
              Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Active Projects
                </CardTitle>
                <CardDescription>Manage your construction projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No active projects</p>
                  <p className="text-sm mb-4">Create your first project to get started</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotes Tab - Review supplier pricing */}
          <TabsContent value="quotes">
            <SupplierQuoteReview builderId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Material Orders
                </CardTitle>
                <CardDescription>Track and manage bulk material orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm mb-4">Order materials for your projects</p>
                  <Link to="/suppliers">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Browse Materials
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Scheduled Deliveries
                </CardTitle>
                <CardDescription>Track incoming material deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No scheduled deliveries</p>
                  <p className="text-sm">Your deliveries will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Invoices & Payments
                </CardTitle>
                <CardDescription>Manage invoices and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No invoices yet</p>
                  <p className="text-sm">Your invoices will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Management
                </CardTitle>
                <CardDescription>Manage your construction team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No team members</p>
                  <p className="text-sm mb-4">Add team members to collaborate</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <User className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-cyan-600" />
                      Site Monitoring Services
                    </CardTitle>
                    <CardDescription>Request camera monitoring for your construction sites</CardDescription>
                  </div>
                  <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                        <Camera className="h-4 w-4 mr-2" />
                        Request Monitoring
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5 text-cyan-500" />
                          Request Site Monitoring
                        </DialogTitle>
                        <DialogDescription>
                          Fill in the details below to request camera monitoring services for your construction site.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Project Name *</Label>
                          <Input
                            id="projectName"
                            placeholder="e.g., Residential Complex Phase 2"
                            value={monitoringRequest.projectName}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectLocation">Project Location *</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="projectLocation"
                              className="pl-10"
                              placeholder="e.g., Westlands, Nairobi"
                              value={monitoringRequest.projectLocation}
                              onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectLocation: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectDescription">Project Description</Label>
                          <Textarea
                            id="projectDescription"
                            placeholder="Describe your project and monitoring needs..."
                            value={monitoringRequest.projectDescription}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectDescription: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="preferredStartDate">Preferred Start Date</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="preferredStartDate"
                                type="date"
                                className="pl-10"
                                value={monitoringRequest.preferredStartDate}
                                onChange={(e) => setMonitoringRequest(prev => ({ ...prev, preferredStartDate: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="numberOfCameras">Number of Cameras</Label>
                            <Input
                              id="numberOfCameras"
                              type="number"
                              min="1"
                              max="20"
                              value={monitoringRequest.numberOfCameras}
                              onChange={(e) => setMonitoringRequest(prev => ({ ...prev, numberOfCameras: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="additionalNotes">Additional Notes</Label>
                          <Textarea
                            id="additionalNotes"
                            placeholder="Any specific requirements or concerns..."
                            value={monitoringRequest.additionalNotes}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, additionalNotes: e.target.value }))}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setMonitoringDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleMonitoringRequest}
                          disabled={submittingRequest}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500"
                        >
                          {submittingRequest ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-500 rounded-lg text-white">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cyan-800 mb-1">Professional Site Monitoring</h4>
                      <p className="text-sm text-cyan-700">
                        Get 24/7 camera surveillance for your construction sites. Our monitoring service includes HD cameras, 
                        real-time viewing, recording storage, and drone aerial surveys. Request monitoring and our team will 
                        contact you to set up the service.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monitoring Requests List */}
                {monitoringRequests.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">Your Monitoring Requests</h4>
                    {monitoringRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              request.status === 'approved' ? 'bg-green-100 text-green-600' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              request.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              <Video className="h-5 w-5" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">{request.project_name}</h5>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.project_location}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Requested: {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${
                            request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                            request.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            'bg-amber-100 text-amber-700 border-amber-300'
                          }`}>
                            {request.status === 'in_progress' ? 'In Progress' : request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          </Badge>
                        </div>
                        {request.admin_response && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Admin Response:</span> {request.admin_response}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No monitoring requests yet</p>
                    <p className="text-sm mb-4">Request camera monitoring for your construction sites</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab - Video Marketing */}
          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-purple-600" />
                      Video Portfolio
                    </CardTitle>
                    <CardDescription>
                      Upload project videos to showcase your work and attract more clients
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg text-white">
                      <Play className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-1">Showcase Your Projects</h4>
                      <p className="text-sm text-purple-700">
                        Upload videos of your completed projects to build trust with potential clients.
                        Videos with good engagement (likes, comments) are featured on the Builders page!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Video Portfolio Component */}
                <BuilderVideoPortfolio 
                  builderId={user?.id || ''} 
                  isOwner={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  Edit Your Profile
                </CardTitle>
                <CardDescription>
                  Update your company information, specialties, and credentials to attract more clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BuilderProfileEdit
                  userId={user?.id || ''}
                  builderCategory="professional"
                  onSave={() => {
                    toast({
                      title: "Profile Updated!",
                      description: "Your profile has been saved successfully.",
                    });
                    // Refresh to show updated data
                    checkAuth();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-purple-600" />
                  Live Support
                </CardTitle>
                <CardDescription>Chat directly with MradiPro support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Live Chat Guide */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-600 rounded-full text-white">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">💬 Live Chat Available</h3>
                      <p className="text-muted-foreground mb-4">
                        Click the <strong className="text-purple-600">"Live"</strong> chat button in the bottom-right corner of your screen to:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Chat with our AI assistant for instant answers
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Request human support from our team
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Get help with projects, materials, and quotes
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Support Hours
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Mon - Fri: 8AM - 6PM<br />
                        Saturday: 9AM - 4PM<br />
                        Sunday: Closed
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-indigo-600" />
                        Priority Support
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Call: +254 700 000 000<br />
                        Email: pro@mradipro.co.ke
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Professional Features Banner */}
        <Card className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Professional Builder Benefits</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white">Bulk Discounts</Badge>
                  <Badge className="bg-white/20 text-white">Credit Terms</Badge>
                  <Badge className="bg-white/20 text-white">Priority Delivery</Badge>
                  <Badge className="bg-white/20 text-white">Dedicated Support</Badge>
                </div>
              </div>
              <Link to="/suppliers">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  Start Ordering
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default ProfessionalBuilderDashboardPage;

