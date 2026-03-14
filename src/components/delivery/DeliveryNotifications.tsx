// COMPLETELY RESTRUCTURED: Simple, clear approach - ONE notification per purchase_order_id
// This replaces the complex deduplication logic with a straightforward approach
// UPDATED: 2026-03-14 - Fixed duplicate variable declarations and ensured only ONE card per order

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
import { cleanupDuplicateDeliveryRequests, cleanupDuplicatePurchaseOrders, checkForDuplicateDeliveryRequests } from '@/utils/cleanupDuplicateDeliveryRequests';

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
  po_number?: string; // CRITICAL: po_number for deduplication (multiple purchase_order_ids can have same po_number)
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
  const [cleaningUp, setCleaningUp] = useState(false);
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
      const seenPONumbers = new Set<string>(); // Track which po_numbers we've already added (CRITICAL for deduplication)
      
      // STEP 1: Fetch delivery_requests - only show unaccepted OR accepted by others
      // Don't show deliveries already accepted by THIS provider (those are in Scheduled tab)
      // Fetch all delivery_requests, then filter in JavaScript to show:
      // - provider_id IS NULL (unaccepted) - can accept
      // - provider_id IS NOT NULL AND provider_id != userId (accepted by another) - show as "Already Accepted"
      // CRITICAL: Only fetch actionable delivery requests (exclude delivered/completed/cancelled)
      // CRITICAL: Exclude cancelled requests to prevent duplicates from showing
      // CRITICAL: Also exclude requests marked as duplicates in rejection_reason
      // These are the only ones that should show in notifications
      const drResponse = await fetch(
        `${url}/rest/v1/delivery_requests?order=created_at.desc&limit=100&status=not.in.(delivered,completed,cancelled,rejected)&rejection_reason=is.null&select=*`,
        { headers, cache: 'no-store' }
      );
      
      let deliveryRequests: any[] = [];
      if (drResponse.ok) {
        const rawData = await drResponse.json();
        console.log(`📦 Raw delivery_requests from DB: ${rawData.length}`);
        
        // FIRST: Check for duplicates in raw data BEFORE deduplication
        // CRITICAL: Normalize purchase_order_ids to catch duplicates with whitespace/case differences
        const normalizePOId = (poId: string | null | undefined): string => {
          if (!poId) return '';
          return String(poId).trim().toLowerCase();
        };
        
        const poIdCounts = new Map<string, number>();
        const poIdToRequests = new Map<string, any[]>();
        rawData.forEach((dr: any) => {
          if (dr.purchase_order_id) {
            const normalizedPOId = normalizePOId(dr.purchase_order_id);
            if (normalizedPOId) {
              const count = poIdCounts.get(normalizedPOId) || 0;
              poIdCounts.set(normalizedPOId, count + 1);
              
              if (!poIdToRequests.has(normalizedPOId)) {
                poIdToRequests.set(normalizedPOId, []);
              }
              poIdToRequests.get(normalizedPOId)!.push(dr);
            }
          }
        });
        
        // Log duplicates found in raw data
        let duplicateCount = 0;
        poIdCounts.forEach((count, normalizedPOId) => {
          if (count > 1) {
            duplicateCount += count - 1; // Number of duplicates (total - 1)
            const requests = poIdToRequests.get(normalizedPOId)!;
            console.error(`🚨 DUPLICATE FOUND: purchase_order_id ${normalizedPOId} (normalized) has ${count} delivery_requests:`, 
              requests.map(r => ({ 
                id: r.id, 
                purchase_order_id: r.purchase_order_id, 
                normalized: normalizePOId(r.purchase_order_id),
                status: r.status, 
                created_at: r.created_at 
              })));
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
            // CRITICAL: Normalize purchase_order_id for deduplication
            const normalizedPOId = normalizePOId(dr.purchase_order_id);
            if (!normalizedPOId) {
              // Skip if normalization results in empty string
              return;
            }
            
            const existing = deliveryRequestsByPO.get(normalizedPOId);
            
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
                console.log(`🔄 REPLACING: PO ${normalizedPOId} (original: ${dr.purchase_order_id}) - keeping ${dr.status} (ID: ${dr.id}) over ${existing.status} (ID: ${existing.id})`);
              }
              deliveryRequestsByPO.set(normalizedPOId, dr);
            } else {
              console.log(`🗑️ SKIPPING: PO ${normalizedPOId} (original: ${dr.purchase_order_id}) - keeping ${existing.status} (ID: ${existing.id}) over ${dr.status} (ID: ${dr.id})`);
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
      const addedPONumbers = new Set<string>(); // Track which po_numbers we've already added (CRITICAL for deduplication)
      
      // CRITICAL: Pre-filter deliveryRequestsByPO to ensure ONLY ONE per purchase_order_id
      // This is the FIRST and MOST IMPORTANT deduplication step
      const preFilteredPO = new Map<string, any>();
      deliveryRequestsByPO.forEach((dr, poId) => {
        // Skip cancelled/rejected duplicates immediately
        if (dr.status === 'cancelled' || dr.status === 'rejected') {
          if (dr.rejection_reason && (
            dr.rejection_reason.includes('Duplicate') || 
            dr.rejection_reason.includes('duplicate') ||
            dr.rejection_reason.includes('cleaned up')
          )) {
            console.log(`🚫 PRE-FILTER: Skipping cancelled duplicate ${dr.id} for PO ${poId}`);
            return;
          }
        }
        
        // If we already have one for this PO, keep the better one
        if (preFilteredPO.has(poId)) {
          const existing = preFilteredPO.get(poId);
          const statusPriority: Record<string, number> = {
            'accepted': 5, 'assigned': 4, 'in_transit': 3, 'picked_up': 2,
            'out_for_delivery': 2, 'scheduled': 1, 'pending': 1,
            'completed': 0, 'cancelled': -1, 'rejected': -1
          };
          const existingPriority = statusPriority[existing.status] || 0;
          const newPriority = statusPriority[dr.status] || 0;
          
          if (newPriority > existingPriority) {
            console.log(`🔄 PRE-FILTER: Replacing PO ${poId} - ${existing.status} → ${dr.status}`);
            preFilteredPO.set(poId, dr);
          } else {
            console.log(`🗑️ PRE-FILTER: Keeping existing PO ${poId} - ${existing.status} over ${dr.status}`);
          }
        } else {
          preFilteredPO.set(poId, dr);
        }
      });
      
      console.log(`✅ PRE-FILTER: ${deliveryRequestsByPO.size} → ${preFilteredPO.size} unique purchase orders`);
      
      // Use the pre-filtered map instead of the original
      const finalDeliveryRequestsByPO = preFilteredPO;
      
      // First, collect all purchase_order_ids to verify they exist
      const poIdsToVerify = Array.from(finalDeliveryRequestsByPO.keys()).filter(poId => 
        poId && poId.trim() !== '' && poId !== 'null' && poId !== 'undefined'
      );
      
      // RELAXED: Verify purchase_orders exist, but if verification fails, show all notifications anyway
      // This ensures delivery alerts come through even if there's a temporary database issue
      // CRITICAL: Also fetch po_number to deduplicate by po_number (multiple purchase_order_ids can have same po_number)
      let validPOIds = new Set<string>(poIdsToVerify);
      const poIdToPONumber = new Map<string, string>(); // Map purchase_order_id -> po_number
      const poNumberToPOId = new Map<string, string>(); // Map po_number -> first purchase_order_id (for deduplication)
      
      if (poIdsToVerify.length > 0) {
        try {
          const verifyResponse = await fetch(
            `${url}/rest/v1/purchase_orders?id=in.(${poIdsToVerify.join(',')})&select=id,po_number&limit=1000`,
            { headers, cache: 'no-store' }
          );
          
          if (verifyResponse.ok) {
            const validPOs = await verifyResponse.json();
            validPOIds = new Set(validPOs.map((po: any) => po.id));
            
            // Build maps for po_number deduplication
            validPOs.forEach((po: any) => {
              if (po.id && po.po_number) {
                poIdToPONumber.set(po.id, po.po_number);
                
                // If we haven't seen this po_number before, map it to this purchase_order_id
                const normalizedPONumber = String(po.po_number).trim().toLowerCase();
                if (!poNumberToPOId.has(normalizedPONumber)) {
                  poNumberToPOId.set(normalizedPONumber, po.id);
                } else {
                  // Duplicate po_number found! Log it
                  const existingPOId = poNumberToPOId.get(normalizedPONumber)!;
                  console.error(`🚨🚨🚨 DUPLICATE PO_NUMBER DETECTED: po_number "${po.po_number}" has multiple purchase_order_ids: ${existingPOId} and ${po.id}`);
                }
              }
            });
            
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
      
      // CRITICAL FIX: Use a Map to ensure ONLY ONE notification per purchase_order_id
      // This is the ABSOLUTE FINAL check before creating notifications
      // SIMPLIFIED: Keep ONLY the FIRST delivery_request per purchase_order_id - no complex logic
      const finalNotificationMap = new Map<string, any>();
      
      // CRITICAL: Before creating notifications, check if finalDeliveryRequestsByPO has duplicates
      // This can happen if the earlier deduplication steps didn't work correctly
      const allDRsByPO = new Map<string, any[]>();
      const seenPOIds = new Set<string>();
      
      // FIRST PASS: Collect all delivery_requests by purchase_order_id
      // Also detect if the same purchase_order_id appears multiple times in finalDeliveryRequestsByPO
      for (const [poId, dr] of finalDeliveryRequestsByPO.entries()) {
        if (!poId || poId.trim() === '' || poId === 'null' || poId === 'undefined') {
          continue;
        }
        
        // CRITICAL: Check if we've already seen this purchase_order_id
        if (seenPOIds.has(poId)) {
          console.error(`🚨🚨🚨 CRITICAL DUPLICATE DETECTED: purchase_order_id ${poId} appears MULTIPLE times in finalDeliveryRequestsByPO!`);
          console.error(`   Existing delivery request: ${allDRsByPO.get(poId)?.[0]?.id}`);
          console.error(`   Duplicate delivery request: ${dr.id}`);
        }
        
        seenPOIds.add(poId);
        
        if (!allDRsByPO.has(poId)) {
          allDRsByPO.set(poId, []);
        }
        allDRsByPO.get(poId)!.push(dr);
      }
      
      // SECOND PASS: For each purchase_order_id, keep ONLY THE FIRST delivery_request
      // BUT ALSO: If multiple purchase_order_ids have the same po_number, keep only ONE of them
      const usedPONumbers = new Set<string>();
      
      for (const [poId, drs] of allDRsByPO.entries()) {
        if (drs.length > 1) {
          console.error(`🚨🚨🚨 FOUND ${drs.length} delivery_requests for purchase_order_id ${poId}! Keeping ONLY the first one.`);
          console.error(`   Delivery request IDs: ${drs.map(dr => dr.id).join(', ')}`);
          console.error(`   Delivery request statuses: ${drs.map(dr => dr.status).join(', ')}`);
          console.error(`   Delivery request created_at: ${drs.map(dr => dr.created_at).join(', ')}`);
        }
        
        // Check if this purchase_order_id's po_number has already been used
        const poNumber = poIdToPONumber.get(poId);
        if (poNumber) {
          const normalizedPONumber = String(poNumber).trim().toLowerCase();
          if (usedPONumbers.has(normalizedPONumber)) {
            console.error(`🚫 SKIPPING: purchase_order_id ${poId} has po_number "${poNumber}" which was already used. Keeping only the first purchase_order with this po_number.`);
            continue; // Skip this one - we already have a notification for this po_number
          }
          usedPONumbers.add(normalizedPONumber);
        }
        
        // Keep ONLY the first one - simplest possible approach
        finalNotificationMap.set(poId, drs[0]);
      }
      
      console.log(`✅ FINAL NOTIFICATION MAP: ${finalNotificationMap.size} unique purchase_order_ids (was ${finalDeliveryRequestsByPO.size} in finalDeliveryRequestsByPO)`);
      
      // THIRD PASS: Create notifications from the deduplicated map
      for (const [poId, dr] of finalNotificationMap.entries()) {
        // CRITICAL: Skip delivery requests without purchase_order_id (these are placeholder/default requests)
        if (!poId || poId.trim() === '' || poId === 'null' || poId === 'undefined') {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id} has no valid purchase_order_id (placeholder/default request)`);
          continue;
        }
        
        // ABSOLUTE GUARANTEE: This should never happen now, but double-check
        if (addedPOIds.has(poId)) {
          console.error(`🚫🚫🚫 ABSOLUTE BLOCK: purchase_order_id ${poId} already added! This should never happen. Skipping delivery_request ${dr.id}`);
          continue;
        }
        
        // RELAXED: Only skip if we're certain the purchase_order doesn't exist
        // If verification failed or purchase_order wasn't found, show the notification anyway
        // This ensures delivery alerts come through even if there's a temporary database issue
        if (validPOIds.size > 0 && !validPOIds.has(poId)) {
          console.log(`⚠️ Delivery request ${dr.id} has purchase_order_id ${poId} but purchase_order not found (showing anyway to ensure alerts come through)`);
          // Don't skip - show the notification anyway to ensure alerts come through
        }
        
        // ABSOLUTE GUARANTEE: Also check delivery_request_id to prevent duplicates
        if (dr.id && addedDRIds.has(dr.id)) {
          console.error(`🚫 BLOCKED: Already added notification for delivery_request_id ${dr.id}, skipping`);
          continue;
        }
        
        // Mark this purchase_order_id as used IMMEDIATELY (already in finalNotificationMap from SECOND PASS)
        addedPOIds.add(poId);
        if (dr.id) addedDRIds.add(dr.id);
        
        // CRITICAL: Skip delivered/completed/cancelled/rejected deliveries - these shouldn't show in notifications
        // Only show pending, accepted, assigned, in_transit deliveries that need action
        if (['delivered', 'completed', 'cancelled', 'rejected'].includes(dr.status)) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id} has status ${dr.status} - already completed/cancelled/rejected`);
          continue;
        }
        
        // CRITICAL: Skip if rejection_reason indicates this was a duplicate that was cleaned up
        if (dr.rejection_reason && (
          dr.rejection_reason.includes('Duplicate delivery request') || 
          dr.rejection_reason.includes('duplicate') ||
          dr.rejection_reason.includes('cleaned up')
        )) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id} was marked as duplicate: ${dr.rejection_reason}`);
          continue;
        }
        
        // CRITICAL: Skip if already accepted by THIS provider (those should be in Scheduled tab, not notifications)
        if (dr.provider_id === userId && ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(dr.status)) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id} already accepted by this provider (status: ${dr.status}) - should be in Scheduled tab`);
          continue;
        }
        
        // Create notification - this purchase_order_id is guaranteed to be unique
        // CRITICAL: Include po_number for deduplication
        const poNumber = poIdToPONumber.get(poId);
        if (!poNumber) {
          console.warn(`⚠️⚠️⚠️ WARNING: purchase_order_id ${poId} has NO po_number! This will cause deduplication to fail if there are multiple purchase_orders with same po_number.`);
        } else {
          console.log(`✅ Found po_number "${poNumber}" for purchase_order_id ${poId}`);
          // CRITICAL: Check if we've already added a notification for this po_number
          const normalizedPONumber = String(poNumber).trim().toLowerCase();
          if (addedPONumbers.has(normalizedPONumber)) {
            console.error(`🚨🚨🚨 BLOCKED: po_number "${poNumber}" already has a notification! Skipping purchase_order_id ${poId} to prevent duplicate cards.`);
            return; // SKIP THIS - we already have a notification for this po_number
          }
          addedPONumbers.add(normalizedPONumber);
        }
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
          po_number: poNumber || undefined, // CRITICAL: Include po_number for deduplication
          delivery_request_id: dr.id, // For accepting
          provider_id: dr.provider_id || null, // Provider who accepted (null = unaccepted)
          provider_name: dr.provider_name || dr.delivery_provider_name || undefined // Provider name if available
        });
      }
      
      // CRITICAL VERIFICATION: Ensure we only have ONE notification per purchase_order_id
      const finalPOIds = finalNotifications.map(n => n.purchase_order_id).filter(Boolean);
      const duplicatePOIdsCheck = finalPOIds.filter((id, index) => finalPOIds.indexOf(id) !== index);
      if (duplicatePOIdsCheck.length > 0) {
        console.error(`🚨🚨🚨 CRITICAL: Found ${duplicatePOIdsCheck.length} duplicate purchase_order_ids in finalNotifications!`);
        console.error(`   Duplicate purchase_order_ids: ${[...new Set(duplicatePOIdsCheck)].join(', ')}`);
        // Log all notifications with duplicate purchase_order_ids
        duplicatePOIdsCheck.forEach(dupPOId => {
          const dupNotifications = finalNotifications.filter(n => n.purchase_order_id === dupPOId);
          console.error(`   Purchase order ${dupPOId} has ${dupNotifications.length} notifications:`, 
            dupNotifications.map(n => ({ id: n.id, delivery_request_id: n.delivery_request_id })));
        });
        console.error(`   Removing duplicates...`);
        
        // Emergency cleanup - keep only first occurrence
        const emergencyMap = new Map<string, Notification>();
        finalNotifications.forEach(notif => {
          if (notif.purchase_order_id) {
            if (!emergencyMap.has(notif.purchase_order_id)) {
              emergencyMap.set(notif.purchase_order_id, notif);
            } else {
              console.error(`🚨 EMERGENCY REMOVAL: Duplicate notification for PO ${notif.purchase_order_id} - removing ${notif.id} (keeping ${emergencyMap.get(notif.purchase_order_id)?.id})`);
            }
          } else {
            emergencyMap.set(notif.id, notif);
          }
        });
        const beforeCount = finalNotifications.length;
        const cleanedNotifications = Array.from(emergencyMap.values());
        // Clear and repopulate finalNotifications
        finalNotifications.length = 0;
        finalNotifications.push(...cleanedNotifications);
        console.error(`🚨 EMERGENCY CLEANUP: Reduced finalNotifications from ${beforeCount} to ${cleanedNotifications.length} (removed ${beforeCount - cleanedNotifications.length} duplicates)`);
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
            
            // CRITICAL: Check po_number FIRST - if we've already added a notification for this po_number, SKIP IT
            if (po.po_number) {
              const normalizedPONumber = String(po.po_number).trim().toLowerCase();
              if (addedPONumbers.has(normalizedPONumber)) {
                console.error(`🚨🚨🚨 BLOCKED: po_number "${po.po_number}" already has a notification! Skipping purchase_order_id ${po.id} to prevent duplicate cards.`);
                skippedCount++;
                return; // SKIP THIS - we already have a notification for this po_number
              }
              addedPONumbers.add(normalizedPONumber);
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
              po_number: po.po_number || undefined, // CRITICAL: Include po_number for deduplication
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
      const duplicatePOIdsFinal = poIds.filter((id, index) => poIds.indexOf(id) !== index);
      if (duplicatePOIdsFinal.length > 0) {
        console.error(`🚨 CRITICAL ERROR: Still found duplicate purchase_order_ids after all deduplication:`, duplicatePOIdsFinal);
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

  // Reject delivery handler
  const handleRejectDelivery = async (requestId: string) => {
    if (!requestId) {
      console.error('❌ No delivery request ID provided for rejection');
      return;
    }
    
    // Ask for rejection reason
    const rejectReason = window.prompt('Please provide a reason for rejecting this delivery request:');
    if (!rejectReason || rejectReason.trim() === '') {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this delivery.",
        variant: "destructive"
      });
      return;
    }
    
    setRejectingId(requestId);
    
    try {
      const { url, headers } = getAuthHeaders();
      
      // Update delivery_request status to rejected
      const response = await fetch(
        `${url}/rest/v1/delivery_requests?id=eq.${requestId}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'rejected',
            rejection_reason: rejectReason.trim(),
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      );
      
      if (response.ok) {
        toast({
          title: "✅ Delivery Rejected",
          description: "The delivery request has been rejected. The builder will be notified.",
        });
        loadNotifications();
        if (onRejectDelivery) {
          onRejectDelivery(requestId);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to reject delivery');
      }
    } catch (error: any) {
      console.error('❌ Error rejecting delivery:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject delivery. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setRejectingId(null);
    }
  };

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
  // This runs AFTER uniqueNotifications useMemo, so it's a final safety net
  useEffect(() => {
    // Only run cleanup if we have notifications
    if (notifications.length === 0) return;
    
    // Use the SAME simple Map approach as uniqueNotifications
    const uniqueMap = new Map<string, Notification>();
    
    notifications.forEach((notif) => {
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
    
    // Only update state if we actually removed duplicates (prevent infinite loop)
    if (cleaned.length < notifications.length) {
      console.error(`🚨 IMMEDIATE CLEANUP: Removed ${notifications.length - cleaned.length} duplicate notifications from state`);
      setNotifications(cleaned);
      setUnreadCount(cleaned.filter(n => !n.read).length);
    } else if (cleaned.length === notifications.length) {
      // Check if the arrays are actually different (same length but different order/content)
      const prevKeys = new Set(notifications.map(n => 
        n.purchase_order_id ? `po-${n.purchase_order_id}` : 
        n.delivery_request_id ? `dr-${n.delivery_request_id}` : 
        `id-${n.id}`
      ));
      const cleanedKeys = new Set(cleaned.map(n => 
        n.purchase_order_id ? `po-${n.purchase_order_id}` : 
        n.delivery_request_id ? `dr-${n.delivery_request_id}` : 
        `id-${n.id}`
      ));
      
      // If keys are different, update state
      if (prevKeys.size !== cleanedKeys.size || 
          Array.from(prevKeys).some(k => !cleanedKeys.has(k))) {
        console.error(`🚨 IMMEDIATE CLEANUP: Reordering notifications (same count but different order)`);
        setNotifications(cleaned);
      }
    }
  }, [notifications]); // Run whenever notifications change
  
  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (settings.soundEnabled) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.8;
        audio.play().catch(e => console.log('Audio play prevented:', e));
      } catch (e) {
        console.log('Could not play notification sound:', e);
      }
    }
  }, [settings.soundEnabled]);

  // Show browser push notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (settings.pushEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
            body: `${notification.materialType || 'Construction Materials'} - ${notification.estimatedCost ? `KES ${notification.estimatedCost.toLocaleString()}` : 'New delivery available'}`,
            icon: '/ujenzixform-logo.png',
            badge: '/badge.png',
            tag: notification.delivery_request_id || notification.id,
            requireInteraction: true
          };
          
          // Add vibration if enabled (may not be supported in all browsers)
          if (settings.vibrationEnabled && 'vibrate' in navigator) {
            (notificationOptions as any).vibrate = [200, 100, 200];
          }
          
          new Notification('🚚 New Delivery Request - UjenziPro', notificationOptions);
        } catch (e) {
          console.log('Could not show browser notification:', e);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showBrowserNotification(notification);
          }
        });
      }
    }
  }, [settings.pushEnabled, settings.vibrationEnabled]);

  // Vibrate device
  const vibrateDevice = useCallback(() => {
    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {
        console.log('Could not vibrate device:', e);
      }
    }
  }, [settings.vibrationEnabled]);

  // Track previous notification count to detect new ones
  const prevNotificationCountRef = useRef<number>(0);
  const prevNotificationIdsRef = useRef<Set<string>>(new Set());

  // Alert when new notifications arrive
  useEffect(() => {
    if (notifications.length === 0) {
      prevNotificationCountRef.current = 0;
      prevNotificationIdsRef.current.clear();
      return;
    }

    // Find new notifications (ones we haven't seen before)
    const currentIds = new Set(notifications.map(n => n.id));
    const newNotifications = notifications.filter(n => !prevNotificationIdsRef.current.has(n.id));
    
    // Only alert for NEW notifications (not on initial load)
    if (prevNotificationIdsRef.current.size > 0 && newNotifications.length > 0) {
      // Filter to only pending/unread notifications
      const actionableNotifications = newNotifications.filter(n => 
        !n.read && 
        (n.status === 'pending' || !n.status) &&
        n.delivery_request_id
      );

      if (actionableNotifications.length > 0 && settings.newDeliveryAlerts) {
        const latestNotification = actionableNotifications[0];
        
        // Play sound
        playNotificationSound();
        
        // Vibrate device
        vibrateDevice();
        
        // Show browser notification
        showBrowserNotification(latestNotification);
        
        // Show toast notification
        toast({
          title: '🚚 New Delivery Request!',
          description: `${latestNotification.materialType || 'Construction Materials'}${latestNotification.estimatedCost ? ` - KES ${latestNotification.estimatedCost.toLocaleString()}` : ''}`,
          duration: 10000,
        });
      }
    }

    // Update refs
    prevNotificationCountRef.current = notifications.length;
    notifications.forEach(n => prevNotificationIdsRef.current.add(n.id));
  }, [notifications, settings.newDeliveryAlerts, playNotificationSound, vibrateDevice, showBrowserNotification, toast]);

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
  // ABSOLUTE GUARANTEE: Only ONE notification per po_number (if available), then purchase_order_id, NO EXCEPTIONS
  // CRITICAL: Use po_number as PRIMARY key since multiple purchase_order_ids can have same po_number
  const uniqueNotifications = useMemo(() => {
    console.log(`🔍 DEDUPLICATION START: ${notifications.length} notifications to process`);
    
    // CRITICAL: Log all notifications with their po_numbers to debug
    const notificationsWithPONumber = notifications.filter(n => n.po_number);
    const notificationsWithoutPONumber = notifications.filter(n => !n.po_number);
    console.log(`📊 NOTIFICATIONS BREAKDOWN: ${notificationsWithPONumber.length} with po_number, ${notificationsWithoutPONumber.length} without po_number`);
    if (notificationsWithPONumber.length > 0) {
      console.log(`📊 PO_NUMBERS FOUND:`, notificationsWithPONumber.map(n => ({ id: n.id, po_number: n.po_number, purchase_order_id: n.purchase_order_id?.substring(0, 8) })));
    }
    if (notificationsWithoutPONumber.length > 0) {
      console.warn(`⚠️ NOTIFICATIONS WITHOUT PO_NUMBER:`, notificationsWithoutPONumber.map(n => ({ id: n.id, purchase_order_id: n.purchase_order_id?.substring(0, 8) })));
    }
    
    // CRITICAL: Normalize purchase_order_ids and po_numbers to handle whitespace/case differences
    const normalizePOId = (poId: string | undefined | null): string => {
      if (!poId) return '';
      return String(poId).trim().toLowerCase();
    };
    
    const normalizePONumber = (poNumber: string | undefined | null): string => {
      if (!poNumber) return '';
      return String(poNumber).trim().toLowerCase();
    };
    
    // CRITICAL: Group notifications by po_number to see if there are duplicates
    const byPONumber = new Map<string, Notification[]>();
    notifications.forEach(n => {
      if (n.po_number) {
        const normalized = normalizePONumber(n.po_number);
        if (!byPONumber.has(normalized)) {
          byPONumber.set(normalized, []);
        }
        byPONumber.get(normalized)!.push(n);
      }
    });
    
    byPONumber.forEach((notifs, poNum) => {
      if (notifs.length > 1) {
        console.error(`🚨🚨🚨 FOUND ${notifs.length} NOTIFICATIONS WITH SAME PO_NUMBER "${poNum}":`, 
          notifs.map(n => ({ id: n.id, purchase_order_id: n.purchase_order_id?.substring(0, 8), delivery_request_id: n.delivery_request_id?.substring(0, 8) })));
      }
    });
    
    // STEP 1: Fetch po_numbers for all purchase_order_ids to enable po_number-based deduplication
    // We'll do this in a separate step, but for now, use purchase_order_id as fallback
    
    // SIMPLE APPROACH: Use a Map keyed by po_number (if available), then purchase_order_id, then delivery_request_id, then notification id
    // This guarantees only ONE entry per key
    const uniqueMap = new Map<string, Notification>();
    const seenPONumbers = new Set<string>(); // Track po_numbers we've seen
    
    notifications.forEach((notification) => {
      // Determine the unique key for this notification
      // CRITICAL: Use po_number as PRIMARY key if available (multiple purchase_order_ids can have same po_number)
      let key: string;
      
      // PRIMARY KEY: po_number (if available) - this is the MOST IMPORTANT deduplication
      // Multiple purchase_order_ids can have the same po_number, so we MUST deduplicate by po_number first
      if (notification.po_number) {
        const normalizedPONumber = normalizePONumber(notification.po_number);
        if (normalizedPONumber) {
          key = `ponum-${normalizedPONumber}`;
          
          // CRITICAL: If we've already seen this po_number, SKIP IT IMMEDIATELY
          if (seenPONumbers.has(normalizedPONumber)) {
            console.error(`🚨🚨🚨 CRITICAL: Duplicate po_number "${notification.po_number}" detected! Skipping notification ${notification.id} (purchase_order_id: ${notification.purchase_order_id})`);
            return; // SKIP THIS NOTIFICATION - we already have one for this po_number
          }
          seenPONumbers.add(normalizedPONumber);
        } else {
          // po_number is empty/null, fall through to purchase_order_id
          key = '';
        }
      }
      
      // SECONDARY KEY: When po_number is missing, use composite key (deliveryAddress + materialType + same hour)
      // This handles cases where multiple purchase_orders exist for the same logical order but have no po_number
      if (!key && notification.deliveryAddress && notification.materialType && notification.timestamp) {
        const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = String(notification.materialType).trim().toLowerCase();
        // Group by same hour (YYYY-MM-DD-HH) to catch duplicates created within the same hour
        const hourKey = new Date(notification.timestamp).toISOString().slice(0, 13); // "2026-03-14T12"
        const compositeKey = `${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
        key = `composite-${compositeKey}`;
        console.log(`🔑 FALLBACK KEY (no po_number): Using composite key "${compositeKey}" for notification ${notification.id}`);
      }
      
      // TERTIARY KEY: purchase_order_id (normalized) - only if po_number and composite key not available
      if (!key && notification.purchase_order_id) {
        const normalizedPOId = normalizePOId(notification.purchase_order_id);
        key = `po-${normalizedPOId}`;
      } else if (!key && notification.delivery_request_id) {
        // QUATERNARY KEY: delivery_request_id - only ONE notification per delivery_request_id
        key = `dr-${notification.delivery_request_id}`;
      } else if (!key) {
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
    
    // FINAL VERIFICATION: Double-check for any remaining duplicates by po_number FIRST, then purchase_order_id
    const finalSeenPONumbers = new Set<string>();
    const finalSeenPOIds = new Set<string>();
    const finalSeenDRIds = new Set<string>();
    const finalSeenIds = new Set<string>();
    const absolutelyFinal: Notification[] = [];
    
    result.forEach((n) => {
      // Check po_number FIRST (highest priority - multiple purchase_order_ids can have same po_number)
      if (n.po_number) {
        const normalizedPONumber = normalizePONumber(n.po_number);
        if (normalizedPONumber && finalSeenPONumbers.has(normalizedPONumber)) {
          console.error(`🚨🚨🚨 CRITICAL: Found duplicate po_number "${n.po_number}" in final result - REMOVING ${n.id} (purchase_order_id: ${n.purchase_order_id})`);
          return; // Skip this duplicate
        }
        if (normalizedPONumber) {
          finalSeenPONumbers.add(normalizedPONumber);
        }
        absolutelyFinal.push(n);
        return; // Added, move to next
      }
      
      // FALLBACK: If no po_number, check composite key (deliveryAddress + materialType + same hour)
      if (n.deliveryAddress && n.materialType && n.timestamp) {
        const normalizedAddress = String(n.deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = String(n.materialType).trim().toLowerCase();
        const hourKey = new Date(n.timestamp).toISOString().slice(0, 13);
        const compositeKey = `${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
        if (finalSeenPONumbers.has(`composite-${compositeKey}`)) {
          console.error(`🚨🚨🚨 CRITICAL: Found duplicate composite key "${compositeKey}" in final result - REMOVING ${n.id} (purchase_order_id: ${n.purchase_order_id})`);
          return; // Skip this duplicate
        }
        finalSeenPONumbers.add(`composite-${compositeKey}`);
        absolutelyFinal.push(n);
        return; // Added, move to next
      }
      
      // Check purchase_order_id SECOND (if no po_number)
      if (n.purchase_order_id) {
        if (finalSeenPOIds.has(n.purchase_order_id)) {
          console.error(`🚨 CRITICAL: Found duplicate purchase_order_id ${n.purchase_order_id} in final result - REMOVING ${n.id}`);
          return; // Skip this duplicate
        }
        finalSeenPOIds.add(n.purchase_order_id);
        absolutelyFinal.push(n);
        return; // Added, move to next
      }
      
      // Check delivery_request_id SECOND
      if (n.delivery_request_id) {
        if (finalSeenDRIds.has(n.delivery_request_id)) {
          console.error(`🚨 CRITICAL: Found duplicate delivery_request_id ${n.delivery_request_id} in final result - REMOVING ${n.id}`);
          return; // Skip this duplicate
        }
        finalSeenDRIds.add(n.delivery_request_id);
        absolutelyFinal.push(n);
        return; // Added, move to next
      }
      
      // Check notification id LAST (fallback)
      if (finalSeenIds.has(n.id)) {
        console.error(`🚨 CRITICAL: Found duplicate notification id ${n.id} in final result - REMOVING`);
        return; // Skip this duplicate
      }
      finalSeenIds.add(n.id);
      absolutelyFinal.push(n);
    });
    
    // CRITICAL: Log if we found duplicates in the final pass
    if (result.length !== absolutelyFinal.length) {
      console.error(`🚨🚨🚨 CRITICAL DEDUPLICATION FAILURE: Map had ${result.length} items but final check found ${absolutelyFinal.length} unique items - REMOVED ${result.length - absolutelyFinal.length} duplicates!`);
    }
    
    // ABSOLUTE FINAL CHECK: Force remove duplicates by po_number OR composite key - this is the LAST line of defense
    const absolutelyFinalByPONumber = new Map<string, Notification>();
    const absolutelyFinalByComposite = new Map<string, Notification>();
    const absolutelyFinalWithoutKey: Notification[] = [];
    
    absolutelyFinal.forEach(n => {
      if (n.po_number) {
        const normalized = normalizePONumber(n.po_number);
        if (normalized && !absolutelyFinalByPONumber.has(normalized)) {
          absolutelyFinalByPONumber.set(normalized, n);
        } else if (normalized) {
          console.error(`🚨🚨🚨🚨🚨 ABSOLUTE FINAL FORCE REMOVAL: Duplicate po_number "${n.po_number}" - removing ${n.id}, keeping ${absolutelyFinalByPONumber.get(normalized)?.id}`);
        }
      } else if (n.deliveryAddress && n.materialType && n.timestamp) {
        // FALLBACK: Use composite key when po_number is missing
        const normalizedAddress = String(n.deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = String(n.materialType).trim().toLowerCase();
        const hourKey = new Date(n.timestamp).toISOString().slice(0, 13);
        const compositeKey = `${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
        if (!absolutelyFinalByComposite.has(compositeKey)) {
          absolutelyFinalByComposite.set(compositeKey, n);
        } else {
          console.error(`🚨🚨🚨🚨🚨 ABSOLUTE FINAL FORCE REMOVAL: Duplicate composite key "${compositeKey}" - removing ${n.id}, keeping ${absolutelyFinalByComposite.get(compositeKey)?.id}`);
        }
      } else {
        absolutelyFinalWithoutKey.push(n);
      }
    });
    
    const finalResult = [...absolutelyFinalByPONumber.values(), ...absolutelyFinalByComposite.values(), ...absolutelyFinalWithoutKey];
    
    if (finalResult.length < absolutelyFinal.length) {
      console.error(`🚨🚨🚨 ABSOLUTE FINAL: Force removed ${absolutelyFinal.length - finalResult.length} duplicates by po_number!`);
    }
    
    // Log the final count
    if (finalResult.length < notifications.length) {
      console.log(`✅ RENDER: Single Accept per request - ${notifications.length} → ${finalResult.length} (removed ${notifications.length - finalResult.length} duplicates)`);
    } else if (finalResult.length === notifications.length) {
      console.log(`✅ RENDER: All ${finalResult.length} notifications are unique`);
    }
    
    console.log(`📊 FINAL BREAKDOWN: ${absolutelyFinalByPONumber.size} unique po_numbers, ${absolutelyFinalByComposite.size} unique composite keys, ${absolutelyFinalWithoutKey.length} without key`);
    
    // CRITICAL: Log each notification's key for debugging
    console.log(`🔍 FINAL NOTIFICATIONS (${finalResult.length}):`, finalResult.map(n => ({
      id: n.id,
      po_number: n.po_number || 'MISSING',
      po_id: n.purchase_order_id?.substring(0, 8) || 'N/A',
      dr_id: n.delivery_request_id?.substring(0, 8) || 'N/A',
      title: n.title
    })));
    
    // Final check: Log any remaining duplicates by po_number FIRST, then purchase_order_id
    const poNumbersInFinal = finalResult.map(n => n.po_number).filter(Boolean);
    const duplicatePONumbers = poNumbersInFinal.filter((num, index) => poNumbersInFinal.indexOf(num) !== index);
    if (duplicatePONumbers.length > 0) {
      console.error(`🚨🚨🚨🚨🚨 CRITICAL ERROR: Still found ${duplicatePONumbers.length} duplicate po_numbers after all filtering:`, duplicatePONumbers);
    }
    
    const poIdsInFinal = finalResult.map(n => n.purchase_order_id).filter(Boolean);
    const duplicatePOIdsMemo = poIdsInFinal.filter((id, index) => poIdsInFinal.indexOf(id) !== index);
    if (duplicatePOIdsMemo.length > 0) {
      console.error(`🚨🚨🚨 CRITICAL ERROR: Still found ${duplicatePOIdsMemo.length} duplicate purchase_order_ids after all filtering:`, duplicatePOIdsMemo);
    } else {
      console.log(`✅ VERIFICATION: No duplicate purchase_order_ids found in final result`);
    }
    
    if (duplicatePONumbers.length === 0 && duplicatePOIdsMemo.length === 0) {
      console.log(`✅ VERIFICATION: No duplicates found in final result`);
    }
    
    return finalResult;
  }, [notifications]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {showSettings ? 'Hide Settings' : 'Settings'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={async () => {
              setCleaningUp(true);
              try {
                // First check for duplicates
                const checkResult = await checkForDuplicateDeliveryRequests();
                if (checkResult.hasDuplicates) {
                  toast({
                    title: '🔍 Duplicates Found',
                    description: `Found ${checkResult.duplicateCount} duplicate delivery requests. Cleaning up...`,
                  });
                  
                  // Clean up duplicates - BOTH purchase_orders and delivery_requests
                  const [poCleanupResult, drCleanupResult] = await Promise.all([
                    cleanupDuplicatePurchaseOrders(),
                    cleanupDuplicateDeliveryRequests()
                  ]);
                  
                  const totalCancelled = (poCleanupResult.duplicatesCancelled || 0) + (drCleanupResult.duplicatesCancelled || 0);
                  const allSuccess = poCleanupResult.success && drCleanupResult.success;
                  
                  if (allSuccess && totalCancelled > 0) {
                    toast({
                      title: '✅ Cleanup Complete',
                      description: `Cancelled ${poCleanupResult.duplicatesCancelled || 0} duplicate purchase orders and ${drCleanupResult.duplicatesCancelled || 0} duplicate delivery requests.`,
                    });
                    // Reload notifications after cleanup
                    setTimeout(() => loadNotifications(), 1000);
                  } else if (allSuccess) {
                    toast({
                      title: '✅ No Duplicates',
                      description: 'No duplicates found. Everything looks good!',
                    });
                  } else {
                    const allErrors = [...(poCleanupResult.errors || []), ...(drCleanupResult.errors || [])];
                    toast({
                      title: '⚠️ Cleanup Issues',
                      description: `Cleaned up ${totalCancelled} duplicates, but encountered ${allErrors.length} errors.`,
                      variant: 'destructive'
                    });
                  }
                } else {
                  toast({
                    title: '✅ No Duplicates',
                    description: 'No duplicate delivery requests found. Everything looks good!',
                  });
                }
              } catch (error: any) {
                toast({
                  title: '❌ Cleanup Failed',
                  description: error.message || 'Failed to clean up duplicates',
                  variant: 'destructive'
                });
              } finally {
                setCleaningUp(false);
              }
            }}
            disabled={cleaningUp}
            title="Check and clean up duplicate delivery requests"
          >
            {cleaningUp ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Cleaning...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" /> Fix Duplicates
              </>
            )}
          </Button>
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

      {/* Notification Settings Panel */}
      {showSettings && (
        <Card className="border-2 border-teal-200 bg-teal-50/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alert Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-teal-600" />
                  <Label htmlFor="sound" className="text-sm font-medium">Sound Alerts</Label>
                </div>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="push" className="text-sm font-medium">Browser Notifications</Label>
                </div>
                <Switch
                  id="push"
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => {
                    setSettings(prev => ({ ...prev, pushEnabled: checked }));
                    if (checked && 'Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-purple-600" />
                  <Label htmlFor="vibration" className="text-sm font-medium">Vibration</Label>
                </div>
                <Switch
                  id="vibration"
                  checked={settings.vibrationEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, vibrationEnabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-600" />
                  <Label htmlFor="newDelivery" className="text-sm font-medium">New Delivery Alerts</Label>
                </div>
                <Switch
                  id="newDelivery"
                  checked={settings.newDeliveryAlerts}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, newDeliveryAlerts: checked }))}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> Enable all alerts to never miss a delivery request! You'll get instant notifications with sound, vibration, and browser alerts when a new delivery is available.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          (() => {
            // FINAL RENDER-LEVEL DEDUPLICATION: Use a Map to absolutely guarantee uniqueness
            // CRITICAL: Use po_number as PRIMARY key if available
            const renderMap = new Map<string, Notification>();
            const renderSeenPONumbers = new Set<string>();
            uniqueNotifications.forEach((notification) => {
              let uniqueKey: string;
              // CRITICAL: Use po_number as PRIMARY key - this ensures only ONE card per po_number
              if (notification.po_number) {
                const normalizedPONumber = String(notification.po_number).trim().toLowerCase();
                uniqueKey = `ponum-${normalizedPONumber}`;
                
                // If we've already seen this po_number, SKIP IT IMMEDIATELY
                if (renderSeenPONumbers.has(normalizedPONumber)) {
                  console.error(`🚨🚨🚨 RENDER: Duplicate po_number "${notification.po_number}" detected! Skipping notification ${notification.id} (purchase_order_id: ${notification.purchase_order_id})`);
                  return; // SKIP THIS NOTIFICATION
                }
                renderSeenPONumbers.add(normalizedPONumber);
              } else if (notification.deliveryAddress && notification.materialType && notification.timestamp) {
                // FALLBACK: Use composite key when po_number is missing
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = String(notification.materialType).trim().toLowerCase();
                const hourKey = new Date(notification.timestamp).toISOString().slice(0, 13);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
                
                // If we've already seen this composite key, SKIP IT IMMEDIATELY
                if (renderSeenPONumbers.has(uniqueKey)) {
                  console.error(`🚨🚨🚨 RENDER: Duplicate composite key "${uniqueKey}" detected! Skipping notification ${notification.id} (purchase_order_id: ${notification.purchase_order_id})`);
                  return; // SKIP THIS NOTIFICATION
                }
                renderSeenPONumbers.add(uniqueKey);
              } else if (notification.purchase_order_id) {
                uniqueKey = `po-${notification.purchase_order_id}`;
              } else if (notification.delivery_request_id) {
                uniqueKey = `dr-${notification.delivery_request_id}`;
              } else {
                uniqueKey = `notif-${notification.id}`;
              }
              
              // If we already have this key, log it and skip
              if (renderMap.has(uniqueKey)) {
                console.error(`🚨🚨🚨 RENDER DUPLICATE DETECTED: Key ${uniqueKey} already exists! Existing: ${renderMap.get(uniqueKey)?.id}, New: ${notification.id}`);
                // Prefer the one with delivery_request_id
                const existing = renderMap.get(uniqueKey)!;
                if (notification.delivery_request_id && !existing.delivery_request_id) {
                  console.error(`🔄 RENDER: Replacing ${uniqueKey} with notification that has delivery_request_id`);
                  renderMap.set(uniqueKey, notification);
                }
                return; // Skip duplicate
              }
              
              renderMap.set(uniqueKey, notification);
            });
            
            const finalRenderNotifications = Array.from(renderMap.values());
            
            if (finalRenderNotifications.length < uniqueNotifications.length) {
              console.error(`🚨🚨🚨 RENDER: Removed ${uniqueNotifications.length - finalRenderNotifications.length} duplicates at render time!`);
            }
            
            // ABSOLUTE FINAL CHECK: Remove any remaining duplicates by po_number FIRST, then purchase_order_id
            const absolutelyFinalRender = new Map<string, Notification>();
            const absolutelyFinalSeenPONumbers = new Set<string>();
            finalRenderNotifications.forEach((notification) => {
              let uniqueKey: string;
              // CRITICAL: Use po_number as PRIMARY key
              if (notification.po_number) {
                const normalizedPONumber = String(notification.po_number).trim().toLowerCase();
                uniqueKey = `ponum-${normalizedPONumber}`;
                
                // If we've already seen this po_number, SKIP IT IMMEDIATELY
                if (absolutelyFinalSeenPONumbers.has(normalizedPONumber)) {
                  console.error(`🚨🚨🚨 ABSOLUTE FINAL: Duplicate po_number "${notification.po_number}" detected! Keeping first, removing: ${notification.id}`);
                  return;
                }
                absolutelyFinalSeenPONumbers.add(normalizedPONumber);
              } else if (notification.deliveryAddress && notification.materialType && notification.timestamp) {
                // FALLBACK: Use composite key when po_number is missing
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = String(notification.materialType).trim().toLowerCase();
                const hourKey = new Date(notification.timestamp).toISOString().slice(0, 13);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
                
                // If we've already seen this composite key, SKIP IT IMMEDIATELY
                if (absolutelyFinalSeenPONumbers.has(uniqueKey)) {
                  console.error(`🚨🚨🚨 ABSOLUTE FINAL: Duplicate composite key "${uniqueKey}" detected! Keeping first, removing: ${notification.id}`);
                  return;
                }
                absolutelyFinalSeenPONumbers.add(uniqueKey);
              } else if (notification.purchase_order_id) {
                uniqueKey = `po-${notification.purchase_order_id}`;
              } else if (notification.delivery_request_id) {
                uniqueKey = `dr-${notification.delivery_request_id}`;
              } else {
                uniqueKey = `notif-${notification.id}`;
              }
              
              // If we already have this key, skip it (this should never happen, but safety check)
              if (absolutelyFinalRender.has(uniqueKey)) {
                console.error(`🚨🚨🚨 ABSOLUTE FINAL: Duplicate key ${uniqueKey} detected! Keeping first, removing: ${notification.id}`);
                return;
              }
              
              absolutelyFinalRender.set(uniqueKey, notification);
            });
            
            const absolutelyUniqueNotifications = Array.from(absolutelyFinalRender.values());
            
            if (absolutelyUniqueNotifications.length < finalRenderNotifications.length) {
              console.error(`🚨🚨🚨 ABSOLUTE FINAL: Removed ${finalRenderNotifications.length - absolutelyUniqueNotifications.length} duplicates in absolute final check!`);
            }
            
            // FINAL FINAL CHECK: Use a Set to absolutely guarantee uniqueness
            // CRITICAL: Use po_number as PRIMARY key - this is the LAST line of defense
            const finalSet = new Set<string>();
            const finalSeenPONumbers = new Set<string>();
            const finalUniqueList: Notification[] = [];
            
            absolutelyUniqueNotifications.forEach((notification) => {
              let uniqueKey: string;
              // CRITICAL: Use po_number as PRIMARY key - this ensures only ONE card per po_number
              if (notification.po_number) {
                const normalizedPONumber = String(notification.po_number).trim().toLowerCase();
                uniqueKey = `ponum-${normalizedPONumber}`;
                
                // If we've already seen this po_number, SKIP IT IMMEDIATELY
                if (finalSeenPONumbers.has(normalizedPONumber)) {
                  console.error(`🚨🚨🚨 FINAL SET CHECK: Duplicate po_number "${notification.po_number}" detected! Removing ${notification.id} (purchase_order_id: ${notification.purchase_order_id})`);
                  return; // Skip duplicate
                }
                finalSeenPONumbers.add(normalizedPONumber);
              } else if (notification.deliveryAddress && notification.materialType && notification.timestamp) {
                // FALLBACK: Use composite key when po_number is missing
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = String(notification.materialType).trim().toLowerCase();
                const hourKey = new Date(notification.timestamp).toISOString().slice(0, 13);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
                
                // If we've already seen this composite key, SKIP IT IMMEDIATELY
                if (finalSeenPONumbers.has(uniqueKey)) {
                  console.error(`🚨🚨🚨 FINAL SET CHECK: Duplicate composite key "${uniqueKey}" detected! Removing ${notification.id} (purchase_order_id: ${notification.purchase_order_id})`);
                  return; // Skip duplicate
                }
                finalSeenPONumbers.add(uniqueKey);
              } else if (notification.purchase_order_id) {
                uniqueKey = `po-${notification.purchase_order_id}`;
              } else if (notification.delivery_request_id) {
                uniqueKey = `dr-${notification.delivery_request_id}`;
              } else {
                uniqueKey = `notif-${notification.id}`;
              }
              
              if (finalSet.has(uniqueKey)) {
                console.error(`🚨🚨🚨 FINAL SET CHECK: Duplicate ${uniqueKey} detected! Removing ${notification.id}`);
                return; // Skip duplicate
              }
              
              finalSet.add(uniqueKey);
              finalUniqueList.push(notification);
            });
            
            if (finalUniqueList.length < absolutelyUniqueNotifications.length) {
              console.error(`🚨🚨🚨 FINAL SET: Removed ${absolutelyUniqueNotifications.length - finalUniqueList.length} duplicates using Set!`);
            }
            
            console.log(`✅ FINAL RENDER: Rendering ${finalUniqueList.length} unique notifications (was ${absolutelyUniqueNotifications.length})`);
            
            return finalUniqueList.map((notification) => {
              // React key: Use po_number as PRIMARY key (if available), then purchase_order_id
              // CRITICAL: Must match the key used in deduplication logic
              // DO NOT USE INDEX - this causes duplicates to render!
              let uniqueKey: string;
              // CRITICAL: Use po_number as PRIMARY key - this ensures only ONE card per po_number
              if (notification.po_number) {
                const normalizedPONumber = String(notification.po_number).trim().toLowerCase();
                uniqueKey = `ponum-${normalizedPONumber}`;
              } else if (notification.deliveryAddress && notification.materialType && notification.timestamp) {
                // FALLBACK: Use composite key when po_number is missing
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = String(notification.materialType).trim().toLowerCase();
                const hourKey = new Date(notification.timestamp).toISOString().slice(0, 13);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}|${hourKey}`;
              } else if (notification.purchase_order_id) {
                // Each purchase_order_id is unique - use it directly
                uniqueKey = `po-${notification.purchase_order_id}`;
              } else if (notification.delivery_request_id) {
                // Use delivery_request_id as fallback
                uniqueKey = `dr-${notification.delivery_request_id}`;
              } else {
                // No purchase_order_id or delivery_request_id - use notification id
                uniqueKey = `notif-${notification.id}`;
              }
              
              // ABSOLUTE GUARANTEE: Use ONLY the unique key (no index!)
              // If deduplication worked, each key should be unique
              const finalKey = uniqueKey;
              
              // DEBUG: Log each notification being rendered
              console.log(`🎨 RENDERING: ${finalKey} - PO Number: ${notification.po_number || 'N/A'}, PO ID: ${notification.purchase_order_id?.substring(0, 8) || 'N/A'}, DR: ${notification.delivery_request_id?.substring(0, 8) || 'N/A'}`);
              
              return (
                <div
                  key={finalKey}
                  className={`p-4 rounded-xl border-2 shadow-lg transition-all hover:shadow-xl ${
                    notification.read 
                      ? 'bg-gradient-to-br from-white to-gray-50 border-gray-300' 
                      : 'bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 border-teal-400 animate-pulse'
                  }`}
                >
                  {/* Enhanced Header with Professional Builder Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="h-5 w-5 text-teal-600" />
                        <p className="font-bold text-base text-gray-900">{notification.title}</p>
                        {notification.status === 'pending' && (
                          <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 animate-pulse">
                            NEW
                          </Badge>
                        )}
                      </div>
                      {notification.materialType && (
                        <p className="text-sm text-gray-700 font-medium mt-1">
                          📦 {notification.materialType} {notification.quantity && `(${notification.quantity} items)`}
                        </p>
                      )}
                      {notification.estimatedCost && notification.estimatedCost > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          💰 Estimated: Ksh {notification.estimatedCost.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={notification.priority === 'high' ? 'destructive' : 'outline'} 
                      className="text-xs font-semibold"
                    >
                      {notification.priority}
                    </Badge>
                  </div>

                  {/* Enhanced Location Cards */}
                  {notification.pickupAddress && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-2 border border-green-200">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <p className="text-xs font-bold text-green-800 uppercase tracking-wide">📦 PICKUP LOCATION</p>
                      </div>
                      <p className="text-sm text-green-900 font-medium mt-1 ml-6">{notification.pickupAddress}</p>
                    </div>
                  )}

                  {notification.deliveryAddress && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 mb-3 border border-orange-200">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">🚚 DELIVERY LOCATION</p>
                      </div>
                      <p className="text-sm text-orange-900 font-medium mt-1 ml-6">{notification.deliveryAddress}</p>
                    </div>
                  )}

                  {/* Enhanced Action Buttons - Always show Navigation, Accept, and Reject for pending requests */}
                  {notification.status === 'pending' && notification.delivery_request_id ? (
                    <>
                      {/* Show if already accepted by another provider */}
                      {notification.provider_id && notification.provider_id !== userId ? (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 text-center">
                          <p className="text-sm font-semibold text-amber-800 flex items-center justify-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Already Accepted by Another Provider
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            {notification.provider_name ? `Provider: ${notification.provider_name}` : 'Another provider has accepted this delivery'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Navigation Button - Always visible */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (notification.pickupAddress && notification.deliveryAddress) {
                                window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(notification.pickupAddress)}&destination=${encodeURIComponent(notification.deliveryAddress)}`, '_blank');
                              } else {
                                toast({
                                  title: "Location Missing",
                                  description: "Pickup or delivery address is not available yet.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="w-full border-2 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
                            disabled={!notification.pickupAddress || !notification.deliveryAddress}
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Start Navigation
                          </Button>
                          
                          {/* Accept and Reject Buttons */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptDelivery(notification.delivery_request_id!)}
                              disabled={acceptingId === notification.delivery_request_id || rejectingId === notification.delivery_request_id}
                              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-md"
                            >
                              {acceptingId === notification.delivery_request_id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Accept Delivery
                                </>
                              )}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDelivery(notification.delivery_request_id!)}
                              disabled={acceptingId === notification.delivery_request_id || rejectingId === notification.delivery_request_id}
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-md"
                            >
                              {rejectingId === notification.delivery_request_id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* For non-pending status, show navigation only */
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (notification.pickupAddress && notification.deliveryAddress) {
                          window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(notification.pickupAddress)}&destination=${encodeURIComponent(notification.deliveryAddress)}`, '_blank');
                        }
                      }}
                      className="w-full border-2 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
                      disabled={!notification.pickupAddress || !notification.deliveryAddress}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Start Navigation
                    </Button>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(notification.timestamp)}
                    </p>
                    {notification.delivery_request_id && (
                      <p className="text-xs text-gray-400">
                        ID: {notification.delivery_request_id.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
            );
            });
          })()
        )
        }
      </div>
    </div>
  );
};
