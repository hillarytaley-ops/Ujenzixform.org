/**
 * ============================================================================
 * useStaffPermissions Hook
 * ============================================================================
 * 
 * Hook to check staff member permissions for the admin dashboard.
 * Fetches the staff member's role and provides permission checking functions.
 * 
 * @author MradiPro Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  STAFF_ROLES, 
  getStaffRole, 
  canAccessTab, 
  getAccessibleTabs,
  hasPermission,
  AdminTab,
  StaffRole
} from '@/config/staffPermissions';

interface StaffPermissionsState {
  loading: boolean;
  staffId: string | null;
  staffEmail: string | null;
  staffName: string | null;
  staffRole: string | null;
  roleDetails: StaffRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  accessibleTabs: AdminTab[];
  error: string | null;
}

interface StaffPermissionsReturn extends StaffPermissionsState {
  canAccessTab: (tab: AdminTab) => boolean;
  canManageStaff: boolean;
  canExportData: boolean;
  canDeleteRecords: boolean;
  canApproveRegistrations: boolean;
  canAccessSensitiveData: boolean;
  refreshPermissions: () => Promise<void>;
}

export function useStaffPermissions(): StaffPermissionsReturn {
  // Check localStorage synchronously for admin auth - this provides immediate access
  const adminAuth = typeof window !== 'undefined' && localStorage.getItem('admin_authenticated') === 'true';
  const adminEmail = typeof window !== 'undefined' ? localStorage.getItem('admin_email') : null;
  const adminLoginTime = typeof window !== 'undefined' ? localStorage.getItem('admin_login_time') : null;
  const storedStaffRole = typeof window !== 'undefined' ? localStorage.getItem('admin_staff_role') : null;
  const storedStaffName = typeof window !== 'undefined' ? localStorage.getItem('admin_staff_name') : null;
  
  // ========== TEST MODE ==========
  // Add ?test_role=logistics_officer (or other role) to URL to simulate different staff roles
  // Remove this in production!
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const testRole = urlParams?.get('test_role');
  
  if (testRole && STAFF_ROLES[testRole]) {
    const simulatedRole = STAFF_ROLES[testRole];
    console.log('🧪 TEST MODE: Simulating role:', testRole, '- Tabs:', simulatedRole.allowedTabs.length);
    
    const [state] = useState<StaffPermissionsState>({
      loading: false,
      staffId: 'test-user',
      staffEmail: 'test@example.com',
      staffName: simulatedRole.name,
      staffRole: testRole,
      roleDetails: simulatedRole,
      isAdmin: ['admin', 'super_admin'].includes(testRole),
      isSuperAdmin: testRole === 'super_admin',
      accessibleTabs: simulatedRole.allowedTabs as AdminTab[],
      error: null
    });
    
    const checkTabAccess = (tab: AdminTab): boolean => {
      if (['admin', 'super_admin'].includes(testRole)) return true;
      return simulatedRole.allowedTabs.includes(tab);
    };
    
    return {
      ...state,
      canAccessTab: checkTabAccess,
      canManageStaff: simulatedRole.canManageStaff,
      canExportData: simulatedRole.canExportData,
      canDeleteRecords: simulatedRole.canDeleteRecords,
      canApproveRegistrations: simulatedRole.canApproveRegistrations,
      canAccessSensitiveData: simulatedRole.canAccessSensitiveData,
      refreshPermissions: async () => {}
    };
  }
  // ========== END TEST MODE ==========
  
  // Determine if we have a valid admin session (for initial state)
  const hasValidAdminSession = adminAuth && adminEmail && adminLoginTime && 
    (Date.now() - parseInt(adminLoginTime)) < 24 * 60 * 60 * 1000;
  
  // Get the staff role from localStorage - this determines their permissions
  // If no specific role is stored, default to 'admin' for backwards compatibility
  const effectiveRole = storedStaffRole || 'admin';
  const roleDetails = getStaffRole(effectiveRole) || STAFF_ROLES.admin;
  const isFullAdmin = ['admin', 'super_admin', 'administrator'].includes(effectiveRole);
  
  const initialState: StaffPermissionsState = hasValidAdminSession ? {
    loading: false, // Don't show loading for admin
    staffId: null,
    staffEmail: adminEmail,
    staffName: storedStaffName || 'Staff Member',
    staffRole: effectiveRole,
    roleDetails: roleDetails,
    isAdmin: isFullAdmin,
    isSuperAdmin: effectiveRole === 'super_admin',
    accessibleTabs: roleDetails.allowedTabs as AdminTab[],
    error: null
  } : {
    loading: true,
    staffId: null,
    staffEmail: null,
    staffName: null,
    staffRole: null,
    roleDetails: null,
    isAdmin: false,
    isSuperAdmin: false,
    accessibleTabs: [],
    error: null
  };

  const [state, setState] = useState<StaffPermissionsState>(initialState);

  const fetchStaffPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Check for admin session first (admin login uses localStorage)
      const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
      const adminEmail = localStorage.getItem('admin_email');
      const adminLoginTime = localStorage.getItem('admin_login_time');
      
      // Validate admin session (24 hour expiry)
      if (adminAuth && adminEmail && adminLoginTime) {
        const sessionAge = Date.now() - parseInt(adminLoginTime);
        if (sessionAge < 24 * 60 * 60 * 1000) {
          // Valid admin session - use the stored staff role from localStorage
          const storedRole = localStorage.getItem('admin_staff_role') || 'admin';
          const storedName = localStorage.getItem('admin_staff_name') || 'Staff Member';
          
          console.log('🔐 Using stored staff role:', storedRole, 'Name:', storedName);
          
          // Get role details from config
          const roleDetails = getStaffRole(storedRole) || STAFF_ROLES.admin;
          const isFullAdmin = ['admin', 'super_admin', 'administrator'].includes(storedRole);
          
          // Try to get additional info from database if user has Supabase session
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Check admin_staff table for specific role (to get latest info)
            const { data: staffData } = await (supabase as any)
              .from('admin_staff')
              .select('id, email, full_name, role, status')
              .eq('email', adminEmail.toLowerCase())
              .eq('status', 'active')
              .maybeSingle();
            
            if (staffData) {
              const dbRole = getStaffRole(staffData.role) || STAFF_ROLES.admin;
              const dbIsAdmin = ['admin', 'super_admin', 'administrator'].includes(staffData.role);
              
              console.log('🔐 Found staff in DB:', staffData.full_name, 'Role:', staffData.role);
              
              setState({
                loading: false,
                staffId: staffData.id,
                staffEmail: staffData.email,
                staffName: staffData.full_name,
                staffRole: staffData.role,
                roleDetails: dbRole,
                isAdmin: dbIsAdmin,
                isSuperAdmin: staffData.role === 'super_admin',
                accessibleTabs: dbRole.allowedTabs as AdminTab[],
                error: null
              });
              return;
            }
          }
          
          // Use localStorage role if no DB record found
          setState({
            loading: false,
            staffId: null,
            staffEmail: adminEmail,
            staffName: storedName,
            staffRole: storedRole,
            roleDetails: roleDetails,
            isAdmin: isFullAdmin,
            isSuperAdmin: storedRole === 'super_admin',
            accessibleTabs: roleDetails.allowedTabs as AdminTab[],
            error: null
          });
          return;
        }
      }
      
      // No valid admin session - check Supabase user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState({
          loading: false,
          staffId: null,
          staffEmail: null,
          staffName: null,
          staffRole: null,
          roleDetails: null,
          isAdmin: false,
          isSuperAdmin: false,
          accessibleTabs: [],
          error: 'No authenticated user'
        });
        return;
      }
      
      // Check admin_staff table
      const { data: staffData, error: staffError } = await (supabase as any)
        .from('admin_staff')
        .select('id, email, full_name, role, status')
        .eq('id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (staffError) {
        console.error('Error fetching staff data:', staffError);
        // Table might not exist - check user_roles for admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (roleData?.role === 'admin') {
          const adminRole = STAFF_ROLES.admin;
          setState({
            loading: false,
            staffId: user.id,
            staffEmail: user.email || null,
            staffName: 'Admin',
            staffRole: 'admin',
            roleDetails: adminRole,
            isAdmin: true,
            isSuperAdmin: false,
            accessibleTabs: adminRole.allowedTabs as AdminTab[],
            error: null
          });
          return;
        }
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Not a staff member'
        }));
        return;
      }
      
      if (!staffData) {
        setState({
          loading: false,
          staffId: null,
          staffEmail: user.email || null,
          staffName: null,
          staffRole: null,
          roleDetails: null,
          isAdmin: false,
          isSuperAdmin: false,
          accessibleTabs: [],
          error: 'No staff record found'
        });
        return;
      }
      
      // Staff found - set permissions
      const role = getStaffRole(staffData.role) || STAFF_ROLES.viewer;
      setState({
        loading: false,
        staffId: staffData.id,
        staffEmail: staffData.email,
        staffName: staffData.full_name,
        staffRole: staffData.role,
        roleDetails: role,
        isAdmin: ['admin', 'super_admin'].includes(staffData.role),
        isSuperAdmin: staffData.role === 'super_admin',
        accessibleTabs: role.allowedTabs as AdminTab[],
        error: null
      });
      
    } catch (err) {
      console.error('Error in useStaffPermissions:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error checking permissions'
      }));
    }
  }, []);

  useEffect(() => {
    // Log only once on mount
    console.log('🔐 Staff permissions init:', { 
      effectiveRole, 
      storedStaffRole, 
      isFullAdmin,
      allowedTabs: roleDetails.allowedTabs.length 
    });
    fetchStaffPermissions();
  }, []); // Empty deps - only run once on mount

  // Permission check functions
  const checkTabAccess = useCallback((tab: AdminTab): boolean => {
    // If still loading, check localStorage directly for staff role
    if (state.loading) {
      const storedRole = localStorage.getItem('admin_staff_role');
      if (storedRole) {
        // Check if it's a full admin role
        if (['admin', 'super_admin', 'administrator'].includes(storedRole)) {
          return true;
        }
        // Otherwise, check the role's allowed tabs
        const roleConfig = STAFF_ROLES[storedRole];
        if (roleConfig) {
          return roleConfig.allowedTabs.includes(tab);
        }
      }
      // Fallback: if admin_authenticated but no role, deny access during loading
      return false;
    }
    if (state.isAdmin || state.isSuperAdmin) return true;
    if (!state.staffRole) return false;
    return state.accessibleTabs.includes(tab);
  }, [state.loading, state.isAdmin, state.isSuperAdmin, state.staffRole, state.accessibleTabs]);

  const canManageStaff = state.roleDetails?.canManageStaff ?? false;
  const canExportData = state.roleDetails?.canExportData ?? false;
  const canDeleteRecords = state.roleDetails?.canDeleteRecords ?? false;
  const canApproveRegistrations = state.roleDetails?.canApproveRegistrations ?? false;
  const canAccessSensitiveData = state.roleDetails?.canAccessSensitiveData ?? false;

  return {
    ...state,
    canAccessTab: checkTabAccess,
    canManageStaff,
    canExportData,
    canDeleteRecords,
    canApproveRegistrations,
    canAccessSensitiveData,
    refreshPermissions: fetchStaffPermissions
  };
}

export default useStaffPermissions;


