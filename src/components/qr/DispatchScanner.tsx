import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { LEGACY_SUPABASE_AUTH_STORAGE_KEY, getAccessTokenWithPersistenceFallback, readPersistedAccessTokenSync, readPersistedAuthRawStringSync, readPersistedAuthUserSync } from '@/utils/supabaseAccessToken';
import { purchaseOrderRequiresDeliveryProvider } from '@/utils/purchaseOrderFulfillment';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/** Strip BOM / zero-width / nulls so camera output matches DB `material_items.qr_code`. */
function normalizeQrCode(raw: string): string {
  if (raw == null || typeof raw !== 'string') return '';
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

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
  dispatch_scan_count?: number; // when quantity > 1, scans until count >= quantity
  status: string;
}

interface Order {
  id: string;
  order_number?: string; // Optional - only real po_number from purchase_orders, no fake fallback
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
  builder_fulfillment_choice?: string | null;
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

export interface DispatchScannerProps {
  /** Same IDs as supplier dashboard (auth uid + suppliers.id, profile id, …) — avoids wrong single-id queries */
  supplierScopeIds?: string[];
  /** Preferred suppliers.id when known */
  primarySupplierId?: string;
}

function buildSupplierInFilter(ids: string[]): string {
  const u = [...new Set(ids.filter(Boolean))];
  if (u.length === 0) return '';
  if (u.length === 1) return `supplier_id=eq.${u[0]}`;
  return `supplier_id=in.(${u.join(',')})`;
}

export const DispatchScanner: React.FC<DispatchScannerProps> = ({
  supplierScopeIds: supplierScopeIdsProp,
  primarySupplierId: primarySupplierIdProp,
}) => {
  const supplierScopeKey = useMemo(
    () => [...new Set((supplierScopeIdsProp || []).filter(Boolean))].sort().join('|'),
    [supplierScopeIdsProp]
  );
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE - Order Selection
  // ─────────────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'select-order' | 'scanning'>('select-order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const fetchOrdersGen = useRef(0);

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
  const recentlyProcessedRef = useRef<Map<string, number>>(new Map());
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
    // Dashboard passes resolved scope — skip slow supplier lookup
    const scope = (supplierScopeIdsProp || []).filter(Boolean);
    if (scope.length > 0) {
      const raw = localStorage.getItem('user_role');
      setUserRole(raw ? raw.toLowerCase().trim() : null);
      setSupplierId(primarySupplierIdProp || scope[0]);
    } else {
      void checkAuth();
    }
    detectDeviceInfo();
    listAvailableCameras();

    const loadingSafety = window.setTimeout(() => {
      setLoadingOrders(false);
      console.warn('⏱️ DispatchScanner: loading safety timeout');
    }, 16000);
    
    // Add global error handler to catch unhandled promise rejections from html5-qrcode library
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      
      // Filter out non-critical internal library errors
      const ignoredPatterns = [
        'O',
        'decodeRow2pairs',
        'decodeRow',
        'doDecode',
        'NotFoundException'
      ];
      
      const shouldIgnore = ignoredPatterns.some(pattern => 
        errorMessage.includes(pattern) || 
        (errorMessage.length <= 2 && /^[A-Z]$/.test(errorMessage))
      );
      
      if (shouldIgnore) {
        // Suppress non-critical errors
        event.preventDefault();
        return;
      }
      
      // Log other errors for debugging
      console.warn('⚠️ Unhandled promise rejection from scanner:', errorMessage);
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.clearTimeout(loadingSafety);
      stopScanning();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [supplierScopeKey, primarySupplierIdProp]);

  useEffect(() => {
    if (supplierId) {
      void fetchOrders();
    }
  }, [supplierId, supplierScopeKey]);

