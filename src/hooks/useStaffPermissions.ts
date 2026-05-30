/**
 * ============================================================================
 * useStaffPermissions Hook
 * ============================================================================
 * 
 * Hook to check staff member permissions for the admin dashboard.
 * Fetches the staff member's role and provides permission checking functions.
 * 
 * @author UjenziXform Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  STAFF_ROLES, 
  canStaffAccessDashboardTab,
  buildStaffPermissionView,
  CANONICAL_SUPER_ADMIN_EMAIL,
  AdminTab,
  StaffRole
} from '@/config/staffPermissions';
import { readPersistedAuthUserSync } from "@/utils/supabaseAccessToken";
import { allowStaffRoleTestMode } from "@/utils/securityMode";

// Module-level flags to only log once across all hook instances
let hasLoggedInit = false;
let hasLoggedStoredRole = false;
let hasLoggedDbRole = false;

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
  
  // ========== TEST MODE (dev only) ==========
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const testRole = allowStaffRoleTestMode() ? urlParams?.get('test_role') : null;
  
  if (testRole && STAFF_ROLES[testRole]) {
    const simulatedRole = STAFF_ROLES[testRole];
    const testEmail =
      testRole === "super_admin" ? CANONICAL_SUPER_ADMIN_EMAIL : "test@example.com";
    const v = buildStaffPermissionView(testRole, testEmail);
    console.log('🧪 TEST MODE: Simulating role:', testRole, '- Tabs:', v.accessibleTabs.length);
    
    const [state] = useState<StaffPermissionsState>({
      loading: false,
      staffId: 'test-user',
      staffEmail: testEmail,
      staffName: simulatedRole.name,
      staffRole: testRole,
      roleDetails: v.roleDetails,
      isAdmin: v.isAdmin,
      isSuperAdmin: v.isSuperAdmin,
      accessibleTabs: v.accessibleTabs,
      error: null
    });
    
    const checkTabAccess = (tab: AdminTab): boolean =>
      canStaffAccessDashboardTab(testRole, tab, testEmail);
    
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
  const rawStoredRole = storedStaffRole || 'admin';
  const initView = buildStaffPermissionView(rawStoredRole, adminEmail);
  
  const initialState: StaffPermissionsState = hasValidAdminSession ? {
    loading: false, // Don't show loading for admin
    staffId: null,
    staffEmail: adminEmail,
    staffName: storedStaffName || 'Staff Member',
    staffRole: rawStoredRole,
    roleDetails: initView.roleDetails,
    isAdmin: initView.isAdmin,
    isSuperAdmin: initView.isSuperAdmin,
    accessibleTabs: initView.accessibleTabs,
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
          
          if (!hasLoggedStoredRole) {
            console.log('🔐 Using stored staff role:', storedRole, 'Name:', storedName);
            hasLoggedStoredRole = true;
          }
          
          const v = buildStaffPermissionView(storedRole, adminEmail);
          
          // FAST PATH: Set state immediately with localStorage data
          // Don't wait for Supabase - this prevents the loading screen from hanging
          setState({
            loading: false,
            staffId: null,
            staffEmail: adminEmail,
            staffName: storedName,
            staffRole: storedRole,
            roleDetails: v.roleDetails,
            isAdmin: v.isAdmin,
            isSuperAdmin: v.isSuperAdmin,
            accessibleTabs: v.accessibleTabs,
            error: null
          });
          
          // Try to get additional info from database in background (with timeout)
          // This is optional - localStorage data is sufficient for access
          const userPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) => 
            setTimeout(() => resolve({ data: { user: null } }), 3000)
          );
          
          const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
          
          if (user) {
            // Check admin_staff table for specific role (to get latest info)
            const { data: staffData } = await (supabase as any)
              .from('admin_staff')
              .select('id, email, full_name, role, status')
              .eq('email', adminEmail.toLowerCase())
              .eq('status', 'active')
              .maybeSingle();
            
            if (staffData) {
              const v = buildStaffPermissionView(staffData.role, staffData.email);
              
              if (!hasLoggedDbRole) {
                console.log('🔐 Found staff in DB:', staffData.full_name, 'Role:', staffData.role);
                hasLoggedDbRole = true;
              }
              
              setState({
                loading: false,
                staffId: staffData.id,
                staffEmail: staffData.email,
                staffName: staffData.full_name,
                staffRole: staffData.role,
                roleDetails: v.roleDetails,
                isAdmin: v.isAdmin,
                isSuperAdmin: v.isSuperAdmin,
                accessibleTabs: v.accessibleTabs,
                error: null
              });
              return;
            }
          }
          
          // Use localStorage role if no DB record found
          const vLs = buildStaffPermissionView(storedRole, adminEmail);
          setState({
            loading: false,
            staffId: null,
            staffEmail: adminEmail,
            staffName: storedName,
            staffRole: storedRole,
            roleDetails: vLs.roleDetails,
            isAdmin: vLs.isAdmin,
            isSuperAdmin: vLs.isSuperAdmin,
            accessibleTabs: vLs.accessibleTabs,
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
      
      // admin_staff.id is the row PK; auth users are linked via user_id (or legacy email-only rows).
      const staffSelect = 'id, email, full_name, role, status, user_id';
      let staffData: {
        id: string;
        email: string | null;
        full_name: string | null;
        role: string;
        status: string;
        user_id: string | null;
      } | null = null;

      const { data: byUserId, error: errUserId } = await (supabase as any)
        .from('admin_staff')
        .select(staffSelect)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (errUserId) {
        console.error('Error fetching admin_staff by user_id:', errUserId);
      } else if (byUserId) {
        staffData = byUserId;
      }

      if (!staffData && user.email) {
        const em = user.email.trim().toLowerCase();
        const { data: byEmail, error: errEmail } = await (supabase as any)
          .from('admin_staff')
          .select(staffSelect)
          .ilike('email', em)
          .eq('status', 'active')
          .maybeSingle();
        if (errEmail) {
          console.error('Error fetching admin_staff by email:', errEmail);
        } else if (byEmail) {
          staffData = byEmail;
        }
      }

      const applyUserRolesAdminFallback = async (): Promise<boolean> => {
        const { data: roleData, error: roleErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (roleErr) {
          console.error('Error fetching user_roles:', roleErr);
          return false;
        }
        const r = roleData?.role;
        if (r !== 'admin' && r !== 'super_admin' && r !== 'administrator') return false;
        const raw = r === 'administrator' ? 'admin' : r;
        const v = buildStaffPermissionView(raw, user.email ?? null);
        setState({
          loading: false,
          staffId: user.id,
          staffEmail: user.email || null,
          staffName: v.roleDetails.name,
          staffRole: raw,
          roleDetails: v.roleDetails,
          isAdmin: v.isAdmin,
          isSuperAdmin: v.isSuperAdmin,
          accessibleTabs: v.accessibleTabs,
          error: null,
        });
        return true;
      };

      if (!staffData) {
        if (await applyUserRolesAdminFallback()) return;
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
          error: 'No staff record found',
        });
        return;
      }
      
      // Staff found - set permissions
      const v = buildStaffPermissionView(staffData.role, staffData.email);
      setState({
        loading: false,
        staffId: staffData.id,
        staffEmail: staffData.email,
        staffName: staffData.full_name || staffData.email || 'Staff',
        staffRole: staffData.role,
        roleDetails: v.roleDetails,
        isAdmin: v.isAdmin,
        isSuperAdmin: v.isSuperAdmin,
        accessibleTabs: v.accessibleTabs,
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
    // Log only once across ALL hook instances (module-level flag)
    if (!hasLoggedInit) {
      console.log('🔐 Staff permissions init:', { 
        rawStoredRole, 
        storedStaffRole, 
        isAdmin: initView.isAdmin,
        allowedTabs: initView.roleDetails.allowedTabs.length 
      });
      hasLoggedInit = true;
    }
    fetchStaffPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Permission check functions
  const checkTabAccess = useCallback(
    (tab: AdminTab): boolean => {
      if (state.loading) {
        const storedRole = localStorage.getItem("admin_staff_role");
        const adminEm = localStorage.getItem("admin_email");
        if (storedRole) {
          return canStaffAccessDashboardTab(storedRole, tab, adminEm);
        }
        return false;
      }
      return canStaffAccessDashboardTab(state.staffRole, tab, state.staffEmail);
    },
    [state.loading, state.staffRole, state.staffEmail],
  );

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


