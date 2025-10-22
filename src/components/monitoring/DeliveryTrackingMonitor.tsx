import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  Navigation, 
  Battery, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  User,
  Calendar,
  Route,
  Thermometer,
  Shield,
  RefreshCw,
  Download,
  Eye,
  MessageSquare,
  Bell,
  Play,
  Pause,
  Car
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: 'idle' | 'loading' | 'in_transit' | 'delivering' | 'returning' | 'offline';
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destination?: {
    lat: number;
    lng: number;
    address: string;
  };
  batteryLevel: number;
  signalStrength: number;
  speed: number;
  fuelLevel: number;
  temperature: number;
  lastUpdate: Date;
  orderId?: string;
  orderValue?: number;
  estimatedArrival?: Date;
  route?: {
    distance: number;
    duration: number;
    traffic: 'light' | 'moderate' | 'heavy';
  };
}

interface DeliveryAlert {
  id: string;
  vehicleId: string;
  type: 'delay' | 'route_deviation' | 'emergency' | 'maintenance' | 'battery_low';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface TrackingMetrics {
  totalVehicles: number;
  activeDeliveries: number;
  onTimeDeliveries: number;
  avgDeliveryTime: number;
  fuelEfficiency: number;
  customerSatisfaction: number;
}

interface DeliveryTrackingMonitorProps {
  userRole?: string;
  userId?: string;
}

export const DeliveryTrackingMonitor: React.FC<DeliveryTrackingMonitorProps> = ({ userRole, userId }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<DeliveryAlert[]>([]);
  const [metrics, setMetrics] = useState<TrackingMetrics>({
    totalVehicles: 0,
    activeDeliveries: 0,
    onTimeDeliveries: 0,
    avgDeliveryTime: 0,
    fuelEfficiency: 0,
    customerSatisfaction: 0
  });
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(true);
  const { toast } = useToast();

  // CRITICAL SECURITY: Only admins can access delivery tracking
  const isAdmin = userRole === 'admin';
  const canAccessTracking = isAdmin;

  useEffect(() => {
    loadTrackingData();
    
    if (isTracking) {
      const interval = setInterval(loadTrackingData, 15000); // Update every 15 seconds
      return () => clearInterval(interval);
    }
  }, [isTracking]);

  const loadTrackingData = async () => {
    // SECURITY CHECK: Only admins can access delivery tracking data
    if (!canAccessTracking) {
      toast({
        title: "Access Restricted",
        description: "Delivery tracking is restricted to UjenziPro administrators only.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Mock data - replace with actual GPS tracking API
      const mockVehicles: Vehicle[] = [
        {
          id: 'vehicle-001',
          vehicleNumber: 'KCA-123A',
          driverName: 'John Mwangi',
          driverPhone: '+254712345678',
          status: 'in_transit',
          currentLocation: {
            lat: -1.2921,
            lng: 36.8219,
            address: 'Uhuru Highway, Nairobi'
          },
          destination: {
            lat: -1.2630,
            lng: 36.8063,
            address: 'Westlands Construction Site'
          },
          batteryLevel: 78,
          signalStrength: 85,
          speed: 45,
          fuelLevel: 67,
          temperature: 28,
          lastUpdate: new Date(),
          orderId: 'ORD-001',
          orderValue: 125000,
          estimatedArrival: new Date(Date.now() + 1800000), // 30 minutes
          route: {
            distance: 12.5,
            duration: 25,
            traffic: 'moderate'
          }
        },
        {
          id: 'vehicle-002',
          vehicleNumber: 'KBZ-456B',
          driverName: 'Mary Wanjiku',
          driverPhone: '+254723456789',
          status: 'delivering',
          currentLocation: {
            lat: -1.3032,
            lng: 36.8083,
            address: 'Kilimani Road, Nairobi'
          },
          destination: {
            lat: -1.3032,
            lng: 36.8083,
            address: 'Kilimani Residential Project'
          },
          batteryLevel: 92,
          signalStrength: 78,
          speed: 0,
          fuelLevel: 45,
          temperature: 32,
          lastUpdate: new Date(),
          orderId: 'ORD-002',
          orderValue: 89000,
          estimatedArrival: new Date(), // Arrived
          route: {
            distance: 0,
            duration: 0,
            traffic: 'light'
          }
        },
        {
          id: 'vehicle-003',
          vehicleNumber: 'KCD-789C',
          driverName: 'Peter Kamau',
          driverPhone: '+254734567890',
          status: 'offline',
          currentLocation: {
            lat: -1.2500,
            lng: 36.8000,
            address: 'Unknown Location'
          },
          batteryLevel: 23,
          signalStrength: 15,
          speed: 0,
          fuelLevel: 78,
          temperature: 35,
          lastUpdate: new Date(Date.now() - 1800000), // 30 minutes ago
          orderId: 'ORD-003',
          orderValue: 67000
        }
      ];

      const mockAlerts: DeliveryAlert[] = [
        {
          id: 'alert-001',
          vehicleId: 'vehicle-003',
          type: 'battery_low',
          severity: 'high',
          message: 'Vehicle KCD-789C battery level critically low (23%)',
          timestamp: new Date(),
          acknowledged: false
        },
        {
          id: 'alert-002',
          vehicleId: 'vehicle-001',
          type: 'delay',
          severity: 'medium',
          message: 'Vehicle KCA-123A experiencing traffic delays',
          timestamp: new Date(Date.now() - 600000),
          acknowledged: true
        }
      ];

      const mockMetrics: TrackingMetrics = {
        totalVehicles: mockVehicles.length,
        activeDeliveries: mockVehicles.filter(v => ['in_transit', 'delivering'].includes(v.status)).length,
        onTimeDeliveries: 94,
        avgDeliveryTime: 45,
        fuelEfficiency: 12.5,
        customerSatisfaction: 4.7
      };

      setVehicles(mockVehicles);
      setAlerts(mockAlerts);
      setMetrics(mockMetrics);
      
      if (mockVehicles.length > 0 && !selectedVehicle) {
        setSelectedVehicle(mockVehicles[0].id);
      }

    } catch (error: any) {
      console.error('Error loading tracking data:', error);
      toast({
        title: "Error",
        description: "Failed to load tracking data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'loading': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_transit': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivering': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'returning': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'offline': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'light': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'heavy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
      
      toast({
        title: "Alert Acknowledged",
        description: "Delivery alert has been acknowledged",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const contactDriver = async (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    toast({
      title: "Contacting Driver",
      description: `Calling ${vehicle.driverName} at ${vehicle.driverPhone}`,
    });
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  // Access denied UI for non-admin users
  if (!canAccessTracking) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Restricted - Admin Only</AlertTitle>
          <AlertDescription>
            <strong>CRITICAL SECURITY:</strong> Delivery tracking system including vehicle locations, 
            driver information, and fleet management is restricted to UjenziPro administrators only.
            <br /><br />
            <strong>Builders and Suppliers:</strong> You do not have access to delivery provider tracking 
            for security and privacy protection.
          </AlertDescription>
        </Alert>
        
        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Lock className="h-5 w-5" />
              Delivery Tracking Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-red-800">
              <p><strong>Your Role:</strong> {userRole || 'Unknown'}</p>
              <p><strong>Required Role:</strong> UjenziPro Administrator</p>
              <p><strong>Feature:</strong> Delivery Provider Tracking System</p>
            </div>
            
            <div className="mt-4 p-3 bg-red-100 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Security Restrictions:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Protect delivery provider and driver privacy</li>
                    <li>• Prevent unauthorized vehicle tracking</li>
                    <li>• Maintain operational security</li>
                    <li>• Comply with data protection laws</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading delivery tracking...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delivery Tracking Monitor</h1>
          <p className="text-muted-foreground">Real-time vehicle and delivery tracking</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTracking(!isTracking)}
          >
            {isTracking ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Tracking
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Tracking
              </>
            )}
          </Button>
          <Button variant="outline" onClick={loadTrackingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              Fleet size
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Currently delivering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onTimeDeliveries}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgDeliveryTime}min</div>
            <p className="text-xs text-muted-foreground">
              Average duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Delivery Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length} critical delivery alerts require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Status</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedVehicle === vehicle.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{vehicle.vehicleNumber}</span>
                      <Badge className={getStatusColor(vehicle.status)}>
                        {vehicle.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {vehicle.driverName}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Battery className="h-3 w-3" />
                        <span>{vehicle.batteryLevel}%</span>
                        <Wifi className="h-3 w-3" />
                        <span>{vehicle.signalStrength}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span>{vehicle.speed} km/h</span>
                      </div>
                    </div>
                    {vehicle.batteryLevel < 30 && (
                      <div className="mt-2">
                        <Progress value={vehicle.batteryLevel} className="h-1" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Delivery Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.filter(a => !a.acknowledged).map((alert) => (
                  <div key={alert.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <Badge className={getAlertColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(alert.timestamp, 'HH:mm')} - {vehicles.find(v => v.id === alert.vehicleId)?.vehicleNumber}
                    </p>
                  </div>
                ))}
                
                {alerts.filter(a => !a.acknowledged).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No active alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Details */}
        <div className="lg:col-span-2">
          {selectedVehicleData ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedVehicleData.vehicleNumber}</CardTitle>
                      <CardDescription>Driver: {selectedVehicleData.driverName}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(selectedVehicleData.status)}>
                      {selectedVehicleData.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Map Placeholder */}
                  <div className="bg-muted rounded-lg h-64 flex items-center justify-center mb-4">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">Live GPS Tracking</p>
                      <p className="text-muted-foreground">{selectedVehicleData.currentLocation.address}</p>
                      {selectedVehicleData.destination && (
                        <p className="text-sm text-muted-foreground mt-2">
                          → {selectedVehicleData.destination.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Battery</p>
                        <p className="font-medium">{selectedVehicleData.batteryLevel}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Signal</p>
                        <p className="font-medium">{selectedVehicleData.signalStrength}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Speed</p>
                        <p className="font-medium">{selectedVehicleData.speed} km/h</p>
                      </div>
                    </div>
                    
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Fuel</p>
                          <p className="font-medium">{selectedVehicleData.fuelLevel}%</p>
                        </div>
                      </div>
                  </div>

                  {/* Route Information */}
                  {selectedVehicleData.route && (
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-medium mb-3">Route Information</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Distance:</span>
                          <div className="font-medium">{selectedVehicleData.route.distance} km</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">{selectedVehicleData.route.duration} min</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Traffic:</span>
                          <div className={`font-medium ${getTrafficColor(selectedVehicleData.route.traffic)}`}>
                            {selectedVehicleData.route.traffic}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => contactDriver(selectedVehicleData.id)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Contact Driver
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View Route
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Vehicle</h3>
                  <p className="text-muted-foreground">Choose a vehicle from the fleet to view tracking details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
