import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin, 
  AlertTriangle,
  Info,
  X,
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DeliveryNotification {
  id: string;
  delivery_id: string;
  type: 'status_update' | 'location_update' | 'delay_alert' | 'arrival_notification' | 'completion';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  read: boolean;
  action_required: boolean;
  delivery_info: {
    tracking_number: string;
    material_type: string;
    status: string;
    location?: string;
    eta?: string;
  };
}

interface NotificationSettings {
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  sound_enabled: boolean;
  status_updates: boolean;
  location_updates: boolean;
  delay_alerts: boolean;
  arrival_notifications: boolean;
}

interface DeliveryNotificationSystemProps {
  userId?: string;
  userRole?: string;
  embedded?: boolean;
}

export const DeliveryNotificationSystem: React.FC<DeliveryNotificationSystemProps> = ({ 
  userId,
  userRole = 'builder',
  embedded = false 
}) => {
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    sound_enabled: true,
    status_updates: true,
    location_updates: true,
    delay_alerts: true,
    arrival_notifications: true
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadSettings();
    
    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel('delivery_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'delivery_notifications' },
        (payload) => {
          handleNewNotification(payload.new as DeliveryNotification);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Mock notifications data - in production this would come from database
      const mockNotifications: DeliveryNotification[] = [
        {
          id: 'notif-001',
          delivery_id: 'del-001',
          type: 'status_update',
          title: 'Delivery Dispatched',
          message: 'Your cement delivery has been dispatched and is on the way',
          priority: 'medium',
          timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          read: false,
          action_required: false,
          delivery_info: {
            tracking_number: 'UJP-001-2024',
            material_type: 'Cement',
            status: 'dispatched',
            location: 'Nairobi Industrial Area',
            eta: '14:30'
          }
        },
        {
          id: 'notif-002',
          delivery_id: 'del-002',
          type: 'delay_alert',
          title: 'Delivery Delayed',
          message: 'Steel bars delivery delayed due to traffic. New ETA: 16:00',
          priority: 'high',
          timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          read: false,
          action_required: true,
          delivery_info: {
            tracking_number: 'UJP-002-2024',
            material_type: 'Steel Bars',
            status: 'delayed',
            location: 'Thika Road',
            eta: '16:00'
          }
        },
        {
          id: 'notif-003',
          delivery_id: 'del-003',
          type: 'arrival_notification',
          title: 'Delivery Arriving Soon',
          message: 'Building blocks delivery will arrive in 10 minutes',
          priority: 'high',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          read: false,
          action_required: true,
          delivery_info: {
            tracking_number: 'UJP-003-2024',
            material_type: 'Building Blocks',
            status: 'arriving',
            location: '2 km away',
            eta: '13:45'
          }
        },
        {
          id: 'notif-004',
          delivery_id: 'del-004',
          type: 'completion',
          title: 'Delivery Completed',
          message: 'Sand delivery has been completed successfully',
          priority: 'medium',
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          read: true,
          action_required: false,
          delivery_info: {
            tracking_number: 'UJP-004-2024',
            material_type: 'Sand',
            status: 'completed',
            location: 'Westlands Site'
          }
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);

    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // In production, load from user preferences
      // For now, using default settings
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNewNotification = (notification: DeliveryNotification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
    });

    // Play sound if enabled
    if (settings.sound_enabled) {
      // In production, play notification sound
      console.log('Playing notification sound');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // In production, update database
      console.log('Marking notification as read:', notificationId);

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: 'All notifications marked as read',
        description: 'Your notification list has been cleared',
      });

    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: 'Notification deleted',
        description: 'Notification has been removed',
      });

    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'status_update': return <Truck className="h-4 w-4" />;
      case 'location_update': return <MapPin className="h-4 w-4" />;
      case 'delay_alert': return <AlertTriangle className="h-4 w-4" />;
      case 'arrival_notification': return <BellRing className="h-4 w-4" />;
      case 'completion': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (embedded) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Delivery Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id}
                className={`p-3 border rounded-lg ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getTypeIcon(notification.type)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-muted-foreground">{notification.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.timestamp), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Delivery Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {unreadCount} New
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Real-time updates on your delivery status and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Notification Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure how you receive delivery notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Notification Channels</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span className="text-sm">Push Notifications</span>
                    </div>
                    <Button
                      variant={settings.push_notifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, push_notifications: !prev.push_notifications }))}
                    >
                      {settings.push_notifications ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">Email Notifications</span>
                    </div>
                    <Button
                      variant={settings.email_notifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, email_notifications: !prev.email_notifications }))}
                    >
                      {settings.email_notifications ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">SMS Notifications</span>
                    </div>
                    <Button
                      variant={settings.sms_notifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, sms_notifications: !prev.sms_notifications }))}
                    >
                      {settings.sms_notifications ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Notification Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status Updates</span>
                    <Button
                      variant={settings.status_updates ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, status_updates: !prev.status_updates }))}
                    >
                      {settings.status_updates ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Location Updates</span>
                    <Button
                      variant={settings.location_updates ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, location_updates: !prev.location_updates }))}
                    >
                      {settings.location_updates ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delay Alerts</span>
                    <Button
                      variant={settings.delay_alerts ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, delay_alerts: !prev.delay_alerts }))}
                    >
                      {settings.delay_alerts ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Arrival Notifications</span>
                    <Button
                      variant={settings.arrival_notifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, arrival_notifications: !prev.arrival_notifications }))}
                    >
                      {settings.arrival_notifications ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card 
            key={notification.id}
            className={`transition-all ${
              !notification.read 
                ? 'border-primary/20 bg-primary/5 shadow-md' 
                : 'hover:shadow-md'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`rounded-full p-2 ${getPriorityColor(notification.priority)}`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{notification.title}</h4>
                      <Badge className={getPriorityColor(notification.priority)}>
                        {notification.priority}
                      </Badge>
                      {notification.action_required && (
                        <Badge className="bg-orange-100 text-orange-800">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Tracking: {notification.delivery_info.tracking_number}</span>
                      <span>Material: {notification.delivery_info.material_type}</span>
                      <span>{format(new Date(notification.timestamp), 'MMM dd, HH:mm')}</span>
                    </div>

                    {notification.delivery_info.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{notification.delivery_info.location}</span>
                        {notification.delivery_info.eta && (
                          <>
                            <Clock className="h-3 w-3 ml-2" />
                            <span>ETA: {notification.delivery_info.eta}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
            <p className="text-muted-foreground">
              You'll receive notifications here when there are updates to your deliveries.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryNotificationSystem;















