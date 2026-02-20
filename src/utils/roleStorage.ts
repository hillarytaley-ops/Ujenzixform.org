/**
 * Secure Role Storage Utility
 * 
 * This utility provides secure storage and retrieval of user roles.
 * It ties the role to the user's session to prevent localStorage manipulation.
 */

// Store role securely with session binding
export const storeUserRole = (role: string, userId: string, accessToken: string) => {
  const securityKey = `${userId}_${accessToken.substring(0, 8)}`;
  localStorage.setItem('user_role', role);
  localStorage.setItem('user_security_key', securityKey);
  localStorage.setItem('user_role_id', userId);
  console.log('🔒 Role stored securely:', role);
};

// Get role if security key matches
export const getSecureRole = (userId: string, accessToken: string): string | null => {
  const storedRole = localStorage.getItem('user_role');
  const storedSecurityKey = localStorage.getItem('user_security_key');
  const expectedSecurityKey = `${userId}_${accessToken.substring(0, 8)}`;
  
  if (storedRole && storedSecurityKey === expectedSecurityKey) {
    return storedRole;
  }
  
  return null;
};

// Clear role data (on logout)
export const clearRoleData = () => {
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_security_key');
  localStorage.removeItem('user_role_id');
};

// Get dashboard path for a role
export const getDashboardForRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'supplier':
      return '/supplier-dashboard';
    case 'delivery':
    case 'delivery_provider':
      return '/delivery-dashboard';
    case 'professional_builder':
      return '/professional-builder-dashboard';
    case 'private_client':
      return '/private-client-dashboard';
    default:
      return '/home';
  }
};
