import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Eye, 
  Circle,
  Download,
  Share,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Shield,
  Car
} from "lucide-react";
import { BuilderMonitoringNotice } from "@/components/security/BuilderMonitoringNotice";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'recording' | 'maintenance';
  quality: '480p' | '720p' | '1080p' | '4K';
  viewers: number;
  uptime: string;
  lastActivity: Date;
  isRecording: boolean;
  hasAudio: boolean;
  batteryLevel?: number;
  signalStrength: number;
  streamUrl?: string;
}

interface ActivityEvent {
  id: string;
  cameraId: string;
  timestamp: Date;
  type: 'motion' | 'person' | 'vehicle' | 'safety_violation' | 'completion';
  description: string;
  confidence: number;
  thumbnail?: string;
}

interface SiteOverview {
  totalCameras: number;
  onlineCameras: number;
  recordingCameras: number;
  totalViewers: number;
  avgUptime: number;
  storageUsed: number;
  bandwidthUsage: number;
}

interface LiveSiteMonitorProps {
  userRole?: string;
  userId?: string;
}

export const LiveSiteMonitor: React.FC<LiveSiteMonitorProps> = ({ userRole, userId }) => {
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [overview, setOverview] = useState<SiteOverview>({
    totalCameras: 0,
    onlineCameras: 0,
    recordingCameras: 0,
    totalViewers: 0,
    avgUptime: 0,
    storageUsed: 0,
    bandwidthUsage: 0
  });
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const { toast } = useToast();

  // Check if user is admin (only admins can control cameras)
  const isAdmin = userRole === 'admin';
  const canControlCameras = isAdmin;

  useEffect(() => {
    loadCameraData();
    
    // Simulate real-time updates
    const interval = setInterval(loadCameraData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCameraData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockCameras: CameraFeed[] = [
        {
          id: 'cam-001',
          name: 'Main Entrance',
          location: 'Gate A - Security Checkpoint',
          status: 'online',
          quality: '1080p',
          viewers: 3,
          uptime: '2h 15m',
          lastActivity: new Date(),
          isRecording: true,
          hasAudio: true,
          signalStrength: 95,
          streamUrl: 'https://example.com/stream1'
        },
        {
          id: 'cam-002',
          name: 'Foundation Work Area',
          location: 'Block A - Foundation Site',
          status: 'recording',
          quality: '720p',
          viewers: 5,
          uptime: '4h 32m',
          lastActivity: new Date(),
          isRecording: true,
          hasAudio: false,
          signalStrength: 87,
          streamUrl: 'https://example.com/stream2'
        },
        {
          id: 'cam-003',
          name: 'Material Storage',
          location: 'Warehouse - Storage Area',
          status: 'online',
          quality: '1080p',
          viewers: 2,
          uptime: '1h 45m',
          lastActivity: new Date(Date.now() - 300000),
          isRecording: false,
          hasAudio: true,
          batteryLevel: 78,
          signalStrength: 72,
          streamUrl: 'https://example.com/stream3'
        },
        {
          id: 'cam-004',
          name: 'Construction Zone',
          location: 'Block B - Active Construction',
          status: 'offline',
          quality: '480p',
          viewers: 0,
          uptime: '0m',
          lastActivity: new Date(Date.now() - 1800000),
          isRecording: false,
          hasAudio: false,
          batteryLevel: 15,
          signalStrength: 23,
        }
      ];

      const mockActivities: ActivityEvent[] = [
        {
          id: 'act-001',
          cameraId: 'cam-001',
          timestamp: new Date(),
          type: 'person',
          description: 'Worker entered construction zone',
          confidence: 0.92
        },
        {
          id: 'act-002',
          cameraId: 'cam-002',
          timestamp: new Date(Date.now() - 300000),
          type: 'completion',
          description: 'Foundation concrete pour completed',
          confidence: 0.88
        },
        {
          id: 'act-003',
          cameraId: 'cam-003',
          timestamp: new Date(Date.now() - 600000),
          type: 'vehicle',
          description: 'Delivery truck arrived at material storage',
          confidence: 0.95
        },
        {
          id: 'act-004',
          cameraId: 'cam-002',
          timestamp: new Date(Date.now() - 900000),
          type: 'safety_violation',
          description: 'Worker without safety helmet detected',
          confidence: 0.76
        }
      ];

      const mockOverview: SiteOverview = {
        totalCameras: mockCameras.length,
        onlineCameras: mockCameras.filter(c => c.status === 'online' || c.status === 'recording').length,
        recordingCameras: mockCameras.filter(c => c.isRecording).length,
        totalViewers: mockCameras.reduce((sum, c) => sum + c.viewers, 0),
        avgUptime: 94.5,
        storageUsed: 67.8,
        bandwidthUsage: 45.2
      };

      setCameras(mockCameras);
      setActivities(mockActivities);
      setOverview(mockOverview);
      
      if (mockCameras.length > 0 && !selectedCamera) {
        setSelectedCamera(mockCameras[0].id);
      }

    } catch (error: any) {
      console.error('Error loading camera data:', error);
      toast({
        title: "Error",
        description: "Failed to load camera data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = async (cameraId: string) => {
    // Only admins can control camera recording
    if (!canControlCameras) {
      toast({
        title: "Access Denied",
        description: "Only UjenziPro administrators can control camera recording",
        variant: "destructive"
      });
      return;
    }

    try {
      const camera = cameras.find(c => c.id === cameraId);
      if (!camera) return;

      const newRecordingState = !camera.isRecording;
      
      setCameras(cameras.map(c => 
        c.id === cameraId ? { ...c, isRecording: newRecordingState } : c
      ));

      toast({
        title: newRecordingState ? "Recording Started" : "Recording Stopped",
        description: `Camera ${camera.name} is now ${newRecordingState ? 'recording' : 'not recording'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle recording",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800 border-green-200';
      case 'recording': return 'bg-red-100 text-red-800 border-red-200';
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'motion': return <Move className="h-4 w-4" />;
      case 'person': return <Users className="h-4 w-4" />;
      case 'vehicle': return <Car className="h-4 w-4" />;
      case 'safety_violation': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'completion': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'safety_violation': return 'bg-red-100 text-red-800 border-red-200';
      case 'completion': return 'bg-green-100 text-green-800 border-green-200';
      case 'person': case 'vehicle': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedCameraData = cameras.find(c => c.id === selectedCamera);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
        <span className="ml-2">Loading camera feeds...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live Site Monitor</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Real-time construction site surveillance and monitoring" : "View live construction site feeds (View Only)"}
          </p>
          {!isAdmin && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                <Eye className="h-3 w-3 mr-1" />
                View Only Access
              </Badge>
              <span className="text-xs text-muted-foreground">Camera controls restricted to UjenziPro administrators</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {canControlCameras && (
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Camera Settings
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Builder Access Notice */}
      <BuilderMonitoringNotice userRole={userRole} />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cameras</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalCameras}</div>
            <p className="text-xs text-muted-foreground">
              {overview.onlineCameras} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recording</CardTitle>
            <Circle className="h-4 w-4 text-red-500 fill-current" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.recordingCameras}</div>
            <p className="text-xs text-muted-foreground">
              Active recordings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalViewers}</div>
            <p className="text-xs text-muted-foreground">
              Across all cameras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgUptime}%</div>
            <p className="text-xs text-muted-foreground">
              Average uptime
            </p>
          </CardContent>
        </Card>
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
                {cameras.map((camera) => (
                  <div
                    key={camera.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCamera === camera.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCamera(camera.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{camera.name}</span>
                      <Badge className={getStatusColor(camera.status)}>
                        {camera.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {camera.location}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span>{camera.quality}</span>
                        {camera.isRecording && <Circle className="h-3 w-3 text-red-500 fill-current" />}
                        {camera.hasAudio && <Volume2 className="h-3 w-3" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-3 w-3" />
                        <span>{camera.viewers}</span>
                        {camera.signalStrength && (
                          <>
                            <Signal className="h-3 w-3" />
                            <span>{camera.signalStrength}%</span>
                          </>
                        )}
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
                ))}
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
                  <CardTitle>{selectedCameraData?.name || 'Select Camera'}</CardTitle>
                  <CardDescription>{selectedCameraData?.location}</CardDescription>
                </div>
                {selectedCameraData && (
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedCameraData.status)}>
                      {selectedCameraData.status}
                    </Badge>
                    <Badge variant="outline">{selectedCameraData.quality}</Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedCameraData ? (
                <div className="space-y-4">
                  {/* Video Player */}
                  <div className="relative bg-black rounded-lg aspect-video">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {selectedCameraData.status === 'offline' ? (
                        <div className="text-white text-center">
                          <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Camera Offline</p>
                          <p className="text-sm opacity-75">Last seen: {format(selectedCameraData.lastActivity, 'HH:mm')}</p>
                        </div>
                      ) : (
                        <div className="text-white text-center">
                          <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Live Feed</p>
                          <p className="text-sm opacity-75">Streaming in {selectedCameraData.quality}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Video Controls Overlay - Admin Only Controls */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Basic viewing controls available to all users */}
                        <Button size="sm" variant="secondary">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary">
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => setIsMuted(!isMuted)}
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Camera controls - ADMIN ONLY */}
                        {canControlCameras ? (
                          <>
                            <Button 
                              size="sm" 
                              variant={selectedCameraData.isRecording ? "destructive" : "secondary"}
                              onClick={() => toggleRecording(selectedCameraData.id)}
                              title="Admin Only: Control Recording"
                            >
                              {selectedCameraData.isRecording ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="secondary" title="Admin Only: Zoom Control">
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="secondary" title="Admin Only: Camera Settings">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            View Only - Admin Controls
                          </div>
                        )}
                        <Button size="sm" variant="secondary">
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Camera Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>
                      <div className="font-medium">{selectedCameraData.uptime}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Viewers:</span>
                      <div className="font-medium">{selectedCameraData.viewers}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Signal:</span>
                      <div className="font-medium">{selectedCameraData.signalStrength}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Activity:</span>
                      <div className="font-medium">{format(selectedCameraData.lastActivity, 'HH:mm')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Select a Camera</p>
                    <p className="text-muted-foreground">Choose a camera from the list to view live feed</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>AI-detected events and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.description}</span>
                        <Badge className={getActivityColor(activity.type)}>
                          {activity.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{format(activity.timestamp, 'HH:mm:ss')}</span>
                        <span>Camera: {cameras.find(c => c.id === activity.cameraId)?.name}</span>
                        <span>Confidence: {Math.round(activity.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
