/**
 * Verified role from AuthContext (database-backed). Never reads localStorage for gating.
 */
import { useAuth } from '@/contexts/AuthContext';

export function useVerifiedRole() {
  const { user, userRole, loading, refreshUserRole } = useAuth();

  return {
    user,
    userId: user?.id ?? null,
    role: userRole,
    loading,
    refreshUserRole,
    isAuthenticated: !!user,
    isAdmin: userRole === 'admin' || userRole === 'super_admin',
    isSupplier: userRole === 'supplier',
    isBuilder:
      userRole === 'builder' ||
      userRole === 'professional_builder' ||
      userRole === 'private_client',
    isDelivery: userRole === 'delivery' || userRole === 'delivery_provider',
  };
}

export default useVerifiedRole;
