import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUrlTabSync } from "@/hooks/useUrlTabSync";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DashboardLoader } from "@/components/ui/DashboardLoader";
import { 
  Truck, 
  Package, 
  MapPin,
  Clock,
  DollarSign,
  Users,
  Star,
  CheckCircle,
  AlertCircle,
  Navigation as NavigationIcon,
  Plus,
  Eye,
  BarChart3,
  Bell,
  Settings,
  Calendar,
  Phone,
  TrendingUp,
  Route,
  Fuel,
  Timer,
  Moon,
  Sun,
  Camera,
  Trophy,
  Map,
  Zap,
  Headphones,
  LogOut,
  X,
  ChevronRight
} from "lucide-react";
import { DeliveryCharts } from "@/components/delivery/DeliveryCharts";
import { DeliveryMap } from "@/components/delivery/DeliveryMap";
import { DeliveryPhotoProof } from "@/components/delivery/DeliveryPhotoProof";
import { DeliveryNotifications } from "@/components/delivery/DeliveryNotifications";
import { RouteOptimizer } from "@/components/delivery/RouteOptimizer";
import { DriverGamification } from "@/components/delivery/DriverGamification";
import { DeliveryRequestCard } from "@/components/delivery/DeliveryRequestCard";
import { useLanguage } from "@/contexts/LanguageContext";

// Play a short alarm sound so delivery provider knows there's a new request (no audio file needed)
function playNewRequestAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (_) {}
}

// Show browser notification so provider is alerted even when tab is in background
function notifyNewDeliveryRequest() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("🚚 New Delivery Request!", {
      body: "A new delivery job is available. Open the Alerts tab to accept.",
      icon: "/favicon.ico",
      tag: "ujenzi-new-delivery",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => {
      if (p === "granted") {
        new Notification("🚚 New Delivery Request!", {
          body: "A new delivery job is available. Open the Alerts tab to accept.",
          icon: "/favicon.ico",
          tag: "ujenzi-new-delivery",
        });
      }
    });
  }
}
import { useToast } from "@/hooks/use-toast";
import { useDeliveryProviderData, logDataAccessAttempt } from "@/hooks/useDataIsolation";
import { useDeliveriesUnified, type UnifiedDeliveryRow } from "@/hooks/useDeliveriesUnified";
import { MessageSquare, User, QrCode, Scan, RefreshCw, Link2, DollarSign } from "lucide-react";
import { InAppCommunication } from "@/components/communication/InAppCommunication";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { ProfileViewDialog } from "@/components/profile/ProfileViewDialog";
import { ReceivingScanner } from "@/components/qr/ReceivingScanner";
import { ArrivalScanReminder } from "@/components/delivery/ArrivalScanReminder";
import { DeliveryPayTab } from "@/components/delivery/DeliveryPayTab";

interface DashboardStats {
  totalDeliveries: number;
  completedToday: number;
  pendingDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  totalDistance: number;
}

interface ActiveDelivery {
  id: string;
  pickup_location: string;
  delivery_location: string;
  material_type: string;
  quantity: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  estimated_time: string;
  price: number;
  distance: number;
  urgency?: 'normal' | 'urgent' | 'emergency';
  special_instructions?: string;
  created_at?: string;
  purchase_order_id?: string; // Link to the order for QR scanning
  order_number?: string; // Purchase order number for display
  // Categorization fields for tab filtering based on material_items scan status
  _categorized_status?: string;
  _items_count?: number;
  _dispatched_count?: number;
  _received_count?: number;
}

interface DeliveryHistory {
  id: string;
  pickup_location: string;
  delivery_location: string;
  material_type: string;
  status: string;
  completed_at: string;
  price: number;
  rating: number;
  order_number?: string; // Include order_number for display and matching
}

