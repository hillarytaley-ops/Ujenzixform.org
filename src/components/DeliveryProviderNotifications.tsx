import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Truck, MapPin, Package, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface DeliveryNotification {
  id: string;
  request_type: string;
  pickup_address: string;
  delivery_address: string;
  material_details: any[];
  special_instructions: string;
  priority_level: string;
  created_at: string;
  distance_km?: number;
  builder_name?: string;
}

interface ProviderResponse {
  notification_id: string;
  response: 'accept' | 'reject';
  response_message: string;
  estimated_cost: number;
  estimated_duration_hours: number;
}

const DeliveryProviderNotifications = () => {
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<DeliveryNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);

  // Response form state
  const [responseType, setResponseType] = useState<'accept' | 'reject' | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);

  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (providerProfile) {
      fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('delivery-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'delivery_communications',
            filter: 'message_type=eq.delivery_request'
          },
          () => {
            fetchNotifications(); // Refresh notifications when new ones arrive
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [providerProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);

        if (profile) {
          const { data: provider } = await supabase
            .from('delivery_providers')
            .select('*')
            .eq('user_id', profile.id)
            .single();
          
          setProviderProfile(provider);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Get delivery communications for this provider
      const { data: communications, error } = await supabase
        .from('delivery_communications')
        .select('*')
        .eq('message_type', 'delivery_request')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform communications to notifications
      const notificationsData = (communications || []).map(comm => {
        const metadata = comm.metadata as any || {};
        return {
          id: metadata.notification_id || comm.id,
          request_type: metadata.request_type || 'unknown',
          pickup_address: metadata.pickup_address || 'Not specified',
          delivery_address: metadata.delivery_address || 'Not specified',
          material_details: metadata.material_details || [],
          special_instructions: comm.content || '',
          priority_level: metadata.priority_level || 'normal',
          created_at: comm.created_at,
          distance_km: metadata.distance_km,
          builder_name: comm.sender_name
        };
      });

      // Filter out notifications that this provider has already responded to
      const { data: existingResponses } = await supabase
        .from('delivery_provider_responses')
        .select('notification_id')
        .eq('provider_id', providerProfile.id);

      const respondedIds = new Set(existingResponses?.map(r => r.notification_id) || []);
      const unrespondedNotifications = notificationsData.filter(n => !respondedIds.has(n.id));

      setNotifications(unrespondedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!selectedNotification || !responseType) {
      toast({
        title: "Validation Error",
        description: "Please select a response type.",
        variant: "destructive",
      });
      return;
    }

    if (responseType === 'accept' && estimatedCost <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide estimated cost for accepted deliveries.",
        variant: "destructive",
      });
      return;
    }

    try {
      setResponding(true);

      const { error } = await supabase
        .from('delivery_provider_responses')
        .insert({
          notification_id: selectedNotification.id,
          provider_id: providerProfile.id,
          response: responseType,
          response_message: responseMessage,
          estimated_cost: responseType === 'accept' ? estimatedCost : null,
          estimated_duration_hours: responseType === 'accept' ? estimatedDuration : null,
          distance_km: selectedNotification.distance_km
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Delivery request ${responseType === 'accept' ? 'accepted' : 'declined'} successfully.`,
      });

      // Reset form
      setSelectedNotification(null);
      setResponseType(null);
      setResponseMessage('');
      setEstimatedCost(0);
      setEstimatedDuration(0);

      // Refresh notifications
      fetchNotifications();

    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: "Error",
        description: "Failed to submit response.",
        variant: "destructive",
      });
    } finally {
      setResponding(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      normal: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      high: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      urgent: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const { color, icon: Icon } = config[priority as keyof typeof config] || config.normal;
    return (
      <Badge className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  if (!userProfile || !providerProfile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access restricted to registered delivery providers only.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Provider Dashboard
          </CardTitle>
          <CardDescription>
            Welcome, {providerProfile.provider_name}! 
            {providerProfile.is_verified ? ' You are verified and can receive delivery requests.' : ' Please complete verification to receive requests.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Delivery Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Available Delivery Requests
          </CardTitle>
          <CardDescription>
            Nearby delivery requests prioritized by distance and urgency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading delivery requests...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No delivery requests available in your area.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedNotification?.id === notification.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedNotification(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">Delivery Request</h4>
                          {getPriorityBadge(notification.priority_level)}
                          {notification.distance_km && (
                            <Badge variant="outline">
                              {notification.distance_km.toFixed(1)} km away
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">From:</span>
                            <span>{notification.pickup_address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">To:</span>
                            <span>{notification.delivery_address}</span>
                          </div>
                          {notification.special_instructions && (
                            <div className="flex items-start gap-2">
                              <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">Instructions:</span>
                              <span>{notification.special_instructions}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Posted: {new Date(notification.created_at).toLocaleString()}
                          {notification.builder_name && ` • By: ${notification.builder_name}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Form */}
      {selectedNotification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Respond to Delivery Request
            </CardTitle>
            <CardDescription>
              Choose to accept or decline this delivery request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Request Details */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Request Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Distance:</span>
                  <p className="font-medium">{selectedNotification.distance_km?.toFixed(1)} km</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <p className="font-medium">{selectedNotification.priority_level}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Materials:</span>
                  <p className="font-medium">
                    {selectedNotification.material_details?.length > 0 
                      ? selectedNotification.material_details.map(m => m.material_type || m.description).join(', ')
                      : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Response Type */}
            <div className="space-y-4">
              <Label>Response</Label>
              <div className="flex gap-4">
                <Button
                  variant={responseType === 'accept' ? 'default' : 'outline'}
                  onClick={() => setResponseType('accept')}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Request
                </Button>
                <Button
                  variant={responseType === 'reject' ? 'destructive' : 'outline'}
                  onClick={() => setResponseType('reject')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline Request
                </Button>
              </div>
            </div>

            {/* Acceptance Details */}
            {responseType === 'accept' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedCost">Estimated Cost (KES)</Label>
                    <Input
                      id="estimatedCost"
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(Number(e.target.value))}
                      placeholder="Enter your quote"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedDuration">Estimated Duration (Hours)</Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                      placeholder="Time to complete"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Response Message */}
            <div className="space-y-2">
              <Label htmlFor="responseMessage">Message (Optional)</Label>
              <Textarea
                id="responseMessage"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={responseType === 'accept' 
                  ? "Additional details about your service..." 
                  : "Reason for declining (optional)..."
                }
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={submitResponse}
              disabled={responding || !responseType}
              className="w-full"
              size="lg"
              variant={responseType === 'accept' ? 'default' : 'destructive'}
            >
              {responding ? "Submitting..." : 
                responseType === 'accept' ? "Accept Delivery Request" : "Decline Request"
              }
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryProviderNotifications;