import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, Scan, CheckCircle, AlertCircle, Camera, Lock, ArrowRight, RotateCcw, 
  Smartphone, Package, User, Clock, ArrowLeft, PartyPopper, QrCode, X, 
  CheckCircle2, Circle, RefreshCw, Mail, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderItem {
  id: string;
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  item_sequence: number;
  dispatch_scanned: boolean;
  dispatch_scanned_at?: string;
  status: string;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_items: number;
  dispatched_items: number;
  pending_items: number;
  created_at: string;
  items: OrderItem[];
}

interface ScanResult {
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const DispatchScanner: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE - Order Selection
  // ─────────────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'select-order' | 'scanning'>('select-order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE - Scanner
  // ─────────────────────────────────────────────────────────────────────────────
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'dispatch-qr-scanner';
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualQRCode, setManualQRCode] = useState('');
  const [materialCondition, setMaterialCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const CAMERA_CONSENT_KEY = 'scanner_camera_consent';

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE - Completion
  // ─────────────────────────────────────────────────────────────────────────────
  const [allItemsScanned, setAllItemsScanned] = useState(false);

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAuth();
    detectDeviceInfo();
    listAvailableCameras();
    
    // Safety timeout - stop loading after 15 seconds
    const safetyTimeout = setTimeout(() => {
      if (loadingOrders) {
        console.log('⏱️ Dispatch Scanner safety timeout - forcing loading false');
        setLoadingOrders(false);
      }
    }, 15000);
    
    return () => {
      stopScanning();
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (supplierId) {
      fetchOrders();
    }
  }, [supplierId]);

  // Check if all items are scanned when selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      const allScanned = selectedOrder.items.every(item => item.dispatch_scanned);
      if (allScanned && selectedOrder.items.length > 0 && !allItemsScanned) {
        setAllItemsScanned(true);
        toast.success('🎉 All items dispatched!', {
          description: `Order #${selectedOrder.order_number} is ready for delivery!`,
          duration: 8000
        });
      }
    }
  }, [selectedOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH & DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  };

  // Helper to get user from localStorage
  const getUserFromStorage = (): { id: string; accessToken: string } | null => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
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

  const checkAuth = async () => {
    console.log('🔐 Dispatch Scanner: Starting auth check...');
    
    try {
      const localRole = localStorage.getItem('user_role');
      if (localRole) {
        setUserRole(localRole);
        console.log('📋 Role from localStorage:', localRole);
      }
      
      // Try to get user with timeout
      let userId: string | null = null;
      try {
        const { data: { user } } = await withTimeout(supabase.auth.getUser(), 3000);
        userId = user?.id || null;
        console.log('✅ Got user from auth:', userId);
      } catch {
        console.log('⚠️ Auth timeout, trying localStorage...');
        const stored = getUserFromStorage();
        if (stored) {
          userId = stored.id;
          console.log('📦 Got user from localStorage:', userId);
        }
      }
      
      if (!userId) {
        console.log('❌ No user found');
        setLoadingOrders(false);
        return;
      }

      // Get role with timeout
      let role = localRole;
      if (!role) {
        try {
          const { data: roleData } = await withTimeout(
            supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
            3000
          );
          role = roleData?.role || null;
          console.log('🔑 Role from database:', role);
        } catch {
          console.log('⚠️ Role lookup timeout');
        }
      }

      setUserRole(role || null);

      // Get supplier ID if user is supplier
      if (role === 'supplier') {
        let foundSupplierId: string | null = null;
        
        // Try profile chain with timeout
        try {
          const { data: profileData } = await withTimeout(
            supabase.from('profiles').select('id').eq('user_id', userId).maybeSingle(),
            3000
          );
          console.log('📋 Profile lookup:', profileData);

          if (profileData) {
            const { data: supplierData } = await withTimeout(
              supabase.from('suppliers').select('id').eq('user_id', profileData.id).maybeSingle(),
              3000
            );
            console.log('📦 Supplier by profile.id:', supplierData);
            if (supplierData) {
              foundSupplierId = supplierData.id;
            }
          }
        } catch {
          console.log('⚠️ Profile/supplier lookup timeout');
        }

        // Fallback: Try direct user_id match
        if (!foundSupplierId) {
          try {
            const { data: supplierByUserId } = await withTimeout(
              supabase.from('suppliers').select('id').eq('user_id', userId).maybeSingle(),
              3000
            );
            console.log('📦 Supplier by auth.uid:', supplierByUserId);
            if (supplierByUserId) {
              foundSupplierId = supplierByUserId.id;
            }
          } catch {
            console.log('⚠️ Direct supplier lookup timeout');
          }
        }

        // Final fallback: Use userId as supplier ID
        if (!foundSupplierId) {
          console.log('📦 Using userId as supplier ID fallback:', userId);
          foundSupplierId = userId;
        }

        console.log('✅ Final supplier ID:', foundSupplierId);
        setSupplierId(foundSupplierId);
      } else {
        console.log('⚠️ User is not a supplier, role:', role);
        setLoadingOrders(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      const localRole = localStorage.getItem('user_role');
      setUserRole(localRole || null);
      setLoadingOrders(false);
    }
  };

  const fetchOrders = async () => {
    if (!supplierId) {
      console.log('❌ No supplierId, cannot fetch orders');
      setLoadingOrders(false);
      return;
    }
    
    console.log('📦 Fetching orders for supplier:', supplierId);
    setLoadingOrders(true);
    
    try {
      // Use native fetch with timeout to avoid Supabase client hanging
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token
      let accessToken = ANON_KEY;
      const stored = getUserFromStorage();
      if (stored?.accessToken) {
        accessToken = stored.accessToken;
      }
      
      const headers: Record<string, string> = {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch material items with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/material_items?supplier_id=eq.${supplierId}&order=created_at.desc`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch material items:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const itemsData = await response.json();
      console.log('✅ Material items fetched:', itemsData?.length || 0);

      // Group items by purchase_order_id
      const orderMap: Record<string, Order> = {};
      
      (itemsData || []).forEach((item: any) => {
        const orderId = item.purchase_order_id || 'unknown';
        
        if (!orderMap[orderId]) {
          orderMap[orderId] = {
            id: orderId,
            order_number: orderId.slice(0, 8).toUpperCase(),
            buyer_id: item.buyer_id || 'unknown',
            buyer_name: item.buyer_name || 'Unknown Client',
            buyer_email: item.buyer_email || '',
            buyer_phone: item.buyer_phone || '',
            total_items: 0,
            dispatched_items: 0,
            pending_items: 0,
            created_at: item.created_at || '',
            items: []
          };
        }

        const orderItem: OrderItem = {
          id: item.id,
          qr_code: item.qr_code,
          material_type: item.material_type,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          item_sequence: item.item_sequence,
          dispatch_scanned: item.dispatch_scanned || false,
          dispatch_scanned_at: item.dispatch_scanned_at,
          status: item.status
        };

        orderMap[orderId].items.push(orderItem);
        orderMap[orderId].total_items++;
        
        if (item.dispatch_scanned) {
          orderMap[orderId].dispatched_items++;
        } else {
          orderMap[orderId].pending_items++;
        }
      });

      // Convert to array and sort by pending items (orders with pending items first)
      const ordersArray = Object.values(orderMap)
        .sort((a, b) => {
          // First, prioritize orders with pending items
          if (a.pending_items > 0 && b.pending_items === 0) return -1;
          if (a.pending_items === 0 && b.pending_items > 0) return 1;
          // Then sort by date
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      setOrders(ordersArray);
      console.log('📦 Fetched orders:', ordersArray.length);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CAMERA FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────
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
      console.log('📷 Available cameras:', devices);
      
      if (devices && devices.length > 0) {
        const cameraList = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
        setAvailableCameras(cameraList);
        
        // Prefer back camera on mobile devices
        const backCamera = cameraList.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
          setSelectedCameraId(backCamera.id);
        } else {
          setSelectedCameraId(isMobile && cameraList.length > 1 ? cameraList[cameraList.length - 1].id : cameraList[0].id);
        }
      }
    } catch (error) {
      console.error('Error listing cameras:', error);
    }
  };

  const startCameraScanning = async () => {
    setCameraError(null);

    try {
      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        setCameraError('Camera requires HTTPS connection. Please use a secure URL.');
        toast.error('Camera requires HTTPS or localhost');
        return;
      }

      await stopScanning();
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🎥 Creating Html5Qrcode instance for container:', scannerContainerId);
      scannerRef.current = new Html5Qrcode(scannerContainerId, { verbose: true });
      
      let cameraConfig: any;
      if (selectedCameraId) {
        cameraConfig = selectedCameraId;
      } else {
        cameraConfig = { facingMode: facing };
      }

      const scannerConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      };

      await scannerRef.current.start(
        cameraConfig,
        scannerConfig,
        (decodedText, decodedResult) => {
          const now = Date.now();
          
          if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
            return;
          }
          
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          
          // Vibrate on successful scan (mobile)
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
          
          // Play a beep sound
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
          } catch (e) {}
          
          processQRScan(decodedText, 'mobile_camera');
        },
        (errorMessage) => {
          if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
            console.log('📷 Scanner message:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      localStorage.setItem(CAMERA_CONSENT_KEY, 'true');
      toast.success('📷 Camera ready! Point at QR code to scan.');

    } catch (error: any) {
      console.error('❌ Camera error:', error);
      setIsScanning(false);
      
      if (error.message?.includes('Permission') || error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.message?.includes('not found') || error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (error.message?.includes('in use') || error.name === 'NotReadableError') {
        setCameraError('Camera is in use by another application.');
      } else {
        setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // QR SCAN PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────
  const processQRScan = async (qrCode: string, scannerType: 'mobile_camera' | 'physical_scanner' | 'web_scanner') => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATE: Check if this QR code belongs to the selected order
    // ═══════════════════════════════════════════════════════════════════════════
    const matchingItem = selectedOrder.items.find(item => item.qr_code === qrCode);
    
    if (!matchingItem) {
      // Play error sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 300; // Lower frequency for error
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 300);
      } catch (e) {}

      toast.error('❌ Wrong Order!', {
        description: `This QR code does not belong to Order #${selectedOrder.order_number}. Please scan items from the correct order.`,
        duration: 5000
      });
      return;
    }

    // Check if already scanned
    if (matchingItem.dispatch_scanned) {
      toast.warning('⚠️ Already Scanned', {
        description: `${matchingItem.material_type} (Item #${matchingItem.item_sequence}) has already been dispatched.`,
        duration: 4000
      });
      return;
    }

    try {
      console.log('🔍 Processing QR scan for DISPATCH:', qrCode);
      toast.info('Processing scan...', { duration: 2000 });
      
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = ANON_KEY;
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || ANON_KEY;
        }
      } catch (e) {}
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_qr_scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          _qr_code: qrCode,
          _scan_type: 'dispatch',
          _scanner_device_id: navigator.userAgent.substring(0, 100),
          _scanner_type: scannerType,
          _material_condition: materialCondition,
          _notes: notes || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Dispatch scan error:', data);
        toast.error(`Failed to record dispatch scan: ${data.message || data.error || 'Unknown error'}`);
        return;
      }

      const scanData = data as any;

      if (scanData.success) {
        // Update local state immediately
        setSelectedOrder(prev => {
          if (!prev) return prev;
          
          const updatedItems = prev.items.map(item => 
            item.qr_code === qrCode 
              ? { ...item, dispatch_scanned: true, dispatch_scanned_at: new Date().toISOString(), status: 'dispatched' }
              : item
          );
          
          const dispatchedCount = updatedItems.filter(i => i.dispatch_scanned).length;
          
          return {
            ...prev,
            items: updatedItems,
            dispatched_items: dispatchedCount,
            pending_items: prev.total_items - dispatchedCount
          };
        });

        const scanResult: ScanResult = {
          qr_code: scanData.qr_code,
          material_type: scanData.material_type,
          category: scanData.category,
          quantity: scanData.quantity,
          unit: scanData.unit,
          status: scanData.new_status,
          timestamp: new Date()
        };

        setScanResults(prev => [scanResult, ...prev.slice(0, 9)]);
        
        // Calculate remaining items
        const remainingItems = selectedOrder.items.filter(i => !i.dispatch_scanned && i.qr_code !== qrCode).length;
        
        if (remainingItems === 0) {
          // All items scanned!
          toast.success('🎉 ALL ITEMS DISPATCHED!', {
            description: `Order #${selectedOrder.order_number} is complete and ready for delivery!`,
            duration: 8000
          });
        } else {
          toast.success('✅ Item Dispatched', {
            description: `${scanData.material_type} (Item #${matchingItem.item_sequence}) • ${remainingItems} item${remainingItems > 1 ? 's' : ''} remaining`,
            duration: 3000
          });
        }

        setManualQRCode('');
        setNotes('');
      } else {
        const errorCode = scanData.error_code;
        let errorTitle = 'Scan Failed';
        let errorDescription = scanData.error || 'Invalid QR code';
        
        switch (errorCode) {
          case 'ALREADY_DISPATCHED':
            errorTitle = '⚠️ Already Scanned';
            errorDescription = 'This QR code has already been scanned and dispatched.';
            break;
          case 'QR_INVALIDATED':
            errorTitle = '🚫 QR Code Invalidated';
            errorDescription = 'This QR code is no longer valid.';
            break;
          case 'QR_NOT_FOUND':
            errorTitle = '❓ QR Code Not Found';
            errorDescription = 'This QR code is not registered in the system.';
            break;
        }
        
        toast.error(errorTitle, { description: errorDescription, duration: 5000 });
      }
    } catch (error) {
      console.error('Scan processing error:', error);
      toast.error('Failed to process scan');
    }
  };

  const handleManualScan = () => {
    if (!manualQRCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    processQRScan(manualQRCode, 'physical_scanner');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ORDER SELECTION
  // ─────────────────────────────────────────────────────────────────────────────
  const selectOrder = (order: Order) => {
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
    setStep('select-order');
    fetchOrders(); // Refresh orders
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ACCESS CONTROL
  // ─────────────────────────────────────────────────────────────────────────────
  const isBuilder = userRole === 'builder';
  const allowAccess = ['supplier', 'admin'].includes(userRole || '');

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
              As a <strong>Builder</strong>, you cannot access the dispatch scanner. 
              Only registered <strong>Suppliers</strong> can dispatch materials.
            </p>
            <a 
              href="/builder-dashboard" 
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Dashboard
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: ORDER SELECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  if (step === 'select-order') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-7 w-7 text-blue-600" />
              Dispatch Scanner
            </h2>
            <p className="text-muted-foreground mt-1">
              Select an order to dispatch its materials
            </p>
          </div>
          <Button variant="outline" onClick={fetchOrders} disabled={loadingOrders}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingOrders ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Orders List */}
        {loadingOrders ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading orders...</p>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                You don't have any orders with materials to dispatch yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Pending Orders Section */}
            {orders.filter(o => o.pending_items > 0).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-amber-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Dispatch ({orders.filter(o => o.pending_items > 0).length} orders)
                </h3>
                {orders.filter(o => o.pending_items > 0).map(order => (
                  <OrderCard key={order.id} order={order} onSelect={selectOrder} />
                ))}
              </div>
            )}

            {/* Completed Orders Section */}
            {orders.filter(o => o.pending_items === 0).length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Fully Dispatched ({orders.filter(o => o.pending_items === 0).length} orders)
                </h3>
                {orders.filter(o => o.pending_items === 0).map(order => (
                  <OrderCard key={order.id} order={order} onSelect={selectOrder} isComplete />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: SCANNING
  // ═══════════════════════════════════════════════════════════════════════════════
  if (!selectedOrder) return null;

  const progressPercent = (selectedOrder.dispatched_items / selectedOrder.total_items) * 100;

  return (
    <div className="space-y-6">
      {/* Back Button & Order Info Header */}
      <div className="flex items-start justify-between gap-4">
        <Button variant="ghost" onClick={goBackToOrderSelection} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        
        <div className="flex-1 text-right">
          <h2 className="text-xl font-bold">Order #{selectedOrder.order_number}</h2>
          <p className="text-sm text-muted-foreground">{selectedOrder.buyer_name}</p>
        </div>
      </div>

      {/* Progress Card */}
      <Card className={allItemsScanned ? 'border-green-400 bg-green-50' : 'border-amber-200'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {allItemsScanned ? (
                <PartyPopper className="h-6 w-6 text-green-600" />
              ) : (
                <Package className="h-6 w-6 text-amber-600" />
              )}
              <span className="font-semibold">
                {allItemsScanned ? 'All Items Dispatched!' : 'Dispatch Progress'}
              </span>
            </div>
            <Badge className={allItemsScanned ? 'bg-green-600' : 'bg-amber-600'}>
              {selectedOrder.dispatched_items} / {selectedOrder.total_items} items
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-3" />
          {!allItemsScanned && (
            <p className="text-sm text-muted-foreground mt-2">
              {selectedOrder.pending_items} item{selectedOrder.pending_items !== 1 ? 's' : ''} remaining to scan
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Items to Dispatch
          </CardTitle>
          <CardDescription>
            Scan QR codes for items marked with ○
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedOrder.items
              .sort((a, b) => a.item_sequence - b.item_sequence)
              .map(item => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    item.dispatch_scanned 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200 hover:border-amber-300'
                  }`}
                >
                  {item.dispatch_scanned ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${item.dispatch_scanned ? 'text-green-700' : ''}`}>
                      #{item.item_sequence} - {item.material_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit} • {item.category}
                    </p>
                  </div>
                  {item.dispatch_scanned && (
                    <Badge variant="outline" className="text-green-600 border-green-300 text-xs shrink-0">
                      ✓
                    </Badge>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Scanner Section - Only show if not all items scanned */}
      {!allItemsScanned && (
        <>
          {/* Mobile Device Banner */}
          {isMobile && (
            <Alert className="bg-blue-50 border-blue-200">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Mobile Device:</strong> {deviceInfo}. Hold steady and ensure good lighting.
              </AlertDescription>
            </Alert>
          )}

          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan QR Codes
                </div>
                {availableCameras.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {availableCameras.length} camera{availableCameras.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Error */}
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
              
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px]">
                <div 
                  id={scannerContainerId} 
                  className="w-full"
                  style={{ minHeight: '300px' }}
                />
                
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-70">Camera not active</p>
                      <p className="text-xs opacity-50">Tap "Start Scanner" to begin</p>
                    </div>
                  </div>
                )}
                
                {isScanning && (
                  <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full animate-pulse">
                      🔍 Scanning for QR codes...
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex flex-wrap gap-2">
                {!isScanning ? (
                  <Button onClick={startCameraScanning} className="flex-1 sm:flex-none" size="lg">
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
                  <Button onClick={toggleCamera} variant="outline" size="lg">
                    <RotateCcw className="h-5 w-5 mr-2" />
                    {isMobile ? 'Flip' : 'Switch Camera'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Manual / Physical Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-code">QR Code</Label>
                <Input
                  id="qr-code"
                  value={manualQRCode}
                  onChange={(e) => setManualQRCode(e.target.value)}
                  placeholder="Scan or enter QR code"
                  className="font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={materialCondition} onValueChange={setMaterialCondition}>
                    <SelectTrigger id="condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="minor_damage">Minor Damage</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <Button onClick={handleManualScan} className="w-full" disabled={!allowAccess}>
                <Scan className="h-4 w-4 mr-2" />
                Record Dispatch Scan
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Completion Card */}
      {allItemsScanned && (
        <Card className="border-green-400 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="py-8 text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">
              Order Complete! 🎉
            </h3>
            <p className="text-green-700 mb-4">
              All {selectedOrder.total_items} items have been dispatched for Order #{selectedOrder.order_number}
            </p>
            <p className="text-sm text-green-600 mb-6">
              Client: {selectedOrder.buyer_name}
              {selectedOrder.buyer_email && ` • ${selectedOrder.buyer_email}`}
            </p>
            <Button onClick={goBackToOrderSelection} size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dispatch Another Order
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recently Dispatched ({scanResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">{result.material_type}</p>
                    <p className="text-sm text-green-600">
                      {result.quantity} {result.unit} • {result.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-600 text-white">
                      <Truck className="h-3 w-3 mr-1" />
                      Dispatched
                    </Badge>
                    <p className="text-xs text-green-600 mt-1">
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

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const OrderCard: React.FC<{
  order: Order;
  onSelect: (order: Order) => void;
  isComplete?: boolean;
}> = ({ order, onSelect, isComplete }) => {
  const orderDate = order.created_at ? new Date(order.created_at) : null;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isComplete 
          ? 'border-green-200 bg-green-50/50 hover:border-green-300' 
          : 'border-amber-200 hover:border-amber-400'
      }`}
      onClick={() => onSelect(order)}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isComplete ? 'bg-green-100' : 'bg-amber-100'
            }`}>
              {isComplete ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Package className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div>
              <p className="font-bold text-lg">Order #{order.order_number}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{order.buyer_name}</span>
                {orderDate && (
                  <>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">
                {order.dispatched_items}/{order.total_items} dispatched
              </p>
              <Progress 
                value={(order.dispatched_items / order.total_items) * 100} 
                className="h-2 w-24 mt-1"
              />
            </div>
            <Badge className={isComplete ? 'bg-green-600' : 'bg-amber-600'}>
              {isComplete ? 'Complete' : `${order.pending_items} pending`}
            </Badge>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
