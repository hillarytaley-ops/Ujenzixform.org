import React, { useState, useEffect, useCallback } from 'react';
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
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Phone, 
  Navigation,
  Calendar,
  User,
  Building2,
  RefreshCw,
  Download,
  Eye,
  MessageSquare,
  Shield,
  QrCode
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Delivery {
  id: string;
  order_number: string;
  project_id: string;
  project_name: string;
  supplier_name: string;
  material_type: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'confirmed' | 'dispatched' | 'in_transit' | 'delivered' | 'completed';
  dispatch_date: string;
  estimated_delivery: string;
  actual_delivery?: string;
  delivery_location: string;
  tracking_updates: TrackingUpdate[];
  can_contact_driver: boolean;
  driver_contact_available: boolean;
}

interface TrackingUpdate {
  id: string;
  timestamp: string;
  status: string;
  message: string;
  location?: string;
  updated_by: string;
}

interface DeliveryAlert {
  id: string;
  delivery_id: string;
  type: 'delay' | 'arrival' | 'issue' | 'completed';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export const BuilderDeliveryTracker: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [alerts, setAlerts] = useState<DeliveryAlert[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadDeliveryData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadDeliveryData, 30000);
    return () => clearInterval(interval);
  }, [loadDeliveryData]);

  const loadDeliveryData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual Supabase queries
      const mockDeliveries: Delivery[] = [
        {
          id: 'del-1',
          order_number: 'PO-2024-001',
          project_id: 'proj-1',
          project_name: 'Westlands Commercial Complex',
          supplier_name: 'Bamburi Cement',
          material_type: 'Portland Cement 50kg',
          quantity: 100,
          unit: 'bags',
          status: 'in_transit',
          dispatch_date: '2024-10-08T08:00:00Z',
          estimated_delivery: '2024-10-08T16:00:00Z',
          delivery_location: 'Westlands Construction Site, Nairobi',
          can_contact_driver: true,
          driver_contact_available: true,
          tracking_updates: [
            {
              id: 'update-1',
              timestamp: '2024-10-08T08:00:00Z',
              status: 'dispatched',
              message: 'Order dispatched from supplier warehouse',
              location: 'Supplier Warehouse',
              updated_by: 'Supplier Team'
            },
            {
              id: 'update-2',
              timestamp: '2024-10-08T10:30:00Z',
              status: 'in_transit',
              message: 'Vehicle en route to delivery location',
              location: 'Uhuru Highway',
              updated_by: 'Driver'
            }
          ]
        },
        {
          id: 'del-2',
          order_number: 'PO-2024-002',
          project_id: 'proj-2',
          project_name: 'Karen Residential Villas',
          supplier_name: 'Devki Steel Mills',
          material_type: 'Steel Bars 12mm',
          quantity: 50,
          unit: 'pieces',
          status: 'delivered',
          dispatch_date: '2024-10-07T09:00:00Z',
          estimated_delivery: '2024-10-07T15:00:00Z',
          actual_delivery: '2024-10-07T14:45:00Z',
          delivery_location: 'Karen Construction Site, Nairobi',
          can_contact_driver: false,
          driver_contact_available: false,
          tracking_updates: [
            {
              id: 'update-3',
              timestamp: '2024-10-07T09:00:00Z',
              status: 'dispatched',
              message: 'Order dispatched',
              updated_by: 'Supplier Team'
            },
            {
              id: 'update-4',
              timestamp: '2024-10-07T14:45:00Z',
              status: 'delivered',
              message: 'Delivered successfully to site',
              location: 'Karen Construction Site',
              updated_by: 'Driver'
            }
          ]
        },
        {
          id: 'del-3',
          order_number: 'PO-2024-003',
          project_id: 'proj-1',
          project_name: 'Westlands Commercial Complex',
          supplier_name: 'Roofing Solutions Ltd',
          material_type: 'Roofing Sheets',
          quantity: 200,
          unit: 'sheets',
          status: 'confirmed',
          dispatch_date: '2024-10-09T00:00:00Z',
          estimated_delivery: '2024-10-10T00:00:00Z',
          delivery_location: 'Westlands Construction Site, Nairobi',
          can_contact_driver: false,
          driver_contact_available: false,
          tracking_updates: [
            {
              id: 'update-5',
              timestamp: '2024-10-08T16:00:00Z',
              status: 'confirmed',
              message: 'Order confirmed, preparing for dispatch',
              updated_by: 'Supplier Team'
            }
          ]
        }
      ];

      const mockAlerts: DeliveryAlert[] = [
        {
          id: 'alert-1',
          delivery_id: 'del-1',
          type: 'delay',
          severity: 'medium',
          message: 'Delivery experiencing traffic delays, ETA updated to 17:30',
          timestamp: '2024-10-08T15:00:00Z',
          acknowledged: false
        }
      ];

      setDeliveries(mockDeliveries);
      setAlerts(mockAlerts);
      
      if (mockDeliveries.length > 0) {
        setSelectedDelivery(mockDeliveries[0]);
      }

    } catch (error: unknown) {
      console.error('Error loading delivery data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load delivery data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

  const contactDriver = async (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    if (!delivery.can_contact_driver) {
      toast({
        title: "Contact Restricted",
        description: "Driver contact is only available during active delivery. Contact UjenziPro admin for assistance.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Contacting Driver",
      description: "Driver contact request has been sent. You will receive contact information shortly.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dispatched': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in_transit': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDeliveryProgress = (status: string) => {
    switch (status) {
      case 'pending': return 10;
      case 'confirmed': return 25;
      case 'dispatched': return 50;
      case 'in_transit': return 75;
      case 'delivered': return 90;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesStatus = filterStatus === 'all' || delivery.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      delivery.material_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading deliveries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delivery Tracking</h1>
          <p className="text-muted-foreground">Track material deliveries to your construction sites</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDeliveryData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Delivery Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => !a.acknowledged).length} delivery alerts require your attention.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deliveries List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search deliveries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDelivery?.id === delivery.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedDelivery(delivery)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{delivery.material_type}</span>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {delivery.supplier_name} → {delivery.project_name}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>{delivery.quantity} {delivery.unit}</span>
                      <span>{format(new Date(delivery.estimated_delivery), 'MMM dd')}</span>
                    </div>
                    <Progress value={getDeliveryProgress(delivery.status)} className="mt-2 h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <Card>
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
                      {format(new Date(alert.timestamp), 'HH:mm')}
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

        {/* Delivery Details */}
        <div className="lg:col-span-2">
          {selectedDelivery ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedDelivery.order_number}</CardTitle>
                      <CardDescription>{selectedDelivery.material_type}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(selectedDelivery.status)}>
                      {selectedDelivery.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Delivery Information</Label>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedDelivery.quantity} {selectedDelivery.unit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedDelivery.supplier_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedDelivery.project_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Timeline</Label>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Dispatched: {format(new Date(selectedDelivery.dispatch_date), 'MMM dd, HH:mm')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>ETA: {format(new Date(selectedDelivery.estimated_delivery), 'MMM dd, HH:mm')}</span>
                          </div>
                          {selectedDelivery.actual_delivery && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Delivered: {format(new Date(selectedDelivery.actual_delivery), 'MMM dd, HH:mm')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Delivery Location</span>
                    </div>
                    <p className="text-sm">{selectedDelivery.delivery_location}</p>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Delivery Progress</Label>
                    <div className="mt-2">
                      <Progress value={getDeliveryProgress(selectedDelivery.status)} className="h-3" />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>Confirmed</span>
                        <span>{getDeliveryProgress(selectedDelivery.status)}% Complete</span>
                        <span>Delivered</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectedDelivery.can_contact_driver ? (
                      <Button onClick={() => contactDriver(selectedDelivery.id)}>
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Driver
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        <Shield className="h-4 w-4 mr-2" />
                        Driver Contact Protected
                      </Button>
                    )}
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Supplier
                    </Button>
                    <Button variant="outline">
                      <QrCode className="h-4 w-4 mr-2" />
                      Scan Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Tracking Timeline</CardTitle>
                  <CardDescription>Real-time delivery updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedDelivery.tracking_updates.map((update, index) => (
                      <div key={update.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-primary' : 'bg-muted'
                          }`} />
                          {index < selectedDelivery.tracking_updates.length - 1 && (
                            <div className="w-0.5 h-8 bg-muted mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{update.status.replace('_', ' ')}</span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(update.timestamp), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{update.message}</p>
                          {update.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{update.location}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">by {update.updated_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Delivery</h3>
                  <p className="text-muted-foreground">Choose a delivery from the list to view tracking details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