  // Add custom styles to ensure video fills container and remove dark space
  useEffect(() => {
    const styleId = 'dispatch-scanner-custom-styles';
    if (document.getElementById(styleId)) return; // Already added
    
    const style = document.createElement('style');
    style.id = styleId;
    // html5-qrcode maps qrRegion using videoWidth/clientWidth and videoHeight/clientHeight.
    // object-fit: cover breaks that (cropped feed ≠ full buffer scaling) → shaded box & white corners drift.
    // Use fill so the element rect matches what the library expects (stretch is acceptable for scanning).
    style.textContent = `
      #${scannerContainerId} {
        width: 100% !important;
        height: 100% !important;
        min-height: min(50vh, 320px) !important;
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
      /* Library overlay uses video dims on a full-height container → broken corners; we hide it and draw our own frame */
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
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

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

  const getUserFromStorage = (): { id: string; accessToken: string } | null => {
    const tok = readPersistedAccessTokenSync();
    const { id } = readPersistedAuthUserSync();
    if (id && tok) return { id, accessToken: tok };
    try {
      const storedSession = readPersistedAuthRawStringSync();
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.user?.id && parsed.access_token) {
          return { id: parsed.user.id, accessToken: parsed.access_token };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const checkAuth = async () => {
    console.log('🔐 Dispatch Scanner: Starting auth check...');
    
    try {
      const localRoleRaw = localStorage.getItem('user_role');
      const localRole = localRoleRaw ? localRoleRaw.toLowerCase().trim() : null;
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
          const r = roleData?.role || null;
          role = r ? r.toLowerCase().trim() : null;
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
        // Helper function to get fresh access token with refresh
        // Checks expiration and refreshes if needed
        const getFreshAccessToken = async (): Promise<string> => {
          // First, check localStorage but verify expiration
          try {
            const stored = readPersistedAuthRawStringSync();
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.access_token) {
                // Check if token is expired (with 5 minute buffer)
                const tokenExp = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
                const now = new Date();
                const buffer = 5 * 60 * 1000; // 5 minutes
                
                if (tokenExp && tokenExp.getTime() > now.getTime() + buffer) {
                  // Token is still valid
                  console.log('📦 Using token from localStorage (valid)');
                  return parsed.access_token;
                } else {
                  // Token is expired, need to refresh
                  console.log('🔄 Token in localStorage is expired, refreshing...');
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not get token from localStorage:', e);
          }
          
          // Token is expired or missing, refresh it
          try {
            console.log('🔄 Refreshing session...');
            const { data: { session }, error: sessionError } = await withTimeout(
              supabase.auth.getSession(), // This auto-refreshes expired tokens
              5000 // Increased timeout for refresh
            );
            
            if (session?.access_token && !sessionError) {
              // Update localStorage with fresh token
              try {
                const sessionData = {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at,
                  expires_in: session.expires_in,
                  token_type: session.token_type,
                  user: session.user
                };
                localStorage.setItem(LEGACY_SUPABASE_AUTH_STORAGE_KEY, JSON.stringify(sessionData));
                console.log('✅ Token refreshed and saved to localStorage');
              } catch (e) {
                console.warn('⚠️ Could not save refreshed token to localStorage:', e);
              }
              
              return session.access_token;
            } else {
              console.warn('⚠️ Session refresh failed:', sessionError);
            }
          } catch (e) {
            console.warn('⚠️ Error refreshing session:', e);
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
          const stored = readPersistedAuthRawStringSync();
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
      const lr = localStorage.getItem('user_role');
      setUserRole(lr ? lr.toLowerCase().trim() : null);
      setLoadingOrders(false);
    }
  };

  const fetchOrders = async () => {
    const storageUserId = getUserFromStorage()?.id || null;
    const scopeIds = [...new Set([supplierId, ...(supplierScopeIdsProp || []), storageUserId].filter(Boolean))] as string[];
    if (scopeIds.length === 0) {
      console.log('❌ No supplier scope, cannot fetch orders');
      setLoadingOrders(false);
      return;
    }

    const gen = ++fetchOrdersGen.current;
    console.log('📦 Fetching orders for supplier scope:', scopeIds);
    setLoadingOrders(true);
    
    try {
      // Use native fetch with timeout to avoid Supabase client hanging
      // Helper function to get fresh access token with refresh
      // Checks expiration and refreshes if needed
      const getFreshAccessToken = async (): Promise<string> => {
        const fromSession = await getAccessTokenWithPersistenceFallback();
        if (fromSession) return fromSession;
        const syncTok = readPersistedAccessTokenSync();
        if (syncTok) return syncTok;
        // Then, check localStorage but verify expiration
        try {
          const stored = readPersistedAuthRawStringSync();
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.access_token) {
              // Check if token is expired (with 5 minute buffer)
              const tokenExp = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
              const now = new Date();
              const buffer = 5 * 60 * 1000; // 5 minutes
              
              if (tokenExp && tokenExp.getTime() > now.getTime() + buffer) {
                // Token is still valid
                return parsed.access_token;
              } else {
                // Token is expired, need to refresh
                console.log('🔄 Token in localStorage is expired, refreshing...');
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not get token from localStorage:', e);
        }
        
        // Token is expired or missing, try to refresh it
        try {
          // First, try to get refresh_token from localStorage
          const stored = readPersistedAuthRawStringSync();
          let refreshToken: string | null = null;
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              refreshToken = parsed.refresh_token || null;
            } catch {
              // Ignore
            }
          }
          
          // Try refreshing with refresh_token if available
          if (refreshToken) {
            try {
              console.log('🔄 Refreshing session with refresh_token...');
              const { data: { session }, error: refreshError } = await withTimeout(
                supabase.auth.refreshSession({ refresh_token: refreshToken }),
                5000
              );
              
              if (session?.access_token && !refreshError) {
                // Update localStorage with fresh token
                try {
                  const sessionData = {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at,
                    expires_in: session.expires_in,
                    token_type: session.token_type,
                    user: session.user
                  };
                  localStorage.setItem(LEGACY_SUPABASE_AUTH_STORAGE_KEY, JSON.stringify(sessionData));
                  console.log('✅ Token refreshed with refresh_token and saved to localStorage');
                  return session.access_token;
                } catch (e) {
                  console.warn('⚠️ Could not save refreshed token to localStorage:', e);
                }
              }
            } catch (refreshErr) {
              console.warn('⚠️ Refresh with refresh_token failed:', refreshErr);
            }
          }
          
          // Fallback: try getSession (which might auto-refresh)
          console.log('🔄 Trying getSession (auto-refresh)...');
          const { data: { session }, error: sessionError } = await withTimeout(
            supabase.auth.getSession(),
            5000
          );
          
          if (session?.access_token && !sessionError) {
            // Update localStorage with fresh token
            try {
              const sessionData = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                token_type: session.token_type,
                user: session.user
              };
              localStorage.setItem(LEGACY_SUPABASE_AUTH_STORAGE_KEY, JSON.stringify(sessionData));
              console.log('✅ Token refreshed via getSession and saved to localStorage');
              return session.access_token;
            } catch (e) {
              console.warn('⚠️ Could not save refreshed token to localStorage:', e);
            }
          } else {
            console.warn('⚠️ Session refresh failed:', sessionError);
          }
        } catch (e) {
          console.warn('⚠️ Error refreshing session:', e);
        }
        
        // Last resort: try using expired token anyway (sometimes it still works)
        const storedFallback = readPersistedAuthRawStringSync();
        if (storedFallback) {
          try {
            const parsed = JSON.parse(storedFallback);
            if (parsed.access_token) {
              console.warn('⚠️ Using expired token as fallback (may fail due to RLS)');
              return parsed.access_token;
            }
          } catch {
            // Ignore
          }
        }
        
        // Final fallback: anon key (will likely fail due to RLS, but better than nothing)
        console.warn('⚠️ Using anon key as final fallback (may return 0 results due to RLS)');
        return SUPABASE_ANON_KEY;
      };
      
      // Get fresh access token
      console.log('🔑 Getting access token for fetchOrders...');
      let accessToken = await getFreshAccessToken();
      console.log('✅ Got access token for fetchOrders');
      
      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
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
      
      const miFilter = buildSupplierInFilter(scopeIds);
      console.log('📦 Fetching material_items for supplier scope...');
      const itemsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/material_items?${miFilter}&order=created_at.desc&limit=1000`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      console.log('✅ Material items response status:', itemsResponse.status);
      
      console.log('📦 Fetching purchase_orders for supplier scope');
      let allOrdersData: any[] = [];
      
      const poFilter = buildSupplierInFilter(scopeIds);
      const poResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?${poFilter}&order=created_at.desc&limit=1000`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      if (poResponse.ok) {
        allOrdersData = await poResponse.json();
      }
      
      console.log('✅ Purchase orders fetched for supplier:', allOrdersData.length);
      
      // Fetch delivery_requests for these purchase_orders (optional - for info only, not required)
      // This helps show delivery provider info if available, but we don't filter orders based on this
      const purchaseOrderIds = allOrdersData.map((po: any) => po.id).filter(Boolean);
      let deliveryRequestsData: any[] = [];
      
      if (purchaseOrderIds.length > 0) {
        // Split into chunks of 100 for PostgREST
        const chunks: string[][] = [];
        for (let i = 0; i < purchaseOrderIds.length; i += 100) {
          chunks.push(purchaseOrderIds.slice(i, i + 100));
        }
        
        console.log('📦 Fetching delivery_requests for', purchaseOrderIds.length, 'purchase orders in', chunks.length, 'chunk(s)...');
        
        // Fetch ALL delivery_requests (not just accepted/assigned) to get delivery info if available
        const drPromises = chunks.map((chunk) => {
          const idsList = chunk.join(',');
          return fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=in.(${idsList})&select=id,purchase_order_id,status,provider_id,accepted_at&order=created_at.desc&limit=1000`,
            { headers, signal: controller.signal, cache: 'no-store' }
          );
        });
        
        const drResponses = await Promise.all(drPromises);
        
        for (const response of drResponses) {
          if (response.ok) {
            const chunkData = await response.json();
            deliveryRequestsData.push(...chunkData);
          }
        }
        
        console.log('✅ Delivery requests fetched (for info):', deliveryRequestsData.length);
        // NOTE: We don't filter orders based on delivery_requests - all orders with material_items can be dispatched
      } else {
        console.warn('⚠️ No purchase orders found for supplier, cannot fetch delivery_requests');
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
                supplier_id: scopeIds[0],
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

      // Create a map of delivery_requests by purchase_order_id for provider info
      // Use the most recent delivery_request with a provider_id
      const deliveryRequestMap: Record<string, any> = {};
      (deliveryRequestsData || []).forEach((dr: any) => {
        if (dr.purchase_order_id && dr.provider_id) {
          // If we already have a delivery_request for this order, keep the one with accepted/assigned status
          const existing = deliveryRequestMap[dr.purchase_order_id];
          if (!existing || 
              (dr.status === 'accepted' || dr.status === 'assigned') && 
              (existing.status !== 'accepted' && existing.status !== 'assigned')) {
            deliveryRequestMap[dr.purchase_order_id] = dr;
          }
        }
      });
      console.log('📦 Delivery requests mapped to orders:', Object.keys(deliveryRequestMap).length);

      // Group items by purchase_order_id
      const orderMap: Record<string, Order> = {};
      
      console.log('📦 Grouping items by purchase_order_id. Total items:', itemsData.length);
      
      (itemsData || []).forEach((item: any) => {
        const orderId = item.purchase_order_id || 'unknown';
        const purchaseOrder = purchaseOrderMap[orderId];
        const deliveryRequest = deliveryRequestMap[orderId];
        
        // Get delivery_provider_id from purchase_order first, fallback to delivery_request
        const deliveryProviderId = purchaseOrder?.delivery_provider_id || deliveryRequest?.provider_id || null;
        const deliveryProviderName = purchaseOrder?.delivery_provider_name || null; // Name comes from purchase_order (set by trigger)
        
        if (!orderMap[orderId]) {
          orderMap[orderId] = {
            id: orderId,
            order_number: purchaseOrder?.po_number || undefined, // NO FAKE FALLBACK - only real po_number
            buyer_id: item.buyer_id || purchaseOrder?.buyer_id || 'unknown',
            buyer_name: item.buyer_name || purchaseOrder?.builder_name || 'Unknown Client',
            buyer_email: item.buyer_email || purchaseOrder?.builder_email || '',
            buyer_phone: item.buyer_phone || purchaseOrder?.builder_phone || '',
            total_items: 0,
            dispatched_items: 0,
            pending_items: 0,
            created_at: item.created_at || purchaseOrder?.created_at || '',
            items: [],
            delivery_provider_id: deliveryProviderId,
            delivery_provider_name: deliveryProviderName,
            delivery_required: purchaseOrder?.delivery_required === true,
            builder_fulfillment_choice: purchaseOrder?.builder_fulfillment_choice ?? null,
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
          dispatch_scan_count: item.dispatch_scan_count,
          status: item.status
        };

        orderMap[orderId].items.push(orderItem);
        const qty = item.quantity ?? 1;
        orderMap[orderId].total_items += qty;
        if (item.dispatch_scanned) {
          orderMap[orderId].dispatched_items += qty;
        } else {
          const scanned = item.dispatch_scan_count ?? 0;
          orderMap[orderId].dispatched_items += scanned;
          orderMap[orderId].pending_items += Math.max(0, qty - scanned);
        }
      });
      
      console.log('📦 Orders grouped:', Object.keys(orderMap).length);
      console.log('📦 Orders with pending items:', Object.values(orderMap).filter(o => o.pending_items > 0).length);

      // Convert to array, filter out orders without REAL order numbers, then sort
      const ordersArray = Object.values(orderMap)
        .filter((order) => {
          // CRITICAL: Only include orders with REAL order_numbers (from purchase_orders.po_number)
          // Filter out orders without real order numbers to avoid showing fake/fallback numbers
          if (!order.order_number || order.order_number === 'unknown' || order.id === 'unknown') {
            console.warn('🚫 Dispatch Scanner: Filtering out order without real order_number:', order.id, 'order_number:', order.order_number);
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          // First, prioritize orders with pending items
          if (a.pending_items > 0 && b.pending_items === 0) return -1;
          if (a.pending_items === 0 && b.pending_items > 0) return 1;
          // Then sort by date
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      console.log('✅ Dispatch Scanner: Orders with REAL order_numbers:', ordersArray.length);
      console.log('📋 Sample real order numbers:', ordersArray.slice(0, 5).map(o => o.order_number).filter(Boolean));

      setOrders(ordersArray);
      console.log('📦 Fetched orders:', ordersArray.length);
      console.log('✅ Orders state will be updated with', ordersArray.length, 'orders');
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      // Don't clear orders on error - keep existing orders visible
    } finally {
      if (gen === fetchOrdersGen.current) {
        setLoadingOrders(false);
        console.log('✅ fetchOrders completed, loadingOrders set to false');
      }
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
      // Set verbose to false to reduce noise from internal library errors
      scannerRef.current = new Html5Qrcode(scannerContainerId, { verbose: false });
      
      // html5-qrcode requires cameraIdOrConfig as a device id string, or a single-key object
      // (e.g. { facingMode: 'environment' }); width/height at the top level triggers "found 3 keys".
      let cameraConfig: string | { facingMode: string };
      if (selectedCameraId) {
        cameraConfig = selectedCameraId;
      } else {
        cameraConfig = { facingMode: facing };
      }

      const scannerConfig = {
        fps: 30,
        // No qrbox: library shaded region is sized from video while stretched to a taller parent → misaligned white corners.
        // Full-frame decode + object-fit: fill keeps sampling consistent; UI frame is our centered overlay (sibling of this div).
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        disableFlip: false, // Allow rotation
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Use native barcode detector if available
        }
      };

      console.log('🎥 Starting scanner with config:', {
        cameraConfig,
        fps: scannerConfig.fps,
        fullFrame: true,
      });

      await scannerRef.current.start(
        cameraConfig,
        scannerConfig,
        (decodedText, decodedResult) => {
          const cleaned = normalizeQrCode(decodedText);
          console.log('✅ QR CODE DETECTED!', { decodedText, cleaned, decodedResult });
          if (!cleaned) return;
          const now = Date.now();
          
          // Quick debounce: prevent rapid duplicate scans within 2 seconds (same code)
          if (cleaned === lastScannedRef.current && now - lastScanTimeRef.current < 2000) {
            console.log('⏭️ Skipping duplicate scan (within 2 seconds)');
            return;
          }
          const lastProcessedAt = recentlyProcessedRef.current.get(cleaned);
          // Only skip if this exact code was successfully processed very recently (debounce double-tap)
          // After 2.5s allow same code again so multiple units with same QR (legacy) can be scanned
          if (lastProcessedAt != null && now - lastProcessedAt < 2500) {
            console.log('⏭️ Skipping recently processed QR code (debounce):', cleaned.substring(0, 30));
            return;
          }
          if (lastProcessedAt != null) recentlyProcessedRef.current.delete(cleaned);
          
          lastScannedRef.current = cleaned;
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
          } catch (e) {
            console.warn('⚠️ Could not play beep sound:', e);
          }
          
          // Validate in processQRScan (toast there on success/failure — avoids success + invalid double toast)
          void processQRScan(cleaned, 'mobile_camera');
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
            'QR code parse error, error =',
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
            console.log('📷 Scanner message (non-ignored):', errorMessage);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // QR SCAN PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────
  const processQRScan = async (rawQr: string, scannerType: 'mobile_camera' | 'physical_scanner' | 'web_scanner') => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }
    const qrCode = normalizeQrCode(rawQr);
    if (!qrCode) {
      toast.error('Invalid QR Code', { description: 'Could not read a valid code from the scan.' });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATE: Delivery provider required before dispatch
    // Check both purchase_order.delivery_provider_id and delivery_requests.provider_id
    // ═══════════════════════════════════════════════════════════════════════════
    const deliveryRequired = purchaseOrderRequiresDeliveryProvider(selectedOrder);
    let hasDeliveryProvider = selectedOrder.delivery_provider_id && selectedOrder.delivery_provider_id.trim() !== '';
    
    // If order doesn't have provider_id, check delivery_requests directly
    // (trigger only fires on 'accepted', but delivery can be 'assigned' too)
    if (deliveryRequired && !hasDeliveryProvider && selectedOrder.id) {
      try {
        let accessToken =
          (await getAccessTokenWithPersistenceFallback()) ||
          readPersistedAccessTokenSync() ||
          SUPABASE_ANON_KEY;
        
        // Check delivery_requests for this order
        const drResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${selectedOrder.id}&provider_id=not.is.null&select=provider_id,status&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
            }
          }
        );
        
        if (drResponse.ok) {
          const drData = await drResponse.json();
          if (drData && drData.length > 0 && drData[0].provider_id) {
            // Found provider in delivery_request - update the order object and allow dispatch
            selectedOrder.delivery_provider_id = drData[0].provider_id;
            hasDeliveryProvider = true;
            console.log('✅ Found delivery provider in delivery_requests:', drData[0].provider_id);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not check delivery_requests for provider:', error);
        // Continue with validation - if no provider found, will show error below
      }
    }
    
    if (deliveryRequired && !hasDeliveryProvider) {
      toast.error('❌ Cannot Dispatch: No Delivery Provider Assigned', {
        description: 'This order requires delivery service, but no delivery provider has been assigned yet. Please wait for a delivery provider to accept the delivery request before dispatching materials.',
        duration: 8000
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATE: Check if this QR code belongs to the selected order
    // Prefer an unscanned item so multiple units (same or different codes) all get scanned
    // ═══════════════════════════════════════════════════════════════════════════
    let matchingItem = selectedOrder.items.find(
      (item) => normalizeQrCode(item.qr_code) === qrCode && !item.dispatch_scanned
    ) || selectedOrder.items.find((item) => normalizeQrCode(item.qr_code) === qrCode);
    
    // If not found in cache, verify with database (QR codes might have been generated after order was loaded)
    if (!matchingItem) {
      console.log('⚠️ QR code not found in cached items, verifying with database...');
      try {
        // Helper function to get fresh access token with refresh
        const getFreshAccessToken = async (): Promise<string> => {
          const persisted = await getAccessTokenWithPersistenceFallback();
          if (persisted) return persisted;
          const sync = readPersistedAccessTokenSync();
          if (sync) return sync;
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (session?.access_token && !sessionError) return session.access_token;
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (newSession?.access_token && !refreshError) return newSession.access_token;
          } catch {
            /* ignore */
          }
          console.warn('⚠️ Dispatch verify: using anon key (RLS may hide QR rows)');
          return SUPABASE_ANON_KEY;
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
        
        // Check database to see what order this QR code belongs to (encode value for PostgREST)
        const verifyResponse = await makeRequestWithRetry(
          `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${encodeURIComponent(qrCode)}&select=id,purchase_order_id,qr_code,material_type,item_sequence,quantity,dispatch_scanned,dispatch_scan_count&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
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
              const qty = dbItem.quantity ?? 1;
              const scanned = dbItem.dispatch_scan_count ?? 0;
              const full = dbItem.dispatch_scanned || false;
              matchingItem = {
                id: dbItem.id,
                qr_code: dbItem.qr_code,
                material_type: dbItem.material_type,
                item_sequence: dbItem.item_sequence,
                dispatch_scanned: full,
                dispatch_scan_count: scanned,
                category: '',
                quantity: qty,
                unit: '',
                status: full ? 'dispatched' : 'pending'
              };
              console.log('✅ QR code verified in database - belongs to selected order');
              setSelectedOrder(prev => {
                if (!prev || prev.items.some(i => i.id === matchingItem!.id || i.qr_code === matchingItem!.qr_code)) return prev;
                return {
                  ...prev,
                  items: [...prev.items, matchingItem!],
                  total_items: prev.total_items + qty,
                  pending_items: prev.pending_items + (full ? 0 : Math.max(0, qty - scanned)),
                  dispatched_items: prev.dispatched_items + (full ? qty : scanned)
                };
              });
            } else {
              // QR code belongs to a different order - fetch the actual order to show better error
              let actualOrderNumber = 'Unknown';
              try {
                const orderResponse = await makeRequestWithRetry(
                  `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${dbItem.purchase_order_id}&select=po_number&limit=1`,
                  {
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
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
      // Helper function to get fresh access token with refresh
      // Try localStorage FIRST to avoid auth.getSession() timeout
      const getFreshAccessToken = async (): Promise<string> => {
        const prefer = await getAccessTokenWithPersistenceFallback();
        if (prefer) return prefer;
        const sync = readPersistedAccessTokenSync();
        if (sync) return sync;
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
              // Token is expired or expiring soon, refresh it with timeout
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
        return SUPABASE_ANON_KEY;
      };
      
      // Get fresh access token
      let accessToken = await getFreshAccessToken();
      
      // Helper function to make RPC call with retry on 401 and timeout
      const makeRPCWithRetry = async (url: string, body: any): Promise<Response> => {
        const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 10000): Promise<Response> => {
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

        let response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body)
        }, 10000); // 10 second timeout
        
        // If 401, refresh token and retry once
        if (response.status === 401) {
          console.log('🔄 Got 401 for record_qr_scan, refreshing token and retrying...');
          accessToken = await getFreshAccessToken();
          
          // Retry with fresh token
          response = await fetchWithTimeout(url, {
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
      
      // Ensure all parameters are properly formatted
      const requestBody: Record<string, any> = {
          _qr_code: qrCode?.trim() || null,
          _scan_type: 'dispatch',
          _scanner_device_id: navigator.userAgent?.substring(0, 100) || null,
          _scanner_type: scannerType || 'web_scanner',
          _material_condition: materialCondition || 'good',
          _notes: notes?.trim() || null
      };
      
      // Remove null values that might cause issues (Supabase handles NULL differently)
      // But keep them for optional parameters - Supabase RPC should handle NULL
      
      console.log('📤 Sending RPC request:', {
        url: `${SUPABASE_URL}/rest/v1/rpc/record_qr_scan`,
        method: 'POST',
        body: requestBody,
        qrCode: qrCode,
        qrCodeLength: qrCode?.length
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
        console.error('❌ Dispatch scan HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: data,
          qrCode: qrCode,
          rawResponse: responseText?.substring(0, 1000),
          requestBody: requestBody
        });
        
        // Handle different error statuses
        if (response.status === 400) {
          // 400 usually means bad request - could be validation error or function error
          // Supabase PostgREST returns errors in various formats:
          // - { message: "...", details: "...", hint: "...", code: "..." }
          // - { error: "..." }
          // - Plain text or HTML
          let errorMsg = 'Invalid request. Please check the QR code format.';
          
          if (data) {
            if (typeof data === 'string') {
              errorMsg = data;
            } else if (data.message) {
              errorMsg = data.message;
              if (data.details) errorMsg += ` (${data.details})`;
              if (data.hint) errorMsg += ` Hint: ${data.hint}`;
            } else if (data.error) {
              errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            } else if (data.error_code) {
              // Function-level error code
              errorMsg = data.error || 'Invalid QR code';
            } else if (data.rawText) {
              errorMsg = data.rawText.substring(0, 200);
            } else {
              // Try to extract any error-like field
              const errorFields = Object.keys(data).filter(k => 
                k.toLowerCase().includes('error') || 
                k.toLowerCase().includes('message') ||
                k.toLowerCase().includes('detail')
              );
              if (errorFields.length > 0) {
                errorMsg = String(data[errorFields[0]]);
              } else {
                errorMsg = `Server error: ${JSON.stringify(data).substring(0, 200)}`;
              }
            }
          } else if (responseText) {
            errorMsg = responseText.substring(0, 200);
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
          toast.error(`Failed to record dispatch scan (${response.status})`, {
            description: errorMsg,
            duration: 6000
          });
        }
        return;
      }

      // Even if HTTP status is OK, check if the function returned an error
      const scanData = data as any;
      if (scanData && scanData.success === false) {
        console.error('❌ Dispatch scan function error:', scanData);
        
        // Handle specific error codes
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
          default:
            errorTitle = '❌ Scan Failed';
        }
        
        toast.error(errorTitle, { description: errorDescription, duration: 6000 });
        return;
      }

      // If we get here, the scan was successful
      if (scanData && scanData.success !== false) {
        const isPartialDispatch = scanData.new_status === 'partial_dispatch';
        // Only debounce when fully dispatched so same QR can be scanned again for quantity > 1
        if (!isPartialDispatch) {
          recentlyProcessedRef.current.set(qrCode, Date.now());
        }
        // Update local state immediately (use response for dispatch_scanned and dispatch_scan_count)
        setSelectedOrder(prev => {
          if (!prev) return prev;
          const dispatchScanned = scanData.dispatch_scanned === true;
          const dispatchScanCount = scanData.dispatch_scan_count ?? (dispatchScanned ? (scanData.quantity ?? 1) : 0);
          const updatedItems = prev.items.map(item =>
            normalizeQrCode(item.qr_code) === qrCode
              ? {
                  ...item,
                  dispatch_scanned: dispatchScanned,
                  dispatch_scanned_at: dispatchScanned ? new Date().toISOString() : item.dispatch_scanned_at,
                  dispatch_scan_count: dispatchScanCount,
                  status: dispatchScanned ? 'dispatched' : item.status
                }
              : item
          );
          const dispatchedCount = updatedItems.filter(i => i.dispatch_scanned).length;
          const remainingItems = updatedItems.reduce(
            (sum, i) => sum + (i.dispatch_scanned ? 0 : Math.max(0, (i.quantity || 1) - (i.dispatch_scan_count || 0))),
            0
          );
          return {
            ...prev,
            items: updatedItems,
            dispatched_items: dispatchedCount,
            pending_items: remainingItems
          };
        });

        const scanResult: ScanResult = {
          qr_code: scanData.qr_code,
          material_type: scanData.material_type,
          category: scanData.category,
          quantity: scanData.quantity,
          unit: scanData.unit,
          status: scanData.new_status ?? scanData.status,
          timestamp: new Date()
        };

        setScanResults(prev => [scanResult, ...prev.slice(0, 9)]);

        // Remaining: from updated state (same formula as in setSelectedOrder)
        const qty = scanData.quantity ?? 1;
        const count = scanData.dispatch_scan_count ?? (scanData.dispatch_scanned ? qty : 0);
        const remainingForThis = scanData.dispatch_scanned ? 0 : Math.max(0, qty - count);
        const remainingOthers = selectedOrder.items
          .filter(i => normalizeQrCode(i.qr_code) !== qrCode)
          .reduce((s, i) => s + (i.dispatch_scanned ? 0 : Math.max(0, (i.quantity || 1) - (i.dispatch_scan_count || 0))), 0);
        const remainingItems = remainingForThis + remainingOthers;
        
        // STEP 1: Update delivery_request to 'dispatched' status when supplier dispatches
        // This moves the order to "In Transit" tab for delivery provider
        if (selectedOrder.id) {
          try {
            console.log('📦 Updating delivery_request to dispatched for purchase_order_id:', selectedOrder.id);
            
            // Get fresh access token
            const freshToken = await getFreshAccessToken();
            if (!freshToken) {
              console.warn('⚠️ Could not get access token for delivery_request update');
            } else {
              const deliveryRequestResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${selectedOrder.id}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${freshToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    status: 'dispatched',
                    updated_at: new Date().toISOString()
                  })
                }
              );
              
              if (deliveryRequestResponse.ok) {
                const updatedDeliveryRequest = await deliveryRequestResponse.json();
                console.log('✅ Delivery request updated to dispatched status:', updatedDeliveryRequest);
              } else {
                const errorText = await deliveryRequestResponse.text();
                console.warn('⚠️ Could not update delivery_request to dispatched:', deliveryRequestResponse.status, errorText);
              }
            }
          } catch (e) {
            console.warn('⚠️ Error updating delivery_request to dispatched:', e);
            // Don't block the success flow if this fails
          }
        }
        
        if (remainingItems === 0) {
          toast.success('🎉 ALL ITEMS DISPATCHED!', {
            description: `Order #${selectedOrder.order_number} is complete and ready for delivery!`,
            duration: 8000
          });
        } else if (isPartialDispatch && qty > 1) {
          toast.success('✅ Scan recorded', {
            description: `${scanData.material_type}: Scanned ${count} of ${qty} • ${remainingItems} unit${remainingItems !== 1 ? 's' : ''} remaining`,
            duration: 3000
          });
        } else {
          toast.success('✅ Item Dispatched', {
            description: `${scanData.material_type} (Item #${matchingItem.item_sequence}) • ${remainingItems} item${remainingItems > 1 ? 's' : ''} remaining`,
            duration: 3000
          });
        }

        setManualQRCode('');
        setNotes('');
      }
    } catch (error) {
      console.error('Scan processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        toast.error('Request Timeout', {
          description: 'The scan request took too long. Please check your connection and try again.',
          duration: 5000
        });
      } else {
        toast.error('Failed to process scan', {
          description: errorMessage,
          duration: 5000
        });
      }
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
  const isBuilder = (userRole || '').toLowerCase() === 'builder';
  const allowAccess = ['supplier', 'admin'].includes((userRole || '').toLowerCase());

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-blue-600" />
              Dispatch Scanner
            </h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Select an order to dispatch its materials
            </p>
          </div>
          <Button variant="outline" onClick={fetchOrders} disabled={loadingOrders} className="w-full sm:w-auto shrink-0">
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <Button variant="ghost" onClick={goBackToOrderSelection} className="shrink-0 self-start">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        
        <div className="min-w-0 sm:flex-1 sm:text-right">
          <h2 className="text-lg sm:text-xl font-bold break-words">Order #{selectedOrder.order_number || 'Loading...'}</h2>
          <p className="text-sm text-muted-foreground">{selectedOrder.buyer_name}</p>
        </div>
      </div>

      {/* Delivery Provider Warning */}
      {purchaseOrderRequiresDeliveryProvider(selectedOrder) && !selectedOrder.delivery_provider_id && (
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
            <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="bg-green-600 p-2 rounded-lg shrink-0">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-green-800 text-sm sm:text-base">📷 Scan Physical QR Codes</span>
                  <p className="text-xs font-normal text-green-600 mt-0.5">
                    Point camera at QR stickers on materials
                  </p>
                </div>
              </div>
              {availableCameras.length > 0 && (
                <Badge className="bg-green-600 w-fit shrink-0">
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
            <div className="relative bg-black rounded-xl overflow-hidden w-full min-h-[min(50vh,320px)] sm:min-h-[400px] md:min-h-[500px] max-h-[70vh]">
              <div
                id={scannerContainerId}
                className="w-full h-full min-h-[min(50vh,320px)] sm:min-h-[400px] md:min-h-[500px]"
                style={{ width: '100%', height: '100%', minHeight: 'inherit' }}
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
                  {/* Centered target — must be sibling of #dispatch-qr-scanner, not inside it (library owns that DOM) */}
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
                        {item.quantity > 1 && (item.dispatch_scan_count ?? 0) > 0 && !item.dispatch_scanned && (
                          <> • Scanned {item.dispatch_scan_count} of {item.quantity}</>
                        )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              All {selectedOrder.total_items} items have been dispatched for Order #{selectedOrder.order_number || 'N/A'}
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
      <CardContent className="py-3 px-3 sm:py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isComplete ? 'bg-green-100' : 'bg-amber-100'
            }`}>
              {isComplete ? (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              ) : (
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base sm:text-lg break-words">Order #{order.order_number || 'Loading...'}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="break-words">{order.buyer_name}</span>
                {orderDate && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 sm:justify-end sm:gap-4">
            <div className="text-left sm:text-right min-w-0 flex-1 sm:flex-none sm:min-w-[7rem]">
              <p className="text-xs sm:text-sm font-medium">
                {order.dispatched_items}/{order.total_items} dispatched
              </p>
              <Progress 
                value={(order.dispatched_items / order.total_items) * 100} 
                className="h-2 w-full sm:w-24 mt-1"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end gap-1">
                <Badge className={isComplete ? 'bg-green-600' : 'bg-amber-600'}>
                  {isComplete ? 'Complete' : `${order.pending_items} pending`}
                </Badge>
                <span className="text-[10px] sm:text-xs text-blue-600 font-medium whitespace-nowrap">Tap to open</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
