import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck, Scan, CheckCircle, Camera, Truck, MapPin, Lock, ArrowRight, RotateCcw, Smartphone, Flashlight, AlertCircle } from 'lucide-react';
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

interface ReceivingScannerProps {
  /** Called after successful scan. Passes true if the full order was completed (all items received). */
  onDeliveryComplete?: (orderCompleted?: boolean) => void;
}

export const ReceivingScanner: React.FC<ReceivingScannerProps> = ({ onDeliveryComplete }) => {
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
      stopScanning();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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

  const checkAuth = async () => {
    try {
      const localRole = localStorage.getItem('user_role');
      if (localRole) {
        setUserRole(localRole);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || localRole || null);
    } catch (err) {
      console.error('Auth check failed (non-fatal):', err);
      const localRole = localStorage.getItem('user_role');
      setUserRole(localRole || null);
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
        async (decodedText, decodedResult) => {
          const now = Date.now();
          
          console.log('🎯 QR DETECTED! Raw text:', decodedText);
          console.log('🎯 Decoded result:', decodedResult);
          
          // Quick debounce: prevent rapid duplicate scans within 1 second
          if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 1000) {
            console.log('🔄 Debounced duplicate scan (within 1s):', decodedText);
            return;
          }
          
          // Check if this QR code was already processed in this session (never process same code twice)
          if (recentlyProcessedRef.current.has(decodedText)) {
            console.log('⏭️ Skipping already processed QR code:', decodedText);
            return;
          }
          
          // Mark as processed immediately (session-based check)
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          recentlyProcessedRef.current.set(decodedText, now);
          
          console.log('✅ PROCESSING QR CODE NOW:', decodedText);
          
          // Stop scanning temporarily to prevent duplicate scans while processing
          // We'll resume after processing completes
          try {
            if (scannerRef.current) {
              const state = scannerRef.current.getState();
              if (state === Html5QrcodeScannerState.SCANNING) {
                await scannerRef.current.pause();
                console.log('⏸️ Scanner paused for processing');
              }
            }
          } catch (pauseError) {
            console.warn('⚠️ Could not pause scanner:', pauseError);
          }
          
          // EARLY CHECK: Verify QR code hasn't been scanned in database (non-blocking)
          // This prevents re-scanning even after page refresh, but doesn't block if check fails
          const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
          const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
          
          // Run check in background (don't await - process immediately)
          (async () => {
            try {
              let accessToken = ANON_KEY;
              try {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session?.access_token) {
                  accessToken = sessionData.session.access_token;
                }
              } catch (e) {
                console.warn('Could not get session:', e);
              }
              
              const checkResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${encodeURIComponent(decodedText)}&select=receive_scanned,status&limit=1`,
                {
                  headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                  }
                }
              );
              
              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (checkData && checkData.length > 0) {
                  const item = checkData[0];
                  if (item.receive_scanned === true || item.status === 'received' || item.status === 'delivered') {
                    console.log('⏭️ QR code already scanned in database:', decodedText);
                    toast.warning('⚠️ Already Scanned', {
                      description: 'This QR code has already been scanned. Processing will be skipped.',
                      duration: 3000,
                    });
                    // Note: We'll still process it, but the actual processing function will check again
                  }
                }
              }
            } catch (checkError) {
              console.warn('⚠️ Could not check database (non-blocking):', checkError);
              // Don't block - allow processing to continue
            }
          })();
          
          // Show success message immediately
          toast.success('✅ QR Code Scanned Successfully!', {
            description: `Processing: ${decodedText.substring(0, 30)}...`,
            duration: 3000,
          });
          
          // Process the scan (this will handle the database update)
          await processQRScan(decodedText, 'mobile_camera');
          
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
            // Audio not supported
          }
          
          // Call processQRScan and handle errors with timeout
          // Increased timeout to 60 seconds to allow RPC to complete (RPC has 45s timeout + network delays)
          const processPromise = processQRScan(decodedText, 'mobile_camera');
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Scan processing timeout after 60 seconds')), 60000)
          );
          
          Promise.race([processPromise, timeoutPromise])
            .then((result) => {
              // Success - processQRScan completed
              console.log('✅ processQRScan completed successfully');
            })
            .catch((error) => {
              console.error('❌ Error in processQRScan:', error);
              console.error('❌ Error type:', error?.constructor?.name);
              console.error('❌ Error message:', error?.message);
              console.error('❌ Full error:', error);
              toast.error('❌ Scan Processing Error', {
                description: error?.message || 'Failed to process QR code. Please try again.',
              duration: 5000,
            });
          });
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
    const startTime = Date.now();
    try {
      console.log('🔍 Processing QR scan for RECEIVING:', qrCode);
      console.log('📱 Scanner type:', scannerType);
      console.log('📦 Material condition:', materialCondition);
      console.log('⏱️ Process started at:', new Date().toISOString());
      
      // Show immediate feedback
      toast.info('Processing scan...', { duration: 2000 });
      
      // Get auth token - use Supabase session for proper authentication
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get current session from Supabase (most reliable method)
      // OPTIMIZED: Try localStorage first (faster), then Supabase session as fallback
      let accessToken = ANON_KEY;
      
      // STRATEGY: Try localStorage first (instant, no network call)
          try {
            const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
          if (parsed.access_token) {
            // Check if token is expired (basic check - if expired, try to refresh)
            const tokenExp = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
            const now = new Date();
            const buffer = 5 * 60 * 1000; // 5 minutes buffer
            
            if (!tokenExp || tokenExp.getTime() > now.getTime() + buffer) {
              // Token is still valid
              accessToken = parsed.access_token;
              console.log('🔐 Using localStorage token (fast path, token valid)');
            } else {
              // Token expired, try to get fresh session
              console.log('⚠️ localStorage token expired, trying Supabase session...');
              throw new Error('Token expired');
            }
          }
        }
      } catch (localStorageError) {
        // localStorage failed or token expired, try Supabase session
        console.log('🔄 localStorage token not available or expired, trying Supabase session...');
        
        try {
          // Try Supabase session with shorter timeout (3 seconds) since localStorage already failed
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Session fetch timeout after 3 seconds')), 3000)
          );
          
          const { data: sessionData, error: sessionError } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any;
          
          if (sessionData?.session?.access_token) {
            accessToken = sessionData.session.access_token;
            console.log('🔐 Using Supabase session token (authenticated)');
          } else {
            console.warn('⚠️ No active Supabase session, using anon key (RLS may block)');
          }
        } catch (sessionError) {
          console.warn('⚠️ Supabase session fetch failed:', sessionError?.message || 'Unknown error');
          // Final fallback: try localStorage one more time (maybe it was a parse error)
        try {
          const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (stored) {
            const parsed = JSON.parse(stored);
            accessToken = parsed.access_token || ANON_KEY;
              console.log('🔐 Using localStorage token (final fallback)');
            } else {
              console.warn('⚠️ No access token available, using anon key (RLS may block)');
            }
          } catch (e2) {
            console.error('❌ Error reading localStorage token:', e2);
            console.warn('⚠️ Using anon key - RLS policies may block access');
          }
        }
      }
      
      console.log('🔐 Access token status:', accessToken !== ANON_KEY ? 'Authenticated token found' : 'Using anon key (RLS may block)');
      console.log('⏱️ After auth token fetch:', Date.now() - startTime, 'ms');
      
      // Clean up the QR code - handle different formats
      let cleanQRCode = qrCode.trim();
      console.log('📦 Raw QR code scanned:', cleanQRCode);
      console.log('⏱️ After QR cleanup:', Date.now() - startTime, 'ms');
      
      // If QR code is a URL, extract the code part
      if (cleanQRCode.includes('/qr/') || cleanQRCode.includes('?code=')) {
        const urlMatch = cleanQRCode.match(/(?:\/qr\/|[?&]code=)([^&\s]+)/);
        if (urlMatch) {
          cleanQRCode = urlMatch[1];
          console.log('📦 Extracted QR code from URL:', cleanQRCode);
        }
      }
      
      // Remove any URL encoding that might have been applied
      try {
        cleanQRCode = decodeURIComponent(cleanQRCode);
      } catch (e) {
        // Already decoded or not encoded
      }
      
      // Step 0: Quick check if already scanned (blocking, but fast)
      // Try format variations to find the item
      console.log('🔍 Quick check: Is QR code already scanned?');
      try {
        const qrVariations = [
          cleanQRCode, // Original
          cleanQRCode.replace(/^UJP-FILM-/, ''), // Remove UJP-FILM- prefix
          cleanQRCode.replace(/^UJP-/, ''), // Remove UJP- prefix
          cleanQRCode.match(/PO-\d{13,}-[A-Z0-9]+/)?.[0] || '', // Extract PO- format
          cleanQRCode.match(/\d{13,}/)?.[0] || '', // Extract numeric part
        ].filter(v => v && v !== '');

        let alreadyScanned = false;

        for (const variant of qrVariations) {
          if (!variant) continue;
          
          try {
            const quickCheckResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${encodeURIComponent(variant)}&select=receive_scanned,status,id&limit=1`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
              'Prefer': 'return=representation'
            }
          }
        );
        
            if (quickCheckResponse.ok) {
              const quickCheckData = await quickCheckResponse.json();
              if (quickCheckData && quickCheckData.length > 0) {
                const item = quickCheckData[0];
                if (item.receive_scanned === true || item.status === 'received' || item.status === 'delivered') {
                  console.log(`⏭️ QR code already scanned (found with variant: ${variant.substring(0, 30)}...) - skipping RPC call`);
                  toast.warning('⚠️ Already Scanned', {
                    description: 'This QR code has already been scanned and received.',
                    duration: 3000,
                  });
                  alreadyScanned = true;
                  break;
                }
              }
            }
          } catch (variantError) {
            // Continue to next variant
            continue;
          }
        }

        if (alreadyScanned) {
          return; // Skip processing entirely
        }
      } catch (quickCheckError) {
        console.warn('⚠️ Quick check failed (non-blocking):', quickCheckError);
        // Continue with RPC call even if quick check fails
      }
      
      // Step 1: Use RPC FIRST (bypasses RLS - delivery providers don't have direct access to material_items)
      // REST API will fail for delivery providers due to RLS restrictions
      // RPC uses SECURITY DEFINER and can access material_items regardless of RLS
      console.log('📦 Using RPC as PRIMARY method (bypasses RLS for delivery providers)...');
      console.log('⏱️ RPC call started at:', new Date().toISOString());
      
      let scanResult: any = null;
      let deliveryRequestUpdated = false;
      const rpcStartTime = Date.now();
      let lastError: any = null; // Track last error for final error message
      
      // STRATEGY: Try simplified RPC FIRST (faster, direct PO lookup) before complex RPC
      console.log('🔄 Trying simplified RPC function FIRST (direct PO + item lookup, 10s timeout)...');
      let simpleRpcSucceeded = false;
      try {
        const simpleRpcPromise = supabase.rpc('record_qr_scan_simple', {
          _qr_code: cleanQRCode,
          _scan_type: 'receiving',
          _scanner_device_id: deviceInfo || null,
          _scanner_type: scannerType === 'mobile_camera' ? 'mobile_camera' : 'web_scanner',
          _material_condition: materialCondition || 'good'
        });
        
        const simpleRpcTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Simple RPC timeout after 10 seconds')), 10000)
        );
        
        const { data: simpleRpcData, error: simpleRpcError } = await Promise.race([
          simpleRpcPromise,
          simpleRpcTimeoutPromise
        ]) as any;
        
        if (!simpleRpcError && simpleRpcData?.success === true) {
          console.log('✅ Simplified RPC succeeded!');
          scanResult = {
            success: true,
            qr_code: simpleRpcData.qr_code || cleanQRCode,
            material_type: simpleRpcData.material_type || 'Unknown',
            status: simpleRpcData.status || 'received',
            scan_event_id: simpleRpcData.scan_event_id,
            order_completed: simpleRpcData.order_completed || false // Track if all items are received
          };
          deliveryRequestUpdated = true;
          simpleRpcSucceeded = true;
          const simpleRpcElapsed = Date.now() - rpcStartTime;
          console.log(`✅ Simplified RPC: Scan completed successfully in ${simpleRpcElapsed}ms`);
          console.log(`📦 Order completed: ${simpleRpcData.order_completed ? 'YES - All items received' : 'NO - More items pending'}`);
          
          // If order is completed, the RPC function has already updated purchase_orders and delivery_requests
          // Real-time subscriptions should catch these updates, but we'll add a small delay to ensure DB commit
          if (simpleRpcData.order_completed === true) {
            console.log('🎉 All items received! Order status updated to delivered by RPC function.');
            console.log('📡 Real-time subscriptions should update supplier and provider dashboards automatically.');
          }
        } else if (simpleRpcError) {
          console.log('⚠️ Simplified RPC failed:', simpleRpcError.message);
          // Continue to complex RPC fallback
        } else {
          console.log('⚠️ Simplified RPC returned unsuccessful result');
          // Continue to complex RPC fallback
        }
      } catch (simpleRpcError: any) {
        console.log('⚠️ Simplified RPC exception:', simpleRpcError.message);
        // Continue to complex RPC fallback
      }
      
      // If simple RPC succeeded, skip complex RPC and REST API
      if (simpleRpcSucceeded) {
        console.log('✅ Using simple RPC result, skipping complex RPC and REST API fallback');
        // Continue to success flow below - scanResult is already set
      } else {
        // FALLBACK: Try complex RPC function (handles more format variations)
        console.log('🔄 Simplified RPC failed - trying complex RPC function (45s timeout)...');
        try {
          console.log('🔄 Calling record_qr_scan RPC function...');
          
          // Try RPC with original QR code first
          const rpcPromise = supabase.rpc('record_qr_scan', {
            _qr_code: cleanQRCode,
            _scan_type: 'receiving',
            _scanner_device_id: deviceInfo || null,
            _scanner_type: scannerType === 'mobile_camera' ? 'mobile_camera' : 'web_scanner',
            _scan_location: null,
            _material_condition: materialCondition || 'good',
            _quantity_scanned: null,
            _notes: notes || null,
            _photo_url: null
          });
          
          // Set timeout to 45 seconds (RPC can be slow with database operations, especially when updating multiple tables)
          const rpcTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('RPC timeout after 45 seconds')), 45000)
          );
          
          const { data: rpcResult, error: rpcError } = await Promise.race([
            rpcPromise,
            rpcTimeoutPromise
          ]) as any;
          
          if (rpcError) {
            // If QR_NOT_FOUND, try variations
            if (rpcError.message?.includes('QR_NOT_FOUND') || rpcError.code === 'QR_NOT_FOUND') {
              console.log('⚠️ RPC: QR code not found, trying variations...');
              
              // Try QR code variations
              const qrVariations = [
                cleanQRCode.replace(/^UJP-FILM-/, ''), // Remove UJP-FILM- prefix
                cleanQRCode.replace(/^UJP-/, ''), // Remove UJP- prefix
                cleanQRCode.match(/PO-\d{13,}-[A-Z0-9-]+/)?.[0] || '', // Extract PO- format
              ].filter(v => v && v !== '');
              
              let foundViaVariation = false;
              for (const variant of qrVariations) {
                try {
                  const variantPromise = supabase.rpc('record_qr_scan', {
                    _qr_code: variant,
                    _scan_type: 'receiving',
                    _scanner_device_id: deviceInfo || null,
                    _scanner_type: scannerType === 'mobile_camera' ? 'mobile_camera' : 'web_scanner',
                    _scan_location: null,
                    _material_condition: materialCondition || 'good',
                    _quantity_scanned: null,
                    _notes: notes || null,
                    _photo_url: null
                  });
                  
                  const variantTimeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('RPC variant timeout')), 15000)
                  );
                  
                  const { data: variantResult, error: variantError } = await Promise.race([
                    variantPromise,
                    variantTimeoutPromise
                  ]) as any;
                  
                  if (!variantError && variantResult?.success === true) {
                    scanResult = variantResult;
                    foundViaVariation = true;
                    console.log(`✅ RPC: Found with variation: ${variant.substring(0, 50)}...`);
                    break;
                  }
                } catch (variantErr) {
                  console.log(`⚠️ RPC: Variant ${variant.substring(0, 30)}... failed`);
                  continue;
                }
              }
              
              if (!foundViaVariation) {
                throw rpcError; // Re-throw original error if no variation worked
              }
          } else {
              throw rpcError; // Re-throw other errors
          }
          } else if (rpcResult?.success === true) {
            scanResult = {
              ...rpcResult,
              order_completed: rpcResult.order_completed || false // Ensure order_completed is included
            };
            console.log('✅ RPC: Scan successful');
            console.log(`📦 Order completed: ${rpcResult.order_completed ? 'YES - All items received' : 'NO - More items pending'}`);
            
            // If order is completed, the RPC function has already updated purchase_orders and delivery_requests
            if (rpcResult.order_completed === true) {
              console.log('🎉 All items received! Order status updated to delivered by RPC function.');
              console.log('📡 Real-time subscriptions should update supplier and provider dashboards automatically.');
            }
        } else {
            throw new Error('RPC returned unsuccessful result');
          }
          
          const rpcElapsed = Date.now() - rpcStartTime;
          console.log(`✅ RPC: Scan completed successfully in ${rpcElapsed}ms`);
          
          // RPC handles everything, so we can proceed with success flow
          deliveryRequestUpdated = true;
          
        } catch (rpcError: any) {
          console.error('❌ Complex RPC method also failed:', rpcError);
          const rpcElapsed = Date.now() - rpcStartTime;
          console.error(`⏱️ Complex RPC failed after ${rpcElapsed}ms`);
          lastError = rpcError; // Store error for final error message
          
          // Final fallback: REST API (may fail due to RLS, but worth trying)
          // If RPC fails, try REST API as fallback (may fail due to RLS, but worth trying)
          console.log('🔄 RPC failed - trying REST API as fallback...');
        
          // REST API fallback code (existing REST API logic)
          try {
          // Try different QR code formats to find the item
          // Extract various parts of the QR code for flexible matching
          const numericPart = cleanQRCode.match(/\d{13,}/)?.[0] || '';
          const poPart = cleanQRCode.match(/PO-\d{13,}/)?.[0] || '';
          const itemPart = cleanQRCode.match(/ITEM\d+/)?.[0] || '';
          const unitPart = cleanQRCode.match(/UNIT\d+/)?.[0] || '';
          // Extract date and random suffix
          const dateMatch = cleanQRCode.match(/(\d{8})-\d{4}$/);
          const datePart = dateMatch ? dateMatch[1] : (cleanQRCode.match(/\d{8}/)?.[0] || '');
          const randomSuffix = cleanQRCode.match(/\d{8}-(\d{4})$/)?.[1] || cleanQRCode.match(/-(\d{4})$/)?.[1] || '';
          
          // Try to reconstruct QR codes in different formats that might be in the database
          // Format 1: UJP-FILM-PO-{PO}-ITEM{ITEM}-{DATE}-{RANDOM} (older format, no buyer/unit)
          const reconstructedOldFormat = numericPart && itemPart && datePart && randomSuffix
            ? `UJP-FILM-PO-${numericPart}-${itemPart}-${datePart}-${randomSuffix}`
            : null;
          
          // Format 2: UJP-FILM-PO-{PO}-{BUYER}-ITEM{ITEM}-UNIT{UNIT}-{DATE}-{RANDOM} (newer format)
          const buyerCode = cleanQRCode.match(/PO-\d{13,}-([A-Z0-9]+)-ITEM/)?.[1] || '';
          const reconstructedNewFormat = numericPart && buyerCode && itemPart && unitPart && datePart && randomSuffix
            ? `UJP-FILM-PO-${numericPart}-${buyerCode}-${itemPart}-${unitPart}-${datePart}-${randomSuffix}`
            : null;
          
          // Format 3: Without buyer code but with unit
          const reconstructedNoBuyer = numericPart && itemPart && unitPart && datePart && randomSuffix
            ? `UJP-FILM-PO-${numericPart}-${itemPart}-${unitPart}-${datePart}-${randomSuffix}`
            : null;
          
          const qrVariations = [
            cleanQRCode, // Original
            reconstructedNewFormat, // Reconstructed new format (with buyer and unit)
            reconstructedNoBuyer, // Reconstructed without buyer code
            reconstructedOldFormat, // Reconstructed old format (no buyer/unit)
            cleanQRCode.replace(/^UJP-FILM-/, ''), // Remove UJP-FILM- prefix
            cleanQRCode.replace(/^UJP-/, ''), // Remove UJP- prefix
            // Try without buyer code
            cleanQRCode.replace(/-[A-Z0-9]+-ITEM/, '-ITEM'), // Remove buyer code
            poPart, // Extract PO- format
            numericPart, // Extract numeric part
            itemPart, // Extract ITEM-UNIT format
          ].filter(v => v && v !== '');

        let foundItem: any = null;
        let foundVariant = '';

        // Try exact matches first (sequential for better error handling)
        for (const variant of qrVariations) {
          if (!variant) continue;
          
          try {
            console.log(`🔍 REST API: Trying exact match: ${variant.substring(0, 50)}...`);
            const findItemResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${encodeURIComponent(variant)}&select=id,purchase_order_id,receive_scanned,dispatch_scanned,qr_code,material_type,quantity,unit&limit=1`,
                {
                  headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                  }
                }
              );
              
            if (findItemResponse.ok) {
              const itemData = await findItemResponse.json();
              if (itemData && itemData.length > 0) {
                foundItem = itemData[0];
                foundVariant = variant;
                console.log(`✅ REST API: Found item with exact match: ${foundVariant.substring(0, 50)}...`);
                console.log(`   Database QR code: ${foundItem.qr_code}`);
                  break;
                }
            } else {
              const errorText = await findItemResponse.text();
              console.log(`⚠️ REST API: Query returned ${findItemResponse.status} for ${variant.substring(0, 30)}...`);
            }
          } catch (variantError) {
            console.log(`⚠️ REST API: Exact match failed for ${variant.substring(0, 30)}...:`, variantError);
            continue;
          }
        }
        
        // If exact match failed, try pattern matching with ilike (PostgREST uses % for wildcards)
        if (!foundItem && numericPart) {
          try {
            console.log(`🔍 REST API: Trying pattern match with PO number: ${numericPart}...`);
            // PostgREST ilike syntax: ilike.*pattern* where * becomes %
            // Try matching by PO number first (most specific)
            const poPattern = `PO-${numericPart}`;
            const findItemResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?qr_code=ilike.*${encodeURIComponent(poPattern)}*&select=id,purchase_order_id,receive_scanned,dispatch_scanned,qr_code,material_type,quantity,unit&limit=50`,
              {
                headers: {
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json'
                }
              }
            );
            
            if (findItemResponse.ok) {
              const itemData = await findItemResponse.json();
              console.log(`📊 REST API: Pattern match found ${itemData.length} potential matches for PO ${numericPart}`);
              
              if (itemData && itemData.length > 0) {
                // Find the best match - prefer ones that match item/unit/date
                const bestMatch = itemData.find((item: any) => {
                  const itemQR = item.qr_code || '';
                  // Match by item number and date if available
                  if (itemPart && itemQR.includes(itemPart)) {
                    if (datePart && itemQR.includes(datePart)) {
                      return true; // Perfect match on item and date
                    }
                    return true; // Good match on item
                  }
                  return false;
                }) || itemData.find((item: any) => {
                  const itemQR = item.qr_code || '';
                  // Match by date if available
                  return datePart && itemQR.includes(datePart);
                }) || itemData.find((item: any) => {
                  const itemQR = item.qr_code || '';
                  // Match by item number
                  return itemPart && itemQR.includes(itemPart);
                }) || itemData[0]; // Fallback to first result
                
                foundItem = bestMatch;
                foundVariant = foundItem.qr_code;
                console.log(`✅ REST API: Found item with pattern match: ${foundVariant.substring(0, 50)}...`);
                console.log(`   Database QR code: ${foundItem.qr_code}`);
                console.log(`   Scanned QR code: ${cleanQRCode.substring(0, 50)}...`);
                console.log(`   Match confidence: ${foundItem.qr_code === cleanQRCode ? 'EXACT' : 'PARTIAL'}`);
              }
            } else {
              const errorText = await findItemResponse.text();
              console.log(`⚠️ REST API: Pattern match query failed: ${findItemResponse.status} ${errorText.substring(0, 100)}`);
            }
          } catch (patternError) {
            console.log(`⚠️ REST API: Pattern match failed:`, patternError);
          }
        }
        
        // AGGRESSIVE: If still not found, try querying by purchase_order_id and item_sequence
        if (!foundItem && numericPart && itemPart) {
          try {
            const itemSeqMatch = itemPart.match(/\d+/)?.[0];
            if (itemSeqMatch) {
              console.log(`🔍 REST API: Trying query by PO number and item sequence...`);
              console.log(`   PO number: ${numericPart}, Item sequence: ${itemSeqMatch}`);
              
              // First, find purchase_order by po_number
              const poResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/purchase_orders?po_number=ilike.*${encodeURIComponent(numericPart)}*&select=id,po_number&limit=10`,
              {
                headers: {
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                  }
                }
              );
              
              if (poResponse.ok) {
                const poData = await poResponse.json();
                console.log(`📊 REST API: Found ${poData.length} purchase orders matching PO number`);
                
                if (poData && poData.length > 0) {
                  // Try each purchase order
                  for (const po of poData) {
                    const itemSeq = parseInt(itemSeqMatch, 10);
                    const itemResponse = await fetch(
                      `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=eq.${po.id}&item_sequence=eq.${itemSeq}&select=id,purchase_order_id,receive_scanned,dispatch_scanned,qr_code,material_type,quantity,unit&limit=1`,
                      {
                        headers: {
                          'apikey': ANON_KEY,
                          'Authorization': `Bearer ${accessToken}`,
                          'Accept': 'application/json'
                        }
                      }
                    );
                    
                    if (itemResponse.ok) {
                      const itemData = await itemResponse.json();
                      if (itemData && itemData.length > 0) {
                        foundItem = itemData[0];
                        foundVariant = foundItem.qr_code;
                        console.log(`✅ REST API: Found item by PO ID + item sequence!`);
                        console.log(`   Database QR code: ${foundItem.qr_code}`);
                        console.log(`   Scanned QR code: ${cleanQRCode.substring(0, 50)}...`);
                        break;
                      }
                    }
                  }
                }
              }
            }
          } catch (poQueryError) {
            console.warn('⚠️ REST API: PO-based query failed:', poQueryError);
          }
        }
        
        if (!foundItem) {
          console.error('❌ REST API: Item not found with any QR code variation or PO-based query');
          toast.error('❓ QR Code Not Found', {
            description: `"${cleanQRCode.substring(0, 30)}..." not in system. Please verify the QR code is correct.`,
            duration: 8000
          });
          return;
        }
        
        if (foundItem.receive_scanned) {
          console.log('⏭️ Item already received - skipping');
          toast.warning('⚠️ Already Scanned', {
            description: 'This QR code has already been scanned.',
            duration: 3000
          });
          return;
        }
      
        const itemId = foundItem.id;
        const purchaseOrderId = foundItem.purchase_order_id;
        
        // First, insert scan event (like RPC function does)
        console.log('📝 REST API: Inserting scan event...');
        let scanEventId: string | null = null;
        try {
          const scanEventResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/qr_scan_events`,
            {
              method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
                qr_code: foundItem.qr_code || foundVariant,
                scan_type: 'receiving',
                scanner_device_id: deviceInfo || null,
                scanner_type: scannerType === 'mobile_camera' ? 'mobile_camera' : 'web_scanner',
                scan_location: null,
                material_condition: materialCondition || 'good',
                quantity_scanned: null,
                notes: notes || null,
                photo_url: null
          })
        }
      );
      
          if (scanEventResponse.ok) {
            const scanEventData = await scanEventResponse.json();
            scanEventId = scanEventData[0]?.id || null;
            console.log('✅ REST API: Scan event inserted');
          } else {
            console.warn('⚠️ REST API: Failed to insert scan event (non-critical)');
          }
        } catch (scanEventError) {
          console.warn('⚠️ REST API: Error inserting scan event (non-critical):', scanEventError);
          // Continue anyway - scan event is not critical
        }
        
        // Update material_item directly
        console.log('📝 REST API: Updating material_item...');
        const updateItemBody: any = {
          receive_scanned: true,
          receive_scanned_at: new Date().toISOString(),
          status: 'received',
          updated_at: new Date().toISOString()
        };
        
        if (scanEventId) {
          updateItemBody.receiving_scan_id = scanEventId;
        }
        
        const updateItemResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/material_items?id=eq.${itemId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateItemBody)
          }
        );
        
        if (!updateItemResponse.ok) {
          const errorText = await updateItemResponse.text();
          console.error('❌ REST API: Failed to update material_item:', errorText);
          throw new Error('Failed to update material_item');
        }
        
        console.log('✅ REST API: Material item updated successfully');
        
        // Check if all items in the order are received
        if (purchaseOrderId) {
          console.log('🔍 REST API: Checking if all items are received for purchase_order:', purchaseOrderId);
          
          try {
            // Get all items for this purchase order
            const allItemsResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=eq.${purchaseOrderId}&select=id,receive_scanned&limit=1000`,
            {
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            }
          );
          
            if (allItemsResponse.ok) {
              const allItems = await allItemsResponse.json();
              const totalItems = allItems.length;
              const receivedItems = allItems.filter((item: any) => item.receive_scanned === true).length;
              
              console.log(`📊 REST API: Order items status: ${receivedItems}/${totalItems} received`);
              
              // If all items are received, update purchase_order and delivery_request
              if (totalItems > 0 && receivedItems === totalItems) {
                console.log('✅ REST API: All items received - updating order status to delivered');
                
                // Update purchase_order status
                try {
                  const updatePOResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrderId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    status: 'delivered',
                    delivery_status: 'delivered',
                    delivered_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                }
              );
              
                  if (updatePOResponse.ok) {
                    console.log('✅ REST API: Purchase order status updated to delivered');
                  }
                } catch (poError) {
                  console.warn('⚠️ REST API: Failed to update purchase_order status:', poError);
                }
                
                // Update delivery_request status
                try {
                  const updateDRResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${purchaseOrderId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    status: 'delivered',
                        delivered_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                }
              );
              
                  if (updateDRResponse.ok) {
                    console.log('✅ REST API: Delivery request status updated to delivered');
                    deliveryRequestUpdated = true;
                  }
                } catch (drError) {
                  console.warn('⚠️ REST API: Failed to update delivery_request status:', drError);
                }
              }
            }
          } catch (checkError) {
            console.warn('⚠️ REST API: Failed to check all items status:', checkError);
            // Continue anyway - the item was updated successfully
          }
        }
        
        // Check if both dispatch and receive are done (for QR invalidation)
        // Since we just set receive_scanned to true, check if dispatch_scanned was already true
        const isInvalidated = foundItem.dispatch_scanned === true; // receive_scanned is now true after our update
        
        // If invalidated, update the QR code to mark it as invalidated
        if (isInvalidated) {
          try {
            const invalidateResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?id=eq.${itemId}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  is_invalidated: true,
                  invalidated_at: new Date().toISOString(),
                  status: 'verified'
                })
              }
            );
            
            if (invalidateResponse.ok) {
              console.log('✅ REST API: QR code invalidated');
            }
          } catch (invalidateError) {
            console.warn('⚠️ REST API: Failed to invalidate QR code:', invalidateError);
            // Continue anyway
          }
        }
        
        // Create scan result
        scanResult = {
          success: true,
          qr_code: foundItem.qr_code || foundVariant,
          receive_scanned: true,
          status: 'received',
          material_type: foundItem.material_type || 'Material',
          quantity: foundItem.quantity || 1,
          unit: foundItem.unit || 'unit',
          is_invalidated: isInvalidated
        };
        
        const restApiElapsed = Date.now() - rpcStartTime;
        console.log(`✅ REST API: Scan completed successfully in ${restApiElapsed}ms`);
        deliveryRequestUpdated = true; // Mark as updated so success flow knows
        
        if (isInvalidated) {
          console.log('✅ QR code invalidated - both dispatch and receive completed');
          toast.success('✅ QR Code Invalidated', {
            description: 'This QR code has been marked as used and cannot be scanned again.',
            duration: 3000
          });
        }
        
        } catch (restApiError: any) {
            console.error('❌ REST API fallback also failed:', restApiError);
            const restApiElapsed = Date.now() - rpcStartTime;
            console.error(`⏱️ REST API fallback failed after ${restApiElapsed}ms`);
            lastError = restApiError; // Update last error
            
            // All methods failed - show error to user
            const errorMessage = lastError?.message || 'Unknown error';
            if (errorMessage.includes('QR_NOT_FOUND') || errorMessage.includes('not found')) {
              toast.error('❓ QR Code Not Found', {
                description: `"${cleanQRCode.substring(0, 30)}..." not in system. Please verify the QR code is correct.`,
                duration: 8000
              });
            } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
              toast.error('Request Timeout', {
                description: 'The scan request took too long. Please check your connection and try again.',
                duration: 5000
              });
            } else {
              toast.error('Failed to process scan', {
                description: 'All scan methods failed. Please try again or contact support.',
                duration: 5000
              });
            }
            return;
          }
      } // End of rpcError catch block (REST API fallback)
      } // End of simpleRpcSucceeded else block (complex RPC + REST API fallback)
      
      // Success flow - use scanResult from either RPC or REST API
      if (!scanResult || scanResult.success !== true) {
        console.error('❌ Scan did not succeed, cannot continue with success flow');
        return;
      }
      
      // Step 3: Check if order is completed (all items received)
      const orderCompleted = scanResult?.order_completed === true;
      
      // Step 4: Notify callback - pass orderCompleted so UI can show correct feedback
      // (order_completed = true when all items in the order were scanned)
      if (onDeliveryComplete) {
        console.log('🔄 Triggering onDeliveryComplete callback, orderCompleted:', orderCompleted);
        console.log('   Scan result:', scanResult);
        try {
          onDeliveryComplete(orderCompleted);
          console.log('✅ onDeliveryComplete callback executed successfully');
        } catch (callbackError) {
          console.error('❌ Error in onDeliveryComplete callback:', callbackError);
        }
      } else {
        console.warn('⚠️ No onDeliveryComplete callback provided');
      }
      
      // Success! Add to results
      const scanResultForUI: ScanResult = {
        qr_code: scanResult?.qr_code || cleanQRCode,
        material_type: scanResult?.material_type || 'Material',
        category: 'General',
        quantity: scanResult?.quantity || 1,
        unit: scanResult?.unit || 'unit',
        status: scanResult?.status || 'delivered',
        timestamp: new Date()
      };

      setScanResults(prev => [scanResultForUI, ...prev.slice(0, 9)]);
      
      // Show appropriate success message based on order completion status
      if (orderCompleted) {
        console.log('🎉 ORDER COMPLETED: All items received! Order status updated to delivered.');
        console.log('📡 Real-time subscriptions should update supplier and provider dashboards automatically.');
        toast.success('🎉 Delivery Complete!', {
          description: `All items received! Order status updated to delivered. Supplier and provider dashboards will update automatically.`,
          duration: 8000
        });
      } else {
        toast.success('✅ Item Received!', {
          description: `${scanResult?.material_type || 'Material'} confirmed${scanResult?.is_invalidated ? ' (QR code invalidated)' : ''}. More items pending.`,
          duration: 5000
        });
      }

      // Reset form
      setManualQRCode('');
      setNotes('');
      
      // Resume scanning after successful scan (if it was paused)
      try {
        if (scannerRef.current && isScanning) {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.PAUSED) {
            await scannerRef.current.resume();
            console.log('▶️ Scanner resumed after successful scan');
          }
        }
      } catch (resumeError) {
        console.warn('⚠️ Could not resume scanner:', resumeError);
      }
      
    } catch (error) {
          const elapsed = Date.now() - startTime;
          console.error('❌ Scan processing error after', elapsed, 'ms:', error);
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : 'Unknown',
            qrCode: qrCode.substring(0, 50) + '...'
          });
          
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
          throw error; // Re-throw to be caught by outer catch
    }
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

  return (
    <div className="space-y-6">
      {/* Device Info Banner */}
      {isMobile && (
        <Alert className="bg-green-50 border-green-200">
          <Smartphone className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>Mobile Device Detected:</strong> {deviceInfo}. 
            For best results, hold your phone steady and ensure good lighting.
          </AlertDescription>
        </Alert>
      )}

      {/* Delivery Info Banner */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-800">Delivery Site Scanner</h3>
              <p className="text-sm text-orange-700">
                Scan materials upon delivery to confirm handover at construction site
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera Scanner */}
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

      {/* Manual Entry / Physical Scanner */}
      {(
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
      )}

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
