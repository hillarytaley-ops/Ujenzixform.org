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
    'Your application is pending admin or Hiring Manager review. You cannot access the delivery dashboard until you are approved.',
  rejected:
    'Your delivery provider application was not approved. Contact support if you believe this is an error.',
  under_review:
    'Your application is under review. You cannot access the delivery dashboard until admin or Hiring Manager approval.',
  none:
    'Complete your delivery provider registration at ujenzixform.org and wait for admin or Hiring Manager approval before using the dashboard.',
};

function statusFromRegistration(raw: string): DeliveryHiringStatus {
  const s = raw.trim().toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'under_review') return 'under_review';
  if (s) return 'pending';
  return 'none';
}

/**
 * Hiring Manager gate — uses DB RPC is_delivery_provider_hiring_approved (matches RLS/enforcement).
 */
export async function getDeliveryHiringApprovalState(
  userId: string
): Promise<DeliveryHiringApprovalState> {
  let hiringApproved = false;
  try {
    const { data, error } = await supabase.rpc('is_delivery_provider_hiring_approved', {
      p_user_id: userId,
    });
    if (error) {
      console.warn('getDeliveryHiringApprovalState: RPC failed', error.message);
    } else {
      hiringApproved = data === true;
    }
  } catch (e) {
    console.warn('getDeliveryHiringApprovalState: RPC error', e);
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

  if (hiringApproved) {
    return { canAcceptDeliveryOrders: true, status: 'approved', message: '' };
  }

  if (registration && regStatus !== 'none') {
    return {
      canAcceptDeliveryOrders: false,
      status: regStatus === 'approved' ? 'pending' : regStatus,
      message: STATUS_MESSAGES[regStatus === 'approved' ? 'pending' : regStatus],
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
