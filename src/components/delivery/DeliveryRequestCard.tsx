import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Truck, Package, MapPin, Clock, DollarSign, Users, Phone,
  CheckCircle, XCircle, AlertCircle, Navigation as NavigationIcon,
  Timer, Route, Camera, MessageSquare, ThumbsUp, ThumbsDown,
  Loader2, AlertTriangle, Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { trackingNumberService } from '@/services/TrackingNumberService';

interface DeliveryRequest {
  id: string;
  pickup_location: string;
  delivery_location: string;
  material_type: string;
  quantity: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  estimated_time: string;
  price: number;
  distance: number;
  urgency?: 'normal' | 'urgent' | 'emergency';
  special_instructions?: string;
  created_at?: string;
  // Date-based scheduling fields
  pickup_date?: string;
  delivery_date?: string;
  expected_delivery_date?: string;
}

interface DeliveryRequestCardProps {
  delivery: DeliveryRequest;
  isDarkMode?: boolean;
  onAccept?: (deliveryId: string) => void;
  onReject?: (deliveryId: string, reason: string) => void;
  onNavigate?: (delivery: DeliveryRequest) => void;
  onCall?: (phone: string) => void;
  onCaptureProof?: (deliveryId: string) => void;
  onMarkArrived?: (deliveryId: string) => void;
}

export const DeliveryRequestCard: React.FC<DeliveryRequestCardProps> = ({
  delivery,
  isDarkMode = false,
  onAccept,
  onReject,
  onNavigate,
  onCall,
  onCaptureProof,
  onMarkArrived
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const acceptingRef = useRef(false); // Use ref for immediate click prevention
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'pending_pickup': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'in_transit': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'assigned': return <Users className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'pending_pickup': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'emergency':
        return <Badge className="bg-red-500 text-white animate-pulse">🚨 Emergency</Badge>;
      case 'urgent':
        return <Badge className="bg-orange-500 text-white">⚡ Urgent</Badge>;
      default:
        return null;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAccept = async (e?: React.MouseEvent) => {
    // Prevent event bubbling and default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent double-click using ref (immediate check, no state delay)
    if (acceptingRef.current || isAccepting) {
      console.log('🛑 Already accepting, ignoring click');
      return;
    }
    
    // Set both ref and state immediately
    acceptingRef.current = true;
    setIsAccepting(true);
    console.log('🔘 DeliveryRequestCard: Accept clicked for:', delivery.id);
    
    // Safety timeout: Always clear loading state after 35 seconds max (even if service hangs)
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Accept delivery safety timeout - clearing loading state');
      acceptingRef.current = false;
      setIsAccepting(false);
    }, 35000);
    
    try {
      // Wrap the service call with a timeout to prevent hanging
      const acceptPromise = (async () => {
        // Just call the parent callback - let the parent handle the database update
        // This prevents double database updates
        if (onAccept) {
          return await onAccept(delivery.id);
        } else {
          // Fallback: If no onAccept callback, use TrackingNumberService
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Use the proper TrackingNumberService which handles everything
          console.log('🚚 Using TrackingNumberService to accept delivery:', delivery.id);
          const result = await trackingNumberService.onProviderAcceptsDelivery(delivery.id, user.id);
          
          if (result && result.trackingNumber) {
            toast({
              title: "✅ Delivery Accepted!",
              description: `Tracking: ${result.trackingNumber}. Navigate to pickup location!`,
            });
            return result;
          } else {
            throw new Error('Failed to accept delivery - no tracking number generated');
          }
        }
      })();
      
      // Race the accept promise against a timeout (30 seconds for multiple DB operations)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Accept delivery timed out after 30 seconds. Please try again.')), 30000);
      });
      
      await Promise.race([acceptPromise, timeoutPromise]);
      
      // Clear safety timeout if we got here
      clearTimeout(safetyTimeout);
      
    } catch (error: any) {
      console.error('Error accepting delivery:', error);
      clearTimeout(safetyTimeout);
      toast({
        title: "Error",
        description: error.message || "Failed to accept delivery. Please try again.",
        variant: "destructive"
      });
      // Clear accepting state immediately on error
      acceptingRef.current = false;
      setIsAccepting(false);
    } finally {
      // Always clear after a short delay (independent of promise resolution)
      setTimeout(() => {
        acceptingRef.current = false;
        setIsAccepting(false);
      }, 500); // Short delay to prevent rapid re-clicks
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this delivery.",
        variant: "destructive"
      });
      return;
    }

    setIsRejecting(true);
    try {
      // Get current user (delivery provider)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get provider ID - try delivery_providers table first, fallback to user.id
      let providerId = user.id;
      const { data: providerData } = await supabase
        .from('delivery_providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (providerData?.id) {
        providerId = providerData.id;
      }

      // Check if this delivery was previously accepted (has tracking number)
      const { data: deliveryData } = await supabase
        .from('delivery_requests')
        .select('tracking_number, status')
        .eq('id', delivery.id)
        .single();

      if (deliveryData?.tracking_number && deliveryData?.status === 'accepted') {
        // Provider is cancelling after accepting - use service to handle reassignment
        await trackingNumberService.onProviderCancelsDelivery(
          delivery.id,
          providerData?.id || '',
          rejectReason
        );

        toast({
          title: "Delivery Cancelled",
          description: "The delivery will be reassigned to another provider. Builder has been notified.",
        });
      } else {
        // Simple rejection (never accepted)
        const { error } = await supabase
          .from('delivery_requests')
          .update({ 
            status: 'rejected',
            rejection_reason: rejectReason,
            rejected_at: new Date().toISOString()
          })
          .eq('id', delivery.id);

        if (error) throw error;

        toast({
          title: "Delivery Rejected",
          description: "The delivery request has been rejected.",
        });
      }

      onReject?.(delivery.id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting delivery:', error);
      toast({
        title: "Error",
        description: "Failed to reject delivery. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const isPendingRequest = delivery.status === 'pending' || delivery.status === 'assigned';
  const isAccepted = delivery.status === 'accepted' || delivery.status === 'pending_pickup' || delivery.status === 'in_transit';

  return (
    <>
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover:shadow-lg transition-all ${
        delivery.urgency === 'emergency' ? 'ring-2 ring-red-500 ring-opacity-50' : 
        delivery.urgency === 'urgent' ? 'ring-2 ring-orange-500 ring-opacity-50' : ''
      }`}>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left Section - Delivery Details */}
            <div className="flex-1">
              {/* Status and ID Row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={`${getStatusColor(delivery.status)} flex items-center gap-1`}>
                  {getStatusIcon(delivery.status)}
                  {formatStatus(delivery.status)}
                </Badge>
                {getUrgencyBadge(delivery.urgency)}
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {delivery.id}
                </span>
                {delivery.created_at && (
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    • {new Date(delivery.created_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {/* Locations */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pickup Location</p>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {delivery.pickup_location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Delivery Location</p>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {delivery.delivery_location}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {delivery.material_type} - {delivery.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {delivery.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {delivery.customer_phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expected Delivery Date - IMPORTANT for scheduling */}
              {(delivery.delivery_date || delivery.expected_delivery_date || delivery.pickup_date) && (
                <div className={`mt-3 p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-800' : 'border-blue-200'}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      Expected Delivery: {(() => {
                        const dateStr = delivery.delivery_date || delivery.expected_delivery_date || delivery.pickup_date;
                        if (!dateStr) return 'Not specified';
                        const date = new Date(dateStr);
                        const today = new Date();
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        
                        if (date.toDateString() === today.toDateString()) {
                          return '📅 TODAY';
                        } else if (date.toDateString() === tomorrow.toDateString()) {
                          return '📅 TOMORROW';
                        } else {
                          return date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        }
                      })()}
                    </span>
                    {(() => {
                      const dateStr = delivery.delivery_date || delivery.expected_delivery_date || delivery.pickup_date;
                      if (!dateStr) return null;
                      const date = new Date(dateStr);
                      const today = new Date();
                      if (date.toDateString() === today.toDateString()) {
                        return <Badge className="bg-green-500 text-white text-xs ml-2">Same Day</Badge>;
                      } else if (date > today) {
                        return <Badge className="bg-blue-500 text-white text-xs ml-2">Scheduled</Badge>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {delivery.special_instructions && (
                <div className={`mt-3 p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-yellow-50'}`}>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    Special Instructions:
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {delivery.special_instructions}
                  </p>
                </div>
              )}
            </div>
            
            {/* Right Section - Price and Actions */}
            <div className="flex flex-col items-end gap-3 min-w-[200px]">
              {/* Price and Distance */}
              <div className="text-right">
                <p className="text-2xl font-bold text-teal-600">{formatCurrency(delivery.price)}</p>
                <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Timer className="h-4 w-4" />
                  {delivery.estimated_time}
                  <span className="mx-1">•</span>
                  <Route className="h-4 w-4" />
                  {delivery.distance} km
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full">
                {/* Accept/Reject Buttons for Pending Requests - SINGLE CLICK */}
                {isPendingRequest && (
                  <div className="flex gap-2 w-full">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => handleAccept(e)}
                      disabled={isAccepting || acceptingRef.current}
                      type="button"
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isAccepting}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* Action Buttons for Accepted Deliveries */}
                {isAccepted && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onCall?.(delivery.customer_phone)}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onCaptureProof?.(delivery.id)}
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Proof
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => onNavigate?.(delivery)}
                      >
                        <NavigationIcon className="h-4 w-4 mr-1" />
                        Navigate
                      </Button>
                    </div>
                    
                    {/* I've Arrived Button - Prominent for in_transit deliveries */}
                    {delivery.status === 'in_transit' && onMarkArrived && (
                      <Button 
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-12"
                        onClick={() => onMarkArrived(delivery.id)}
                      >
                        <MapPin className="h-5 w-5 mr-2" />
                        📍 I've Arrived - Scan Materials
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Confirmation Dialog - Only reject needs confirmation for reason */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className={isDarkMode ? 'bg-gray-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject Delivery Request?
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-400' : ''}>
              Please provide a reason for rejecting this delivery. This helps us improve our service.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason for Rejection *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Too far, Vehicle unavailable, Already have another delivery..."
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                rows={3}
              />
            </div>

            {/* Quick Reject Reasons */}
            <div className="flex flex-wrap gap-2">
              {['Too far', 'Vehicle unavailable', 'Already busy', 'Route not feasible', 'Personal emergency'].map((reason) => (
                <Badge 
                  key={reason}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setRejectReason(reason)}
                >
                  {reason}
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Delivery
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveryRequestCard;




