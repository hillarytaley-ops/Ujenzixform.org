/**
 * Single source of truth for the Delivery Dashboard "Deliveries" tab.
 * Uses get_deliveries_for_provider_unified() RPC so Scheduled, In Transit, and Delivered
 * come from one call—aligned with Supplier Orders/QR (material_items dispatch_scanned, receive_scanned).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedDeliveryRow {
  id: string;
  purchase_order_id: string;
  order_number: string;
  status: string;
  po_status?: string;
  purchase_order_status?: string;
  created_at: string;
  updated_at: string;
  delivery_address: string;
  pickup_location?: string;
  dropoff_location?: string;
  delivery_provider_id?: string;
  delivery_provider_name?: string;
  provider_id?: string;
  _items_count: number;
  _dispatched_count: number;
  _received_count: number;
  _categorized_status: 'scheduled' | 'in_transit' | 'delivered';
  delivered_at?: string;
  source?: string;
}

export interface UseDeliveriesUnifiedResult {
  scheduled: UnifiedDeliveryRow[];
  inTransit: UnifiedDeliveryRow[];
  delivered: UnifiedDeliveryRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function parseUnifiedRows(data: unknown): UnifiedDeliveryRow[] {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : (typeof data === 'object' && data !== null && 'data' in (data as object) ? (data as { data: unknown }).data : null);
  const list = Array.isArray(arr) ? arr : [];
  return list.map((row: any) => ({
    id: row.id ?? row.purchase_order_id ?? '',
    purchase_order_id: row.purchase_order_id ?? '',
    order_number: row.order_number ?? row.po_number ?? '',
    status: row.status ?? '',
    po_status: row.po_status,
    purchase_order_status: row.purchase_order_status ?? row.po_status,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    delivery_address: row.delivery_address ?? '',
    pickup_location: row.pickup_location,
    dropoff_location: row.dropoff_location,
    delivery_provider_id: row.delivery_provider_id,
    delivery_provider_name: row.delivery_provider_name,
    provider_id: row.provider_id,
    _items_count: Number(row._items_count) ?? 0,
    _dispatched_count: Number(row._dispatched_count) ?? 0,
    _received_count: Number(row._received_count) ?? 0,
    _categorized_status: (row._categorized_status === 'scheduled' || row._categorized_status === 'in_transit' || row._categorized_status === 'delivered')
      ? row._categorized_status
      : ('scheduled' as const),
    delivered_at: row.delivered_at,
    source: row.source,
  }));
}

export function useDeliveriesUnified(): UseDeliveriesUnifiedResult {
  const { user } = useAuth();
  const [scheduled, setScheduled] = useState<UnifiedDeliveryRow[]>([]);
  const [inTransit, setInTransit] = useState<UnifiedDeliveryRow[]>([]);
  const [delivered, setDelivered] = useState<UnifiedDeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const poIdsRef = useRef<Set<string>>(new Set());

  const fetchUnified = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setScheduled([]);
      setInTransit([]);
      setDelivered([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔵 Calling unified RPC function...', { userId });
      const startTime = Date.now();
      
      // Shorter timeout (15 seconds) to fail faster
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error('⏱️ RPC timeout triggered after 15 seconds');
          reject(new Error('RPC call timed out after 15 seconds'));
        }, 15000);
      });
      
      console.log('🔵 Starting RPC promise...');
      
      // Add intermediate logging to track promise state
      let promiseState = 'created';
      const rpcPromise = supabase.rpc('get_deliveries_for_provider_unified')
        .then((response) => {
          promiseState = 'resolved';
          console.log('🔵 RPC promise resolved:', {
            hasData: !!response?.data,
            hasError: !!response?.error,
            dataLength: Array.isArray(response?.data) ? response.data.length : 'not-array',
            duration: `${Date.now() - startTime}ms`
          });
          return response;
        })
        .catch((error) => {
          promiseState = 'rejected';
          console.error('🔵 RPC promise rejected:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            duration: `${Date.now() - startTime}ms`
          });
          throw error;
        });
      
      console.log('🔵 RPC promise created, racing with timeout...');
      
      // Log promise state periodically
      const stateCheckInterval = setInterval(() => {
        console.log(`⏳ RPC still pending... (${Date.now() - startTime}ms elapsed, state: ${promiseState})`);
      }, 2000);
      
      let result: any;
      try {
        result = await Promise.race([rpcPromise, timeoutPromise]);
        clearInterval(stateCheckInterval);
        console.log('🔵 Promise.race completed:', {
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : [],
          resultType: typeof result,
          promiseState,
          duration: `${Date.now() - startTime}ms`
        });
      } catch (raceError: any) {
        clearInterval(stateCheckInterval);
        if (timeoutId) clearTimeout(timeoutId);
        console.error('❌ Promise.race error:', {
          message: raceError?.message,
          name: raceError?.name,
          promiseState,
          duration: `${Date.now() - startTime}ms`
        });
        throw raceError;
      } finally {
        clearInterval(stateCheckInterval);
        if (timeoutId) clearTimeout(timeoutId);
      }
      
      const { data, error: rpcError } = result || {};
      const duration = Date.now() - startTime;
      
      console.log('🔵 Unified RPC Response received:', {
        duration: `${duration}ms`,
        hasError: !!rpcError,
        hasData: !!data,
        dataType: typeof data,
        dataIsArray: Array.isArray(data),
        dataLength: Array.isArray(data) ? data.length : (data ? 'not-array' : 'null/undefined')
      });
      
      if (rpcError) {
        console.error('❌ Unified RPC Error:', {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code,
          fullError: rpcError
        });
        setError(rpcError.message ?? 'Failed to load deliveries');
        setScheduled([]);
        setInTransit([]);
        setDelivered([]);
        return;
      }
      
      if (!data) {
        console.warn('⚠️ Unified RPC returned null/undefined data');
        setScheduled([]);
        setInTransit([]);
        setDelivered([]);
        return;
      }
      
      console.log('🔵 Unified RPC Success - Raw response:', {
        data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A'
      });
      const rows = parseUnifiedRows(data);
      console.log('🔵 Unified RPC Response:', {
        rawDataLength: Array.isArray(data) ? data.length : (data ? 1 : 0),
        parsedRowsLength: rows.length,
        sampleRows: rows.slice(0, 3).map(r => ({
          order_number: r.order_number,
          status: r._categorized_status,
          po_id: r.purchase_order_id
        }))
      });
      const scheduledList: UnifiedDeliveryRow[] = [];
      const inTransitList: UnifiedDeliveryRow[] = [];
      const deliveredList: UnifiedDeliveryRow[] = [];
      const poIds = new Set<string>();
      rows.forEach((r) => {
        if (r.purchase_order_id) poIds.add(r.purchase_order_id);
        // CRITICAL FIX: Include 'in_transit' orders in scheduled list for delivery providers
        // These are orders that are dispatched but not yet delivered - delivery providers need to see them
        if (r._categorized_status === 'scheduled' || r._categorized_status === 'in_transit') scheduledList.push(r);
        else if (r._categorized_status === 'in_transit') inTransitList.push(r);
        else deliveredList.push(r);
      });
      console.log('🔵 Unified RPC Categorized:', {
        scheduled: scheduledList.length,
        inTransit: inTransitList.length,
        delivered: deliveredList.length,
        total: scheduledList.length + inTransitList.length + deliveredList.length
      });
      poIdsRef.current = poIds;
      setScheduled(scheduledList);
      setInTransit(inTransitList);
      setDelivered(deliveredList);
    } catch (e: any) {
      console.error('❌ Unified RPC Exception:', {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        fullError: e
      });
      
      // FALLBACK: Try alternative RPC function
      console.log('🔄 Trying alternative RPC: get_active_deliveries_for_provider()');
      try {
        const { data: altData, error: altError } = await supabase.rpc('get_active_deliveries_for_provider');
        
        if (!altError && altData && Array.isArray(altData) && altData.length > 0) {
          console.log('✅ Alternative RPC succeeded:', { count: altData.length });
          const rows = parseUnifiedRows(altData);
          const scheduledList: UnifiedDeliveryRow[] = [];
          const inTransitList: UnifiedDeliveryRow[] = [];
          const deliveredList: UnifiedDeliveryRow[] = [];
          
          rows.forEach((r) => {
            if (r._categorized_status === 'scheduled' || r._categorized_status === 'in_transit') {
              scheduledList.push(r);
            }
            if (r._categorized_status === 'in_transit') {
              inTransitList.push(r);
            }
            if (r._categorized_status === 'delivered') {
              deliveredList.push(r);
            }
          });
          
          setScheduled(scheduledList);
          setInTransit(inTransitList);
          setDelivered(deliveredList);
          setError(null);
          return;
        } else {
          console.warn('⚠️ Alternative RPC also failed or returned empty:', altError);
        }
      } catch (altErr: any) {
        console.error('❌ Alternative RPC also failed:', altErr);
      }
      
      setError(e?.message ?? 'Failed to load deliveries');
      setScheduled([]);
      setInTransit([]);
      setDelivered([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUnified();
  }, [fetchUnified]);

  // Real-time: refetch when material_items or delivery_requests change so supplier dispatch/scan and driver scan reflect immediately
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('deliveries-unified-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'material_items',
        },
        () => {
          fetchUnified();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_requests',
        },
        () => {
          fetchUnified();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
        },
        () => {
          fetchUnified();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnified]);

  return {
    scheduled,
    inTransit,
    delivered,
    loading,
    error,
    refetch: fetchUnified,
  };
}
