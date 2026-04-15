/**
 * Stale-while-revalidate for dashboard KPIs: show last tab session numbers immediately,
 * then replace when fresh REST/Supabase data arrives. sessionStorage clears when the tab closes.
 */

const ADMIN_STATS_KEY = 'ujx_admin_dashboard_stats_v1';
const SUPPLIER_STATS_KEY_PREFIX = 'ujx_supplier_dashboard_stats_v1:';

/** Max age before we ignore cache (still overwritten on first successful fetch). */
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

type Timestamped<T> = { savedAt: number; payload: T };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export type AdminOverviewStatsCache = {
  totalUsers: number;
  totalBuilders: number;
  totalSuppliers: number;
  totalDelivery: number;
  pendingRegistrations: number;
  activeToday: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  totalDeliveryRequests: number;
  pendingDeliveryRequests: number;
};

const ADMIN_STATS_ZERO: AdminOverviewStatsCache = {
  totalUsers: 0,
  totalBuilders: 0,
  totalSuppliers: 0,
  totalDelivery: 0,
  pendingRegistrations: 0,
  activeToday: 0,
  totalFeedback: 0,
  positiveFeedback: 0,
  negativeFeedback: 0,
  totalOrders: 0,
  pendingOrders: 0,
  confirmedOrders: 0,
  totalDeliveryRequests: 0,
  pendingDeliveryRequests: 0,
};

function isFresh(savedAt: number): boolean {
  return Number.isFinite(savedAt) && Date.now() - savedAt <= MAX_AGE_MS;
}

/** Last known admin overview counters (same for all admins on this origin). */
export function readAdminOverviewStatsFromSession(): AdminOverviewStatsCache | null {
  if (typeof sessionStorage === 'undefined') return null;
  const row = safeParse<Timestamped<Partial<AdminOverviewStatsCache>>>(sessionStorage.getItem(ADMIN_STATS_KEY));
  if (!row?.payload || !isFresh(row.savedAt)) {
    try {
      sessionStorage.removeItem(ADMIN_STATS_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  return { ...ADMIN_STATS_ZERO, ...row.payload };
}

export function writeAdminOverviewStatsToSession(stats: AdminOverviewStatsCache): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const payload: Timestamped<AdminOverviewStatsCache> = {
      savedAt: Date.now(),
      payload: { ...ADMIN_STATS_ZERO, ...stats },
    };
    sessionStorage.setItem(ADMIN_STATS_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export type SupplierOverviewStatsCache = {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageRating: number;
};

const SUPPLIER_STATS_ZERO: SupplierOverviewStatsCache = {
  totalProducts: 0,
  totalOrders: 0,
  pendingOrders: 0,
  totalRevenue: 0,
  totalCustomers: 0,
  averageRating: 0,
};

export function readSupplierOverviewStatsFromSession(userId: string): SupplierOverviewStatsCache | null {
  if (!userId || typeof sessionStorage === 'undefined') return null;
  const key = `${SUPPLIER_STATS_KEY_PREFIX}${userId}`;
  const row = safeParse<Timestamped<Partial<SupplierOverviewStatsCache>>>(sessionStorage.getItem(key));
  if (!row?.payload || !isFresh(row.savedAt)) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
  return { ...SUPPLIER_STATS_ZERO, ...row.payload };
}

export function writeSupplierOverviewStatsToSession(userId: string, stats: SupplierOverviewStatsCache): void {
  if (!userId || typeof sessionStorage === 'undefined') return;
  try {
    const key = `${SUPPLIER_STATS_KEY_PREFIX}${userId}`;
    const payload: Timestamped<SupplierOverviewStatsCache> = {
      savedAt: Date.now(),
      payload: { ...SUPPLIER_STATS_ZERO, ...stats },
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
