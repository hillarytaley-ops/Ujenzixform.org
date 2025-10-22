import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plane, 
  MapPin, 
  Battery, 
  Camera, 
  Radio, 
  AlertTriangle,
  Eye,
  Navigation,
  Signal
} from "lucide-react";

interface DroneData {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'maintenance' | 'offline';
  battery: number;
  altitude: number;
  location: { lat: number; lng: number };
  signal: number;
  cameraActive: boolean;
  flightTime: number;
  maxFlightTime: number;
  projectId?: string;
  assignedBuilderIds?: string[];
}

interface DroneMonitorProps {
  userRole?: string | null;
  user?: any;
  builderUniqueNumber?: string | null;
  selectedProjects?: string[];
}

const DroneMonitor: React.FC<DroneMonitorProps> = ({ userRole, user, builderUniqueNumber, selectedProjects = [] }) => {
  const [drones, setDrones] = useState<DroneData[]>([
    {
      id: 'drone-001',
      name: 'Sky Guardian 1',
      status: 'active',
      battery: 78,
      altitude: 120,
      location: { lat: -1.2921, lng: 36.8219 },
      signal: 95,
      cameraActive: true,
      flightTime: 18,
      maxFlightTime: 45,
      projectId: 'project-001',
      assignedBuilderIds: ['builder-001']
    },
    {
      id: 'drone-002', 
      name: 'Sky Guardian 2',
      status: 'standby',
      battery: 92,
      altitude: 0,
      location: { lat: -1.2921, lng: 36.8219 },
      signal: 88,
      cameraActive: false,
      flightTime: 0,
      maxFlightTime: 45,
      projectId: 'project-002',
      assignedBuilderIds: ['builder-002']
    },
    {
      id: 'drone-003',
      name: 'Sky Guardian 3', 
      status: 'maintenance',
      battery: 15,
      altitude: 0,
      location: { lat: -1.2921, lng: 36.8219 },
      signal: 0,
      cameraActive: false,
      flightTime: 0,
      maxFlightTime: 45,
      projectId: 'project-003',
      assignedBuilderIds: ['builder-003']
    }
  ]);

  // Filter drones based on user role, access, and selected projects
  const accessibleDrones = useMemo(() => {
    let filtered = drones;
    
    // First filter by user permissions
    if (userRole === 'admin') {
      filtered = drones; // Admin can see and control all drones
    } else if (userRole === 'builder' && user) {
      // Builders can only view drones assigned to their projects (read-only)
      filtered = drones.filter(drone => 
        drone.assignedBuilderIds?.includes(user.id) || 
        (drone.projectId && user.projects?.includes(drone.projectId))
      );
    } else {
      return []; // Other roles have no access
    }
    
    // Then filter by selected projects if any are specified
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(drone => 
        drone.projectId && selectedProjects.includes(drone.projectId)
      );
    }
    
    return filtered;
  }, [drones, userRole, user, selectedProjects]);

  // Check if user can control drones (admin only)
  const canControlDrones = userRole === 'admin';

  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'standby': return 'bg-yellow-500';
      case 'maintenance': return 'bg-orange-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'standby': return 'secondary';
      case 'maintenance': return 'destructive';
      case 'offline': return 'destructive';
      default: return 'secondary';
    }
  };

  const controlDrone = (droneId: string, action: string) => {
    setDrones(prevDrones => 
      prevDrones.map(drone => {
        if (drone.id === droneId) {
          switch (action) {
            case 'launch':
              return { ...drone, status: 'active' as const, altitude: 100, cameraActive: true };
            case 'land':
              return { ...drone, status: 'standby' as const, altitude: 0, cameraActive: false, flightTime: 0 };
            case 'toggleCamera':
              return { ...drone, cameraActive: !drone.cameraActive };
            case 'setAltitude':
              return { ...drone, altitude: Math.min(drone.altitude + 20, 200) };
            case 'lowerAltitude':
              return { ...drone, altitude: Math.max(drone.altitude - 20, 0) };
            case 'returnToBase':
              return { ...drone, status: 'standby' as const, altitude: 0, flightTime: 0 };
            case 'emergencyLand':
              return { ...drone, status: 'maintenance' as const, altitude: 0, cameraActive: false, flightTime: 0 };
            default:
              return drone;
          }
        }
        return drone;
      })
    );
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDrones(prevDrones => 
        prevDrones.map(drone => {
          if (drone.status === 'active') {
            return {
              ...drone,
              flightTime: Math.min(drone.flightTime + 1, drone.maxFlightTime),
              battery: Math.max(drone.battery - 0.5, 0),
              signal: 85 + Math.random() * 15 // Simulate signal fluctuation
            };
          }
          return drone;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Aerial Monitoring - Drone Fleet</h2>
        </div>
        <Badge variant="secondary" className="text-sm">
          {accessibleDrones.filter(d => d.status === 'active').length} Active Drones
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleDrones.map((drone) => (
          <Card 
            key={drone.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedDrone === drone.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedDrone(drone.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{drone.name}</CardTitle>
                <Badge variant={getStatusVariant(drone.status)}>
                  {drone.status.toUpperCase()}
                </Badge>
              </div>
              <CardDescription>{drone.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Battery Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Battery className="h-4 w-4" />
                    <span className="text-sm">Battery</span>
                  </div>
                  <span className="text-sm font-medium">{drone.battery}%</span>
                </div>
                <Progress value={drone.battery} className="h-2" />
              </div>

              {/* Flight Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-gray-500" />
                  <span>Alt: {drone.altitude}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-gray-500" />
                  <span>Signal: {Math.round(drone.signal)}%</span>
                </div>
              </div>

              {/* Flight Time */}
              {drone.status === 'active' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Flight Time</span>
                    <span>{drone.flightTime}/{drone.maxFlightTime} min</span>
                  </div>
                  <Progress 
                    value={(drone.flightTime / drone.maxFlightTime) * 100} 
                    className="h-2" 
                  />
                </div>
              )}

              {/* Camera Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">Camera</span>
                </div>
                <Badge variant={drone.cameraActive ? 'default' : 'secondary'}>
                  {drone.cameraActive ? 'Recording' : 'Standby'}
                </Badge>
              </div>

              {/* Controls - Admin Only */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {canControlDrones ? (
                  <>
                    {drone.status === 'standby' && (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          controlDrone(drone.id, 'launch');
                        }}
                        className="text-xs"
                      >
                        Launch
                      </Button>
                    )}
                    {drone.status === 'active' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlDrone(drone.id, 'land');
                          }}
                          className="text-xs"
                        >
                          Land
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlDrone(drone.id, 'toggleCamera');
                          }}
                          className="text-xs"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          {drone.cameraActive ? 'Stop' : 'Start'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlDrone(drone.id, 'setAltitude');
                          }}
                          className="text-xs"
                        >
                          ↑ Alt
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlDrone(drone.id, 'lowerAltitude');
                          }}
                          className="text-xs"
                        >
                          ↓ Alt
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlDrone(drone.id, 'returnToBase');
                          }}
                          className="text-xs col-span-2"
                        >
                          Return to Base
                        </Button>
                      </>
                    )}
                    {drone.status === 'maintenance' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="text-xs col-span-2"
                        disabled
                      >
                        Under Maintenance
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="col-span-2 text-center text-xs text-muted-foreground py-2">
                    Drone controls restricted to administrators
                  </div>
                )}
              </div>

              {/* Warnings */}
              {drone.battery < 20 && (
                <div className="flex items-center gap-2 text-orange-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Low battery - Return to base</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Feed Section */}
      {selectedDrone && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Aerial Feed - {accessibleDrones.find(d => d.id === selectedDrone)?.name}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-600">LIVE</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Drone Camera Feed</p>
                <p className="text-sm opacity-75">Construction Site Aerial View</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium">Coverage Area</p>
                <p className="text-gray-600">2.5 sq km</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Resolution</p>
                <p className="text-gray-600">4K Ultra HD</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Zoom Level</p>
                <p className="text-gray-600">12x Optical</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Recording</p>
                <p className="text-green-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DroneMonitor;