import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AnimatedSection from "@/components/AnimatedSection";
import { 
  Video, 
  Camera, 
  Eye, 
  Shield, 
  Activity, 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  Users,
  Wifi,
  Battery,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Monitor,
  Zap,
  Plane
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  projectSite: string;
  status: 'online' | 'offline' | 'recording' | 'maintenance';
  quality: '480p' | '720p' | '1080p' | '4K';
  viewers: number;
  uptime: string;
  lastActivity: Date;
  isRecording: boolean;
  batteryLevel?: number;
  signalStrength: number;
}

interface ProjectMonitoring {
  id: string;
  projectName: string;
  location: string;
  status: 'active' | 'paused' | 'completed';
  cameras: number;
  activeCameras: number;
  alerts: number;
  lastUpdate: Date;
  progress: number;
}

const Monitoring = () => {
  const [activeTab, setActiveTab] = useState("cameras");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const { toast } = useToast();

  // Sample monitoring data
  const [cameras] = useState<CameraFeed[]>([
    {
      id: 'cam-001',
      name: 'Main Entrance Camera',
      location: 'Gate A - Security Checkpoint',
      projectSite: 'Westlands Commercial Complex',
      status: 'online',
      quality: '1080p',
      viewers: 3,
      uptime: '2h 15m',
      lastActivity: new Date(),
      isRecording: true,
      signalStrength: 95
    },
    {
      id: 'cam-002',
      name: 'Foundation Work Area',
      location: 'Block A - Foundation Site',
      projectSite: 'Karen Residential Project',
      status: 'recording',
      quality: '720p',
      viewers: 5,
      uptime: '4h 32m',
      lastActivity: new Date(),
      isRecording: true,
      signalStrength: 87
    },
    {
      id: 'cam-003',
      name: 'Material Storage Camera',
      location: 'Warehouse - Storage Area',
      projectSite: 'Kilimani Office Complex',
      status: 'offline',
      quality: '480p',
      viewers: 0,
      uptime: '0m',
      lastActivity: new Date(Date.now() - 1800000),
      isRecording: false,
      batteryLevel: 15,
      signalStrength: 23
    },
    {
      id: 'drone-001',
      name: 'Drone Camera - Aerial View',
      location: 'Aerial Coverage - Full Site',
      projectSite: 'Westlands Commercial Complex',
      status: 'online',
      quality: '4K',
      viewers: 8,
      uptime: '1h 45m',
      lastActivity: new Date(),
      isRecording: true,
      batteryLevel: 78,
      signalStrength: 92
    },
    {
      id: 'drone-002',
      name: 'Drone Camera - Progress View',
      location: 'Aerial Coverage - Construction Progress',
      projectSite: 'Karen Residential Project',
      status: 'recording',
      quality: '4K',
      viewers: 12,
      uptime: '3h 20m',
      lastActivity: new Date(),
      isRecording: true,
      batteryLevel: 65,
      signalStrength: 88
    },
    {
      id: 'drone-003',
      name: 'Drone Camera - Site Survey',
      location: 'Aerial Coverage - Site Overview',
      projectSite: 'Kilimani Office Complex',
      status: 'maintenance',
      quality: '1080p',
      viewers: 0,
      uptime: '0m',
      lastActivity: new Date(Date.now() - 7200000),
      isRecording: false,
      batteryLevel: 25,
      signalStrength: 45
    }
  ]);

  const [projects] = useState<ProjectMonitoring[]>([
    {
      id: 'proj-001',
      projectName: 'Westlands Commercial Complex',
      location: 'Westlands, Nairobi',
      status: 'active',
      cameras: 8,
      activeCameras: 7,
      alerts: 1,
      lastUpdate: new Date(),
      progress: 65
    },
    {
      id: 'proj-002',
      projectName: 'Karen Residential Project',
      location: 'Karen, Nairobi',
      status: 'active',
      cameras: 6,
      activeCameras: 6,
      alerts: 0,
      lastUpdate: new Date(),
      progress: 45
    },
    {
      id: 'proj-003',
      projectName: 'Kilimani Office Complex',
      location: 'Kilimani, Nairobi',
      status: 'paused',
      cameras: 12,
      activeCameras: 0,
      alerts: 3,
      lastUpdate: new Date(Date.now() - 3600000),
      progress: 30
    }
  ]);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    // Set default tab based on role
    if (userRole === 'admin') {
      setActiveTab("overview");
    } else if (userRole === 'builder') {
      setActiveTab("cameras");
    }
  }, [userRole]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        setUserRole((roleData?.role as any) || 'guest');
      } else {
        setUserRole('guest');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('guest');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole === 'admin';
  const isBuilder = userRole === 'builder';
  const canViewCameras = isAdmin || isBuilder;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': case 'active': case 'recording': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline': case 'paused': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'recording': return <Video className="h-4 w-4" />;
      case 'offline': case 'paused': return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading monitoring system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <section 
          className="text-white py-24 relative overflow-hidden"
          role="banner"
          aria-labelledby="monitoring-hero-heading"
        >
        {/* Kenyan Construction Surveillance & Monitoring Background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
          role="img"
          aria-label="Modern Kenyan construction site with advanced surveillance cameras and monitoring systems for comprehensive construction project oversight"
        />
        
        {/* Kenyan flag colors overlay with monitoring theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-green-900/70 to-red-900/70"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex justify-center">
              <Badge className="bg-gradient-to-r from-green-600 to-red-600 text-white px-8 py-3 text-xl font-bold border border-white/30 shadow-lg">
                🇰🇪 Advanced Construction Monitoring
              </Badge>
            </div>
            
            <h1 id="monitoring-hero-heading" className="text-6xl md:text-8xl font-bold mb-8 text-white drop-shadow-2xl flex items-center justify-center gap-4">
              <Shield className="h-16 w-16 md:h-20 md:w-20 text-primary" />
              Monitoring Center
            </h1>
            
            <p className="text-2xl md:text-4xl mb-12 text-white/90 font-medium drop-shadow-lg leading-relaxed">
              Comprehensive surveillance and monitoring dashboard for construction sites, 
              cameras, and system health across Kenya
            </p>
            
            {/* Monitoring Technology Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-green-400 mb-2">Live</div>
                <div className="text-white font-medium">Camera Feeds</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-blue-400 mb-2">Ultra-Strict</div>
                <div className="text-white font-medium">Access Control</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-yellow-400 mb-2">Complete</div>
                <div className="text-white font-medium">Supplier Lockout</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-red-400 mb-2">Real-Time</div>
                <div className="text-white font-medium">Surveillance</div>
              </div>
            </div>
            
            {/* Monitoring Features Highlight */}
            <div className="flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Eye className="h-5 w-5" />
                <span className="font-medium">Live Monitoring</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Access Control</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Video className="h-5 w-5" />
                <span className="font-medium">Camera Systems</span>
              </div>
            </div>
          </div>
        </div>
        </section>
      </AnimatedSection>

      <main className="py-20 relative overflow-hidden">
        {/* Kenyan Construction Site Monitoring Background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2131&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
          role="img"
          aria-label="Professional Kenyan construction site with monitoring systems and surveillance technology for comprehensive project oversight"
        />
        
        {/* Light overlay for monitoring interface readability */}
        <div className="absolute inset-0 bg-white/92 backdrop-blur-[1px]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Enhanced Header */}
          <div className="text-center mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border-2 border-white/50 shadow-2xl max-w-4xl mx-auto">
              <h2 className="text-5xl font-bold mb-6 text-gray-900 flex items-center justify-center gap-3">
                <Shield className="h-12 w-12 text-primary" />
                Advanced Monitoring & Surveillance
              </h2>
              <p className="text-xl text-gray-700 leading-relaxed mb-6">
                Comprehensive monitoring dashboard for construction sites, cameras, and system health with ultra-strict access controls
              </p>
              
              {/* Role Badge */}
              <div className="flex justify-center gap-4 mb-6">
                {userRole && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-2 text-lg font-semibold">
                    {userRole} Access
                  </Badge>
                )}
                <Badge className="bg-gradient-to-r from-green-500 to-red-500 text-white px-4 py-2 text-lg font-semibold">
                  <Eye className="h-4 w-4 mr-2" />
                  Live Monitoring
                </Badge>
              </div>

              {/* Access Notice */}
              {userRole === 'supplier' ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Access Restricted:</strong> Suppliers do not have access to the monitoring system. 
                    This includes camera feeds, delivery tracking, and system monitoring. These features are restricted to builders and UjenziPro administrators.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Comprehensive Monitoring:</strong> Access live camera feeds, track project progress, 
                    monitor system health, and manage all aspects of your construction projects from one centralized dashboard.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {userRole !== 'supplier' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-white/50 shadow-2xl p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid w-full max-w-4xl mx-auto mb-8 bg-gray-100/80 backdrop-blur-sm ${
                  isAdmin ? 'grid-cols-4' : 'grid-cols-1'
                }`}>
              {isAdmin && (
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Overview
                </TabsTrigger>
              )}
              <TabsTrigger value="cameras" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Live Cameras
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="projects" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Projects
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  System Health
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="overview" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Monitoring Overview</h2>
                
                {/* System Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</div>
                      <p className="text-xs text-muted-foreground">
                        {projects.length} total projects
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Live Cameras</CardTitle>
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cameras.filter(c => c.status === 'online' || c.status === 'recording').length}</div>
                      <p className="text-xs text-muted-foreground">
                        {cameras.length} total cameras
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                      <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">99.2%</div>
                      <p className="text-xs text-muted-foreground">
                        Last 30 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{projects.reduce((sum, p) => sum + p.alerts, 0)}</div>
                      <p className="text-xs text-muted-foreground">
                        Across all projects
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest monitoring events and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Video className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Camera CAM-001 started recording</p>
                          <p className="text-sm text-muted-foreground">Westlands Commercial Complex - Main Entrance</p>
                          <p className="text-xs text-muted-foreground">2 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Low battery alert</p>
                          <p className="text-sm text-muted-foreground">Camera CAM-003 battery at 15%</p>
                          <p className="text-xs text-muted-foreground">15 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">System health check completed</p>
                          <p className="text-sm text-muted-foreground">All systems operational</p>
                          <p className="text-xs text-muted-foreground">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}

            {/* Live Cameras Tab */}
            <TabsContent value="cameras" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                {/* Builder Access Notice */}
                {isBuilder && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Eye className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Builder Camera Access:</strong> You can view live camera feeds from your construction projects. 
                      Overview and Projects tabs are restricted to UjenziPro administrators.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Live Camera Feeds</h2>
                    <p className="text-muted-foreground">
                      {isAdmin ? "Monitor all construction site cameras" : "View cameras from your construction projects"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    {cameras.filter(c => c.status === 'online' || c.status === 'recording').length} Online
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Camera List */}
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle>Camera Feeds</CardTitle>
                        <CardDescription>Select a camera to view live feed</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {cameras.map((camera) => {
                            const isDrone = camera.id.startsWith('drone-');
                            return (
                              <div
                                key={camera.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedCamera === camera.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                } ${isDrone ? 'border-l-4 border-l-purple-500' : ''}`}
                                onClick={() => setSelectedCamera(camera.id)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {isDrone && <Plane className="h-4 w-4 text-purple-500" />}
                                    <span className="font-medium">{camera.name}</span>
                                  </div>
                                  <Badge className={getStatusColor(camera.status)}>
                                    {camera.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {camera.projectSite}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  {camera.location}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={isDrone ? 'font-medium text-purple-600' : ''}>{camera.quality}</span>
                                    {camera.isRecording && <Video className="h-3 w-3 text-red-500" />}
                                    {isDrone && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Aerial</Badge>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-3 w-3" />
                                    <span>{camera.viewers}</span>
                                    <Wifi className="h-3 w-3" />
                                    <span>{camera.signalStrength}%</span>
                                  </div>
                                </div>
                                {camera.batteryLevel && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <Battery className="h-3 w-3" />
                                    <Progress value={camera.batteryLevel} className="h-1 flex-1" />
                                    <span className="text-xs">{camera.batteryLevel}%</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main Video Feed */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{selectedCamera ? cameras.find(c => c.id === selectedCamera)?.name : 'Select Camera'}</CardTitle>
                            <CardDescription>{selectedCamera ? cameras.find(c => c.id === selectedCamera)?.projectSite : 'Choose a camera to view live feed'}</CardDescription>
                          </div>
                          {selectedCamera && (
                            <Badge className={getStatusColor(cameras.find(c => c.id === selectedCamera)?.status || '')}>
                              {cameras.find(c => c.id === selectedCamera)?.status}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative">
                          {selectedCamera ? (
                            <div className="text-white text-center">
                              {selectedCamera.startsWith('drone-') ? (
                                <>
                                  <Plane className="h-12 w-12 mx-auto mb-4 opacity-75 text-purple-300" />
                                  <p className="text-lg">Drone Aerial Feed</p>
                                  <p className="text-sm opacity-75">
                                    {cameras.find(c => c.id === selectedCamera)?.quality} Aerial Stream
                                  </p>
                                  <Badge className="mt-2 bg-purple-600 text-white">
                                    Aerial View
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                  <p className="text-lg">Live Feed</p>
                                  <p className="text-sm opacity-75">
                                    {cameras.find(c => c.id === selectedCamera)?.quality} Stream
                                  </p>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-white text-center">
                              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Select a Camera</p>
                              <p className="text-sm opacity-75">Choose from the list to view live feed</p>
                            </div>
                          )}
                          
                          {/* Video Controls */}
                          {selectedCamera && (
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary">
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="secondary">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isAdmin && (
                                  <Button size="sm" variant="secondary">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                )}
                                {selectedCamera.startsWith('drone-') && isAdmin && (
                                  <Button size="sm" variant="secondary" title="Drone Controls">
                                    <Plane className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="secondary">
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Projects Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="projects" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Project Monitoring</h2>
                    <p className="text-muted-foreground">Monitor construction projects and their camera systems</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50">
                    {projects.filter(p => p.status === 'active').length} Active Projects
                  </Badge>
                </div>

                <div className="grid gap-6">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{project.projectName}</CardTitle>
                            <CardDescription>{project.location}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusIcon(project.status)}
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <span className="text-muted-foreground text-sm">Cameras:</span>
                            <p className="font-medium">{project.activeCameras}/{project.cameras} active</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Progress:</span>
                            <p className="font-medium">{project.progress}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Alerts:</span>
                            <p className="font-medium">{project.alerts}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Last Update:</span>
                            <p className="font-medium">{project.lastUpdate.toLocaleTimeString()}</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Project Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Cameras
                          </Button>
                          {isAdmin && (
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Project
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            )}

            {/* System Health Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="system" className="space-y-6">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">System Health</h2>
                      <p className="text-muted-foreground">Monitor system performance and health metrics</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      All Systems Operational
                    </Badge>
                  </div>

                  {/* System Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Server Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>CPU Usage</span>
                            <span>45%</span>
                          </div>
                          <Progress value={45} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Memory Usage</span>
                            <span>62%</span>
                          </div>
                          <Progress value={62} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Storage Used</span>
                            <span>78%</span>
                          </div>
                          <Progress value={78} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Network Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Database Connection</span>
                          <Badge className="bg-green-100 text-green-800">Online</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">API Services</span>
                          <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Camera Streams</span>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh All Cameras
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Settings className="h-4 w-4 mr-2" />
                            System Settings
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Zap className="h-4 w-4 mr-2" />
                            Run Diagnostics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            )}
              </Tabs>
            </div>
          )}

          {/* Scanner Integration Notice */}
          <div className="max-w-5xl mx-auto mt-16">
            <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-green-50 via-blue-50 to-red-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-red-500 rounded-full shadow-lg">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  Integrated Monitoring System
                </CardTitle>
                <CardDescription className="text-lg text-gray-700">
                  Complete construction site monitoring with advanced security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Camera Monitoring</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Live surveillance of construction sites with AI-powered monitoring and real-time alerts.
                </p>
                <Button variant="outline" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  View Live Feeds
                </Button>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Material Scanning</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  QR code scanning system for material verification and tracking across the supply chain.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/scanners">
                    <Camera className="h-4 w-4 mr-2" />
                    Access Scanners
                  </a>
                </Button>
              </div>
            </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Monitoring;