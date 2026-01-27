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
  ShoppingBag, 
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
  Heart,
  Headphones,
  MessageSquare,
  Video,
  Camera,
  Send,
  MapPin,
  Calendar,
  Plus,
  XCircle,
  Eye
} from "lucide-react";
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
import DeliveryRequest from "@/components/DeliveryRequest";

const PrivateClientDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
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
        navigate('/private-client-signin');
        return;
      }

      setUser(user);

      // Get profile - try user_id first (RLS policy uses user_id), fallback to id
      const { data: profileByUserId } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileByUserId) {
        setProfile(profileByUserId);
      } else {
        // Fallback to id column or use auth metadata
        const { data: profileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileById) {
          setProfile(profileById);
        } else {
          // Use auth user metadata as fallback
          setProfile({
            id: user.id,
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
            phone: user.user_metadata?.phone || '',
            company_name: user.user_metadata?.company_name || '',
            county: user.user_metadata?.county || '',
          });
        }
      }

      // Verify role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role !== 'private_client') {
        toast({
          title: "Access Denied",
          description: "This dashboard is for Private Builders only.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Mock stats - replace with real data
      setStats({
        totalOrders: 12,
        pendingOrders: 2,
        completedOrders: 10,
        totalSpent: 245000,
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
      navigate('/private-client-signin');
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
          contact_name: profile?.full_name || user?.email?.split('@')[0] || 'User',
          contact_email: user?.email || '',
          contact_phone: profile?.phone || 'N/A',
          project_name: monitoringRequest.projectName,
          project_location: monitoringRequest.projectLocation,
          selected_services: ['cctv'],
          camera_count: parseInt(monitoringRequest.numberOfCameras) || 1,
          special_requirements: monitoringRequest.projectDescription || null,
          additional_notes: monitoringRequest.additionalNotes || null,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome, {profile?.full_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-green-100">Private Builder Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/suppliers">
                <Button className="bg-white text-green-700 hover:bg-green-50">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Shop Materials
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
          <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">KES {stats.totalSpent.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="orders" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Truck className="h-4 w-4 mr-2" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="request-delivery" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Plus className="h-4 w-4 mr-2" />
              Request Delivery
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Heart className="h-4 w-4 mr-2" />
              Wishlist
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <Video className="h-4 w-4 mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Headphones className="h-4 w-4 mr-2" />
              Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Recent Orders
                </CardTitle>
                <CardDescription>Track and manage your material orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm mb-4">Start shopping for construction materials</p>
                  <Link to="/suppliers">
                    <Button className="bg-green-600 hover:bg-green-700">
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
                  <Truck className="h-5 w-5 text-green-600" />
                  Active Deliveries
                </CardTitle>
                <CardDescription>Track your incoming deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No active deliveries</p>
                  <p className="text-sm">Your deliveries will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Delivery Request Tab */}
          <TabsContent value="request-delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-teal-600" />
                  Request Manual Delivery
                </CardTitle>
                <CardDescription>
                  Request delivery for materials sourced outside UjenziXform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-500 rounded-lg text-white">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-teal-800 mb-1">When to Use Manual Delivery Request</h4>
                      <ul className="text-sm text-teal-700 space-y-1">
                        <li>• Materials purchased from local hardware stores</li>
                        <li>• Items bought from suppliers outside UjenziXform</li>
                        <li>• Moving materials between storage and construction site</li>
                        <li>• Returning defective items to suppliers</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <DeliveryRequest />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Payment History
                </CardTitle>
                <CardDescription>View your payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No payments yet</p>
                  <p className="text-sm">Your payment history will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  My Wishlist
                </CardTitle>
                <CardDescription>Products you've saved for later</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Your wishlist is empty</p>
                  <p className="text-sm mb-4">Save products you're interested in</p>
                  <Link to="/suppliers">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Explore Products
                    </Button>
                  </Link>
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
                    <CardDescription>Request camera monitoring for your home construction</CardDescription>
                  </div>
                  <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                        <Camera className="h-4 w-4 mr-2" />
                        Request Monitoring
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0">
                      <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5 text-cyan-500" />
                          Request Site Monitoring
                        </DialogTitle>
                        <DialogDescription>
                          Fill in the details below to request camera monitoring services for your construction site.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Scrollable Form Content */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Project Name *</Label>
                          <Input
                            id="projectName"
                            placeholder="e.g., My New Home Construction"
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
                              placeholder="e.g., Karen, Nairobi"
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
                            rows={2}
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
                              max="10"
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
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      {/* Fixed Footer */}
                      <DialogFooter className="border-t p-6 pt-4 bg-background">
                        <Button variant="outline" onClick={() => setMonitoringDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleMonitoringRequest}
                          disabled={submittingRequest}
                          className="bg-gradient-to-r from-cyan-500 to-teal-500"
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
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-500 rounded-lg text-white">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cyan-800 mb-1">Home Construction Monitoring</h4>
                      <p className="text-sm text-cyan-700">
                        Keep an eye on your home construction from anywhere. Our monitoring service includes HD cameras, 
                        real-time mobile viewing, and secure recording storage. Request monitoring and our team will 
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
                      <div key={request.id} className={`border rounded-lg p-4 transition-colors ${
                        request.status === 'quoted' ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              request.status === 'approved' ? 'bg-green-100 text-green-600' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              request.status === 'quoted' ? 'bg-blue-100 text-blue-600' :
                              request.status === 'completed' ? 'bg-purple-100 text-purple-600' :
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
                              {request.camera_count && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Cameras: {request.camera_count}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                            request.status === 'quoted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            request.status === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                            'bg-amber-100 text-amber-700 border-amber-300'
                          }`}>
                            {request.status === 'quoted' ? '💰 Quote Received' : 
                             request.status === 'approved' ? '✅ Active' :
                             request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          </Badge>
                        </div>
                        
                        {/* Quote Section - Show when admin has sent a quote */}
                        {request.status === 'quoted' && request.quote_amount && (
                          <div className="mt-4 p-4 bg-white border-2 border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-semibold text-blue-800">📋 Quote from UjenziXform</h6>
                              {request.quote_valid_until && (
                                <span className="text-xs text-gray-500">
                                  Valid until: {new Date(request.quote_valid_until).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="text-center mb-4">
                              <p className="text-sm text-gray-600">Monthly Service Fee</p>
                              <p className="text-3xl font-bold text-blue-600">
                                KES {Number(request.quote_amount).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">per month</p>
                            </div>
                            {request.admin_notes && (
                              <p className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
                                <span className="font-medium">Note:</span> {request.admin_notes}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('monitoring_service_requests')
                                      .update({ status: 'approved' })
                                      .eq('id', request.id);
                                    if (error) throw error;
                                    toast({
                                      title: "Quote Accepted! 🎉",
                                      description: "Your monitoring service is now active. You can access your cameras.",
                                    });
                                    // Refresh the list
                                    const { data } = await supabase
                                      .from('monitoring_service_requests')
                                      .select('*')
                                      .eq('user_id', user?.id)
                                      .order('created_at', { ascending: false });
                                    if (data) setMonitoringRequests(data);
                                  } catch (error) {
                                    console.error('Error accepting quote:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to accept quote. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Quote
                              </Button>
                              <Button 
                                variant="outline"
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('monitoring_service_requests')
                                      .update({ status: 'rejected' })
                                      .eq('id', request.id);
                                    if (error) throw error;
                                    toast({
                                      title: "Quote Declined",
                                      description: "You can request a new quote anytime.",
                                    });
                                    // Refresh the list
                                    const { data } = await supabase
                                      .from('monitoring_service_requests')
                                      .select('*')
                                      .eq('user_id', user?.id)
                                      .order('created_at', { ascending: false });
                                    if (data) setMonitoringRequests(data);
                                  } catch (error) {
                                    console.error('Error rejecting quote:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to decline quote. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Approved - Show access info */}
                        {request.status === 'approved' && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <h6 className="font-semibold text-green-800">Monitoring Service Active</h6>
                            </div>
                            <p className="text-sm text-green-700 mb-3">
                              Your cameras are set up and ready. Access your live feeds anytime.
                            </p>
                            {request.access_code && (
                              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                                <p className="text-xs text-gray-500">Access Code</p>
                                <p className="font-mono font-bold text-lg text-green-700">{request.access_code}</p>
                              </div>
                            )}
                            <Button 
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => window.open('/monitoring', '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Access Live Cameras
                            </Button>
                          </div>
                        )}
                        
                        {/* Pending - Waiting for admin */}
                        {request.status === 'pending' && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Waiting for admin to review and send quote...
                            </p>
                          </div>
                        )}
                        
                        {/* Rejected */}
                        {request.status === 'rejected' && request.admin_notes && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Reason:</span> {request.admin_notes}
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
                    <p className="text-sm mb-4">Request camera monitoring for your home construction</p>
                  </div>
                )}
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
                <CardDescription>Chat directly with UjenziXform support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Live Chat Guide */}
                <div className="bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
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
                          Get help with orders, materials, and deliveries
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        Support Hours
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Mon - Fri: 8AM - 6PM<br />
                        Saturday: 9AM - 4PM<br />
                        Sunday: Closed
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        Emergency Contact
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Call: +254 700 000 000<br />
                        Email: support@UjenziXform.co.ke
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default PrivateClientDashboard;

