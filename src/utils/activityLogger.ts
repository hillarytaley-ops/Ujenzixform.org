import { supabase } from "@/integrations/supabase/client";

// Type helper for tables not yet in generated types
const db = supabase as any;

interface LogActivityParams {
  action: string;
  category: 'auth' | 'admin' | 'user' | 'content' | 'order' | 'delivery' | 'system';
  details: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the activity_logs table
 * This function is designed to be non-blocking and fail silently
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Insert log entry
    const { error } = await db
      .from('activity_logs')
      .insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        action: params.action,
        category: params.category,
        details: params.details,
        metadata: params.metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Activity log insert failed:', error);
    }
  } catch (err) {
    // Fail silently - logging should never break the app
    console.warn('Activity logging error:', err);
  }
};

/**
 * Log a login event
 */
export const logLogin = async (email: string, success: boolean, method: string = 'email'): Promise<void> => {
  await logActivity({
    action: success ? 'login' : 'login_failed',
    category: 'auth',
    details: success 
      ? `User ${email} logged in successfully via ${method}`
      : `Failed login attempt for ${email} via ${method}`,
    metadata: { email, method, success }
  });
};

/**
 * Log a logout event
 */
export const logLogout = async (email: string): Promise<void> => {
  await logActivity({
    action: 'logout',
    category: 'auth',
    details: `User ${email} logged out`,
    metadata: { email }
  });
};

/**
 * Log a signup event
 */
export const logSignup = async (email: string, role: string): Promise<void> => {
  await logActivity({
    action: 'signup',
    category: 'auth',
    details: `New user registered: ${email} as ${role}`,
    metadata: { email, role }
  });
};

/**
 * Log an admin action
 */
export const logAdminAction = async (action: string, details: string, metadata?: Record<string, any>): Promise<void> => {
  await logActivity({
    action,
    category: 'admin',
    details,
    metadata
  });
};

/**
 * Log a user management action
 */
export const logUserAction = async (action: string, targetUser: string, details: string): Promise<void> => {
  await logActivity({
    action,
    category: 'user',
    details,
    metadata: { target_user: targetUser }
  });
};

/**
 * Log a content change
 */
export const logContentChange = async (contentType: string, action: string, contentId: string): Promise<void> => {
  await logActivity({
    action: `${contentType}_${action}`,
    category: 'content',
    details: `${action} ${contentType}: ${contentId}`,
    metadata: { content_type: contentType, content_id: contentId }
  });
};

/**
 * Log an order event
 */
export const logOrderEvent = async (orderId: string, action: string, details: string): Promise<void> => {
  await logActivity({
    action: `order_${action}`,
    category: 'order',
    details,
    metadata: { order_id: orderId }
  });
};

/**
 * Log a delivery event
 */
export const logDeliveryEvent = async (deliveryId: string, action: string, details: string): Promise<void> => {
  await logActivity({
    action: `delivery_${action}`,
    category: 'delivery',
    details,
    metadata: { delivery_id: deliveryId }
  });
};

/**
 * Log a system event
 */
export const logSystemEvent = async (action: string, details: string, metadata?: Record<string, any>): Promise<void> => {
  await logActivity({
    action,
    category: 'system',
    details,
    metadata
  });
};

export default logActivity;

