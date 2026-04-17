import {
  clearSupabasePersistedSessionSync,
  readAccessTokenSyncBestEffort,
  readPersistedAuthRawStringSync,
} from '@/utils/supabaseAccessToken';
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useUrlTabSync } from "@/hooks/useUrlTabSync";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import { 
  HardHat, 
  Package, 
  Truck, 
  CreditCard, 
  Home,
  LogOut,
  User,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  Building2,
  Users,
  Briefcase,
  Headphones,
  MessageSquare,
  Video,
  Camera,
  Send,
  MapPin,
  Calendar,
  Upload,
  Play,
  XCircle,
  Eye,
  Map as MapIcon,
  FileSignature,
  Receipt,
  Volume2
} from "lucide-react";
import { BuilderProfileEdit } from "@/components/builders/BuilderProfileEdit";
import { BuilderOrdersTracker } from "@/components/builders/BuilderOrdersTracker";
import { ReviewPrompt } from "@/components/reviews/ReviewSystem";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SupplierQuoteReview } from "@/components/builders/SupplierQuoteReview";
import { PendingQuoteRequests } from "@/components/builders/PendingQuoteRequests";
import { Navigation as NavigationIcon, Navigation, Settings, QrCode } from "lucide-react";
import { DashboardMobileActionSheet } from "@/components/dashboard/DashboardMobileActionSheet";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { ProfileViewDialog } from "@/components/profile/ProfileViewDialog";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { MapLocationPicker } from "@/components/location/MapLocationPicker";
import {
  getCartProjectId,
  setCartProjectContext,
  clearCartProjectContext,
} from "@/utils/builderCartProject";
import {
  fetchPurchaseBuyerIdsForBuilder,
  resolvePurchaseOrderToProjectId,
  resolveDeliveryToProjectId,
  resolveMonitoringToProjectId,
} from "@/utils/builderProjectPurchaseOrders";
import { formatKesCompact } from "@/utils/kesFormat";
import { MissingDeliveryAddressAlert } from "@/components/builders/MissingDeliveryAddressAlert";
import {
  fetchMyMonitoringServiceRequests,
  monitoringRestOpts,
} from "@/utils/myMonitoringServiceRequests";
import { ProfessionalBuilderDashboardNavCards } from "@/components/builders/ProfessionalBuilderDashboardNavCards";
import { InvoiceManagement } from "@/components/invoices/InvoiceManagement";
import { DeliveryNoteWorkflow } from "@/components/delivery/DeliveryNoteWorkflow";
import { GRNView } from "@/components/delivery/GRNView";
import { SUPPORT_PHONE_PRIMARY, SUPPORT_EMAIL } from "@/config/appIdentity";

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};
const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn(...args);
};

const BuilderDashboardTabFallback = () => (
  <div
    className="flex justify-center py-10 text-sm text-muted-foreground"
    role="status"
    aria-busy="true"
  >
    Loading…
  </div>
);

function BuilderDashboardTabSuspense({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<BuilderDashboardTabFallback />}>{children}</React.Suspense>
  );
}

const LazyDeliveryRequest = React.lazy(() => import("@/components/DeliveryRequest"));
const LazyTrackingTab = React.lazy(() =>
  import("@/components/tracking/TrackingTab").then((m) => ({ default: m.TrackingTab }))
);
const LazyInAppCommunication = React.lazy(() =>
  import("@/components/communication/InAppCommunication").then((m) => ({
    default: m.InAppCommunication,
  }))
);
const LazyBuilderVideoPortfolio = React.lazy(() =>
  import("@/components/builders/BuilderVideoPortfolio").then((m) => ({
    default: m.BuilderVideoPortfolio,
  }))
);
const LazyUserAnalyticsDashboard = React.lazy(() =>
  import("@/components/analytics/UserAnalyticsDashboard").then((m) => ({
    default: m.UserAnalyticsDashboard,
  }))
);
const LazyOrderHistory = React.lazy(() =>
  import("@/components/orders/OrderHistory").then((m) => ({ default: m.OrderHistory }))
);

type PurchaseOrderProjectRow = {
  project_id?: string | null;
  project_name?: string | null;
  delivery_address?: string | null;
  total_amount?: number | null;
  status?: string | null;
};

/** Dedupe REST rows (e.g. duplicate ids). */
function dedupeProjectsById(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter((p) => {
    const id = p?.id;
    if (!id || typeof id !== 'string' || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const BUILDER_DOC_SOUND_KEY = 'ujx_builder_doc_sound_enabled';

/** Short beep when document sub-tab counts increase (mobile may require toggling sound on first). */
function playBuilderDocAlertBeep(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(BUILDER_DOC_SOUND_KEY) === '0') return;
    const AC =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    void ctx.resume();
    const beep = (freq: number, t0: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.02);
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.start(t0);
      osc.stop(t0 + dur + 0.01);
    };
    beep(880, ctx.currentTime, 0.12);
    beep(1174, ctx.currentTime + 0.14, 0.12);
  } catch {
    /* autoplay blocked or unsupported */
  }
}

/**
 * Count POs and sum order value per builder_projects.id.
 * Uses project_id, project_name, delivery_address (Cart: "Name - Location"), then fuzzy name rules.
 */
function aggregatePurchaseStatsByProject(
  orders: PurchaseOrderProjectRow[],
  projects: { id: string; name?: string | null; location?: string | null }[]
): Map<string, { orderCount: number; orderValueSum: number }> {
  const projectList = projects.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location ?? null,
  }));
  const map = new Map<string, { orderCount: number; orderValueSum: number }>();
  const skipOrder = new Set(["cancelled", "rejected", "draft"]);

  for (const o of orders) {
    const st = String(o.status ?? "").toLowerCase();
    if (skipOrder.has(st)) continue;

    const pid = resolvePurchaseOrderToProjectId(o, projectList);
    if (!pid) continue;

    const cur = map.get(pid) ?? { orderCount: 0, orderValueSum: 0 };
    cur.orderCount += 1;
    cur.orderValueSum += Number(o.total_amount ?? 0);
    map.set(pid, cur);
  }
  return map;
}

/** Server-side per-project PO stats (works when direct purchase_orders SELECT is blocked). */
async function fetchBuilderProjectPurchaseStatsRpc(): Promise<
  Map<string, { orderCount: number; orderValueSum: number }>
> {
  const map = new Map<string, { orderCount: number; orderValueSum: number }>();
  try {
    const { data, error } = await supabase.rpc("builder_project_purchase_stats");
    if (error) {
      devWarn("📁 builder_project_purchase_stats RPC:", error.message);
      return map;
    }
    for (const row of data ?? []) {
      const r = row as {
        project_id?: string | null;
        order_count?: number | string | null;
        order_value_sum?: number | string | null;
      };
      const pid = r.project_id;
      if (!pid) continue;
      map.set(pid, {
        orderCount: Number(r.order_count) || 0,
        orderValueSum: Number(r.order_value_sum) || 0,
      });
    }
  } catch (e) {
    devWarn("📁 RPC stats error:", e);
  }
  return map;
}

function mergePurchaseStatsMaps(
  a: Map<string, { orderCount: number; orderValueSum: number }>,
  b: Map<string, { orderCount: number; orderValueSum: number }>
): Map<string, { orderCount: number; orderValueSum: number }> {
  const out = new Map(a);
  for (const [pid, v] of b) {
    const cur = out.get(pid) ?? { orderCount: 0, orderValueSum: 0 };
    out.set(pid, {
      orderCount: Math.max(cur.orderCount, v.orderCount),
      orderValueSum: Math.max(cur.orderValueSum, v.orderValueSum),
    });
  }
  return out;
}

function mergeProjectsWithPurchaseAggregates(
  projects: any[],
  stats: Map<string, { orderCount: number; orderValueSum: number }>,
  /** When a later PO fetch returns no rows (e.g. RLS without JWT), keep prior merged card stats. */
  previous?: any[] | null
): any[] {
  const prevById = new Map<string, any>(
    (previous ?? []).map((x: any) => [x.id, x])
  );
  return projects.map((p) => {
    const s = stats.get(p.id);
    const prev = prevById.get(p.id);
    const orderCount =
      s != null
        ? s.orderCount
        : Math.max(Number(p.total_orders) || 0, Number(prev?.total_orders) || 0);
    const spentStored = Number(p.spent || 0);
    const valueFromPo = s != null ? s.orderValueSum : 0;
    const prevSpent = Number(prev?.spent || 0);
    const spent =
      s != null
        ? Math.max(valueFromPo, spentStored)
        : Math.max(spentStored, prevSpent);
    return {
      ...p,
      total_orders: orderCount,
      spent,
    };
  });
}

/** Runs after projects list is shown — never block loading spinner on this. */
/** Card date: prefer start → end → expected end → created (many rows only have created_at / expected_end_date). */
function formatProjectCardDate(p: {
  start_date?: string | null;
  end_date?: string | null;
  expected_end_date?: string | null;
  created_at?: string | null;
}): string {
  const candidates = [p.start_date, p.end_date, p.expected_end_date, p.created_at];
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return 'No date';
}

/** Prefer stored progress; if zero and budget exists, reflect spend vs budget on the card. */
function projectCardProgressPercent(project: {
  progress?: number | null;
  budget?: number | null;
  spent?: number | null;
}): number {
  const stored = Math.min(100, Math.max(0, Math.round(Number(project.progress) || 0)));
  if (stored > 0) return stored;
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  if (budget > 0) return Math.min(100, Math.round((spent / budget) * 100));
  return 0;
}

