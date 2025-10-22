import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Lock
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface MonitoringRequest {
  id: string;
  project_name: string;
  project_location: string;
  monitoring_type: string;
  duration_days: number;
  start_date: string;
  unique_id: string;
  status: 'pending' | 'approved' | 'active' | 'completed';
  created_at: string;
}

interface LiveStreamAccess {
  project_id: string;
  access_url: string;
  unique_id: string;
  analytics_data: {
    materials_used: string[];
    progress_percentage: number;
    last_activity: string;
  };
}

const MonitoringServiceRequest = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [activeRequests, setActiveRequests] = useState<MonitoringRequest[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStreamAccess[]>([]);
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [monitoringType, setMonitoringType] = useState('basic');
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [requirements, setRequirements] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    checkUserAccess();
    fetchActiveRequests();
    fetchLiveStreams();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Access Denied",
          description: "Please log in to access monitoring services.",
          variant: "destructive"
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, user_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      
      // Check if user is a builder
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'builder')
        .maybeSingle();
      
      if (!roleData) {
        toast({
          title: "Access Restricted",
          description: "Monitoring services are for builders only.",
          variant: "destructive"
        });
        return;
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Error checking user access:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRequests = async () => {
    // Mock data - in real app, fetch from Supabase
    const mockRequests: MonitoringRequest[] = [
      {
        id: '1',
        project_name: 'Residential Complex Phase 1',
        project_location: 'Kiambu, Kenya',
        monitoring_type: 'comprehensive',
        duration_days: 90,
        start_date: '2024-01-15',
        unique_id: 'MON-2024-001',
        status: 'active',
        created_at: '2024-01-10T10:00:00Z'
      }
    ];
    setActiveRequests(mockRequests);
  };

  const fetchLiveStreams = async () => {
    // Mock live stream data
    const mockStreams: LiveStreamAccess[] = [
      {
        project_id: '1',
        access_url: 'https://stream.ujenzi.pro/mon-2024-001',
        unique_id: 'MON-2024-001',
        analytics_data: {
          materials_used: ['Cement', 'Steel Bars', 'Aggregates'],
          progress_percentage: 45,
          last_activity: '2024-01-20T14:30:00Z'
        }
      }
    ];
    setLiveStreams(mockStreams);
  };

  const generateUniqueId = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const time = Date.now().toString().slice(-4);
    return `MON-${year}${month}${day}-${time}`;
  };

  const submitMonitoringRequest = async () => {
    if (!projectName || !projectLocation || !startDate) {
      toast({
        title: "Incomplete Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setRequesting(true);
    try {
      const uniqueId = generateUniqueId();
      
      // Create monitoring request
      const requestData = {
        builder_id: userProfile.id,
        project_name: projectName,
        project_location: projectLocation,
        monitoring_type: monitoringType,
        duration_days: duration,
        start_date: startDate,
        unique_id: uniqueId,
        special_requirements: requirements,
        status: 'pending'
      };

      // In real app, insert into Supabase
      // const { data, error } = await supabase
      //   .from('monitoring_requests')
      //   .insert(requestData)
      //   .select()
      //   .single();

      // For demo, add to state
      const newRequest: MonitoringRequest = {
        id: Date.now().toString(),
        project_name: projectName,
        project_location: projectLocation,
        monitoring_type: monitoringType,
        duration_days: duration,
        start_date: startDate,
        unique_id: uniqueId,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      setActiveRequests(prev => [newRequest, ...prev]);

      toast({
        title: "Request Submitted",
        description: `Monitoring request submitted with ID: ${uniqueId}`,
      });

      // Reset form
      setProjectName('');
      setProjectLocation('');
      setMonitoringType('basic');
      setDuration(30);
      setStartDate('');
      setRequirements('');

    } catch (error) {
      console.error('Error submitting monitoring request:', error);
      toast({
        title: "Request Failed",
        description: "Failed to submit monitoring request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRequesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMonitoringTypeLabel = (type: string) => {
    switch (type) {
      case 'basic': return 'Basic Monitoring';
      case 'comprehensive': return 'Comprehensive Analysis';
      case 'premium': return 'Premium 24/7 Monitoring';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading monitoring services...</p>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'builder') {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Monitoring services are available to builders only.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Camera className="h-5 w-5" />
            Project Monitoring Services
          </CardTitle>
          <CardDescription>
            Request live streaming and analysis services for your construction projects with unique tracking IDs.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Request Form */}
        <Card>
          <CardHeader>
            <CardTitle>Request Monitoring Service</CardTitle>
            <CardDescription>
              Submit a request to monitor your building site remotely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter your project name"
              />
            </div>

            <div>
              <Label htmlFor="project-location">Project Location *</Label>
              <Input
                id="project-location"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="Complete address with landmarks"
              />
            </div>

            <div>
              <Label htmlFor="monitoring-type">Monitoring Type</Label>
              <select
                id="monitoring-type"
                value={monitoringType}
                onChange={(e) => setMonitoringType(e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="basic">Basic Monitoring (Camera + Basic Analytics)</option>
                <option value="comprehensive">Comprehensive (Camera + Material Analysis)</option>
                <option value="premium">Premium 24/7 (Full Analysis + AI Insights)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  min="7"
                  max="365"
                />
              </div>

              <div>
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="requirements">Special Requirements</Label>
              <Textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Any specific monitoring requirements or focus areas"
                rows={3}
              />
            </div>

            <Button 
              onClick={submitMonitoringRequest}
              disabled={requesting}
              className="w-full"
            >
              {requesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting Request...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Submit Monitoring Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Active Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Your Monitoring Requests</CardTitle>
            <CardDescription>
              Track your submitted monitoring requests and access live streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No monitoring requests yet</p>
                </div>
              ) : (
                activeRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{request.project_name}</h4>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {request.project_location}
                        </div>
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          <span className="font-mono font-semibold text-primary">
                            {request.unique_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {getMonitoringTypeLabel(request.monitoring_type)} - {request.duration_days} days
                        </div>
                      </div>

                      {request.status === 'active' && (
                        <div className="pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => window.open(`/monitoring/stream/${request.unique_id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Access Live Stream
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Stream Access */}
      {liveStreams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Live Project Analytics
            </CardTitle>
            <CardDescription>
              Real-time data and insights from your monitored projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liveStreams.map((stream, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Project ID: {stream.unique_id}</h4>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Eye className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Progress</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${stream.analytics_data.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {stream.analytics_data.progress_percentage}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Materials in Use</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stream.analytics_data.materials_used.map((material, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Last Activity</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(stream.analytics_data.last_activity).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">
                        <Monitor className="h-4 w-4 mr-2" />
                        Live View
                      </Button>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-800">Secure Monitoring System</h4>
              <p className="text-sm text-amber-700">
                All live streams are encrypted and access is restricted to authorized personnel only. 
                Unique project IDs ensure secure access to your project data. Camera feeds are 
                secured with end-to-end encryption and comply with privacy regulations.
              </p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                  <Lock className="h-3 w-3 mr-1" />
                  Encrypted Streams
                </Badge>
                <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure Access
                </Badge>
                <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                  <Eye className="h-3 w-3 mr-1" />
                  Privacy Protected
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringServiceRequest;