// COMPLETELY RESTRUCTURED: Simple, clear approach - ONE notification per purchase_order_id
// This replaces the complex deduplication logic with a straightforward approach

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, BellOff, Volume2, VolumeX, Vibrate, 
  Package, Truck, AlertTriangle, CheckCircle, X,
  Clock, MapPin, DollarSign, Star, RefreshCw,
  Check, XCircle, Loader2, Copy, Navigation, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'new_delivery' | 'status_update' | 'payment' | 'rating' | 'urgent' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  status?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  materialType?: string;
  quantity?: string;
  estimatedCost?: number;
  purchase_order_id?: string; // CRITICAL for deduplication
  delivery_request_id?: string; // The actual delivery_request ID for accepting
}

interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  newDeliveryAlerts: boolean;
  statusUpdates: boolean;
  paymentNotifications: boolean;
  ratingNotifications: boolean;
  urgentOnly: boolean;
}

interface DeliveryNotificationsProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
  onAcceptDelivery?: (requestId: string) => void;
  onRejectDelivery?: (requestId: string) => void;
}

export const DeliveryNotifications: React.FC<DeliveryNotificationsProps> = ({
  userId,
  onNotificationClick,
  onAcceptDelivery,
  onRejectDelivery
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const acceptingRef = useRef<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    newDeliveryAlerts: true,
    statusUpdates: true,
    paymentNotifications: true,
    ratingNotifications: true,
    urgentOnly: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    try {
      const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let accessToken = '';
      if (stored) {
        const parsed = JSON.parse(stored);
        accessToken = parsed.access_token || '';
      }
      
      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      return { url: SUPABASE_URL, headers };
    } catch (e) {
      return {
        url: 'https://wuuyjjpgzgeimiptuuws.supabase.co',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo',
          'Content-Type': 'application/json'
        }
      };
    }
  };

  // COMPLETELY RESTRUCTURED: Simple, clear logic
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 RESTRUCTURED: Loading notifications...');
      
      const { url, headers } = getAuthHeaders();
      const finalNotifications: Notification[] = [];
      const seenPurchaseOrderIds = new Set<string>(); // Track which purchase_orders we've already added
      
      // STEP 1: Fetch delivery_requests with database-level deduplication
      // Use DISTINCT ON in a subquery approach via RPC, or fetch and deduplicate immediately
      const drResponse = await fetch(
        `${url}/rest/v1/delivery_requests?order=created_at.desc&limit=100&select=*`,
        { headers, cache: 'no-store' }
      );
      
      let deliveryRequests: any[] = [];
      if (drResponse.ok) {
        const rawData = await drResponse.json();
        console.log(`📦 Raw delivery_requests from DB: ${rawData.length}`);
        
        // FIRST: Check for duplicates in raw data BEFORE deduplication
        const poIdCounts = new Map<string, number>();
        const poIdToRequests = new Map<string, any[]>();
        rawData.forEach((dr: any) => {
          if (dr.purchase_order_id) {
            const count = poIdCounts.get(dr.purchase_order_id) || 0;
            poIdCounts.set(dr.purchase_order_id, count + 1);
            
            if (!poIdToRequests.has(dr.purchase_order_id)) {
              poIdToRequests.set(dr.purchase_order_id, []);
            }
            poIdToRequests.get(dr.purchase_order_id)!.push(dr);
          }
        });
        
        // Log duplicates found in raw data
        let duplicateCount = 0;
        poIdCounts.forEach((count, poId) => {
          if (count > 1) {
            duplicateCount += count - 1; // Number of duplicates (total - 1)
            const requests = poIdToRequests.get(poId)!;
            console.error(`🚨 DUPLICATE FOUND: purchase_order_id ${poId} has ${count} delivery_requests:`, 
              requests.map(r => ({ id: r.id, status: r.status, created_at: r.created_at })));
          }
        });
        
        if (duplicateCount > 0) {
          console.error(`🚨 TOTAL DUPLICATES IN RAW DATA: ${duplicateCount} duplicate delivery_requests found!`);
        } else {
          console.log(`✅ No duplicates found in raw data - all ${rawData.length} delivery_requests have unique purchase_order_ids`);
        }
        
        // PRIVATE BUILDER APPROACH: Deduplicate by purchase_order_id (prefer accepted/assigned/in_transit, then most recent)
        // This matches the Edge Function logic that prevents duplicates for private builders
        const deliveryRequestsByPO = new Map<string, any>();
        const deliveryRequestsById = new Map<string, any>(); // For NULL purchase_order_id
        
        rawData.forEach((dr: any) => {
          if (dr.purchase_order_id) {
            const existing = deliveryRequestsByPO.get(dr.purchase_order_id);
            
            // Priority: accepted > assigned > in_transit > pending > others
            const statusPriority = {
              'accepted': 5,
              'assigned': 4,
              'in_transit': 3,
              'pending': 2,
              'completed': 1,
              'cancelled': 0
            };
            
            const currentPriority = statusPriority[dr.status as keyof typeof statusPriority] || 0;
            const existingPriority = existing ? (statusPriority[existing.status as keyof typeof statusPriority] || 0) : -1;
            
            // Keep the one with higher priority status, or if same priority, keep the most recent
            if (!existing || currentPriority > existingPriority || 
                (currentPriority === existingPriority && new Date(dr.created_at) > new Date(existing.created_at))) {
              if (existing) {
                console.log(`🔄 REPLACING: PO ${dr.purchase_order_id} - keeping ${dr.status} (ID: ${dr.id}) over ${existing.status} (ID: ${existing.id})`);
              }
              deliveryRequestsByPO.set(dr.purchase_order_id, dr);
            } else {
              console.log(`🗑️ SKIPPING: PO ${dr.purchase_order_id} - keeping ${existing.status} (ID: ${existing.id}) over ${dr.status} (ID: ${dr.id})`);
            }
          } else {
            // For NULL purchase_order_id, keep by ID (shouldn't have duplicates, but just in case)
            if (!deliveryRequestsById.has(dr.id)) {
              deliveryRequestsById.set(dr.id, dr);
            }
          }
        });
        
        // Combine both maps into array
        deliveryRequests = [...deliveryRequestsByPO.values(), ...deliveryRequestsById.values()];
        
        const removed = rawData.length - deliveryRequests.length;
        console.log(`✅ PRIVATE BUILDER APPROACH: ${rawData.length} → ${deliveryRequests.length} unique (removed ${removed} duplicates)`);
        
        if (removed > 0 && duplicateCount === 0) {
          console.warn(`⚠️ WARNING: Removed ${removed} duplicates but duplicate check found 0. This might indicate a logic issue.`);
        }
      }
      
      // STEP 2: AGGRESSIVE DEDUPLICATION - Multiple strategies
      const deliveryRequestsByPO = new Map<string, any>();
      const deliveryRequestsByKey = new Map<string, any>(); // For NULL purchase_order_id cases
      const deliveryRequestsByAddress = new Map<string, any>(); // Also deduplicate by address+material
      let duplicatesRemoved = 0;
      let nullPORequests = 0;
      const poIdCounts = new Map<string, number>(); // Track how many times each PO ID appears
      
      // First pass: count occurrences of each purchase_order_id
      deliveryRequests.forEach((dr: any) => {
        if (dr.purchase_order_id) {
          poIdCounts.set(dr.purchase_order_id, (poIdCounts.get(dr.purchase_order_id) || 0) + 1);
        }
      });
      
      // Log any purchase_order_ids that appear multiple times
      poIdCounts.forEach((count, poId) => {
        if (count > 1) {
          console.error(`🚨 CRITICAL DUPLICATE: purchase_order_id ${poId} appears ${count} times in database!`);
        }
      });
      
      deliveryRequests.forEach((dr: any) => {
        if (dr.purchase_order_id) {
          // Strategy 1: Deduplicate by purchase_order_id (PRIMARY)
          if (!deliveryRequestsByPO.has(dr.purchase_order_id)) {
            deliveryRequestsByPO.set(dr.purchase_order_id, dr);
            seenPurchaseOrderIds.add(dr.purchase_order_id);
          } else {
            // Duplicate found! Keep the best one
            duplicatesRemoved++;
            const existing = deliveryRequestsByPO.get(dr.purchase_order_id);
            const existingScore = (existing.status === 'accepted' || existing.status === 'assigned' || existing.status === 'in_transit' ? 10 : 0) +
                                 (existing.provider_id ? 5 : 0) +
                                 (new Date(existing.created_at).getTime() / 1000000);
            const newScore = (dr.status === 'accepted' || dr.status === 'assigned' || dr.status === 'in_transit' ? 10 : 0) +
                            (dr.provider_id ? 5 : 0) +
                            (new Date(dr.created_at).getTime() / 1000000);
            if (newScore > existingScore) {
              deliveryRequestsByPO.set(dr.purchase_order_id, dr);
              console.error(`🔄 Replaced duplicate for PO ${dr.purchase_order_id} (better score) - DR IDs: ${existing.id} → ${dr.id}`);
            } else {
              console.error(`🗑️ Removed duplicate for PO ${dr.purchase_order_id} (keeping existing) - DR ID: ${dr.id}`);
            }
          }
          
          // NOTE: We do NOT deduplicate by address+material when purchase_order_id exists
          // Different purchase orders can have the same placeholder "to be provided" - they're still unique!
        } else {
          // NULL purchase_order_id - deduplicate by builder_id + delivery_address + material_type + same hour
          nullPORequests++;
          const key = `${dr.builder_id || 'no-builder'}|${(dr.delivery_address || '').toLowerCase().trim()}|${(dr.material_type || '').toLowerCase().trim()}|${dr.created_at ? new Date(dr.created_at).toISOString().slice(0, 13) : 'no-date'}`;
          
          if (!deliveryRequestsByKey.has(key)) {
            deliveryRequestsByKey.set(key, dr);
          } else {
            // Duplicate found for NULL PO case
            duplicatesRemoved++;
            const existing = deliveryRequestsByKey.get(key);
            const existingTime = new Date(existing.created_at).getTime();
            const newTime = new Date(dr.created_at).getTime();
            if (newTime > existingTime) {
              deliveryRequestsByKey.set(key, dr);
              console.log(`🔄 Replaced duplicate NULL PO request (newer): ${key} - DR IDs: ${existing.id} → ${dr.id}`);
            } else {
              console.log(`🗑️ Removed duplicate NULL PO request (keeping older): ${key} - DR ID: ${dr.id}`);
            }
          }
        }
      });
      
      const totalUnique = deliveryRequestsByPO.size + deliveryRequestsByKey.size;
      console.log(`🔍 Deduplicated delivery_requests: ${deliveryRequests.length} → ${totalUnique} unique (removed ${duplicatesRemoved} duplicates, ${nullPORequests} had NULL purchase_order_id)`);
      
      // STEP 3: Create notifications from unique delivery_requests
      // CRITICAL: Use a Set to track purchase_order_ids we've already added
      const addedPOIds = new Set<string>();
      
      for (const [poId, dr] of deliveryRequestsByPO.entries()) {
        // ABSOLUTE GUARANTEE: Only add if we haven't seen this purchase_order_id yet
        if (addedPOIds.has(poId)) {
          console.error(`🚫 BLOCKED: Already added notification for purchase_order_id ${poId}, skipping delivery_request ${dr.id}`);
          continue;
        }
        
        addedPOIds.add(poId);
        finalNotifications.push({
          id: `dr-${dr.id}`, // Use delivery_request id as notification id
          type: 'new_delivery',
          title: dr.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${dr.status}`,
          message: `${dr.material_type || 'Materials'} delivery to ${dr.delivery_address || 'Unknown location'}`,
          timestamp: new Date(dr.created_at),
          read: dr.status !== 'pending',
          priority: dr.priority_level === 'urgent' || dr.status === 'pending' ? 'high' : 'medium',
          actionUrl: `/delivery-dashboard?request=${dr.id}`,
          status: dr.status,
          pickupAddress: dr.pickup_address || dr.pickup_location || '',
          deliveryAddress: dr.delivery_address || dr.delivery_location || '',
          materialType: dr.material_type || '',
          quantity: dr.quantity || '',
          estimatedCost: dr.estimated_cost || dr.budget_range || 0,
          purchase_order_id: poId, // CRITICAL
          delivery_request_id: dr.id // For accepting
        });
      }
      
      // Also add notifications from NULL purchase_order_id requests (deduplicated)
      const addedNullPOIds = new Set<string>();
      for (const [key, dr] of deliveryRequestsByKey.entries()) {
        if (addedNullPOIds.has(dr.id)) {
          console.error(`🚫 BLOCKED: Already added notification for NULL PO delivery_request ${dr.id}`);
          continue;
        }
        addedNullPOIds.add(dr.id);
        finalNotifications.push({
          id: `dr-${dr.id}`,
          type: 'new_delivery',
          title: dr.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${dr.status}`,
          message: `${dr.material_type || 'Materials'} delivery to ${dr.delivery_address || 'Unknown location'}`,
          timestamp: new Date(dr.created_at),
          read: dr.status !== 'pending',
          priority: dr.priority_level === 'urgent' || dr.status === 'pending' ? 'high' : 'medium',
          actionUrl: `/delivery-dashboard?request=${dr.id}`,
          status: dr.status,
          pickupAddress: dr.pickup_address || dr.pickup_location || '',
          deliveryAddress: dr.delivery_address || dr.delivery_location || '',
          materialType: dr.material_type || '',
          quantity: dr.quantity || '',
          estimatedCost: dr.estimated_cost || dr.budget_range || 0,
          purchase_order_id: undefined, // NULL purchase_order_id
          delivery_request_id: dr.id // For accepting
        });
      }
      
      // STEP 4: Fetch purchase_orders that DON'T have a delivery_request yet
      // CRITICAL: Only add if purchase_order_id is NOT already in addedPOIds
      const poResponse = await fetch(
        `${url}/rest/v1/purchase_orders?status=in.(quote_accepted,order_created,awaiting_delivery_request,delivery_requested,awaiting_delivery_provider,delivery_assigned,ready_for_dispatch)&order=created_at.desc&limit=100&select=*`,
        { headers, cache: 'no-store' }
      );
      
      if (poResponse.ok) {
        const purchaseOrders = await poResponse.json();
        console.log(`✅ Loaded ${purchaseOrders.length} purchase_orders`);
        
        let skippedCount = 0;
        // Only add purchase_orders that DON'T have a delivery_request AND haven't been added yet
        purchaseOrders.forEach((po: any) => {
          // ABSOLUTE CHECK: If we already added a notification for this purchase_order_id, SKIP IT
          if (addedPOIds.has(po.id)) {
            skippedCount++;
            console.log(`🚫 SKIPPED: Purchase order ${po.id} already has a notification from delivery_request, not adding duplicate`);
            return;
          }
          
          if (!seenPurchaseOrderIds.has(po.id) && (po.delivery_required || po.delivery_address)) {
            const materialType = po.items && po.items.length > 0
              ? po.items.map((item: any) => item.material_name || item.name).join(', ')
              : 'Construction Materials';
            
            addedPOIds.add(po.id); // Mark as added
            finalNotifications.push({
              id: `po-${po.id}`,
              type: 'new_delivery',
              title: '🚚 New Delivery Request!',
              message: `${materialType} delivery to ${po.delivery_address || 'Unknown location'}`,
              timestamp: new Date(po.delivery_requested_at || po.order_created_at || po.created_at),
              read: false,
              priority: 'high',
              actionUrl: `/delivery-dashboard?order=${po.id}`,
              status: 'pending',
              pickupAddress: 'Supplier location',
              deliveryAddress: po.delivery_address || '',
              materialType: materialType,
              quantity: po.items?.length || 1,
              estimatedCost: po.total_amount || 0,
              purchase_order_id: po.id, // CRITICAL
              delivery_request_id: undefined // No delivery_request yet
            });
            
            seenPurchaseOrderIds.add(po.id);
          }
        });
        
        if (skippedCount > 0) {
          console.log(`🚫 SKIPPED ${skippedCount} purchase_orders that already have delivery_request notifications`);
        }
      }
      
      // STEP 5: ABSOLUTE FINAL DEDUPLICATION - ONE notification per purchase_order_id, PERIOD
      const absolutelyFinal: Notification[] = [];
      const finalSeenPOIds = new Set<string>();
      const finalSeenIds = new Set<string>();
      const finalSeenByContent = new Map<string, Notification>(); // Also deduplicate by content similarity
      
      // Sort by timestamp first (most recent first), then prefer delivery_request over purchase_order
      finalNotifications.sort((a, b) => {
        // First, sort by timestamp (most recent first)
        const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
        if (Math.abs(timeDiff) < 60000) { // Within 1 minute - might be duplicates
          // Prefer delivery_request_id over undefined (delivery_request is more specific)
          if (a.delivery_request_id && !b.delivery_request_id) return -1;
          if (!a.delivery_request_id && b.delivery_request_id) return 1;
        }
        return timeDiff;
      });
      
      finalNotifications.forEach((notif) => {
        // RULE 0: If it has delivery_request_id, check for duplicates by delivery_request_id FIRST
        // This catches cases where the same delivery_request creates multiple notifications
        if (notif.delivery_request_id) {
          const drKey = `dr-${notif.delivery_request_id}`;
          if (finalSeenIds.has(drKey)) {
            console.error(`🚫 DELETED: Duplicate notification with delivery_request_id ${notif.delivery_request_id} (removed: ${notif.id}, title: ${notif.title})`);
            return; // DELETE IT IMMEDIATELY
          }
          finalSeenIds.add(drKey);
        }
        
        // ABSOLUTE RULE: ONE notification per purchase_order_id, NO EXCEPTIONS
        if (notif.purchase_order_id) {
          if (finalSeenPOIds.has(notif.purchase_order_id)) {
            // DUPLICATE DETECTED - REMOVE IT IMMEDIATELY
            console.error(`🚫 DELETED: Duplicate notification for purchase_order_id ${notif.purchase_order_id} (removed: ${notif.id}, title: ${notif.title})`);
            return; // Skip this notification - DELETE IT
          }
          finalSeenPOIds.add(notif.purchase_order_id);
          absolutelyFinal.push(notif);
        } 
        // Strategy 2: No purchase_order_id - ONLY THEN deduplicate by delivery_address + material_type
        // This catches cases where delivery_requests were created without linking to purchase_orders
        else {
          const addressMaterialKey = `${(notif.deliveryAddress || '').toLowerCase().trim()}|${(notif.materialType || '').toLowerCase().trim()}`;
          
          // Only deduplicate if address is NOT a placeholder
          // "to be provided" is a placeholder - don't group those together
          const isPlaceholder = (notif.deliveryAddress || '').toLowerCase().includes('to be provided') || 
                               (notif.deliveryAddress || '').trim() === '';
          
          if (!isPlaceholder && addressMaterialKey !== '|') {
            // Has real address and material - deduplicate by this key
            if (!finalSeenByAddress.has(addressMaterialKey)) {
              finalSeenByAddress.set(addressMaterialKey, notif);
              absolutelyFinal.push(notif);
            } else {
              console.error(`🚫 FINAL FILTER: Removed duplicate by address+material: ${addressMaterialKey} (ID: ${notif.id})`);
            }
          } 
          // Strategy 3: Placeholder address or no address - deduplicate by notification id only
          else if (!finalSeenIds.has(notif.id)) {
            finalSeenIds.add(notif.id);
            absolutelyFinal.push(notif);
          } else {
            console.error(`🚫 FINAL FILTER: Removed duplicate notification (ID: ${notif.id})`);
          }
        }
      });
      
      // Final verification: Check for any remaining duplicates
      const poIds = absolutelyFinal.map(n => n.purchase_order_id).filter(Boolean);
      const duplicatePOIds = poIds.filter((id, index) => poIds.indexOf(id) !== index);
      if (duplicatePOIds.length > 0) {
        console.error(`🚨 CRITICAL ERROR: Still found duplicate purchase_order_ids after all deduplication:`, duplicatePOIds);
        // Emergency cleanup - remove duplicates manually using a Map to ensure uniqueness
        const emergencyFinal: Notification[] = [];
        const emergencySeenPO = new Map<string, Notification>();
        const emergencySeenIds = new Set<string>();
        
        // First pass: Keep only one per purchase_order_id
        absolutelyFinal.forEach(n => {
          if (n.purchase_order_id) {
            if (!emergencySeenPO.has(n.purchase_order_id)) {
              emergencySeenPO.set(n.purchase_order_id, n);
            }
          } else if (!emergencySeenIds.has(n.id)) {
            emergencySeenIds.add(n.id);
            emergencyFinal.push(n);
          }
        });
        
        // Add all unique purchase_order_id notifications
        emergencySeenPO.forEach(n => emergencyFinal.push(n));
        
        console.error(`🚨 EMERGENCY CLEANUP: ${absolutelyFinal.length} → ${emergencyFinal.length} (removed ${absolutelyFinal.length - emergencyFinal.length} duplicates)`);
        setNotifications(emergencyFinal);
        setUnreadCount(emergencyFinal.filter(n => !n.read).length);
        return;
      }
      
      console.log(`✅ FINAL: ${finalNotifications.length} → ${absolutelyFinal.length} absolutely unique notifications (removed ${finalNotifications.length - absolutelyFinal.length} final duplicates)`);
      console.log(`📊 Final notification breakdown: ${poIds.length} with purchase_order_id, ${absolutelyFinal.length - poIds.length} without`);
      
      setNotifications(absolutelyFinal);
      setUnreadCount(absolutelyFinal.filter(n => !n.read).length);
      
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Accept delivery handler
  const handleAcceptDelivery = async (requestId: string) => {
    if (acceptingRef.current === requestId || acceptingId === requestId) {
      console.log('🛑 Already accepting, ignoring');
      return;
    }
    
    acceptingRef.current = requestId;
    setAcceptingId(requestId);
    
    let providerId = userId;
    if (!providerId) {
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          providerId = parsed.user?.id || '';
        }
      } catch (e) {}
    }
    
    if (!providerId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      acceptingRef.current = null;
      setAcceptingId(null);
      return;
    }
    
    const trackingNumber = 'TRK-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + 
      Math.random().toString(36).substring(2, 7).toUpperCase();
    
    try {
      const { url, headers } = getAuthHeaders();
      
      // First check current state
      const checkResponse = await fetch(
        `${url}/rest/v1/delivery_requests?id=eq.${requestId}&select=id,status,provider_id,purchase_order_id`,
        { headers, cache: 'no-store' }
      );
      
      if (checkResponse.ok) {
        const current = await checkResponse.json();
        if (current && current.length > 0) {
          const dr = current[0];
          if (dr.provider_id === providerId && dr.status === 'accepted') {
            console.log('✅ Already accepted by this provider');
            toast({
              title: '✅ Already Accepted',
              description: 'This delivery was already accepted.',
            });
            loadNotifications();
            return;
          }
          if (dr.provider_id && dr.provider_id !== providerId) {
            throw new Error('This delivery has already been accepted by another provider');
          }
        }
      }
      
      // Update delivery request - try with provider_id null first, then with provider_id matching
      let updateResponse = await fetch(
        `${url}/rest/v1/delivery_requests?id=eq.${requestId}&status=in.(pending,assigned)&provider_id=is.null`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            provider_id: providerId,
            status: 'accepted',
            tracking_number: trackingNumber,
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      );
      
      let result: any[] = [];
      if (updateResponse.ok) {
        result = await updateResponse.json().catch(() => []);
      }
      
      // If that didn't work (no rows updated), try with provider_id matching this provider
      if (!updateResponse.ok || result.length === 0) {
        const queryParams2 = new URLSearchParams({
          id: `eq.${requestId}`,
          status: `in.(pending,assigned)`,
          provider_id: `eq.${providerId}`
        });
        
        updateResponse = await fetch(
          `${url}/rest/v1/delivery_requests?${queryParams2.toString()}`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              provider_id: providerId,
              status: 'accepted',
              tracking_number: trackingNumber,
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        );
        
        if (updateResponse.ok) {
          result = await updateResponse.json().catch(() => []);
        }
      }
      
      if (updateResponse.ok && result && result.length > 0) {
        toast({
          title: '✅ Delivery Accepted!',
          description: `Tracking: ${trackingNumber}`,
        });
        loadNotifications();
      } else {
        const errorText = await updateResponse.text().catch(() => 'Unknown error');
        let errorMessage = 'Failed to accept delivery';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Error accepting delivery:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not accept delivery',
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => {
        acceptingRef.current = null;
        setAcceptingId(null);
      }, 2000);
    }
  };

  // Load on mount and set up real-time
  useEffect(() => {
    loadNotifications();
    
    // Debounce real-time updates to prevent rapid reloads
    let reloadTimeout: NodeJS.Timeout;
    const debouncedReload = () => {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        console.log('🔄 Real-time update: Reloading notifications...');
        loadNotifications();
      }, 500); // Wait 500ms before reloading
    };
    
    const subscription = supabase
      .channel('delivery-notifications-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'delivery_requests' },
        debouncedReload
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_requests' },
        debouncedReload
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'purchase_orders' },
        debouncedReload
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'purchase_orders' },
        debouncedReload
      )
      .subscribe();
    
    return () => {
      clearTimeout(reloadTimeout);
      subscription.unsubscribe();
    };
  }, [loadNotifications]);

  // Render function (simplified)
  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleDateString();
  };

  // FINAL RENDER-LEVEL DEDUPLICATION using useMemo - ABSOLUTE STRICT
  const uniqueNotifications = useMemo(() => {
    // AGGRESSIVE DEDUPLICATION: Check by purchase_order_id, delivery_request_id, AND content similarity
    const renderedKeys = new Set<string>();
    const renderedByContent = new Map<string, Notification>(); // Track by content similarity
    
    const unique = notifications.filter((notification) => {
      // PRIORITY 1: Check by purchase_order_id (most reliable)
      if (notification.purchase_order_id) {
        const key = `po-${notification.purchase_order_id}`;
        if (renderedKeys.has(key)) {
          console.error(`🚫 RENDER DELETE: Duplicate purchase_order_id ${notification.purchase_order_id} (removed: ${notification.id})`);
          return false; // DELETE IT
        }
        renderedKeys.add(key);
        return true;
      }
      
      // PRIORITY 2: Check by delivery_request_id
      if (notification.delivery_request_id) {
        const key = `dr-${notification.delivery_request_id}`;
        if (renderedKeys.has(key)) {
          console.error(`🚫 RENDER DELETE: Duplicate delivery_request_id ${notification.delivery_request_id} (removed: ${notification.id})`);
          return false; // DELETE IT
        }
        renderedKeys.add(key);
        return true;
      }
      
      // PRIORITY 3: Check by content similarity (pickup + delivery + material + timestamp within 5 minutes)
      const contentKey = `${(notification.pickupAddress || '').toLowerCase().trim()}|${(notification.deliveryAddress || '').toLowerCase().trim()}|${(notification.materialType || '').toLowerCase().trim()}|${Math.floor(notification.timestamp.getTime() / 300000)}`; // 5-minute buckets
      
      const existing = renderedByContent.get(contentKey);
      if (existing) {
        // Check if timestamps are very close (within 5 minutes) - likely duplicates
        const timeDiff = Math.abs(notification.timestamp.getTime() - existing.timestamp.getTime());
        if (timeDiff < 300000) { // 5 minutes
          console.error(`🚫 RENDER DELETE: Duplicate by content similarity (removed: ${notification.id}, existing: ${existing.id})`);
          return false; // DELETE IT
        }
      }
      
      renderedByContent.set(contentKey, notification);
      renderedKeys.add(`notif-${notification.id}`);
      return true;
    });
    
    const removed = notifications.length - unique.length;
    if (removed > 0) {
      console.error(`🚫 RENDER DELETED ${removed} duplicate notifications - showing only ${unique.length} unique`);
    } else {
      console.log(`✅ RENDER: All ${notifications.length} notifications are unique`);
    }
    
    return unique;
  }, [notifications]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadNotifications}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
          }}>
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-teal-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active delivery requests</p>
          </div>
        ) : (
          uniqueNotifications.map((notification, index) => {
            // React key: Use purchase_order_id as primary key (each PO is unique)
            // Only use address+material for NULL purchase_order_id cases with real addresses
            let uniqueKey: string;
            if (notification.purchase_order_id) {
              // Each purchase_order_id is unique - use it directly
              uniqueKey = `po-${notification.purchase_order_id}`;
            } else {
              // No purchase_order_id - use address+material only if NOT a placeholder
              const isPlaceholder = (notification.deliveryAddress || '').toLowerCase().includes('to be provided') || 
                                   (notification.deliveryAddress || '').trim() === '';
              const addressMaterialKey = `${(notification.deliveryAddress || '').toLowerCase().trim()}|${(notification.materialType || '').toLowerCase().trim()}`;
              
              if (!isPlaceholder && addressMaterialKey !== '|') {
                uniqueKey = `addr-${addressMaterialKey}`;
              } else {
                // Placeholder or no address - use notification id
                uniqueKey = `notif-${notification.id}`;
              }
            }
            
            return (
              <div
                key={uniqueKey}
                className={`p-3 rounded-lg border ${
                  notification.read 
                    ? 'bg-white border-gray-200' 
                    : 'bg-teal-50 border-teal-200'
                }`}
              >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{notification.title}</p>
                  {notification.materialType && (
                    <p className="text-xs text-gray-600 mt-1">
                      {notification.materialType} {notification.quantity && `(${notification.quantity})`}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {notification.priority}
                </Badge>
              </div>

              {notification.pickupAddress && (
                <div className="bg-green-50 rounded p-2 mb-2">
                  <p className="text-xs font-semibold text-green-700">📦 PICKUP</p>
                  <p className="text-xs text-green-800">{notification.pickupAddress}</p>
                </div>
              )}

              {notification.deliveryAddress && (
                <div className="bg-orange-50 rounded p-2 mb-2">
                  <p className="text-xs font-semibold text-orange-700">🚚 DELIVERY</p>
                  <p className="text-xs text-orange-800">{notification.deliveryAddress}</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (notification.pickupAddress && notification.deliveryAddress) {
                      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(notification.pickupAddress)}&destination=${encodeURIComponent(notification.deliveryAddress)}`, '_blank');
                    }
                  }}
                  className="flex-1"
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Start Navigation
                </Button>
                {notification.status === 'pending' && notification.delivery_request_id && (
                  <Button
                    size="sm"
                    onClick={() => handleAcceptDelivery(notification.delivery_request_id!)}
                    disabled={acceptingId === notification.delivery_request_id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {acceptingId === notification.delivery_request_id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2 text-right">
                {formatTime(notification.timestamp)}
              </p>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
