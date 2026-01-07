/**
 * ============================================================================
 * Role Verification Utility - SECURITY CRITICAL
 * ============================================================================
 * 
 * ⚠️  DO NOT MODIFY WITHOUT SECURITY REVIEW  ⚠️
 * 
 * This utility provides centralized role verification functions that ALWAYS
 * check the database. NEVER trust localStorage alone.
 * 
 * @author MradiPro Security Team
 * @version 1.0.0
 * @lastModified December 2025
 */

import { supabase } from '@/integrations/supabase/client';

// Valid roles in the system
export type UserRole = 'admin' | 'supplier' | 'builder' | 'delivery' | null;

export interface RoleCheckResult {
  hasRole: boolean;
  role: UserRole;
  userId: string | null;
  error: string | null;
}

/**
 * Verify user's role from the DATABASE (source of truth)
 * This function should be used instead of checking localStorage directly
 * 
 * @returns RoleCheckResult with the verified role from database
 */
export async function verifyUserRole(): Promise<RoleCheckResult> {
  try {
    // Get current user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('🔐 verifyUserRole: No authenticated user');
      clearRoleFromStorage();
      return {
        hasRole: false,
        role: null,
        userId: null,
        error: 'No authenticated user'
      };
    }

    // ALWAYS query database for role - this is the ONLY source of truth
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError) {
      console.error('🔐 verifyUserRole: Database error:', roleError.message);
      clearRoleFromStorage();
      return {
        hasRole: false,
        role: null,
        userId: user.id,
        error: roleError.message
      };
    }

    const dbRole = (roleData?.role as UserRole) || null;
    console.log('🔐 verifyUserRole: Database role =', dbRole);

    if (!dbRole) {
      // No role in database - clear any fake localStorage values
      clearRoleFromStorage();
      return {
        hasRole: false,
        role: null,
        userId: user.id,
        error: null
      };
    }

    // Role found - sync localStorage with database
    syncRoleToStorage(dbRole, user.id);
    
    return {
      hasRole: true,
      role: dbRole,
      userId: user.id,
      error: null
    };

  } catch (err) {
    console.error('🔐 verifyUserRole: Exception:', err);
    clearRoleFromStorage();
    return {
      hasRole: false,
      role: null,
      userId: null,
      error: 'Exception during role verification'
    };
  }
}

/**
 * Check if user has one of the allowed roles
 * ALWAYS verifies against database
 * 
 * @param allowedRoles - Array of roles that are permitted
 * @returns true if user has one of the allowed roles
 */
export async function hasAllowedRole(allowedRoles: UserRole[]): Promise<boolean> {
  const result = await verifyUserRole();
  
  if (!result.hasRole || !result.role) {
    return false;
  }
  
  // Admin can access everything
  if (result.role === 'admin') {
    return true;
  }
  
  return allowedRoles.includes(result.role);
}

/**
 * Check if user is a builder (any type)
 */
export async function isBuilder(): Promise<boolean> {
  const result = await verifyUserRole();
  return result.role === 'builder' || result.role === 'admin';
}

/**
 * Check if user is a supplier
 */
export async function isSupplier(): Promise<boolean> {
  const result = await verifyUserRole();
  return result.role === 'supplier' || result.role === 'admin';
}

/**
 * Check if user is a delivery provider
 */
export async function isDeliveryProvider(): Promise<boolean> {
  const result = await verifyUserRole();
  return result.role === 'delivery' || result.role === 'admin';
}

/**
 * Check if user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const result = await verifyUserRole();
  return result.role === 'admin';
}

/**
 * Clear role data from localStorage
 * Used when user has no valid role in database
 */
export function clearRoleFromStorage(): void {
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_role_id');
  console.log('🔐 Cleared role from localStorage');
}

/**
 * Sync role to localStorage (only after database verification)
 * This should ONLY be called after verifying the role from the database
 */
export function syncRoleToStorage(role: string, userId: string): void {
  localStorage.setItem('user_role', role);
  localStorage.setItem('user_role_id', userId);
  console.log('🔐 Synced role to localStorage:', role);
}

/**
 * Get role from localStorage (for UI display only, NOT for access control)
 * ⚠️ NEVER use this for access control decisions - always verify with database
 */
export function getRoleFromStorage(): { role: string | null; userId: string | null } {
  return {
    role: localStorage.getItem('user_role'),
    userId: localStorage.getItem('user_role_id')
  };
}

/**
 * Security assertion - throws if role check fails
 * Use this in critical paths where you want to fail fast
 */
export async function assertRole(allowedRoles: UserRole[]): Promise<UserRole> {
  const result = await verifyUserRole();
  
  if (!result.hasRole || !result.role) {
    throw new Error('SECURITY: User has no role');
  }
  
  if (result.role !== 'admin' && !allowedRoles.includes(result.role)) {
    throw new Error(`SECURITY: Role ${result.role} is not allowed. Required: ${allowedRoles.join(', ')}`);
  }
  
  return result.role;
}









