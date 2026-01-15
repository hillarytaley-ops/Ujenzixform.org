import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { DashboardLoader } from '@/components/ui/DashboardLoader';
import {
  Building2,
  Package,
  Truck,
  FileText,
  Camera,
  Video,
  MessageSquare,
  Settings,
  LogOut,
  Home,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Star,
  Bell,
  Headphones,
  Plane,
  MapPin,
  Send
} from 'lucide-react';

// Monitoring Request Form Component
function MonitoringRequestForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [monitoringForm, setMonitoringForm] = useState({
    projectName: '',
    projectLocation: '',
    projectDescription: '',
    selectedServices: [] as string[],
    preferredStartDate: '',
    contactPhone: ''
  });
  const { toast } = useToast();

  const services = [
    { id: 'drone', label: 'Drone Surveillance', icon: Plane },
    { id: 'cctv', label: 'CCTV Cameras', icon: Camera },
    { id: 'gps', label: 'GPS Tracking', icon: MapPin }
  ];

  const toggleService = (serviceId: string) => {
    setMonitoringForm(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(s => s !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handleMonitoringSubmit = async () => {
    if (!monitoringForm.projectName || !monitoringForm.projectLocation || monitoringForm.selectedServices.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one service.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Generate access code
      const accessCode = `MON-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Get session for auth token
      const { data: sessionData } = await supabase.auth.getSession();

      // Use direct fetch to Supabase REST API
      // SUPABASE_URL and SUPABASE_ANON_KEY imported from centralized client

      const response = await fetch(`${SUPABASE_URL}/rest/v1/monitoring_service_requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${sessionData?.session?.access_token || SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          builder_id: userId,
          project_name: monitoringForm.projectName,
          project_location: monitoringForm.projectLocation,
          project_description: monitoringForm.projectDescription,
          selected_services: monitoringForm.selectedServices,
          preferred_start_date: monitoringForm.preferredStartDate || null,
          contact_phone: monitoringForm.contactPhone || null,
          access_code: accessCode,
          status: 'pending'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Monitoring request error:', errorText);
        throw new Error('Failed to submit monitoring request');
      }

      toast({
        title: "Request Submitted!",
        description: `Your access code is: ${accessCode}. Save this for tracking.`,
      });

      // Reset form
      setMonitoringForm({
        projectName: '',
        projectLocation: '',
        projectDescription: '',
        selectedServices: [],
        preferredStartDate: '',
        contactPhone: ''
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting monitoring request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="projectName" className="text-white">Project Name *</Label>
          <Input
            id="projectName"
            value={monitoringForm.projectName}
            onChange={(e) => setMonitoringForm(prev => ({ ...prev, projectName: e.target.value }))}
            placeholder="e.g., Residential Building Phase 1"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div>
          <Label htmlFor="projectLocation" className="text-white">Project Location *</Label>
          <Input
            id="projectLocation"
            value={monitoringForm.projectLocation}
            onChange={(e) => setMonitoringForm(prev => ({ ...prev, projectLocation: e.target.value }))}
            placeholder="e.g., Westlands, Nairobi"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="projectDescription" className="text-white">Project Description</Label>
        <Textarea
          id="projectDescription"
          value={monitoringForm.projectDescription}
          onChange={(e) => setMonitoringForm(prev => ({ ...prev, projectDescription: e.target.value }))}
          placeholder="Describe your project and monitoring needs..."
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      <div>
        <Label className="text-white mb-3 block">Select Monitoring Services *</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((service) => {
            const Icon = service.icon;
            const isSelected = monitoringForm.selectedServices.includes(service.id);
            return (
              <div
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-600/30 border-purple-500'
                    : 'bg-gray-700/50 border-gray-600 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={isSelected} />
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                  <span className="text-white">{service.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="preferredStartDate" className="text-white">Preferred Start Date</Label>
          <Input
            id="preferredStartDate"
            type="date"
            value={monitoringForm.preferredStartDate}
            onChange={(e) => setMonitoringForm(prev => ({ ...prev, preferredStartDate: e.target.value }))}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div>
          <Label htmlFor="contactPhone" className="text-white">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={monitoringForm.contactPhone}
            onChange={(e) => setMonitoringForm(prev => ({ ...prev, contactPhone: e.target.value }))}
            placeholder="+254 7XX XXX XXX"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      <Button
        onClick={handleMonitoringSubmit}
        disabled={loading || monitoringForm.selectedServices.length === 0}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {loading ? (
          <>Processing...</>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Monitoring Request
          </>
        )}
      </Button>
    </div>
  );
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  builder_category?: string;
  company_name?: string;
  phone?: string;
  location?: string;
  approved?: boolean;
}

export default function UnifiedBuilderDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        setProfile(profileData);

        // Fetch stats
        const { data: ordersData } = await supabase
          .from('purchase_orders')
          .select('status, total_amount')
          .eq('builder_id', session.user.id);

        if (ordersData) {
          setStats({
            activeProjects: ordersData.filter(o => o.status === 'in_progress').length,
            pendingOrders: ordersData.filter(o => o.status === 'pending').length,
            completedOrders: ordersData.filter(o => o.status === 'completed').length,
            totalSpent: ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0)
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return <DashboardLoader />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <p className="text-white">Profile not found. Please sign in again.</p>
            <Button onClick={() => navigate('/auth')} className="mt-4">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const builderType = profile.builder_category === 'professional' ? 'Professional Builder' : 'Private Builder';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome, {profile.full_name || 'Builder'}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-purple-600">{builderType}</Badge>
              {profile.approved ? (
                <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
              ) : (
                <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending Verification</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/suppliers')}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Shop Materials
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-blue-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Active Projects</p>
                  <p className="text-3xl font-bold text-white">{stats.activeProjects}</p>
                </div>
                <Building2 className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border-yellow-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-300 text-sm">Pending Orders</p>
                  <p className="text-3xl font-bold text-white">{stats.pendingOrders}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-900/50 to-green-800/50 border-green-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm">Completed Orders</p>
                  <p className="text-3xl font-bold text-white">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-purple-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Total Spent</p>
                  <p className="text-3xl font-bold text-white">KES {stats.totalSpent.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-purple-600">
              <Package className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-purple-600">
              <Building2 className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-purple-600">
              <Camera className="w-4 h-4 mr-2" />
              Monitoring
            </TabsTrigger>
            {profile.builder_category === 'professional' && (
              <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-600">
                <Video className="w-4 h-4 mr-2" />
                Portfolio
              </TabsTrigger>
            )}
            <TabsTrigger value="support" className="data-[state=active]:bg-purple-600">
              <Headphones className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2"
                    onClick={() => navigate('/suppliers')}
                  >
                    <ShoppingCart className="w-6 h-6" />
                    <span>Shop Materials</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2"
                    onClick={() => navigate('/tracking')}
                  >
                    <Truck className="w-6 h-6" />
                    <span>Track Delivery</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2"
                    onClick={() => setActiveTab('monitoring')}
                  >
                    <Camera className="w-6 h-6" />
                    <span>Site Monitoring</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2"
                    onClick={() => navigate('/builders')}
                  >
                    <Users className="w-6 h-6" />
                    <span>Find Builders</span>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                      <Bell className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white text-sm">Welcome to MradiPro!</p>
                        <p className="text-gray-400 text-xs">Start by exploring our materials catalog</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Your Orders</CardTitle>
                <CardDescription className="text-gray-400">
                  Track and manage your material orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">No orders yet</p>
                  <Button 
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate('/suppliers')}
                  >
                    Start Shopping
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Your Projects</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your construction projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">No projects yet</p>
                  <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Request Site Monitoring</CardTitle>
                <CardDescription className="text-gray-400">
                  Request drone and camera monitoring for your construction sites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MonitoringRequestForm 
                  userId={profile.id} 
                  onSuccess={() => {
                    toast({
                      title: "Monitoring Request Submitted",
                      description: "Your request has been submitted for review.",
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {profile.builder_category === 'professional' && (
            <TabsContent value="portfolio">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Video Portfolio</CardTitle>
                  <CardDescription className="text-gray-400">
                    Showcase your work with video content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">No videos uploaded yet</p>
                    <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                      Upload Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="support">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-blue-400" />
                  Live Support
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Chat directly with MradiPro support team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Live Chat Guide */}
                <div className="rounded-lg p-6 border bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-800">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-600 rounded-full text-white">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-white">💬 Live Chat Available</h3>
                      <p className="text-gray-400 mb-4">
                        Click the <strong className="text-blue-400">"Live"</strong> chat button in the bottom-right corner of your screen to:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-gray-400">Chat with our AI assistant for instant answers</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-gray-400">Request human support from our team</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-gray-400">Get help with projects, orders, and monitoring</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-blue-900/20 border-blue-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                        <Clock className="h-4 w-4 text-blue-400" />
                        Support Hours
                      </h4>
                      <p className="text-sm text-gray-400">
                        Mon - Fri: 8AM - 6PM<br />
                        Saturday: 9AM - 4PM<br />
                        Sunday: Closed
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-900/20 border-purple-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                        <Bell className="h-4 w-4 text-purple-400" />
                        Builder Hotline
                      </h4>
                      <p className="text-sm text-gray-400">
                        Call: +254 700 000 000<br />
                        Email: builders@mradipro.co.ke
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your profile and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Name</p>
                    <p className="text-white">{profile.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="text-white">{profile.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Location</p>
                    <p className="text-white">{profile.location || 'Not set'}</p>
                  </div>
                </div>
                <Button variant="outline" className="mt-4">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

    </div>
  );
}

