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
      const { data, error: rpcError } = await (supabase as any).rpc('get_deliveries_for_provider_unified');
      if (rpcError) {
        setError(rpcError.message ?? 'Failed to load deliveries');
        setScheduled([]);
        setInTransit([]);
        setDelivered([]);
        return;
      }
      const rows = parseUnifiedRows(data);
      const scheduledList: UnifiedDeliveryRow[] = [];
      const inTransitList: UnifiedDeliveryRow[] = [];
      const deliveredList: UnifiedDeliveryRow[] = [];
      const poIds = new Set<string>();
      rows.forEach((r) => {
        if (r.purchase_order_id) poIds.add(r.purchase_order_id);
        if (r._categorized_status === 'scheduled') scheduledList.push(r);
        else if (r._categorized_status === 'in_transit') inTransitList.push(r);
        else deliveredList.push(r);
      });
      poIdsRef.current = poIds;
      setScheduled(scheduledList);
      setInTransit(inTransitList);
      setDelivered(deliveredList);
    } catch (e: any) {
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
