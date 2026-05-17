import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDeliveryHiringApprovalState,
  isDeliveryProviderRole,
  type DeliveryHiringApprovalState,
} from '@/utils/deliveryProviderHiringApproval';

export function useDeliveryProviderHiringApproval() {
  const { user, userRole } = useAuth();
  const [state, setState] = useState<{
    loading: boolean;
    canAcceptDeliveryOrders: boolean;
    hiringState: DeliveryHiringApprovalState | null;
  }>({
    loading: true,
    canAcceptDeliveryOrders: false,
    hiringState: null,
  });

  useEffect(() => {
    if (!user?.id || !isDeliveryProviderRole(userRole)) {
      setState({
        loading: false,
        canAcceptDeliveryOrders: true,
        hiringState: null,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    void getDeliveryHiringApprovalState(user.id).then((hiringState) => {
      if (cancelled) return;
      setState({
        loading: false,
        canAcceptDeliveryOrders: hiringState.canAcceptDeliveryOrders,
        hiringState,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, userRole]);

  const isPendingDeliveryProvider =
    isDeliveryProviderRole(userRole) && !state.loading && !state.canAcceptDeliveryOrders;

  return {
    loading: state.loading,
    canAcceptDeliveryOrders: state.canAcceptDeliveryOrders,
    hiringState: state.hiringState,
    isPendingDeliveryProvider,
  };
}
