import { supabase } from '@/integrations/supabase/client';

/** Logged-in delivery providers who are not yet approved browse like guests. */
export const DELIVERY_PROVIDER_PUBLIC_HOME = '/home?browse=1';

export const DELIVERY_PROVIDER_ROLES = ['delivery', 'delivery_provider'] as const;

export function isDeliveryProviderRole(role: string | null | undefined): boolean {
  return !!role && (DELIVERY_PROVIDER_ROLES as readonly string[]).includes(role);
}

export type DeliveryHiringStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'under_review'
  | 'none';

export interface DeliveryHiringApprovalState {
  canAcceptDeliveryOrders: boolean;
  status: DeliveryHiringStatus;
  message: string;
}

const STATUS_MESSAGES: Record<DeliveryHiringStatus, string> = {
  approved: '',
  pending:
    'Your application is pending admin or Hiring Manager review. You cannot accept new delivery jobs until you are approved.',
  rejected:
    'Your delivery provider application was not approved. Contact support if you believe this is an error.',
  under_review:
    'Your application is under review. You cannot accept new delivery jobs until admin or Hiring Manager approval.',
  none:
    'Complete your delivery provider registration and wait for admin approval before accepting delivery jobs.',
};

function statusFromRegistration(raw: string): DeliveryHiringStatus {
  const s = raw.trim().toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'under_review') return 'under_review';
  if (s) return 'pending';
  return 'none';
}

async function fetchDeliveryRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('getDeliveryHiringApprovalState: user_roles lookup failed', error);
    return null;
  }

  return data?.role ?? null;
}

/**
 * Anyone with a delivery role in user_roles may use the dashboard and accept jobs.
 * Applicants without that role yet see pending/none (registration pipeline only).
 */
export async function getDeliveryHiringApprovalState(
  userId: string
): Promise<DeliveryHiringApprovalState> {
  const role = await fetchDeliveryRole(userId);
  if (isDeliveryProviderRole(role)) {
    return { canAcceptDeliveryOrders: true, status: 'approved', message: '' };
  }

  let rpcApproved = false;
  try {
    const { data, error } = await supabase.rpc('is_delivery_provider_hiring_approved', {
      p_user_id: userId,
    });
    if (!error && data === true) {
      rpcApproved = true;
    }
  } catch {
    /* RPC optional until migration applied */
  }

  if (rpcApproved) {
    return { canAcceptDeliveryOrders: true, status: 'approved', message: '' };
  }

  const { data: registration, error: regError } = await supabase
    .from('delivery_provider_registrations')
    .select('status')
    .eq('auth_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (regError) {
    console.warn('getDeliveryHiringApprovalState: registration lookup failed', regError);
  }

  const regStatus = statusFromRegistration(String(registration?.status ?? ''));

  if (regStatus === 'approved') {
    return { canAcceptDeliveryOrders: true, status: 'approved', message: '' };
  }

  if (registration && regStatus !== 'none') {
    return {
      canAcceptDeliveryOrders: false,
      status: regStatus,
      message: STATUS_MESSAGES[regStatus],
    };
  }

  return {
    canAcceptDeliveryOrders: false,
    status: 'none',
    message: STATUS_MESSAGES.none,
  };
}

export async function assertDeliveryProviderHiringApproved(userId: string): Promise<void> {
  const state = await getDeliveryHiringApprovalState(userId);
  if (!state.canAcceptDeliveryOrders) {
    throw new Error(state.message || STATUS_MESSAGES.pending);
  }
}

/** Post-login destination for delivery providers. */
export async function resolveDeliveryProviderDashboardPath(
  userId: string,
  role?: string | null
): Promise<string> {
  if (role === 'admin' || role === 'super_admin') {
    return '/delivery-dashboard';
  }
  if (isDeliveryProviderRole(role)) {
    return '/delivery-dashboard';
  }
  const state = await getDeliveryHiringApprovalState(userId);
  return state.canAcceptDeliveryOrders ? '/delivery-dashboard' : DELIVERY_PROVIDER_PUBLIC_HOME;
}