const DeliveryDashboard = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // NOTE: Role check is already done by RoleProtectedRoute in App.tsx
  // No need for duplicate verification here - this speeds up loading!
  
  // Use data isolation hook - ensures only THIS provider's data is fetched
  const {
    profile: isolatedProfile,
    activeDeliveries: isolatedActiveDeliveries,
    deliveryHistory: isolatedHistory,
    pendingRequests: isolatedPendingRequests,
    stats: isolatedStats,
    loading: dataLoading,
    error: dataError,
    refetch: refetchData,
    acceptDelivery: handleAcceptDelivery,
    rejectDelivery: handleRejectDelivery,
    updateDeliveryStatus
  } = useDeliveryProviderData();

  // Single source for Deliveries tab: one RPC, aligned with Supplier Orders/QR
  const {
    scheduled: unifiedScheduled,
    inTransit: unifiedInTransit,
    delivered: unifiedDelivered,
    loading: unifiedLoading,
    error: unifiedError,
    refetch: refetchUnified,
  } = useDeliveriesUnified();
  
  const [loading, setLoading] = useState(true);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalDeliveries: 0,
    completedToday: 0,
    pendingDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalDistance: 0
  });
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProofCapture, setShowProofCapture] = useState<string | null>(null);
  const DELIVERY_TABS = ["deliveries", "history", "map", "scanning", "pay", "analytics", "notifications", "support"];
  const [activeTab, setActiveTab] = useUrlTabSync(DELIVERY_TABS, "deliveries");
  const [deliveriesSubTab, setDeliveriesSubTab] = useState("scheduled"); // Sub-tab for Deliveries (scheduled only now)
  const [selectedScheduledOrderId, setSelectedScheduledOrderId] = useState<string>(""); // Selected order from dropdown
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [selectedDeliveryForScan, setSelectedDeliveryForScan] = useState<string | null>(null);
  const [showArrivalScanner, setShowArrivalScanner] = useState(false);
  const [linkingDeliveries, setLinkingDeliveries] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
  const acceptingDeliveryRef = useRef<string | null>(null); // Prevent double-clicks on Accept

  // Chart data - DYNAMIC: Calculate from real delivery data
  const deliveryTrends = React.useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const trends: { date: string; deliveries: number; completed: number; earnings: number }[] = [];
    
    // Calculate trends for last 7 days from actual delivery history
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      
      // Count deliveries for this day
      const dayDeliveries = [...activeDeliveries, ...deliveryHistory].filter(d => {
        const dDate = new Date(d.created_at || d.completed_at);
        return dDate.toDateString() === date.toDateString();
      });
      
      const completed = dayDeliveries.filter(d => 
        d.status === 'delivered' || d.status === 'completed'
      ).length;
      
      const earnings = dayDeliveries.reduce((sum, d) => 
        sum + (d.price || d.delivery_fee || d.estimated_cost || 0), 0
      );
      
      trends.push({ date: dayName, deliveries: dayDeliveries.length, completed, earnings });
    }
    
    return trends;
  }, [activeDeliveries, deliveryHistory]);

  // Status distribution - DYNAMIC: Calculate from real data
  const statusDistribution = React.useMemo(() => {
    const allDeliveries = [...activeDeliveries, ...deliveryHistory];
    const completed = allDeliveries.filter(d => d.status === 'delivered' || d.status === 'completed').length;
    const inTransit = allDeliveries.filter(d => 
      ['in_transit', 'picked_up', 'dispatched', 'shipped', 'out_for_delivery'].includes(d.status)
    ).length;
    const pending = allDeliveries.filter(d => 
      ['accepted', 'assigned', 'scheduled', 'pending_pickup'].includes(d.status)
    ).length;
    const cancelled = allDeliveries.filter(d => d.status === 'cancelled').length;
    
    return [
      { name: 'Completed', value: completed, color: '#22c55e' },
      { name: 'In Transit', value: inTransit, color: '#f59e0b' },
      { name: 'Scheduled', value: pending, color: '#3b82f6' },
      { name: 'Cancelled', value: cancelled, color: '#ef4444' }
    ];
  }, [activeDeliveries, deliveryHistory]);

  // Earnings data - DYNAMIC: Calculate from real data
  const earningsData = React.useMemo(() => {
    return deliveryTrends.map(trend => ({
      day: trend.date,
      earnings: trend.earnings,
      deliveries: trend.deliveries
    }));
  }, [deliveryTrends]);

  // Map locations - DYNAMIC: Build from real active deliveries
  const mapLocations = React.useMemo(() => {
    return activeDeliveries.slice(0, 10).map((d, index) => ({
      id: d.id || String(index + 1),
      type: (index % 2 === 0 ? 'pickup' : 'delivery') as 'pickup' | 'delivery',
      name: d.material_type || 'Delivery',
      address: d.delivery_address || d.delivery_location || 'Location pending',
      lat: -1.2921 + (Math.random() * 0.05 - 0.025), // Approximate Nairobi coordinates
      lng: 36.8219 + (Math.random() * 0.05 - 0.025),
      status: d.status || 'pending',
      estimatedTime: '30 min'
    }));
  }, [activeDeliveries]);

  // Route optimizer deliveries - DYNAMIC: Build from real active deliveries
  const routeDeliveries = React.useMemo(() => {
    return activeDeliveries.slice(0, 5).map((d, index) => ({
      id: d.id || String(index + 1),
      name: d.material_type || 'Delivery',
      address: d.delivery_address || d.delivery_location || 'Address pending',
      type: 'delivery' as const,
      priority: (d.urgency === 'emergency' ? 'urgent' : d.urgency === 'urgent' ? 'high' : 'medium') as 'urgent' | 'high' | 'medium' | 'low',
      estimatedTime: 30,
      distance: d.distance || Math.floor(Math.random() * 15 + 5)
    }));
  }, [activeDeliveries]);

  // Update local state when isolated data loads - ENSURES DATA ISOLATION
  useEffect(() => {
    if (isolatedProfile) {
      setProviderProfile(isolatedProfile);
    }
    // Use isolatedStats when available; fallback: derive from raw data
    const activeCount = isolatedActiveDeliveries?.length ?? 0;
    const historyCount = isolatedHistory?.length ?? 0;
    const pendingCount = isolatedPendingRequests?.length ?? 0;
    const hasRawData = activeCount > 0 || historyCount > 0 || pendingCount > 0;
    const hasStatsData = isolatedStats && (isolatedStats.totalDeliveries > 0 || isolatedStats.pendingDeliveries > 0 || isolatedStats.completedToday > 0 || isolatedStats.totalEarnings > 0);
    if (hasStatsData && isolatedStats) {
      setStats(isolatedStats);
    } else if (hasRawData) {
      const todayStr = new Date().toDateString();
      const historyItems = isolatedHistory || [];
      const completedToday = historyItems.filter((d: Record<string, unknown>) => {
        const dte = new Date((d.completed_at || d.delivered_at || d.updated_at || d.created_at) as string);
        return !isNaN(dte.getTime()) && dte.toDateString() === todayStr;
      }).length;
      const totalEarnings = historyItems.reduce((sum: number, d: Record<string, unknown>) =>
        sum + (Number(d.final_cost) || Number(d.estimated_cost) || Number(d.price) || Number(d.delivery_fee) || 0), 0
      );
      setStats(prev => ({
        totalDeliveries: activeCount + historyCount,
        completedToday,
        pendingDeliveries: pendingCount,
        totalEarnings,
        averageRating: isolatedStats?.averageRating ?? prev.averageRating ?? 0,
        totalDistance: isolatedStats?.totalDistance ?? prev.totalDistance ?? 0
      }));
    } else if (isolatedStats) {
      setStats(isolatedStats);
    }
    // Transform active deliveries - ONLY THIS PROVIDER'S DELIVERIES
    console.log('📋 Dashboard sync: isolatedActiveDeliveries.length =', isolatedActiveDeliveries?.length ?? 0);
    if (isolatedActiveDeliveries && isolatedActiveDeliveries.length > 0) {
      // CRITICAL: Fetch delivery_requests to get builder-provided delivery_address
      // The builder fills in delivery_address in delivery_requests table during delivery request
      // This is the address that should appear on the delivery card, not "To be provided"
      const purchaseOrderIds = isolatedActiveDeliveries
        .map((d: any) => d.purchase_order_id || d.id)
        .filter(Boolean);
      
      // Fetch delivery_requests asynchronously to get builder-provided addresses
      (async () => {
        let deliveryRequestsMap: Record<string, any> = {};
        
        if (purchaseOrderIds.length > 0) {
          try {
            const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
            
            let accessToken = SUPABASE_ANON_KEY;
            try {
              const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
              if (storedSession) {
                const parsed = JSON.parse(storedSession);
                if (parsed.access_token) accessToken = parsed.access_token;
              }
            } catch (e) {}
            
            const headers = {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`
            };
            
            // Fetch delivery_requests for these purchase_orders - ALL statuses
            const poIdsParam = purchaseOrderIds.join(',');
            console.log('🔍 SCHEDULED: Fetching delivery_requests for', purchaseOrderIds.length, 'purchase_order_ids to get builder-provided addresses...');
            const drResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=in.(${poIdsParam})&select=id,purchase_order_id,delivery_address,pickup_address,delivery_coordinates,status&order=created_at.desc&limit=500`,
              { headers, cache: 'no-store' }
            );
            
            if (drResponse.ok) {
              const drData = await drResponse.json();
              console.log('✅ SCHEDULED: Fetched', drData.length, 'delivery_requests for scheduled orders');
              
              // Map by purchase_order_id - use most recent with valid address
              drData.forEach((dr: any) => {
                if (dr.purchase_order_id) {
                  const existing = deliveryRequestsMap[dr.purchase_order_id];
                  // Only update if this is newer or if existing doesn't have a valid address
                  if (!existing || 
                      (dr.delivery_address && dr.delivery_address.trim() && dr.delivery_address !== 'To be provided' && 
                       (!existing.delivery_address || existing.delivery_address === 'To be provided'))) {
                    deliveryRequestsMap[dr.purchase_order_id] = dr;
                    if (dr.delivery_address && dr.delivery_address.trim() && dr.delivery_address !== 'To be provided') {
                      console.log('✅✅✅ SCHEDULED: Found builder-provided address for', dr.purchase_order_id?.substring(0, 8), ':', dr.delivery_address.substring(0, 60));
                    }
                  }
                }
              });
            } else {
              console.warn('⚠️ SCHEDULED: Failed to fetch delivery_requests:', drResponse.status);
            }
          } catch (e: any) {
            console.warn('⚠️ SCHEDULED: Error fetching delivery_requests:', e?.message);
          }
        }
        
        // Helper function to format delivery - NOW WITH BUILDER-PROVIDED ADDRESS
        const formatDelivery = (d: any): ActiveDelivery => {
          // CRITICAL: Get builder-provided address from delivery_requests
          const poId = d.purchase_order_id || d.id;
          const deliveryRequest = deliveryRequestsMap[poId];
          const builderProvidedAddress = deliveryRequest?.delivery_address;
          
          // CRITICAL: Use builder-provided address from delivery_requests (highest priority)
          // This is the address the builder filled in during delivery request form
          let finalDeliveryAddress = 'Delivery address missing - contact builder';
          if (builderProvidedAddress && builderProvidedAddress.trim() && 
              builderProvidedAddress !== 'To be provided' && 
              builderProvidedAddress !== 'Delivery location') {
            // Include coordinates if available
            if (deliveryRequest?.delivery_coordinates && !builderProvidedAddress.includes(deliveryRequest.delivery_coordinates)) {
              finalDeliveryAddress = `${deliveryRequest.delivery_coordinates} | ${builderProvidedAddress}`;
            } else {
              finalDeliveryAddress = builderProvidedAddress;
            }
            console.log('✅✅✅ SCHEDULED: Using builder-provided address for', poId?.substring(0, 8), ':', finalDeliveryAddress.substring(0, 60));
          } else if (d.delivery_location && d.delivery_location.trim() && 
                     d.delivery_location !== 'To be provided' && 
                     d.delivery_location !== 'Delivery location') {
            finalDeliveryAddress = d.delivery_location;
            console.log('✅ SCHEDULED: Using delivery_location from isolatedActiveDeliveries for', poId?.substring(0, 8));
          } else if (d.delivery_address && d.delivery_address.trim() && 
                     d.delivery_address !== 'To be provided' && 
                     d.delivery_address !== 'Delivery location') {
            finalDeliveryAddress = d.delivery_address;
            console.log('✅ SCHEDULED: Using delivery_address from isolatedActiveDeliveries for', poId?.substring(0, 8));
          } else {
            console.warn('⚠️ SCHEDULED: No valid address found for', poId?.substring(0, 8), 'order', d.order_number || d.po_number);
          }
          
          return {
            id: d.id,
            pickup_location: deliveryRequest?.pickup_address || d.pickup_location || d.pickup_address || 'N/A',
            delivery_location: finalDeliveryAddress,
            material_type: d.material_type || d.item_description || 'Materials',
            quantity: d.quantity || d.estimated_weight || 'N/A',
            customer_name: d.builder_name || d.builder_email?.split('@')[0] || 'Customer',
            customer_phone: d.builder_phone || '+254 700 000 000',
            status: d.status || d.display_status || 'pending',
            estimated_time: d.estimated_time || '30 mins',
            price: d.price || d.delivery_fee || d.estimated_cost || 0,
            distance: d.distance || 0,
            urgency: d.urgency || d.priority_level || 'normal',
            special_instructions: d.special_instructions,
            created_at: d.created_at,
            purchase_order_id: d.purchase_order_id,
            order_number: d.order_number, // Include order number from the hook
            // CRITICAL: Preserve categorization fields for tab filtering
            _categorized_status: d._categorized_status,
            _items_count: d._items_count,
            _dispatched_count: d._dispatched_count,
            _received_count: d._received_count
          };
        };
      
      // VALIDATE: Filter out orders that don't exist in purchase_orders
      // This ensures we only show orders that actually exist in the database
      const validateOrders = async () => {
        const deliveriesWithPO = isolatedActiveDeliveries.filter((d: any) => d.purchase_order_id);
        if (deliveriesWithPO.length === 0) {
          setActiveDeliveries(isolatedActiveDeliveries.map((d: any) => formatDelivery(d)));
          return;
        }
        
        try {
          const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
          const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
          
          let accessToken = SUPABASE_ANON_KEY;
          try {
            const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (storedSession) {
              const parsed = JSON.parse(storedSession);
              if (parsed.access_token) accessToken = parsed.access_token;
            }
          } catch (e) {}
          
          // Use object-based deduplication instead of Set to avoid minification errors
          const poIdsObj: Record<string, boolean> = {};
          deliveriesWithPO.forEach((d: any) => {
            const poId = d.purchase_order_id;
            if (poId) poIdsObj[poId] = true;
          });
          const poIds = Object.keys(poIdsObj);
          if (poIds.length > 0) {
            const validationResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${poIds.join(',')})&select=id,po_number&limit=500`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              }
            );
            
            if (validationResponse.ok) {
              const existingOrders = await validationResponse.json();
              // Add null check to prevent "is not a constructor" errors
              if (!existingOrders || !Array.isArray(existingOrders)) {
                console.warn('⚠️ Invalid validation response:', existingOrders);
                return;
              }
              // Use object-based lookup instead of Set to avoid minification errors
              const existingOrderIds: Record<string, boolean> = {};
              const existingOrderNumbers: Record<string, boolean> = {};
              existingOrders.forEach((po: any) => {
                if (po.id) existingOrderIds[po.id] = true;
                if (po.po_number) existingOrderNumbers[po.po_number] = true;
              });
              
              // First filter: Only orders that exist in purchase_orders (or have fallback label when RLS blocks PO fetch)
              const ordersThatExist = isolatedActiveDeliveries.filter((d: any) => {
                const hasValidPO = d.purchase_order_id && existingOrderIds[d.purchase_order_id];
                const hasValidOrderNumber = d.order_number && existingOrderNumbers[d.order_number];
                const isFallbackLabel = d.order_number && typeof d.order_number === 'string' && d.order_number.startsWith('Order-');
                const orderExists = hasValidPO || hasValidOrderNumber || isFallbackLabel;
                
                if (!orderExists && d.order_number) {
                  console.warn('🚫 Removing order that does not exist:', {
                    order_number: d.order_number,
                    purchase_order_id: d.purchase_order_id?.substring(0, 8),
                    reason: 'Order not found in purchase_orders table'
                  });
                }
                
                return orderExists;
              });
              
              // Additional validation: Check material_items scan status
              // Only show orders that are in "Awaiting Dispatch" (all items have dispatch_scanned = FALSE)
              // This enforces the rule: delivery providers can only accept orders from Awaiting Dispatch
              // Use object-based deduplication instead of Set to avoid minification errors
              const poIdsForMaterialCheckObj: Record<string, boolean> = {};
              ordersThatExist.forEach((d: any) => {
                const poId = d.purchase_order_id;
                if (poId) poIdsForMaterialCheckObj[poId] = true;
              });
              const poIdsForMaterialCheck = Object.keys(poIdsForMaterialCheckObj);
              let materialItemsData: any[] = [];
              
              if (poIdsForMaterialCheck.length > 0) {
                try {
                  const materialItemsResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=in.(${poIdsForMaterialCheck.join(',')})&select=purchase_order_id,dispatch_scanned,receive_scanned&limit=1000`,
                    {
                      headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                      },
                      cache: 'no-store'
                    }
                  );
                  
                  if (materialItemsResponse.ok) {
                    materialItemsData = await materialItemsResponse.json();
                  }
                } catch (e) {
                  console.warn('⚠️ Could not fetch material_items for validation:', e);
                }
              }
              
              // Group material_items by purchase_order_id
              const itemsByOrder: Record<string, any[]> = {};
              materialItemsData.forEach((item: any) => {
                if (item.purchase_order_id) {
                  if (!itemsByOrder[item.purchase_order_id]) {
                    itemsByOrder[item.purchase_order_id] = [];
                  }
                  itemsByOrder[item.purchase_order_id].push(item);
                }
              });
              
              // Second filter: Only validate that orders exist - don't filter by dispatch status
              // Orders with dispatched items STAY in "Scheduled" until all items are scanned as delivered
              // Let getCategory() handle categorization into Scheduled/Delivered
              const validDeliveries = ordersThatExist.filter((d: any) => {
                if (!d.purchase_order_id) {
                  // No purchase_order_id - exclude it
                  console.warn('🚫 Removing order with no purchase_order_id:', {
                    order_number: d.order_number,
                    reason: 'No purchase_order_id - cannot validate'
                  });
                  return false;
                }
                
                const isFallbackLabel = d.order_number && typeof d.order_number === 'string' && d.order_number.startsWith('Order-');
                if (isFallbackLabel) {
                  // Do NOT show "Order-xxx" weird order numbers on Schedule — remove and reject these app-wide
                  console.warn('🚫 Removing fallback order from Schedule (weird order number):', d.order_number);
                  return false;
                }
                
                // Only validate that the order exists - don't filter by dispatch status
                if (itemsByOrder[d.purchase_order_id]) {
                  const items = itemsByOrder[d.purchase_order_id];
                  
                  if (items.length === 0) {
                    // No material_items - exclude it (order doesn't exist)
                    console.warn('🚫 Removing order with no material_items:', {
                      order_number: d.order_number,
                      purchase_order_id: d.purchase_order_id?.substring(0, 8),
                      reason: 'Order has no material_items'
                    });
                    return false;
                  }
                  
                  // Order exists and has items - keep it (categorization will handle dispatch status)
                  return true;
                } else {
                  // No material_items found for this order - exclude it
                  console.warn('🚫 Removing order with no material_items data:', {
                    order_number: d.order_number,
                    purchase_order_id: d.purchase_order_id?.substring(0, 8),
                    reason: 'No material_items found'
                  });
                  return false;
                }
              });
              
              console.log('✅ VALIDATION: Removed', isolatedActiveDeliveries.length - validDeliveries.length, 'non-existent orders');
              console.log('✅ VALIDATION: Valid orders count:', validDeliveries.length);
              setActiveDeliveries(validDeliveries.map((d: any) => formatDelivery(d)));
              return;
            }
          }
        } catch (validationError) {
          console.warn('⚠️ Error validating orders:', validationError);
        }
        
        // Fallback: show all if validation fails
        setActiveDeliveries(isolatedActiveDeliveries.map((d: any) => formatDelivery(d)));
      };
      
        // Run validation asynchronously
        // Note: validateOrders() will call setActiveDeliveries() when complete
        validateOrders();
        
        // Log initial count (validation will update state asynchronously)
        console.log('🚚 Processing', isolatedActiveDeliveries.length, 'active deliveries for validation');
      })(); // End async IIFE for fetching delivery_requests
    } else {
      // Ensure empty array if no data
      setActiveDeliveries([]);
    }
    // Transform delivery history - ONLY THIS PROVIDER'S HISTORY
    if (isolatedHistory && isolatedHistory.length > 0) {
      console.log('📦 Transforming delivery history:', isolatedHistory.length, 'items');
      console.log('📋 Sample history items:', isolatedHistory.slice(0, 3).map(d => ({
        id: d.id?.substring(0, 8),
        order_number: d.order_number || d.po_number,
        status: d.status,
        purchase_order_id: d.purchase_order_id?.substring(0, 8)
      })));
      
      // CRITICAL: Fetch delivery_requests to get the builder-provided delivery_address
      // The builder fills in delivery_address in delivery_requests table during delivery request
      const purchaseOrderIds = isolatedHistory.map((d: any) => d.purchase_order_id || d.id).filter(Boolean);
      
      // Fetch delivery_requests asynchronously and then format history
      (async () => {
        // Use object-based map instead of Map to avoid minification errors
        let deliveryRequestsMap: Record<string, any> = {};
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        let accessToken = SUPABASE_ANON_KEY;
        try {
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            if (parsed.access_token) accessToken = parsed.access_token;
          }
        } catch (e) {}
        const headers = {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        };
        
        if (purchaseOrderIds.length > 0) {
          try {
            // Fetch delivery_requests for these purchase_orders to get builder-provided delivery_address
            // CRITICAL: Query ALL statuses (not just pending) because these are completed orders
            // CRITICAL: Use proper PostgREST syntax for IN query (no quotes around UUIDs)
            const poIdsParam = purchaseOrderIds.join(',');
            console.log('🔍 Fetching delivery_requests for', purchaseOrderIds.length, 'purchase_order_ids:', purchaseOrderIds.slice(0, 3).map(id => id.substring(0, 8)));
            const drResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=in.(${poIdsParam})&select=id,purchase_order_id,delivery_address,pickup_address,status&order=created_at.desc&limit=500`,
              { headers, cache: 'no-store' }
            );
            
            if (drResponse.ok) {
              const drData = await drResponse.json();
              console.log('📦 Raw delivery_requests data:', drData.length, 'items');
              
              // Map by purchase_order_id for quick lookup
              // CRITICAL: If multiple delivery_requests exist for same purchase_order_id, use the most recent one
              drData.forEach((dr: any) => {
                if (dr.purchase_order_id) {
                  const existing = deliveryRequestsMap[dr.purchase_order_id];
                  // Only update if this is newer or if existing doesn't have a valid address
                  if (!existing || 
                      (dr.delivery_address && dr.delivery_address.trim() && dr.delivery_address !== 'To be provided' && 
                       (!existing.delivery_address || existing.delivery_address === 'To be provided'))) {
                    deliveryRequestsMap[dr.purchase_order_id] = dr;
                    // Log each one to verify we're getting addresses
                    if (dr.delivery_address && dr.delivery_address.trim() && dr.delivery_address !== 'To be provided') {
                      console.log('✅ Found delivery_address for', dr.purchase_order_id?.substring(0, 8), 'status:', dr.status, 'address:', dr.delivery_address.substring(0, 60));
                    } else {
                      console.warn('⚠️ delivery_request', dr.purchase_order_id?.substring(0, 8), 'status:', dr.status, 'has no valid delivery_address:', dr.delivery_address || 'null');
                    }
                  }
                }
              });
              console.log('✅ Fetched', drData.length, 'delivery_requests for history - builder-provided addresses available');
              console.log('📋 Delivery requests map size:', Object.keys(deliveryRequestsMap).length);
              console.log('📋 Sample delivery addresses:', drData.slice(0, 3).map((dr: any) => ({
                po_id: dr.purchase_order_id?.substring(0, 8),
                delivery_address: dr.delivery_address?.substring(0, 50) || 'N/A'
              })));
            } else {
              const errorText = await drResponse.text();
              console.error('❌ Failed to fetch delivery_requests:', drResponse.status, drResponse.statusText);
              console.error('❌ Error details:', errorText);
              console.error('❌ Query was:', `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=in.(${poIdsParam})&select=id,purchase_order_id,delivery_address,pickup_address&limit=500`);
            }
          } catch (e: any) {
            console.warn('⚠️ Could not fetch delivery_requests for history:', e?.message);
          }
        }
        
        // CRITICAL FALLBACK: Fetch missing addresses individually for items not found in batch
        const missingPOIds: string[] = [];
        isolatedHistory.forEach((d: any) => {
          const poId = d.purchase_order_id || d.id;
          if (poId && !deliveryRequestsMap[poId]) {
            missingPOIds.push(poId);
          }
        });
        
        // Fetch missing addresses individually
        if (missingPOIds.length > 0) {
          console.log('🔄 Fetching', missingPOIds.length, 'missing delivery_requests individually...');
          const fallbackPromises = missingPOIds.map(async (poId) => {
            try {
              const fallbackResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${poId}&select=id,purchase_order_id,delivery_address,pickup_address&limit=1`,
                { headers, cache: 'no-store' }
              );
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData && fallbackData.length > 0 && fallbackData[0].delivery_address) {
                  deliveryRequestsMap[poId] = fallbackData[0];
                  console.log('✅ Fetched address individually for', poId?.substring(0, 8), ':', fallbackData[0].delivery_address.substring(0, 60));
                  return fallbackData[0];
                }
              }
            } catch (e: any) {
              console.warn('⚠️ Fallback fetch failed for', poId?.substring(0, 8), ':', e?.message);
            }
            return null;
          });
          
          await Promise.all(fallbackPromises);
          console.log('✅ Completed individual fallback fetches');
        }
        
        // CRITICAL: Format history AFTER fetching delivery_requests (so map is populated)
        const formattedHistory: DeliveryHistory[] = isolatedHistory.map((d: any) => {
          const poId = d.purchase_order_id || d.id;
          const deliveryRequest = deliveryRequestsMap[poId];
          
          // CRITICAL: Prioritize delivery_address from delivery_requests (builder-provided)
          // This is the address the builder filled in during delivery request form
          const builderProvidedAddress = deliveryRequest?.delivery_address;
          const builderProvidedPickup = deliveryRequest?.pickup_address;
          
          // CRITICAL: Get the final delivery address - MUST use builder-provided address from delivery_requests
          // This is the address the builder filled in during delivery request form
          // Priority order:
          // 1. builderProvidedAddress from delivery_requests (highest priority - this is what builder typed)
          // 2. d.delivery_address from isolatedHistory (may already have it from useDataIsolation)
          // 3. d.delivery_location from isolatedHistory (fallback)
          let finalDeliveryAddress = null;
          
          if (builderProvidedAddress && builderProvidedAddress.trim() && 
              builderProvidedAddress !== 'To be provided' && 
              builderProvidedAddress !== 'Delivery location' &&
              builderProvidedAddress !== 'Address not found') {
            finalDeliveryAddress = builderProvidedAddress;
            console.log('✅✅✅ USING BUILDER-PROVIDED ADDRESS from delivery_requests for', poId?.substring(0, 8), 'order', d.order_number || d.po_number, ':', finalDeliveryAddress.substring(0, 80));
          } else if (d.delivery_address && d.delivery_address.trim() && 
                     d.delivery_address !== 'Delivery location' && 
                     d.delivery_address !== 'To be provided' &&
                     d.delivery_address !== 'Address not found') {
            finalDeliveryAddress = d.delivery_address;
            console.log('✅ Using delivery_address from isolatedHistory for', poId?.substring(0, 8), ':', finalDeliveryAddress.substring(0, 60));
          } else if (d.delivery_location && d.delivery_location.trim() && 
                     d.delivery_location !== 'Delivery location' && 
                     d.delivery_location !== 'To be provided' &&
                     d.delivery_location !== 'Address not found') {
            finalDeliveryAddress = d.delivery_location;
            console.log('✅ Using delivery_location from isolatedHistory for', poId?.substring(0, 8), ':', finalDeliveryAddress.substring(0, 60));
          } else {
            // Placeholder or missing: show user-friendly text; avoid console spam for legacy "To be provided" data
            const isPlaceholder =
              (builderProvidedAddress === 'To be provided' || (builderProvidedAddress || '').trim() === '') &&
              (d.delivery_address === 'To be provided' || (d.delivery_address || '').trim() === '') &&
              (d.delivery_location === 'To be provided' || (d.delivery_location || '').trim() === '');
            finalDeliveryAddress = isPlaceholder
              ? 'Address to be provided'
              : 'Delivery address missing - contact support';
            if (!isPlaceholder) {
              console.warn('⚠️ NO DELIVERY ADDRESS for', poId?.substring(0, 8), 'order', d.order_number || d.po_number);
            }
          }
          
          return {
            id: d.id,
            pickup_location: builderProvidedPickup || d.pickup_location || d.pickup_address || 'N/A',
            // CRITICAL: Use the final delivery address (builder-provided from delivery_requests)
            delivery_location: finalDeliveryAddress,
            material_type: d.material_type || d.item_description || 'Materials',
            status: d.status,
            completed_at: d.completed_at || d.delivered_at || d.updated_at || d.created_at,
            price: d.price || d.delivery_fee || d.estimated_cost || 0,
            rating: d.rating || 0,
            // CRITICAL: Preserve order_number for display and matching
            order_number: d.order_number || d.po_number || (d.purchase_order_id ? `PO-${d.purchase_order_id.slice(0, 8).toUpperCase()}` : 'N/A')
          };
        });
        
        console.log('✅ Formatted delivery history:', formattedHistory.length, 'items');
        console.log('📋 Formatted history order numbers:', formattedHistory.map(d => d.order_number).filter(Boolean));
        console.log('📋 Sample delivery locations:', formattedHistory.slice(0, 3).map(d => ({
          order: d.order_number,
          location: d.delivery_location?.substring(0, 50) || 'N/A'
        })));
        setDeliveryHistory(formattedHistory);
      })();
    } else {
      console.log('⚠️ No isolatedHistory found or empty');
      setDeliveryHistory([]);
    }
    // Set pending requests that this provider can accept
    if (isolatedPendingRequests) {
      setPendingRequests(isolatedPendingRequests);
      console.log('🚚 Pending requests loaded:', isolatedPendingRequests.length);
    } else {
      setPendingRequests([]);
    }
    
    // Set delivery history
    if (isolatedHistory) {
      console.log('🚚 Delivery history loaded:', isolatedHistory.length);
    } else {
      setDeliveryHistory([]);
    }
  }, [isolatedProfile, isolatedStats, isolatedActiveDeliveries, isolatedHistory, isolatedPendingRequests]);

  // Keep stats in sync with displayed data (e.g. when aggressive effect adds to deliveryHistory)
  useEffect(() => {
    const displayedActive = activeDeliveries?.length ?? 0;
    const displayedHistory = deliveryHistory?.length ?? 0;
    const total = displayedActive + displayedHistory;
    if (total > 0 && stats.totalDeliveries !== total) {
      const todayStr = new Date().toDateString();
      const historyItems = deliveryHistory || [];
      const completedToday = historyItems.filter((d: Record<string, unknown>) => {
        const dte = new Date((d.completed_at || d.delivered_at || d.updated_at || d.created_at) as string);
        return !isNaN(dte.getTime()) && dte.toDateString() === todayStr;
      }).length;
      const totalEarnings = historyItems.reduce((sum: number, d: Record<string, unknown>) =>
        sum + (Number(d.final_cost) || Number(d.estimated_cost) || Number(d.price) || Number(d.delivery_fee) || 0), 0
      );
      setStats(prev => ({
        ...prev,
        totalDeliveries: total,
        completedToday,
        totalEarnings: prev.totalEarnings || totalEarnings,
      }));
    }
  }, [activeDeliveries?.length, deliveryHistory]);

  // Map unified RPC row to card shape (delivery_location, material_type, etc.)
  // CRITICAL: delivery_address should come from delivery_requests (builder-provided), not purchase_orders
  const toCardDelivery = useCallback((row: UnifiedDeliveryRow): ActiveDelivery & { _items_count?: number; _received_count?: number } => ({
    id: row.id,
    pickup_location: row.pickup_location ?? 'N/A',
    // CRITICAL: Use delivery_address from delivery_requests (builder-provided)
    // The row.delivery_address should already be from delivery_requests if data comes from useDataIsolation
    delivery_location: row.delivery_address ?? 'N/A',
    material_type: 'Materials',
    quantity: String(row._items_count ?? 0),
    customer_name: 'Customer',
    customer_phone: '',
    status: row.status,
    estimated_time: '',
    price: 0,
    distance: 0,
    created_at: row.created_at,
    purchase_order_id: row.purchase_order_id,
    order_number: row.order_number,
    _categorized_status: row._categorized_status,
    _items_count: row._items_count,
    _dispatched_count: row._dispatched_count,
    _received_count: row._received_count,
  }), []);

  // Single source of truth (legacy fallback when unified returns empty): categorize each delivery so badge counts and tab content always match
  // RULE: Accept → order moves to Scheduled; order STAYS in Scheduled until delivery scan (all items receive_scanned); then it moves to History.
  // CRITICAL: Dispatch scan must NOT remove orders from Schedule - they stay until delivery scan.
  const deliveryCategories = useMemo(() => {
    const getCategory = (d: any): 'scheduled' | 'delivered' => {
      const cat = String(d._categorized_status || d.status || '').toLowerCase();
      // Only "delivered" leaves the Schedule tab; everything else stays in Schedule until delivery scan
      if (cat === 'delivered' || cat === 'completed') return 'delivered';
      const allReceived = d._items_count != null && d._received_count != null &&
        d._items_count > 0 && d._received_count >= d._items_count;
      if (allReceived) return 'delivered';
      // All non-delivered orders (accepted, assigned, in_transit, dispatched, shipped, etc.) stay in Schedule until delivery scan
      return 'scheduled';
    };
    const scheduled: any[] = [];
    const deliveredFromActive: any[] = [];
    activeDeliveries.forEach(d => {
      const c = getCategory(d);
      if (c === 'scheduled') scheduled.push(d);
      else deliveredFromActive.push(d);
    });

    console.log('📊 Delivery categorization (Schedule = until delivery scan):', {
      total: activeDeliveries.length,
      scheduled: scheduled.length,
      delivered: deliveredFromActive.length
    });

    return { scheduled, inTransit: [] as any[], deliveredFromActive };
  }, [activeDeliveries]);

  // Calculate Deliveries badge count - must match Scheduled tab logic EXACTLY
  const deliveriesBadgeCount = useMemo(() => {
    // CRITICAL: Use the EXACT same logic as the Scheduled tab display
    // Scheduled tab shows: useLegacyFallback ? deliveryCategories.scheduled : unifiedScheduled.map(toCardDelivery)
    // So badge count must use the same source
    
    // Calculate if unified should be used (same logic as useLegacyFallback but inline to avoid circular dependency)
    const unifiedCount = unifiedScheduled.length + (unifiedInTransit?.length || 0) + (unifiedDelivered?.length || 0);
    const hasUnifiedData = unifiedCount > 0;
    const shouldUseUnified = hasUnifiedData; // Use unified if it has data
    
    let count = 0;
    
    if (shouldUseUnified) {
      // Use unified source - Scheduled tab shows scheduled + in_transit (stay until delivery scan)
      count = unifiedScheduled.length + (unifiedInTransit?.length || 0);
      console.log('📊 Deliveries badge count (unified):', {
        unifiedScheduled: unifiedScheduled.length,
        unifiedInTransit: unifiedInTransit?.length ?? 0,
        count
      });
    } else {
      // Use legacy source - count items in deliveryCategories.scheduled (same as Scheduled tab)
      // deliveryCategories is already calculated from activeDeliveries with getCategory logic
      count = deliveryCategories.scheduled.length;
      console.log('📊 Deliveries badge count (legacy):', {
        scheduled: deliveryCategories.scheduled.length,
        totalActive: activeDeliveries.length,
        count
      });
    }
    
    return count;
  }, [unifiedScheduled, unifiedInTransit, unifiedDelivered, deliveryCategories.scheduled, activeDeliveries.length]);

  // When unified RPC returns empty or legacy has more data (FAST PATH/REST wins), use legacy so dashboard always shows something
  const unifiedCount = unifiedScheduled.length + unifiedInTransit.length + unifiedDelivered.length;
  const legacyCount = deliveryCategories.scheduled.length + deliveryCategories.inTransit.length + deliveryCategories.deliveredFromActive.length + deliveryHistory.length;
  const hasUnifiedData = unifiedCount > 0;
  // FIX: Prefer unified source when it has data, even if legacy has more (unified is the single source of truth)
  const useLegacyFallback = !hasUnifiedData; // Only use legacy if unified has no data
  console.log('📊 Data Source Selection:', {
    unifiedCount,
    legacyCount,
    unifiedScheduled: unifiedScheduled.length,
    unifiedInTransit: unifiedInTransit.length,
    unifiedDelivered: unifiedDelivered.length,
    useLegacyFallback,
    unifiedLoading
  });

  /**
   * Receiving Scanner must use the SAME rows the Deliveries tab shows as "Scheduled".
   *
   * IMPORTANT: useDeliveriesUnified currently clears all buckets (RPC disabled), so hasUnifiedData
   * is almost always false. The tab then uses deliveryCategories.scheduled from validated
   * activeDeliveries — NOT raw isolatedActiveDeliveries. Passing only isolated left the scanner
   * empty or out of sync while the tab + badge showed orders.
   */
  const deliveriesForReceivingScanner = useMemo(() => {
    const mapRow = (d: {
      id: string;
      purchase_order_id?: string | null;
      order_number?: string;
      status?: string;
    }) => ({
      id: d.id,
      purchase_order_id: d.purchase_order_id ?? undefined,
      order_number: d.order_number,
      status: d.status
    });

    if (hasUnifiedData) {
      return [...unifiedScheduled, ...(unifiedInTransit || [])]
        .filter((r) => r.purchase_order_id)
        .map((r) =>
          mapRow({
            id: r.id,
            purchase_order_id: r.purchase_order_id,
            order_number: r.order_number,
            status: r.status
          })
        );
    }

    // Legacy = same list as Scheduled sub-tab (validated active deliveries)
    return deliveryCategories.scheduled.map((d: Record<string, unknown>) =>
      mapRow({
        id: String(d.id ?? ''),
        purchase_order_id: (d.purchase_order_id as string | null | undefined) ?? undefined,
        order_number: d.order_number as string | undefined,
        status: d.status as string | undefined
      })
    );
  }, [hasUnifiedData, unifiedScheduled, unifiedInTransit, deliveryCategories.scheduled]);

  // ============================================================
  // AGGRESSIVE APPROACH: FORCE-ADD KNOWN DELIVERED ORDERS
  // ============================================================
  // Matches supplier "Delivered" tab (all material_items receive_scanned).
  // Add any new delivered order numbers here until RPC returns reliably.
  // ============================================================
  useEffect(() => {
    const AGGRESSIVE_ORDER_NUMBERS = [
      'QR-1772673713715-XJ0LD',
      'QR-1772340447370-W10OJ',
      'PO-1772295614017-4U6J2',
      'PO-1772597788293-2TTAW',
      'PO-1772598054688-GR03X'
    ];
    
    // Check which ones are missing
    const existingOrderNumbers = deliveryHistory.map(h => h.order_number || '').filter(Boolean);
    const missingAggressiveOrders = AGGRESSIVE_ORDER_NUMBERS.filter(orderNum => 
      !existingOrderNumbers.some(existing => existing.includes(orderNum.split('-')[1]))
    );
    
    const DEBUG_AGGRESSIVE = false;
    if (missingAggressiveOrders.length > 0 && user) {
      if (DEBUG_AGGRESSIVE) console.log('Missing delivered orders, force-adding...', missingAggressiveOrders.length);
      const forceAddOrders = async () => {
        try {
          const SUPABASE_URL_AGGRESSIVE = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
          const SUPABASE_ANON_KEY_AGGRESSIVE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
          
          let accessTokenAggressive = SUPABASE_ANON_KEY_AGGRESSIVE;
          try {
            const tokenData = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
            if (tokenData) {
              const parsed = JSON.parse(tokenData);
              accessTokenAggressive = parsed.access_token || SUPABASE_ANON_KEY_AGGRESSIVE;
            }
          } catch (e) {
            // Use anon key
          }
          
          // Better approach: Query delivery_requests with status='delivered' for this provider
          // This is more reliable than searching by PO number
          if (DEBUG_AGGRESSIVE) console.log('Querying delivery_requests with status=delivered for provider');
          // Resolve provider ID: direct user_id then profile chain (consistent with useDataIsolation)
          let providerIdToQuery = user?.id;
          try {
            const providerRes = await fetch(
              `${SUPABASE_URL_AGGRESSIVE}/rest/v1/delivery_providers?user_id=eq.${user?.id}&select=id&limit=1`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY_AGGRESSIVE,
                  'Authorization': `Bearer ${accessTokenAggressive}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              }
            );
            if (providerRes.ok) {
              const providerData = await providerRes.json();
              if (providerData?.length > 0 && providerData[0].id) {
                providerIdToQuery = providerData[0].id;
              } else {
                const profileRes = await fetch(
                  `${SUPABASE_URL_AGGRESSIVE}/rest/v1/profiles?user_id=eq.${user?.id}&select=id&limit=1`,
                  { headers: { 'apikey': SUPABASE_ANON_KEY_AGGRESSIVE, 'Authorization': `Bearer ${accessTokenAggressive}`, 'Accept': 'application/json' }, cache: 'no-store' }
                );
                if (profileRes.ok) {
                  const profiles = await profileRes.json();
                  const profileId = profiles?.[0]?.id;
                  if (profileId) {
                    const dpRes = await fetch(
                      `${SUPABASE_URL_AGGRESSIVE}/rest/v1/delivery_providers?user_id=eq.${profileId}&select=id&limit=1`,
                      { headers: { 'apikey': SUPABASE_ANON_KEY_AGGRESSIVE, 'Authorization': `Bearer ${accessTokenAggressive}`, 'Accept': 'application/json' }, cache: 'no-store' }
                    );
                    if (dpRes.ok) {
                      const dpData = await dpRes.json();
                      if (dpData?.[0]?.id) providerIdToQuery = dpData[0].id;
                    }
                  }
                }
              }
            }
          } catch (e) {
            if (DEBUG_AGGRESSIVE) console.warn('Could not lookup provider ID, using user.id');
          }
          
          if (!providerIdToQuery) {
            if (DEBUG_AGGRESSIVE) console.error('No provider ID available');
            return;
          }
          
          // Query delivery_requests with status='delivered' or 'completed' for this provider
          // Try both provider_id and user_id (in case provider_id is actually user_id)
          let deliveredRequests: any[] = [];
          
          // Try querying by provider_id first
          try {
            const deliveredRequestsRes = await fetch(
              `${SUPABASE_URL_AGGRESSIVE}/rest/v1/delivery_requests?provider_id=eq.${providerIdToQuery}&status=in.(delivered,completed)&select=id,purchase_order_id,delivered_at,created_at,status&order=delivered_at.desc&limit=50`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY_AGGRESSIVE,
                  'Authorization': `Bearer ${accessTokenAggressive}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              }
            );
            
            if (deliveredRequestsRes.ok) {
              const data = await deliveredRequestsRes.json();
              if (Array.isArray(data)) {
                deliveredRequests = data;
                if (DEBUG_AGGRESSIVE) console.log('Found delivered delivery_requests (by provider_id):', deliveredRequests.length);
              }
            } else {
              const errorText = await deliveredRequestsRes.text();
              if (DEBUG_AGGRESSIVE) console.warn('Query by provider_id failed:', deliveredRequestsRes.status);
            }
          } catch (e) {
            if (DEBUG_AGGRESSIVE) console.warn('Error querying by provider_id:', e);
          }
          
          // If no results, try querying by user_id (fallback)
          if (deliveredRequests.length === 0 && user?.id) {
            try {
              const deliveredRequestsRes2 = await fetch(
                `${SUPABASE_URL_AGGRESSIVE}/rest/v1/delivery_requests?provider_id=eq.${user.id}&status=in.(delivered,completed)&select=id,purchase_order_id,delivered_at,created_at,status&order=delivered_at.desc&limit=50`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY_AGGRESSIVE,
                    'Authorization': `Bearer ${accessTokenAggressive}`,
                    'Content-Type': 'application/json'
                  },
                  cache: 'no-store'
                }
              );
              
              if (deliveredRequestsRes2.ok) {
                const data = await deliveredRequestsRes2.json();
                if (Array.isArray(data)) {
                  deliveredRequests = data;
                  if (DEBUG_AGGRESSIVE) console.log('Found delivered delivery_requests (by user_id):', deliveredRequests.length);
                }
              }
            } catch (e) {
              if (DEBUG_AGGRESSIVE) console.warn('Error querying by user_id:', e);
            }
          }
          
          if (DEBUG_AGGRESSIVE) console.log('Total delivered delivery_requests found:', deliveredRequests.length);
          
          if (!deliveredRequests || deliveredRequests.length === 0) {
            if (DEBUG_AGGRESSIVE) console.log('No delivered delivery_requests found');
            return;
          }
          
          // Get unique purchase_order_ids
          const poIds: string[] = [];
          const seenPoIds: Record<string, boolean> = {};
          for (let i = 0; i < deliveredRequests.length; i++) {
            const poId = deliveredRequests[i].purchase_order_id;
            if (poId && !seenPoIds[poId]) {
              seenPoIds[poId] = true;
              poIds.push(poId);
            }
          }
          
          if (poIds.length === 0) {
            if (DEBUG_AGGRESSIVE) console.log('No purchase_order_ids found in delivered requests');
            return;
          }
          
          // Query purchase_orders by IDs
          const poIdsFilter = poIds.join(',');
          const purchaseOrdersRes = await fetch(
            `${SUPABASE_URL_AGGRESSIVE}/rest/v1/purchase_orders?id=in.(${poIdsFilter})&select=*&limit=50`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY_AGGRESSIVE,
                'Authorization': `Bearer ${accessTokenAggressive}`,
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            }
          );
          
          if (!purchaseOrdersRes.ok) {
            const errorText = await purchaseOrdersRes.text();
            if (DEBUG_AGGRESSIVE) console.error('Failed to query purchase_orders:', purchaseOrdersRes.status);
            return;
          }
          
          const aggressiveOrders = await purchaseOrdersRes.json();
          if (DEBUG_AGGRESSIVE) console.log('Found purchase orders:', aggressiveOrders?.length || 0);
          
          // Remove duplicates - NO Map constructor to avoid minification errors
          const seenIds: Record<string, boolean> = {};
          const uniqueAggressiveOrders: any[] = [];
          for (let j = 0; j < aggressiveOrders.length; j++) {
            const po = aggressiveOrders[j];
            const poId = po.id ? (po.id + '') : '';
            if (poId && !seenIds[poId]) {
              seenIds[poId] = true;
              uniqueAggressiveOrders.push(po);
            } else if (!poId) {
              // Include items without ID (shouldn't happen, but be safe)
              uniqueAggressiveOrders.push(po);
            }
          }
          
          if (uniqueAggressiveOrders.length > 0) {
            if (DEBUG_AGGRESSIVE) console.log('Force-adding orders to deliveryHistory:', uniqueAggressiveOrders.length);
            
            // CRITICAL: Fetch delivery_requests to get builder-provided delivery_address
            // The builder fills in delivery_address in delivery_requests table during delivery request
            const aggressivePOIds = uniqueAggressiveOrders.map((po: any) => po.id).filter(Boolean);
            if (DEBUG_AGGRESSIVE) console.log('Fetching delivery_requests for', aggressivePOIds.length, 'purchase_order_ids');
            
            // Fetch delivery_requests asynchronously
            (async () => {
              // Use plain object instead of Map to avoid minification issues
              let deliveryRequestsMap: Record<string, any> = {};
              
              if (aggressivePOIds.length > 0) {
                try {
                  const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
                  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
                  
                  let accessToken = SUPABASE_ANON_KEY;
                  try {
                    const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
                    if (storedSession) {
                      const parsed = JSON.parse(storedSession);
                      if (parsed.access_token) accessToken = parsed.access_token;
                    }
                  } catch (e) {}
                  
                  const headers = {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`
                  };
                  
                  // Fetch delivery_requests for these purchase_orders - ALL statuses
                  const poIdsParam = aggressivePOIds.join(',');
                  const drResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=in.(${poIdsParam})&select=id,purchase_order_id,delivery_address,pickup_address,status&order=created_at.desc&limit=500`,
                    { headers, cache: 'no-store' }
                  );
                  
                  if (drResponse.ok) {
                    const drData = await drResponse.json();
                    if (DEBUG_AGGRESSIVE) console.log('Fetched delivery_requests:', drData.length);
                    
                    // Map by purchase_order_id - use most recent with valid address
                    drData.forEach((dr: any) => {
                      if (dr.purchase_order_id) {
                        const existing = deliveryRequestsMap[dr.purchase_order_id];
                        // Only update if this is newer or if existing doesn't have a valid address
                        if (!existing || 
                            (dr.delivery_address && dr.delivery_address.trim() && dr.delivery_address !== 'To be provided' && 
                             (!existing.delivery_address || existing.delivery_address === 'To be provided'))) {
                          deliveryRequestsMap[dr.purchase_order_id] = dr;
                          if (dr.delivery_address && dr.delivery_address.trim() && dr.delivery_address !== 'To be provided') {
                            if (DEBUG_AGGRESSIVE) console.log('Found builder-provided address for', dr.purchase_order_id?.substring(0, 8));
                          }
                        }
                      }
                    });
                  } else {
                    if (DEBUG_AGGRESSIVE) console.warn('Failed to fetch delivery_requests:', drResponse.status);
                  }
                } catch (e: any) {
                  if (DEBUG_AGGRESSIVE) console.warn('Error fetching delivery_requests:', e?.message);
                }
              }
              
              // Transform to history format - NO CONSTRUCTORS to avoid minification errors
              const aggressiveHistoryEntries: DeliveryHistory[] = [];
              for (let i = 0; i < uniqueAggressiveOrders.length; i++) {
                const po = uniqueAggressiveOrders[i];
                try {
                  // CRITICAL: Get builder-provided address from delivery_requests
                  const deliveryRequest = deliveryRequestsMap[po.id];
                  const builderProvidedAddress = deliveryRequest?.delivery_address;
                  
                  // Get completed_at - use string directly, NO Date constructor
                  let completedAt = '';
                  if (po.delivered_at) {
                    completedAt = po.delivered_at + '';
                  } else if (po.updated_at) {
                    completedAt = po.updated_at + '';
                  } else if (po.created_at) {
                    completedAt = po.created_at + '';
                  } else {
                    // Fallback: use hardcoded ISO string - NO Date operations at all
                    completedAt = '2024-03-07T00:00:00.000Z';
                  }
                  
                  // Get price - avoid Number() constructor
                  let price = 0;
                  if (po.total_amount != null) {
                    if (typeof po.total_amount === 'number') {
                      price = po.total_amount;
                    } else {
                      // Use unary + operator instead of Number()
                      const num = +po.total_amount;
                      price = (num === num) ? num : 0; // NaN check: NaN !== NaN
                    }
                  }
                  
                  // Build entry - NO String() or Number() constructors
                  const poId = po.id || '';
                  const poNumber = po.po_number || '';
                  const idValue = poId ? (poId + '') : ('aggressive-' + (poNumber || i) + '');
                  
                  // CRITICAL: Use builder-provided address from delivery_requests (highest priority)
                  // Fallback to po.delivery_address; if both placeholder/missing, show user-friendly label
                  const isPlaceholder =
                    (builderProvidedAddress === 'To be provided' || (builderProvidedAddress || '').trim() === '') &&
                    (po.delivery_address === 'To be provided' || (po.delivery_address || '').trim() === '');
                  let deliveryAddr: string;
                  if (builderProvidedAddress && builderProvidedAddress.trim() &&
                      builderProvidedAddress !== 'To be provided' &&
                      builderProvidedAddress !== 'Delivery location') {
                    deliveryAddr = builderProvidedAddress;
                    if (DEBUG_AGGRESSIVE) console.log('Using builder-provided address for', poId?.substring(0, 8));
                  } else if (po.delivery_address && po.delivery_address.trim() &&
                             po.delivery_address !== 'To be provided' &&
                             po.delivery_address !== 'Delivery location') {
                    deliveryAddr = po.delivery_address;
                    if (DEBUG_AGGRESSIVE) console.log('Using delivery_address from purchase_order for', poId?.substring(0, 8));
                  } else {
                    deliveryAddr = isPlaceholder ? 'Address to be provided' : 'Delivery address missing - contact support';
                    if (!isPlaceholder) {
                      if (DEBUG_AGGRESSIVE) console.warn('No valid address for', poId?.substring(0, 8));
                    }
                  }
                  
                  const entry: DeliveryHistory = {
                    id: idValue,
                    pickup_location: deliveryRequest?.pickup_address || 'Supplier location',
                    delivery_location: deliveryAddr + '',
                    material_type: 'Construction Materials',
                    status: 'delivered',
                    completed_at: completedAt,
                    price: price,
                    rating: 0,
                    order_number: poNumber ? (poNumber + '') : undefined
                  };
                  
                  aggressiveHistoryEntries.push(entry);
                } catch (mapError: any) {
                  if (DEBUG_AGGRESSIVE) console.error('Error mapping order:', po?.po_number || po?.id, mapError);
                  // Skip this entry on error
                }
              }
              
              // Check for duplicates before adding - use plain objects instead of Set to avoid minification issues
              const existingIds: Record<string, boolean> = {};
              const existingOrderNums: Record<string, boolean> = {};
              deliveryHistory.forEach(h => {
                if (h.id) existingIds[h.id] = true;
                if (h.order_number) existingOrderNums[h.order_number] = true;
              });
              
              const newEntries = aggressiveHistoryEntries.filter(entry => {
                const isDuplicate = existingIds[entry.id] || 
                                   (entry.order_number && existingOrderNums[entry.order_number]);
                return !isDuplicate;
              });
              
              if (newEntries.length > 0) {
                setDeliveryHistory(prev => {
                  const combined = [...prev, ...newEntries];
                  const byId: Record<string, typeof combined[0]> = {};
                  combined.forEach(h => {
                    if (h.id && !byId[h.id]) byId[h.id] = h;
                  });
                  const deduped = Object.values(byId);
                  deduped.sort((a, b) => {
                    try {
                      const dateA = a.completed_at || '';
                      const dateB = b.completed_at || '';
                      if (dateB > dateA) return 1;
                      if (dateB < dateA) return -1;
                      return 0;
                    } catch {
                      return 0;
                    }
                  });
                  return deduped;
                });
              }
            })(); // End async IIFE
          } else {
            if (DEBUG_AGGRESSIVE) console.error('Failed to find known delivered orders');
          }
        } catch (aggressiveError: any) {
          if (DEBUG_AGGRESSIVE) console.error('Force-add error:', aggressiveError?.message || aggressiveError);
        }
      };
      
      // Run immediately
      forceAddOrders();
    } else if (missingAggressiveOrders.length === 0) {
      if (DEBUG_AGGRESSIVE) console.log('All known delivered orders already in deliveryHistory');
    }
  }, [deliveryHistory, user]);

  // Show UI immediately - don't wait for data
  // Use safety timeout to prevent infinite loading
  useEffect(() => {
    // Check if user is available from context
    if (user) {
      setLoading(false);
      return;
    }
    
    // Fallback: Check localStorage for auth
    const checkLocalAuth = () => {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.user?.id) {
            console.log('🚚 DeliveryDashboard: Found user in localStorage, showing UI');
            setLoading(false);
            return true;
          }
        }
      } catch (e) {}
      return false;
    };
    
    // Try localStorage immediately
    if (checkLocalAuth()) return;
    
    // Safety timeout - show UI after 2 seconds max
    const timeout = setTimeout(() => {
      console.log('🚚 DeliveryDashboard: Safety timeout - forcing loading false');
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [user]);

  // Log data access for security audit
  useEffect(() => {
    if (user?.id) {
      logDataAccessAttempt(user.id, 'view', 'delivery_dashboard', true, 'Dashboard loaded');
    }
  }, [user?.id]);

  // Function to load notification counts (declared before subscription to avoid initialization error)
  const loadNotificationCounts = useCallback(async () => {
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.access_token) accessToken = parsed.access_token;
        }
      } catch (e) {}

      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      };

      // CRITICAL: Count only PENDING delivery requests that are NOT yet accepted by this provider
      // Badge should only show NEW requests available for acceptance, not already-accepted ones
      // CRITICAL: Also fetch delivery_address and material_type for composite key deduplication
      // Get current provider ID to filter out already-accepted requests
      let currentProviderId = user?.id || null;
      try {
        const providerResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${user?.id}&select=id&limit=1`,
          { headers, cache: 'no-store' }
        );
        if (providerResponse.ok) {
          const providers = await providerResponse.json();
          if (Array.isArray(providers) && providers.length > 0) {
            currentProviderId = providers[0].id;
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch provider ID, using user ID:', e);
      }
      
      // Only fetch PENDING/REQUESTED/ASSIGNED requests (not accepted/in_transit - those are already accepted)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?status=in.(pending,requested,assigned)&select=id,status,purchase_order_id,provider_id,delivery_address,material_type,created_at&order=created_at.desc&limit=100`,
        { headers, cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // STEP 1: Filter out delivered/completed/cancelled/rejected (shouldn't be in query, but double-check)
        const activeRequests = data.filter((dr: any) => 
          !['delivered', 'completed', 'cancelled', 'rejected'].includes(dr.status)
        );
        
        // STEP 2: Filter out requests already accepted by THIS provider (should not appear in badge)
        const pendingRequests = activeRequests.filter((dr: any) => {
          // Exclude if already accepted by this provider
          if (currentProviderId && dr.provider_id === currentProviderId) {
            return false; // Already accepted by this provider - don't count
          }
          // Only count pending/requested/assigned with NULL provider_id (not yet accepted)
          return !dr.provider_id || dr.provider_id === null;
        });
        
        // STEP 3: Filter out requests without purchase_order_id (placeholder/default requests)
        const requestsWithPO = pendingRequests.filter((dr: any) => 
          dr.purchase_order_id && 
          dr.purchase_order_id.trim() !== '' && 
          dr.purchase_order_id !== 'null' && 
          dr.purchase_order_id !== 'undefined'
        );
        
        // STEP 3: Get unique purchase_order_ids (using object-based deduplication to avoid minification errors)
        const uniquePOIdsObj: Record<string, boolean> = {};
        requestsWithPO.forEach((dr: any) => {
          const poId = dr.purchase_order_id;
          if (poId) uniquePOIdsObj[poId] = true;
        });
        const uniquePOIds = Object.keys(uniquePOIdsObj);
        
        // STEP 4: Verify purchase_orders exist (filter out orphaned requests) and get po_numbers
        if (uniquePOIds.length > 0) {
          try {
            const poResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${uniquePOIds.join(',')})&select=id,status,delivery_status,po_number&limit=1000`,
              { headers, cache: 'no-store' }
            );
            
            if (poResponse.ok) {
              const validPOs = await poResponse.json();
              // Add null check to prevent "is not a constructor" errors
              if (!validPOs || !Array.isArray(validPOs)) {
                console.warn('⚠️ Invalid purchase_orders response:', validPOs);
                setNotificationCount(0);
                setPendingNotificationCount(0);
                return;
              }
              // Use object-based lookup instead of Set to avoid minification errors
              const validPOIds: Record<string, boolean> = {};
              validPOs
                .filter((po: any) => 
                  // Only count purchase_orders that are not delivered/completed/cancelled
                  po && po.id && 
                  !['delivered', 'completed', 'cancelled'].includes(po.status) &&
                  (!po.delivery_status || !['delivered', 'completed', 'cancelled'].includes(po.delivery_status))
                )
                .forEach((po: any) => {
                  if (po.id) validPOIds[po.id] = true;
                });
              
              // Count only delivery_requests with valid, non-delivered purchase_orders
              const validRequests = requestsWithPO.filter((dr: any) => 
                validPOIds[dr.purchase_order_id]
              );
              
              // STEP 5: Deduplicate using same logic as DeliveryNotifications.tsx
              // PRIMARY: po_number (if available), SECONDARY: composite key (deliveryAddress + materialType), TERTIARY: purchase_order_id
              // Use object-based map instead of Map to avoid minification errors
              const poIdToPONumber: Record<string, string> = {};
              validPOs.forEach((po: any) => {
                if (po.id && po.po_number) {
                  poIdToPONumber[po.id] = po.po_number;
                }
              });
              
              // Helper to normalize material types (same as DeliveryNotifications.tsx)
              const normalizeMaterialType = (materialType: string | undefined | null): string => {
                if (!materialType) return '';
                const normalized = String(materialType).trim().toLowerCase();
                if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
                  return 'construction_materials';
                }
                return normalized;
              };
              
              // Use object-based sets instead of Set to avoid minification errors
              const seenPONumbers: Record<string, boolean> = {};
              const seenCompositeKeys: Record<string, boolean> = {};
              const seenPOIds: Record<string, boolean> = {};
              
              const uniqueCount = validRequests.filter((dr: any) => {
                // PRIMARY: Check po_number first
                const poNumber = poIdToPONumber[dr.purchase_order_id];
                if (poNumber) {
                  const normalizedPONumber = String(poNumber).trim().toLowerCase();
                  if (seenPONumbers[normalizedPONumber]) {
                    return false; // Duplicate po_number
                  }
                  seenPONumbers[normalizedPONumber] = true;
                  return true;
                }
                
                // SECONDARY: Use composite key (deliveryAddress + materialType) when po_number is missing
                if (dr.delivery_address && dr.material_type) {
                  const normalizedAddress = String(dr.delivery_address).trim().toLowerCase();
                  const normalizedMaterial = normalizeMaterialType(dr.material_type);
                  const compositeKey = `${normalizedAddress}|${normalizedMaterial}`;
                  if (seenCompositeKeys[compositeKey]) {
                    return false; // Duplicate composite key
                  }
                  seenCompositeKeys[compositeKey] = true;
                  return true;
                }
                
                // TERTIARY: Fallback to purchase_order_id
                if (seenPOIds[dr.purchase_order_id]) {
                  return false; // Duplicate purchase_order_id
                }
                seenPOIds[dr.purchase_order_id] = true;
                return true;
              }).length;
              
              console.log(`📊 Notification count: ${data.length} total → ${activeRequests.length} active → ${pendingRequests.length} pending (not accepted by this provider) → ${requestsWithPO.length} with PO → ${uniqueCount} unique valid`);
              const countToShow = uniqueCount > 0 ? uniqueCount : (requestsWithPO.length > 0 ? uniquePOIds.length : 0);
              setNotificationCount(countToShow);
              setPendingNotificationCount(countToShow);
            } else {
              console.warn('⚠️ Failed to verify purchase_orders for notification count');
              // Fallback: count using composite key deduplication (same logic as above)
              // Add null check to prevent "is not a constructor" errors
              if (!requestsWithPO || !Array.isArray(requestsWithPO)) {
                console.warn('⚠️ requestsWithPO is invalid:', requestsWithPO);
                setNotificationCount(0);
                setPendingNotificationCount(0);
                return;
              }
              
              const normalizeMaterialType = (materialType: string | undefined | null): string => {
                if (!materialType) return '';
                const normalized = String(materialType).trim().toLowerCase();
                if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
                  return 'construction_materials';
                }
                return normalized;
              };
              
              // Use object-based sets instead of Set to avoid minification errors
              const seenCompositeKeys: Record<string, boolean> = {};
              const seenPOIds: Record<string, boolean> = {};
              const uniqueCount = requestsWithPO.filter((dr: any) => {
                // Use composite key (deliveryAddress + materialType) when available
                if (dr.delivery_address && dr.material_type) {
                  const normalizedAddress = String(dr.delivery_address).trim().toLowerCase();
                  const normalizedMaterial = normalizeMaterialType(dr.material_type);
                  const compositeKey = `${normalizedAddress}|${normalizedMaterial}`;
                  if (seenCompositeKeys[compositeKey]) return false;
                  seenCompositeKeys[compositeKey] = true;
                  return true;
                }
                // Fallback to purchase_order_id
                if (dr.purchase_order_id && seenPOIds[dr.purchase_order_id]) return false;
                if (dr.purchase_order_id) seenPOIds[dr.purchase_order_id] = true;
                return true;
              }).length;
              setNotificationCount(uniqueCount);
              setPendingNotificationCount(uniqueCount);
            }
          } catch (verifyError) {
            console.warn('⚠️ Error verifying purchase_orders:', verifyError);
            // Fallback: count using composite key deduplication (same logic as above)
            // Add null check to prevent "is not a constructor" errors
            if (!requestsWithPO || !Array.isArray(requestsWithPO)) {
              console.warn('⚠️ requestsWithPO is invalid:', requestsWithPO);
              setNotificationCount(0);
              setPendingNotificationCount(0);
              return;
            }
            
            const normalizeMaterialType = (materialType: string | undefined | null): string => {
              if (!materialType) return '';
              const normalized = String(materialType).trim().toLowerCase();
              if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
                return 'construction_materials';
              }
              return normalized;
            };
            
              // Use object-based sets instead of Set to avoid minification errors
              const seenCompositeKeys: Record<string, boolean> = {};
              const seenPOIds: Record<string, boolean> = {};
              const uniqueCount = requestsWithPO.filter((dr: any) => {
                // Use composite key (deliveryAddress + materialType) when available
                if (dr.delivery_address && dr.material_type) {
                  const normalizedAddress = String(dr.delivery_address).trim().toLowerCase();
                  const normalizedMaterial = normalizeMaterialType(dr.material_type);
                  const compositeKey = `${normalizedAddress}|${normalizedMaterial}`;
                  if (seenCompositeKeys[compositeKey]) return false;
                  seenCompositeKeys[compositeKey] = true;
                  return true;
                }
                // Fallback to purchase_order_id
                if (dr.purchase_order_id && seenPOIds[dr.purchase_order_id]) return false;
                if (dr.purchase_order_id) seenPOIds[dr.purchase_order_id] = true;
              return true;
            }).length;
            setNotificationCount(uniqueCount);
            setPendingNotificationCount(uniqueCount);
          }
        } else {
          // No valid requests
          console.log('📊 Notification count: 0 (no valid delivery requests)');
          setNotificationCount(0);
          setPendingNotificationCount(0);
        }
      } else {
        setNotificationCount(0);
        setPendingNotificationCount(0);
      }
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  }, [user?.id]);

  // Real-time subscription for delivery updates - including material_items (receive scans)
  // CRITICAL: material_items subscription catches receive_scanned updates so orders move to Delivered tab
  useEffect(() => {
    if (!user?.id) return;

    // Get current provider ID (try multiple sources) - use safe access
    const currentProvider = providerProfile || isolatedProfile || null;
    const currentProviderId = currentProvider?.id || user?.id;
    console.log('🔔 Setting up real-time subscription for delivery requests, purchase orders, and material_items...', {
      providerId: currentProviderId?.substring(0, 8) || 'NULL',
      userId: user?.id?.substring(0, 8) || 'NULL'
    });
    
    let materialItemsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefetchFromMaterialItems = () => {
      if (materialItemsDebounceTimer) clearTimeout(materialItemsDebounceTimer);
      materialItemsDebounceTimer = setTimeout(() => {
        materialItemsDebounceTimer = null;
        console.log('📦 material_items changed (QR scan) - refetching delivery data...');
        refetchData();
        refetchUnified();
        loadNotificationCounts();
      }, 120);
    };
    
    const channel = supabase
      .channel('delivery-requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'material_items'
        },
        (payload) => {
          const newRow = payload.new as { receive_scanned?: boolean; dispatch_scanned?: boolean; purchase_order_id?: string };
          // IMMEDIATE: When items are receive_scanned, check if all items are received
          // If all items are received, the order should be removed from schedule immediately
          if (newRow?.receive_scanned === true) {
            console.log('📦 Item receive_scanned - checking if order should be removed from schedule...');
            // Immediate refresh to check if all items are received
            refetchData();
            refetchUnified();
            loadNotificationCounts();
            
            // Also refresh after a short delay to ensure DB commit
            setTimeout(() => {
              refetchData();
              refetchUnified();
              loadNotificationCounts();
            }, 300);
            
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
          }
          // Supplier dispatches scan → refresh data (delivery provider only needs scheduled tab)
          if (newRow?.dispatch_scanned === true) {
            console.log('📦 Item dispatch_scanned - refreshing schedule...');
            refetchData();
            refetchUnified();
            toast({
              title: '🚚 Materials Dispatched!',
              description: 'Supplier has dispatched. Schedule updated.',
              duration: 4000,
            });
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_requests'
        },
        (payload) => {
          console.log('🚚 New delivery request received:', payload);
          // Alarm: play sound so provider hears there's a new request
          playNewRequestAlarm();
          // Alarm: browser notification (works when tab is in background)
          notifyNewDeliveryRequest();
          // Switch to Alerts tab so provider sees the new request immediately
          setActiveTab('notifications');
          // Refresh data and badge count
          refetchData();
          loadNotificationCounts();
          toast({
            title: '🚚 New Delivery Request!',
            description: 'A new delivery job is available. Check the Alerts tab.',
            duration: 6000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests'
          // NOTE: Removed filter - PostgREST filters don't work reliably in real-time subscriptions
          // We'll do client-side filtering instead
        },
        (payload) => {
          console.log('📦 Delivery request updated:', payload);
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          const providerId = payload.new?.provider_id;
          
          // CLIENT-SIDE FILTER: Only process updates for this provider's deliveries
          // Get current provider ID (try multiple sources) - use safe access
          const currentProvider = providerProfile || isolatedProfile || null;
          const currentProviderId = currentProvider?.id || user?.id;
          if (!currentProviderId) {
            console.log('⚠️ No provider ID available - skipping update');
            return;
          }
          
          // Check if this update is for our provider
          // provider_id in delivery_requests is the delivery_provider.id (UUID), not user_id
          if (providerId && providerId !== currentProviderId) {
            // Also check if it matches user_id (fallback)
            if (providerId !== user?.id) {
              console.log('⚠️ Ignoring update - not for this provider', {
                payloadProviderId: providerId?.substring(0, 8),
                currentProviderId: currentProviderId?.substring(0, 8),
                userId: user?.id?.substring(0, 8)
              });
              return;
            }
          }
          
          // IMMEDIATE: When status changes to 'accepted', refresh schedule immediately
          if (oldStatus !== 'accepted' && newStatus === 'accepted') {
            console.log('✅ Delivery accepted - immediately refreshing schedule...');
            // Force immediate refresh (no delay for instant update)
            refetchData();
            refetchUnified();
            loadNotificationCounts();
            
            // Also refresh after a short delay to ensure DB commit
            setTimeout(() => {
              refetchData();
              refetchUnified();
              loadNotificationCounts();
            }, 200);
            
            // Also ensure we're on the schedule tab
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
            
            toast({
              title: '✅ Delivery Accepted!',
              description: 'The delivery has been added to your schedule.',
              duration: 3000,
            });
            return; // Early return to avoid duplicate refresh
          }
          
          // IMMEDIATE: When status changes to 'delivered', refresh to move order to history
          if (oldStatus !== 'delivered' && newStatus === 'delivered') {
            console.log('✅ Delivery completed - immediately refreshing to move to Delivery History tab...');
            refetchData();
            refetchUnified();
            loadNotificationCounts();
            // Switch to Delivery History tab when order is delivered
            setActiveTab('history');
            
            toast({
              title: '✅ Delivery Completed!',
              description: 'Order has been delivered and moved to Delivery History tab.',
              duration: 4000,
            });
            
            // Also refresh after a short delay to ensure DB commit
            setTimeout(() => {
              refetchData();
              refetchUnified();
              loadNotificationCounts();
            }, 200);
            return; // Early return to avoid duplicate refresh
          }
          
          // When supplier dispatches, status changes to 'in_transit', 'dispatched', or 'shipped'
          const dispatchedStatuses = ['in_transit', 'dispatched', 'shipped', 'out_for_delivery'];
          const wasNotDispatched = !dispatchedStatuses.includes(oldStatus);
          const isNowDispatched = dispatchedStatuses.includes(newStatus);
          
          if (isNowDispatched && wasNotDispatched) {
            toast({
              title: '🚚 Materials Dispatched!',
              description: 'Materials are now in transit.',
              duration: 5000,
            });
            // Refresh schedule to show updated status
            refetchData();
            refetchUnified();
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
            console.log('🧭 Refreshing schedule after dispatch');
          }
          
          // When provider receives, status changes to 'delivered' or 'completed'
          const deliveredStatuses = ['delivered', 'completed'];
          const wasNotDelivered = !deliveredStatuses.includes(oldStatus);
          const isNowDelivered = deliveredStatuses.includes(newStatus);
          
          if (isNowDelivered && wasNotDelivered) {
            console.log('✅ Delivery completed - immediately removing from schedule...');
            // IMMEDIATE: Remove from schedule by refreshing data
            refetchData();
            refetchUnified();
            loadNotificationCounts();
            
            // Also refresh after a short delay to ensure DB commit
            setTimeout(() => {
              refetchData();
              refetchUnified();
              loadNotificationCounts();
            }, 200);
            
            toast({
              title: '✅ Delivery Complete!',
              description: 'The order has been removed from your schedule.',
              duration: 5000,
            });
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
            return; // Early return to avoid duplicate refresh
          }
          
          // General refresh for other status changes
          refetchData();
          loadNotificationCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchase_orders'
        },
        (payload) => {
          console.log('📦 Purchase order status updated:', payload.new.status);
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          // When supplier dispatches, status changes to in_transit, dispatched, or shipped
          const dispatchedStatuses = ['in_transit', 'dispatched', 'shipped', 'out_for_delivery'];
          const wasNotDispatched = !dispatchedStatuses.includes(oldStatus);
          const isNowDispatched = dispatchedStatuses.includes(newStatus);
          
          if (isNowDispatched && wasNotDispatched) {
            toast({
              title: '🚚 Materials Dispatched!',
              description: 'Supplier has dispatched materials. Switching to "In Transit" tab.',
              duration: 5000,
            });
            // NAVIGATE to Deliveries tab (delivery provider only needs scheduled tab)
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
            console.log('🧭 Auto-navigating to Deliveries tab (from PO update)');
          }
          
          // When delivery is completed
          const deliveredStatuses = ['delivered', 'completed'];
          const wasNotDelivered = !deliveredStatuses.includes(oldStatus);
          const isNowDelivered = deliveredStatuses.includes(newStatus);
          
          if (isNowDelivered && wasNotDelivered) {
            toast({
              title: '✅ Delivery Complete!',
              description: 'Delivery has been completed successfully. Data refreshed.',
              duration: 5000,
            });
            // NAVIGATE to Deliveries tab (delivery provider only needs scheduled tab)
            setActiveTab('deliveries');
            setDeliveriesSubTab('scheduled');
            console.log('🧭 Auto-navigating to Deliveries tab (from PO update)');
          }
          
          refetchData();
        }
      )
      .subscribe();

    return () => {
      if (materialItemsDebounceTimer) clearTimeout(materialItemsDebounceTimer);
      console.log('🔔 Cleaning up delivery requests subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchData, refetchUnified, loadNotificationCounts, toast, activeTab]);

  // Update selected scheduled order when scheduled orders change (Schedule = scheduled + in_transit until delivery scan)
  useEffect(() => {
    if (activeTab !== 'deliveries') return;
    
    const unifiedIds = [...unifiedScheduled, ...(unifiedInTransit || [])].map(d => d.id || d.purchase_order_id || '').filter(Boolean);
    const legacyIds = deliveryCategories.scheduled.map(d => d.id || d.purchase_order_id || '').filter(Boolean);
    // Use object-based deduplication instead of Set to avoid minification errors
    const allScheduledIdsObj: Record<string, boolean> = {};
    [...unifiedIds, ...legacyIds].forEach(id => {
      if (id) allScheduledIdsObj[id] = true;
    });
    const allScheduledIds = Object.keys(allScheduledIdsObj);
    
    if (allScheduledIds.length > 0) {
      // If current selection is invalid or empty, select the first one
      if (!selectedScheduledOrderId || !allScheduledIds.includes(selectedScheduledOrderId)) {
        setSelectedScheduledOrderId(allScheduledIds[0]);
      }
    } else if (selectedScheduledOrderId) {
      setSelectedScheduledOrderId("");
    }
  }, [unifiedScheduled, unifiedInTransit, deliveryCategories.scheduled, activeTab, selectedScheduledOrderId]);

  // Load notification counts for the Alerts tab badge (run when user is available and when Alerts tab is shown)
  useEffect(() => {
    if (!user?.id) return;
    loadNotificationCounts();
    
    // Set up real-time subscription to update counts when delivery_requests change
    const subscription = supabase
      .channel('alerts-count-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'delivery_requests' },
        () => {
          console.log('🔔 delivery_requests changed, refreshing counts...');
          loadNotificationCounts();
        }
      )
      .subscribe();
    
    // Also refresh every 30 seconds as backup
    const interval = setInterval(loadNotificationCounts, 30000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [loadNotificationCounts, user?.id]);

  // When user becomes available, refresh Alerts badge count (in case first run was before auth)
  useEffect(() => {
    if (user?.id) {
      const t = setTimeout(loadNotificationCounts, 800);
      return () => clearTimeout(t);
    }
  }, [user?.id, loadNotificationCounts]);

  // When Alerts tab is selected, refresh count so badge is up to date
  useEffect(() => {
    if (activeTab === 'notifications' && user?.id) {
      loadNotificationCounts();
    }
  }, [activeTab, user?.id, loadNotificationCounts]);

  // Request browser notification permission on load so alarm notifications work when new request arrives
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch provider profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setProviderProfile(profile);

        // Fetch real delivery stats - use provider_id (ACTUAL column name in database)
        const { data: deliveries, error: deliveriesError } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('provider_id', user.id);

        if (!deliveriesError && deliveries) {
          const today = new Date().toDateString();
          const completedToday = deliveries.filter(d => 
            d.status === 'delivered' && 
            d.delivered_at && new Date(d.delivered_at).toDateString() === today
          ).length;

          // Use estimated_cost from database, fallback to 2500
          const totalEarnings = deliveries
            .filter(d => d.status === 'delivered')
            .reduce((sum, d) => sum + (d.final_cost || d.estimated_cost || 2500), 0);

          setStats({
            totalDeliveries: deliveries.length,
            completedToday,
            pendingDeliveries: deliveries.filter(d => d.status === 'pending' || d.status === 'in_transit').length,
            totalEarnings,
            averageRating: 4.8, // Would come from reviews table
            totalDistance: 0 // No distance column in schema
          });

          // Set active deliveries - use ACTUAL database column names
          setActiveDeliveries(deliveries
            .filter(d => d.status !== 'delivered' && d.status !== 'cancelled')
            .map(d => ({
              id: d.id,
              pickup_location: d.pickup_location || d.pickup_address || 'N/A',
              delivery_location: d.dropoff_location || d.dropoff_address || 'N/A',
              material_type: d.item_description || 'Materials',
              quantity: d.estimated_weight || 'N/A',
              customer_name: d.builder_email?.split('@')[0] || 'Customer',
              customer_phone: '+254 700 000 000',
              status: d.status,
              estimated_time: '30 mins',
              price: d.estimated_cost || 2500,
              distance: 0,
              urgency: d.urgency || 'normal',
              special_instructions: d.special_instructions
            })));

          // Set delivery history - use ACTUAL database column names
          setDeliveryHistory(deliveries
            .filter(d => d.status === 'delivered')
            .map(d => ({
              id: d.id,
              pickup_location: d.pickup_location || d.pickup_address || 'N/A',
              delivery_location: d.dropoff_location || d.dropoff_address || 'N/A',
              material_type: d.item_description || 'Materials',
              status: d.status,
              completed_at: d.delivered_at || d.updated_at || d.created_at,
              price: d.final_cost || d.estimated_cost || 2500,
              rating: 5
            })));
        } else {
          // Fallback to placeholder data
          setStats({
            totalDeliveries: 156,
            completedToday: 8,
            pendingDeliveries: 3,
            totalEarnings: 245000,
            averageRating: 4.8,
            totalDistance: 2450
          });

          setActiveDeliveries([
            {
              id: 'DEL-001',
              pickup_location: 'Bamburi Cement Factory, Industrial Area',
              delivery_location: 'Kilimani Construction Site, Nairobi',
              material_type: 'Cement',
              quantity: '100 bags',
              customer_name: 'John Kamau',
              customer_phone: '+254 712 345 678',
              status: 'pending',
              estimated_time: '45 mins',
              price: 8500,
              distance: 15,
              urgency: 'urgent',
              special_instructions: 'Deliver to site entrance. Ask for foreman Peter.',
              created_at: new Date().toISOString()
            },
            {
              id: 'DEL-002',
              pickup_location: 'Steel Masters Kenya, Mombasa Road',
              delivery_location: 'Karen Villa Project, Karen',
              material_type: 'Steel Bars',
              quantity: '2 tons',
              customer_name: 'Mary Wanjiku',
              customer_phone: '+254 722 456 789',
              status: 'pending',
              estimated_time: '1 hour 30 mins',
              price: 12000,
              distance: 25,
              urgency: 'normal',
              created_at: new Date(Date.now() - 30 * 60000).toISOString()
            },
            {
              id: 'DEL-003',
              pickup_location: 'Nairobi Timber, Ngong Road',
              delivery_location: 'Westlands Office Block',
              material_type: 'Timber',
              quantity: '200 pieces',
              customer_name: 'Peter Ochieng',
              customer_phone: '+254 733 567 890',
              status: 'accepted',
              estimated_time: '2 hours',
              price: 6500,
              distance: 12,
              urgency: 'normal',
              created_at: new Date(Date.now() - 60 * 60000).toISOString()
            },
            {
              id: 'DEL-004',
              pickup_location: 'Industrial Area Depot',
              delivery_location: 'Lavington Mall Construction',
              material_type: 'Roofing Sheets',
              quantity: '50 sheets',
              customer_name: 'Grace Achieng',
              customer_phone: '+254 700 123 456',
              status: 'pending',
              estimated_time: '30 mins',
              price: 4500,
              distance: 8,
              urgency: 'emergency',
              special_instructions: 'URGENT: Rain expected. Deliver ASAP!',
              created_at: new Date(Date.now() - 5 * 60000).toISOString()
            }
          ]);

          setDeliveryHistory([
            {
              id: 'DEL-098',
              pickup_location: 'Industrial Area',
              delivery_location: 'Lavington',
              material_type: 'Roofing Sheets',
              status: 'completed',
              completed_at: new Date(Date.now() - 86400000).toISOString(),
              price: 5500,
              rating: 5
            },
            {
              id: 'DEL-097',
              pickup_location: 'Mombasa Road',
              delivery_location: 'Kileleshwa',
              material_type: 'Sand',
              status: 'completed',
              completed_at: new Date(Date.now() - 172800000).toISOString(),
              price: 4500,
              rating: 4
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'pending_pickup': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="h-4 w-4" />;
      case 'pending_pickup': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Exit dashboard - goes back to home page, stays logged in
  const handleExitDashboard = () => {
    console.log('🚪 Exit Dashboard: Redirecting to home...');
    window.location.href = '/home';
  };

  if (loading) {
    return <DashboardLoader type="delivery" />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-teal-50 via-white to-cyan-50'}`}>
      {/* Navigation hidden in dashboard - use Exit Dashboard to access main navigation */}

      {/* Hero Section */}
      <section className={`${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-teal-600 to-cyan-600'} text-white py-8`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Truck className="h-8 w-8" />
                Delivery Dashboard
              </h1>
              <p className="text-teal-100 mt-1">
                Welcome back, {providerProfile?.full_name || providerProfile?.company_name || 'Driver'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Dark Mode Toggle */}
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={setIsDarkMode}
                />
                <Moon className="h-4 w-4" />
              </div>
              
              {/* Online/Offline Toggle */}
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/20 h-6 px-2"
                  onClick={() => setIsOnline(!isOnline)}
                >
                  {isOnline ? 'Go Offline' : 'Go Online'}
                </Button>
              </div>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowProfileView(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={handleExitDashboard}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="bg-red-500/20 border-red-300/50 text-white hover:bg-red-500/30"
                onClick={() => {
                  console.log('🚪 Logout: Starting sign out process...');
                  // Clear auth data immediately
                  localStorage.removeItem('user_role');
                  localStorage.removeItem('user_role_id');
                  localStorage.removeItem('user_role_verified');
                  localStorage.removeItem('user_security_key');
                  localStorage.removeItem('user_email');
                  localStorage.removeItem('user_name');
                  localStorage.removeItem('user_id');
                  localStorage.removeItem('supplier_id');
                  localStorage.removeItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
                  sessionStorage.clear();
                  // Redirect immediately - don't wait for Supabase signOut
                  window.location.replace('/auth');
                  // Sign out from Supabase in background (non-blocking)
                  signOut().catch(() => {});
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Deliveries</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalDeliveries}</p>
                </div>
                <div className="p-3 bg-teal-100 rounded-full">
                  <Truck className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Today</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.completedToday}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingDeliveries}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Earnings</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rating</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.averageRating}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Distance</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalDistance} km</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Route className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card-Style Navigation - Reorganized with Deliveries button */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-8">
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'deliveries' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => {
              setActiveTab('deliveries');
              setDeliveriesSubTab('scheduled'); // Default to scheduled when opening Deliveries
            }}
          >
            <Truck className="h-5 w-5" />
            <span className="text-xs font-medium">Deliveries</span>
            {deliveriesBadgeCount > 0 && (
              <Badge className="text-[10px] px-1 py-0 bg-yellow-500 text-white">
                {deliveriesBadgeCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all relative ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('history')}
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-xs font-medium">History</span>
            {deliveryHistory.length > 0 && (
              <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-green-500 text-white">
                {deliveryHistory.length}
              </Badge>
            )}
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'map' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('map')}
          >
            <Map className="h-5 w-5" />
            <span className="text-xs font-medium">Map</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'scanning' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('scanning')}
          >
            <Scan className="h-5 w-5" />
            <span className="text-xs font-medium">Scan QR</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'pay' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('pay')}
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-xs font-medium">Pay</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'analytics' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">Analytics</span>
          </Button>
          <Button 
            variant="ghost"
            title={pendingNotificationCount > 0 ? `${pendingNotificationCount} new delivery request${pendingNotificationCount !== 1 ? 's' : ''} — click to view` : 'Alerts'}
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all relative overflow-visible ${
              activeTab === 'notifications' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            <span className="relative inline-flex">
              <Bell className="h-5 w-5" />
              {pendingNotificationCount > 0 && (
                <Badge className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1.5 py-0 bg-red-500 text-white animate-pulse ring-2 ring-white shadow-md rounded-full">
                  {pendingNotificationCount > 99 ? '99+' : pendingNotificationCount}
                </Badge>
              )}
            </span>
            <span className="text-xs font-medium">Alerts</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'support' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('support')}
          >
            <Headphones className="h-5 w-5" />
            <span className="text-xs font-medium">Support</span>
          </Button>
        </div>

        {/* Main Content Tabs - Hidden TabsList, controlled by card buttons above */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden">
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="history">Delivery History</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="scanning">Scanning</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab - Single source: get_deliveries_for_provider_unified (aligned with Supplier Orders/QR) */}
          <TabsContent value="deliveries">
            <div className="space-y-4">
              <div className={`flex flex-wrap items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg ${isDarkMode ? 'bg-teal-900/20 border border-teal-800' : 'bg-teal-50 border border-teal-200'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>Delivery flow:</span>
                  <span>Accept</span>
                  <ChevronRight className="h-3 w-3 text-teal-500" />
                  <span className="font-medium">Scheduled</span>
                  <span className={`text-[10px] ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>(stays until delivery scan)</span>
                  <ChevronRight className="h-3 w-3 text-teal-500" />
                  <span>Supplier dispatches</span>
                  <ChevronRight className="h-3 w-3 text-teal-500" />
                  <span className="font-medium">In Transit</span>
                  <ChevronRight className="h-3 w-3 text-teal-500" />
                  <span>You scan all items</span>
                  <ChevronRight className="h-3 w-3 text-teal-500" />
                  <span className="font-medium">Delivered</span>
                  <span className={`text-[10px] ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>(moves to History)</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  disabled={linkingDeliveries}
                  title="Link orders to your provider account if any are missing"
                  onClick={async () => {
                    setLinkingDeliveries(true);
                    try {
                      const { data, error } = await (supabase as any).rpc('link_my_deliveries_to_provider_id');
                      const errMsg = error?.message || (error && String(error));
                      if (error) {
                        toast({ title: 'Link failed', description: errMsg || 'RPC error.', variant: 'destructive' });
                        return;
                      }
                      const res = (data != null ? data : {}) as { success?: boolean; message?: string; updated_dr?: number; updated_po?: number };
                      if (res?.success && ((res?.updated_dr ?? 0) > 0 || (res?.updated_po ?? 0) > 0)) {
                        toast({ title: 'Links updated', description: res.message || 'Your deliveries are now linked.' });
                        refetchData();
                        refetchUnified();
                      } else if (res?.success) {
                        toast({ title: 'Already linked', description: res?.message || 'All your deliveries are already linked.' });
                      } else {
                        toast({ title: 'Could not link', description: res?.message || 'No provider account found.' });
                      }
                    } catch (e: any) {
                      toast({ title: 'Error', description: e?.message || 'Failed to link deliveries', variant: 'destructive' });
                    } finally {
                      setLinkingDeliveries(false);
                    }
                  }}
                >
                  {linkingDeliveries ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
                  {linkingDeliveries ? 'Linking…' : 'Link my deliveries'}
                </Button>
              </div>
              <p className={`text-xs px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Accepted deliveries appear here and stay until you complete the delivery scan. When you scan all items as delivered, the order moves to the History tab. Select an order from the list to view details.
              </p>

              {unifiedError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{unifiedError} <Button variant="outline" size="sm" className="ml-2" onClick={() => refetchUnified()}>Retry</Button></AlertDescription>
                </Alert>
              )}

              {/* Scheduled Orders - unified RPC or legacy fallback. Include both scheduled AND in-transit so orders stay until delivery scan. */}
              <div className="space-y-4 mt-4">
                {(() => {
                  const scheduled = useLegacyFallback
                    ? deliveryCategories.scheduled
                    : [...unifiedScheduled, ...(unifiedInTransit || [])].map(toCardDelivery);
                  const showSpinner = !useLegacyFallback && unifiedLoading && scheduled.length === 0;
                  
                  if (showSpinner) {
                    return (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
                      </div>
                    );
                  }
                  
                  // Update selected order if current selection is invalid or empty
                  const currentSelected = scheduled.find(d => d.id === selectedScheduledOrderId);
                  const defaultSelected = scheduled[0];
                  const selectedDelivery = currentSelected || defaultSelected;
                  
                  if (scheduled.length > 0) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              📅 Scheduled Orders ({scheduled.length})
                            </h3>
                            {scheduled.length > 0 && (
                              <Badge className="ml-1 bg-blue-500 text-white text-xs">
                                {scheduled.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* List of scheduled orders - click to select and view details */}
                        <div className="space-y-2 mb-4">
                          <Label className={`mb-2 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Scheduled orders
                          </Label>
                          <ul className="space-y-2" role="list">
                            {scheduled.map((delivery) => {
                              const isSelected = (selectedScheduledOrderId || defaultSelected?.id) === delivery.id;
                              return (
                                <li key={delivery.id}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedScheduledOrderId(delivery.id)}
                                    className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                                      isSelected
                                        ? isDarkMode
                                          ? 'border-teal-500 bg-teal-500/10'
                                          : 'border-teal-500 bg-teal-50'
                                        : isDarkMode
                                          ? 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
                                          : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium truncate">
                                            {delivery.order_number || 'Order'}
                                          </span>
                                          {delivery.material_type && (
                                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                              {delivery.material_type}
                                            </span>
                                          )}
                                        </div>
                                        {delivery.delivery_location && (
                                          <p className={`text-sm mt-1 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            📍 {delivery.delivery_location}
                                          </p>
                                        )}
                                      </div>
                                      <ChevronRight className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-teal-600' : 'text-gray-400'}`} />
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        
                        {/* Display selected order details */}
                        {selectedDelivery && (
                          <DeliveryRequestCard
                            key={selectedDelivery.id}
                            delivery={selectedDelivery}
                            isDarkMode={isDarkMode}
                            onAccept={async (deliveryId) => {
                              try {
                                // IMMEDIATE OPTIMISTIC UPDATE: Add to schedule immediately
                                console.log('✅ Accepting delivery - immediate optimistic update...');
                                
                                await handleAcceptDelivery(deliveryId);
                                
                                // IMMEDIATE REFRESH: Refresh right away (no delay)
                                console.log('🔄 Immediate refresh after accepting delivery...');
                                await refetchData();
                                await refetchUnified();
                                loadNotificationCounts();
                                
                                // Also refresh after a short delay to ensure DB commit
                                setTimeout(async () => {
                                  console.log('🔄 Second refresh to ensure schedule is updated...');
                                  await refetchData();
                                  await refetchUnified();
                                  loadNotificationCounts();
                                }, 200);
                                
                                // Final refresh after DB commit completes
                                setTimeout(async () => {
                                  console.log('🔄 Final refresh to ensure latest data...');
                                  await refetchData();
                                  await refetchUnified();
                                  loadNotificationCounts();
                                }, 500);
                                
                                toast({
                                  title: "✅ Delivery Accepted!",
                                  description: "The delivery has been added to your schedule.",
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to accept delivery. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            onReject={async (deliveryId, reason) => {
                              try {
                                await handleRejectDelivery(deliveryId, reason);
                                await refetchData();
                                await refetchUnified();
                                loadNotificationCounts();
                                toast({
                                  title: "Delivery Rejected",
                                  description: "The delivery request has been rejected.",
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to reject delivery. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            onNavigate={(delivery) => {
                              // Open Google Maps with the delivery location
                              const deliveryAddress = delivery.delivery_location || delivery.delivery_address || '';
                              if (deliveryAddress) {
                                const encodedAddress = encodeURIComponent(deliveryAddress);
                                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                                window.open(mapsUrl, '_blank');
                                toast({
                                  title: "🗺️ Opening Maps",
                                  description: `Navigating to ${deliveryAddress}`,
                                });
                              } else {
                                toast({
                                  title: "Location Not Available",
                                  description: "Delivery location is not specified for this order.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            onCall={(phone) => window.open(`tel:${phone}`)}
                            onCaptureProof={(id) => setShowProofCapture(id)}
                          />
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                      <CardContent className="py-12 text-center">
                        <Calendar className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No scheduled deliveries</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Accepted deliveries will appear here and stay until you scan all items as delivered; then they move to the History tab.</p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>

            </div>
          </TabsContent>

          {/* Delivery History Tab */}
          <TabsContent value="history">
            <div className="space-y-4">
              <div className={`flex items-center justify-between mb-4 ${isDarkMode ? 'bg-teal-900/20 border border-teal-800' : 'bg-teal-50 border border-teal-200'} px-4 py-3 rounded-lg`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Delivery History
                  </h2>
                  {deliveryHistory.length > 0 && (
                    <Badge className="ml-2 bg-green-500 text-white">
                      {deliveryHistory.length} {deliveryHistory.length === 1 ? 'delivery' : 'deliveries'}
                    </Badge>
                  )}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Completed deliveries appear here after scanning all items as delivered
                </p>
              </div>

              {deliveryHistory.length > 0 ? (
                <div className="space-y-4">
                  {deliveryHistory
                    .sort((a, b) => {
                      // Sort by completed_at date (most recent first)
                      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
                      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
                      return dateB - dateA;
                    })
                    .map((delivery) => (
                      <Card key={delivery.id} className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-500 text-white">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Delivered
                                </Badge>
                                {delivery.order_number && (
                                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {delivery.order_number}
                                  </span>
                                )}
                              </div>
                              {delivery.material_type && (
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                                  <Package className="h-4 w-4 inline mr-1" />
                                  {delivery.material_type}
                                </p>
                              )}
                            </div>
                            {delivery.completed_at && (
                              <div className="text-right">
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Completed
                                </p>
                                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {new Date(delivery.completed_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {delivery.pickup_location && (
                              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-4 w-4 text-blue-500" />
                                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Pickup Location
                                  </span>
                                </div>
                                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {delivery.pickup_location}
                                </p>
                              </div>
                            )}
                            {delivery.delivery_location && (
                              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-4 w-4 text-green-500" />
                                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Delivery address (from builder — use this for delivery)
                                  </span>
                                </div>
                                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {delivery.delivery_location}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No delivery history yet</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Completed deliveries will appear here after you scan all items as delivered
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <DeliveryMap 
              locations={mapLocations}
              driverLocation={{ lat: -1.2864, lng: 36.8172 }}
              onNavigate={(location) => console.log('Navigate to:', location)}
              onRefresh={() => console.log('Refresh map')}
            />
          </TabsContent>

          {/* Analytics Tab - Includes Earnings and Achievements */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Earnings Charts */}
              <DeliveryCharts 
                deliveryTrends={deliveryTrends}
                statusDistribution={statusDistribution}
                earningsData={earningsData}
              />
              
              {/* Achievements Section */}
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Achievements & Rewards
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                    Track your progress and unlock rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DriverGamification 
                    driverId={user?.id || ''}
                    driverName={providerProfile?.full_name || user?.email?.split('@')[0] || 'Driver'}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <DeliveryNotifications 
              userId={user?.id || localStorage.getItem('user_id') || ''}
              onNotificationClick={(notification) => console.log('Notification clicked:', notification)}
              onAcceptDelivery={(requestId) => {
                console.log('🔔 Delivery accepted, refreshing counts...');
                // Refresh notification counts immediately
                loadNotificationCounts();
                // Also refresh main data
                refetchData();
              }}
            />
          </TabsContent>

          {/* Scanning Tab */}
          <TabsContent value="scanning">
            <div className="space-y-6">
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                    <QrCode className="h-5 w-5 text-green-500" />
                    Delivery Receiving Scanner
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                    Scan QR codes to confirm delivery completion when you arrive at the destination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Receiving Scanner - For delivery providers */}
                  <div className={`p-4 rounded-lg border-2 ${isDarkMode ? 'border-green-800 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Scan className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : ''}`}>Receiving Scanner</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Scan to confirm material pickup and delivery
                        </p>
                      </div>
                    </div>
                    <ReceivingScanner
                      deliveryRequestsFromDashboard={deliveriesForReceivingScanner}
                      onRefreshRequested={() => {
                        void refetchData();
                        void refetchUnified();
                      }}
                      onDeliveryComplete={async (orderCompleted) => {
                        // Provider Delivered = Supplier Delivered (material_items.receive_scanned)
                        console.log('🔄 Delivery scan complete - orderCompleted:', orderCompleted);
                        // Wait for DB trigger to commit before refetch so order moves to Delivered
                        await new Promise(resolve => setTimeout(resolve, 1800));
                        
                        // Switch to Delivery History tab when full order complete
                        if (orderCompleted) {
                          console.log('🔄 Full order delivered - moving to Delivery History tab');
                          setActiveTab('history');
                        }
                        
                        // Aggressive refresh with multiple retries to ensure updated data
                        console.log('🔄 Starting aggressive data refresh...');
                        let retries = 8; // Increased retries
                        let dataRefreshed = false;
                        
                        while (retries > 0 && !dataRefreshed) {
                          try {
                            console.log(`🔄 Refreshing data (attempt ${9 - retries}/8)...`);
                            
                            // Force complete refresh (material_items drives Provider↔Supplier sync)
                            await refetchData();
                            
                            // Brief wait for categorization to complete
                            await new Promise(resolve => setTimeout(resolve, 800));
                            
                            // Verify data was refreshed by checking if we're still on the delivered tab
                            // (This ensures the component has re-rendered with new data)
                            dataRefreshed = true;
                            console.log('✅ Data refreshed successfully');
                          } catch (error) {
                            console.error('❌ Error refreshing data:', error);
                            retries--;
                            if (retries > 0) {
                              // Exponential backoff
                              const delay = Math.min(2000 * (9 - retries), 5000);
                              console.log(`⏳ Waiting ${delay}ms before retry...`);
                              await new Promise(resolve => setTimeout(resolve, delay));
                            }
                          }
                        }
                        
                        // Final refresh after all retries to ensure latest data
                        console.log('🔄 Final refresh to ensure latest data...');
                        try {
                          await refetchData();
                          await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (finalError) {
                          console.warn('⚠️ Final refresh failed (non-critical):', finalError);
                        }
                        
                        // Show success toast based on whether full order was completed
                        toast({
                          title: orderCompleted ? '✅ Delivery Complete!' : '✅ Item Scanned',
                          description: orderCompleted 
                            ? 'All items received. Order moved to "Delivery History" tab.' 
                            : 'Item scan recorded. Scan remaining QR codes to complete delivery.',
                          duration: 5000,
                        });
                        
                        console.log('✅ onDeliveryComplete callback completed - order should now appear in Delivery History tab');
                      }}
                    />
                  </div>

                  {/* Scanning Instructions */}
                  <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : ''}`}>📋 How to Complete Delivery</h4>
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-teal-900/30' : 'bg-teal-50'} border border-teal-200`}>
                      <p className={`font-medium text-teal-600 mb-3 flex items-center gap-2`}>
                        <Truck className="h-4 w-4" />
                        Delivery Completion Process:
                      </p>
                      <ol className={`list-decimal list-inside space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <li>Navigate to the delivery location using the "Navigate" button in your "In Transit" deliveries</li>
                        <li>Arrive at the destination and hand over materials to the customer</li>
                        <li>Scan each QR code on the materials to confirm receipt</li>
                        <li>Once all items are scanned, the delivery status will automatically update to "Delivered"</li>
                        <li>The builder and supplier dashboards will be updated in real-time</li>
                      </ol>
                      <Alert className="mt-4 bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 text-sm">
                          <strong>Note:</strong> This scanner is only for confirming delivery completion. Pickup confirmation happens automatically when the supplier dispatches materials.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pay Tab - Mileage & Pay */}
          <TabsContent value="pay">
            <DeliveryPayTab isDarkMode={isDarkMode} />
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <div className="space-y-6">
              {/* In-App Communication */}
              {user && (
                <InAppCommunication
                  userId={user.id}
                  userName={providerProfile?.company_name || providerProfile?.full_name || user.email || 'Driver'}
                  userRole="delivery_provider"
                  isDarkMode={isDarkMode}
                />
              )}

              {/* Quick Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={isDarkMode ? 'bg-teal-900/20 border-teal-800' : 'bg-teal-50 border-teal-200'}>
                  <CardContent className="p-4">
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                      <Clock className="h-4 w-4 text-teal-500" />
                      Support Hours
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Mon - Fri: 8AM - 6PM<br />
                      Saturday: 9AM - 4PM<br />
                      Sunday: Closed
                    </p>
                  </CardContent>
                </Card>
                <Card className={isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}>
                  <CardContent className="p-4">
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                      <Phone className="h-4 w-4 text-purple-500" />
                      Driver Hotline
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Call: +254 700 000 000<br />
                      Email: drivers@UjenziXform.co.ke
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Photo Proof Modal */}
        {showProofCapture && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
            <div className="max-w-md w-full max-h-[90vh] overflow-y-auto">
              <DeliveryPhotoProof
                deliveryId={showProofCapture}
                deliveryType="delivery"
                customerName={activeDeliveries.find(d => d.id === showProofCapture)?.customer_name || 'Customer'}
                onComplete={(proof) => {
                  console.log('Proof captured:', proof);
                  setShowProofCapture(null);
                }}
              />
              <Button 
                variant="outline" 
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowProofCapture(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tips Section */}
        <Alert className={`mt-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-teal-50 border-teal-200'}`}>
          <Zap className={`h-4 w-4 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
          <AlertDescription className={isDarkMode ? 'text-gray-300' : ''}>
            <strong>Pro Tip:</strong> Complete more deliveries during peak hours (6AM-9AM and 4PM-7PM) to maximize your earnings. 
            Maintain a high rating by being punctual and communicating with customers.
          </AlertDescription>
        </Alert>
      </main>

      <Footer />

      {/* Profile View Dialog */}
      <ProfileViewDialog
        isOpen={showProfileView}
        onClose={() => setShowProfileView(false)}
        onEditProfile={() => {
          setShowProfileView(false);
          setShowProfileEdit(true);
        }}
        onExitDashboard={handleExitDashboard}
        userRole="delivery_provider"
      />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          // Refresh data after profile save
          refetchData();
        }}
        userRole="delivery_provider"
      />
    </div>
  );
};

export default DeliveryDashboard;
