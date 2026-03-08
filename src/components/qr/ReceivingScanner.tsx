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
  onDeliveryComplete?: () => void;
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
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

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

      // Adjust scanner config based on device type
      // Desktop/laptop webcams need different settings than mobile cameras
      const qrboxSize = isMobile ? { width: 250, height: 250 } : { width: 300, height: 300 };
      const scannerFps = isMobile ? 10 : 15; // Higher FPS for desktop
      
      const scannerConfig = {
        fps: scannerFps,
        qrbox: qrboxSize,
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        aspectRatio: isMobile ? 1.0 : 1.333, // 4:3 for desktop
        disableFlip: false, // Allow flipped images (mirror mode)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Use native API if available
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
          const processPromise = processQRScan(decodedText, 'mobile_camera');
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Scan processing timeout after 30 seconds')), 30000)
          );
          
          Promise.race([processPromise, timeoutPromise]).catch((error) => {
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
      // Add timeout to prevent hanging
      let accessToken = ANON_KEY;
      try {
        console.log('🔐 Attempting to get Supabase session...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout after 5 seconds')), 5000)
        );
        
        const { data: sessionData, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        console.log('🔐 Session fetch completed');
        if (sessionData?.session?.access_token) {
          accessToken = sessionData.session.access_token;
          console.log('🔐 Using Supabase session token (authenticated)');
        } else {
          console.warn('⚠️ No active Supabase session, trying localStorage fallback...');
          // Fallback to localStorage if session not available
          try {
            const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
              accessToken = parsed.access_token || ANON_KEY;
              console.log('🔐 Using localStorage token (fallback)');
            } else {
              console.error('❌ No access token found - RLS policies will block access!');
            }
          } catch (e) {
            console.error('❌ Error reading localStorage token:', e);
          }
        }
      } catch (e) {
        console.error('❌ Error getting Supabase session (will use fallback):', e);
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (stored) {
            const parsed = JSON.parse(stored);
            accessToken = parsed.access_token || ANON_KEY;
            console.log('🔐 Using localStorage token (error fallback)');
          } else {
            console.warn('⚠️ No localStorage token available, using anon key');
          }
        } catch (e2) {
          console.error('❌ Error reading localStorage token:', e2);
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
      console.log('🔍 Quick check: Is QR code already scanned?');
      try {
        const quickCheckResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${encodeURIComponent(cleanQRCode)}&select=receive_scanned,status,id&limit=1`,
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
              console.log('⏭️ QR code already scanned - skipping RPC call');
              toast.warning('⚠️ Already Scanned', {
                description: 'This QR code has already been scanned and received.',
                duration: 3000,
              });
              return; // Skip processing entirely
            }
          }
        }
      } catch (quickCheckError) {
        console.warn('⚠️ Quick check failed (non-blocking):', quickCheckError);
        // Continue with RPC call even if quick check fails
      }
      
      // Step 1: Use record_qr_scan RPC function to handle everything properly
      // This function will:
      // 1. Update material_item to receive_scanned = true
      // 2. Invalidate QR code when both dispatch and receive are done
      // 3. Check if ALL items are received and update order status to 'delivered'
      // 4. Update delivery_request status to 'delivered' when all items are received
      console.log('📦 Calling record_qr_scan RPC function for receiving scan...');
      console.log('⏱️ RPC call started at:', new Date().toISOString());
      
      let rpcResult: any = null;
      let deliveryRequestUpdated = false;
      const rpcStartTime = Date.now();
      
      try {
        // Call the RPC function with timeout (increased to 30 seconds for better reliability)
        const rpcController = new AbortController();
        const rpcTimeoutId = setTimeout(() => rpcController.abort(), 30000); // 30 second timeout
        
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
        
        const rpcTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout after 30 seconds')), 30000)
        );
        
        console.log('⏱️ Waiting for RPC response...');
        const { data, error } = await Promise.race([
          rpcPromise,
          rpcTimeoutPromise
        ]) as any;
        
        clearTimeout(rpcTimeoutId);
        const rpcElapsed = Date.now() - rpcStartTime;
        console.log(`⏱️ RPC call completed in ${rpcElapsed}ms`);
        
        if (error) {
          console.error('❌ RPC error:', error);
          throw error;
        }
        
        rpcResult = data;
        console.log('✅ RPC call successful:', rpcResult);
        
        // Check if the scan was successful
        if (rpcResult && rpcResult.success === true) {
          console.log('✅ QR scan recorded successfully');
          console.log('📋 Scan result:', {
            qr_code: rpcResult.qr_code,
            receive_scanned: rpcResult.receive_scanned,
            is_invalidated: rpcResult.is_invalidated,
            status: rpcResult.status
          });
          
          // If QR code is invalidated, it means both dispatch and receive are done
          if (rpcResult.is_invalidated === true) {
            console.log('✅ QR code invalidated - both dispatch and receive completed');
            toast.success('✅ QR Code Invalidated', {
              description: 'This QR code has been marked as used and cannot be scanned again.',
              duration: 3000
            });
          }
          
          deliveryRequestUpdated = true; // RPC function handles delivery_request update
        } else {
          // Handle error response from RPC
          const errorMsg = rpcResult?.error || 'Unknown error';
          const errorCode = rpcResult?.error_code || 'UNKNOWN_ERROR';
          
          console.error('❌ RPC returned error:', errorMsg, 'Code:', errorCode);
          
          if (errorCode === 'ALREADY_RECEIVED') {
            toast.error('⚠️ Already Received', {
              description: errorMsg,
              duration: 5000
            });
            return;
          } else if (errorCode === 'QR_INVALIDATED') {
            toast.error('⚠️ QR Code Invalidated', {
              description: errorMsg,
              duration: 5000
            });
            return;
          } else if (errorCode === 'QR_NOT_FOUND') {
            // Try format variations if QR code not found
            console.log('🔄 QR code not found, trying format variations...');
            
            // Try variations: remove UJP-FILM- prefix, try just the numeric part, etc.
            const variations = [
              cleanQRCode.replace(/^UJP-FILM-/, ''), // Remove UJP-FILM- prefix
              cleanQRCode.replace(/^UJP-/, ''), // Remove UJP- prefix
              cleanQRCode.match(/\d{13,}/)?.[0] || '', // Extract long numeric sequence (order number)
            ].filter(v => v && v !== cleanQRCode);
            
            let found = false;
            for (const variant of variations) {
              if (!variant) continue;
              try {
                console.log(`🔄 Trying QR code variant: ${variant.substring(0, 50)}...`);
                const variantResult = await supabase.rpc('record_qr_scan', {
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
                
                if (variantResult.error) {
                  console.log(`⚠️ Variant ${variant.substring(0, 30)}... Supabase error:`, variantResult.error.message);
                  continue;
                }
                
                if (variantResult.data && variantResult.data.success === true) {
                  console.log('✅ Found QR code with variant:', variant);
                  rpcResult = variantResult.data;
                  found = true;
                  deliveryRequestUpdated = true;
                  // Continue with success flow - break out of loop and continue after try-catch
                  break;
                } else if (variantResult.data && variantResult.data.error_code) {
                  console.log(`⚠️ Variant ${variant.substring(0, 30)}... returned error:`, variantResult.data.error_code);
                }
              } catch (e) {
                console.log(`⚠️ Variant ${variant.substring(0, 30)}... exception:`, e);
              }
            }
            
            if (!found) {
              toast.error('❓ QR Code Not Found', {
                description: `"${cleanQRCode.substring(0, 30)}..." not in system. Please verify the QR code is correct.`,
                duration: 8000
              });
              return;
            }
            // If found, continue with success flow (rpcResult is already set above)
          } else {
            toast.error('❌ Scan Failed', {
              description: errorMsg,
              duration: 5000
            });
            return;
          }
        }
      } catch (rpcError: any) {
        console.error('❌ RPC call failed:', rpcError);
        const rpcElapsed = Date.now() - rpcStartTime;
        console.error(`⏱️ RPC failed after ${rpcElapsed}ms`);
        
        // If RPC times out, try direct REST API update as fallback
        if (rpcError?.message?.includes('timeout') || rpcError?.name === 'AbortError') {
          console.log('🔄 RPC timed out - attempting direct REST API update as fallback...');
          
          try {
            // Fallback: Direct REST API update
            // First, find the material_item
            const findItemResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${encodeURIComponent(cleanQRCode)}&select=id,purchase_order_id,receive_scanned,dispatch_scanned&limit=1`,
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
              if (itemData && itemData.length > 0 && !itemData[0].receive_scanned) {
                const itemId = itemData[0].id;
                const purchaseOrderId = itemData[0].purchase_order_id;
                
                // Update material_item directly
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
                    body: JSON.stringify({
                      receive_scanned: true,
                      receive_scanned_at: new Date().toISOString(),
                      status: 'received',
                      updated_at: new Date().toISOString()
                    })
                  }
                );
                
                if (updateItemResponse.ok) {
                  console.log('✅ Fallback: Direct REST API update successful');
                  toast.success('✅ Item Received (via fallback)', {
                    description: 'Scan processed using direct update method.',
                    duration: 5000
                  });
                  
                  // Create a mock rpcResult for the success flow
                  rpcResult = {
                    success: true,
                    qr_code: cleanQRCode,
                    receive_scanned: true,
                    status: 'received',
                    material_type: 'Material'
                  };
                  
                  // Continue with success flow
                  deliveryRequestUpdated = true;
                } else {
                  throw new Error('Fallback update failed');
                }
              } else if (itemData && itemData.length > 0 && itemData[0].receive_scanned) {
                console.log('⏭️ Item already received - skipping');
                toast.warning('⚠️ Already Scanned', {
                  description: 'This QR code has already been scanned.',
                  duration: 3000
                });
                return;
              } else {
                throw new Error('Item not found');
              }
            } else {
              throw new Error('Failed to find item');
            }
          } catch (fallbackError: any) {
            console.error('❌ Fallback REST API update also failed:', fallbackError);
            toast.error('Request Timeout', {
              description: 'The scan request took too long (30s). Please try again or contact support.',
              duration: 5000
            });
            return;
          }
        } else {
          toast.error('Failed to process scan', {
            description: rpcError?.message || 'Unknown error occurred',
            duration: 5000
          });
          return;
        }
      }
      
      // Only continue with success flow if RPC was successful
      if (!rpcResult || rpcResult.success !== true) {
        console.error('❌ RPC did not succeed, cannot continue with success flow');
        return;
      }
      
      // Step 3: IMMEDIATELY switch to delivered tab when item is successfully scanned
      // The RPC function has already updated delivery_request status if all items are received
      if (onDeliveryComplete) {
        console.log('🔄 Triggering onDeliveryComplete callback - moving to Delivered tab NOW');
        console.log('   RPC result:', rpcResult);
        try {
          onDeliveryComplete();
          console.log('✅ onDeliveryComplete callback executed successfully');
        } catch (callbackError) {
          console.error('❌ Error in onDeliveryComplete callback:', callbackError);
        }
      } else {
        console.warn('⚠️ No onDeliveryComplete callback provided');
      }
      
      // Success! Add to results
      const scanResult: ScanResult = {
        qr_code: cleanQRCode,
        material_type: rpcResult?.material_type || 'Material',
        category: 'General',
        quantity: 1,
        unit: 'unit',
        status: rpcResult?.status || 'delivered',
        timestamp: new Date()
      };

      setScanResults(prev => [scanResult, ...prev.slice(0, 9)]);
      
      toast.success('✅ Item Received!', {
        description: `${rpcResult?.material_type || 'Material'} confirmed${rpcResult?.is_invalidated ? ' (QR code invalidated)' : ''}`,
        duration: 5000
      });

      // Reset form
      setManualQRCode('');
      setNotes('');
      
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
          
          {/* Camera View - html5-qrcode creates its own video element */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: isMobile ? '300px' : '400px' }}>
            {/* Scanner container - html5-qrcode will render here */}
            <div 
              id={scannerContainerId} 
              className="w-full"
              style={{ minHeight: isMobile ? '300px' : '400px' }}
            />
            
            {/* Scanning Frame Overlay - helps users position QR code */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Scanning frame with animated corners - responsive sizing */}
                <div 
                  className="relative"
                  style={{ 
                    width: 'min(80%, 350px)', 
                    height: 'min(70%, 350px)',
                    minWidth: '200px',
                    minHeight: '200px'
                  }}
                >
                  {/* Corner brackets - using larger sizes */}
                  <div className="absolute top-0 left-0 border-t-4 border-l-4 border-green-400 rounded-tl-lg" style={{ width: '20%', height: '20%', minWidth: '40px', minHeight: '40px' }}></div>
                  <div className="absolute top-0 right-0 border-t-4 border-r-4 border-green-400 rounded-tr-lg" style={{ width: '20%', height: '20%', minWidth: '40px', minHeight: '40px' }}></div>
                  <div className="absolute bottom-0 left-0 border-b-4 border-l-4 border-green-400 rounded-bl-lg" style={{ width: '20%', height: '20%', minWidth: '40px', minHeight: '40px' }}></div>
                  <div className="absolute bottom-0 right-0 border-b-4 border-r-4 border-green-400 rounded-br-lg" style={{ width: '20%', height: '20%', minWidth: '40px', minHeight: '40px' }}></div>
                  
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
