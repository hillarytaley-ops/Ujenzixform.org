import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurePaymentAccess {
  canAccessPayments: boolean;
  isAdmin: boolean;
  error?: string;
}

export const useSecurePayments = () => {
  const [access, setAccess] = useState<SecurePaymentAccess>({
    canAccessPayments: false,
    isAdmin: false
  });
  const { toast } = useToast();

  const checkPaymentAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAccess({ canAccessPayments: false, isAdmin: false, error: 'Not authenticated' });
        return false;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdmin = !!roleData;
      
      setAccess({
        canAccessPayments: isAdmin,
        isAdmin,
        error: isAdmin ? undefined : 'Payment access restricted to administrators'
      });

      if (!isAdmin) {
        toast({
          title: "Access Restricted",
          description: "Payment features are only available to administrators.",
          variant: "destructive"
        });
      }

      return isAdmin;
    } catch (error) {
      console.error('Error checking payment access:', error);
      setAccess({ canAccessPayments: false, isAdmin: false, error: 'Access check failed' });
      return false;
    }
  }, [toast]);

  const getSecurePaymentContact = useCallback(async (paymentId: string) => {
    const hasAccess = await checkPaymentAccess();
    if (!hasAccess) {
      toast({
        title: "Access Restricted",
        description: "Payment contact access requires admin privileges or ownership",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_payment_contact_secure', {
        target_payment_id: paymentId,
        access_justification: 'payment_contact_request'
      });
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const result = data[0];
      if (!result.access_granted) {
        toast({
          title: "Access Denied",
          description: result.access_reason,
          variant: "destructive"
        });
        return null;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to fetch secure payment contact:', error);
      toast({
        title: "Error",
        description: "Could not access payment contact information",
        variant: "destructive"
      });
      return null;
    }
  }, [checkPaymentAccess, toast]);

  const getSecurePaymentPreferences = useCallback(async (userId: string) => {
    const hasAccess = await checkPaymentAccess();
    if (!hasAccess) return [];

    try {
      const { data, error } = await supabase.rpc('get_payment_preferences_secure', { 
        user_uuid: userId 
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch secure payment preferences:', error);
      return [];
    }
  }, [checkPaymentAccess]);

  const logPaymentAccess = useCallback(async (paymentId: string, accessType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('payment_access_audit')
        .insert({
          user_id: user.id,
          payment_id: paymentId,
          access_type: accessType,
          access_granted: access.canAccessPayments,
          security_risk_level: access.canAccessPayments ? 'low' : 'critical'
        });
    } catch (error) {
      console.error('Failed to log payment access:', error);
    }
  }, [access.canAccessPayments]);

  return {
    access,
    checkPaymentAccess,
    getSecurePaymentContact,
    getSecurePaymentPreferences,
    logPaymentAccess
  };
};