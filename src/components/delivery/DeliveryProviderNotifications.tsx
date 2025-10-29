import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  Truck,
  MapPin,
  Clock,
  Phone,
  Package,
  DollarSign,
  Navigation as NavigationIcon,
  CheckCircle,
  X,
  AlertTriangle,
  Volume2,
  Mail,
  MessageSquare
} from 'lucide-react';

interface DeliveryRequest {
  id: string;
  delivery_id: string;
  material_type: string;
  quantity: string;
  pickup_address: string;
  delivery_address: string;
  contact_name: string;
  contact_phone: string;
  preferred_date: string;
  preferred_time: string;
  urgency: 'normal' | 'urgent';
  estimated_cost: number;
  distance_km: number;
  status: 'pending' | 'assigned' | 'accepted' | 'rejected';
  created_at: string;
}

interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  sound: boolean;
  vibration: boolean;
}

export const DeliveryProviderNotifications: React.FC<{ providerId: string }> = ({ providerId }) => {
  const [notifications, setNotifications] = useState<DeliveryRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>({
    email: true,
    sms: true,
    push: true,
    sound: true,
    vibration: true
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    
    // Set up real-time subscription for new delivery requests
    const subscription = supabase
      .channel('delivery-requests')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'delivery_requests' 
        }, 
        (payload) => {
          handleNewDeliveryRequest(payload.new as DeliveryRequest);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [providerId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // In production, this would filter by provider's service area
      // For now, showing demo notifications
      const demoNotifications: DeliveryRequest[] = [
        {
          id: '1',
          delivery_id: 'DEL-001',
          material_type: 'Bamburi Cement 42.5N',
          quantity: '100 bags',
          pickup_address: 'Bamburi Cement Factory, Mombasa Road, Nairobi',
          delivery_address: 'Westlands Construction Site, Waiyaki Way, Nairobi',
          contact_name: 'John Kamau',
          contact_phone: '+254 712 345 678',
          preferred_date: new Date().toISOString().split('T')[0],
          preferred_time: '10:00 AM',
          urgency: 'urgent',
          estimated_cost: 8500,
          distance_km: 15,
          status: 'pending',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          delivery_id: 'DEL-002',
          material_type: 'Y12 Steel Bars',
          quantity: '2 tons',
          pickup_address: 'Devki Steel Mills, Athi River',
          delivery_address: 'Karen Residential Project, Karen',
          contact_name: 'Mary Wanjiku',
          contact_phone: '+254 723 456 789',
          preferred_date: new Date().toISOString().split('T')[0],
          preferred_time: '2:00 PM',
          urgency: 'normal',
          estimated_cost: 12000,
          distance_km: 25,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ];

      setNotifications(demoNotifications);
      setUnreadCount(demoNotifications.filter(n => n.status === 'pending').length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewDeliveryRequest = (request: DeliveryRequest) => {
    // Add to notifications list
    setNotifications(prev => [request, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Send alerts based on settings
    if (settings.sound) {
      playNotificationSound();
    }

    if (settings.push) {
      showBrowserNotification(request);
    }

    // Show toast notification
    toast({
      title: '🚚 New Delivery Request!',
      description: `${request.quantity} ${request.material_type} - ${request.distance_km}km - KES ${request.estimated_cost.toLocaleString()}`,
      duration: 10000,
    });

    // Send SMS (if enabled)
    if (settings.sms) {
      sendSMSNotification(request);
    }

    // Send Email (if enabled)
    if (settings.email) {
      sendEmailNotification(request);
    }
  };

  const playNotificationSound = () => {
    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Audio play prevented:', e));
  };

  const showBrowserNotification = (request: DeliveryRequest) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Delivery Request - UjenziPro', {
        body: `${request.quantity} ${request.material_type}\nFrom: ${request.pickup_address}\nDistance: ${request.distance_km}km\nPay: KES ${request.estimated_cost.toLocaleString()}`,
        icon: '/logo.png',
        badge: '/badge.png',
        tag: request.delivery_id,
        requireInteraction: true,
        vibrate: settings.vibration ? [200, 100, 200] : undefined
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const sendSMSNotification = async (request: DeliveryRequest) => {
    // In production, integrate with SMS gateway (e.g., Africa's Talking)
    console.log('SMS would be sent:', {
      to: 'provider_phone',
      message: `New delivery: ${request.quantity} ${request.material_type}, ${request.distance_km}km, KES ${request.estimated_cost}. Login to accept.`
    });
  };

  const sendEmailNotification = async (request: DeliveryRequest) => {
    // In production, send via email service
    console.log('Email would be sent:', {
      to: 'provider@email.com',
      subject: `New Delivery Request - ${request.delivery_id}`,
      body: `Details: ${JSON.stringify(request, null, 2)}`
    });
  };

  const handleAcceptDelivery = async (requestId: string) => {
    toast({
      title: 'Delivery Accepted',
      description: 'You have accepted this delivery request',
    });
    
    setNotifications(prev => 
      prev.map(n => n.id === requestId ? { ...n, status: 'accepted' as const } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleRejectDelivery = async (requestId: string) => {
    toast({
      title: 'Delivery Rejected',
      description: 'This delivery request has been declined',
    });
    
    setNotifications(prev => 
      prev.map(n => n.id === requestId ? { ...n, status: 'rejected' as const } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="space-y-6">
      {/* Header with notification count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Delivery Notifications</h2>
            <p className="text-muted-foreground">
              {unreadCount} new delivery {unreadCount === 1 ? 'request' : 'requests'}
            </p>
          </div>
        </div>
        <Badge variant={unreadCount > 0 ? 'default' : 'secondary'} className="text-lg px-4 py-2">
          {unreadCount} New
        </Badge>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Choose how you want to be alerted about new delivery requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email</span>
              </div>
              <Button 
                size="sm" 
                variant={settings.email ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, email: !prev.email }))}
              >
                {settings.email ? 'ON' : 'OFF'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">SMS</span>
              </div>
              <Button 
                size="sm" 
                variant={settings.sms ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, sms: !prev.sms }))}
              >
                {settings.sms ? 'ON' : 'OFF'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm">Push</span>
              </div>
              <Button 
                size="sm" 
                variant={settings.push ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, push: !prev.push }))}
              >
                {settings.push ? 'ON' : 'OFF'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Sound</span>
              </div>
              <Button 
                size="sm" 
                variant={settings.sound ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, sound: !prev.sound }))}
              >
                {settings.sound ? 'ON' : 'OFF'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Vibrate</span>
              </div>
              <Button 
                size="sm" 
                variant={settings.vibration ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, vibration: !prev.vibration }))}
              >
                {settings.vibration ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Delivery Requests */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Available Delivery Requests</h3>
        
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading delivery requests...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Requests</h3>
              <p className="text-muted-foreground">
                You'll be notified when new delivery requests match your service area
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((request) => (
            <Card 
              key={request.id}
              className={`${
                request.urgency === 'urgent' 
                  ? 'border-2 border-orange-500 bg-orange-50/50' 
                  : 'border border-gray-200'
              } ${
                request.status === 'pending' ? 'shadow-lg' : 'opacity-60'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Truck className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {request.delivery_id}
                        {request.urgency === 'urgent' && (
                          <Badge className="bg-orange-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            URGENT
                          </Badge>
                        )}
                        {request.status !== 'pending' && (
                          <Badge variant={request.status === 'accepted' ? 'default' : 'secondary'}>
                            {request.status}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <strong>{request.quantity}</strong> {request.material_type}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      KES {request.estimated_cost.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.distance_km}km trip
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Route Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <div className="text-sm font-medium">Pickup Location:</div>
                        <div className="text-sm text-muted-foreground">{request.pickup_address}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <div className="text-sm font-medium">Delivery Location:</div>
                        <div className="text-sm text-muted-foreground">{request.delivery_address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Contact</div>
                      <div className="text-sm font-medium">{request.contact_name}</div>
                      <div className="text-xs">{request.contact_phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Preferred Time</div>
                      <div className="text-sm font-medium">{request.preferred_date}</div>
                      <div className="text-xs">{request.preferred_time}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <NavigationIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Distance</div>
                      <div className="text-sm font-medium">{request.distance_km} km</div>
                      <div className="text-xs">~{Math.ceil(request.distance_km / 40)} hour trip</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAcceptDelivery(request.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Delivery
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleRejectDelivery(request.id)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                    <Button variant="outline">
                      <MapPin className="h-4 w-4 mr-2" />
                      View Route
                    </Button>
                  </div>
                )}

                {request.status === 'accepted' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>Delivery Accepted</AlertTitle>
                    <AlertDescription>
                      You've accepted this delivery. Contact {request.contact_name} at {request.contact_phone} for coordination.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Notification Channels Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            How You're Alerted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {settings.push && <CheckCircle className="h-4 w-4 text-green-600" />}
              <span>🔔 <strong>Browser Push Notifications</strong> - Instant alerts even when tab is closed</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.sms && <CheckCircle className="h-4 w-4 text-green-600" />}
              <span>📱 <strong>SMS Alerts</strong> - Text messages to your phone via Africa's Talking API</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.email && <CheckCircle className="h-4 w-4 text-green-600" />}
              <span>📧 <strong>Email Notifications</strong> - Detailed delivery request emails</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.sound && <CheckCircle className="h-4 w-4 text-green-600" />}
              <span>🔊 <strong>Sound Alerts</strong> - Audio notification when new request arrives</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.vibration && <CheckCircle className="h-4 w-4 text-green-600" />}
              <span>📳 <strong>Phone Vibration</strong> - Haptic feedback on mobile devices</span>
            </div>
          </div>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Real-Time Updates</AlertTitle>
            <AlertDescription>
              Connected to Supabase Realtime - you'll be notified instantly when new delivery requests are created in your service area.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

