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
import { trackingNumberService } from '@/services/TrackingNumberService';

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
  provider_id?: string | null; // Provider who accepted this delivery (null = unaccepted)
  provider_name?: string; // Name of provider who accepted (if available)
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
      
      // STEP 1: Fetch delivery_requests - only show unaccepted OR accepted by others
      // Don't show deliveries already accepted by THIS provider (those are in Scheduled tab)
      // Fetch all delivery_requests, then filter in JavaScript to show:
      // - provider_id IS NULL (unaccepted) - can accept
      // - provider_id IS NOT NULL AND provider_id != userId (accepted by another) - show as "Already Accepted"
      // CRITICAL: Only fetch actionable delivery requests (exclude delivered/completed/cancelled)
      // These are the only ones that should show in notifications
      const drResponse = await fetch(
        `${url}/rest/v1/delivery_requests?order=created_at.desc&limit=100&status=not.in.(delivered,completed,cancelled)&select=*`,
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
      // CRITICAL: Only show delivery requests with valid purchase_order_id (no placeholder/default requests)
      // CRITICAL: Use a Set to track purchase_order_ids we've already added
      // ABSOLUTE GUARANTEE: Only ONE notification per purchase_order_id
      const addedPOIds = new Set<string>();
      const addedDRIds = new Set<string>(); // Also track delivery_request_ids to prevent duplicates
      
      // First, collect all purchase_order_ids to verify they exist
      const poIdsToVerify = Array.from(deliveryRequestsByPO.keys()).filter(poId => 
        poId && poId.trim() !== '' && poId !== 'null' && poId !== 'undefined'
      );
      
      // RELAXED: Verify purchase_orders exist, but if verification fails, show all notifications anyway
      // This ensures delivery alerts come through even if there's a temporary database issue
      let validPOIds = new Set<string>(poIdsToVerify);
      if (poIdsToVerify.length > 0) {
        try {
          const verifyResponse = await fetch(
            `${url}/rest/v1/purchase_orders?id=in.(${poIdsToVerify.join(',')})&select=id&limit=1000`,
            { headers, cache: 'no-store' }
          );
          
          if (verifyResponse.ok) {
            const validPOs = await verifyResponse.json();
            validPOIds = new Set(validPOs.map((po: any) => po.id));
            const invalidCount = poIdsToVerify.length - validPOIds.size;
            if (invalidCount > 0) {
              console.log(`⚠️ ${invalidCount} delivery requests with non-existent purchase_orders (showing anyway to ensure alerts come through)`);
            }
          } else {
            console.warn('⚠️ Purchase order verification failed, showing all delivery_requests to ensure alerts come through');
            // If verification fails, assume all are valid to ensure alerts show
            validPOIds = new Set(poIdsToVerify);
          }
        } catch (verifyError) {
          console.warn('⚠️ Could not verify purchase_orders, showing all delivery_requests to ensure alerts come through:', verifyError);
          // If verification fails, assume all are valid to ensure alerts show
          validPOIds = new Set(poIdsToVerify);
        }
      }
      
      for (const [poId, dr] of deliveryRequestsByPO.entries()) {
        // CRITICAL: Skip delivery requests without purchase_order_id (these are placeholder/default requests)
        if (!poId || poId.trim() === '' || poId === 'null' || poId === 'undefined') {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id} has no valid purchase_order_id (placeholder/default request)`);
          continue;
        }
        
        // RELAXED: Only skip if we're certain the purchase_order doesn't exist
        // If verification failed or purchase_order wasn't found, show the notification anyway
        // This ensures delivery alerts come through even if there's a temporary database issue
        if (validPOIds.size > 0 && !validPOIds.has(poId)) {
          console.log(`⚠️ Delivery request ${dr.id} has purchase_order_id ${poId} but purchase_order not found (showing anyway to ensure alerts come through)`);
          // Don't skip - show the notification anyway to ensure alerts come through
        }
        
        // ABSOLUTE GUARANTEE: Only add if we haven't seen this purchase_order_id yet
        if (addedPOIds.has(poId)) {
          console.error(`🚫 BLOCKED: Already added notification for purchase_order_id ${poId}, skipping delivery_request ${dr.id}`);
          continue;
        }
        
        // ABSOLUTE GUARANTEE: Also check delivery_request_id to prevent duplicates
        if (dr.id && addedDRIds.has(dr.id)) {
          console.error(`🚫 BLOCKED: Already added notification for delivery_request_id ${dr.id}, skipping`);
          continue;
        }
        
        // CRITICAL: Skip delivered/completed/cancelled deliveries - these shouldn't show in notifications
        // Only show pending, accepted, assigned, in_transit deliveries that need action
        if (['delivered', 'completed', 'cancelled'].includes(dr.status)) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id} has status ${dr.status} - already completed/cancelled`);
          continue;
        }
        
        addedPOIds.add(poId);
        if (dr.id) addedDRIds.add(dr.id);
        finalNotifications.push({
          id: `dr-${dr.id}`, // Use delivery_request id as notification id
          type: 'new_delivery',
          title: dr.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${dr.status}`,
          message: `${dr.material_type || 'Materials'} delivery to ${dr.delivery_address || 'Unknown location'}`,
          timestamp: new Date(dr.created_at),
          read: dr.status !== 'pending', // Only pending deliveries are unread
          priority: dr.priority_level === 'urgent' || dr.status === 'pending' ? 'high' : 'medium',
          actionUrl: `/delivery-dashboard?request=${dr.id}`,
          status: dr.status,
          pickupAddress: dr.pickup_address || dr.pickup_location || '',
          deliveryAddress: dr.delivery_address || dr.delivery_location || '',
          materialType: dr.material_type || '',
          quantity: dr.quantity || '',
          estimatedCost: dr.estimated_cost || dr.budget_range || 0,
          purchase_order_id: poId, // CRITICAL
          delivery_request_id: dr.id, // For accepting
          provider_id: dr.provider_id || null, // Provider who accepted (null = unaccepted)
          provider_name: dr.provider_name || dr.delivery_provider_name || undefined // Provider name if available
        });
      }
      
      // CRITICAL: DO NOT show notifications for NULL purchase_order_id requests
      // These are placeholder/default delivery requests that don't have actual orders
      // Only show delivery requests with valid purchase_order_id
      console.log(`🚫 FILTERED OUT: ${deliveryRequestsByKey.size} delivery requests without purchase_order_id (placeholder/default requests - not showing to providers)`);
      
      // REMOVED: We no longer show NULL purchase_order_id requests to providers
      // These are likely placeholder/default requests that were created without actual orders
      // Providers should only see delivery requests linked to real purchase orders
      
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
        // CRITICAL: Also filter out delivered/completed/cancelled purchase_orders
        purchaseOrders.forEach((po: any) => {
          // ABSOLUTE CHECK: If we already added a notification for this purchase_order_id, SKIP IT
          if (addedPOIds.has(po.id)) {
            skippedCount++;
            console.log(`🚫 SKIPPED: Purchase order ${po.id} already has a notification from delivery_request, not adding duplicate`);
            return;
          }
          
          // CRITICAL: Skip delivered/completed/cancelled purchase_orders
          if (['delivered', 'completed', 'cancelled'].includes(po.status)) {
            skippedCount++;
            console.log(`🚫 SKIPPED: Purchase order ${po.id} has status ${po.status} - already completed/cancelled`);
            return;
          }
          
          // CRITICAL: Skip if delivery_status is delivered/completed
          if (po.delivery_status && ['delivered', 'completed', 'cancelled'].includes(po.delivery_status)) {
            skippedCount++;
            console.log(`🚫 SKIPPED: Purchase order ${po.id} has delivery_status ${po.delivery_status} - already completed`);
            return;
          }
          
          // CRITICAL: Only show if delivery is actually required and has valid data
          if (!seenPurchaseOrderIds.has(po.id) && (po.delivery_required || po.delivery_address)) {
            // CRITICAL: Validate that purchase_order has valid data
            if (!po.id || !po.delivery_address || po.delivery_address.trim() === '' || po.delivery_address.toLowerCase().includes('to be provided')) {
              skippedCount++;
              console.log(`🚫 SKIPPED: Purchase order ${po.id} has invalid or placeholder delivery address`);
              return;
            }
            
            const materialType = po.items && po.items.length > 0
              ? po.items.map((item: any) => item.material_name || item.name).join(', ')
              : 'Construction Materials';
            
            // CRITICAL: Ensure materialType is not empty
            if (!materialType || materialType.trim() === '') {
              skippedCount++;
              console.log(`🚫 SKIPPED: Purchase order ${po.id} has no material type`);
              return;
            }
            
            addedPOIds.add(po.id); // Mark as added
            // CRITICAL: Double-check before adding to prevent any duplicates
            const duplicateCheck = finalNotifications.find(n => n.purchase_order_id === po.id);
            if (duplicateCheck) {
              console.error(`🚫 BLOCKED: Purchase order ${po.id} duplicate detected right before adding, skipping`);
              return;
            }
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
      const finalSeenByAddress = new Map<string, Notification>(); // For NULL purchase_order_id deduplication
      
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
        // CRITICAL: Filter out empty/invalid notifications (must have at least purchase_order_id OR delivery_request_id)
        if (!notif.purchase_order_id && !notif.delivery_request_id) {
          console.log(`🚫 FILTERING OUT: Notification ${notif.id} has no purchase_order_id or delivery_request_id (invalid)`);
          return;
        }
        
        // RELAXED: Allow notifications even if delivery address or material type is missing
        // These are valid delivery requests that can be updated later
        
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
        // Different purchase orders are ALWAYS unique, even if they have the same content
        // (e.g., same address/materials but different purchase orders are legitimate)
        if (notif.purchase_order_id) {
          if (finalSeenPOIds.has(notif.purchase_order_id)) {
            // DUPLICATE DETECTED - REMOVE IT IMMEDIATELY
            console.error(`🚫 DELETED: Duplicate notification for purchase_order_id ${notif.purchase_order_id} (removed: ${notif.id}, title: ${notif.title})`);
            return; // Skip this notification - DELETE IT
          }
          finalSeenPOIds.add(notif.purchase_order_id);
          
          // CRITICAL: Do NOT deduplicate by content when purchase_order_id exists
          // Different purchase orders can legitimately have the same content (address, materials)
          // Each purchase_order_id is unique and should have its own notification
          absolutelyFinal.push(notif);
        } 
        // CRITICAL: DO NOT show notifications without purchase_order_id
        // These are placeholder/default requests that don't have actual orders
        // We've already filtered these out earlier, but this is a final safety check
        else {
          console.log(`🚫 FINAL FILTER: Removing notification ${notif.id} - no purchase_order_id (placeholder/default request)`);
          return; // Skip notifications without purchase_order_id
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
      
      // FINAL VALIDATION: Remove any remaining empty/invalid notifications
      const validatedFinal = absolutelyFinal.filter((notif) => {
        // Must have either purchase_order_id or delivery_request_id
        if (!notif.purchase_order_id && !notif.delivery_request_id) {
          console.log(`🚫 FINAL FILTER: Removing notification ${notif.id} - no purchase_order_id or delivery_request_id`);
          return false;
        }
        
        // RELAXED: Allow notifications even if delivery address or material type is missing
        // These are valid delivery requests that can be updated later
        
        // Must have valid title
        if (!notif.title || notif.title.trim() === '') {
          console.log(`🚫 FINAL FILTER: Removing notification ${notif.id} - no title`);
          return false;
        }
        
        return true;
      });
      
      console.log(`✅ FINAL: ${finalNotifications.length} → ${absolutelyFinal.length} → ${validatedFinal.length} validated notifications (removed ${absolutelyFinal.length - validatedFinal.length} invalid/empty)`);
      console.log(`📊 Final notification breakdown: ${validatedFinal.filter(n => n.purchase_order_id).length} with purchase_order_id`);
      
      // ABSOLUTE FINAL CLEANUP: Remove any remaining duplicates using Map (guarantees uniqueness)
      const finalCleanup = new Map<string, Notification>();
      validatedFinal.forEach((notif) => {
        if (notif.purchase_order_id) {
          // Use purchase_order_id as key - only one per purchase_order_id
          if (!finalCleanup.has(notif.purchase_order_id)) {
            finalCleanup.set(notif.purchase_order_id, notif);
          } else {
            console.error(`🚨 FINAL CLEANUP: Removing duplicate purchase_order_id ${notif.purchase_order_id} (keeping first, removing ${notif.id})`);
          }
        } else if (notif.delivery_request_id) {
          // Use delivery_request_id as key - only one per delivery_request_id
          const key = `dr-${notif.delivery_request_id}`;
          if (!finalCleanup.has(key)) {
            finalCleanup.set(key, notif);
          } else {
            console.error(`🚨 FINAL CLEANUP: Removing duplicate delivery_request_id ${notif.delivery_request_id} (keeping first, removing ${notif.id})`);
          }
        } else {
          // Use notification id as key - only one per notification id
          if (!finalCleanup.has(notif.id)) {
            finalCleanup.set(notif.id, notif);
          } else {
            console.error(`🚨 FINAL CLEANUP: Removing duplicate notification id ${notif.id}`);
          }
        }
      });
      
      const absolutelyUnique = Array.from(finalCleanup.values());
      const finalDuplicatesRemoved = validatedFinal.length - absolutelyUnique.length;
      if (finalDuplicatesRemoved > 0) {
        console.error(`🚨 FINAL CLEANUP: Removed ${finalDuplicatesRemoved} duplicate notifications`);
      }
      
      console.log(`✅ ABSOLUTELY UNIQUE: ${absolutelyUnique.length} notifications (removed ${finalDuplicatesRemoved} duplicates in final cleanup)`);
      
      setNotifications(absolutelyUnique);
      setUnreadCount(absolutelyUnique.filter(n => !n.read).length);
      
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
    
    // Safety timeout: Always clear loading state after 35 seconds max (even if service hangs)
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Accept delivery safety timeout - clearing loading state');
      acceptingRef.current = null;
      setAcceptingId(null);
    }, 35000);
    
    try {
      // Wrap the service call with a timeout to prevent hanging
      const acceptPromise = trackingNumberService.onProviderAcceptsDelivery(requestId, providerId);
      
      // Race the accept promise against a timeout (30 seconds for multiple DB operations)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Accept delivery timed out after 30 seconds. Please try again.')), 30000);
      });
      
      console.log('🚚 Using TrackingNumberService to accept delivery:', requestId);
      
      const result = await Promise.race([acceptPromise, timeoutPromise]) as any;
      
      // Clear safety timeout if we got here
      clearTimeout(safetyTimeout);
      
      if (result && result.trackingNumber) {
        toast({
          title: '✅ Delivery Accepted!',
          description: `Tracking: ${result.trackingNumber}. Check "Scheduled" tab to see your accepted delivery!`,
        });
        loadNotifications();
        // Notify parent component to refresh dashboard data after a short delay
        // to ensure database update has completed
        if (onAcceptDelivery) {
          setTimeout(() => {
            onAcceptDelivery(requestId);
          }, 1000); // 1 second delay to ensure DB update is complete
        }
      } else {
        throw new Error('Failed to accept delivery - no tracking number generated');
      }
    } catch (error: any) {
      console.error('❌ Error accepting delivery:', error);
      clearTimeout(safetyTimeout);
      toast({
        title: 'Error',
        description: error.message || 'Could not accept delivery',
        variant: 'destructive'
      });
      // Clear accepting state IMMEDIATELY on error (don't wait)
      acceptingRef.current = null;
      setAcceptingId(null);
    } finally {
      // Always clear after a short delay as backup (independent of promise resolution)
      setTimeout(() => {
        acceptingRef.current = null;
        setAcceptingId(null);
      }, 1000); // 1 second delay as backup
    }
  };

  // IMMEDIATE CLEANUP: Remove duplicates from notifications state whenever it changes
  useEffect(() => {
    setNotifications(prev => {
      if (prev.length === 0) return prev;
      
      // Use the SAME simple Map approach as uniqueNotifications
      const uniqueMap = new Map<string, Notification>();
      
      prev.forEach((notif) => {
        // Determine the unique key (same logic as uniqueNotifications)
        let key: string;
        if (notif.purchase_order_id) {
          key = `po-${notif.purchase_order_id}`;
        } else if (notif.delivery_request_id) {
          key = `dr-${notif.delivery_request_id}`;
        } else {
          key = `id-${notif.id}`;
        }
        
        const existing = uniqueMap.get(key);
        if (existing) {
          // Prefer the one with delivery_request_id (so Accept button works)
          const preferNew = Boolean(
            notif.delivery_request_id && 
            !existing.delivery_request_id &&
            notif.purchase_order_id === existing.purchase_order_id
          );
          
          if (preferNew) {
            console.error(`🚨 IMMEDIATE CLEANUP: Replacing ${key} - keeping notification with delivery_request_id (ID: ${notif.id})`);
            uniqueMap.set(key, notif);
          } else {
            console.error(`🚨 IMMEDIATE CLEANUP: Removing duplicate ${key} - keeping existing (ID: ${existing.id}), removing ${notif.id}`);
          }
        } else {
          uniqueMap.set(key, notif);
        }
      });
      
      const cleaned = Array.from(uniqueMap.values());
      if (cleaned.length < prev.length) {
        console.error(`🚨 IMMEDIATE CLEANUP: Removed ${prev.length - cleaned.length} duplicate notifications from state`);
        setUnreadCount(cleaned.filter(n => !n.read).length);
      }
      return cleaned;
    });
  }, [notifications]); // Run whenever notifications change
  
  // Load on mount and set up real-time
  useEffect(() => {
    // Load fresh notifications
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

  // FINAL RENDER-LEVEL DEDUPLICATION: ONE notification per request (single Accept per professional builder request)
  // ABSOLUTE GUARANTEE: Only ONE notification per purchase_order_id, NO EXCEPTIONS
  // SIMPLIFIED APPROACH: Use a single Map keyed by purchase_order_id, then delivery_request_id, then notification id
  const uniqueNotifications = useMemo(() => {
    console.log(`🔍 DEDUPLICATION START: ${notifications.length} notifications to process`);
    
    // SIMPLE APPROACH: Use a Map keyed by purchase_order_id (if exists) or delivery_request_id (if exists) or notification id
    // This guarantees only ONE entry per key
    const uniqueMap = new Map<string, Notification>();
    
    notifications.forEach((notification) => {
      // Determine the unique key for this notification
      let key: string;
      
      if (notification.purchase_order_id) {
        // PRIMARY KEY: purchase_order_id - only ONE notification per purchase_order_id
        key = `po-${notification.purchase_order_id}`;
      } else if (notification.delivery_request_id) {
        // SECONDARY KEY: delivery_request_id - only ONE notification per delivery_request_id
        key = `dr-${notification.delivery_request_id}`;
      } else {
        // FALLBACK KEY: notification id - only ONE notification per id
        key = `id-${notification.id}`;
      }
      
      const existing = uniqueMap.get(key);
      if (existing) {
        // We already have a notification with this key
        // Prefer the one with delivery_request_id (so Accept button works)
        const preferNew = Boolean(
          notification.delivery_request_id && 
          !existing.delivery_request_id &&
          notification.purchase_order_id === existing.purchase_order_id
        );
        
        if (preferNew) {
          console.log(`🔄 REPLACING: ${key} - keeping notification with delivery_request_id (ID: ${notification.id})`);
          uniqueMap.set(key, notification);
        } else {
          console.log(`🗑️ SKIPPING: ${key} - keeping existing (ID: ${existing.id}), skipping duplicate (ID: ${notification.id})`);
        }
      } else {
        // First time seeing this key - add it
        uniqueMap.set(key, notification);
      }
    });
    
    // Convert Map to array
    const result = Array.from(uniqueMap.values());
    
    // Sort by timestamp (most recent first)
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // FINAL VERIFICATION: Double-check for any remaining duplicates
    const finalSeenPOIds = new Set<string>();
    const finalSeenDRIds = new Set<string>();
    const finalSeenIds = new Set<string>();
    const absolutelyFinal: Notification[] = [];
    
    result.forEach((n) => {
      if (n.purchase_order_id) {
        if (finalSeenPOIds.has(n.purchase_order_id)) {
          console.error(`🚨 CRITICAL: Found duplicate purchase_order_id ${n.purchase_order_id} in final result - removing ${n.id}`);
          return;
        }
        finalSeenPOIds.add(n.purchase_order_id);
      }
      
      if (n.delivery_request_id) {
        if (finalSeenDRIds.has(n.delivery_request_id)) {
          console.error(`🚨 CRITICAL: Found duplicate delivery_request_id ${n.delivery_request_id} in final result - removing ${n.id}`);
          return;
        }
        finalSeenDRIds.add(n.delivery_request_id);
      }
      
      if (finalSeenIds.has(n.id)) {
        console.error(`🚨 CRITICAL: Found duplicate notification id ${n.id} in final result - removing`);
        return;
      }
      finalSeenIds.add(n.id);
      
      absolutelyFinal.push(n);
    });
    
    if (absolutelyFinal.length < notifications.length) {
      console.log(`✅ DEDUPLICATION COMPLETE: ${notifications.length} → ${absolutelyFinal.length} (removed ${notifications.length - absolutelyFinal.length} duplicates)`);
    } else {
      console.log(`✅ DEDUPLICATION COMPLETE: ${notifications.length} notifications (no duplicates found)`);
    }
    
    // Final check: Log any remaining duplicates (should be zero)
    const poIdsInFinal = absolutelyFinal.map(n => n.purchase_order_id).filter(Boolean);
    const duplicatePOIds = poIdsInFinal.filter((id, index) => poIdsInFinal.indexOf(id) !== index);
    if (duplicatePOIds.length > 0) {
      console.error(`🚨 CRITICAL ERROR: Still found ${duplicatePOIds.length} duplicate purchase_order_ids after all filtering:`, duplicatePOIds);
    } else {
      console.log(`✅ VERIFICATION: No duplicate purchase_order_ids found in final result`);
    }
    
    return absolutelyFinal;
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
        ) : uniqueNotifications.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active delivery requests</p>
          </div>
        ) : (
          uniqueNotifications.map((notification, index) => {
            // React key: Use purchase_order_id as primary key (each PO is unique)
            // CRITICAL: Must match the key used in deduplication logic
            let uniqueKey: string;
            if (notification.purchase_order_id) {
              // Each purchase_order_id is unique - use it directly
              uniqueKey = `po-${notification.purchase_order_id}`;
            } else if (notification.delivery_request_id) {
              // Use delivery_request_id as fallback
              uniqueKey = `dr-${notification.delivery_request_id}`;
            } else {
              // No purchase_order_id or delivery_request_id - use notification id
              uniqueKey = `notif-${notification.id}`;
            }
            
            // FINAL SAFETY CHECK: Ensure key is truly unique by adding index if needed
            // (This should never happen if deduplication worked, but just in case)
            const finalKey = `${uniqueKey}-${index}`;
            
            return (
              <div
                key={finalKey}
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
                  <>
                    {/* Show if already accepted by another provider */}
                    {notification.provider_id && notification.provider_id !== userId ? (
                      <div className="flex-1 bg-amber-50 border border-amber-200 rounded p-2 text-center">
                        <p className="text-xs font-semibold text-amber-700 flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Already Accepted
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {notification.provider_name ? `By: ${notification.provider_name}` : 'By another provider'}
                        </p>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptDelivery(notification.delivery_request_id!)}
                        disabled={acceptingId === notification.delivery_request_id || (notification.provider_id && notification.provider_id !== userId)}
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
                  </>
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
