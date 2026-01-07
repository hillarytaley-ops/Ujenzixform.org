/**
 * Admin Supabase Client
 * 
 * This client uses the service role key to bypass RLS for admin operations.
 * IMPORTANT: This should only be used in admin contexts and the service role
 * key should be kept secure.
 * 
 * For production, consider moving admin operations to Edge Functions
 * where the service role key can be kept server-side.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wuuyjjpgzgeimiptuuws.supabase.co";

// Service role key - in production, this should be in environment variables
// and admin operations should be done via Edge Functions
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Get the admin Supabase client (bypasses RLS)
 * Only use this for admin dashboard operations
 */
export const getAdminClient = (): SupabaseClient<Database> | null => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Admin service role key not configured. Admin operations may fail.');
    return null;
  }
  
  if (!adminClient) {
    adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'sb-admin-auth-token' // Use different storage key to avoid conflicts
      }
    });
  }
  
  return adminClient;
};

/**
 * Check if admin client is available
 */
export const isAdminClientAvailable = (): boolean => {
  return !!SUPABASE_SERVICE_ROLE_KEY;
};

/**
 * Verify if the current user is an admin by checking user_roles table
 * This uses the regular client but the admin_staff or user_roles check
 */
export const verifyAdminAccess = async (email: string): Promise<boolean> => {
  try {
    const client = getAdminClient();
    if (!client) return false;
    
    // Check user_roles table for admin role
    const { data, error } = await client
      .from('user_roles')
      .select('role')
      .eq('role', 'admin')
      .limit(1);
    
    if (error) {
      console.error('Admin verification error:', error);
      return false;
    }
    
    // Also verify the email matches an admin user
    const { data: userData } = await client
      .from('user_roles')
      .select(`
        user_id,
        role
      `)
      .eq('role', 'admin');
    
    if (!userData || userData.length === 0) return false;
    
    // Get user emails
    for (const ur of userData) {
      const { data: authUser } = await client.auth.admin.getUserById(ur.user_id);
      if (authUser?.user?.email === email) {
        return true;
      }
    }
    
    return false;
  } catch (err) {
    console.error('Admin verification exception:', err);
    return false;
  }
};

export default getAdminClient;

