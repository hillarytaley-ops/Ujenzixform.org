/**
 * SECURE CAMERA ACCESS CONTROL
 * Role-based access to categorized physical cameras with project-specific security
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Shield, 
  Eye, 
  EyeOff,
  Lock,
  Unlock,
  MapPin,
  Plane,
  Home,
  Hammer,
  DoorOpen
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CameraInfo {
  id: string;
  name: string;
  category: 'entrance' | 'backyard' | 'drone' | 'foundation' | 'security' | 'overhead';
  projectId: string;
  isActive: boolean;
  location: string;
  streamUrl?: string;
  lastActivity: Date;
}

interface CameraAccessProps {
  userRole: string;
  userId?: string;
  builderId?: string;
  accessId?: string; // Unique builder access ID
  className?: string;
}

export const CameraAccessControl: React.FC<CameraAccessProps> = ({
  userRole,
  userId,
  builderId,
  accessId,
  className = ""
}) => {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Security check for camera access
  const canAccessCameras = userRole === 'admin' || (userRole === 'builder' && accessId);

  useEffect(() => {
    if (canAccessCameras) {
      fetchCameraList();
    } else {
      setLoading(false);
    }
  }, [canAccessCameras, accessId]);

  const fetchCameraList = async () => {
    try {
      // Simulate fetching cameras - in production, filter by project access
      const mockCameras: CameraInfo[] = [
        {
          id: 'cam-entrance-001',
          name: 'Main Gate Camera',
          category: 'entrance',
          projectId: 'proj-001',
          isActive: true,
          location: 'Main Entrance',
          lastActivity: new Date()
        },
        {
          id: 'cam-entrance-002',
          name: 'Secondary Gate',
          category: 'entrance',
          projectId: 'proj-001',
          isActive: true,
          location: 'Service Entrance',
          lastActivity: new Date()
        },
        {
          id: 'cam-backyard-001',
          name: 'Rear Compound',
          category: 'backyard',
          projectId: 'proj-001',
          isActive: true,
          location: 'Back Area',
          lastActivity: new Date()
        },
        {
          id: 'cam-drone-001',
          name: 'Aerial Overview',
          category: 'drone',
          projectId: 'proj-001',
          isActive: true,
          location: 'Mobile Drone',
          lastActivity: new Date()
        },
        {
          id: 'cam-foundation-001',
          name: 'Foundation West',
          category: 'foundation',
          projectId: 'proj-001',
          isActive: true,
          location: 'Block A Foundation',
          lastActivity: new Date()
        },
        {
          id: 'cam-foundation-002',
          name: 'Foundation East',
          category: 'foundation',
          projectId: 'proj-001',
          isActive: false,
          location: 'Block B Foundation',
          lastActivity: new Date(Date.now() - 300000)
        }
      ];

      // Filter cameras based on access rights
      let filteredCameras = mockCameras;
      if (userRole === 'builder' && accessId) {
        // In production, filter by projects linked to accessId
        filteredCameras = mockCameras.filter(cam => cam.projectId === 'proj-001');
      }

      setCameras(filteredCameras);
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const logCameraAccess = async (cameraId: string, action: string) => {
    try {
      await supabase.from('delivery_access_log').insert({
        action: `camera_${action}`,
        resource_type: 'physical_camera',
        resource_id: cameraId,
        user_id: userId
      });
    } catch (error) {
      console.warn('Camera access logging failed:', error);
    }
  };

  const handleCameraAccess = async (cameraId: string) => {
    await logCameraAccess(cameraId, 'view_request');
    setSelectedCamera(cameraId);
    setAccessGranted(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'entrance':
        return <DoorOpen className="h-4 w-4" />;
      case 'backyard':
        return <Home className="h-4 w-4" />;
      case 'drone':
        return <Plane className="h-4 w-4" />;
      case 'foundation':
        return <Hammer className="h-4 w-4" />;
      default:
        return <Camera className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'entrance':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'backyard':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'drone':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'foundation':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!canAccessCameras) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Camera access requires authorization</p>
            <Badge variant="outline" className="mt-2">
              {userRole} access insufficient
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-muted-foreground">Loading camera feeds...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group cameras by category
  const camerasByCategory = cameras.reduce((acc, camera) => {
    if (!acc[camera.category]) {
      acc[camera.category] = [];
    }
    acc[camera.category].push(camera);
    return acc;
  }, {} as Record<string, CameraInfo[]>);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Access Control Notice */}
      <Alert className="border-green-200 bg-green-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Secure Camera Access:</strong> {userRole === 'admin' ? 'Full administrative access to all cameras.' : `Project access via ID: ${accessId}`}
        </AlertDescription>
      </Alert>

      {/* Camera Categories */}
      {Object.entries(camerasByCategory).map(([category, categorycameras]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              {getCategoryIcon(category)}
              {category} Cameras
              <Badge variant="secondary" className={getCategoryColor(category)}>
                {categorycameras.filter(cam => cam.isActive).length} Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorycameras.map((camera) => (
              <div
                key={camera.id}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedCamera === camera.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{camera.name}</span>
                      {camera.isActive ? (
                        <Badge variant="default" className="text-xs">Live</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Offline</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {camera.location}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {camera.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCameraAccess(camera.id)}
                        className="h-8 px-3"
                      >
                        {selectedCamera === camera.id ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Viewing
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Live Stream Display */}
                {selectedCamera === camera.id && accessGranted && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-75">Secure Live Feed</p>
                          <p className="text-xs opacity-50 mt-1">{camera.name}</p>
                        </div>
                      </div>
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-red-500 text-white">LIVE</Badge>
                      </div>
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary">
                          {getCategoryIcon(camera.category)}
                          <span className="ml-1 capitalize">{camera.category}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Access Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-primary">
                {cameras.filter(cam => cam.isActive).length}
              </div>
              <div className="text-xs text-muted-foreground">Active Cameras</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-500">
                {Object.keys(camerasByCategory).length}
              </div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-500">
                {accessGranted ? '1' : '0'}
              </div>
              <div className="text-xs text-muted-foreground">Viewing</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-500">
                {cameras.filter(cam => cam.category === 'drone').length}
              </div>
              <div className="text-xs text-muted-foreground">Drones</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};