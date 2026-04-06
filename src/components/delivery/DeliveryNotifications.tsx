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
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { readAuthSessionForRest, readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import { trackingNumberService } from '@/services/TrackingNumberService';
import { cleanupDuplicateDeliveryRequests, cleanupDuplicatePurchaseOrders, checkForDuplicateDeliveryRequests, deleteDeliveryRequestsWithoutAddress, deleteDuplicateDeliveryRequestsByCompositeKey } from '@/utils/cleanupDuplicateDeliveryRequests';
import { checkDeliveryAddress } from '@/utils/checkDeliveryAddress';
import { haversineKm, resolveJobCoordinates } from '@/utils/deliveryProximity';

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
  /** Straight-line distance from provider last GPS to job delivery/pickup point */
  distanceKm?: number;
  /** Within NEARBY_RADIUS_KM of job (when provider has current_latitude/longitude) */
  nearby?: boolean;
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
  const [checkingAddress, setCheckingAddress] = useState<string | null>(null); // Track which address is being checked
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { accessToken } = await readAuthSessionForRest();
    const headers: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return { url: SUPABASE_URL, headers };
  };

  // COMPLETELY RESTRUCTURED: Simple, clear logic
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 RESTRUCTURED: Loading notifications...');
      
      const { url, headers } = await getAuthHeaders();

      let providerLat: number | undefined;
      let providerLng: number | undefined;
      if (userId) {
        try {
          const ploc = await fetch(
            `${url}/rest/v1/delivery_providers?user_id=eq.${userId}&select=current_latitude,current_longitude&limit=1`,
            { headers, cache: 'no-store' }
          );
          if (ploc.ok) {
            const prow = await ploc.json();
            const row = Array.isArray(prow) ? prow[0] : null;
            if (
              row &&
              typeof row.current_latitude === 'number' &&
              typeof row.current_longitude === 'number'
            ) {
              providerLat = row.current_latitude;
              providerLng = row.current_longitude;
            }
          }
        } catch {
          /* non-fatal */
        }
      }

      const NEARBY_RADIUS_KM = 80;
      const finalNotifications: Notification[] = [];
      const seenPurchaseOrderIds = new Set<string>(); // Track which purchase_orders we've already added
      const seenPONumbers = new Set<string>(); // Track which po_numbers we've already added (CRITICAL for deduplication)
      
      // STEP 1: Fetch delivery_requests - show all pending/requested/assigned on ALERTS TAB
      // CRITICAL: Alerts tab MUST show every pending/requested/assigned request, including missing address / no PO.
      // Do NOT add status filter in URL — fetch ALL so RLS determines visibility; then filter in JS.
      // Don't show deliveries already accepted by THIS provider (those are in Scheduled tab)
      // CRITICAL: MUST include delivery_address field - this is the address filled by builder in delivery request form
      // CRITICAL: Also fetch pickup_address and all address-related fields to ensure we get the builder-provided address
      const drResponse = await fetch(
        `${url}/rest/v1/delivery_requests?order=created_at.desc&limit=200&select=id,status,purchase_order_id,provider_id,delivery_address,pickup_address,delivery_coordinates,material_type,quantity,created_at,builder_id,rejection_reason,estimated_cost,budget_range,delivery_latitude,delivery_longitude,pickup_latitude,pickup_longitude`,
        { headers, cache: 'no-store' }
      );
      
      console.log(`🔍 DEBUG: Fetching delivery_requests - Response status: ${drResponse.status}`);
      
      console.log(`🔍 Fetching delivery_requests from: ${url}/rest/v1/delivery_requests`);
      console.log(`🔑 Using headers:`, { 'apikey': headers.apikey ? 'present' : 'missing', 'Authorization': headers.Authorization ? 'present' : 'missing' });
      
      let deliveryRequests: any[] = [];
      let rawData: any[] = [];
      if (drResponse.ok) {
          rawData = await drResponse.json();
          console.log(`📦 Raw delivery_requests from DB: ${rawData.length}`);
          console.log(`📊 Response status: ${drResponse.status} ${drResponse.statusText}`);
          if (rawData.length > 0) {
            console.log(`📦 Delivery request details:`, rawData.map((dr: any) => ({
              id: dr.id.slice(0, 8),
              status: dr.status,
              provider_id: dr.provider_id?.slice(0, 8) || 'NULL',
              po_id: dr.purchase_order_id?.slice(0, 8) || 'NULL',
              address: (dr.delivery_address || '').substring(0, 40),
              rejection_reason: dr.rejection_reason?.substring(0, 50) || null
            })));
            
            // Count by status
            const statusCounts = rawData.reduce((acc: any, dr: any) => {
              acc[dr.status] = (acc[dr.status] || 0) + 1;
              return acc;
            }, {});
            console.log(`📊 Status breakdown:`, statusCounts);
            
            // Count by provider_id
            const providerCounts = rawData.reduce((acc: any, dr: any) => {
              const key = dr.provider_id ? dr.provider_id.slice(0, 8) : 'NULL';
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});
            console.log(`📊 Provider ID breakdown:`, providerCounts);
            
            // DEBUG: Check for specific order mentioned by user (QR-1773487443217-4GJMG)
            // Search by multiple methods: timestamp, po_number pattern, order number
            const userOrderPatterns = ['1773487443217', 'QR-1773487443217', '4GJMG'];
            let userOrder = null;
            let searchMethod = '';
            
            // Method 1: Search by purchase_order_id containing timestamp
            userOrder = rawData.find((dr: any) => {
              if (!dr.purchase_order_id) return false;
              const poIdStr = dr.purchase_order_id.toString();
              return userOrderPatterns.some(pattern => poIdStr.includes(pattern));
            });
            if (userOrder) searchMethod = 'purchase_order_id';
            
            // Method 2: Search by delivery_request id
            if (!userOrder) {
              userOrder = rawData.find((dr: any) => {
                return userOrderPatterns.some(pattern => dr.id.toString().includes(pattern));
              });
              if (userOrder) searchMethod = 'delivery_request_id';
            }
            
            // Method 3: Try to fetch purchase_order by po_number and then find delivery_request
            if (!userOrder) {
              try {
                // Use correct PostgREST syntax: ilike.*pattern* (not ilike.%pattern%)
                const poSearchResponse = await fetch(
                  `${url}/rest/v1/purchase_orders?po_number=ilike.*1773487443217*&select=id,po_number&limit=5`,
                  { headers, cache: 'no-store' }
                );
                if (poSearchResponse.ok) {
                  const matchingPOs = await poSearchResponse.json();
                  console.log(`🔍 DEBUG: Found ${matchingPOs.length} purchase_orders matching po_number pattern`);
                  if (matchingPOs.length > 0) {
                    const poIds = matchingPOs.map((po: any) => po.id);
                    userOrder = rawData.find((dr: any) => poIds.includes(dr.purchase_order_id));
                    if (userOrder) {
                      searchMethod = 'po_number_lookup';
                      console.log(`✅ DEBUG: Found order via po_number lookup!`);
                    }
                  }
                }
              } catch (e) {
                console.warn('⚠️ DEBUG: Error searching by po_number:', e);
              }
            }
            
            if (userOrder) {
              console.log(`✅ DEBUG: Found user's order in raw data (via ${searchMethod}):`, {
                id: userOrder.id,
                status: userOrder.status,
                provider_id: userOrder.provider_id || 'NULL',
                po_id: userOrder.purchase_order_id,
                address: userOrder.delivery_address || 'MISSING',
                builder_id: userOrder.builder_id?.slice(0, 8) || 'NULL',
                created_at: userOrder.created_at
              });
            } else {
              console.warn(`⚠️ DEBUG: User's order (QR-1773487443217-4GJMG) NOT found in raw data!`);
              console.warn(`⚠️ DEBUG: Searched ${rawData.length} delivery_requests`);
              console.warn(`⚠️ DEBUG: Possible reasons: 1) RLS policy blocking, 2) Delivery request not created, 3) Different status, 4) Different purchase_order_id`);
              console.warn(`⚠️ DEBUG: Status breakdown shows: ${JSON.stringify(statusCounts)}`);
            }
          } else {
            console.warn(`⚠️ No delivery_requests returned from database!`);
          }
        } else {
          const errorText = await drResponse.text();
          console.error(`❌ Failed to fetch delivery_requests: ${drResponse.status} ${drResponse.statusText}`);
          console.error(`❌ Error details:`, errorText);
        }
        
        // Process rawData (even if empty) - FIRST: Check for duplicates in raw data BEFORE deduplication
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
        
        // STEP 2: Additional deduplication pass (deliveryRequests already deduplicated in STEP 1)
        // This step ensures we only process unique requests
        const finalDeliveryRequestsByPO = new Map<string, any>();
        const finalDeliveryRequestsByKey = new Map<string, any>(); // For NULL purchase_order_id cases
        let duplicatesRemoved = 0;
        let nullPORequests = 0;
        
        // Process each delivery request (already deduplicated, but do final check)
        deliveryRequests.forEach((dr: any) => {
          if (dr.purchase_order_id) {
            // Strategy 1: Deduplicate by purchase_order_id (PRIMARY)
            if (!finalDeliveryRequestsByPO.has(dr.purchase_order_id)) {
            finalDeliveryRequestsByPO.set(dr.purchase_order_id, dr);
          } else {
            // Duplicate found! Keep the best one (shouldn't happen after STEP 1, but safety check)
            duplicatesRemoved++;
            const existing = finalDeliveryRequestsByPO.get(dr.purchase_order_id);
            const existingScore = (existing.status === 'accepted' || existing.status === 'assigned' || existing.status === 'in_transit' ? 10 : 0) +
                                 (existing.provider_id ? 5 : 0) +
                                 (new Date(existing.created_at).getTime() / 1000000);
            const newScore = (dr.status === 'accepted' || dr.status === 'assigned' || dr.status === 'in_transit' ? 10 : 0) +
                            (dr.provider_id ? 5 : 0) +
                            (new Date(dr.created_at).getTime() / 1000000);
            if (newScore > existingScore) {
              finalDeliveryRequestsByPO.set(dr.purchase_order_id, dr);
              console.error(`🔄 Replaced duplicate for PO ${dr.purchase_order_id} (better score) - DR IDs: ${existing.id} → ${dr.id}`);
            } else {
              console.error(`🗑️ Removed duplicate for PO ${dr.purchase_order_id} (keeping existing) - DR ID: ${dr.id}`);
            }
          }
        } else {
          // NULL purchase_order_id - deduplicate by builder_id + delivery_address + material_type
          nullPORequests++;
          const key = `${dr.builder_id || 'no-builder'}|${(dr.delivery_address || '').toLowerCase().trim()}|${(dr.material_type || '').toLowerCase().trim()}`;
          
          if (!finalDeliveryRequestsByKey.has(key)) {
            finalDeliveryRequestsByKey.set(key, dr);
          } else {
            // Duplicate found for NULL PO case
            duplicatesRemoved++;
            const existing = finalDeliveryRequestsByKey.get(key);
            const existingTime = new Date(existing.created_at).getTime();
            const newTime = new Date(dr.created_at).getTime();
            if (newTime > existingTime) {
              finalDeliveryRequestsByKey.set(key, dr);
              console.log(`🔄 Replaced duplicate NULL PO request (newer): ${key} - DR IDs: ${existing.id} → ${dr.id}`);
            } else {
              console.log(`🗑️ Removed duplicate NULL PO request (keeping older): ${key} - DR ID: ${dr.id}`);
            }
          }
        }
      });
      
      // Combine both maps into final array
      deliveryRequests = [...finalDeliveryRequestsByPO.values(), ...finalDeliveryRequestsByKey.values()];
      const totalUnique = finalDeliveryRequestsByPO.size + finalDeliveryRequestsByKey.size;
      console.log(`🔍 Final deduplicated delivery_requests: ${deliveryRequests.length} → ${totalUnique} unique (removed ${duplicatesRemoved} duplicates, ${nullPORequests} had NULL purchase_order_id)`);
      
      // STEP 3: Create notifications from unique delivery_requests
      // CRITICAL: Only show delivery requests with valid purchase_order_id (no placeholder/default requests)
      // CRITICAL: Use a Set to track purchase_order_ids we've already added
      // ABSOLUTE GUARANTEE: Only ONE notification per purchase_order_id
      const addedPOIds = new Set<string>();
      const addedDRIds = new Set<string>(); // Also track delivery_request_ids to prevent duplicates
      const addedPONumbers = new Set<string>(); // Track which po_numbers we've already added (CRITICAL for deduplication)
      
      // CRITICAL: Pre-filter finalDeliveryRequestsByPO to ensure ONLY ONE per purchase_order_id
      // This is the FIRST and MOST IMPORTANT deduplication step
      const preFilteredPO = new Map<string, any>();
      finalDeliveryRequestsByPO.forEach((dr, poId) => {
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
      
      console.log(`✅ PRE-FILTER: ${finalDeliveryRequestsByPO.size} → ${preFilteredPO.size} unique purchase orders`);
      
      // Use the pre-filtered map instead of the original (update the existing map)
      // Clear and repopulate finalDeliveryRequestsByPO with pre-filtered data
      finalDeliveryRequestsByPO.clear();
      preFilteredPO.forEach((dr, poId) => {
        finalDeliveryRequestsByPO.set(poId, dr);
      });
      
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
      const poMap = new Map<string, any>(); // Map purchase_order_id -> purchase_order (for address fallback)
      
      if (poIdsToVerify.length > 0) {
        try {
          const verifyResponse = await fetch(
            `${url}/rest/v1/purchase_orders?id=in.(${poIdsToVerify.join(',')})&select=id,po_number,delivery_address&limit=1000`,
            { headers, cache: 'no-store' }
          );
          
          if (verifyResponse.ok) {
            const validPOs = await verifyResponse.json();
            validPOIds = new Set(validPOs.map((po: any) => po.id));
            
            // Store purchase orders for address fallback
            validPOs.forEach((po: any) => {
              if (po.id) {
                poMap.set(po.id, po);
              }
            });
            
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
      
      // CRITICAL: Include delivery requests with NULL purchase_order_id so they appear on Alerts (key by dr.id)
      // Missing delivery requests (no PO, missing address) MUST show on Alerts tab so provider can act on them.
      finalDeliveryRequestsByKey.forEach((dr) => {
        if (dr?.id && !finalNotificationMap.has(dr.id)) {
          finalNotificationMap.set(dr.id, dr);
        }
      });
      
      console.log(`✅ FINAL NOTIFICATION MAP: ${finalNotificationMap.size} unique (${finalDeliveryRequestsByPO.size} with PO + ${finalDeliveryRequestsByKey.size} without PO)`);
      
      // THIRD PASS: Create notifications from the deduplicated map
      for (const [poId, dr] of finalNotificationMap.entries()) {
        // Skip only invalid/placeholder keys; keys from NULL purchase_order_id requests are dr.id (UUID), so valid
        if (!poId || poId.trim() === '' || poId === 'null' || poId === 'undefined') {
          console.log(`🚫 SKIPPING: Delivery request ${dr?.id} has no valid key (placeholder/default request)`);
          continue;
        }
        
        // ABSOLUTE GUARANTEE: This should never happen now, but double-check
        if (addedPOIds.has(poId)) {
          console.error(`🚫🚫🚫 ABSOLUTE BLOCK: purchase_order_id ${poId} already added! This should never happen. Skipping delivery_request ${dr.id}`);
          continue;
        }
        
        // RELAXED: Never skip pending/requested/assigned for PO verification — Alerts tab must show them.
        // If verification failed or purchase_order wasn't found, show the notification anyway.
        if (validPOIds.size > 0 && !validPOIds.has(poId)) {
          console.log(`⚠️ Delivery request ${dr.id} has purchase_order_id ${poId} but purchase_order not found (showing anyway to ensure alerts come through)`);
          // Do NOT skip — missing delivery requests must appear on Alerts tab
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
        // BUT: Only skip if status is also cancelled/rejected (not if it's still pending/assigned)
        if ((dr.status === 'cancelled' || dr.status === 'rejected') && dr.rejection_reason && (
          dr.rejection_reason.includes('Duplicate delivery request') || 
          dr.rejection_reason.includes('duplicate') ||
          dr.rejection_reason.includes('cleaned up')
        )) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id.slice(0, 8)} was marked as duplicate (status: ${dr.status}): ${dr.rejection_reason.substring(0, 50)}`);
          continue;
        }
        
        // CRITICAL: Only show PENDING requests that haven't been accepted by ANY provider
        // Skip if already accepted by THIS provider (those should be in Scheduled tab)
        // BUT: Show pending requests even if they have a provider_id (might be assigned but not yet accepted)
        if (dr.provider_id && dr.provider_id === userId && ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(dr.status)) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id.slice(0, 8)} already accepted by this provider (status: ${dr.status}, provider_id: ${dr.provider_id?.slice(0, 8)}) - should be in Scheduled tab`);
          continue;
        }
        
        // Only show pending requests (not delivered, completed, cancelled, rejected)
        // Allow 'pending', 'assigned' (if not assigned to this provider), 'requested' statuses
        if (!['pending', 'assigned', 'requested'].includes(dr.status)) {
          console.log(`🚫 SKIPPING: Delivery request ${dr.id.slice(0, 8)} has status ${dr.status} (not pending/assigned/requested) - should not appear in Alerts tab`);
          continue;
        }
        
        // DEBUG: Log all requests that pass the provider_id check
        console.log(`✅ PASSED PROVIDER CHECK: Delivery request ${dr.id.slice(0, 8)} - status: ${dr.status}, provider_id: ${dr.provider_id?.slice(0, 8) || 'NULL'}, userId: ${userId?.slice(0, 8) || 'NULL'}`);
        
        // Create notification - this purchase_order_id is guaranteed to be unique
        // CRITICAL: Include po_number for deduplication
        // CRITICAL: Use ONLY delivery_request.delivery_address - this is the address filled by builder in delivery request form
        // The delivery_request.delivery_address is the SOURCE OF TRUTH - it comes from the form the builder filled
        // DO NOT use purchase_order.delivery_address as fallback - the builder may have entered a different address
        // CRITICAL: Builder-provided address from delivery_requests table - this is what the builder typed during delivery request
        // CRITICAL: Log the RAW value from database BEFORE any processing
        console.log(`📍📍📍 RAW DB VALUE: Delivery request ${dr.id.slice(0, 8)} - delivery_address from DB (type: ${typeof dr.delivery_address}):`, {
          raw: dr.delivery_address,
          isNull: dr.delivery_address === null,
          isUndefined: dr.delivery_address === undefined,
          isEmpty: dr.delivery_address === '',
          length: dr.delivery_address?.length || 0,
          trimmed: (dr.delivery_address || '').trim(),
          delivery_coordinates: dr.delivery_coordinates,
          purchase_order_id: poId?.slice(0, 8) || 'NULL'
        });
        
        let deliveryAddr = (dr.delivery_address || '').trim();
        
        // CRITICAL: If delivery_address is NULL or empty, check delivery_coordinates FIRST
        if (!deliveryAddr && dr.delivery_coordinates) {
          deliveryAddr = dr.delivery_coordinates.trim();
          console.log(`📍 USING COORDINATES: Delivery request ${dr.id.slice(0, 8)} has no address, using coordinates: "${deliveryAddr}"`);
        }
        
        // CRITICAL: If delivery_address includes coordinates, use the full string (coordinates + address)
        // The builder may have entered coordinates with address like "1.2921, 36.8219 | Nairobi, Kenya"
        if (dr.delivery_coordinates && deliveryAddr && !deliveryAddr.includes(dr.delivery_coordinates)) {
          // If coordinates exist but aren't in the address, prepend them
          deliveryAddr = `${dr.delivery_coordinates} | ${deliveryAddr}`;
          console.log(`📍 COORDINATES ADDED: Combined coordinates with address: "${deliveryAddr.substring(0, 60)}..."`);
        }
        
        // CRITICAL: Check for placeholder values - ONLY exact matches, case-insensitive
        // DO NOT treat valid addresses as placeholders
        const isPlaceholder = deliveryAddr && deliveryAddr.length > 0 && (
          deliveryAddr.toLowerCase().trim() === 'to be provided' || 
          deliveryAddr.toLowerCase().trim() === 'tbd' || 
          deliveryAddr.toLowerCase().trim() === 't.b.d.' ||
          deliveryAddr.toLowerCase().trim() === 'n/a' || 
          deliveryAddr.toLowerCase().trim() === 'na' || 
          deliveryAddr.toLowerCase().trim() === 'tba' || 
          deliveryAddr.toLowerCase().trim() === 'to be determined' ||
          deliveryAddr.toLowerCase().trim() === 'delivery location' ||
          deliveryAddr.toLowerCase().trim() === 'address not found' ||
          deliveryAddr.toLowerCase().trim() === 'address not specified by builder'
        );
        
        console.log(`📍 PLACEHOLDER CHECK: Delivery request ${dr.id.slice(0, 8)} - isPlaceholder: ${isPlaceholder}, address: "${deliveryAddr?.substring(0, 50) || 'EMPTY'}..."`);
        
        if (isPlaceholder) {
          console.warn(`⚠️ PLACEHOLDER DETECTED: Delivery request ${dr.id.slice(0, 8)} has placeholder address "${deliveryAddr}" - attempting fallback to purchase_order address`);
          
          // FALLBACK: Try to get address from purchase_order if delivery_request has placeholder
          // CRITICAL: If purchase_order is not in poMap, try to fetch it directly
          let po = poMap.has(poId) ? poMap.get(poId) : null;
          
          if (!po && poId) {
            console.log(`📍 FALLBACK: Purchase order ${poId.slice(0, 8)} not in map, fetching directly...`);
            try {
              const poFetchResponse = await fetch(
                `${url}/rest/v1/purchase_orders?id=eq.${poId}&select=id,po_number,delivery_address&limit=1`,
                { headers, cache: 'no-store' }
              );
              console.log(`📍 FALLBACK: Purchase order fetch response status: ${poFetchResponse.status}`);
              if (poFetchResponse.ok) {
                const poData = await poFetchResponse.json();
                console.log(`📍 FALLBACK: Purchase order fetch result:`, poData);
                if (Array.isArray(poData) && poData.length > 0) {
                  po = poData[0];
                  poMap.set(poId, po); // Cache it for future use
                  console.log(`✅ FALLBACK: Fetched purchase order ${poId.slice(0, 8)} directly - address: "${po.delivery_address?.substring(0, 50) || 'NULL'}..."`);
                } else {
                  console.warn(`⚠️ FALLBACK: Purchase order ${poId.slice(0, 8)} not found in database (empty array)`);
                }
              } else {
                const errorText = await poFetchResponse.text();
                console.warn(`⚠️ FALLBACK: Purchase order fetch failed (${poFetchResponse.status}):`, errorText);
              }
            } catch (fetchError: any) {
              console.warn(`⚠️ FALLBACK: Exception fetching purchase order ${poId.slice(0, 8)}:`, fetchError.message || fetchError);
            }
          }
          
          if (po) {
            const poAddress = (po.delivery_address || '').trim();
            
            console.log(`📍 FALLBACK CHECK: Purchase order ${poId.slice(0, 8)} address: "${poAddress?.substring(0, 50) || 'EMPTY'}..."`);
            
            // Check if purchase_order address is valid (not a placeholder)
            const isPOPlaceholder = poAddress && (
              poAddress.toLowerCase().trim() === 'to be provided' || 
              poAddress.toLowerCase().trim() === 'tbd' || 
              poAddress.toLowerCase().trim() === 'n/a' || 
              poAddress.toLowerCase().trim() === 'na' || 
              poAddress.toLowerCase().trim() === 'tba' || 
              poAddress.toLowerCase().trim() === 'to be determined' ||
              poAddress.toLowerCase().trim() === 'delivery location' ||
              poAddress.toLowerCase().trim() === 'address not found'
            );
            
            if (poAddress && !isPOPlaceholder && poAddress.length >= 3) {
              deliveryAddr = poAddress;
              console.log(`✅ FALLBACK SUCCESS: Using purchase_order address: "${deliveryAddr.substring(0, 50)}..."`);
            } else {
              // Purchase order also has placeholder or invalid address
              deliveryAddr = 'Delivery address missing - contact builder';
              console.warn(`⚠️ FALLBACK FAILED: Purchase order also has placeholder/invalid address (${isPOPlaceholder ? 'is placeholder' : 'invalid'}) - showing error message`);
            }
          } else {
            // No purchase_order found or not in map
            deliveryAddr = 'Delivery address missing - contact builder';
            console.warn(`⚠️ NO FALLBACK: Purchase order not found for ${poId?.slice(0, 8) || 'NULL'} (poMap.has: ${poId ? poMap.has(poId) : false}) - showing error message`);
            console.warn(`⚠️ CRITICAL: Delivery request ${dr.id.slice(0, 8)} has placeholder address but purchase_order ${poId?.slice(0, 8) || 'NULL'} cannot be found. This means the builder's address was NOT saved correctly!`);
          }
        } else if (!deliveryAddr || deliveryAddr === '') {
          // Address is empty (not a placeholder) - use same fallback as private builder: get from purchase_order
          console.warn(`⚠️ EMPTY ADDRESS: Delivery request ${dr.id.slice(0, 8)} has empty address - attempting fallback to purchase_order (private builder logic)`);
          let po = poMap.has(poId) ? poMap.get(poId) : null;
          if (!po && poId) {
            try {
              const poFetchResponse = await fetch(
                `${url}/rest/v1/purchase_orders?id=eq.${poId}&select=id,po_number,delivery_address&limit=1`,
                { headers, cache: 'no-store' }
              );
              if (poFetchResponse.ok) {
                const poData = await poFetchResponse.json();
                if (Array.isArray(poData) && poData.length > 0) {
                  po = poData[0];
                  poMap.set(poId, po);
                }
              }
            } catch (e) { /* ignore */ }
          }
          if (po) {
            const poAddress = (po.delivery_address || '').trim();
            if (poAddress && poAddress.length >= 3) {
              const isPOPlaceholder = ['to be provided', 'tbd', 'n/a', 'na', 'tba', 'to be determined', 'delivery location', 'address not found'].includes(poAddress.toLowerCase().trim());
              if (!isPOPlaceholder) {
                deliveryAddr = poAddress;
                console.log(`✅ FALLBACK SUCCESS (empty): Using purchase_order address (private builder logic): "${deliveryAddr.substring(0, 50)}..."`);
              }
            }
          }
        }
        
        // CRITICAL: Alerts tab MUST show ALL pending/requested/assigned delivery requests — including missing/placeholder address.
        // Do NOT filter out these requests; provider can use "Check Address" to get address from builder.
        const isPendingStatus = ['pending', 'requested', 'assigned'].includes(dr.status);
        if (!deliveryAddr || deliveryAddr === '') {
          if (isPendingStatus) {
            deliveryAddr = 'Delivery address missing - contact builder';
            console.warn(`⚠️ MISSING ADDRESS: Delivery request ${dr.id.slice(0, 8)} has no address - show card so provider can use Check Address`);
          } else {
            console.log(`🚫 FILTERED OUT: Delivery request ${dr.id.slice(0, 8)} has NO delivery_address and status is ${dr.status}`);
            return;
          }
        }

        // Valid if: has content, not the "missing" message (for non-pending), and either GPS or real address
        const isGPSCoordinate = deliveryAddr && (
          /^-?\d+\.?\d*,\s*-?\d+\.?\d*/.test(deliveryAddr) ||
          deliveryAddr.toLowerCase().startsWith('gps:') ||
          /^\d+\.?\d*\s*[|,]\s*\d+\.?\d*/.test(deliveryAddr)
        );
        const isValidAddress = deliveryAddr &&
                               deliveryAddr !== '' &&
                               deliveryAddr !== 'Delivery address missing - contact builder' &&
                               (isGPSCoordinate || deliveryAddr.length >= 3);

        // NEVER filter out pending/requested/assigned for Alerts tab, even if address is missing or placeholder
        if (!isValidAddress && !isPendingStatus) {
          console.log(`🚫 FILTERED OUT: Delivery request ${dr.id.slice(0, 8)} has no valid address, status: ${dr.status}`);
          return;
        }
        if (isValidAddress) {
          console.log(`✅ ADDRESS ON CARD: Delivery request ${dr.id.slice(0, 8)} - "${deliveryAddr.substring(0, 60)}${deliveryAddr.length > 60 ? '...' : ''}"`);
        }
        
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
        const jobPt = resolveJobCoordinates({
          delivery_latitude: dr.delivery_latitude,
          delivery_longitude: dr.delivery_longitude,
          pickup_latitude: dr.pickup_latitude,
          pickup_longitude: dr.pickup_longitude,
          delivery_address: deliveryAddr,
          pickup_address: dr.pickup_address || dr.pickup_location || '',
        });
        let distanceKm: number | undefined;
        let nearby = false;
        if (
          jobPt &&
          typeof providerLat === 'number' &&
          typeof providerLng === 'number'
        ) {
          const d = haversineKm(jobPt.lat, jobPt.lng, providerLat, providerLng);
          distanceKm = Math.round(d * 10) / 10;
          nearby = d <= NEARBY_RADIUS_KM;
        }

        finalNotifications.push({
          id: `dr-${dr.id}`, // Use delivery_request id as notification id
          type: 'new_delivery',
          title: dr.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${dr.status}`,
          message: `${dr.material_type || 'Materials'} delivery to ${deliveryAddr}`,
          timestamp: new Date(dr.created_at),
          read: dr.status !== 'pending', // Only pending deliveries are unread
          priority: dr.status === 'pending' ? 'high' : 'medium',
          actionUrl: `/delivery-dashboard?request=${dr.id}`,
          status: dr.status,
          pickupAddress: dr.pickup_address || dr.pickup_location || '',
          deliveryAddress: deliveryAddr,
          materialType: dr.material_type || '',
          quantity: dr.quantity || '',
          estimatedCost: dr.estimated_cost || dr.budget_range || 0,
          purchase_order_id: dr.purchase_order_id ?? (poId === dr.id ? undefined : poId), // Use real PO id; for null-po requests key is dr.id so pass undefined
          po_number: poNumber || undefined, // CRITICAL: Include po_number for deduplication
          delivery_request_id: dr.id, // For accepting
          provider_id: dr.provider_id || null, // Provider who accepted (null = unaccepted)
          provider_name: dr.provider_name || dr.delivery_provider_name || undefined, // Provider name if available
          distanceKm,
          nearby,
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
      
      // NULL purchase_order_id requests are now included (keyed by dr.id) so they appear on Alerts.
      
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
            // CRITICAL: Validate that purchase_order has valid delivery_address - MUST have address keyed in by builder
            const deliveryAddr = (po.delivery_address || '').trim();
            
            // Check if it's a placeholder (exact matches only)
            const isPlaceholder = deliveryAddr && (
              deliveryAddr.toLowerCase() === 'to be provided' || 
              deliveryAddr.toLowerCase() === 'tbd' || 
              deliveryAddr.toLowerCase() === 'n/a' || 
              deliveryAddr.toLowerCase() === 'na' || 
              deliveryAddr.toLowerCase() === 'tba' || 
              deliveryAddr.toLowerCase() === 'to be determined'
            );
            
            // Check if it's a GPS coordinate
            const isGPSCoordinate = deliveryAddr && (
              /^-?\d+\.?\d*,\s*-?\d+\.?\d*/.test(deliveryAddr) || // lat,lng format
              deliveryAddr.toLowerCase().startsWith('gps:') ||
              /^\d+\.?\d*\s*[|,]\s*\d+\.?\d*/.test(deliveryAddr) // GPS with | separator
            );
            
            // Valid if: has content, not a placeholder, and either GPS coords OR actual address (min 3 chars)
            // RELAXED: For pending/requested/assigned status, show even if address is "To be provided"
            // This ensures delivery providers can see and accept requests even if address isn't finalized yet
            const isPendingStatus = po.status && ['pending', 'requested', 'assigned'].includes(po.status);
            const isValidAddress = deliveryAddr && 
                                   deliveryAddr !== '' && 
                                   (!isPlaceholder || isPendingStatus) && // Allow placeholder for pending requests
                                   (isGPSCoordinate || deliveryAddr.length >= 3);
            
            if (!po.id || !isValidAddress) {
              skippedCount++;
              console.log(`🚫 SKIPPED: Purchase order ${po.id.slice(0, 8)} has invalid or placeholder delivery address - Address: "${deliveryAddr || 'empty'}", isPlaceholder: ${isPlaceholder}, isGPS: ${isGPSCoordinate}, length: ${deliveryAddr?.length || 0}, status: ${po.status}`);
              return;
            }
            
            console.log(`✅ VALID PO ADDRESS: Purchase order ${po.id.slice(0, 8)} has valid address: "${deliveryAddr.substring(0, 50)}${deliveryAddr.length > 50 ? '...' : ''}"`);
            
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
        // Don't set unreadCount here - it will be set from uniqueNotifications
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

      const sortedByProximity = [...absolutelyUnique].sort((a, b) => {
        if (a.nearby && !b.nearby) return -1;
        if (!a.nearby && b.nearby) return 1;
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        return da - db;
      });

      setNotifications(sortedByProximity);
      // Don't set unreadCount here - it will be set from uniqueNotifications
      
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error.message || error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      const { url, headers } = await getAuthHeaders();

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
        const stored = readPersistedAuthRawStringSync();
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
      // Don't set unreadCount here - it will be set from uniqueNotifications
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

  // Helper to normalize material types for composite key deduplication
  // "steel", "construction materials", "materials" should be treated as the same
  // Defined outside useMemo so it's accessible in render code too
  const normalizeMaterialType = (materialType: string | undefined | null): string => {
    if (!materialType) return '';
    const normalized = String(materialType).trim().toLowerCase();
    // Normalize common variations to the same value
    if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
      return 'construction_materials';
    }
    return normalized;
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
      
      // SECONDARY KEY: When po_number is missing, use composite key (deliveryAddress + materialType)
      // This handles cases where multiple purchase_orders exist for the same logical order but have no po_number
      // CRITICAL: Don't use hour - if they're from the same order, they should be deduplicated regardless of when created
      if (!key && notification.deliveryAddress && notification.materialType) {
        const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = normalizeMaterialType(notification.materialType);
        // Use only address + material (NO hour) - same order should have same address and materials
        const compositeKey = `${normalizedAddress}|${normalizedMaterial}`;
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
      
      // FALLBACK: If no po_number, check composite key (deliveryAddress + materialType - NO hour)
      if (n.deliveryAddress && n.materialType) {
        const normalizedAddress = String(n.deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = normalizeMaterialType(n.materialType);
        const compositeKey = `${normalizedAddress}|${normalizedMaterial}`;
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
      } else if (n.deliveryAddress && n.materialType) {
        // FALLBACK: Use composite key when po_number is missing (NO hour - same order regardless of when created)
        const normalizedAddress = String(n.deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = normalizeMaterialType(n.materialType);
        const compositeKey = `${normalizedAddress}|${normalizedMaterial}`;
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

  // CRITICAL: Update unreadCount based on uniqueNotifications (deduplicated), not raw notifications
  useEffect(() => {
    const unreadUnique = uniqueNotifications.filter(n => !n.read).length;
    setUnreadCount(unreadUnique);
    console.log(`📊 UNREAD COUNT: ${unreadUnique} unread notifications (from ${uniqueNotifications.length} unique notifications, was ${notifications.length} raw)`);
  }, [uniqueNotifications, notifications.length]);

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
                  // ALSO delete delivery requests without valid delivery_address
                  const [poCleanupResult, drCleanupResult, addressCleanupResult] = await Promise.all([
                    cleanupDuplicatePurchaseOrders(),
                    cleanupDuplicateDeliveryRequests(),
                    deleteDeliveryRequestsWithoutAddress()
                  ]);
                  
                  const totalCancelled = (poCleanupResult.duplicatesCancelled || 0) + (drCleanupResult.duplicatesCancelled || 0);
                  const totalDeleted = (addressCleanupResult?.deleted || 0);
                  const allSuccess = poCleanupResult.success && drCleanupResult.success && (addressCleanupResult?.success !== false);
                  
                  if (allSuccess && (totalCancelled > 0 || totalDeleted > 0)) {
                    const messages = [];
                    if (poCleanupResult.duplicatesCancelled > 0) messages.push(`${poCleanupResult.duplicatesCancelled} duplicate purchase orders`);
                    if (drCleanupResult.duplicatesCancelled > 0) messages.push(`${drCleanupResult.duplicatesCancelled} duplicate delivery requests`);
                    if (totalDeleted > 0) messages.push(`${totalDeleted} delivery requests without address`);
                    
                    toast({
                      title: '✅ Cleanup Complete',
                      description: `Cancelled/deleted: ${messages.join(', ')}.`,
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
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={async () => {
              setCleaningUp(true);
              try {
                const deleteResult = await deleteDuplicateDeliveryRequestsByCompositeKey();
                if (deleteResult.success && deleteResult.deleted > 0) {
                  toast({
                    title: '🗑️ Deleted Duplicates',
                    description: `Permanently deleted ${deleteResult.deleted} duplicate delivery requests (same address + material type).`,
                  });
                  loadNotifications(); // Refresh notifications after deletion
                } else if (deleteResult.deleted === 0) {
                  toast({
                    title: '✅ No Duplicates Found',
                    description: 'No duplicate delivery requests found to delete.',
                  });
                } else {
                  throw new Error(deleteResult.error || 'Failed to delete duplicates');
                }
              } catch (error: any) {
                console.error('Error deleting duplicates:', error);
                toast({
                  variant: 'destructive',
                  title: 'Error Deleting Duplicates',
                  description: error.message || 'Failed to delete duplicate delivery requests.',
                });
              } finally {
                setCleaningUp(false);
              }
            }}
            disabled={cleaningUp}
          >
            {cleaningUp ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
            Delete Duplicates
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
            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
              Expecting requests? Click <strong>Refresh</strong> above. If they still don&apos;t appear, ensure migration <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">20260317_delivery_provider_see_all_pending_requests</code> has been applied to your database.
            </p>
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
              } else if (notification.deliveryAddress && notification.materialType) {
                // FALLBACK: Use composite key when po_number is missing (NO hour - same order regardless of when created)
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = normalizeMaterialType(notification.materialType);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}`;
                
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
              } else if (notification.deliveryAddress && notification.materialType) {
                // FALLBACK: Use composite key when po_number is missing (NO hour - same order regardless of when created)
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = normalizeMaterialType(notification.materialType);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}`;
                
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
              } else if (notification.deliveryAddress && notification.materialType) {
                // FALLBACK: Use composite key when po_number is missing (NO hour - same order regardless of when created)
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = normalizeMaterialType(notification.materialType);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}`;
                
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
              } else if (notification.deliveryAddress && notification.materialType) {
                // FALLBACK: Use composite key when po_number is missing (NO hour - same order regardless of when created)
                const normalizedAddress = String(notification.deliveryAddress).trim().toLowerCase();
                const normalizedMaterial = normalizeMaterialType(notification.materialType);
                uniqueKey = `composite-${normalizedAddress}|${normalizedMaterial}`;
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
                  className={`p-3 rounded-lg border shadow-md transition-all hover:shadow-lg ${
                    notification.read 
                      ? 'bg-gradient-to-br from-white to-gray-50 border-gray-200' 
                      : 'bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 border-teal-300'
                  }`}
                >
                  {/* Compact Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Truck className="h-4 w-4 text-teal-600 flex-shrink-0" />
                        <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                        {notification.status === 'pending' && (
                          <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 animate-pulse">
                            NEW
                          </Badge>
                        )}
                        {notification.nearby && (
                          <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                            Near you
                            {notification.distanceKm != null
                              ? ` · ${notification.distanceKm} km`
                              : ''}
                          </Badge>
                        )}
                      </div>
                      {notification.materialType && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          📦 {notification.materialType} {notification.quantity && `(${notification.quantity} items)`}
                        </p>
                      )}
                      {notification.estimatedCost && notification.estimatedCost > 0 && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          💰 Ksh {notification.estimatedCost.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={notification.priority === 'high' ? 'destructive' : 'outline'} 
                      className="text-[10px] font-medium px-1.5 py-0 flex-shrink-0"
                    >
                      {notification.priority}
                    </Badge>
                  </div>

                  {/* Compact Location Blocks */}
                  {notification.pickupAddress && (
                    <div className="bg-green-50/80 rounded-md px-2 py-1.5 mb-1.5 border border-green-200">
                      <p className="text-[10px] font-semibold text-green-800 uppercase">📦 Pickup</p>
                      <p className="text-xs text-green-900 truncate" title={notification.pickupAddress}>{notification.pickupAddress}</p>
                    </div>
                  )}

                  {notification.deliveryAddress && (
                    <div className="bg-orange-50/80 rounded-md px-2 py-1.5 mb-2 border border-orange-200">
                      <p className="text-[10px] font-semibold text-orange-800 uppercase">📍 Delivery address (from builder — use this for delivery)</p>
                      <p className="text-xs text-orange-900 truncate" title={notification.deliveryAddress}>{notification.deliveryAddress}</p>
                    </div>
                  )}
                  {(!notification.deliveryAddress || notification.deliveryAddress === 'Delivery address missing - contact builder') && notification.delivery_request_id && (
                    <div className="bg-red-50 border border-red-300 rounded-md px-2 py-1.5 mb-2">
                      <p className="text-[10px] font-semibold text-red-800 uppercase">⚠️ Delivery address missing</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                          disabled={checkingAddress === notification.delivery_request_id || !notification.delivery_request_id}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const deliveryRequestId = notification.delivery_request_id;
                            
                            if (!deliveryRequestId) {
                              toast({
                                title: 'Error',
                                description: 'No delivery request ID found. Cannot request address.',
                                variant: 'destructive',
                                duration: 5000
                              });
                              return;
                            }
                            
                            setCheckingAddress(deliveryRequestId);
                            
                            try {
                              // Prompt the builder: notify them to add the address in their Professional Builder Dashboard (Deliveries tab)
                              const { data: rpcData, error: rpcError } = await (supabase as any).rpc('request_builder_to_add_delivery_address', {
                                p_delivery_request_id: deliveryRequestId
                              });
                              
                              const result = rpcData as { success?: boolean; error?: string; message?: string } | null;
                              const success = result?.success === true && !rpcError;
                              
                              if (success) {
                                toast({
                                  title: '✅ Builder prompted',
                                  description: "We've asked the builder to add the delivery address. They'll see a prompt in their Professional Builder Dashboard under the Deliveries tab. Refresh this page after they add it.",
                                  variant: 'default',
                                  duration: 10000
                                });
                              } else {
                                // RPC not deployed or failed: show instructions without backend notification
                                toast({
                                  title: 'Ask builder to add address',
                                  description: "The address must be added by the builder. Ask them to open their Professional Builder Dashboard → Deliveries tab. They'll see 'Action Required: Missing Delivery Addresses' and can add the address there. Then refresh this page.",
                                  variant: 'default',
                                  duration: 12000
                                });
                              }
                              
                              // Optionally re-check DB so driver can see if address was already added
                              const addressCheck = await checkDeliveryAddress(deliveryRequestId).catch(() => null);
                              if (addressCheck?.delivery_address?.trim()) {
                                const isPlaceholder = ['to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 'to be determined', 'delivery location', 'address not found', 'address not specified by builder'].some(
                                  p => (addressCheck.delivery_address || '').toLowerCase().trim() === p
                                );
                                if (!isPlaceholder) {
                                  toast({
                                    title: '📍 Address on file',
                                    description: `Address: ${(addressCheck.delivery_address || '').substring(0, 80)}${(addressCheck.delivery_address || '').length > 80 ? '...' : ''}`,
                                    duration: 8000
                                  });
                                }
                              }
                            } catch (err: any) {
                              toast({
                                title: 'Ask builder to add address',
                                description: "The address must be added by the builder in their Professional Builder Dashboard under the Deliveries tab. Refresh this page after they add it.",
                                variant: 'default',
                                duration: 10000
                              });
                            } finally {
                              setCheckingAddress(null);
                            }
                          }}
                        >
                          {checkingAddress === notification.delivery_request_id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              🔍 Check Address
                            </>
                          )}
                        </Button>
                        <span className="text-[10px] text-gray-500">ID: {notification.delivery_request_id.slice(0, 8)}…</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {notification.status === 'pending' && notification.delivery_request_id ? (
                    <>
                      {/* Show if already accepted by another provider */}
                      {notification.provider_id && notification.provider_id !== userId ? (
                        <div className="bg-amber-50 border border-amber-300 rounded-md px-2 py-1.5 text-center">
                          <p className="text-xs font-semibold text-amber-800 flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Already accepted by another provider
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptDelivery(notification.delivery_request_id!)}
                              disabled={acceptingId === notification.delivery_request_id || rejectingId === notification.delivery_request_id}
                              className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold"
                            >
                              {acceptingId === notification.delivery_request_id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1.5" />
                                  Accept Delivery
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDelivery(notification.delivery_request_id!)}
                              disabled={acceptingId === notification.delivery_request_id || rejectingId === notification.delivery_request_id}
                              className="flex-1 h-8 text-xs font-semibold"
                            >
                              {rejectingId === notification.delivery_request_id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1.5" />
                                  Reject
                                </>
                              )}
                            </Button>
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* Timestamp */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-200">
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(notification.timestamp)}
                    </p>
                    {notification.delivery_request_id && (
                      <p className="text-[10px] text-gray-400">ID: {notification.delivery_request_id.substring(0, 8)}…</p>
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