/** Normalize DB status strings for comparisons (case, spaces). */
function normMonitoringStatus(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isMonitoringApprovedStatus(s: string | null | undefined): boolean {
  const n = normMonitoringStatus(s);
  return (
    n === "approved" ||
    n === "completed" ||
    n === "active" ||
    n === "in_progress"
  );
}

function isMonitoringPendingOrQuotedStatus(s: string | null | undefined): boolean {
  const n = normMonitoringStatus(s);
  return n === "pending" || n === "quoted" || n === "reviewing";
}

/**
 * Merge PO stats onto project cards. Uses the same Bearer token as builder_projects REST
 * (localStorage session often works before the Supabase client's in-memory session is ready).
 */
async function mergeProjectRowsWithPurchaseOrders(
  projectRows: any[],
  userId: string,
  accessTokenFromProjectsFetch: string | null,
  previousMergedCards?: any[] | null,
  extraBuyerSeeds?: string[] | null
): Promise<any[]> {
  let token = accessTokenFromProjectsFetch;
  if (!token) {
    try {
      token = await Promise.race([
        supabase.auth.getSession().then((r) => r.data?.session?.access_token ?? null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
    } catch {
      token = null;
    }
  }

  const statsFromRpc = await fetchBuilderProjectPurchaseStatsRpc();

  const buyerIds = await fetchPurchaseBuyerIdsForBuilder(
    userId,
    token,
    extraBuyerSeeds
  );

  const inList = buyerIds.join(",");
  const selectWithDelivery =
    "project_id,project_name,total_amount,status,delivery_address";
  const selectNoDelivery = "project_id,project_name,total_amount,status";
  const selectFallback = "project_name,total_amount,status";

  try {
    let list: PurchaseOrderProjectRow[] = [];

    if (buyerIds.length > 0) {
      const { data: clientRows, error: clientErr } = await supabase
        .from("purchase_orders")
        .select(selectWithDelivery)
        .in("buyer_id", buyerIds);
      if (!clientErr && Array.isArray(clientRows) && clientRows.length > 0) {
        list = clientRows as PurchaseOrderProjectRow[];
        devLog(
          "📁 PO merge: Supabase client",
          list.length,
          "rows (buyer_id in",
          buyerIds.length,
          "ids)"
        );
      } else if (clientErr) {
        devWarn("📁 PO merge: Supabase client error:", clientErr.message);
      }

      if (list.length === 0) {
        let ordersRes = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=in.(${inList})&select=${selectWithDelivery}`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
              Accept: "application/json",
            },
          }
        );
        if (!ordersRes.ok && ordersRes.status === 400) {
          ordersRes = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=in.(${inList})&select=${selectNoDelivery}`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
                Accept: "application/json",
              },
            }
          );
        }
        if (!ordersRes.ok && ordersRes.status === 400) {
          ordersRes = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=in.(${inList})&select=${selectFallback}`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
                Accept: "application/json",
              },
            }
          );
        }
        if (ordersRes.ok) {
          const orderRows = (await ordersRes.json()) as PurchaseOrderProjectRow[];
          list = Array.isArray(orderRows) ? orderRows : [];
          devLog(
            "📁 PO merge: REST loaded",
            list.length,
            "rows for buyer_id in",
            buyerIds.length,
            "ids"
          );
        } else {
          devWarn("📁 purchase_orders merge HTTP:", ordersRes.status);
        }
      }
    }

    const projectMeta = projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
    }));
    const statsFromRows = aggregatePurchaseStatsByProject(list, projectMeta);
    const stats = mergePurchaseStatsMaps(statsFromRows, statsFromRpc);
    const merged = mergeProjectsWithPurchaseAggregates(
      projectRows,
      stats,
      previousMergedCards
    );
    devLog(
      "📁 PO merge: sample card",
      merged[0]?.name,
      "orders",
      merged[0]?.total_orders,
      "spent",
      merged[0]?.spent
    );
    return merged;
  } catch (e) {
    devWarn("📁 purchase_orders merge error:", e);
    return projectRows;
  }
}

const ProfessionalBuilderDashboardPage = () => {
  // Use AuthContext for reliable user data
  const { user: authUser, isAuthenticated, signOut } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingOrders: 0,
    completedProjects: 0,
    totalSpent: 0,
  });
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false);
  const [showMonitoringMap, setShowMonitoringMap] = useState(false);
  const [monitoringRequest, setMonitoringRequest] = useState({
    projectName: '',
    projectLocation: '',
    projectDescription: '',
    preferredStartDate: '',
    numberOfCameras: '1',
    additionalNotes: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [monitoringRequests, setMonitoringRequests] = useState<any[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Active tab state - syncs with URL so refresh keeps current tab
  const BUILDER_TABS = ['projects', 'quotes', 'orders', 'deliveries', 'tracking', 'invoices', 'extras', 'monitoring', 'portfolio', 'team', 'support', 'order-history', 'my-analytics'];
  const [activeTab, setActiveTab] = useUrlTabSync(BUILDER_TABS, 'projects');
  const [extrasSubTab, setExtrasSubTab] = useState('team'); // Sub-tab for Extras (team or support)
  const [deliveriesSubTab, setDeliveriesSubTab] = useState('request'); // Sub-tab for Deliveries (request, schedule, history)
  /** Sub-tabs on Invoices: delivery notes → GRN → supplier invoices (horizontal row). */
  const [invoiceDocsSubTab, setInvoiceDocsSubTab] = useState('delivery-notes');
  const [supplierResponseCount, setSupplierResponseCount] = useState(0); // Count of supplier responses for notification badge
  const [invoiceHubBadgeCount, setInvoiceHubBadgeCount] = useState(0); // DN + invoices needing builder action (Invoices tab)
  const [invoiceSubBadgeDn, setInvoiceSubBadgeDn] = useState(0);
  const [invoiceSubBadgeGrn, setInvoiceSubBadgeGrn] = useState(0);
  const [invoiceSubBadgeInv, setInvoiceSubBadgeInv] = useState(0);
  const [docAlertSoundOn, setDocAlertSoundOn] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(BUILDER_DOC_SOUND_KEY) !== '0'
  );
  const prevInvoiceSubBadgesRef = useRef({ dn: 0, grn: 0, inv: 0 });
  const skipInvoiceSubSoundOnceRef = useRef(true);
  const [deliveryAddressNeededNotifications, setDeliveryAddressNeededNotifications] = useState<{ id: string; title: string; message: string; action_url?: string }[]>([]);

  // Projects state - start with loading false to show empty state immediately
  const [projects, setProjects] = useState<any[]>([]);
  const projectAttributionList = useMemo(
    () =>
      projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        location: p.location ?? null,
      })),
    [projects]
  );
  const [loadingProjects, setLoadingProjects] = useState(true); // Will be set to false quickly
  const [creatingProject, setCreatingProject] = useState(false); // Separate state for creation
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedProjectForOrder, setSelectedProjectForOrder] = useState<string | null>(null);
  const [gettingProjectLocation, setGettingProjectLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    description: '',
    start_date: '',
    budget: '',
    project_type: 'residential',
    client_name: '',
    expected_end_date: '',
    latitude: null as number | null,
    longitude: null as number | null,
    address: ''
  });

  // Deliveries state
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [deliveriesLoaded, setDeliveriesLoaded] = useState(false); // Track if initial load is done

  /** Per-project counts for Active Project cards (orders already on project via PO merge). */
  const projectActivityById = useMemo(() => {
    const map = new Map<string, { deliveries: number; monitoring: number }>();
    for (const p of projects) {
      if (p?.id) map.set(String(p.id), { deliveries: 0, monitoring: 0 });
    }
    if (projects.length === 0) return map;

    const plist = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      location: p.location ?? null,
    }));

    for (const d of deliveries) {
      const pid = resolveDeliveryToProjectId(d, plist);
      if (pid && map.has(pid)) {
        const cur = map.get(pid)!;
        cur.deliveries += 1;
      }
    }
    for (const m of monitoringRequests) {
      const pid = resolveMonitoringToProjectId(m, plist);
      if (pid && map.has(pid)) {
        const cur = map.get(pid)!;
        cur.monitoring += 1;
      }
    }
    return map;
  }, [projects, deliveries, monitoringRequests]);

  /** Deliveries tab: address reminders + non-terminal shipment rows. */
  const deliveriesNavBadgeCount = useMemo(() => {
    const needAddress = deliveryAddressNeededNotifications.length;
    const active = deliveries.filter((d: any) => {
      const s = String(d.display_status ?? d.status ?? '').toLowerCase();
      if (['delivered', 'completed', 'cancelled', 'failed'].some((term) => s.includes(term))) {
        return false;
      }
      return true;
    }).length;
    return Math.min(99, needAddress + active);
  }, [deliveries, deliveryAddressNeededNotifications]);

  // SUPABASE_URL and SUPABASE_ANON_KEY are imported from @/integrations/supabase/client

  // Helper to get access token - USE SUPABASE CLIENT which handles token refresh automatically
  const getAccessToken = async (): Promise<string> => {
    try {
      // Use Supabase client to get fresh session - it handles token refresh automatically
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        devLog('🔑 Supabase getSession error:', error.message);
      }
      
      if (session?.access_token) {
        devLog('🔑 Got fresh token from Supabase client (length:', session.access_token.length, ')');
        return session.access_token;
      }
      
      devLog('🔑 No session from Supabase client, user may need to log in again');
      return '';
    } catch (e) {
      devLog('🔑 Error getting session:', e);
      return '';
    }
  };

  // Helper to get user ID reliably (from AuthContext or localStorage)
  // Function to fetch supplier response count (quotes that suppliers have responded to)
  const fetchSupplierResponseCount = async (
    builderId: string,
    profileBuyerId?: string | null
  ) => {
    if (!builderId) {
      setSupplierResponseCount(0);
      return;
    }

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setSupplierResponseCount(0);
        return;
      }

      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      const statusFilter = ['quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quoted'];
      const statusParam = statusFilter.join(',');

      const buyerIds = new Set<string>([builderId]);
      if (profileBuyerId && profileBuyerId !== builderId) {
        buyerIds.add(profileBuyerId);
      }
      const idIn = [...buyerIds].join(',');

      const urlBuyer = `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=in.(${idIn})&status=in.(${statusParam})&supplier_id=not.is.null&select=id&limit=1000`;
      const urlBuilder = `${SUPABASE_URL}/rest/v1/purchase_orders?builder_id=in.(${idIn})&status=in.(${statusParam})&supplier_id=not.is.null&select=id&limit=1000`;

      const [resBuyer, resBuilder] = await Promise.all([
        fetch(urlBuyer, { headers, cache: 'no-store' }),
        fetch(urlBuilder, { headers, cache: 'no-store' }),
      ]);

      const seen = new Set<string>();
      for (const res of [resBuyer, resBuilder]) {
        if (!res.ok) continue;
        const data = await res.json();
        for (const row of Array.isArray(data) ? data : []) {
          const id = (row as { id?: string })?.id;
          if (id) seen.add(id);
        }
      }
      const count = seen.size;
      setSupplierResponseCount(count);
      devLog('📊 Supplier response count:', count);
    } catch (error) {
      console.error('Error fetching supplier response count:', error);
      setSupplierResponseCount(0);
    }
  };

  /** Delivery notes awaiting signature/inspection + invoices draft/sent and not acknowledged (+ GRN sub-count). */
  const fetchInvoiceHubBadgeCount = async (profileId?: string | null, authUserId?: string | null) => {
    const builders = [...new Set([profileId, authUserId].filter(Boolean))] as string[];
    if (builders.length === 0) {
      setInvoiceHubBadgeCount(0);
      setInvoiceSubBadgeDn(0);
      setInvoiceSubBadgeGrn(0);
      setInvoiceSubBadgeInv(0);
      return;
    }
    try {
      const { count: dnCount, error: dnErr } = await supabase
        .from('delivery_notes')
        .select('id', { count: 'exact', head: true })
        .in('builder_id', builders)
        .in('status', ['pending_signature', 'inspection_pending']);
      if (dnErr) devWarn('Invoice hub badge (DN):', dnErr.message);

      const { count: grnCount, error: grnErr } = await supabase
        .from('goods_received_notes')
        .select('id', { count: 'exact', head: true })
        .in('builder_id', builders)
        .eq('status', 'generated');
      if (grnErr) devWarn('Invoice hub badge (GRN):', grnErr.message);

      const { data: invByBuilder, error: ibErr } = await supabase
        .from('invoices')
        .select('id')
        .in('builder_id', builders)
        .in('status', ['sent', 'draft'])
        .is('acknowledged_at', null);
      if (ibErr) devWarn('Invoice hub badge (inv builder_id):', ibErr.message);

      const { data: poRows, error: poErr } = await supabase
        .from('purchase_orders')
        .select('id')
        .in('buyer_id', builders);
      if (poErr) devWarn('Invoice hub badge (PO):', poErr.message);

      const poIds = (poRows || []).map((p) => p.id).filter(Boolean);
      let invByPo: { id: string }[] = [];
      if (poIds.length > 0) {
        const { data, error: ipErr } = await supabase
          .from('invoices')
          .select('id')
          .in('purchase_order_id', poIds)
          .in('status', ['sent', 'draft'])
          .is('acknowledged_at', null);
        if (ipErr) devWarn('Invoice hub badge (inv PO):', ipErr.message);
        invByPo = data || [];
      }

      const invSeen = new Set<string>();
      for (const r of [...(invByBuilder || []), ...invByPo]) {
        if (r?.id) invSeen.add(r.id);
      }

      const dnN = Math.min(99, dnCount || 0);
      const grnN = Math.min(99, grnCount || 0);
      const invN = Math.min(99, invSeen.size);
      setInvoiceSubBadgeDn(dnN);
      setInvoiceSubBadgeGrn(grnN);
      setInvoiceSubBadgeInv(invN);
      setInvoiceHubBadgeCount(Math.min(99, dnN + invN));
    } catch (e) {
      devWarn('fetchInvoiceHubBadgeCount:', e);
      setInvoiceHubBadgeCount(0);
      setInvoiceSubBadgeDn(0);
      setInvoiceSubBadgeGrn(0);
      setInvoiceSubBadgeInv(0);
    }
  };

  const getUserId = (): string => {
    if (authUser?.id) return authUser.id;
    try {
      const storedSession = readPersistedAuthRawStringSync();
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.user?.id || '';
      }
    } catch (e) {
      devWarn('Could not get user ID from localStorage');
    }
    return '';
  };

  /**
   * Load monitoring rows. Prefer SECURITY DEFINER RPC so we still get rows when RLS/policy drift
   * hides them (e.g. user_id stored as profiles.id, or legacy requester_id/email-only linkage).
   */
  const refreshMonitoringRequests = useCallback(async () => {
    // Do NOT await supabase.auth.getSession() here — it uses the client global fetch wrapper and can hang
    // indefinitely on some devices; projects use localStorage token (fast path) for the same reason.
    const userId = authUser?.id || getUserId();
    if (!userId) {
      devWarn("📹 Monitoring: skip refresh (no user id yet)");
      return;
    }

    devLog("📹 Monitoring: fetching for user", userId.slice(0, 8) + "…");
    // Token from localStorage via monitoringRestOpts only (avoids getSession hang).
    const { rows: raw, usedRpc } = await fetchMyMonitoringServiceRequests(
      supabase,
      monitoringRestOpts(SUPABASE_URL, SUPABASE_ANON_KEY, userId)
    );
    const rows = [...raw].sort(
      (a: any, b: any) =>
        new Date(String(b.created_at || 0)).getTime() -
        new Date(String(a.created_at || 0)).getTime()
    );
    setMonitoringRequests(rows);
    devLog(
      "📹 Monitoring requests loaded:",
      rows.length,
      usedRpc ? "(direct)" : "(table)"
    );
  }, [authUser?.id]);

  // Set user from AuthContext when available
  useEffect(() => {
    if (authUser) {
      devLog('📋 ProfessionalBuilderDashboard: Got user from AuthContext:', authUser.email);
      setUser(authUser);
    }
  }, [authUser]);


  // Fetch "Delivery address needed" prompts (when driver clicked Check Address) so builder sees them
  useEffect(() => {
    let userId = authUser?.id || user?.id;
    if (!userId) {
      try {
        const stored = readPersistedAuthRawStringSync();
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed.user?.id || '';
        }
      } catch {}
    }
    if (!userId) return;
    const fetchPrompts = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, message, action_url, type')
          .eq('user_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!error && data?.length) {
          const relevant = data.filter(
            (n: any) =>
              n.type === 'reminder' ||
              n.type === 'delivery_address_missing' ||
              (n.title && String(n.title).toLowerCase().includes('delivery address'))
          );
          setDeliveryAddressNeededNotifications(relevant);
        } else {
          setDeliveryAddressNeededNotifications([]);
        }
      } catch {
        setDeliveryAddressNeededNotifications([]);
      }
    };
    fetchPrompts();
    const interval = setInterval(fetchPrompts, 60000);
    return () => clearInterval(interval);
  }, [authUser?.id, user?.id]);

  useEffect(() => {
    void refreshMonitoringRequests();
    const retryTimeout = setTimeout(() => void refreshMonitoringRequests(), 2000);
    return () => clearTimeout(retryTimeout);
  }, [refreshMonitoringRequests]);

  useEffect(() => {
    if (activeTab !== "monitoring") return;
    void refreshMonitoringRequests();
  }, [activeTab, refreshMonitoringRequests]);

  useEffect(() => {
    const userId = authUser?.id || getUserId();
    if (!userId) return;

    const channel = supabase
      .channel(`builder-monitoring-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring_service_requests",
        },
        () => {
          void refreshMonitoringRequests();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authUser?.id, refreshMonitoringRequests]);

  /** Polling backup: realtime can miss updates; keep Monitor tab aligned with admin. */
  useEffect(() => {
    if (activeTab !== "monitoring") return;
    const t = window.setInterval(() => {
      void refreshMonitoringRequests();
    }, 20000);
    return () => clearInterval(t);
  }, [activeTab, refreshMonitoringRequests]);

  useEffect(() => {
    const refreshIfMonitoringTab = () => {
      if (activeTab !== "monitoring") return;
      if (document.visibilityState !== "visible") return;
      void refreshMonitoringRequests();
    };
    window.addEventListener("focus", refreshIfMonitoringTab);
    document.addEventListener("visibilitychange", refreshIfMonitoringTab);
    return () => {
      window.removeEventListener("focus", refreshIfMonitoringTab);
      document.removeEventListener("visibilitychange", refreshIfMonitoringTab);
    };
  }, [activeTab, refreshMonitoringRequests]);

  useEffect(() => {
    // Safety timeout - show UI after 2 seconds max
    const timeout = setTimeout(() => setLoading(false), 2000);
    checkAuth().finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
    return () => clearTimeout(timeout);
  }, [authUser]);

  const checkAuth = async () => {
    try {
      // Use authUser from context or localStorage fallback
      const userId = getUserId();
      
      if (!userId) {
        devLog('📋 ProfessionalBuilderDashboard: No user ID available yet');
        // Don't redirect - RoleProtectedRoute handles this
        return;
      }

      devLog('📋 ProfessionalBuilderDashboard: Loading profile for user:', userId);
      
      // Set user object immediately
      const userObj = authUser || { id: userId, email: authUser?.email || 'user' };
      setUser(userObj);

      // IMMEDIATELY start loading deliveries and stats in background (don't wait for profile)
      devLog('📋 Starting background data loads for:', userId);
      loadRealStats(userId).catch(err => console.error('Stats load error:', err));
      loadDeliveries(userId, true).catch(err => console.error('Deliveries load error:', err));

      // Get profile using Supabase client (handles auth automatically)
      let profileData = null;
      devLog('📋 Fetching profile using Supabase client...');
      
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profileError) {
          devWarn('📋 Profile fetch error:', profileError.message);
        } else if (profiles) {
          profileData = profiles;
          devLog('📋 Profile loaded:', profileData.full_name || profileData.email);
        }
      } catch (profileError: any) {
        devWarn('Profile fetch warning:', profileError.message);
      }

      if (!profileData) {
        // Create a basic profile from auth data if profiles table fails
        devLog('📋 Using fallback profile');
        setProfile({
          id: userId,
          user_id: userId,
          email: userObj.email,
          full_name: userObj.user_metadata?.full_name || userObj.email?.split('@')[0] || 'Builder',
          phone: userObj.user_metadata?.phone || '',
          company_name: userObj.user_metadata?.company_name || '',
          county: userObj.user_metadata?.county || '',
        });
      } else {
        setProfile(profileData);
      }

      // Role already verified by RoleProtectedRoute, skip redundant check
      devLog('📋 Profile setup complete, data loading in background');

      void refreshMonitoringRequests();

    } catch (error) {
      console.error('Auth error:', error);
      navigate('/professional-builder-signin');
    } finally {
      setLoading(false);
    }
  };

  // Helper: wrap promise with timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  };

  // Load real stats using Supabase client (handles auth automatically)
  const loadRealStats = async (userId: string) => {
    devLog('📊 loadRealStats called for:', userId);
    
    if (!userId) {
      devLog('📊 No userId provided, skipping stats load');
      return;
    }

    try {
      devLog('📊 Loading real stats for builder:', userId);

      const { data: statsSession } = await supabase.auth.getSession();
      const poBuyerIds = await fetchPurchaseBuyerIdsForBuilder(
        userId,
        statsSession?.session?.access_token ?? null,
        profile?.id ? [profile.id] : null
      );
      
      // Fetch purchase orders (buyer_id may be auth uid or profiles.id)
      const ordersResult = await withTimeout(
        supabase
          .from('purchase_orders')
          .select('*')
          .in('buyer_id', poBuyerIds)
          .order('created_at', { ascending: false }),
        10000,
        { data: null, error: { message: 'Timeout' } }
      );
      
      const orders = ordersResult.data;
      if (ordersResult.error) {
        devLog('📊 Orders fetch error:', ordersResult.error.message);
      } else {
        devLog('📊 Stats: Orders loaded:', orders?.length || 0);
      }

      // Fetch builder projects using Supabase client with timeout (increased to 10s)
      const projectsResult = await withTimeout(
        supabase.from('builder_projects').select('*').eq('builder_id', userId).order('created_at', { ascending: false }),
        10000,
        { data: null, error: { message: 'Timeout' } }
      );
      
      const projectsData = projectsResult.data;
      if (projectsResult.error) {
        devLog('📊 Projects fetch error:', projectsResult.error.message);
      } else {
        devLog('📊 Stats: Projects loaded:', projectsData?.length || 0);
        // Projects list + per-project order counts come from fetchProjects() (REST + purchase_orders merge)
      }

      // Calculate stats
      const ordersList = orders || [];
      const projectsList = projectsData || [];
      
      const pendingOrders = ordersList.filter(o => 
        ['pending', 'quoted', 'processing'].includes(o.status?.toLowerCase())
      ).length;
      
      const completedOrders = ordersList.filter(o => 
        ['completed', 'delivered', 'confirmed'].includes(o.status?.toLowerCase())
      ).length;
      
      const totalSpent = ordersList
        .filter(o => ['completed', 'delivered', 'confirmed'].includes(o.status?.toLowerCase()))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const activeProjects = projectsList.filter(p => 
        ['active', 'in_progress'].includes(p.status?.toLowerCase())
      ).length;

      setStats({
        activeProjects: activeProjects || (projectsData?.length || 0),
        pendingOrders,
        completedProjects: completedOrders,
        totalSpent
      });

      devLog('📊 Stats calculated:', { activeProjects, pendingOrders, completedOrders, totalSpent });

    } catch (error) {
      console.error('Error loading stats:', error);
      // Set defaults
      setStats({
        activeProjects: 0,
        pendingOrders: 0,
        completedProjects: 0,
        totalSpent: 0
      });
    }
  };

  // Load deliveries using Supabase client (handles auth automatically)
  const loadDeliveries = async (userId: string, forceRefresh: boolean = false) => {
    // Skip if already loaded and not forcing refresh (prevents flicker)
    if (deliveriesLoaded && !forceRefresh && deliveries.length > 0) {
      devLog('🚚 Deliveries already loaded, skipping fetch');
      return;
    }
    
    if (!userId) {
      devLog('🚚 No userId provided, skipping delivery load');
      return;
    }
    
    setLoadingDeliveries(true);
    
    // Safety timeout - finish loading after 15 seconds max
    const safetyTimeout = setTimeout(() => {
      devLog('🚚 Safety timeout reached, finishing delivery load');
      setLoadingDeliveries(false);
      setDeliveriesLoaded(true);
    }, 15000);

    try {
      devLog('🚚 Loading deliveries for builder:', userId);
      
      // First, get the profile ID (delivery_requests uses profile.id as builder_id)
      let profileId = userId;
      const profileResult = await withTimeout(
        supabase.from('profiles').select('id').eq('user_id', userId).maybeSingle(),
        8000,
        { data: null, error: null }
      );
      
      if (profileResult.data?.id) {
        profileId = profileResult.data.id;
        devLog('🚚 Found profile ID:', profileId);
      }

      // Fetch delivery requests using Supabase client with timeout (increased to 10s)
      let deliveryRequests: any[] = [];
      
      // Try with profile ID first
      const reqResult1 = await withTimeout(
        supabase.from('delivery_requests').select('*').eq('builder_id', profileId).order('created_at', { ascending: false }),
        10000,
        { data: [], error: null }
      );
      
      if (reqResult1.error) {
        devLog('🚚 Delivery requests (by profile_id) error:', reqResult1.error.message);
      } else if (reqResult1.data) {
        deliveryRequests = [...deliveryRequests, ...reqResult1.data];
        devLog('🚚 Delivery requests (by profile_id):', reqResult1.data.length);
      }

      // Also try with user_id if different
      if (profileId !== userId) {
        const reqResult2 = await withTimeout(
          supabase.from('delivery_requests').select('*').eq('builder_id', userId).order('created_at', { ascending: false }),
          10000,
          { data: [], error: null }
        );
        
        if (reqResult2.data) {
          const existingIds = new Set(deliveryRequests.map(d => d.id));
          const newData = reqResult2.data.filter((d: any) => !existingIds.has(d.id));
          deliveryRequests = [...deliveryRequests, ...newData];
          devLog('🚚 Delivery requests (by user_id):', reqResult2.data.length);
        }
      }

      // Fetch deliveries table using Supabase client with timeout (increased to 10s)
      let deliveriesData: any[] = [];
      
      const delResult1 = await withTimeout(
        supabase.from('deliveries').select('*').eq('builder_id', profileId).order('created_at', { ascending: false }),
        10000,
        { data: [], error: null }
      );
      
      if (delResult1.data) {
        deliveriesData = [...deliveriesData, ...delResult1.data];
        devLog('🚚 Deliveries (by profile_id):', delResult1.data.length);
      }

      if (profileId !== userId) {
        const delResult2 = await withTimeout(
          supabase.from('deliveries').select('*').eq('builder_id', userId).order('created_at', { ascending: false }),
          10000,
          { data: [], error: null }
        );
        
        if (delResult2.data) {
          const existingIds = new Set(deliveriesData.map(d => d.id));
          const newData = delResult2.data.filter((d: any) => !existingIds.has(d.id));
          deliveriesData = [...deliveriesData, ...newData];
          devLog('🚚 Deliveries (by user_id):', delResult2.data.length);
        }
      }

      // Also fetch from purchase_orders with delivery info (increased to 10s)
      let orderDeliveries: any[] = [];
      const { data: delSession } = await supabase.auth.getSession();
      const deliveryPoBuyerIds = await fetchPurchaseBuyerIdsForBuilder(
        userId,
        delSession?.session?.access_token ?? null,
        profile?.id ? [profile.id] : null
      );
      const ordersResult = await withTimeout(
        supabase
          .from('purchase_orders')
          .select('*')
          .in('buyer_id', deliveryPoBuyerIds)
          .in('status', ['confirmed', 'shipped', 'delivered'])
          .order('created_at', { ascending: false }),
        10000,
        { data: [], error: null }
      );
      
      if (ordersResult.data) {
        orderDeliveries = ordersResult.data
          .filter((o: any) => o.delivery_address)
          .map((o: any) => ({
            id: `order-${o.id}`,
            type: 'order',
            display_status: o.status === 'delivered' ? 'delivered' : 
                            o.status === 'shipped' ? 'in_transit' : 'pending',
            pickup_address: o.supplier_name || 'Supplier',
            delivery_address: o.delivery_address,
            project_id: o.project_id ?? null,
            project_name: o.project_name ?? null,
            purchase_order_id: o.id,
            materials_description: o.items?.map((i: any) => i.material_name || i.name).join(', ') || 'Materials',
            estimated_cost: o.total_amount,
            created_at: o.created_at,
            tracking_number: o.po_number,
            estimated_delivery: o.delivery_date
          }));
        devLog('🚚 Order deliveries:', orderDeliveries.length);
      }

      // Combine all - delivery requests, actual deliveries, and order deliveries
      const allDeliveries = [
        ...deliveryRequests.map(dr => ({
          ...dr,
          type: 'request',
          display_status: dr.status || 'pending'
        })),
        ...deliveriesData.map(d => ({
          ...d,
          type: 'delivery',
          display_status: d.status || 'in_transit'
        })),
        ...orderDeliveries
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Remove duplicates by ID
      const uniqueDeliveries = allDeliveries.filter((delivery, index, self) =>
        index === self.findIndex(d => d.id === delivery.id)
      );

      setDeliveries(uniqueDeliveries);
      setDeliveriesLoaded(true);
      devLog('🚚 Total unique deliveries:', uniqueDeliveries.length);

    } catch (error) {
      console.error('Error loading deliveries:', error);
      // Don't clear existing data on error - keep showing what we have
      setDeliveriesLoaded(true);
    } finally {
      clearTimeout(safetyTimeout);
      setLoadingDeliveries(false);
    }
  };

  // Fetch projects - Use Supabase client directly (faster and more reliable)
  const fetchProjects = async () => {
    const userId = getUserId();
    if (!userId) {
      devLog('📁 No userId for projects fetch');
      setLoadingProjects(false);
      return;
    }
    
    devLog('📁 Fetching projects for:', userId);
    setLoadingProjects(true);
    
    // Safety: never block UI forever if network/auth stalls (was 10s — too aggressive for slow links)
    const safetyTimeout = setTimeout(() => {
      devLog('📁 Projects fetch safety timeout');
      setLoadingProjects(false);
    }, 45000);
    
    try {
      // Use REST API directly with fetch to bypass Supabase client issues
      devLog('📁 Fetching projects via REST API for userId:', userId);
      
      // CRITICAL: read persisted session first. await supabase.auth.getSession() can hang on some
      // browsers/networks and never resolve — that left projects stuck empty after safety timeout.
      let accessToken: string | null = readAccessTokenSyncBestEffort() || null;
      if (accessToken) devLog("📁 Got token from persisted session (fast path)");
      if (!accessToken) {
        try {
          const sessPromise = supabase.auth.getSession();
          const timeoutMs = 2500;
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), timeoutMs)
          );
          const raced = await Promise.race([
            sessPromise.then((r) => r.data?.session?.access_token ?? null),
            timeoutPromise,
          ]);
          accessToken = raced;
          if (accessToken) devLog("📁 Got token from getSession (raced)");
          else devWarn("📁 No JWT yet from getSession within", timeoutMs, "ms");
        } catch (e) {
          devWarn("📁 getSession failed:", e);
        }
      }
      
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 25000);
      
      devLog('📁 Making REST API request...');
      const projectSelect =
        'id,name,location,status,budget,spent,progress,created_at,start_date,end_date,expected_end_date,description,total_orders';
      let response = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_projects?builder_id=eq.${userId}&select=${projectSelect}&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          signal: controller.signal
        }
      );
      if (!response.ok && response.status === 400) {
        clearTimeout(fetchTimeout);
        const retryCtrl = new AbortController();
        const retryT = window.setTimeout(() => retryCtrl.abort(), 25000);
        try {
          response = await fetch(
            `${SUPABASE_URL}/rest/v1/builder_projects?builder_id=eq.${userId}&select=id,name,location,status,budget,spent,progress,created_at,start_date,end_date,expected_end_date,description&order=created_at.desc`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              signal: retryCtrl.signal
            }
          );
        } finally {
          window.clearTimeout(retryT);
        }
      } else {
        clearTimeout(fetchTimeout);
      }
      
      devLog('📁 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📁 REST API error:', response.status, errorText);
        setProjects([]);
        return;
      }
      
      const rawData = await response.json();
      const data = Array.isArray(rawData) ? dedupeProjectsById(rawData) : rawData;
      devLog('📁 Query completed successfully');
      devLog('📁 Raw data received:', data);
      
      if (data && Array.isArray(data)) {
        const projectRows = data as any[];
        setProjects(projectRows);
        devLog('📁 Loaded', projectRows.length, 'projects (order stats merge in background)');
        const purchaseExtraSeeds = [profile?.id].filter(
          (id): id is string => typeof id === "string" && id.length > 0
        );
        void mergeProjectRowsWithPurchaseOrders(
          projectRows,
          userId,
          accessToken,
          projectRows,
          purchaseExtraSeeds
        )
          .then((merged) => {
            setProjects(merged);
            devLog('📁 Merged per-project order counts from purchase_orders');
          })
          .catch((err) =>
            devWarn('📁 Per-project order merge failed (non-fatal):', err)
          );
      } else {
        devLog('📁 No projects data returned (data is null or not array)');
        setProjects([]);
      }
    } catch (error: any) {
      console.error('📁 Error fetching projects:', error);
      if (error?.name !== 'AbortError') {
        setProjects([]);
      } else {
        devWarn('📁 Projects fetch aborted (timeout) — keeping prior list if any');
      }
    } finally {
      clearTimeout(safetyTimeout);
      setLoadingProjects(false);
    }
  };

  // Debug: Log when projects state changes
  useEffect(() => {
    devLog('📁 Projects state changed:', projects.length, 'projects', projects);
  }, [projects]);

  // Restore header project selector from cart (e.g. after refresh) when it matches a loaded project
  useEffect(() => {
    if (projects.length === 0) return;
    setSelectedProjectForOrder((prev) => {
      if (prev) return prev;
      const id = getCartProjectId();
      if (id && projects.some((p) => p.id === id)) return id;
      return prev;
    });
  }, [projects]);
  
  // Debug: Log when selectedProject changes
  useEffect(() => {
    devLog('📁 selectedProject state changed:', selectedProject ? `${selectedProject.id} - ${selectedProject.name}` : 'null');
  }, [selectedProject]);

  // Load projects on mount - with delay to ensure auth is ready
  useEffect(() => {
    // Small delay to ensure auth context is ready
    const timer = setTimeout(() => {
      const userId = getUserId();
      if (userId) {
        fetchProjects();
      } else {
        setLoadingProjects(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [authUser, profile?.id]);

  // Get current GPS location for project
  const getProjectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive'
      });
      return;
    }

    setGettingProjectLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const { latitude, longitude } = position.coords;
      devLog('📍 Got project coordinates:', latitude, longitude);

      // Update project with coordinates
      setNewProject(prev => ({
        ...prev,
        latitude,
        longitude
      }));

      // Try to get address from coordinates
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'UjenziXform/1.0' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          const address = data.display_name || '';
          const county = data.address?.county || data.address?.city || data.address?.state || '';
          
          setNewProject(prev => ({
            ...prev,
            latitude,
            longitude,
            address: address.substring(0, 200),
            location: prev.location || county || address.split(',')[0]
          }));

          toast({
            title: '📍 Location Set!',
            description: county ? `Project location set to ${county}` : 'GPS coordinates saved.'
          });
        }
      } catch (geoError) {
        devLog('📍 Reverse geocoding failed, using coordinates only');
        toast({
          title: '📍 Coordinates Saved',
          description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
        });
      }
    } catch (error: any) {
      console.error('📍 Geolocation error:', error);
      let errorMessage = 'Failed to get location';
      
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please allow location access.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please try again.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out.';
      }

      toast({
        title: 'Location Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setGettingProjectLocation(false);
    }
  };

  // Create new project
  const handleCreateProject = async (e?: React.FormEvent) => {
    // Prevent default form submission if called from form
    if (e) {
      e.preventDefault();
    }

    // Validation
    if (!newProject.name || !newProject.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in the project name and location.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id && !authUser?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a project.",
        variant: "destructive",
      });
      return;
    }

    setCreatingProject(true);
    
    // Safety timeout: Always clear loading state after 15 seconds max
    const safetyTimeout = setTimeout(() => {
      devWarn('⚠️ Project creation safety timeout - clearing loading state');
      setCreatingProject(false);
    }, 15000);
    
    const userId = getUserId();
    
    if (!userId) {
      toast({
        title: "Error",
        description: "Unable to identify user. Please refresh the page and try again.",
        variant: "destructive",
      });
      setCreatingProject(false);
      return;
    }

    // Get access token with timeout to prevent hanging
    let accessToken: string | null = null;
    try {
      devLog('📁 Getting access token...');
      const tokenPromise = getAccessToken();
      const tokenTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Token fetch timeout')), 5000)
      );
      accessToken = await Promise.race([tokenPromise, tokenTimeout]);
      devLog('📁 Access token obtained');
    } catch (tokenError: any) {
      devWarn('⚠️ Failed to get access token, trying localStorage fallback:', tokenError);
      // Try to get token from localStorage as fallback
      try {
        const storedSession = localStorage.getItem('sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || SUPABASE_ANON_KEY;
          devLog('📁 Using token from localStorage');
        } else {
          accessToken = SUPABASE_ANON_KEY;
          devLog('📁 Using anon key as fallback');
        }
      } catch {
        accessToken = SUPABASE_ANON_KEY;
        devLog('📁 Using anon key as final fallback');
      }
    }
    
    try {
      let projectCreatedWithoutClientNameColumn = false;
      const projectData: Record<string, any> = {
        builder_id: userId,
        name: newProject.name.trim(),
        location: newProject.location.trim(),
        description: newProject.description?.trim() || null,
        start_date: newProject.start_date || null,
        expected_end_date: newProject.expected_end_date || null,
        budget: newProject.budget ? parseFloat(newProject.budget) : null,
        project_type: newProject.project_type || 'residential',
        status: 'active',
        progress: 0
      };
      
      if (newProject.client_name?.trim()) {
        projectData.client_name = newProject.client_name.trim();
      }

      // Include GPS coordinates if available (for delivery location)
      if (newProject.latitude && newProject.longitude) {
        projectData.latitude = parseFloat(newProject.latitude.toString());
        projectData.longitude = parseFloat(newProject.longitude.toString());
      }

      // Include detailed address if available
      if (newProject.address) {
        projectData.address = newProject.address.trim();
      }

      devLog('📁 Creating project:', projectData);
      devLog('📁 User ID:', userId);
      devLog('📁 Access Token:', accessToken ? 'Present' : 'Missing');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let response: Response;
      try {
        response = await fetch(`${SUPABASE_URL}/rest/v1/builder_projects`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(projectData),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw fetchError;
      }

      devLog('📁 Response status:', response.status);

      if (!response.ok) {
        let errorText = await response.text();
        console.error('❌ Project creation failed:', response.status, errorText);
        const missingClientNameCol =
          projectData.client_name &&
          /client_name|column.*does not exist|schema cache/i.test(errorText);
        if (missingClientNameCol) {
          const retryBody = { ...projectData };
          delete retryBody.client_name;
          if (newProject.client_name?.trim()) {
            retryBody.description = [retryBody.description, `Client: ${newProject.client_name.trim()}`]
              .filter(Boolean)
              .join('\n\n');
          }
          const retryCtl = new AbortController();
          const retryTid = setTimeout(() => retryCtl.abort(), 10000);
          try {
            response = await fetch(`${SUPABASE_URL}/rest/v1/builder_projects`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify(retryBody),
              signal: retryCtl.signal,
            });
          } finally {
            clearTimeout(retryTid);
          }
          errorText = response.ok ? '' : await response.text();
          if (response.ok && missingClientNameCol) {
            projectCreatedWithoutClientNameColumn = true;
          }
        }
        if (!response.ok) {
          let errorMessage = 'Failed to create project. ';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage += errorJson.message || errorJson.error || errorText;
          } catch {
            errorMessage += errorText || 'Please check your connection and try again.';
          }
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      devLog('✅ Project created:', data);
      
      // Ensure we have the created project data
      const createdProject = Array.isArray(data) ? data[0] : data;
      
      if (!createdProject) {
        throw new Error('Project was created but no data was returned');
      }

      // Add the created project directly to the projects state immediately
      // This ensures it shows up right away, even if fetchProjects times out
      setProjects(prev => {
        // Check if project already exists (avoid duplicates)
        const exists = prev.some(p => p.id === createdProject.id);
        if (exists) {
          devLog('📁 Project already in state, skipping duplicate');
          return prev;
        }
        // Add new project at the beginning of the list
        devLog('📁 Adding project to state:', createdProject.id, createdProject.name);
        const newProjects = [createdProject, ...prev];
        devLog('📁 Projects state updated, total projects:', newProjects.length);
        return newProjects;
      });

      // Update stats immediately
      setStats(prev => ({ ...prev, activeProjects: prev.activeProjects + 1 }));
      
      // Reset form and close dialog immediately (don't wait for fetchProjects)
      setShowCreateProject(false);
      setShowMapPicker(false);
      setNewProject({ 
        name: '', 
        location: '', 
        description: '', 
        start_date: '', 
        budget: '',
        project_type: 'residential',
        client_name: '',
        expected_end_date: '',
        latitude: null,
        longitude: null,
        address: ''
      });
      
      toast({
        title: "🏗️ Project Created!",
        description:
          `"${createdProject.name}" has been created successfully. You can now order materials for this project.` +
          (projectCreatedWithoutClientNameColumn
            ? ' Client name was saved in the project description (add builder_projects.client_name via migration 20260219 on this environment to use the dedicated field).'
            : ''),
      });

      // Refresh projects list in background (non-blocking, with timeout)
      // This will update the list with any server-side changes, but the project is already visible
      fetchProjects().catch((err) => {
        devWarn('⚠️ Failed to refresh projects list (non-critical):', err);
        // Don't show error toast - project was created successfully and is already visible
      });
    } catch (error: any) {
      console.error('❌ Error creating project:', error);
      toast({
        title: "Error Creating Project",
        description: error.message || "Failed to create project. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      clearTimeout(safetyTimeout);
      devLog('🔄 Clearing creatingProject state');
      setCreatingProject(false);
    }
  };

  // Handle project update from ProjectDetails
  const handleProjectUpdate = (updatedProject: any) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  // Set up real-time subscription for orders and projects
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const profileBuyerId = profile?.id;
    devLog('🔔 Setting up real-time subscriptions for builder:', userId, profileBuyerId || '');

    const onPurchaseOrderChange = (payload: unknown) => {
      devLog('🛒 Order change detected:', payload);
      loadRealStats(userId);
      void fetchProjects();
      fetchSupplierResponseCount(userId, profileBuyerId);
      void fetchInvoiceHubBadgeCount(profileBuyerId, userId);
      toast({
        title: "Order Updated",
        description: "Your order status has been updated.",
      });
    };

    let channel = supabase
      .channel(`builder-dashboard-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders', filter: `buyer_id=eq.${userId}` },
        onPurchaseOrderChange
      );

    if (profileBuyerId && profileBuyerId !== userId) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders', filter: `buyer_id=eq.${profileBuyerId}` },
        onPurchaseOrderChange
      );
    }

    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'builder_projects', filter: `builder_id=eq.${userId}` },
        (payload) => {
          devLog('📁 Project change detected:', payload);
          loadRealStats(userId);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_requests', filter: `builder_id=eq.${userId}` },
        (payload) => {
          devLog('🚚 Delivery request change detected:', payload);
          loadDeliveries(userId, true); // Force refresh on real-time update
          toast({
            title: "Delivery Update",
            description: "Your delivery status has been updated.",
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `builder_id=eq.${userId}` },
        (payload) => {
          devLog('🚚 Delivery change detected:', payload);
          loadDeliveries(userId, true); // Force refresh on real-time update
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, profile?.id]);

  // Fetch supplier response count on mount and when user changes
  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      fetchSupplierResponseCount(userId, profile?.id);
      
      const profileBuyerId = profile?.id;
      let channel = supabase
        .channel(`supplier-responses-count-${userId}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'purchase_orders',
            filter: `buyer_id=eq.${userId}`
          },
          () => {
            fetchSupplierResponseCount(userId, profileBuyerId);
          }
        );

      if (profileBuyerId && profileBuyerId !== userId) {
        channel = channel.on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'purchase_orders',
            filter: `buyer_id=eq.${profileBuyerId}`
          },
          () => {
            fetchSupplierResponseCount(userId, profileBuyerId);
          }
        );
      }

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authUser, profile?.id]);

  useEffect(() => {
    skipInvoiceSubSoundOnceRef.current = true;
    prevInvoiceSubBadgesRef.current = { dn: 0, grn: 0, inv: 0 };
  }, [authUser?.id, profile?.id]);

  useEffect(() => {
    if (skipInvoiceSubSoundOnceRef.current) {
      skipInvoiceSubSoundOnceRef.current = false;
      prevInvoiceSubBadgesRef.current = {
        dn: invoiceSubBadgeDn,
        grn: invoiceSubBadgeGrn,
        inv: invoiceSubBadgeInv,
      };
      return;
    }
    const prev = prevInvoiceSubBadgesRef.current;
    const increased =
      invoiceSubBadgeDn > prev.dn ||
      invoiceSubBadgeGrn > prev.grn ||
      invoiceSubBadgeInv > prev.inv;
    prevInvoiceSubBadgesRef.current = {
      dn: invoiceSubBadgeDn,
      grn: invoiceSubBadgeGrn,
      inv: invoiceSubBadgeInv,
    };
    if (!docAlertSoundOn || !increased) return;
    playBuilderDocAlertBeep();
  }, [invoiceSubBadgeDn, invoiceSubBadgeGrn, invoiceSubBadgeInv, docAlertSoundOn]);

  /** Orders “Pay now” deep link: ?tab=invoices&payInvoice=… — open supplier invoices sub-tab so InvoiceManagement mounts. */
  useEffect(() => {
    const inv = searchParams.get('payInvoice');
    if (inv && activeTab === 'invoices') {
      setInvoiceDocsSubTab('supplier-invoices');
    }
  }, [searchParams, activeTab]);

  // Invoices tab badge: delivery notes + unacknowledged invoices (+ sub-tab counts + realtime)
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;
    const profileBuyerId = profile?.id;
    void fetchInvoiceHubBadgeCount(profileBuyerId, userId);

    let ch = supabase.channel(`invoice-hub-badge-${userId}`);
    const builders = [...new Set([userId, profileBuyerId].filter(Boolean))] as string[];
    for (const bid of builders) {
      ch = ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_notes',
          filter: `builder_id=eq.${bid}`,
        },
        () => {
          void fetchInvoiceHubBadgeCount(profileBuyerId, userId);
        }
      );
      ch = ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goods_received_notes',
          filter: `builder_id=eq.${bid}`,
        },
        () => {
          void fetchInvoiceHubBadgeCount(profileBuyerId, userId);
        }
      );
      ch = ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `builder_id=eq.${bid}`,
        },
        () => {
          void fetchInvoiceHubBadgeCount(profileBuyerId, userId);
        }
      );
    }
    ch.subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [authUser?.id, profile?.id]);

  const handleMonitoringRequest = async () => {
    if (!monitoringRequest.projectName || !monitoringRequest.projectLocation) {
      toast({
        title: "Missing Information",
        description: "Please fill in the project name and location.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingRequest(true);
    devLog('📹 Submitting monitoring request...');

    const { data: { session: submitSession } } = await supabase.auth.getSession();
    const submitUserId = submitSession?.user?.id || getUserId();
    if (!submitUserId) {
      setSubmittingRequest(false);
      toast({
        title: "Session required",
        description: "Please sign in again to submit a monitoring request.",
        variant: "destructive",
      });
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setSubmittingRequest(false);
      toast({
        title: "Session required",
        description: "Could not verify your session. Please refresh the page or sign in again.",
        variant: "destructive",
      });
      return;
    }
    
    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      devLog('⚠️ Monitoring request safety timeout');
      setSubmittingRequest(false);
      toast({
        title: "Timeout",
        description: "Request took too long. Please try again.",
        variant: "destructive",
      });
    }, 25000);

    try {

      const requestData = {
        user_id: submitUserId,
        contact_name: profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'User',
        contact_email: user?.email || authUser?.email || '',
        contact_phone: profile?.phone || 'N/A',
        company_name: profile?.company_name || '',
        project_name: monitoringRequest.projectName,
        project_location: monitoringRequest.projectLocation,
        selected_services: ['cctv'],
        camera_count: parseInt(monitoringRequest.numberOfCameras) || 1,
        special_requirements: monitoringRequest.projectDescription || null,
        additional_notes: monitoringRequest.additionalNotes || null,
        start_date: monitoringRequest.preferredStartDate || null,
        status: 'pending'
      };

      // Use direct REST API with AbortController
      const controller = new AbortController();
      const insertTimeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/monitoring_service_requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        }
      );

      clearTimeout(insertTimeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('📹 Monitoring request error:', response.status, errorData);
        throw new Error(errorData.message || `Request failed: ${response.status}`);
      }

      devLog('✅ Monitoring request submitted successfully');
      clearTimeout(safetyTimeout);

      toast({
        title: "Request Submitted!",
        description: "Your monitoring service request has been sent to admin for review.",
      });

      setMonitoringDialogOpen(false);
      setMonitoringRequest({
        projectName: '',
        projectLocation: '',
        projectDescription: '',
        preferredStartDate: '',
        numberOfCameras: '1',
        additionalNotes: ''
      });

      void refreshMonitoringRequests();

    } catch (error: any) {
      clearTimeout(safetyTimeout);
      console.error('Error submitting monitoring request:', error);
      let errorMessage = error.message || "Failed to submit request. Please try again.";
      if (error.name === 'AbortError') {
        errorMessage = "Request timed out. Please check your connection and try again.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Exit dashboard — public /home with ?browse=1 so Index does not auto-redirect back to dashboard
  const handleExitDashboard = () => {
    devLog('🚪 Exit Dashboard: Redirecting to public home...');
    navigate('/home?browse=1');
  };

  const handleLogoutProfessional = () => {
    devLog('🚪 Logout: Starting sign out process...');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_role_id');
    localStorage.removeItem('user_role_verified');
    localStorage.removeItem('user_security_key');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    clearSupabasePersistedSessionSync();
    sessionStorage.clear();
    window.location.replace('/auth');
    signOut().catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      {/* Navigation hidden in dashboard - use Exit Dashboard to access main navigation */}
      
      {/* Header — hamburger is position:absolute on small screens so it never steals flex width from the title */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 text-white py-8 px-4">
        <div className="container relative mx-auto max-w-7xl">
          <div className="pointer-events-none absolute right-1 top-1/2 z-20 -translate-y-1/2 sm:right-2 md:hidden">
            <div className="pointer-events-auto">
              <DashboardMobileActionSheet
                title="Account & ordering"
                triggerClassName="border-white/40 bg-white/15 text-white hover:bg-white/25"
              >
                {projects.length > 0 && (
                  <div className="mb-3 space-y-2" data-keep-sheet-open>
                    <Label className="text-xs text-muted-foreground">Project for orders</Label>
                    <Select
                      value={selectedProjectForOrder || 'none'}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setSelectedProjectForOrder(null);
                          clearCartProjectContext();
                        } else {
                          setSelectedProjectForOrder(value);
                          const proj = projects.find((p) => p.id === value);
                          setCartProjectContext(
                            value,
                            proj?.name ?? null,
                            proj?.location ?? null
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-full border-blue-200 bg-blue-50 text-blue-900">
                        <SelectValue placeholder="Select project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project (general order)</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-blue-600" />
                              <span>{project.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  className="w-full justify-start bg-blue-50 text-blue-800 hover:bg-blue-100"
                  onClick={() => setShowProfileView(true)}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Link
                  className="block w-full"
                  to={
                    selectedProjectForOrder && selectedProjectForOrder !== 'none'
                      ? `/suppliers?from=dashboard&project_id=${selectedProjectForOrder}`
                      : '/suppliers?from=dashboard'
                  }
                >
                  <Button className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Order Materials
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start border-blue-200 bg-blue-50/80 text-blue-800 hover:bg-blue-100"
                  onClick={handleExitDashboard}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Exit Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                  onClick={handleLogoutProfessional}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </DashboardMobileActionSheet>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex w-full min-w-0 items-center gap-3 pr-14 sm:pr-16 md:min-w-[12rem] md:flex-1 md:pr-0">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
                <HardHat className="h-8 w-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold break-normal md:text-3xl">
                  Welcome, {profile?.full_name || profile?.company_name || 'Builder'}!
                </h1>
                <p className="text-blue-100">Professional Builder Dashboard</p>
              </div>
            </div>
            <div className="hidden w-full flex-none flex-wrap items-center gap-2 md:flex md:w-auto md:justify-end">
              {projects.length > 0 && (
                <Select
                  value={selectedProjectForOrder || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setSelectedProjectForOrder(null);
                      clearCartProjectContext();
                    } else {
                      setSelectedProjectForOrder(value);
                      const proj = projects.find((p) => p.id === value);
                      setCartProjectContext(
                        value,
                        proj?.name ?? null,
                        proj?.location ?? null
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px] border-blue-200 bg-white/90 text-blue-700">
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project (general order)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-blue-600" />
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                className="bg-white/90 text-blue-700 hover:bg-white"
                onClick={() => setShowProfileView(true)}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Link
                to={
                  selectedProjectForOrder && selectedProjectForOrder !== 'none'
                    ? `/suppliers?from=dashboard&project_id=${selectedProjectForOrder}`
                    : '/suppliers?from=dashboard'
                }
              >
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Order Materials
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-white/30 bg-white/90 text-blue-700 hover:bg-white"
                onClick={handleExitDashboard}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Exit Dashboard
              </Button>
              <Button
                variant="outline"
                className="border-red-300/50 bg-red-500/20 text-white hover:bg-red-500/30"
                onClick={handleLogoutProfessional}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Delivery address needed – prompt from driver (Check Address) so builder sees it */}
        {deliveryAddressNeededNotifications.length > 0 && (
          <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Delivery address needed</h3>
                <p className="mt-1 text-sm text-amber-800">
                  {deliveryAddressNeededNotifications[0].message}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setActiveTab('deliveries');
                      setDeliveriesSubTab('request');
                    }}
                  >
                    Add address in Deliveries
                  </Button>
                  {deliveryAddressNeededNotifications[0].action_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600 text-amber-800"
                      onClick={() => {
                        setActiveTab('deliveries');
                        setDeliveriesSubTab('request');
                        navigate(deliveryAddressNeededNotifications[0].action_url || '/professional-builder-dashboard');
                      }}
                    >
                      Open Deliveries
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <ProfessionalBuilderDashboardNavCards
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setExtrasSubTab={setExtrasSubTab}
          supplierResponseCount={supplierResponseCount}
          stats={stats}
          deliveriesNavBadgeCount={deliveriesNavBadgeCount}
          invoiceHubBadgeCount={invoiceHubBadgeCount}
        />

        {/* Tab Content - Hidden TabsList, content controlled by cards above */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="order-history">Order History</TabsTrigger>
            <TabsTrigger value="my-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4" data-tab-content="projects">
            {selectedProject ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <ProjectDetails 
                  project={selectedProject}
                  onBack={() => setSelectedProject(null)}
                  onUpdate={handleProjectUpdate}
                  userId={getUserId()}
                  profileIdForOrders={profile?.id}
                  attributionProjects={projectAttributionList}
                />
              </div>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Active Projects
                    </CardTitle>
                    <CardDescription>Manage your construction projects</CardDescription>
                  </div>
                  <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowCreateProject(true)}
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Create New Project
                    </Button>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          Create New Project
                        </DialogTitle>
                        <DialogDescription>
                          Add a new construction project to track materials, deliveries, and spending
                        </DialogDescription>
                      </DialogHeader>
                      <form id="create-project-form" onSubmit={(e) => { e.preventDefault(); handleCreateProject(e); }} className="space-y-4 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="project-name">Project Name *</Label>
                            <Input
                              id="project-name"
                              placeholder="e.g., Residential Building Phase 1"
                              value={newProject.name}
                              onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="project-location">Location *</Label>
                            <Input
                              id="project-location"
                              placeholder="e.g., Westlands, Nairobi"
                              value={newProject.location}
                              onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                              required
                            />
                          </div>
                        </div>

                        {/* GPS Location Section */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="flex items-center gap-2 text-blue-800">
                              <MapPin className="h-4 w-4" />
                              Project Site GPS Location
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMapPicker(true)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                🗺️ Search on Map
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={getProjectLocation}
                                disabled={gettingProjectLocation}
                                className="border-green-300 text-green-700 hover:bg-green-100"
                              >
                                {gettingProjectLocation ? (
                                  <>
                                    <div className="h-4 w-4 mr-2 animate-spin border-2 border-green-500 border-t-transparent rounded-full" />
                                    Getting...
                                  </>
                                ) : (
                                  <>
                                    <Navigation className="h-4 w-4 mr-2" />
                                    📍 My Location
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mb-3">
                            Setting the GPS location ensures accurate delivery of materials to your project site
                          </p>
                          
                          {/* Map Picker */}
                          {showMapPicker && (
                            <div className="mb-3 border border-blue-300 rounded-lg p-3 bg-white">
                              <MapLocationPicker
                                initialLocation={{
                                  latitude: newProject.latitude || undefined,
                                  longitude: newProject.longitude || undefined,
                                  address: newProject.address
                                }}
                                onLocationSelect={(location) => {
                                  setNewProject(prev => ({
                                    ...prev,
                                    latitude: location.latitude,
                                    longitude: location.longitude,
                                    address: location.address,
                                    location: prev.location || location.county || location.address?.split(',')[0] || ''
                                  }));
                                  setShowMapPicker(false);
                                  toast({
                                    title: '📍 Location Set!',
                                    description: location.county 
                                      ? `Project location set to ${location.county}` 
                                      : 'GPS coordinates saved from map.'
                                  });
                                }}
                                onClose={() => setShowMapPicker(false)}
                                title="Select Project Location"
                                description="Search for an address or click on the map to set your project site location"
                              />
                            </div>
                          )}
                          
                          {/* Location Status */}
                          {!showMapPicker && (
                            <>
                              {newProject.latitude && newProject.longitude ? (
                                <div className="bg-green-100 border border-green-300 rounded p-3 text-sm">
                                  <p className="text-green-800 font-medium flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Location Set!
                                  </p>
                                  <p className="text-green-700 text-xs font-mono mt-1">
                                    Lat: {newProject.latitude.toFixed(6)}, Lng: {newProject.longitude.toFixed(6)}
                                  </p>
                                  {newProject.address && (
                                    <p className="text-green-600 text-xs mt-1">📍 {newProject.address}</p>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto"
                                    onClick={() => setShowMapPicker(true)}
                                  >
                                    Change location on map →
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-center py-4 border-2 border-dashed border-blue-200 rounded-lg">
                                  <MapPin className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600">No GPS coordinates set yet</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Use "Search on Map" to find any location, or "My Location" if you're at the project site
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="project-type">Project Type</Label>
                            <select
                              id="project-type"
                              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                              value={newProject.project_type}
                              onChange={(e) => setNewProject(prev => ({ ...prev, project_type: e.target.value }))}
                            >
                              <option value="residential">Residential</option>
                              <option value="commercial">Commercial</option>
                              <option value="industrial">Industrial</option>
                              <option value="infrastructure">Infrastructure</option>
                              <option value="renovation">Renovation</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="project-client">Client Name</Label>
                            <Input
                              id="project-client"
                              placeholder="e.g., ABC Development Ltd"
                              value={newProject.client_name}
                              onChange={(e) => setNewProject(prev => ({ ...prev, client_name: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="project-description">Description</Label>
                          <Textarea
                            id="project-description"
                            placeholder="Brief description of the project..."
                            value={newProject.description}
                            onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="project-start">Start Date</Label>
                            <Input
                              id="project-start"
                              type="date"
                              value={newProject.start_date}
                              onChange={(e) => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="project-end">Expected End Date</Label>
                            <Input
                              id="project-end"
                              type="date"
                              value={newProject.expected_end_date}
                              onChange={(e) => setNewProject(prev => ({ ...prev, expected_end_date: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="project-budget">Budget (KES)</Label>
                            <Input
                              id="project-budget"
                              type="number"
                              placeholder="e.g., 5000000"
                              value={newProject.budget}
                              onChange={(e) => setNewProject(prev => ({ ...prev, budget: e.target.value }))}
                            />
                          </div>
                        </div>
                      </form>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateProject(false)} disabled={creatingProject}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          form="create-project-form"
                          disabled={creatingProject || !newProject.name || !newProject.location}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {creatingProject ? (
                            <>
                              <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Briefcase className="h-4 w-4 mr-2" />
                              Create Project
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-gray-500">Loading projects...</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No active projects</p>
                      <p className="text-sm mb-4">Create your first project to get started</p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          onClick={() => setShowCreateProject(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Create Your First Project
                        </Button>
                        <Button 
                          onClick={() => {
                            setLoadingProjects(true);
                            fetchProjects();
                          }}
                          variant="outline"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Refresh Projects
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Project Stats Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-700">Active</p>
                          <p className="text-2xl font-bold text-blue-800">
                            {projects.filter(p => ['active', 'in_progress'].includes(p.status)).length}
                          </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-700">Completed</p>
                          <p className="text-2xl font-bold text-green-800">
                            {projects.filter(p => p.status === 'completed').length}
                          </p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <p className="text-sm text-amber-700">On Hold</p>
                          <p className="text-2xl font-bold text-amber-800">
                            {projects.filter(p => p.status === 'on_hold').length}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <p className="text-sm text-purple-700">Total Budget</p>
                          <p className="text-xl font-bold text-purple-800">
                            {formatKesCompact(
                              projects.reduce((sum, p) => sum + (p.budget || 0), 0)
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Project Cards */}
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project, projectIdx) => (
                          <Card 
                            key={project.id ? String(project.id) : `project-${projectIdx}`} 
                            className="border-2 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => setSelectedProject(project)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg truncate">{project.name}</h3>
                                  {project.id && (
                                    <p className="text-[11px] text-gray-400 font-mono truncate" title={String(project.id)}>
                                      Ref {String(project.id).replace(/-/g, '').slice(0, 8)}…
                                    </p>
                                  )}
                                  {project.created_at && (
                                    <p className="text-[11px] text-gray-400">
                                      Added{' '}
                                      {new Date(project.created_at).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{project.location}</span>
                                  </p>
                                </div>
                                <Badge 
                                  className={
                                    project.status === 'active' ? 'bg-green-500 text-white' :
                                    project.status === 'in_progress' ? 'bg-blue-500 text-white' :
                                    project.status === 'completed' ? 'bg-emerald-600 text-white' :
                                    project.status === 'on_hold' ? 'bg-amber-500 text-white' :
                                    'bg-gray-500 text-white'
                                  }
                                >
                                  {project.status?.replace('_', ' ') || 'Active'}
                                </Badge>
                              </div>
                              
                              {/* Progress Bar */}
                              {project.budget && (
                                <div className="mb-3">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500">Progress</span>
                                    <span className="font-semibold">{projectCardProgressPercent(project)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${projectCardProgressPercent(project)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Project Stats */}
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-gray-50 p-2 rounded">
                                  <p className="text-xs text-gray-500">Budget</p>
                                  <p className="font-semibold text-sm">
                                    {project.budget != null && Number(project.budget) > 0
                                      ? formatKesCompact(project.budget)
                                      : "Not set"}
                                  </p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <p className="text-xs text-gray-500">Spent</p>
                                  <p className="font-semibold text-sm text-blue-600">
                                    {formatKesCompact(project.spent)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Footer — orders / deliveries / monitoring per project */}
                              <div className="pt-3 border-t space-y-2">
                                <div className="flex items-center justify-center text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    {formatProjectCardDate(project)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                                  <div className="rounded-md bg-gray-50 px-1 py-1.5">
                                    <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                                      <Package className="h-3 w-3 shrink-0" />
                                      Orders
                                    </p>
                                    <p className="font-semibold text-gray-900 tabular-nums">
                                      {project.total_orders ?? 0}
                                    </p>
                                  </div>
                                  <div className="rounded-md bg-gray-50 px-1 py-1.5">
                                    <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                                      <Truck className="h-3 w-3 shrink-0" />
                                      Deliveries
                                    </p>
                                    <p className="font-semibold text-gray-900 tabular-nums">
                                      {projectActivityById.get(String(project.id))?.deliveries ?? 0}
                                    </p>
                                  </div>
                                  <div className="rounded-md bg-gray-50 px-1 py-1.5">
                                    <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                                      <Camera className="h-3 w-3 shrink-0" />
                                      Monitor
                                    </p>
                                    <p className="font-semibold text-gray-900 tabular-nums">
                                      {projectActivityById.get(String(project.id))?.monitoring ?? 0}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-3">
                                <Button 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setSelectedProject(project);
                                    setActiveTab('projects');
                                    setTimeout(() => {
                                      const projectsSection = document.querySelector('[data-tab-content="projects"]');
                                      if (projectsSection) {
                                        projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }
                                    }, 100);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                                <Link 
                                  to={`/suppliers?from=dashboard&project_id=${project.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCartProjectContext(
                                      project.id,
                                      project.name,
                                      project.location ?? null
                                    );
                                  }}
                                >
                                  <Button 
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Order Materials
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {/* Add New Project Card */}
                        <Card 
                          className="border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer bg-gray-50/50 transition-colors"
                          onClick={() => setShowCreateProject(true)}
                        >
                          <CardContent className="p-5 flex flex-col items-center justify-center min-h-[280px]">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                              <Briefcase className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">Start New Project</h3>
                            <p className="text-sm text-gray-500 text-center">
                              Create a new construction project to track materials and spending
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quotes Tab - Review supplier pricing */}
          <TabsContent value="quotes">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="h-5 w-5 text-green-600" />
                  Quotes Management
                </CardTitle>
                <CardDescription>Track sent quotes and review supplier responses</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="my-requests" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg h-auto">
                    <TabsTrigger 
                      value="my-requests"
                      className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm data-[state=active]:border-amber-200 data-[state=active]:border py-3 rounded-md font-medium transition-all"
                    >
                      <Clock className="h-4 w-4 mr-2 text-amber-600" />
                      <div className="flex flex-col items-start">
                        <span>My Quote Requests</span>
                        <span className="text-[10px] font-normal text-gray-500">Sent quotes awaiting response</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="supplier-quotes"
                      className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm data-[state=active]:border-green-200 data-[state=active]:border py-3 rounded-md font-medium transition-all relative"
                    >
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <div className="flex flex-col items-start">
                        <span className="inline-flex items-center gap-1.5">
                          Supplier Responses
                          {supplierResponseCount > 0 && (
                            <Badge className="h-5 min-w-[20px] rounded-full px-1.5 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white font-semibold">
                              {supplierResponseCount > 99 ? '99+' : supplierResponseCount}
                            </Badge>
                          )}
                        </span>
                        <span className="text-[10px] font-normal text-gray-500">Accept or reject quotes</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* My Quote Requests - Sent quotes awaiting supplier response */}
                  <TabsContent value="my-requests" className="mt-0">
                    <PendingQuoteRequests
                      builderId={user?.id || ''}
                      profileId={profile?.id ?? null}
                    />
                  </TabsContent>
                  
                  {/* Supplier Responses - Quotes that suppliers have responded to */}
                  <TabsContent value="supplier-quotes" className="mt-0">
                    <SupplierQuoteReview
                      builderId={user?.id || ''}
                      profileId={profile?.id ?? null}
                      showOnlyQuoted={true}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <div className="mb-4 space-y-4">
              <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-950 dark:text-emerald-50">
                      Supplier invoice for materials you bought?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pay suppliers on the <strong>Invoices</strong> tab — each unpaid invoice has a green{" "}
                      <strong>Pay now</strong> button (Paystack or record a transfer you already made).
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setActiveTab("invoices")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Open invoices — Pay now
                  </Button>
                </CardContent>
              </Card>
              {(() => {
                // Prefer profile id (purchase_orders.buyer_id often stores profiles.id); fall back to auth uid
                let builderId = profile?.id || user?.id || '';
                if (!builderId) {
                  try {
                    const stored = readPersistedAuthRawStringSync();
                    if (stored) {
                      const parsed = JSON.parse(stored);
                      builderId = parsed.user?.id || '';
                    }
                  } catch (e) {}
                  if (!builderId) {
                    builderId = localStorage.getItem('user_id') || '';
                  }
                }
                return <BuilderOrdersTracker builderId={builderId} />;
              })()}
            </div>
          </TabsContent>

          {/* Deliveries Tab - Contains Request Delivery, Delivery Schedule, and Delivery History as sub-tabs */}
          <TabsContent value="deliveries" className="mt-0">
            {/* Missing Address Alert - Show at top of deliveries tab */}
            {(() => {
              // Get builderId and userId for the alert component
              let builderId = profile?.id || user?.id || '';
              let userId = user?.id || '';
              if (!builderId || !userId) {
                try {
                  const stored = readPersistedAuthRawStringSync();
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    userId = parsed.user?.id || '';
                    builderId = userId; // Fallback to userId if profile not found
                  }
                } catch (e) {}
              }
              return builderId && userId ? (
                <MissingDeliveryAddressAlert builderId={builderId} userId={userId} />
              ) : null;
            })()}
            
            <Card>
              <CardContent className="p-0">
                <Tabs value={deliveriesSubTab} onValueChange={setDeliveriesSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg h-auto">
                    <TabsTrigger 
                      value="request"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border-blue-200 data-[state=active]:border py-3 rounded-md font-medium transition-all"
                    >
                      <Send className="h-4 w-4 mr-2 text-blue-600" />
                      <span>Request Delivery</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="schedule"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border-blue-200 data-[state=active]:border py-3 rounded-md font-medium transition-all"
                    >
                      <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                      <span>Delivery Schedule</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="history"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border-blue-200 data-[state=active]:border py-3 rounded-md font-medium transition-all"
                    >
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      <span>Delivery History</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Request Delivery Sub-tab */}
                  <TabsContent value="request" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Send className="h-5 w-5 text-teal-600" />
                          Request Delivery
                        </CardTitle>
                        <CardDescription>
                          Request delivery for materials sourced outside UjenziXform or for site-to-site transfers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Info Banner */}
                        <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-500 rounded-lg text-white">
                              <Truck className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-teal-800 mb-1">When to Use Manual Delivery Request</h4>
                              <ul className="text-sm text-teal-700 space-y-1">
                                <li>• Materials purchased from suppliers outside UjenziXform</li>
                                <li>• Site-to-site material transfers between your projects</li>
                                <li>• Returning defective materials to suppliers</li>
                                <li>• Moving existing inventory to a new construction site</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <BuilderDashboardTabSuspense>
                          <LazyDeliveryRequest />
                        </BuilderDashboardTabSuspense>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Delivery Schedule Sub-tab - Shows scheduled deliveries sorted by soonest date */}
                  <TabsContent value="schedule" className="mt-0">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-blue-600" />
                            Delivery Schedule
                          </CardTitle>
                          <CardDescription>Your scheduled deliveries from start to finish, sorted by soonest date</CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => loadDeliveries(getUserId(), true)}
                          disabled={loadingDeliveries}
                        >
                          {loadingDeliveries ? 'Refreshing...' : 'Refresh'}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {loadingDeliveries ? (
                          <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-gray-500">Loading deliveries...</p>
                          </div>
                        ) : (() => {
                          // Filter to only show pending, accepted, and in_transit deliveries (future/scheduled)
                          const scheduledDeliveries = deliveries.filter(d => 
                            ['pending', 'accepted', 'in_transit'].includes(d.display_status || '')
                          ).sort((a, b) => {
                            // Sort by estimated_delivery date (soonest first)
                            const dateA = a.estimated_delivery ? new Date(a.estimated_delivery).getTime() : 0;
                            const dateB = b.estimated_delivery ? new Date(b.estimated_delivery).getTime() : 0;
                            return dateA - dateB;
                          });
                          
                          return scheduledDeliveries.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No scheduled deliveries</p>
                              <p className="text-sm">Your scheduled deliveries will appear here</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {scheduledDeliveries.map((delivery) => (
                                <div 
                                  key={delivery.id} 
                                  className="border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Truck className={`h-5 w-5 ${
                                          delivery.display_status === 'in_transit' ? 'text-blue-600' :
                                          delivery.display_status === 'accepted' ? 'text-teal-600' :
                                          'text-orange-500'
                                        }`} />
                                        <h3 className="font-semibold">
                                          {delivery.materials_description || delivery.pickup_address || 'Delivery Request'}
                                        </h3>
                                        <Badge 
                                          variant={
                                            delivery.display_status === 'in_transit' ? 'default' :
                                            delivery.display_status === 'accepted' ? 'default' :
                                            'secondary'
                                          }
                                          className={
                                            delivery.display_status === 'in_transit' ? 'bg-blue-500' :
                                            delivery.display_status === 'accepted' ? 'bg-teal-500' :
                                            delivery.display_status === 'pending' ? 'bg-orange-500' :
                                            ''
                                          }
                                        >
                                          {delivery.display_status?.replace('_', ' ') || 'Pending'}
                                        </Badge>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                                        {delivery.pickup_address && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">From:</span> {delivery.pickup_address}
                                          </div>
                                        )}
                                        {delivery.delivery_address && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4 text-blue-400" />
                                            <span className="font-medium">To:</span> {delivery.delivery_address}
                                          </div>
                                        )}
                                      </div>

                                      {delivery.estimated_delivery && (
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                          <Calendar className="h-4 w-4" />
                                          <span className="font-medium">Expected: {new Date(delivery.estimated_delivery).toLocaleDateString()}</span>
                                        </div>
                                      )}

                                      {delivery.tracking_number && (
                                        <div className="mt-2 text-sm">
                                          <span className="font-medium text-gray-700">Tracking:</span>{' '}
                                          <code className="bg-gray-100 px-2 py-1 rounded">{delivery.tracking_number}</code>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="text-right">
                                      {delivery.estimated_cost && (
                                        <p className="text-lg font-bold text-blue-600">
                                          KES {delivery.estimated_cost.toLocaleString()}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-400">
                                        {new Date(delivery.created_at).toLocaleDateString()}
                                      </p>
                                      {delivery.provider_name && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Driver: {delivery.provider_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress indicator for in-transit deliveries */}
                                  {delivery.display_status === 'in_transit' && (
                                    <div className="mt-4 pt-4 border-t">
                                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                        <span>Pickup</span>
                                        <span>In Transit</span>
                                        <span>Delivered</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-blue-500 h-2 rounded-full w-1/2 transition-all duration-500" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Delivery History Sub-tab - Shows completed/delivered deliveries */}
                  <TabsContent value="history" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          Delivery History
                        </CardTitle>
                        <CardDescription>View your completed and past deliveries</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          // Filter to only show delivered/completed deliveries
                          const historyDeliveries = deliveries.filter(d => 
                            d.display_status === 'delivered'
                          ).sort((a, b) => {
                            // Sort by delivered_at or created_at (most recent first)
                            const dateA = a.delivered_at ? new Date(a.delivered_at).getTime() : new Date(a.created_at).getTime();
                            const dateB = b.delivered_at ? new Date(b.delivered_at).getTime() : new Date(b.created_at).getTime();
                            return dateB - dateA;
                          });
                          
                          return historyDeliveries.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No delivery history</p>
                              <p className="text-sm">Completed deliveries will appear here</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {historyDeliveries.map((delivery) => (
                                <div 
                                  key={delivery.id} 
                                  className="border rounded-lg p-4 hover:border-green-300 hover:bg-green-50/30 transition-all"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <h3 className="font-semibold">
                                          {delivery.materials_description || delivery.pickup_address || 'Delivery Request'}
                                        </h3>
                                        <Badge className="bg-green-500">
                                          Delivered
                                        </Badge>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                                        {delivery.pickup_address && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">From:</span> {delivery.pickup_address}
                                          </div>
                                        )}
                                        {delivery.delivery_address && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4 text-green-400" />
                                            <span className="font-medium">To:</span> {delivery.delivery_address}
                                          </div>
                                        )}
                                      </div>

                                      {delivery.delivered_at && (
                                        <div className="flex items-center gap-1 text-sm text-green-600 mb-2">
                                          <CheckCircle className="h-4 w-4" />
                                          <span className="font-medium">Delivered on: {new Date(delivery.delivered_at).toLocaleString()}</span>
                                        </div>
                                      )}

                                      {delivery.tracking_number && (
                                        <div className="mt-2 text-sm">
                                          <span className="font-medium text-gray-700">Tracking:</span>{' '}
                                          <code className="bg-gray-100 px-2 py-1 rounded">{delivery.tracking_number}</code>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="text-right">
                                      {delivery.estimated_cost && (
                                        <p className="text-lg font-bold text-green-600">
                                          KES {delivery.estimated_cost.toLocaleString()}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-400">
                                        {new Date(delivery.created_at).toLocaleDateString()}
                                      </p>
                                      {delivery.provider_name && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Driver: {delivery.provider_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NavigationIcon className="h-5 w-5 text-green-600" />
                  Delivery Tracking
                </CardTitle>
                <CardDescription>
                  Track your material deliveries in real-time with tracking numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BuilderDashboardTabSuspense>
                  <LazyTrackingTab
                    userId={user?.id || authUser?.id || localStorage.getItem('user_id') || (() => {
                      try {
                        const storedSession = readPersistedAuthRawStringSync();
                        if (storedSession) {
                          const parsed = JSON.parse(storedSession);
                          return parsed.user?.id || '';
                        }
                      } catch (e) {}
                      return '';
                    })()}
                    userRole="professional_builder"
                    userName={profile?.full_name || user?.email?.split('@')[0]}
                  />
                </BuilderDashboardTabSuspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-orange-500" />
                  Delivery notes, GRN & supplier invoices
                </CardTitle>
                <CardDescription className="space-y-3">
                  <p>
                    Use the row below in order: <strong className="font-medium">DN</strong> (delivery notes), then{' '}
                    <strong className="font-medium">GRN</strong>, then <strong className="font-medium">Invoice</strong>{' '}
                    (pay the supplier). Everything stays on one horizontal tab bar.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <Label htmlFor="builder-doc-sound" className="cursor-pointer font-normal">
                      Alert sound when new items appear (tap toggle on phones to allow audio)
                    </Label>
                    <Switch
                      id="builder-doc-sound"
                      checked={docAlertSoundOn}
                      onCheckedChange={(on) => {
                        setDocAlertSoundOn(on);
                        localStorage.setItem(BUILDER_DOC_SOUND_KEY, on ? '1' : '0');
                        if (on) playBuilderDocAlertBeep();
                      }}
                      className="scale-90"
                    />
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={invoiceDocsSubTab} onValueChange={setInvoiceDocsSubTab} className="space-y-4">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:gap-2 bg-muted">
                    <TabsTrigger value="delivery-notes" className="relative min-w-0 gap-1 px-2 py-2 pr-7 text-xs sm:gap-2 sm:pr-8 sm:px-3 sm:text-sm">
                      <FileSignature className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        <span className="sm:hidden">DN</span>
                        <span className="hidden sm:inline">Delivery notes</span>
                      </span>
                      {invoiceSubBadgeDn > 0 && (
                        <Badge className="absolute right-1 top-1/2 h-5 min-w-5 -translate-y-1/2 border-2 border-background bg-red-500 px-1 text-[10px] text-white hover:bg-red-500">
                          {invoiceSubBadgeDn > 9 ? '9+' : invoiceSubBadgeDn}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="grn"
                      title="Goods received note (GRN)"
                      className="relative min-w-0 gap-1 px-2 py-2 pr-7 text-xs sm:gap-2 sm:pr-8 sm:px-3 sm:text-sm"
                    >
                      <Package className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                      <span className="truncate">GRN</span>
                      {invoiceSubBadgeGrn > 0 && (
                        <Badge className="absolute right-1 top-1/2 h-5 min-w-5 -translate-y-1/2 border-2 border-background bg-red-500 px-1 text-[10px] text-white hover:bg-red-500">
                          {invoiceSubBadgeGrn > 9 ? '9+' : invoiceSubBadgeGrn}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="supplier-invoices"
                      title="Supplier invoices — Pay now"
                      className="relative min-w-0 gap-1 px-2 py-2 pr-7 text-xs sm:gap-2 sm:pr-8 sm:px-3 sm:text-sm"
                    >
                      <CreditCard className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" aria-hidden />
                      <span className="truncate">
                        <span className="sm:hidden">Inv.</span>
                        <span className="hidden sm:inline">Invoice</span>
                      </span>
                      {invoiceSubBadgeInv > 0 && (
                        <Badge className="absolute right-1 top-1/2 h-5 min-w-5 -translate-y-1/2 border-2 border-background bg-red-500 px-1 text-[10px] text-white hover:bg-red-500">
                          {invoiceSubBadgeInv > 9 ? '9+' : invoiceSubBadgeInv}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="delivery-notes" forceMount className="mt-0 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Sign delivery notes and verify materials received.
                    </p>
                    {user?.id && (
                      <DeliveryNoteWorkflow
                        builderAuthUserId={user.id}
                        builderProfileId={profile?.id ?? null}
                        onComplete={() => {
                          void fetchInvoiceHubBadgeCount(profile?.id ?? null, user.id);
                        }}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="grn" forceMount className="mt-0 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      View all GRNs for accepted deliveries.
                    </p>
                    {user?.id && <GRNView userId={user.id} userRole="builder" />}
                  </TabsContent>

                  <TabsContent value="supplier-invoices" forceMount className="mt-0 space-y-4">
                    <Card className="border-2 border-emerald-200 shadow-md dark:border-emerald-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-emerald-950 dark:text-emerald-50 sm:text-xl">
                          <CreditCard className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                          Pay suppliers for materials you ordered
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                          When your supplier sends an invoice for a purchase order, it appears below. Each unpaid row has
                          a green <strong className="text-emerald-800 dark:text-emerald-200">Pay now</strong> button
                          (Paystack card / M-Pesa / bank, depending on your Paystack setup) or you can record a payment
                          you already made to the supplier.
                        </CardDescription>
                        {invoiceSubBadgeInv > 0 && (
                          <p className="pt-1 text-sm font-medium text-amber-800 dark:text-amber-200">
                            You have {invoiceSubBadgeInv} supplier invoice{invoiceSubBadgeInv === 1 ? '' : 's'} needing
                            payment or acknowledgement — scroll to the green Pay now buttons.
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {user?.id ? <InvoiceManagement userId={user.id} userRole="builder" /> : null}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legacy Invoices Tab - Keeping for backward compatibility */}
          <TabsContent value="invoices-legacy" className="hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Invoices & Payments
                </CardTitle>
                <CardDescription>Manage invoices and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No invoices yet</p>
                  <p className="text-sm">Your invoices will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Extras Tab - Contains Team and Support as sub-tabs */}
          <TabsContent value="extras" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <Tabs value={extrasSubTab} onValueChange={setExtrasSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg h-auto">
                    <TabsTrigger 
                      value="team"
                      className="data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm data-[state=active]:border-violet-200 data-[state=active]:border py-3 rounded-md font-medium transition-all"
                    >
                      <Users className="h-4 w-4 mr-2 text-violet-600" />
                      <span>Team</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="support"
                      className="data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm data-[state=active]:border-violet-200 data-[state=active]:border py-3 rounded-md font-medium transition-all"
                    >
                      <Headphones className="h-4 w-4 mr-2 text-violet-600" />
                      <span>Support</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="team" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          Team Management
                        </CardTitle>
                        <CardDescription>Manage your construction team</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12 text-gray-500">
                          <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No team members</p>
                          <p className="text-sm mb-4">Add team members to collaborate</p>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <User className="h-4 w-4 mr-2" />
                            Invite Team Member
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="support" className="mt-0">
                    <div className="space-y-6">
                      {/* In-App Communication */}
                      {user && (
                        <BuilderDashboardTabSuspense>
                          <LazyInAppCommunication
                            userId={user.id}
                            userName={user.email || 'Builder'}
                            userRole="professional_builder"
                            isDarkMode={false}
                          />
                        </BuilderDashboardTabSuspense>
                      )}

                      {/* Quick Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              Support Hours
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Mon - Fri: 8AM - 6PM<br />
                              Saturday: 9AM - 4PM<br />
                              Sunday: Closed
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-indigo-600" />
                              Priority Support
                            </h4>
                            <p className="text-sm text-muted-foreground space-y-1">
                              <a href={`tel:${SUPPORT_PHONE_PRIMARY.tel}`} className="block hover:underline">
                                Call: {SUPPORT_PHONE_PRIMARY.display}
                              </a>
                              <a href={`mailto:${SUPPORT_EMAIL}`} className="block hover:underline">
                                Email: {SUPPORT_EMAIL}
                              </a>
                              <Link to="/contact" className="block text-primary hover:underline">
                                Contact page
                              </Link>
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            {/* Camera Access Summary Cards - Always visible */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Active Cameras Card */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Active Cameras</p>
                      <p className="text-3xl font-bold text-green-800">
                        {monitoringRequests.filter(r => isMonitoringApprovedStatus(r.status)).reduce((sum, r) => sum + (r.assigned_cameras?.length || r.camera_count || 0), 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500 rounded-full">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pending Approvals Card */}
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-700 font-medium">Pending Approval</p>
                      <p className="text-3xl font-bold text-amber-800">
                        {monitoringRequests.filter(r => isMonitoringPendingOrQuotedStatus(r.status)).length}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-500 rounded-full">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Access Keys Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Access Keys</p>
                      <p className="text-3xl font-bold text-blue-800">
                        {monitoringRequests.filter(r => isMonitoringApprovedStatus(r.status) && r.access_code).length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  {monitoringRequests.filter(r => isMonitoringApprovedStatus(r.status) && r.access_code).length > 0 && (
                    <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                      <p className="text-xs text-gray-500 mb-1">Your Access Codes:</p>
                      {monitoringRequests.filter(r => isMonitoringApprovedStatus(r.status) && r.access_code).map(r => (
                        <div key={r.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono font-bold text-blue-700">{r.access_code}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(r.access_code);
                              toast({ title: "Copied!", description: "Access code copied to clipboard" });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Quick Access Card */}
              <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
                <CardContent className="p-4">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <p className="text-sm text-cyan-700 font-medium mb-1">Live Monitoring</p>
                      <p className="text-xs text-cyan-600 mb-3">Access your cameras in real-time</p>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                      onClick={() => {
                        const code = monitoringRequests.find(
                          (r) => isMonitoringApprovedStatus(r.status) && r.access_code
                        )?.access_code;
                        navigate(
                          code
                            ? `/monitoring?access_code=${encodeURIComponent(String(code).trim())}`
                            : '/monitoring'
                        );
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open Monitoring Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-cyan-600" />
                      Site Monitoring Services
                    </CardTitle>
                    <CardDescription>Request camera monitoring for your construction sites</CardDescription>
                  </div>
                  <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                        <Camera className="h-4 w-4 mr-2" />
                        Request Monitoring
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0">
                      <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5 text-cyan-500" />
                          Request Site Monitoring
                        </DialogTitle>
                        <DialogDescription>
                          Fill in the details below to request camera monitoring services for your construction site.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Scrollable Form Content */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Project Name *</Label>
                          <Input
                            id="projectName"
                            placeholder="e.g., Residential Complex Phase 2"
                            value={monitoringRequest.projectName}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectLocation">Project Location *</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="projectLocation"
                              className="pl-10"
                              placeholder="e.g., Westlands, Nairobi"
                              value={monitoringRequest.projectLocation}
                              onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectLocation: e.target.value }))}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowMonitoringMap(true)}
                              title="Search on map"
                              className="absolute right-2 top-2 h-7 w-7"
                            >
                              <MapIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Monitoring Map Picker */}
                          {showMonitoringMap && (
                            <div className="mt-2 border border-blue-300 rounded-lg p-3 bg-white">
                              <MapLocationPicker
                                initialLocation={
                                  monitoringRequest.projectLocation
                                    ? undefined // Let user search or click on map
                                    : undefined
                                }
                                onLocationSelect={(location) => {
                                  setMonitoringRequest(prev => ({
                                    ...prev,
                                    projectLocation: location.address || location.county || ''
                                  }));
                                  setShowMonitoringMap(false);
                                  toast({
                                    title: '📍 Project Location Set!',
                                    description: location.county 
                                      ? `Location set to ${location.county}` 
                                      : 'GPS coordinates saved from map.'
                                  });
                                }}
                                onClose={() => setShowMonitoringMap(false)}
                                title="Select Project Location"
                                description="Search for an address or click on the map to set your project site location"
                              />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectDescription">Project Description</Label>
                          <Textarea
                            id="projectDescription"
                            placeholder="Describe your project and monitoring needs..."
                            value={monitoringRequest.projectDescription}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectDescription: e.target.value }))}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="preferredStartDate">Preferred Start Date</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="preferredStartDate"
                                type="date"
                                className="pl-10"
                                value={monitoringRequest.preferredStartDate}
                                onChange={(e) => setMonitoringRequest(prev => ({ ...prev, preferredStartDate: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="numberOfCameras">Number of Cameras</Label>
                            <Input
                              id="numberOfCameras"
                              type="number"
                              min="1"
                              max="20"
                              value={monitoringRequest.numberOfCameras}
                              onChange={(e) => setMonitoringRequest(prev => ({ ...prev, numberOfCameras: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="additionalNotes">Additional Notes</Label>
                          <Textarea
                            id="additionalNotes"
                            placeholder="Any specific requirements or concerns..."
                            value={monitoringRequest.additionalNotes}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, additionalNotes: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      {/* Fixed Footer */}
                      <DialogFooter className="border-t p-6 pt-4 bg-background">
                        <Button variant="outline" onClick={() => setMonitoringDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleMonitoringRequest}
                          disabled={submittingRequest}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500"
                        >
                          {submittingRequest ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Request
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-500 rounded-lg text-white">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cyan-800 mb-1">Professional Site Monitoring</h4>
                      <p className="text-sm text-cyan-700">
                        Get 24/7 camera surveillance for your construction sites. Our monitoring service includes HD cameras, 
                        real-time viewing, recording storage, and drone aerial surveys. Request monitoring and our team will 
                        contact you to set up the service.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monitoring Requests List */}
                {monitoringRequests.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">Your Monitoring Requests</h4>
                    {monitoringRequests.map((request) => {
                      const st = normMonitoringStatus(request.status);
                      return (
                      <div key={request.id} className={`border rounded-lg p-4 transition-colors ${
                        st === 'quoted' ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              st === 'completed' ? 'bg-purple-100 text-purple-600' :
                              isMonitoringApprovedStatus(request.status) ? 'bg-green-100 text-green-600' :
                              st === 'rejected' ? 'bg-red-100 text-red-600' :
                              st === 'quoted' ? 'bg-blue-100 text-blue-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              <Video className="h-5 w-5" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">{request.project_name}</h5>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.project_location}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Requested: {new Date(request.created_at).toLocaleDateString()}
                              </p>
                              {request.camera_count && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Cameras: {request.camera_count}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            st === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                            isMonitoringApprovedStatus(request.status) ? 'bg-green-100 text-green-700 border-green-300' :
                            st === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                            st === 'quoted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            'bg-amber-100 text-amber-700 border-amber-300'
                          }`}>
                            {st === 'quoted' ? '💰 Quote Received' :
                             isMonitoringApprovedStatus(request.status) ? '✅ Active' :
                             (request.status ? String(request.status).charAt(0).toUpperCase() + String(request.status).slice(1) : 'Status')}
                          </Badge>
                        </div>
                        
                        {/* Quote Section - Show when admin has sent a quote */}
                        {st === 'quoted' && request.quote_amount && (
                          <div className="mt-4 p-4 bg-white border-2 border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-semibold text-blue-800">📋 Quote from UjenziXform</h6>
                              {request.quote_valid_until && (
                                <span className="text-xs text-gray-500">
                                  Valid until: {new Date(request.quote_valid_until).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="text-center mb-4">
                              <p className="text-sm text-gray-600">Monthly Service Fee</p>
                              <p className="text-3xl font-bold text-blue-600">
                                KES {Number(request.quote_amount).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">per month</p>
                            </div>
                            {request.admin_notes && (
                              <p className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
                                <span className="font-medium">Note:</span> {request.admin_notes}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('monitoring_service_requests')
                                      .update({ status: 'approved' })
                                      .eq('id', request.id);
                                    if (error) throw error;
                                    toast({
                                      title: "Quote Accepted! 🎉",
                                      description: "Your monitoring service is now active. You can access your cameras.",
                                    });
                                    void refreshMonitoringRequests();
                                  } catch (error) {
                                    console.error('Error accepting quote:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to accept quote. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Quote
                              </Button>
                              <Button 
                                variant="outline"
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('monitoring_service_requests')
                                      .update({ status: 'rejected' })
                                      .eq('id', request.id);
                                    if (error) throw error;
                                    toast({
                                      title: "Quote Declined",
                                      description: "You can request a new quote anytime.",
                                    });
                                    void refreshMonitoringRequests();
                                  } catch (error) {
                                    console.error('Error rejecting quote:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to decline quote. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Approved - Show access info */}
                        {isMonitoringApprovedStatus(request.status) && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <h6 className="font-semibold text-green-800">Monitoring Service Active</h6>
                            </div>
                            <p className="text-sm text-green-700 mb-3">
                              Your cameras are set up and ready. Access your live feeds anytime.
                            </p>
                            
                            {/* Camera Assignment Info */}
                            {request.assigned_cameras && request.assigned_cameras.length > 0 && (
                              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                                <p className="text-xs text-gray-500 mb-1">Assigned Cameras</p>
                                <p className="font-bold text-lg text-green-700">
                                  {request.assigned_cameras.length} Camera{request.assigned_cameras.length > 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                            
                            {request.access_code && (
                              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                                <p className="text-xs text-gray-500">Your Access Code</p>
                                <p className="font-mono font-bold text-2xl text-green-700 tracking-wider">{request.access_code}</p>
                                <p className="text-xs text-gray-400 mt-1">Use this code on the Monitoring page to view your cameras</p>
                              </div>
                            )}
                            <Button 
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() =>
                                navigate(
                                  request.access_code
                                    ? `/monitoring?access_code=${encodeURIComponent(String(request.access_code).trim())}`
                                    : '/monitoring'
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Access Live Cameras
                            </Button>
                          </div>
                        )}
                        
                        {/* Pending - Waiting for admin */}
                        {st === 'pending' && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Waiting for admin to review and send quote...
                            </p>
                          </div>
                        )}
                        
                        {/* Rejected */}
                        {st === 'rejected' && request.admin_notes && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Reason:</span> {request.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 max-w-lg mx-auto">
                    <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No site monitoring requests for your account</p>
                    <p className="text-sm mb-3">
                      This tab lists only <span className="font-medium text-gray-700">your</span> camera / site
                      monitoring requests. The admin panel shows <span className="font-medium text-gray-700">all</span>{" "}
                      builders’ requests — a large total there does not mean they belong to you.
                    </p>
                    <p className="text-sm mb-4 text-gray-600">
                      Supplier <span className="font-medium">material quotes</span> live under the{" "}
                      <span className="font-medium">Quotes</span> tab, not here.
                    </p>
                    <p className="text-xs text-gray-400">
                      Requests are matched to your login by user id or contact email. If something is missing after you
                      submitted it, ask support to verify the row in Supabase.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab - Video Marketing */}
          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-purple-600" />
                      Video Portfolio
                    </CardTitle>
                    <CardDescription>
                      Upload project videos to showcase your work and attract more clients
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg text-white">
                      <Play className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-1">Showcase Your Projects</h4>
                      <p className="text-sm text-purple-700">
                        Upload videos of your completed projects to build trust with potential clients.
                        Videos with good engagement (likes, comments) are featured on the Builders page!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Video Portfolio Component */}
                <BuilderDashboardTabSuspense>
                  <LazyBuilderVideoPortfolio builderId={user?.id || ''} isOwner={true} />
                </BuilderDashboardTabSuspense>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Order History Tab */}
          <TabsContent value="order-history">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View all your orders and download invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {user && (
                  <BuilderDashboardTabSuspense>
                    <LazyOrderHistory userId={user.id} userRole="professional_builder" />
                  </BuilderDashboardTabSuspense>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="my-analytics">
            <div className="space-y-6">
              {user && (
                <BuilderDashboardTabSuspense>
                  <LazyUserAnalyticsDashboard userId={user.id} userRole="professional_builder" />
                </BuilderDashboardTabSuspense>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Ordering context — benefits vary by supplier; avoid implying guaranteed perks */}
        <Card className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-3 min-w-0">
                <h3 className="text-xl font-bold">Ordering as a professional builder</h3>
                <p className="text-sm text-white/90 max-w-2xl leading-relaxed">
                  Volume pricing, payment terms, delivery speed, and support levels depend on each supplier and your
                  relationship with them — not something we guarantee site-wide. Ask when you quote or order, or see{" "}
                  <Link to="/contact" className="font-medium underline underline-offset-2 hover:text-white">
                    Contact
                  </Link>{" "}
                  for how we can help.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white border-0">Volume pricing (where offered)</Badge>
                  <Badge className="bg-white/20 text-white border-0">Payment terms (by agreement)</Badge>
                  <Badge className="bg-white/20 text-white border-0">Delivery options (per supplier)</Badge>
                  <Badge className="bg-white/20 text-white border-0">Support via Contact & in-app</Badge>
                </div>
              </div>
              <Link to="/suppliers?from=dashboard" className="shrink-0">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 w-full md:w-auto">
                  Browse suppliers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />

      {/* Profile View Dialog */}
      <ProfileViewDialog
        isOpen={showProfileView}
        onClose={() => setShowProfileView(false)}
        onEditProfile={() => setShowProfileEdit(true)}
        onExitDashboard={() => navigate('/home?browse=1')}
      />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          // Refresh profile data after save
          checkAuth();
        }}
        userRole="professional_builder"
      />
    </div>
  );
};

export default ProfessionalBuilderDashboardPage;

