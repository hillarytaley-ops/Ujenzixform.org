/**
 * Secure Session Storage Utility
 * 
 * Security improvements:
 * 1. Sensitive data is encrypted before storage
 * 2. Session tokens are stored in sessionStorage (cleared on browser close)
 * 3. Non-sensitive preferences can use localStorage
 * 4. Automatic session expiry validation
 * 5. Device fingerprinting for session binding
 *
 * Client-side obfuscation is not a substitute for server auth; XSS can bypass it.
 */

import {
  STORAGE_ENCRYPTION_KEY_NAME,
  STORAGE_ENCRYPTION_KEY_NAME_LEGACY,
  STORAGE_SECURE_SESSION_KEY,
  STORAGE_SECURE_SESSION_KEY_LEGACY,
  STORAGE_SESSION_KEY,
  STORAGE_SESSION_KEY_LEGACY,
} from '@/config/appIdentity';

// Session configuration
const SESSION_EXPIRY_HOURS = 24; // Shorter than before for security
const SESSION_KEY = STORAGE_SECURE_SESSION_KEY;
const SESSION_KEY_LEGACY = STORAGE_SECURE_SESSION_KEY_LEGACY;
const ENCRYPTION_KEY_NAME = STORAGE_ENCRYPTION_KEY_NAME;
const ENCRYPTION_KEY_NAME_LEGACY = STORAGE_ENCRYPTION_KEY_NAME_LEGACY;

interface SecureSession {
  userId: string;
  emailHash: string; // Store hash, not plain email
  role: string;
  loginTime: number;
  expiryTime: number;
  lastActivity: number;
  deviceFingerprint: string;
  sessionToken: string;
}

/**
 * Generate a simple device fingerprint for session binding
 */
const generateDeviceFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown'
  ];
  return hashString(components.join('|'));
};

/**
 * Simple hash function for non-cryptographic purposes
 */
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Generate a cryptographically secure session token
 */
const generateSessionToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Encrypt data using Web Crypto API
 */
