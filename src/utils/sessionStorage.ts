/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🔐 SESSION STORAGE UTILITY - PERSISTENT USER SESSIONS                             ║
 * ║                                                                                      ║
 * ║   ⚠️  SECURITY COMPONENT - DO NOT MODIFY WITHOUT REVIEW  ⚠️                         ║
 * ║                                                                                      ║
 * ║   SECURITY AUDIT: December 24, 2025                                                  ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE: Manages persistent user session data in localStorage                      ║
 * ║                                                                                      ║
 * ║   SECURITY NOTES:                                                                    ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. localStorage is NOT the source of truth for roles                       │   ║
 * ║   │  2. RoleProtectedRoute ALWAYS verifies against database                     │   ║
 * ║   │  3. user_role_id MUST match current user.id for localStorage to be valid   │   ║
 * ║   │  4. Sessions expire after 30 days                                           │   ║
 * ║   │  5. clearUserSession removes ALL session data including admin sessions      │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   IMPORTANT: This utility is for UX optimization (faster loading).                  ║
 * ║   Actual authorization is ALWAYS verified against the database.                     ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import {
  STORAGE_SESSION_KEY,
  STORAGE_SESSION_KEY_LEGACY,
} from '@/config/appIdentity';

const SESSION_EXPIRY_DAYS = 30;
const SESSION_KEY = STORAGE_SESSION_KEY;
const SESSION_KEY_LEGACY = STORAGE_SESSION_KEY_LEGACY;

interface StoredSession {
  userId: string;
  email: string;
  role: string;
  loginTime: number;
  expiryTime: number;
  lastActivity: number;
  deviceInfo: string;
}

/**
 * Save user session with extended expiry
 */
export const saveUserSession = (userId: string, email: string, role: string) => {
  const now = Date.now();
  const expiryTime = now + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  const session: StoredSession = {
    userId,
    email: email.toLowerCase(),
    role,
    loginTime: now,
    expiryTime,
    lastActivity: now,
    deviceInfo: navigator.userAgent
  };
  
  try {
    // Store in localStorage (persists across browser sessions)
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    // Also set individual items for quick access
    localStorage.setItem('user_role', role);
    localStorage.setItem('user_role_id', userId);
    localStorage.setItem('user_email', email.toLowerCase());
    localStorage.setItem('session_expiry', expiryTime.toString());
    
    console.log('✅ Session saved:', { userId, email, role, expiryDays: SESSION_EXPIRY_DAYS });
    
    // Log to activity for admin monitoring
    logSessionActivity('login', userId, email, role);
    
    return true;
  } catch (error) {
    console.error('Failed to save session:', error);
    return false;
  }
};

/**
 * Get stored session if valid
 */
const readSessionRaw = (): { raw: string; usedLegacy: boolean } | null => {
  const primary = localStorage.getItem(SESSION_KEY);
  if (primary) return { raw: primary, usedLegacy: false };
  const legacy = localStorage.getItem(SESSION_KEY_LEGACY);
  if (legacy) return { raw: legacy, usedLegacy: true };
  return null;
};

export const getStoredSession = (): StoredSession | null => {
  try {
    const blob = readSessionRaw();
    if (!blob) return null;

    const session: StoredSession = JSON.parse(blob.raw);
    const now = Date.now();

    if (now > session.expiryTime) {
      console.log('⚠️ Session expired, clearing...');
      clearUserSession();
      return null;
    }

    session.lastActivity = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(SESSION_KEY_LEGACY);

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Check if user has a valid session for a specific role
 */
export const hasValidSession = (requiredRole?: string): boolean => {
  const session = getStoredSession();
  if (!session) return false;
  
  if (requiredRole && session.role !== requiredRole) {
    return false;
  }
  
  return true;
};

/**
 * Get quick session info from localStorage
 */
export const getQuickSessionInfo = () => {
  return {
    role: localStorage.getItem('user_role'),
    userId: localStorage.getItem('user_role_id'),
    email: localStorage.getItem('user_email'),
    expiry: localStorage.getItem('session_expiry')
  };
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = () => {
  const session = getStoredSession();
  if (session) {
    session.lastActivity = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
};

/**
 * Clear user session
 */
export const clearUserSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY_LEGACY);
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_role_id');
  localStorage.removeItem('user_email');
  localStorage.removeItem('session_expiry');
  
  // Also clear admin session if exists
  localStorage.removeItem('admin_authenticated');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_login_time');
  
  console.log('🔓 Session cleared');
};

/**
 * Extend session expiry (call on important actions)
 */
export const extendSession = () => {
  const session = getStoredSession();
  if (session) {
    const now = Date.now();
    session.expiryTime = now + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    session.lastActivity = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('session_expiry', session.expiryTime.toString());
    console.log('✅ Session extended by', SESSION_EXPIRY_DAYS, 'days');
  }
};

/**
 * Log session activity for admin monitoring
 */
const logSessionActivity = async (action: string, userId: string, email: string, role: string) => {
  try {
    // Store activity log in localStorage for admin dashboard
    const activityLog = JSON.parse(localStorage.getItem('session_activity_log') || '[]');
    
    activityLog.push({
      action,
      userId,
      email,
      role,
      timestamp: new Date().toISOString(),
      deviceInfo: navigator.userAgent.substring(0, 100)
    });
    
    // Keep only last 100 activities
    if (activityLog.length > 100) {
      activityLog.splice(0, activityLog.length - 100);
    }
    
    localStorage.setItem('session_activity_log', JSON.stringify(activityLog));
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

/**
 * Get session activity log for admin
 */
export const getSessionActivityLog = () => {
  try {
    return JSON.parse(localStorage.getItem('session_activity_log') || '[]');
  } catch {
    return [];
  }
};

/**
 * Get session duration in human readable format
 */
export const getSessionDuration = (): string => {
  const session = getStoredSession();
  if (!session) return 'No active session';
  
  const duration = Date.now() - session.loginTime;
  const days = Math.floor(duration / (24 * 60 * 60 * 1000));
  const hours = Math.floor((duration % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Get time until session expires
 */
export const getTimeUntilExpiry = (): string => {
  const session = getStoredSession();
  if (!session) return 'No session';
  
  const remaining = session.expiryTime - Date.now();
  if (remaining <= 0) return 'Expired';
  
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  return `${days}d ${hours}h remaining`;
};






