import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck, Scan, CheckCircle, Camera, Truck, MapPin, Lock, ArrowRight, RotateCcw, Smartphone, Flashlight, AlertCircle, ArrowLeft, RefreshCw, Clock, QrCode, CheckCircle2, Circle, PartyPopper } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
}

/** Delivery row from dashboard (useDataIsolation) - single source of truth so scanner shows same list as Deliveries tab */
export interface DeliveryRequestForScanner {
  id: string;
  purchase_order_id?: string | null;
  order_number?: string;
  status?: string;
}

interface ReceivingScannerProps {
  /** Called after successful scan. Passes true if the full order was completed (all items received). */
  onDeliveryComplete?: (orderCompleted?: boolean) => void;
  /** When provided, use this list instead of fetching delivery_requests (same data as dashboard = same orders). */
  deliveryRequestsFromDashboard?: DeliveryRequestForScanner[];
  /** Called when user taps Refresh and scanner is using dashboard list – parent should refetch and pass new list. */
  onRefreshRequested?: () => void;
}

const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

export const ReceivingScanner: React.FC<ReceivingScannerProps> = ({ onDeliveryComplete, deliveryRequestsFromDashboard, onRefreshRequested }) => {
  const [step, setStep] = useState<'select-delivery' | 'scanning'>('select-delivery');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const fetchOrdersRef = useRef<boolean>(false);

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

  useEffect(() => {
    const allowAccess = ['admin', 'delivery_provider', 'delivery'].includes(userRole || '');
    if (!allowAccess) {
      setLoadingOrders(false);
      return;
    }
    if (deliveryRequestsFromDashboard !== undefined) {
      loadFromDashboardList(deliveryRequestsFromDashboard);
    } else {
      fetchDeliveries();
    }
  }, [userRole, deliveryRequestsFromDashboard, loadFromDashboardList, fetchDeliveries]);

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
      const displayNumber = meta?.order_number || poMeta?.po_number || poMeta?.order_number || `Order ${poId.slice(0, 8)}`;
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
        items: orderItems
      };
    }
    return Object.values(orderMap)
      .filter((o) => o.id)
      .sort((a, b) => (b.pending_items > 0 ? 1 : 0) - (a.pending_items > 0 ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  /** Use dashboard list as single source of truth so scanner shows same orders as Deliveries tab. */
  const loadFromDashboardList = useCallback(async (list: DeliveryRequestForScanner[]) => {
    setLoadingOrders(true);
    const byPoId = new Map<string, { order_number?: string }>();
    list.forEach((d) => {
      const poId = d.purchase_order_id;
      if (poId && !byPoId.has(poId)) byPoId.set(poId, { order_number: d.order_number });
    });
    const poIds = Array.from(byPoId.keys());
    if (poIds.length === 0) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    try {
      const [poRes, itemsRes] = await Promise.all([
        supabase.from('purchase_orders').select('id,po_number,order_number,created_at').in('id', poIds),
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
      const ordersArray = buildOrdersFromPoIds(poIds, byPoId, poMap, itemsByPo);
      setOrders(ordersArray);
    } catch (err: any) {
      console.error('Load from dashboard list error:', err);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
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
        supabase.from('purchase_orders').select('id,po_number,order_number,created_at').in('id', poIds),
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


  const selectDelivery = (order: Order) => {
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
      
      // Delay for cleanup and container readiness (html5-qrcode needs stable DOM)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Create new scanner instance
      console.log('🎥 Creating Html5Qrcode instance for container:', scannerContainerId);
      // Set verbose to false to reduce noise from internal library errors
      scannerRef.current = new Html5Qrcode(scannerContainerId, { verbose: false });
      
      // Use facingMode for mobile, or specific camera ID if selected
      let cameraConfig: any;
      if (selectedCameraId) {
        cameraConfig = selectedCameraId;
        console.log('📷 Using selected camera ID:', selectedCameraId);
      } else {
        cameraConfig = { facingMode: facing };
        console.log('📷 Using facing mode:', facing);
      }

      // Responsive qrbox - standard size (250x250), adapts to viewport
      const baseSize = isMobile ? 200 : 250;
      const scannerFps = isMobile ? 10 : 15;
      
      const scannerConfig = {
        fps: scannerFps,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.max(150, Math.min(baseSize, Math.floor(viewfinderWidth * 0.85)));
          const h = Math.max(150, Math.min(baseSize, Math.floor(viewfinderHeight * 0.85)));
          return { width: w, height: h };
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        aspectRatio: isMobile ? 1.0 : 1.333, // 4:3 for desktop
        disableFlip: false, // Allow flipped images (mirror mode)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false // Disable - can cause camera issues on some devices
        }
      };

      console.log('🎥 Starting scanner with config:', scannerConfig);

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
    let cleanQRCode = qrCode.trim();
    if (cleanQRCode.includes('/qr/') || cleanQRCode.includes('?code=')) {
      const urlMatch = cleanQRCode.match(/(?:\/qr\/|[?&]code=)([^&\s]+)/);
      if (urlMatch) cleanQRCode = urlMatch[1];
    }
    try { cleanQRCode = decodeURIComponent(cleanQRCode); } catch (_) {}

    const isFullyReceived = (i: OrderItem) => i.receive_scanned || (i.receive_scan_count ?? 0) >= (i.quantity ?? 1);
    let matchingItem: OrderItem | undefined =
      selectedOrder.items.find((i) => (i.qr_code === cleanQRCode || i.qr_code?.trim() === cleanQRCode.trim()) && !isFullyReceived(i)) ||
      selectedOrder.items.find((i) => i.qr_code === cleanQRCode || i.qr_code?.trim() === cleanQRCode.trim());

    if (!matchingItem) {
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
          dispatch_scanned: Boolean((verifyData as any).dispatch_scanned),
          status: ''
        };
        setSelectedOrder((prev) =>
          prev && !prev.items.some((i) => i.id === matchingItem!.id)
            ? { ...prev, items: [...prev.items, matchingItem!] }
            : prev
        );
      }
    }

    if (!matchingItem) {
      toast.error('Wrong order', {
        description: `This QR does not belong to Order #${selectedOrder.order_number}.`,
        duration: 5000
      });
      return;
    }
    if (isFullyReceived(matchingItem)) {
      toast.warning('Already scanned', { description: 'This item was already received.', duration: 3000 });
      return;
    }
    if (!matchingItem.dispatch_scanned) {
      toast.error('Not dispatched yet', {
        description: 'This item has not been scanned for dispatch. Wait for the supplier to dispatch before receiving.',
        duration: 5000
      });
      return;
    }

    const qrToSend = matchingItem.qr_code;
    const itemId = matchingItem.id;
    const quantity = matchingItem.quantity ?? 1;
    const currentCount = matchingItem.receive_scan_count ?? 0;
    const newCount = currentCount + 1;
    const nowFullyReceived = newCount >= quantity;
    toast.info('Processing scan...', { duration: 2000 });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || ANON_KEY;

      const headers: Record<string, string> = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };

      const { data: { user: scanUser } } = await supabase.auth.getUser();
      const { data: scanEventRows, error: insertError } = await supabase
        .from('qr_scan_events')
        .insert({
          qr_code: qrToSend,
          scan_type: 'receiving',
          scanned_by: scanUser?.id || null,
          scanner_device_id: navigator.userAgent?.substring(0, 100) || null,
          scanner_type: scannerType || 'web_scanner',
          material_condition: materialCondition || 'good',
          notes: notes?.trim() || null
        })
        .select('id')
        .limit(1);

      if (insertError) {
        toast.error('Scan failed', { description: 'Could not record scan event.', duration: 5000 });
        return;
      }
      const scanEventId = scanEventRows?.[0]?.id ?? null;

      const patchPayload: Record<string, unknown> = {
        receive_scan_count: newCount,
        receive_scanned: nowFullyReceived,
        status: 'received',
        updated_at: new Date().toISOString()
      };
      if (scanEventId) patchPayload.receiving_scan_id = scanEventId;
      if (nowFullyReceived) patchPayload.receive_scanned_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('material_items')
        .update(patchPayload)
        .eq('id', itemId);

      if (updateError) {
        toast.error('Scan failed', { description: updateError.message || 'Could not update item.', duration: 5000 });
        return;
      }

      if (nowFullyReceived) {
        await supabase
          .from('material_items')
          .update({ is_invalidated: true, invalidated_at: new Date().toISOString(), status: 'verified' })
          .eq('id', itemId);
      }

      const orderId = selectedOrder.id;
      const { data: allItems } = await supabase
        .from('material_items')
        .select('id,quantity,receive_scanned,receive_scan_count')
        .eq('purchase_order_id', orderId);
      const allReceived = (allItems || []).every(
        (row: any) => row.receive_scanned === true || (row.receive_scan_count ?? 0) >= (row.quantity ?? 1)
      );
      if (allReceived && (allItems?.length ?? 0) > 0) {
        await supabase.from('purchase_orders').update({
          status: 'delivered',
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', orderId);
        await supabase.from('delivery_requests').update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('purchase_order_id', orderId);
      }
    } catch (err: any) {
      toast.error('Scan failed', { description: err?.message || 'Network error.', duration: 5000 });
      return;
    }

    const isPartialReceive = !nowFullyReceived && quantity > 1;
    if (!isPartialReceive) recentlyProcessedRef.current.set(qrToSend, Date.now());

    setSelectedOrder((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((item) =>
        item.id === itemId
          ? { ...item, receive_scanned: nowFullyReceived, receive_scan_count: newCount, status: nowFullyReceived ? 'received' : item.status }
          : item
      );
      const receivedItems = updatedItems.reduce(
        (sum, i) => sum + (i.receive_scanned ? (i.quantity ?? 1) : Math.min(i.receive_scan_count ?? 0, i.quantity ?? 1)),
        0
      );
      const pendingItems = Math.max(0, prev.total_items - receivedItems);
      return { ...prev, items: updatedItems, received_items: receivedItems, pending_items: pendingItems };
    });

    setScanResults((prev) => [
      {
        qr_code: qrToSend,
        material_type: matchingItem!.material_type,
        category: matchingItem!.category || '',
        quantity,
        unit: matchingItem!.unit || '',
        status: nowFullyReceived ? 'received' : 'partial_receive',
        timestamp: new Date()
      },
      ...prev.slice(0, 9)
    ]);

    const remaining = Math.max(0, selectedOrder.pending_items - 1);
    if (isPartialReceive && quantity > 1) {
      toast.success('Scan recorded', {
        description: `${matchingItem!.material_type}: Scanned ${newCount} of ${quantity} • ${remaining} unit(s) remaining`,
        duration: 3000
      });
    } else {
      toast.success('Item received', {
        description: `${matchingItem!.material_type} • ${remaining} item(s) remaining`,
        duration: 3000
      });
    }

    setManualQRCode('');
    setNotes('');

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
            {orders.filter((o) => o.pending_items > 0).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-amber-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Receive ({orders.filter((o) => o.pending_items > 0).length})
                </h3>
                {orders.filter((o) => o.pending_items > 0).map((order) => (
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
            {orders.filter((o) => o.pending_items === 0).length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Fully Received ({orders.filter((o) => o.pending_items === 0).length})
                </h3>
                {orders.filter((o) => o.pending_items === 0).map((order) => (
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

      {isMobile && (
        <Alert className="bg-green-50 border-green-200">
          <Smartphone className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>Mobile Device Detected:</strong> {deviceInfo}. Hold your phone steady and ensure good lighting.
          </AlertDescription>
        </Alert>
      )}

      {/* Camera Scanner - only when items remain */}
      {!allItemsScanned && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Delivery Confirmation Scanner
            </div>
            {availableCameras.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {availableCameras.length} camera{availableCameras.length > 1 ? 's' : ''} available
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!allowAccess && (
            <div className="p-3 rounded-md bg-yellow-50 text-yellow-700 text-sm">
              <strong>Access restricted.</strong> Sign in as a delivery provider to confirm deliveries.
            </div>
          )}

          {/* Camera Error Display */}
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
          
          {/* Camera View - responsive standard size (280-400px, works on all devices) */}
          <div 
            className="relative bg-black rounded-lg overflow-hidden mx-auto w-full"
            style={{ 
              maxWidth: '400px', 
              minHeight: isMobile ? '220px' : '260px',
              aspectRatio: '4/3'
            }}
          >
            {/* Scanner container - html5-qrcode renders video + viewfinder here */}
            <div 
              id={scannerContainerId} 
              className="w-full h-full min-h-[220px]"
              style={{ minHeight: isMobile ? '220px' : '260px' }}
            />
            
            {/* White scan frame - visible border for positioning QR code */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                  className="relative border-2 border-white rounded-lg bg-black/30"
                  style={{ 
                    width: 'min(85%, 260px)', 
                    height: 'min(75%, 260px)',
                    minWidth: '160px',
                    minHeight: '160px',
                    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5), 0 0 0 9999px rgba(0,0,0,0.4)'
                  }}
                >
                  {/* Corner brackets - green accent */}
                  <div className="absolute top-0 left-0 border-t-2 border-l-2 border-green-400 rounded-tl" style={{ width: '25%', height: '25%' }}></div>
                  <div className="absolute top-0 right-0 border-t-2 border-r-2 border-green-400 rounded-tr" style={{ width: '25%', height: '25%' }}></div>
                  <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-green-400 rounded-bl" style={{ width: '25%', height: '25%' }}></div>
                  <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-green-400 rounded-br" style={{ width: '25%', height: '25%' }}></div>
                  
                  {/* Scanning line animation */}
                  <div 
                    className="absolute left-[10%] right-[10%] h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent rounded-full"
                    style={{
                      animation: 'scanLine 2s ease-in-out infinite',
                      top: '50%',
                      boxShadow: '0 0 10px rgba(74, 222, 128, 0.8)'
                    }}
                  ></div>
                  <style>{`
                    @keyframes scanLine {
                      0%, 100% { top: 15%; opacity: 0.6; }
                      50% { top: 85%; opacity: 1; }
                    }
                  `}</style>
                  
                  {/* Center target - small dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-400/30 border border-green-400/50"></div>
                  
                  {/* Frame border glow effect */}
                  <div 
                    className="absolute inset-0 rounded-lg"
                    style={{
                      boxShadow: 'inset 0 0 30px rgba(74, 222, 128, 0.15), 0 0 20px rgba(0, 0, 0, 0.5)'
                    }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Not scanning overlay */}
            {!isScanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center text-white">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-70">Camera not active</p>
                  <p className="text-xs opacity-50">Click "Start Scanner" to begin</p>
                </div>
              </div>
            )}
            
            {/* Scanning indicator */}
            {isScanning && (
              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full animate-pulse shadow-lg">
                  🔍 Scanning for QR codes...
                </span>
              </div>
            )}
            
            {/* Scanning tip banner */}
            {isScanning && (
              <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-black/70 text-white text-xs sm:text-sm px-3 py-1.5 rounded-full shadow-lg">
                  📷 Position QR code within the green frame
                </span>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex flex-wrap gap-2">
            {!isScanning ? (
              <Button onClick={startCameraScanning} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Start Scanner
              </Button>
            ) : (
              <Button onClick={() => { stopScanning(); toast.info('Scanner stopped'); }} variant="destructive" className="flex-1 sm:flex-none" size="lg">
                <RotateCcw className="h-5 w-5 mr-2" />
                Stop Scanner
              </Button>
            )}
            
            {availableCameras.length > 1 && (
              <Button 
                onClick={toggleCamera} 
                variant="outline" 
                size="lg"
                title="Switch between cameras"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                {isMobile ? 'Flip' : 'Switch Camera'}
              </Button>
            )}
          </div>

          {/* Camera Selection */}
          {availableCameras.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Camera</Label>
              <Select value={selectedCameraId} onValueChange={async (value) => {
                setSelectedCameraId(value);
                if (isScanning) {
                  await stopScanning();
                  setTimeout(() => startCameraScanning(), 300);
                }
              }}>
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

          {/* Mobile Tips */}
          {isMobile && isScanning && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">📱 Mobile Scanning Tips:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Hold phone 6-12 inches from QR code</li>
                <li>Ensure QR code is well-lit</li>
                <li>Keep phone steady while scanning</li>
                <li>Use flash in low light conditions</li>
              </ul>
            </div>
          )}

          {/* Desktop/Laptop Tips */}
          {!isMobile && isScanning && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-1 text-blue-800 dark:text-blue-200">💻 Laptop/Desktop Scanning Tips:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
                <li>Position QR code within the <strong>green frame</strong></li>
                <li>Hold the QR code <strong>8-15 inches</strong> from the webcam</li>
                <li>Ensure good lighting - avoid backlighting</li>
                <li>Keep the QR code <strong>flat and steady</strong></li>
                <li>If not detecting, try <strong>moving closer or further</strong></li>
                <li>You can also use "Physical Scanner Input" below for USB scanners</li>
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