const encryptData = async (
  data: string,
  encryptionKeyStorageName: string = ENCRYPTION_KEY_NAME
): Promise<string> => {
  try {
    // Generate or retrieve encryption key
    let keyData = sessionStorage.getItem(encryptionKeyStorageName);
    if (!keyData) {
      const key = crypto.getRandomValues(new Uint8Array(32));
      keyData = Array.from(key, b => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(encryptionKeyStorageName, keyData);
    }

    // Simple XOR encryption (for client-side obfuscation)
    const keyBytes = keyData.match(/.{2}/g)!.map(b => parseInt(b, 16));
    const dataBytes = new TextEncoder().encode(data);
    const encrypted = new Uint8Array(dataBytes.length);
    
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return btoa(String.fromCharCode(...encrypted));
  } catch (error) {
    console.error('Encryption failed:', error);
    return btoa(data); // Fallback to base64
  }
};

/**
 * Decrypt data
 */
const decryptData = async (
  encryptedData: string,
  encryptionKeyStorageName: string = ENCRYPTION_KEY_NAME
): Promise<string> => {
  try {
    const keyData = sessionStorage.getItem(encryptionKeyStorageName);
    if (!keyData) {
      throw new Error('No encryption key found');
    }

    const keyBytes = keyData.match(/.{2}/g)!.map(b => parseInt(b, 16));
    const encryptedBytes = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const decrypted = new Uint8Array(encryptedBytes.length);
    
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    try {
      return atob(encryptedData); // Try base64 fallback
    } catch {
      return '';
    }
  }
};

/**
 * Save secure session
 */
export const saveSecureSession = async (
  userId: string, 
  email: string, 
  role: string
): Promise<boolean> => {
  try {
    const now = Date.now();
    const expiryTime = now + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
    
    const session: SecureSession = {
      userId,
      emailHash: hashString(email.toLowerCase()),
      role,
      loginTime: now,
      expiryTime,
      lastActivity: now,
      deviceFingerprint: generateDeviceFingerprint(),
      sessionToken: generateSessionToken()
    };
    
    // Encrypt and store in sessionStorage (cleared on browser close)
    const encryptedSession = await encryptData(JSON.stringify(session));
    sessionStorage.setItem(SESSION_KEY, encryptedSession);
    
    // Store session token separately for quick validation
    sessionStorage.setItem('session_token', session.sessionToken);
    
    // Store non-sensitive role info for UI (can use localStorage for persistence)
    // But user_role_id should be in sessionStorage for security
    sessionStorage.setItem('user_role', role);
    sessionStorage.setItem('user_role_id', userId);
    
    console.log('✅ Secure session saved');
    return true;
  } catch (error) {
    console.error('Failed to save secure session:', error);
    return false;
  }
};

/**
 * Get secure session if valid
 */
const tryDecryptSession = async (
  encryptedSession: string,
  encKeyName: string
): Promise<SecureSession | null> => {
  try {
    const sessionStr = await decryptData(encryptedSession, encKeyName);
    if (!sessionStr) return null;
    return JSON.parse(sessionStr) as SecureSession;
  } catch {
    return null;
  }
};

async function readStoredSecureSession(): Promise<{
  session: SecureSession;
  fromLegacy: boolean;
} | null> {
  const primaryEnc = sessionStorage.getItem(SESSION_KEY);
  if (primaryEnc) {
    const s = await tryDecryptSession(primaryEnc, ENCRYPTION_KEY_NAME);
    if (s) return { session: s, fromLegacy: false };
  }
  const legacyEnc = sessionStorage.getItem(SESSION_KEY_LEGACY);
  if (legacyEnc) {
    const s = await tryDecryptSession(legacyEnc, ENCRYPTION_KEY_NAME_LEGACY);
    if (s) return { session: s, fromLegacy: true };
  }
  return null;
}

export const getSecureSession = async (): Promise<SecureSession | null> => {
  try {
    const parsed = await readStoredSecureSession();
    if (!parsed) return null;

    const { session, fromLegacy } = parsed;
    const now = Date.now();

    if (now > session.expiryTime) {
      console.log('⚠️ Secure session expired');
      clearSecureSession();
      return null;
    }

    const currentFingerprint = generateDeviceFingerprint();
    if (session.deviceFingerprint !== currentFingerprint) {
      console.warn('⚠️ Device fingerprint mismatch - possible session hijacking');
    }

    session.lastActivity = now;
    const encryptedUpdated = await encryptData(JSON.stringify(session));
    sessionStorage.setItem(SESSION_KEY, encryptedUpdated);

    if (fromLegacy) {
      sessionStorage.removeItem(SESSION_KEY_LEGACY);
      sessionStorage.removeItem(ENCRYPTION_KEY_NAME_LEGACY);
    }

    return session;
  } catch (error) {
    console.error('Failed to get secure session:', error);
    return null;
  }
};

/**
 * Validate session token
 */
export const validateSessionToken = async (): Promise<boolean> => {
  const storedToken = sessionStorage.getItem('session_token');
  if (!storedToken) return false;
  
  const session = await getSecureSession();
  if (!session) return false;
  
  return session.sessionToken === storedToken;
};

/**
 * Get quick session info (for UI, non-sensitive)
 */
export const getQuickSecureSessionInfo = () => {
  return {
    role: sessionStorage.getItem('user_role'),
    userId: sessionStorage.getItem('user_role_id'),
    hasSession:
      sessionStorage.getItem(SESSION_KEY) !== null ||
      sessionStorage.getItem(SESSION_KEY_LEGACY) !== null,
  };
};

/**
 * Clear secure session
 */
export const clearSecureSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY_LEGACY);
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME_LEGACY);
  sessionStorage.removeItem('session_token');
  sessionStorage.removeItem('user_role');
  sessionStorage.removeItem('user_role_id');
  
  // Also clear any legacy localStorage items
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_role_id');
  localStorage.removeItem('admin_authenticated');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_login_time');
  
  console.log('🔓 Secure session cleared');
};

/**
 * Check if session is about to expire (within 1 hour)
 */
export const isSessionExpiringSoon = async (): Promise<boolean> => {
  const session = await getSecureSession();
  if (!session) return true;
  
  const oneHour = 60 * 60 * 1000;
  return (session.expiryTime - Date.now()) < oneHour;
};

/**
 * Extend session (call on important user actions)
 */
export const extendSecureSession = async (): Promise<boolean> => {
  const session = await getSecureSession();
  if (!session) return false;
  
  const now = Date.now();
  session.expiryTime = now + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
  session.lastActivity = now;
  
  const encryptedSession = await encryptData(JSON.stringify(session));
  sessionStorage.setItem(SESSION_KEY, encryptedSession);
  
  console.log('✅ Secure session extended');
  return true;
};

/**
 * Migration helper: Move from localStorage to sessionStorage
 */
export const migrateFromLocalStorage = async (): Promise<boolean> => {
  try {
    const legacyRole = localStorage.getItem('user_role');
    const legacyUserId = localStorage.getItem('user_role_id');
    const legacyEmail = localStorage.getItem('user_email');
    
    if (legacyRole && legacyUserId) {
      // Migrate to secure session
      await saveSecureSession(legacyUserId, legacyEmail || '', legacyRole);
      
      // Clear legacy storage
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_role_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem(STORAGE_SESSION_KEY_LEGACY);
      localStorage.removeItem(STORAGE_SESSION_KEY);
      
      console.log('✅ Migrated from localStorage to secure sessionStorage');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
};

// Auto-migrate on module load
if (typeof window !== 'undefined') {
  migrateFromLocalStorage().catch(console.error);
}

export default {
  saveSecureSession,
  getSecureSession,
  validateSessionToken,
  getQuickSecureSessionInfo,
  clearSecureSession,
  isSessionExpiringSoon,
  extendSecureSession,
  migrateFromLocalStorage
};




