import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  MapPin, 
  Phone,
  AlertTriangle,
  Users
} from "lucide-react";

interface DeliveryRequest {
  id: string;
  pickup_address: string;
  delivery_address: string;
  material_type: string;
  quantity: number;
  weight_kg?: number;
  pickup_date: string;
  preferred_time?: string;
  special_instructions?: string;
  budget_range?: string;
  status: string;
  created_at: string;
}

interface ProviderResponse {
  id: string;
  provider_id: string;
  provider_name: string;
  response: 'pending' | 'accepted' | 'rejected';
  response_message?: string;
  estimated_cost?: number;
  estimated_duration_hours?: number;
  distance_km?: number;
  responded_at?: string;
}

interface ProviderRotationManagerProps {
  deliveryRequest: DeliveryRequest;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const ProviderRotationManager: React.FC<ProviderRotationManagerProps> = ({
  deliveryRequest,
  isOpen,
  onClose,
  userRole
}) => {
  const [responses, setResponses] = useState<ProviderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [rotationStatus, setRotationStatus] = useState<{
    currentProviderIndex: number;
    totalAttempts: number;
    maxAttempts: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>({
    currentProviderIndex: 0,
    totalAttempts: 0,
    maxAttempts: 5,
    status: 'pending'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && deliveryRequest?.id) {
      fetchProviderResponses();
      setupRealtimeSubscription();
    }
  }, [isOpen, deliveryRequest?.id]);

  const fetchProviderResponses = async () => {
    if (!deliveryRequest?.id) return;

    try {
      const { data, error } = await supabase
        .from('delivery_provider_responses')
        .select(`
          *,
          delivery_providers (
            provider_name
          )
        `)
        .eq('notification_id', deliveryRequest.id)
        .order('responded_at', { ascending: false });

      if (error) throw error;

      const formattedResponses = data?.map(response => ({
        id: response.id,
        provider_id: response.provider_id,
        provider_name: response.delivery_providers?.provider_name || 'Unknown Provider',
        response: response.response as 'pending' | 'accepted' | 'rejected',
        response_message: response.response_message,
        estimated_cost: response.estimated_cost,
        estimated_duration_hours: response.estimated_duration_hours,
        distance_km: response.distance_km,
        responded_at: response.responded_at
      })) || [];

      setResponses(formattedResponses);

      // Update rotation status
      const acceptedResponse = formattedResponses.find(r => r.response === 'accepted');
      const rejectedCount = formattedResponses.filter(r => r.response === 'rejected').length;

      setRotationStatus({
        currentProviderIndex: rejectedCount,
        totalAttempts: formattedResponses.length,
        maxAttempts: 5,
        status: acceptedResponse ? 'completed' : 
                rejectedCount >= 5 ? 'failed' : 
                formattedResponses.length > 0 ? 'in_progress' : 'pending'
      });

    } catch (error) {
      console.error('Error fetching provider responses:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('provider-responses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_provider_responses',
          filter: `notification_id=eq.${deliveryRequest.id}`
        },
        () => {
          fetchProviderResponses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAcceptProvider = async (providerId: string) => {
    if (userRole !== 'builder' && userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only builders can accept provider responses"
      });
      return;
    }

    setLoading(true);
    try {
      // Update delivery request with selected provider
      const { error } = await supabase
        .from('delivery_requests')
        .update({
          provider_id: providerId,
          status: 'accepted'
        })
        .eq('id', deliveryRequest.id);

      if (error) throw error;

      toast({
        title: "Provider Accepted",
        description: "The delivery provider has been confirmed for this request"
      });

      onClose();
    } catch (error: any) {
      console.error('Error accepting provider:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to accept provider"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryRotation = async () => {
    if (userRole !== 'builder' && userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only builders can retry provider rotation"
      });
      return;
    }

    setLoading(true);
    try {
      // Reset rotation by clearing attempted providers and status
      const { error } = await supabase
        .from('delivery_requests')
        .update({
          attempted_providers: [],
          status: 'pending',
          rotation_completed_at: null
        })
        .eq('id', deliveryRequest.id);

      if (error) throw error;

      // Trigger provider rotation setup
      const { error: setupError } = await supabase.rpc(
        'setup_provider_rotation_queue',
        { _request_id: deliveryRequest.id }
      );

      if (setupError) throw setupError;

      toast({
        title: "Rotation Restarted",
        description: "Provider rotation has been restarted with fresh providers"
      });

      setRotationStatus(prev => ({ ...prev, status: 'pending', totalAttempts: 0 }));
    } catch (error: any) {
      console.error('Error retrying rotation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to retry rotation"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (response: string) => {
    switch (response) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (response: string) => {
    switch (response) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Provider Rotation Status
          </DialogTitle>
          <DialogDescription>
            Track delivery provider responses and automatic rotation for request #{deliveryRequest?.id?.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rotation Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Rotation Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {rotationStatus.totalAttempts}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Attempts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {responses.filter(r => r.response === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {responses.filter(r => r.response === 'accepted').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Accepted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {responses.filter(r => r.response === 'rejected').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Rejected</div>
                </div>
              </div>

              <div className="mt-4">
                <Badge 
                  variant={
                    rotationStatus.status === 'completed' ? 'default' :
                    rotationStatus.status === 'failed' ? 'destructive' :
                    'secondary'
                  }
                  className="text-sm"
                >
                  {rotationStatus.status === 'completed' ? 'Provider Found' :
                   rotationStatus.status === 'failed' ? 'Rotation Failed' :
                   rotationStatus.status === 'in_progress' ? 'In Progress' :
                   'Pending Responses'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Provider Responses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Provider Responses</CardTitle>
              <CardDescription>
                Providers are automatically notified in order of proximity and rating
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for provider responses...</p>
                  <p className="text-sm">Nearby providers are being notified automatically</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {responses.map((response, index) => (
                    <div key={response.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(response.response)}
                            <h3 className="font-medium">{response.provider_name}</h3>
                            <Badge variant={getStatusColor(response.response)}>
                              {response.response}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="outline" className="text-xs">
                                Highest Priority
                              </Badge>
                            )}
                          </div>

                          {response.response === 'accepted' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                              {response.estimated_cost && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Cost:</span>
                                  <span className="text-green-600">${response.estimated_cost}</span>
                                </div>
                              )}
                              {response.estimated_duration_hours && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{response.estimated_duration_hours}h delivery</span>
                                </div>
                              )}
                              {response.distance_km && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{response.distance_km} km away</span>
                                </div>
                              )}
                            </div>
                          )}

                          {response.response_message && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <strong>Message:</strong> {response.response_message}
                            </div>
                          )}

                          {response.responded_at && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Responded: {new Date(response.responded_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {response.response === 'accepted' && (userRole === 'builder' || userRole === 'admin') && (
                          <Button
                            onClick={() => handleAcceptProvider(response.provider_id)}
                            disabled={loading}
                            className="ml-4"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Select Provider
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Failed Rotation Alert */}
          {rotationStatus.status === 'failed' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rotation Failed:</strong> All nearby providers have declined or are unavailable. 
                You can retry with an expanded search radius or request manual provider assignment.
                <div className="mt-3">
                  {(userRole === 'builder' || userRole === 'admin') && (
                    <Button variant="outline" size="sm" onClick={handleRetryRotation} disabled={loading}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry with Expanded Search
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Request Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Material:</span> {deliveryRequest?.material_type}
                </div>
                <div>
                  <span className="font-medium">Quantity:</span> {deliveryRequest?.quantity}
                </div>
                <div>
                  <span className="font-medium">Weight:</span> {deliveryRequest?.weight_kg || 'Not specified'} kg
                </div>
                <div>
                  <span className="font-medium">Pickup Date:</span> {deliveryRequest?.pickup_date}
                </div>
              </div>
              
              {deliveryRequest?.special_instructions && (
                <div className="mt-3">
                  <span className="font-medium text-sm">Special Instructions:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {deliveryRequest.special_instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderRotationManager;