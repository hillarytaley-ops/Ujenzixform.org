import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, Scan, CheckCircle, AlertCircle, Camera, Lock, ArrowRight, RotateCcw, 
  Smartphone, Package, User, Clock, ArrowLeft, PartyPopper, QrCode, X, 
  CheckCircle2, Circle, RefreshCw
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
  delivery_provider_id?: string | null;
  delivery_provider_name?: string | null;
  delivery_required?: boolean;
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
  const fetchOrdersRef = useRef<boolean>(false); // Prevent multiple simultaneous calls

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
  const [showItemsList, setShowItemsList] = useState(false);

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
    
    // Note: fetchOrders has its own timeout (20s) and will set loadingOrders(false) in finally block
    // No need for safety timeout since fetchOrders handles its own completion
    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (supplierId) {
      fetchOrders();
    }
  }, [supplierId]);

  // Debug: Log when orders state changes
  useEffect(() => {
    console.log('📦 Orders state updated:', {
      count: orders.length,
      loading: loadingOrders,
      pending: orders.filter(o => o.pending_items > 0).length,
      completed: orders.filter(o => o.pending_items === 0).length,
      sampleOrderIds: orders.slice(0, 3).map(o => o.id?.slice(0, 8))
    });
  }, [orders, loadingOrders]);

  // Check if all items are scanned when selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      const allScanned = selectedOrder.items.every(item => item.dispatch_scanned);
      if (allScanned && selectedOrder.items.length > 0 && !allItemsScanned) {
        setAllItemsScanned(true);
        toast.success('🎉 All items dispatched!', {
          description: `Order #${selectedOrder.order_number} is now shipped and ready for delivery!`,
          duration: 8000
        });
        
        // Ensure the order status is updated to 'shipped' in the database
        const updateOrderToShipped = async () => {
          try {
            const { error } = await supabase
              .from('purchase_orders')
              .update({ 
                status: 'shipped',
                updated_at: new Date().toISOString()
              })
              .eq('id', selectedOrder.id)
              .in('status', ['pending', 'confirmed', 'processing']);
            
            if (error) {
              console.error('Error updating order status to shipped:', error);
            } else {
              console.log(`✅ Order #${selectedOrder.order_number} status updated to 'shipped'`);
              toast.info('📦 Order moved to Shipped', {
                description: 'The order is now visible in the Shipped tab',
                duration: 5000
              });
            }
          } catch (err) {
            console.error('Failed to update order status:', err);
          }
        };
        
        updateOrderToShipped();
      }
    }
  }, [selectedOrder, allItemsScanned]);

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
        
        // Use REST API with proper token handling (same approach as SupplierDashboard)
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        // Helper function to get fresh access token with refresh
        // Try localStorage FIRST to avoid auth.getSession() timeout
        const getFreshAccessToken = async (): Promise<string> => {
          // First, try localStorage (fastest, no network call)
          try {
            const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
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
              // Check if token is expired (with 5 minute buffer)
              const tokenExp = session.expires_at ? new Date(session.expires_at * 1000) : null;
              const now = new Date();
              const buffer = 5 * 60 * 1000; // 5 minutes
              
              if (tokenExp && tokenExp.getTime() > now.getTime() + buffer) {
                // Token is still valid
                return session.access_token;
              } else {
                // Token is expired or expiring soon, refresh it
                console.log('🔄 Token expired or expiring soon, refreshing...');
                try {
                  const { data: { session: newSession }, error: refreshError } = await withTimeout(
                    supabase.auth.refreshSession(),
                    2000
                  );
                  
                  if (newSession?.access_token && !refreshError) {
                    console.log('✅ Token refreshed successfully');
                    return newSession.access_token;
                  } else {
                    console.warn('⚠️ Token refresh failed, using localStorage...', refreshError);
                  }
                } catch (refreshErr) {
                  console.warn('⚠️ Token refresh timeout, using localStorage...');
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ Error getting session (timeout expected), using localStorage...');
          }
          
          // Fallback to localStorage again (in case session had token but we couldn't check expiry)
          try {
            const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.access_token) {
                console.log('📦 Using token from localStorage (fallback)');
                return parsed.access_token;
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not get token from localStorage:', e);
          }
          
          // Final fallback: anon key
          console.warn('⚠️ Using anon key as final fallback');
          return SUPABASE_ANON_KEY;
        };
        
        // Get fresh access token (with timeout protection)
        console.log('🔑 Getting access token for supplier lookup...');
        let accessToken = await getFreshAccessToken();
        console.log('✅ Got access token');
        
        // Helper function to make supplier lookup request with retry on 401
        const lookupSupplierWithRetry = async (url: string, methodName: string): Promise<any[]> => {
          const headers: Record<string, string> = {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          };
          
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            let response = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
            clearTimeout(timeout);
            
            // If 401, refresh token and retry once
            if (response.status === 401) {
              console.log(`🔄 Got 401 for ${methodName}, refreshing token and retrying...`);
              accessToken = await getFreshAccessToken();
              
              // Retry with fresh token
              const retryController = new AbortController();
              const retryTimeout = setTimeout(() => retryController.abort(), 5000);
              
              headers['Authorization'] = `Bearer ${accessToken}`;
              response = await fetch(url, { headers, signal: retryController.signal, cache: 'no-store' });
              clearTimeout(retryTimeout);
            }
            
            if (response.ok) {
              return await response.json();
            } else {
              const errorText = await response.text();
              console.warn(`⚠️ ${methodName} failed: ${response.status}`, errorText);
              return [];
            }
          } catch (e) {
            console.log(`⚠️ ${methodName} error:`, e);
            return [];
          }
        };
        
        // Get user email from localStorage first (faster than auth.getUser())
        console.log('📧 Getting user email for supplier lookup...');
        let userEmail: string | null = null;
        try {
          const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (stored) {
            const parsed = JSON.parse(stored);
            userEmail = parsed.user?.email || null;
            if (userEmail) {
              console.log('📧 Got email from localStorage:', userEmail);
            }
          }
        } catch (e) {
          console.log('⚠️ Could not get email from localStorage');
        }
        
        // If email not in localStorage, try auth.getUser() with timeout
        if (!userEmail) {
          try {
            const { data: { user } } = await withTimeout(supabase.auth.getUser(), 2000);
            userEmail = user?.email || null;
            if (userEmail) {
              console.log('📧 Got email from auth.getUser():', userEmail);
            }
          } catch (e) {
            console.log('⚠️ Could not get email from auth.getUser() (timeout expected)');
          }
        }
        
        // Wrap supplier lookup in try-catch with timeout to ensure it completes
        try {
          // Method 1: Try by email FIRST (this is what works in SupplierDashboard)
          if (userEmail) {
            console.log('📧 Trying supplier lookup by email first:', userEmail);
            const emailData = await lookupSupplierWithRetry(
              `${SUPABASE_URL}/rest/v1/suppliers?email=eq.${encodeURIComponent(userEmail)}&select=id,user_id,email,company_name`,
              'Supplier lookup by email'
            );
            
            if (emailData && emailData.length > 0) {
              foundSupplierId = emailData[0].id;
              console.log('📦 Found supplier by email:', emailData[0]);
            } else {
              console.log('⚠️ No supplier found by email');
            }
          } else {
            console.log('⚠️ No email available for supplier lookup');
          }
          
          // Method 2: Look up supplier by user_id (if email lookup didn't work)
          if (!foundSupplierId) {
            console.log('🔍 Trying supplier lookup by user_id:', userId);
            const supplierData1 = await lookupSupplierWithRetry(
              `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${userId}&select=id,user_id,email,company_name`,
              'Supplier lookup by user_id'
            );
            
            if (supplierData1 && supplierData1.length > 0) {
              foundSupplierId = supplierData1[0].id;
              console.log('📦 Found supplier by user_id:', supplierData1[0]);
            } else {
              console.log('⚠️ No supplier found by user_id');
            }
          }
          
          // Method 3: Try by id (in case userId IS the supplier.id)
        if (!foundSupplierId) {
            console.log('🔍 Trying supplier lookup by id:', userId);
            const directData = await lookupSupplierWithRetry(
              `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${userId}&select=id,user_id,email,company_name`,
              'Supplier lookup by id'
            );
            
            if (directData && directData.length > 0) {
              foundSupplierId = directData[0].id;
              console.log('📦 Found supplier by id:', directData[0]);
            } else {
              console.log('⚠️ No supplier found by id');
            }
          }
        } catch (lookupErr) {
          console.error('❌ Supplier lookup error:', lookupErr);
        }

        // Final fallback: Use userId as supplier ID (should rarely happen)
        if (!foundSupplierId) {
          console.log('⚠️ Using userId as supplier ID fallback:', userId);
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
    
    // Prevent multiple simultaneous calls
    if (fetchOrdersRef.current) {
      console.log('⚠️ fetchOrders already in progress, skipping...');
      return;
    }
    
    console.log('📦 Fetching orders for supplier:', supplierId);
    fetchOrdersRef.current = true;
    setLoadingOrders(true);
    
    try {
      // Use native fetch with timeout to avoid Supabase client hanging
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Helper function to get fresh access token with refresh
      // Try localStorage FIRST to avoid auth.getSession() timeout
      const getFreshAccessToken = async (): Promise<string> => {
        // First, try localStorage (fastest, no network call)
        try {
          const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.access_token) {
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
            // Check if token is expired (with 5 minute buffer)
            const tokenExp = session.expires_at ? new Date(session.expires_at * 1000) : null;
            const now = new Date();
            const buffer = 5 * 60 * 1000; // 5 minutes
            
            if (tokenExp && tokenExp.getTime() > now.getTime() + buffer) {
              // Token is still valid
              return session.access_token;
            } else {
              // Token is expired or expiring soon, refresh it
              console.log('🔄 Token expired or expiring soon, refreshing...');
              try {
                const { data: { session: newSession }, error: refreshError } = await withTimeout(
                  supabase.auth.refreshSession(),
                  2000
                );
                
                if (newSession?.access_token && !refreshError) {
                  console.log('✅ Token refreshed successfully');
                  return newSession.access_token;
                } else {
                  console.warn('⚠️ Token refresh failed, using localStorage...', refreshError);
                }
              } catch (refreshErr) {
                console.warn('⚠️ Token refresh timeout, using localStorage...');
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Error getting session (timeout expected), using localStorage...');
        }
        
        // Fallback to localStorage again (in case session had token but we couldn't check expiry)
      const stored = getUserFromStorage();
      if (stored?.accessToken) {
          console.log('📦 Using token from localStorage (fallback)');
          return stored.accessToken;
        }
        
        // Final fallback: anon key
        console.warn('⚠️ Using anon key as final fallback');
        return ANON_KEY;
      };
      
      // Get fresh access token
      console.log('🔑 Getting access token for fetchOrders...');
      let accessToken = await getFreshAccessToken();
      console.log('✅ Got access token for fetchOrders');
      
      const headers: Record<string, string> = {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch BOTH material_items AND purchase_orders to ensure we get all orders
      // Some orders might not have material_items created yet
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Fetch orders timeout (20s) - aborting requests');
        controller.abort();
      }, 20000);
      
      console.log('📦 Fetching material_items for supplier...');
      // Fetch material items for this supplier
      const itemsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/material_items?supplier_id=eq.${supplierId}&order=created_at.desc&limit=1000`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      console.log('✅ Material items response status:', itemsResponse.status);
      
      // FIRST: Fetch delivery_requests with accepted status to get purchase_order_ids
      // This is where delivery confirmation actually happens
      // NOTE: No date filters - this query will fetch ALL orders with confirmed delivery,
      // including future orders as they are created. Orders are sorted by created_at.desc
      // so newest orders appear first.
      console.log('📦 Fetching delivery_requests with accepted status...');
      const deliveryRequestsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?status=in.(accepted,assigned)&select=id,purchase_order_id,status,provider_id,accepted_at&order=created_at.desc&limit=1000`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      
      // Wait for delivery_requests to complete before fetching purchase_orders
      let deliveryRequestsData: any[] = [];
      if (deliveryRequestsResponse.ok) {
        deliveryRequestsData = await deliveryRequestsResponse.json();
        console.log('✅ Delivery requests with accepted status:', deliveryRequestsData?.length || 0);
      } else {
        const errorText = await deliveryRequestsResponse.text();
        console.error('⚠️ Failed to fetch delivery requests:', deliveryRequestsResponse.status, errorText);
      }
      
      // Get all purchase_order_ids from delivery_requests
      // We'll filter by supplier_id when we fetch the purchase_orders themselves
      const allDeliveryRequestPOIds = Array.from(
        new Set(deliveryRequestsData.map((dr: any) => dr.purchase_order_id).filter(Boolean))
      );
      
      console.log('📦 Total purchase_order_ids from delivery_requests:', allDeliveryRequestPOIds.length);
      
      // Use all delivery_requests - we'll filter by supplier when fetching purchase_orders
      const finalDeliveryRequests = deliveryRequestsData;
      
      // Get unique purchase_order_ids from delivery_requests
      const confirmedDeliveryOrderIds = Array.from(
        new Set(finalDeliveryRequests.map((dr: any) => dr.purchase_order_id).filter(Boolean))
      );
      
      console.log('📦 Purchase order IDs with confirmed delivery for this supplier:', confirmedDeliveryOrderIds.length);
      
      // NOW fetch purchase_orders using the purchase_order_ids from delivery_requests
      // This ensures we get the correct orders regardless of supplier_id matching issues
      let allOrdersData: any[] = [];
      
      if (confirmedDeliveryOrderIds.length > 0) {
        // Build query with OR conditions for multiple IDs (PostgREST supports up to 100 in a single query)
        // Split into chunks of 100 if needed
        const chunks: string[][] = [];
        for (let i = 0; i < confirmedDeliveryOrderIds.length; i += 100) {
          chunks.push(confirmedDeliveryOrderIds.slice(i, i + 100));
        }
        
        console.log('📦 Fetching purchase_orders in', chunks.length, 'chunk(s) with supplier filter...');
        
        // Get userId for supplier_id matching (supplier lookup might have timed out)
        let userId: string | null = null;
        try {
          const stored = getUserFromStorage();
          userId = stored?.id || null;
        } catch {
          // Ignore
        }
        
        // Try multiple supplier_id variations since the lookup might have timing issues
        const supplierIdsToTry = [
          supplierId,
          userId,
          '91623c3b-d44b-46d4-9cf1-b662084d03da' // Known supplier ID from logs
        ].filter(Boolean);
        
        const orderPromises = chunks.flatMap((chunk) => {
          // PostgREST uses 'in' operator with parentheses for multiple values
          const idsList = chunk.join(',');
          
          // Try each supplier_id variation
          return supplierIdsToTry.map((sid) => {
            return fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${idsList})&supplier_id=eq.${sid}&order=created_at.desc&limit=1000`,
              { headers, signal: controller.signal, cache: 'no-store' }
            );
          });
        });
        
        const orderResponses = await Promise.all(orderPromises);
        
        const seenOrderIds = new Set<string>();
        for (const response of orderResponses) {
          if (response.ok) {
            const chunkData = await response.json();
            // Deduplicate orders
            chunkData.forEach((order: any) => {
              if (!seenOrderIds.has(order.id)) {
                seenOrderIds.add(order.id);
                allOrdersData.push(order);
              }
            });
          }
          // Don't log errors for failed supplier_id attempts - it's expected that some won't match
        }
        
        console.log('✅ Purchase orders fetched (with supplier filter):', allOrdersData.length);
      } else {
        // Fallback: Fetch by supplier_id if no delivery_requests found
        console.log('📦 No confirmed delivery requests found, fetching by supplier_id as fallback...');
        const allOrdersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?supplier_id=eq.${supplierId}&status=in.(confirmed,quote_accepted,ready_for_dispatch,order_created)&order=created_at.desc&limit=1000`,
          { headers, signal: controller.signal, cache: 'no-store' }
        );
        
        if (allOrdersResponse.ok) {
          allOrdersData = await allOrdersResponse.json();
          console.log('✅ Purchase orders fetched (fallback):', allOrdersData.length);
        } else {
          const errorText = await allOrdersResponse.text();
          console.error('⚠️ Failed to fetch purchase orders:', allOrdersResponse.status, errorText);
        }
      }
      
      clearTimeout(timeoutId);
      
      if (!itemsResponse.ok) {
        console.error('❌ Failed to fetch material items:', itemsResponse.status);
        throw new Error(`HTTP ${itemsResponse.status}`);
      }
      
      const itemsData = await itemsResponse.json();
      console.log('✅ Material items fetched:', itemsData?.length || 0);
      
      // allOrdersData and deliveryRequestsData are already fetched above
      // allOrdersData was fetched using purchase_order_ids from delivery_requests
      // Since we already filtered delivery_requests by supplier_id, all orders should be relevant
      const ordersData = allOrdersData;
      
      console.log('📦 Purchase orders with confirmed delivery:', ordersData.length);
      
      // Log date range for debugging
      if (itemsData && itemsData.length > 0) {
        const dates = itemsData.map((item: any) => item.created_at).filter(Boolean);
        if (dates.length > 0) {
          const sortedDates = dates.sort();
          console.log('📅 Date range in material_items:', {
            oldest: sortedDates[0],
            newest: sortedDates[sortedDates.length - 1],
            total: itemsData.length
          });
        }
      }
      
      if (ordersData && ordersData.length > 0) {
        const orderDates = ordersData.map((order: any) => order.created_at).filter(Boolean);
        if (orderDates.length > 0) {
          const sortedOrderDates = orderDates.sort();
          console.log('📅 Date range in purchase_orders:', {
            oldest: sortedOrderDates[0],
            newest: sortedOrderDates[sortedOrderDates.length - 1],
            total: ordersData.length
          });
        }
      }
      
      // Create a set of purchase_order_ids that have material_items
      const ordersWithItems = new Set(itemsData.map((item: any) => item.purchase_order_id).filter(Boolean));
      console.log('📦 Orders with material_items:', ordersWithItems.size);
      
      // Log sample orders to debug
      if (ordersData && ordersData.length > 0) {
        console.log('📦 Sample purchase_orders (first 3):', ordersData.slice(0, 3).map((order: any) => ({
          id: order.id?.slice(0, 8),
          status: order.status,
          delivery_status: order.delivery_status,
          delivery_provider_id: order.delivery_provider_id ? 'SET' : 'NULL',
          created_at: order.created_at
        })));
      } else {
        console.warn('⚠️ No orders found after filtering! Total orders fetched:', allOrdersData.length);
        console.warn('⚠️ Delivery requests with purchase_order_id:', deliveryRequestsData.filter((dr: any) => dr.purchase_order_id).length);
      }
      
      // For purchase_orders with confirmed delivery that don't have material_items yet, create placeholder entries
      const missingOrders = ordersData.filter((order: any) => !ordersWithItems.has(order.id));
      console.log('📦 Confirmed delivery orders without material_items:', missingOrders.length);
      
      if (missingOrders.length > 0) {
        // Create placeholder material_items from purchase_orders
        missingOrders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            order.items.forEach((item: any, index: number) => {
              const placeholderItem = {
                id: `placeholder-${order.id}-${index}`,
                purchase_order_id: order.id,
                qr_code: `PLACEHOLDER-${order.id}-${index}`,
                item_sequence: index + 1,
                material_type: item.name || item.material_name || 'Unknown Material',
                category: item.category || 'General',
                quantity: item.quantity || 1,
                unit: item.unit || 'units',
                supplier_id: supplierId,
                buyer_id: order.buyer_id || order.builder_id,
                buyer_name: order.builder_name || 'Unknown Client',
                buyer_email: order.builder_email || '',
                buyer_phone: order.builder_phone || '',
                status: 'pending',
                dispatch_scanned: false,
                created_at: order.created_at || new Date().toISOString()
              };
              itemsData.push(placeholderItem);
            });
          }
        });
        console.log('✅ Added placeholder items for confirmed delivery orders without material_items');
      }

      // Create a map of purchase_orders by id for quick lookup
      const purchaseOrderMap: Record<string, any> = {};
      (ordersData || []).forEach((order: any) => {
        purchaseOrderMap[order.id] = order;
      });

      // Group items by purchase_order_id
      const orderMap: Record<string, Order> = {};
      
      console.log('📦 Grouping items by purchase_order_id. Total items:', itemsData.length);
      
      (itemsData || []).forEach((item: any) => {
        const orderId = item.purchase_order_id || 'unknown';
        const purchaseOrder = purchaseOrderMap[orderId];
        
        if (!orderMap[orderId]) {
          orderMap[orderId] = {
            id: orderId,
            order_number: purchaseOrder?.po_number || orderId.slice(0, 8).toUpperCase(),
            buyer_id: item.buyer_id || purchaseOrder?.buyer_id || 'unknown',
            buyer_name: item.buyer_name || purchaseOrder?.builder_name || 'Unknown Client',
            buyer_email: item.buyer_email || purchaseOrder?.builder_email || '',
            buyer_phone: item.buyer_phone || purchaseOrder?.builder_phone || '',
            total_items: 0,
            dispatched_items: 0,
            pending_items: 0,
            created_at: item.created_at || purchaseOrder?.created_at || '',
            items: [],
            delivery_provider_id: purchaseOrder?.delivery_provider_id || null,
            delivery_provider_name: purchaseOrder?.delivery_provider_name || null,
            delivery_required: purchaseOrder?.delivery_required !== false // Default to true if not explicitly false
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
      
      console.log('📦 Orders grouped:', Object.keys(orderMap).length);
      console.log('📦 Orders with pending items:', Object.values(orderMap).filter(o => o.pending_items > 0).length);

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
      console.log('✅ Orders state will be updated with', ordersArray.length, 'orders');
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      // Don't clear orders on error - keep existing orders visible
    } finally {
      setLoadingOrders(false);
      fetchOrdersRef.current = false;
      console.log('✅ fetchOrders completed, loadingOrders set to false');
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
    // VALIDATE: Delivery provider required before dispatch
    // ═══════════════════════════════════════════════════════════════════════════
    const deliveryRequired = selectedOrder.delivery_required !== false; // Default to true if not explicitly false
    const hasDeliveryProvider = selectedOrder.delivery_provider_id && selectedOrder.delivery_provider_id.trim() !== '';
    
    if (deliveryRequired && !hasDeliveryProvider) {
      toast.error('❌ Cannot Dispatch: No Delivery Provider Assigned', {
        description: 'This order requires delivery service, but no delivery provider has been assigned yet. Please wait for a delivery provider to accept the delivery request before dispatching materials.',
        duration: 8000
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATE: Check if this QR code belongs to the selected order
    // First check client-side cache, then verify with database if not found
    // ═══════════════════════════════════════════════════════════════════════════
    let matchingItem = selectedOrder.items.find(item => item.qr_code === qrCode);
    
    // If not found in cache, verify with database (QR codes might have been generated after order was loaded)
    if (!matchingItem) {
      console.log('⚠️ QR code not found in cached items, verifying with database...');
      try {
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        // Helper function to get fresh access token with refresh
        const getFreshAccessToken = async (): Promise<string> => {
          try {
            // First, try to get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (session?.access_token && !sessionError) {
              // Check if token is expired (with 5 minute buffer)
              const tokenExp = session.expires_at ? new Date(session.expires_at * 1000) : null;
              const now = new Date();
              const buffer = 5 * 60 * 1000; // 5 minutes
              
              if (tokenExp && tokenExp.getTime() > now.getTime() + buffer) {
                // Token is still valid
                return session.access_token;
              } else {
                // Token is expired or expiring soon, refresh it
                console.log('🔄 Token expired or expiring soon, refreshing...');
                const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
                
                if (newSession?.access_token && !refreshError) {
                  console.log('✅ Token refreshed successfully');
                  return newSession.access_token;
                } else {
                  console.warn('⚠️ Token refresh failed, trying localStorage...', refreshError);
                }
              }
            } else {
              // No session, try to refresh
              console.log('🔄 No session found, attempting refresh...');
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (newSession?.access_token && !refreshError) {
                console.log('✅ Session refreshed successfully');
                return newSession.access_token;
              } else {
                console.warn('⚠️ Session refresh failed, trying localStorage...', refreshError);
              }
            }
          } catch (e) {
            console.warn('⚠️ Error getting/refreshing session:', e);
          }
          
          // Fallback to localStorage
          try {
            const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.access_token) {
                console.log('📦 Using token from localStorage');
                return parsed.access_token;
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not get token from localStorage:', e);
          }
          
          // Final fallback: anon key
          console.warn('⚠️ Using anon key as final fallback');
          return ANON_KEY;
        };
        
        // Get fresh access token
        let accessToken = await getFreshAccessToken();
        
        // Helper function to make request with retry on 401
        const makeRequestWithRetry = async (url: string, options: RequestInit): Promise<Response> => {
          let response = await fetch(url, options);
          
          // If 401, refresh token and retry once
          if (response.status === 401) {
            console.log('🔄 Got 401, refreshing token and retrying...');
            accessToken = await getFreshAccessToken();
            
            // Retry with fresh token
            const newOptions = {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`
              }
            };
            response = await fetch(url, newOptions);
          }
          
          return response;
        };
        
        // Check database to see what order this QR code belongs to
        const verifyResponse = await makeRequestWithRetry(
          `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${qrCode}&select=id,purchase_order_id,qr_code,material_type,item_sequence,dispatch_scanned&limit=1`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData && verifyData.length > 0) {
            const dbItem = verifyData[0];
            
            console.log('🔍 Database verification result:', {
              qr_code: qrCode,
              db_purchase_order_id: dbItem.purchase_order_id,
              selected_order_id: selectedOrder.id,
              selected_order_number: selectedOrder.order_number,
              match: dbItem.purchase_order_id === selectedOrder.id
            });
            
            // Check if it belongs to the selected order (compare by UUID)
            if (dbItem.purchase_order_id === selectedOrder.id) {
              // QR code belongs to this order - create matching item from DB data
              matchingItem = {
                id: dbItem.id,
                qr_code: dbItem.qr_code,
                material_type: dbItem.material_type,
                item_sequence: dbItem.item_sequence,
                dispatch_scanned: dbItem.dispatch_scanned || false,
                category: '',
                quantity: 1,
                unit: '',
                status: dbItem.dispatch_scanned ? 'dispatched' : 'pending'
              };
              console.log('✅ QR code verified in database - belongs to selected order');
            } else {
              // QR code belongs to a different order - fetch the actual order to show better error
              let actualOrderNumber = 'Unknown';
              try {
                const orderResponse = await makeRequestWithRetry(
                  `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${dbItem.purchase_order_id}&select=po_number&limit=1`,
                  {
                    headers: {
                      'apikey': ANON_KEY,
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    cache: 'no-store'
                  }
                );
                if (orderResponse.ok) {
                  const orderData = await orderResponse.json();
                  if (orderData && orderData.length > 0) {
                    actualOrderNumber = orderData[0].po_number || 'Unknown';
                  }
                }
              } catch (e) {
                console.warn('Could not fetch actual order number:', e);
              }
              
              // QR code belongs to a different order
              console.error('❌ QR code belongs to different order:', {
                scanned_qr: qrCode,
                selected_order_id: selectedOrder.id,
                selected_order_number: selectedOrder.order_number,
                actual_order_id: dbItem.purchase_order_id,
                actual_order_number: actualOrderNumber
              });
              
              // Play error sound
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 300;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
                oscillator.start();
                setTimeout(() => oscillator.stop(), 300);
              } catch (e) {}

              toast.error('❌ Wrong Order!', {
                description: `This QR code belongs to a different order. Please scan items from Order #${selectedOrder.order_number} only.`,
                duration: 5000
              });
              return;
            }
          } else {
            // QR code not found in database at all
            console.error('❌ QR code not found in database:', qrCode);
            toast.error('❌ Invalid QR Code', {
              description: 'This QR code is not registered in the system.',
              duration: 5000
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error verifying QR code:', error);
        // Continue anyway - let the database function handle validation
        console.log('⚠️ Could not verify QR code, proceeding with database validation...');
      }
    }
    
    // Final check - if still no matching item, show error
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
      
      // Helper function to get fresh access token with refresh
      const getFreshAccessToken = async (): Promise<string> => {
        try {
          // First, try to get current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session?.access_token && !sessionError) {
            // Check if token is expired (with 5 minute buffer)
            const tokenExp = session.expires_at ? new Date(session.expires_at * 1000) : null;
            const now = new Date();
            const buffer = 5 * 60 * 1000; // 5 minutes
            
            if (tokenExp && tokenExp.getTime() > now.getTime() + buffer) {
              // Token is still valid
              return session.access_token;
            } else {
              // Token is expired or expiring soon, refresh it
              console.log('🔄 Token expired or expiring soon, refreshing...');
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (newSession?.access_token && !refreshError) {
                console.log('✅ Token refreshed successfully');
                return newSession.access_token;
              } else {
                console.warn('⚠️ Token refresh failed, trying localStorage...', refreshError);
              }
            }
          } else {
            // No session, try to refresh
            console.log('🔄 No session found, attempting refresh...');
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (newSession?.access_token && !refreshError) {
              console.log('✅ Session refreshed successfully');
              return newSession.access_token;
            } else {
              console.warn('⚠️ Session refresh failed, trying localStorage...', refreshError);
            }
          }
        } catch (e) {
          console.warn('⚠️ Error getting/refreshing session:', e);
        }
        
        // Fallback to localStorage
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
            if (parsed.access_token) {
              console.log('📦 Using token from localStorage');
              return parsed.access_token;
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not get token from localStorage:', e);
        }
        
        // Final fallback: anon key
        console.warn('⚠️ Using anon key as final fallback');
        return ANON_KEY;
      };
      
      // Get fresh access token
      let accessToken = await getFreshAccessToken();
      
      // Helper function to make RPC call with retry on 401
      const makeRPCWithRetry = async (url: string, body: any): Promise<Response> => {
        let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
          body: JSON.stringify(body)
        });
        
        // If 401, refresh token and retry once
        if (response.status === 401) {
          console.log('🔄 Got 401 for record_qr_scan, refreshing token and retrying...');
          accessToken = await getFreshAccessToken();
          
          // Retry with fresh token
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body)
          });
        }
        
        return response;
      };
      
      const response = await makeRPCWithRetry(`${SUPABASE_URL}/rest/v1/rpc/record_qr_scan`, {
          _qr_code: qrCode,
          _scan_type: 'dispatch',
          _scanner_device_id: navigator.userAgent.substring(0, 100),
          _scanner_type: scannerType,
          _material_condition: materialCondition,
          _notes: notes || null
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
          case 'NO_DELIVERY_PROVIDER':
            errorTitle = '❌ No Delivery Provider Assigned';
            errorDescription = 'Cannot dispatch materials: No delivery provider has been assigned to this order. Please wait for a delivery provider to accept the delivery request before dispatching.';
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

            {/* Fallback: If orders exist but neither section shows (shouldn't happen, but just in case) */}
            {orders.length > 0 && 
             orders.filter(o => o.pending_items > 0).length === 0 && 
             orders.filter(o => o.pending_items === 0).length === 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  All Orders ({orders.length} orders)
                </h3>
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} onSelect={selectOrder} />
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
    <div className="space-y-4">
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

      {/* Delivery Provider Warning */}
      {selectedOrder.delivery_required !== false && !selectedOrder.delivery_provider_id && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>⚠️ Cannot Dispatch:</strong> This order requires delivery service, but no delivery provider has been assigned yet. 
            Please wait for a delivery provider to accept the delivery request before scanning QR codes for dispatch.
          </AlertDescription>
        </Alert>
      )}

      {/* Delivery Provider Info */}
      {selectedOrder.delivery_provider_id && selectedOrder.delivery_provider_name && (
        <Alert className="border-green-300 bg-green-50">
          <Truck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Delivery Provider Assigned:</strong> {selectedOrder.delivery_provider_name}
            {selectedOrder.delivery_provider_id && ` (ID: ${selectedOrder.delivery_provider_id.slice(0, 8)}...)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Card - Compact */}
      <Card className={allItemsScanned ? 'border-green-400 bg-green-50' : 'border-blue-200 bg-blue-50'}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {allItemsScanned ? (
                <PartyPopper className="h-5 w-5 text-green-600" />
              ) : (
                <Truck className="h-5 w-5 text-blue-600" />
              )}
              <span className="font-semibold text-sm">
                {allItemsScanned ? '🎉 All Items Dispatched!' : 'Loading Progress'}
              </span>
            </div>
            <Badge className={allItemsScanned ? 'bg-green-600' : 'bg-blue-600'}>
              {selectedOrder.dispatched_items} / {selectedOrder.total_items}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {!allItemsScanned && (
            <p className="text-xs text-blue-700 mt-1">
              Scan {selectedOrder.pending_items} more QR code{selectedOrder.pending_items !== 1 ? 's' : ''} as you load items
            </p>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* PRIMARY: CAMERA SCANNER - Always visible and prominent when items remain */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
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
                    Point camera at QR stickers on materials
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
            {/* Instructions Banner */}
            <Alert className="bg-amber-50 border-amber-300">
              <Truck className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Loading Workflow:</strong> As you load each material into the vehicle, 
                scan its QR code sticker. The system will automatically track which items have been loaded.
              </AlertDescription>
            </Alert>

            {/* Mobile Device Info */}
            {isMobile && (
              <Alert className="bg-blue-50 border-blue-200">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Tip:</strong> Hold phone steady, 6-12 inches from QR code. Ensure good lighting.
                </AlertDescription>
              </Alert>
            )}

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
            
            {/* Camera View - Larger and more prominent */}
            <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: '350px' }}>
              <div 
                id={scannerContainerId} 
                className="w-full"
                style={{ minHeight: '350px' }}
              />
              
              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                  <div className="text-center text-white p-6">
                    <div className="bg-green-600/20 p-6 rounded-full inline-block mb-4">
                      <Camera className="h-16 w-16 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                    <p className="text-sm opacity-70 mb-4">
                      Tap the button below to activate your camera
                    </p>
                    <Button 
                      onClick={startCameraScanning} 
                      size="lg" 
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                    >
                      <Camera className="h-6 w-6 mr-2" />
                      Start Camera Scanner
                    </Button>
                  </div>
                </div>
              )}
              
              {isScanning && (
                <>
                  {/* Scanning overlay with corners */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-8 left-8 w-16 h-16 border-l-4 border-t-4 border-green-400 rounded-tl-lg" />
                    <div className="absolute top-8 right-8 w-16 h-16 border-r-4 border-t-4 border-green-400 rounded-tr-lg" />
                    <div className="absolute bottom-20 left-8 w-16 h-16 border-l-4 border-b-4 border-green-400 rounded-bl-lg" />
                    <div className="absolute bottom-20 right-8 w-16 h-16 border-r-4 border-b-4 border-green-400 rounded-br-lg" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="bg-green-600 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-pulse inline-flex items-center gap-2">
                      <Scan className="h-4 w-4" />
                      Scanning... Point at QR code
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls - Only show when scanning */}
            {isScanning && (
              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={stopScanning} variant="destructive" size="lg">
                  <X className="h-5 w-5 mr-2" />
                  Stop Scanner
                </Button>
                {availableCameras.length > 1 && (
                  <Button onClick={toggleCamera} variant="outline" size="lg">
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Switch Camera
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ITEMS CHECKLIST - Collapsible, shows what's been scanned */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader 
          className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors" 
          onClick={() => setShowItemsList(!showItemsList)}
        >
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-gray-600" />
              <span>Items Checklist</span>
              <Badge variant="outline" className="ml-2">
                {selectedOrder.dispatched_items}/{selectedOrder.total_items} loaded
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              {showItemsList ? '▲ Hide' : '▼ Show'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showItemsList && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {selectedOrder.items
                .sort((a, b) => a.item_sequence - b.item_sequence)
                .map(item => (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                      item.dispatch_scanned 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {item.dispatch_scanned ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${item.dispatch_scanned ? 'text-green-700' : 'text-gray-700'}`}>
                        #{item.item_sequence} - {item.material_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* SECONDARY: Manual Entry - Collapsed by default */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {!allItemsScanned && (
        <details className="group">
          <summary className="cursor-pointer list-none">
            <Card className="border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <QrCode className="h-4 w-4" />
                    <span className="text-sm font-medium">Manual / Physical Scanner</span>
                    <Badge variant="outline" className="text-xs">Alternative</Badge>
                  </div>
                  <span className="text-xs text-gray-500 group-open:hidden">▼ Expand</span>
                  <span className="text-xs text-gray-500 hidden group-open:inline">▲ Collapse</span>
                </div>
              </CardContent>
            </Card>
          </summary>
          <Card className="mt-2 border-gray-200">
            <CardHeader className="py-3">
              <CardDescription>
                Use this only if camera scanning doesn't work. Type or paste QR code manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-qr">QR Code</Label>
                <Input
                  id="manual-qr"
                  placeholder="Scan or enter QR code"
                  value={manualQRCode}
                  onChange={(e) => setManualQRCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualScan();
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={materialCondition} onValueChange={setMaterialCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Optional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleManualScan} 
                disabled={!manualQRCode.trim()}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Record Dispatch Scan
              </Button>
            </CardContent>
          </Card>
        </details>
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
  const [isPressed, setIsPressed] = React.useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(true);
    toast.info(`Selecting Order #${order.order_number}...`, { duration: 1000 });
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(order);
    }, 100);
  };
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] select-none ${
        isComplete 
          ? 'border-green-200 bg-green-50/50 hover:border-green-300 hover:bg-green-100/50' 
          : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50'
      } ${isPressed ? 'ring-2 ring-blue-500' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
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
            <div className="flex flex-col items-end gap-1">
              <Badge className={isComplete ? 'bg-green-600' : 'bg-amber-600'}>
                {isComplete ? 'Complete' : `${order.pending_items} pending`}
              </Badge>
              <span className="text-xs text-blue-600 font-medium">Tap to select →</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
