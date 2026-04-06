import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck, Scan, CheckCircle, Camera, Truck, Lock, ArrowRight, RotateCcw, Smartphone, Flashlight, AlertCircle, ArrowLeft, RefreshCw, Clock, QrCode, CheckCircle2, Circle, PartyPopper, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';


interface ScanResult {
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  timestamp: Date;
}

interface OrderItem {
  id: string;
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  item_sequence: number;
  receive_scanned: boolean;
  receive_scanned_at?: string;
  receive_scan_count?: number;
  dispatch_scanned: boolean;
  status: string;
}

interface Order {
  id: string;
  order_number?: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_items: number;
  received_items: number;
  pending_items: number;
  created_at: string;
  items: OrderItem[];
  /** False when no material_items rows were returned for this PO (RLS, network, or not generated yet) — must NOT treat as "fully received" */
  items_loaded: boolean;
}

/** Delivery row from dashboard (useDataIsolation) - single source of truth so scanner shows same list as Deliveries tab */
export interface DeliveryRequestForScanner {
  id: string;
  purchase_order_id?: string | null;
  order_number?: string;
  status?: string;
}

/** When REST returns no material_items (RLS), load rows via SECURITY DEFINER RPC (same assignment rules as DB policies). */
async function mergeMaterialItemsFromProviderRpc(poIds: string[], itemsByPo: Map<string, any[]>): Promise<void> {
  const missing = poIds.filter((id) => (itemsByPo.get(id) || []).length === 0);
  if (missing.length === 0) return;
  try {
    const { data, error } = await supabase.rpc('get_material_items_rows_for_provider_receive', {
      p_po_ids: missing,
    });
    if (error) {
      console.warn('get_material_items_rows_for_provider_receive:', error.message);
      return;
    }
    let rows: any[] = [];
    if (Array.isArray(data)) rows = data;
    else if (data != null && typeof data === 'string') {
      try {
        const p = JSON.parse(data);
        rows = Array.isArray(p) ? p : [];
      } catch {
        rows = [];
      }
    }
    for (const row of rows) {
      const pid = row.purchase_order_id;
      if (!pid) continue;
      if (!itemsByPo.has(pid)) itemsByPo.set(pid, []);
      itemsByPo.get(pid)!.push(row);
    }
  } catch (e) {
    console.warn('mergeMaterialItemsFromProviderRpc:', e);
  }
}

