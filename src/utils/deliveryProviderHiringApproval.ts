import { supabase } from '@/integrations/supabase/client';

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

/**
 * Hiring Manager gate — mirrors DB function is_delivery_provider_hiring_approved.
 */
export async function getDeliveryHiringApprovalState(
  userId: string
): Promise<DeliveryHiringApprovalState> {
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

  const rawStatus = (registration?.status || '').trim().toLowerCase();
  if (rawStatus === 'approved') {
    return { canAcceptDeliveryOrders: true, status: 'approved', message: '' };
  }
  if (registration && rawStatus) {
    const status = (['pending', 'rejected', 'under_review'].includes(rawStatus)
      ? rawStatus
      : 'pending') as DeliveryHiringStatus;
    return {
      canAcceptDeliveryOrders: false,
      status,
      message: STATUS_MESSAGES[status],
    };
  }

  const { data: provider, error: dpError } = await supabase
    .from('delivery_providers')
    .select('is_verified, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (dpError) {
    console.warn('getDeliveryHiringApprovalState: delivery_providers lookup failed', dpError);
  }

  if (provider?.is_verified && provider?.is_active) {
    return { canAcceptDeliveryOrders: true, status: 'approved', message: '' };
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