interface ReceivingScannerProps {
  /** Called after successful scan. Passes true if the full order was completed (all items received). */
  onDeliveryComplete?: (orderCompleted?: boolean) => void;
  /** When provided, use this list instead of fetching delivery_requests (same data as dashboard = same orders). */
  deliveryRequestsFromDashboard?: DeliveryRequestForScanner[];
  /** Called when user taps Refresh and scanner is using dashboard list – parent should refetch and pass new list. */
  onRefreshRequested?: () => void;
}
export const ReceivingScanner: React.FC<ReceivingScannerProps> = ({ onDeliveryComplete, deliveryRequestsFromDashboard, onRefreshRequested }) => {
  const [step, setStep] = useState<'select-delivery' | 'scanning'>('select-delivery');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const fetchOrdersRef = useRef<boolean>(false);
  const loadRunIdRef = useRef(0);
  const hasOrdersRef = useRef(false);
  /** Latest dashboard list — effect deps use a stable fingerprint so parent array ref churn does not restart loads forever (stuck "Loading…"). */
  const deliveryRequestsFromDashboardRef = useRef<DeliveryRequestForScanner[] | undefined>(undefined);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'receiving-qr-scanner';
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualQRCode, setManualQRCode] = useState('');
  const [materialCondition, setMaterialCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const recentlyProcessedRef = useRef<Map<string, number>>(new Map());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const CAMERA_CONSENT_KEY = 'scanner_camera_consent';

  const [allItemsScanned, setAllItemsScanned] = useState(false);
  const [showItemsList, setShowItemsList] = useState(false);

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  };

  // Helper to fetch with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 8000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

  // Helper to get user from localStorage
  const getUserFromStorage = (): { id: string; accessToken: string } | null => {
    try {
      const storedSession = readPersistedAuthRawStringSync();
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.user?.id && parsed.access_token) {
          return { id: parsed.user.id, accessToken: parsed.access_token };
        }
      }
    } catch (e) {
      console.warn('Could not get user from localStorage');
    }
    return null;
  };

  useEffect(() => {
    checkAuth();
    detectDeviceInfo();
    listAvailableCameras();

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      const ignoredPatterns = ['O', 'decodeRow2pairs', 'decodeRow', 'doDecode', 'NotFoundException'];
      const shouldIgnore = ignoredPatterns.some(pattern =>
        errorMessage.includes(pattern) || (errorMessage.length <= 2 && /^[A-Z]$/.test(errorMessage))
      );
      if (shouldIgnore) {
        event.preventDefault();
        return;
      }
      console.warn('⚠️ Unhandled promise rejection from scanner:', errorMessage);
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      stopScanning();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // object-fit: cover breaks html5-qrcode shaded region vs video buffer mapping — use fill (see DispatchScanner).
  useEffect(() => {
    const styleId = 'receiving-scanner-custom-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #${scannerContainerId} {
        width: 100% !important;
        height: 100% !important;
        min-height: 500px !important;
        position: relative !important;
        overflow: hidden !important;
        background: #000 !important;
      }
      #${scannerContainerId} video {
        width: 100% !important;
        height: 100% !important;
        object-fit: fill !important;
        object-position: center center !important;
        display: block !important;
      }
      #${scannerContainerId} canvas {
        display: none !important;
      }
      #${scannerContainerId} #qr-shaded-region {
        display: none !important;
      }
      #${scannerContainerId} .html5-qrcode-element {
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  useEffect(() => {
    if (!selectedOrder || selectedOrder.items.length === 0) return;
    const allReceived = selectedOrder.items.every(
      (i) => i.receive_scanned || (i.receive_scan_count ?? 0) >= (i.quantity ?? 1)
    );
    if (allReceived && !allItemsScanned) {
      setAllItemsScanned(true);
      toast.success('🎉 All items received!', {
        description: `Order #${selectedOrder.order_number} is now delivered.`,
        duration: 8000
      });
      onDeliveryComplete?.(true);
    }
  }, [selectedOrder?.items, selectedOrder?.order_number, allItemsScanned, onDeliveryComplete]);

  const detectDeviceInfo = () => {
    if (isIOS) {
      setDeviceInfo('iOS Device');
    } else if (isAndroid) {
      setDeviceInfo('Android Device');
    } else {
      setDeviceInfo('Desktop/Laptop');
    }
  };

  const listAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const cameraList = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
        setAvailableCameras(cameraList);
        const backCamera = cameraList.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        if (backCamera) setSelectedCameraId(backCamera.id);
        else setSelectedCameraId(isMobile && cameraList.length > 1 ? cameraList[cameraList.length - 1].id : cameraList[0].id);
      }
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
        setCameraError('Camera access denied. Allow camera permission in your browser to scan QR codes.');
        return;
      }
      setCameraError(error?.message || 'Could not list cameras.');
    }
  };

  const checkAuth = async () => {
    try {
      const localRole = localStorage.getItem('user_role');
      if (localRole) setUserRole(localRole);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      setUserRole(roleData?.role || localRole || null);
    } catch (err) {
      console.error('Auth check failed (non-fatal):', err);
      setUserRole(localStorage.getItem('user_role') || null);
    }
  };

  const RECEIVING_FETCH_TIMEOUT_MS = 12000; // 12s max so mobile never hangs forever

  /** Build orders from a list of delivery requests (same PO + material_items fetch and order map). */
  const buildOrdersFromPoIds = (
    poIds: string[],
    byPoId: Map<string, { order_number?: string }>,
    poMap: Map<string, { po_number?: string; order_number?: string; created_at?: string }>,
    itemsByPo: Map<string, any[]>
  ): Order[] => {
    const orderMap: Record<string, Order> = {};
    for (const poId of poIds) {
      const items = itemsByPo.get(poId) || [];
      // CRITICAL: Zero rows from material_items is NOT "everything received" — it usually means RLS hid rows
      // or line items were never generated. Previously pending_items became 0 and orders wrongly showed under "Fully Received".
      if (items.length === 0) {
        const meta = byPoId.get(poId);
        const poMeta = poMap.get(poId);
        const displayNumber = meta?.order_number || poMeta?.po_number || `Order ${poId.slice(0, 8)}`;
        orderMap[poId] = {
          id: poId,
          order_number: displayNumber,
          buyer_id: '',
          buyer_name: 'Client',
          buyer_email: '',
          buyer_phone: '',
          total_items: 0,
          received_items: 0,
          pending_items: 0,
          created_at: poMeta?.created_at || poId,
          items: [],
          items_loaded: false
        };
        continue;
      }

      const allReceived = items.every(
        (i: any) => i.receive_scanned === true || (i.receive_scan_count ?? 0) >= (i.quantity ?? 1)
      );
      if (allReceived) continue;

      const orderItems: OrderItem[] = items.map((it: any) => ({
        id: it.id,
        qr_code: it.qr_code,
        material_type: it.material_type || '',
        category: it.category || '',
        quantity: it.quantity ?? 1,
        unit: it.unit || '',
        item_sequence: it.item_sequence ?? 0,
        receive_scanned: it.receive_scanned === true,
        receive_scan_count: it.receive_scan_count ?? 0,
        dispatch_scanned: it.dispatch_scanned === true,
        status: it.status || ''
      }));
      let totalItems = 0;
      let receivedItems = 0;
      orderItems.forEach((i) => {
        const q = i.quantity ?? 1;
        totalItems += q;
        const count = i.receive_scan_count ?? 0;
        receivedItems += i.receive_scanned ? q : Math.min(count, q);
      });
      const pendingItems = Math.max(0, totalItems - receivedItems);
      const meta = byPoId.get(poId);
      const poMeta = poMap.get(poId);
      const displayNumber = meta?.order_number || poMeta?.po_number || `Order ${poId.slice(0, 8)}`;
      orderMap[poId] = {
        id: poId,
        order_number: displayNumber,
        buyer_id: '',
        buyer_name: 'Client',
        buyer_email: '',
        buyer_phone: '',
        total_items: totalItems,
        received_items: receivedItems,
        pending_items: pendingItems,
        created_at: poMeta?.created_at || poId,
        items: orderItems,
        items_loaded: true
      };
    }
    return Object.values(orderMap)
      .filter((o) => o.id)
      .sort((a, b) => (b.pending_items > 0 ? 1 : 0) - (a.pending_items > 0 ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  /** Use dashboard list as single source of truth so scanner shows same orders as Deliveries tab. */
  const loadFromDashboardList = useCallback(async (list: DeliveryRequestForScanner[]) => {
    loadRunIdRef.current += 1;
    const runId = loadRunIdRef.current;
    const isBackgroundRefresh = hasOrdersRef.current;
    if (!isBackgroundRefresh) setLoadingOrders(true);
    const byPoId = new Map<string, { order_number?: string }>();
    list.forEach((d) => {
      const poId = d.purchase_order_id;
      if (poId && !byPoId.has(poId)) byPoId.set(poId, { order_number: d.order_number });
    });
    const poIds = Array.from(byPoId.keys());
    if (poIds.length === 0) {
      hasOrdersRef.current = false;
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    const run = async () => {
      // REST + user JWT (same pattern as Delivery Dashboard validation) — supabase-js can return 0 rows under RLS while REST with Bearer works.
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const stored = readPersistedAuthRawStringSync();
        if (stored) {
          const p = JSON.parse(stored);
          if (p.access_token) accessToken = p.access_token;
        }
      } catch {
        /* ignore */
      }
      const headers: Record<string, string> = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      const poIdsParam = poIds.join(',');
      const miSelect =
        'id,purchase_order_id,qr_code,material_type,category,quantity,unit,item_sequence,receive_scanned,receive_scan_count,dispatch_scanned,status,created_at';
      const [poResp, itemsResp] = await Promise.all([
        fetchWithTimeout(
          // purchase_orders has po_number, not order_number — selecting a missing column causes PostgREST 400
          `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${poIdsParam})&select=id,po_number,created_at`,
          { headers, cache: 'no-store' },
          RECEIVING_FETCH_TIMEOUT_MS
        ),
        fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=in.(${poIdsParam})&select=${miSelect}&order=item_sequence.asc`,
          { headers, cache: 'no-store' },
          RECEIVING_FETCH_TIMEOUT_MS
        )
      ]);
      const poMap = new Map<string, { po_number?: string; order_number?: string; created_at?: string }>();
      if (poResp.ok) {
        const rows = (await poResp.json()) as any[];
        (rows || []).forEach((r: any) => poMap.set(r.id, { po_number: r.po_number, order_number: r.order_number, created_at: r.created_at }));
      }
      const itemsByPo = new Map<string, any[]>();
      if (itemsResp.ok) {
        const rows = (await itemsResp.json()) as any[];
        (rows || []).forEach((row: any) => {
          const pid = row.purchase_order_id;
          if (!pid) return;
          if (!itemsByPo.has(pid)) itemsByPo.set(pid, []);
          itemsByPo.get(pid)!.push(row);
        });
      }
      await mergeMaterialItemsFromProviderRpc(poIds, itemsByPo);
      return buildOrdersFromPoIds(poIds, byPoId, poMap, itemsByPo);
    };
    try {
      const ordersArray = await withTimeout(run(), RECEIVING_FETCH_TIMEOUT_MS);
      if (runId === loadRunIdRef.current) {
        hasOrdersRef.current = ordersArray.length > 0;
        setOrders(ordersArray);
        if (ordersArray.length > 0 && ordersArray.some((o) => !o.items_loaded)) {
          toast.info(
            'Some orders still have no line items after the server fallback. Apply the latest Supabase migration (get_material_items_rows_for_provider_receive) or ask an admin to check material_items for those orders.',
            { duration: 10000 }
          );
        }
      }
    } catch (err: any) {
      if (runId !== loadRunIdRef.current) return;
      hasOrdersRef.current = false;
      const isTimeout = err?.message === 'Timeout' || err?.message?.includes('timeout');
      if (isTimeout) {
        toast.error('Load timed out. Tap Refresh to try again.');
      } else {
        console.error('Load from dashboard list error:', err);
        toast.error('Failed to load orders');
      }
      setOrders([]);
    } finally {
      if (runId === loadRunIdRef.current) {
        setLoadingOrders(false);
      }
    }
  }, []);

  const fetchDeliveries = useCallback(async () => {
    if (fetchOrdersRef.current) return;
    fetchOrdersRef.current = true;
    setLoadingOrders(true);
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setOrders([]);
        return;
      }
      let providerId: string = user.id;
      const { data: dp } = await supabase.from('delivery_providers').select('id').eq('user_id', user.id).maybeSingle();
      if (dp?.id) providerId = dp.id;

      const activeStatuses = ['pending', 'requested', 'assigned', 'accepted', 'scheduled', 'dispatched', 'in_transit', 'picked_up', 'out_for_delivery'];
      const { data: drList } = await supabase
        .from('delivery_requests')
        .select('id,purchase_order_id,status,order_number,provider_id')
        .in('status', activeStatuses)
        .order('created_at', { ascending: false })
        .limit(100);

      const rowsRaw = (drList || []) as Array<{ purchase_order_id: string | null; status: string; order_number?: string; provider_id?: string | null }>;
      const pidStr = providerId != null ? String(providerId) : '';
      const uidStr = user.id != null ? String(user.id) : '';
      const rows = rowsRaw.filter(
        (d) => d.purchase_order_id && (pidStr && String(d.provider_id) === pidStr || uidStr && String(d.provider_id) === uidStr)
      );
      const byPoId = new Map<string, { order_number?: string }>();
      rows.forEach((d) => {
        if (d.purchase_order_id && !byPoId.has(d.purchase_order_id)) {
          byPoId.set(d.purchase_order_id, { order_number: d.order_number });
        }
      });
      const poIds = Array.from(byPoId.keys());
      if (poIds.length === 0) {
        setOrders([]);
        return;
      }

      const [poRes, itemsRes] = await Promise.all([
        supabase.from('purchase_orders').select('id,po_number,created_at').in('id', poIds),
        supabase.from('material_items')
          .select('id,purchase_order_id,qr_code,material_type,category,quantity,unit,item_sequence,receive_scanned,receive_scan_count,dispatch_scanned,status,created_at')
          .in('purchase_order_id', poIds)
          .order('item_sequence')
      ]);
      const poMap = new Map<string, { po_number?: string; order_number?: string; created_at?: string }>();
      (poRes.data || []).forEach((r: any) => poMap.set(r.id, { po_number: r.po_number, order_number: r.order_number, created_at: r.created_at }));
      const itemsByPo = new Map<string, any[]>();
      (itemsRes.data || []).forEach((row: any) => {
        const pid = row.purchase_order_id;
        if (!pid) return;
        if (!itemsByPo.has(pid)) itemsByPo.set(pid, []);
        itemsByPo.get(pid)!.push(row);
      });
      await mergeMaterialItemsFromProviderRpc(poIds, itemsByPo);
      const ordersArray = buildOrdersFromPoIds(poIds, byPoId, poMap, itemsByPo);
      setOrders(ordersArray);
    };
    try {
      await withTimeout(run(), RECEIVING_FETCH_TIMEOUT_MS);
    } catch (err: any) {
      const isTimeout = err?.message === 'Timeout' || err?.message?.includes('timeout');
      if (isTimeout) {
        toast.error('Load timed out. Tap Refresh to try again.');
      } else {
        console.error('Fetch deliveries error:', err);
        toast.error('Failed to load deliveries');
      }
      setOrders([]);
    } finally {
      setLoadingOrders(false);
      fetchOrdersRef.current = false;
    }
  }, []);

  deliveryRequestsFromDashboardRef.current = deliveryRequestsFromDashboard;
  const dashboardListFingerprint =
    deliveryRequestsFromDashboard === undefined
      ? '__standalone__'
      : deliveryRequestsFromDashboard.length === 0
        ? ''
        : [...deliveryRequestsFromDashboard]
            .map((d) => `${d.purchase_order_id || ''}:${d.id}`)
            .sort()
            .join('|');

  useEffect(() => {
    if (deliveryRequestsFromDashboard !== undefined) {
      // Dashboard mode: use only the list from parent. Do NOT start fetchDeliveries() when
      // length is 0, or it can complete after loadFromDashboardList(1 item) and overwrite with [].
      const list = deliveryRequestsFromDashboardRef.current;
      if (list && list.length > 0) {
        loadFromDashboardList(list);
      } else {
        hasOrdersRef.current = false;
        setOrders([]);
        setLoadingOrders(false);
      }
      return;
    }
    const allowAccess = ['admin', 'delivery_provider', 'delivery'].includes(userRole || '');
    if (!allowAccess) {
      setLoadingOrders(false);
      return;
    }
    fetchDeliveries();
  }, [userRole, dashboardListFingerprint, loadFromDashboardList, fetchDeliveries]);

  const selectDelivery = (order: Order) => {
    if (!order.items_loaded || order.items.length === 0) {
      toast.error('Line items not available', {
        description: 'This order has no scannable rows loaded for your account. Fix material_items access first.',
        duration: 6000
      });
      return;
    }
    setSelectedOrder(order);
    setScanResults([]);
    setAllItemsScanned(order.pending_items === 0);
    setStep('scanning');
  };

  const goBackToOrderSelection = async () => {
    await stopScanning();
    setSelectedOrder(null);
    setScanResults([]);
    setAllItemsScanned(false);
    setStep('select-delivery');
    if (deliveryRequestsFromDashboard !== undefined) {
      onRefreshRequested?.();
      loadFromDashboardList(deliveryRequestsFromDashboard);
    } else {
      fetchDeliveries();
    }
  };

  const handleRefresh = () => {
    if (deliveryRequestsFromDashboard !== undefined) {
      onRefreshRequested?.();
      loadFromDashboardList(deliveryRequestsFromDashboard);
    } else {
      fetchOrdersRef.current = false;
      fetchDeliveries();
    }
  };

  const startCameraScanning = async () => {
    setCameraError(null);

    try {
      // Check for secure context (HTTPS or localhost)
      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        setCameraError('Camera requires HTTPS connection.');
        toast.error('Camera requires HTTPS or localhost');
        return;
      }

      // Stop any existing scanner
      await stopScanning();

      // Short delay for cleanup and container readiness (same as DispatchScanner)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new scanner instance
      console.log('🎥 Creating Html5Qrcode instance for container:', scannerContainerId);
      scannerRef.current = new Html5Qrcode(scannerContainerId, { verbose: false });

      let cameraConfig: any;
      if (selectedCameraId) {
        cameraConfig = selectedCameraId;
        console.log('📷 Using selected camera ID:', selectedCameraId);
      } else {
        cameraConfig = {
          facingMode: facing,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        };
        console.log('📷 Using facing mode:', facing);
      }

      const scannerConfig = {
        fps: 30,
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      console.log('🎥 Starting scanner with config:', {
        cameraConfig,
        fps: scannerConfig.fps,
        fullFrame: true,
      });

      await scannerRef.current.start(
        cameraConfig,
        scannerConfig,
        async (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 1000) return;
          const lastProcessedAt = recentlyProcessedRef.current.get(decodedText);
          if (lastProcessedAt != null && now - lastProcessedAt < 2500) return;
          if (lastProcessedAt != null) recentlyProcessedRef.current.delete(decodedText);
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            oscillator.start();
            setTimeout(() => oscillator.stop(), 150);
          } catch (_) {}
          toast.success(`QR scanned: ${decodedText.substring(0, 20)}...`);
          try {
            if (scannerRef.current) {
              const state = scannerRef.current.getState();
              if (state === Html5QrcodeScannerState.SCANNING) await scannerRef.current.pause();
            }
          } catch (_) {}
          await processQRScan(decodedText, 'mobile_camera');
        },
        (errorMessage) => {
          // Filter out common expected errors that occur during normal scanning
          const ignoredErrors = [
            'No QR code found',
            'NotFoundException',
            'No MultiFormat Readers were able to detect the code',
            'QR code parse error',
            'QR code not found',
            'No QR code detected',
            'O', // Internal library error (minified) - non-critical
            'decodeRow2pairs', // Internal library decoding errors
            'decodeRow', // Internal library decoding errors
            'doDecode' // Internal library decoding errors
          ];
          
          // Check if error message is a single character or very short (likely minified/internal)
          const isShortError = errorMessage && errorMessage.length <= 2;
          
          const shouldIgnore = isShortError || ignoredErrors.some(ignored => 
            errorMessage.includes(ignored) || errorMessage.toLowerCase().includes(ignored.toLowerCase())
          );
          
          if (!shouldIgnore) {
            console.log('📷 Scanner message:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      localStorage.setItem(CAMERA_CONSENT_KEY, 'true');
      toast.success('📷 Camera ready! Point at QR code to scan.');
      console.log('✅ Scanner started successfully');

    } catch (error: any) {
      console.error('❌ Camera error:', error);
      console.error('Error details:', { name: error.name, message: error.message, stack: error.stack });
      setIsScanning(false);
      
      if (error.message?.includes('Permission') || error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
        toast.error('Camera permission denied');
      } else if (error.message?.includes('not found') || error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
        toast.error('No camera found');
      } else if (error.message?.includes('in use') || error.name === 'NotReadableError') {
        setCameraError('Camera is in use by another application.');
        toast.error('Camera is busy');
      } else {
        setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
        toast.error(`Failed to access camera: ${error.message}`);
      }
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.log('Scanner cleanup:', e);
    }
    setIsScanning(false);
    lastScannedRef.current = '';
    lastScanTimeRef.current = 0;
    recentlyProcessedRef.current.clear();
  };

  const toggleCamera = async () => {
    if (availableCameras.length <= 1) {
      const next = facing === 'environment' ? 'user' : 'environment';
      setFacing(next);
    } else {
      const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].id);
    }
    
    if (isScanning) {
      await stopScanning();
      setTimeout(() => startCameraScanning(), 300);
    }
  };

  const processQRScan = async (qrCode: string, scannerType: 'mobile_camera' | 'physical_scanner' | 'web_scanner') => {
    if (!selectedOrder) {
      toast.error('No delivery selected');
      return;
    }
    
    // Clean QR code
    let cleanQRCode = qrCode.trim();
    if (cleanQRCode.includes('/qr/') || cleanQRCode.includes('?code=')) {
      const urlMatch = cleanQRCode.match(/(?:\/qr\/|[?&]code=)([^&\s]+)/);
      if (urlMatch) cleanQRCode = urlMatch[1];
    }
    try { cleanQRCode = decodeURIComponent(cleanQRCode); } catch (_) {}
    
    // Validate QR code belongs to selected order (same as DispatchScanner validation)
    const isFullyReceived = (i: OrderItem) => i.receive_scanned || (i.receive_scan_count ?? 0) >= (i.quantity ?? 1);
    let matchingItem: OrderItem | undefined =
      selectedOrder.items.find((i) => (i.qr_code === cleanQRCode || i.qr_code?.trim() === cleanQRCode.trim()) && !isFullyReceived(i)) ||
      selectedOrder.items.find((i) => i.qr_code === cleanQRCode || i.qr_code?.trim() === cleanQRCode.trim());
    
    // If not found in cache, verify with database (like DispatchScanner)
    if (!matchingItem) {
      console.log('⚠️ QR code not found in cached items, verifying with database...');
      try {
        const { data: verifyData } = await supabase
          .from('material_items')
          .select('id,qr_code,material_type,item_sequence,quantity,receive_scanned,receive_scan_count,dispatch_scanned,purchase_order_id')
          .eq('qr_code', cleanQRCode)
          .limit(1)
          .maybeSingle();
          
        if (verifyData) {
          if (verifyData.purchase_order_id !== selectedOrder.id) {
            toast.error('Wrong order', {
              description: `This QR belongs to another delivery. Scan only items for Order #${selectedOrder.order_number}.`,
              duration: 5000
            });
            return;
          }
          const q = verifyData.quantity ?? 1;
          const cnt = verifyData.receive_scan_count ?? 0;
          const full = verifyData.receive_scanned || cnt >= q;
          if (full) {
            toast.warning('Already scanned', { description: 'This item was already received.', duration: 3000 });
            return;
          }
          if (!verifyData.dispatch_scanned) {
            toast.error('Not dispatched yet', {
              description: 'This item has not been scanned for dispatch. Wait for the supplier to dispatch before receiving.',
              duration: 5000
            });
            return;
          }
          matchingItem = {
            id: verifyData.id,
            qr_code: verifyData.qr_code,
            material_type: verifyData.material_type || '',
            category: '',
            quantity: q,
            unit: '',
            item_sequence: verifyData.item_sequence ?? 0,
            receive_scanned: full,
            receive_scan_count: cnt,
            dispatch_scanned: Boolean(verifyData.dispatch_scanned),
            status: ''
          };
          setSelectedOrder((prev) =>
            prev && !prev.items.some((i) => i.id === matchingItem!.id)
              ? { ...prev, items: [...prev.items, matchingItem!] }
              : prev
          );
        } else {
          toast.error('Wrong order', {
            description: `This QR does not belong to Order #${selectedOrder.order_number}.`,
            duration: 5000
          });
          return;
        }
      } catch (error) {
        console.error('Error verifying QR code:', error);
        toast.error('Scan failed', { description: 'Could not verify QR code.', duration: 5000 });
        return;
      }
    }
    
    if (!matchingItem) {
      toast.error('Wrong order', {
        description: `This QR does not belong to Order #${selectedOrder.order_number}.`,
        duration: 5000
      });
      return;
    }
    
    // Validate item is not already fully received
    if (isFullyReceived(matchingItem)) {
      toast.warning('Already scanned', { description: 'This item was already received.', duration: 3000 });
      return;
    }
    
    // Validate item was dispatched
    if (!matchingItem.dispatch_scanned) {
      toast.error('Not dispatched yet', {
        description: 'This item has not been scanned for dispatch. Wait for the supplier to dispatch before receiving.',
        duration: 5000
      });
      return;
    }
    
    // Use RPC function (same as DispatchScanner) - this handles all database updates automatically
    try {
      console.log('🔍 Processing QR scan for RECEIVING:', cleanQRCode);
      toast.info('Processing scan...', { duration: 2000 });
      // Helper function to get fresh access token (same as DispatchScanner)
      const getFreshAccessToken = async (): Promise<string> => {
        // First, try localStorage (fastest, no network call)
        try {
          const stored = readPersistedAuthRawStringSync();
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.access_token) {
              console.log('📦 Using token from localStorage (fast path)');
              return parsed.access_token;
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not get token from localStorage:', e);
        }
        
        // If localStorage doesn't have token, try session with timeout
        try {
          const { data: { session }, error: sessionError } = await withTimeout(
            supabase.auth.getSession(),
            2000
          );
          
          if (session?.access_token && !sessionError) {
            return session.access_token;
          } else {
            // Try refresh
            try {
              const { data: { session: newSession }, error: refreshError } = await withTimeout(
                supabase.auth.refreshSession(),
                2000
              );
              
              if (newSession?.access_token && !refreshError) {
                console.log('✅ Token refreshed successfully');
                return newSession.access_token;
              }
            } catch (refreshErr) {
              console.warn('⚠️ Token refresh timeout');
            }
          }
        } catch (e) {
          console.warn('⚠️ Error getting session (timeout expected)');
        }
        
        // Fallback to localStorage again
        const stored = getUserFromStorage();
        if (stored?.accessToken) {
          console.log('📦 Using token from localStorage (fallback)');
          return stored.accessToken;
        }
        
        // Final fallback: anon key
        console.warn('⚠️ Using anon key as final fallback');
        return SUPABASE_ANON_KEY;
      };
      
      // Get fresh access token
      let accessToken = await getFreshAccessToken();
      
      // Helper function to make RPC call with retry on 401 and timeout
      const makeRPCWithRetry = async (url: string, body: any): Promise<Response> => {
        const fetchWithTimeoutRPC = async (url: string, options: RequestInit, timeout: number = 10000): Promise<Response> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error('Request timeout - please check your connection and try again');
            }
            throw error;
          }
        };

        let response = await fetchWithTimeoutRPC(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body)
        }, 10000);
        
        // If 401, refresh token and retry once
        if (response.status === 401) {
          console.log('🔄 Got 401 for record_qr_scan, refreshing token and retrying...');
          accessToken = await getFreshAccessToken();
          
          // Retry with fresh token
          response = await fetchWithTimeoutRPC(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body)
          }, 10000);
        }
        
        return response;
      };
      
      // Call record_qr_scan RPC with _scan_type: 'receiving' (same pattern as DispatchScanner)
      const requestBody: Record<string, any> = {
        _qr_code: cleanQRCode?.trim() || null,
        _scan_type: 'receiving',
        _scanner_device_id: navigator.userAgent?.substring(0, 100) || null,
        _scanner_type: scannerType || 'web_scanner',
        _material_condition: materialCondition || 'good',
        _notes: notes?.trim() || null
      };
      
      console.log('📤 Sending RPC request for receiving scan:', {
        url: `${SUPABASE_URL}/rest/v1/rpc/record_qr_scan`,
        body: requestBody
      });
      
      const response = await makeRPCWithRetry(`${SUPABASE_URL}/rest/v1/rpc/record_qr_scan`, requestBody);

      // Read response as text first (don't assume it's JSON)
      let responseText = '';
      let data: any = null;
      
      try {
        responseText = await response.text();
        console.log('📥 Raw response text (length:', responseText.length, '):', responseText.substring(0, 500));
        
        // Try to parse as JSON
        if (responseText && responseText.trim().startsWith('{')) {
          try {
            data = JSON.parse(responseText);
            console.log('📥 Parsed response data:', data);
          } catch (jsonError) {
            console.warn('⚠️ Response looks like JSON but failed to parse:', jsonError);
            data = { rawText: responseText };
          }
        } else if (responseText && responseText.trim().startsWith('[')) {
          // Sometimes Supabase returns arrays
          try {
            data = JSON.parse(responseText);
            console.log('📥 Parsed response array:', data);
          } catch (jsonError) {
            console.warn('⚠️ Response looks like array but failed to parse:', jsonError);
            data = { rawText: responseText };
          }
        } else {
          // Not JSON - might be HTML error page or plain text
          console.warn('⚠️ Response is not JSON:', responseText.substring(0, 200));
          data = { 
            error: 'Non-JSON response from server',
            rawText: responseText.substring(0, 500),
            isHtml: responseText.trim().startsWith('<')
          };
        }
      } catch (readError) {
        console.error('❌ Failed to read response:', {
          error: readError,
          status: response.status,
          statusText: response.statusText
        });
        data = { error: 'Failed to read server response', readError: String(readError) };
      }

      // Check for HTTP errors first
      if (!response.ok) {
        console.error('❌ Receiving scan HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Handle different error statuses
        if (response.status === 400) {
          let errorMsg = 'Invalid request. Please check the QR code format.';
          if (data) {
            if (typeof data === 'string') {
              errorMsg = data;
            } else if (data.message) {
              errorMsg = data.message;
              if (data.details) errorMsg += ` (${data.details})`;
            } else if (data.error) {
              errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            } else if (data.error_code) {
              errorMsg = data.error || 'Invalid QR code';
            }
          }
          toast.error('❌ Invalid Request', {
            description: errorMsg,
            duration: 8000
          });
        } else if (response.status === 401) {
          toast.error('🔐 Authentication Error', {
            description: 'Your session may have expired. Please refresh the page.',
            duration: 6000
          });
        } else if (response.status === 403) {
          toast.error('🚫 Permission Denied', {
            description: 'You do not have permission to perform this action.',
            duration: 6000
          });
        } else {
          const errorMsg = data?.message || data?.error || 
                          (typeof data === 'string' ? data : 'Unknown error occurred');
          toast.error(`Failed to record receiving scan (${response.status})`, {
            description: errorMsg,
            duration: 6000
          });
        }
        return;
      }

      // Even if HTTP status is OK, check if the function returned an error
      const scanData = data as any;
      if (scanData && scanData.success === false) {
        console.error('❌ Receiving scan function error:', scanData);
        
        // Handle specific error codes
        const errorCode = scanData.error_code;
        let errorTitle = 'Scan Failed';
        let errorDescription = scanData.error || 'Invalid QR code';
        
        switch (errorCode) {
          case 'ALREADY_RECEIVED':
            errorTitle = '⚠️ Already Scanned';
            errorDescription = 'This QR code has already been scanned and received.';
            break;
          case 'NOT_DISPATCHED':
            errorTitle = '❌ Not Dispatched Yet';
            errorDescription = 'This item has not been scanned for dispatch. Wait for the supplier to dispatch before receiving.';
            break;
          case 'QR_INVALIDATED':
            errorTitle = '🚫 QR Code Invalidated';
            errorDescription = 'This QR code is no longer valid.';
            break;
          case 'QR_NOT_FOUND':
            errorTitle = '❓ QR Code Not Found';
            errorDescription = 'This QR code is not registered in the system.';
            break;
          default:
            errorTitle = '❌ Scan Failed';
        }
        
        toast.error(errorTitle, { description: errorDescription, duration: 6000 });
        return;
      }

      // If we get here, the scan was successful
      if (scanData && scanData.success !== false) {
        const isPartialReceive = scanData.new_status === 'partial_receive';
        // Only debounce when fully received so same QR can be scanned again for quantity > 1
        if (!isPartialReceive) {
          recentlyProcessedRef.current.set(cleanQRCode, Date.now());
        }
        
        // Update local state immediately (use response for receive_scanned and receive_scan_count)
        setSelectedOrder(prev => {
          if (!prev) return prev;
          const receiveScanned = scanData.receive_scanned === true;
          const receiveScanCount = scanData.receive_scan_count ?? (receiveScanned ? (scanData.quantity ?? 1) : 0);
          const updatedItems = prev.items.map(item =>
            item.qr_code === cleanQRCode
              ? {
                  ...item,
                  receive_scanned: receiveScanned,
                  receive_scanned_at: receiveScanned ? new Date().toISOString() : item.receive_scanned_at,
                  receive_scan_count: receiveScanCount,
                  status: receiveScanned ? 'received' : item.status
                }
              : item
          );
          const receivedCount = updatedItems.filter(i => i.receive_scanned).length;
          const remainingItems = updatedItems.reduce(
            (sum, i) => sum + (i.receive_scanned ? 0 : Math.max(0, (i.quantity || 1) - (i.receive_scan_count || 0))),
            0
          );
          return {
            ...prev,
            items: updatedItems,
            received_items: receivedCount,
            pending_items: remainingItems
          };
        });

        const scanResult: ScanResult = {
          qr_code: scanData.qr_code,
          material_type: scanData.material_type,
          category: scanData.category || '',
          quantity: scanData.quantity,
          unit: scanData.unit || '',
          status: scanData.new_status ?? scanData.status ?? 'received',
          timestamp: new Date()
        };

        setScanResults(prev => [scanResult, ...prev.slice(0, 9)]);

        // Calculate remaining items
        const qty = scanData.quantity ?? 1;
        const count = scanData.receive_scan_count ?? (scanData.receive_scanned ? qty : 0);
        const remainingForThis = scanData.receive_scanned ? 0 : Math.max(0, qty - count);
        const remainingOthers = selectedOrder.items
          .filter(i => i.qr_code !== cleanQRCode)
          .reduce((s, i) => s + (i.receive_scanned ? 0 : Math.max(0, (i.quantity || 1) - (i.receive_scan_count || 0))), 0);
        const remainingItems = remainingForThis + remainingOthers;
        
        // Show success message
        if (isPartialReceive && qty > 1) {
          toast.success('Scan recorded', {
            description: `${scanData.material_type}: Scanned ${count} of ${qty} • ${remainingItems} unit(s) remaining`,
            duration: 3000
          });
        } else {
          toast.success('Item received', {
            description: `${scanData.material_type} • ${remainingItems} item(s) remaining`,
            duration: 3000
          });
        }
        
        // Check if all items are received - RPC already updated purchase_order and delivery_requests to 'delivered'
        // But we can show a message if the order is complete
        if (scanData.order_status === 'delivered' || scanData.purchase_order_status === 'delivered') {
          toast.success('🎉 Order Delivered!', {
            description: `Order #${selectedOrder.order_number} is now delivered and moved to Delivery History.`,
            duration: 8000
          });
          onDeliveryComplete?.(true);
        }
      }
    } catch (err: any) {
      console.error('❌ Receiving scan error:', err);
      toast.error('Scan failed', { 
        description: err?.message || 'Network error. Please try again.', 
        duration: 5000 
      });
      return;
    }

    // Clear manual input
    setManualQRCode('');
    setNotes('');

    // Resume scanner if paused
    try {
      if (scannerRef.current && isScanning) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.PAUSED) await scannerRef.current.resume();
      }
    } catch (_) {}
  };

  const handleManualScan = () => {
    if (!manualQRCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    processQRScan(manualQRCode, 'physical_scanner');
  };

  // Only delivery providers and admins can access the receiving scanner
  // Builders are completely blocked - no camera access at all
  const isBuilder = userRole === 'builder';
  const allowAccess = ['admin', 'delivery_provider', 'delivery'].includes(userRole || '');
  const canScan = allowAccess;

  // BLOCK builders from accessing any camera functionality
  if (isBuilder) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="py-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Access Restricted
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-sm mx-auto">
              As a <strong>Builder</strong>, you cannot access the receiving scanner. 
              Only registered <strong>Delivery Providers</strong> can confirm deliveries.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a 
                href="/builder-dashboard" 
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Dashboard
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 1: Select delivery (mirrors Dispatch "select order")
  if (step === 'select-delivery') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-7 w-7 text-orange-600" />
              Receiving Scanner
            </h2>
            <p className="text-muted-foreground mt-1">Select a delivery to receive its materials</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loadingOrders}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingOrders ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {loadingOrders ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading deliveries...</p>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <PackageCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Deliveries Found</h3>
              <p className="text-muted-foreground">You have no active deliveries to receive. Accept a delivery request first.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.filter((o) => !o.items_loaded).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Line items not loaded ({orders.filter((o) => !o.items_loaded).length})
                </h3>
                <p className="text-sm text-muted-foreground">
                  The app could not read QR line items for these orders on the normal connection (database permissions).{' '}
                  <strong>You did not complete delivery in the system for them.</strong> After deploy, we load them through a secure server function; if this box remains, an admin must apply the latest Supabase migration or confirm rows exist in <code className="text-xs">material_items</code>.
                </p>
                {orders.filter((o) => !o.items_loaded).map((order) => (
                  <Card key={order.id} className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                    <CardContent className="py-4 flex items-center justify-between" role="status">
                      <div>
                        <p className="font-semibold">Order #{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.buyer_name}</p>
                        <p className="text-xs text-red-700 mt-1">QR lines not visible yet — not counted as delivered by you</p>
                      </div>
                      <Badge variant="outline" className="border-red-400 text-red-800">
                        Fix access
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {orders.filter((o) => o.items_loaded && o.pending_items > 0).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-amber-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Receive ({orders.filter((o) => o.items_loaded && o.pending_items > 0).length})
                </h3>
                {orders.filter((o) => o.items_loaded && o.pending_items > 0).map((order) => (
                  <Card key={order.id} className="cursor-pointer hover:border-orange-400 transition-colors" onClick={() => selectDelivery(order)}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Order #{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.buyer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.received_items} / {order.total_items} received</p>
                      </div>
                      <Badge className="bg-amber-500">{order.pending_items} to scan</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {orders.filter((o) => o.items_loaded && o.pending_items === 0 && o.items.length > 0).length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Fully Received ({orders.filter((o) => o.items_loaded && o.pending_items === 0 && o.items.length > 0).length})
                </h3>
                {orders.filter((o) => o.items_loaded && o.pending_items === 0 && o.items.length > 0).map((order) => (
                  <Card key={order.id} className="cursor-pointer hover:border-green-400 opacity-90" onClick={() => selectDelivery(order)}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Order #{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.buyer_name}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!selectedOrder) return null;

  // STEP 2: Scanning (mirrors Dispatch scanning step)
  const progressPercent = selectedOrder.total_items > 0 ? (selectedOrder.received_items / selectedOrder.total_items) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <Button variant="ghost" onClick={goBackToOrderSelection} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deliveries
        </Button>
        <div className="flex-1 text-right">
          <h2 className="text-xl font-bold">Order #{selectedOrder.order_number || '—'}</h2>
          <p className="text-sm text-muted-foreground">{selectedOrder.buyer_name}</p>
        </div>
      </div>

      <Card className={allItemsScanned ? 'border-green-400 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {allItemsScanned ? (
                <PartyPopper className="h-5 w-5 text-green-600" />
              ) : (
                <PackageCheck className="h-5 w-5 text-orange-600" />
              )}
              <span className="font-semibold text-sm">
                {allItemsScanned ? 'All items received!' : 'Receive progress'}
              </span>
            </div>
            <Badge className={allItemsScanned ? 'bg-green-600' : 'bg-orange-600'}>
              {selectedOrder.received_items} / {selectedOrder.total_items}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {!allItemsScanned && (
            <p className="text-xs text-orange-700 mt-1">
              Scan {selectedOrder.pending_items} more QR code{selectedOrder.pending_items !== 1 ? 's' : ''} as you deliver
            </p>
          )}
        </CardContent>
      </Card>

      {/* Camera Scanner — layout matches DispatchScanner (large viewport, green card, amber workflow) */}
      {!allItemsScanned && (
      <Card className="border-2 border-green-500 shadow-lg">
        <CardHeader className="bg-green-50 border-b border-green-200 py-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-600 p-2 rounded-lg">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-green-800">📷 Scan Physical QR Codes</span>
                <p className="text-xs font-normal text-green-600 mt-0.5">
                  Point camera at QR stickers on delivered materials
                </p>
              </div>
            </div>
            {availableCameras.length > 0 && (
              <Badge className="bg-green-600">
                {availableCameras.length} camera{availableCameras.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {!allowAccess && (
            <div className="p-3 rounded-md bg-yellow-50 text-yellow-700 text-sm border border-yellow-200">
              <strong>Access restricted.</strong> Sign in as a delivery provider to confirm deliveries.
            </div>
          )}

          <Alert className="bg-amber-50 border-amber-300">
            <PackageCheck className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Receiving Workflow:</strong> As you deliver each material, scan its QR code sticker. The system
              will automatically track which items have been received.
            </AlertDescription>
          </Alert>

          {isMobile && (
            <Alert className="bg-blue-50 border-blue-200">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Tip ({deviceInfo}):</strong> Hold phone steady, 6-12 inches from QR code. Ensure good lighting.
              </AlertDescription>
            </Alert>
          )}

          {cameraError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                {cameraError}
                <Button
                  variant="link"
                  className="text-red-700 p-0 h-auto ml-2"
                  onClick={() => {
                    setCameraError(null);
                    listAvailableCameras();
                  }}
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="relative bg-black rounded-xl overflow-hidden w-full min-h-[500px] max-h-[70vh]">
            <div
              id={scannerContainerId}
              className="w-full h-full"
              style={{ width: '100%', height: '100%', minHeight: 'inherit' }}
            />

            {!isScanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                <div className="text-center text-white p-6">
                  <div className="bg-green-600/20 p-6 rounded-full inline-block mb-4">
                    <Camera className="h-16 w-16 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                  <p className="text-sm opacity-70 mb-4">Tap the button below to activate your camera</p>
                  <Button
                    onClick={startCameraScanning}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                    disabled={!allowAccess}
                  >
                    <Camera className="h-6 w-6 mr-2" />
                    Start Camera Scanner
                  </Button>
                </div>
              </div>
            )}

            {isScanning && (
              <>
                <div
                  className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none p-4"
                  aria-hidden
                >
                  <div className="relative aspect-square w-[min(82vw,22rem)] max-h-[min(52vh,22rem)] shrink-0">
                    <div className="absolute left-0 top-0 h-12 w-12 rounded-tl-lg border-l-[4px] border-t-[4px] border-white drop-shadow-md" />
                    <div className="absolute right-0 top-0 h-12 w-12 rounded-tr-lg border-r-[4px] border-t-[4px] border-white drop-shadow-md" />
                    <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-lg border-b-[4px] border-l-[4px] border-white drop-shadow-md" />
                    <div className="absolute bottom-0 right-0 h-12 w-12 rounded-br-lg border-b-[4px] border-r-[4px] border-white drop-shadow-md" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 z-[5] text-center pointer-events-none">
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm text-white shadow-lg animate-pulse">
                    <Scan className="h-4 w-4" />
                    Scanning... Point at QR code
                  </span>
                </div>
              </>
            )}
          </div>

          {availableCameras.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Camera</Label>
              <Select
                value={selectedCameraId}
                onValueChange={async (value) => {
                  setSelectedCameraId(value);
                  if (isScanning) {
                    await stopScanning();
                    setTimeout(() => startCameraScanning(), 300);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose camera" />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera, index) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isScanning && (
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={() => {
                  stopScanning();
                  toast.info('Scanner stopped');
                }}
                variant="destructive"
                size="lg"
              >
                <X className="h-5 w-5 mr-2" />
                Stop Scanner
              </Button>
              {availableCameras.length > 1 && (
                <Button onClick={toggleCamera} variant="outline" size="lg">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  {isMobile ? 'Flip' : 'Switch Camera'}
                </Button>
              )}
            </div>
          )}

          {isMobile && isScanning && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">📱 Mobile scanning tips</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Hold phone 6-12 inches from the QR code</li>
                <li>Keep the code well-lit and steady</li>
              </ul>
            </div>
          )}

          {!isMobile && isScanning && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-1 text-blue-800 dark:text-blue-200">💻 Desktop / laptop tips</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
                <li>Use the green corner guides — stay about 8-15 inches from the webcam</li>
                <li>Avoid backlighting; try the physical scanner input below if needed</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Items Checklist */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50" onClick={() => setShowItemsList(!showItemsList)}>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-gray-600" />
              <span>Items</span>
              <Badge variant="outline">{selectedOrder.received_items}/{selectedOrder.total_items} received</Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-2">{showItemsList ? '▲ Hide' : '▼ Show'}</Button>
          </CardTitle>
        </CardHeader>
        {showItemsList && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {selectedOrder.items
                .sort((a, b) => a.item_sequence - b.item_sequence)
                .map((item) => {
                  const received = item.receive_scanned || (item.receive_scan_count ?? 0) >= (item.quantity ?? 1);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${received ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                    >
                      {received ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-gray-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${received ? 'text-green-700' : 'text-gray-700'}`}>
                          #{item.item_sequence} - {item.material_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit}
                          {item.quantity > 1 && (item.receive_scan_count ?? 0) > 0 && !item.receive_scanned && (
                            <> • Scanned {item.receive_scan_count} of {item.quantity}</>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Manual Entry / Physical Scanner */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Physical Scanner Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload for QR Code Images */}
            <div className="space-y-2">
              <Label htmlFor="qr-image-upload">Scan QR Code from Image</Label>
              <div className="flex gap-2">
                <Input
                  id="qr-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      toast.info('Scanning QR code from image...');
                      if (scannerRef.current) {
                        const result = await scannerRef.current.scanFile(file, true);
                        console.log('✅ QR code scanned from image:', result);
                        await processQRScan(result, 'web_scanner');
                        // Clear the file input
                        e.target.value = '';
                      } else {
                        // Create temporary scanner instance for file scanning
                        const tempScanner = new Html5Qrcode(scannerContainerId, { verbose: false });
                        try {
                          const result = await tempScanner.scanFile(file, true);
                          console.log('✅ QR code scanned from image:', result);
                          await processQRScan(result, 'web_scanner');
                          // Clear the file input
                          e.target.value = '';
                        } finally {
                          // Clean up temporary scanner
                          try {
                            await tempScanner.clear();
                          } catch (e) {
                            // Ignore cleanup errors
                          }
                        }
                      }
                    } catch (error: any) {
                      console.error('❌ Failed to scan QR code from image:', error);
                      toast.error('Failed to scan QR code', {
                        description: error.message || 'Could not read QR code from image. Please ensure the image contains a valid QR code.',
                        duration: 5000
                      });
                      // Clear the file input
                      e.target.value = '';
                    }
                  }}
                  className="cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an image file containing a QR code to scan it
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-code">QR Code (from physical scanner)</Label>
              <Input
                id="qr-code"
                value={manualQRCode}
                onChange={(e) => setManualQRCode(e.target.value)}
                placeholder="Scan or enter QR code"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Material Condition on Receipt</Label>
              <Select value={materialCondition} onValueChange={setMaterialCondition}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good Condition</SelectItem>
                  <SelectItem value="minor_damage">Minor Damage</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Receiving Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about received material"
                rows={3}
              />
            </div>

            <Button onClick={handleManualScan} className="w-full bg-green-600 hover:bg-green-700" disabled={!canScan}>
              <PackageCheck className="h-4 w-4 mr-2" />
              Confirm Delivery
            </Button>
          </CardContent>
        </Card>

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Delivered Items ({scanResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{result.material_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.quantity} {result.unit} • {result.category}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {result.qr_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500 text-white">
                      <PackageCheck className="h-3 w-3 mr-1" />
                      Delivered
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
