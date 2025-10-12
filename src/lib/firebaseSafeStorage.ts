import { ref, get } from 'firebase/database';
import { safeSet, safeUpdate, safeGet, sanitizeUserId, buildUserPath, extractUserId, FirebaseLogger } from './firebaseGlobal';

/**
 * Safe Firebase storage utilities for Telegram user data
 * Handles undefined values, permission errors, and network issues gracefully
 */

export interface SafeUserData {
  id: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  profile_photo?: string;
  language_code?: string;
  is_premium?: boolean;
  platform?: string;
  userAgent?: string;
  source?: string;
  capturedAt?: string;
  lastSeen?: string;
  [key: string]: any;
}

interface SanitizedUserData {
  id: string | number;
  first_name: string;
  last_name: string;
  username: string;
  photo_url: string;
  language_code: string;
  is_premium: boolean;
  platform: string;
  userAgent: string;
  source: string;
  capturedAt: string;
  lastSeen: string;
}

/**
 * Sanitize user data by replacing undefined values with safe defaults
 */
export function sanitizeUserData(userData: SafeUserData): SanitizedUserData {
  if (!userData || !userData.id) {
    throw new Error('Invalid user data: missing user or user.id');
  }

  return {
    id: userData.id,
    first_name: userData.first_name || "",
    last_name: userData.last_name || "",
    username: userData.username || "",
    photo_url: userData.photo_url || userData.profile_photo || "",
    language_code: userData.language_code || "",
    is_premium: userData.is_premium || false,
    platform: userData.platform || "",
    userAgent: userData.userAgent || "",
    source: userData.source || "unknown",
    capturedAt: userData.capturedAt || new Date().toISOString(),
    lastSeen: userData.lastSeen || new Date().toISOString()
  };
}

/**
 * Validate user data before storage
 */
export function validateUserData(userData: SafeUserData): { isValid: boolean; error: string | null } {
  if (!userData) {
    return { isValid: false, error: 'User object is null or undefined' };
  }
  
  if (!userData.id) {
    return { isValid: false, error: 'User ID is required' };
  }
  
  if (typeof userData.id !== 'number' && typeof userData.id !== 'string') {
    return { isValid: false, error: 'User ID must be a number or string' };
  }
  
  return { isValid: true, error: null };
}


/**
 * Safely store user data in Realtime Database with comprehensive error handling
 */
export async function safeRealtimeStorage(
  realtimeDb: any, 
  userData: SafeUserData, 
  path: string = 'telegram_users'
): Promise<{ success: boolean; error: string | null }> {
  if (!realtimeDb) {
    return { success: false, error: 'Realtime Database not available' };
  }

  try {
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const sanitizedData = sanitizeUserData(userData);
    const userId = sanitizedData.id.toString();
    const userRef = ref(realtimeDb, `${path}/${userId}`);
    
    // Prepare Realtime DB data (use ISO strings for timestamps)
    const realtimeData = {
      ...sanitizedData,
      createdAt: sanitizedData.capturedAt,
      updatedAt: new Date().toISOString()
    };

    const userPath = buildUserPath(userId);
    if (!userPath) {
      return { success: false, error: 'Invalid user ID for storage' };
    }
    
    await safeSet(userPath, realtimeData);
    console.log(`[SafeRealtime] Successfully stored user ${userId} in Realtime Database`);
    
    return { success: true, error: null };
    
  } catch (error: any) {
    console.error('[SafeRealtime] Storage failed:', error);
    
    let errorMessage = 'Unknown Realtime Database error';
    
    // Handle specific Realtime Database errors
    if (error.code === 'PERMISSION_DENIED') {
      errorMessage = 'Realtime Database permission denied - check Firebase security rules';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error - check internet connection';
    } else if (error.code === 'UNAVAILABLE') {
      errorMessage = 'Realtime Database temporarily unavailable';
    } else if (error.code === 'DATA_STALE') {
      errorMessage = 'Data is stale - retry operation';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Store user data in Realtime Database safely
 */
export async function safeRealtimeOnlyStorage(
  realtimeDb: any,
  userData: SafeUserData
): Promise<{ success: boolean; error: string | null }> {
  
  // Validate before attempting storage
  const validation = validateUserData(userData);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  // Store in Realtime Database only
  return await safeRealtimeStorage(realtimeDb, userData);
}

/**
 * Update only the lastSeen timestamp safely
 */
export async function safeUpdateLastSeen(
  realtimeDb: any,
  userId: string | number,
  path: string = 'telegram_users'
): Promise<{ realtime: boolean }> {
  const userIdStr = userId.toString();
  const now = new Date().toISOString();
  
  let realtimeSuccess = false;

  // Update Realtime Database only
  if (realtimeDb) {
    try {
      const userPath = buildUserPath(userIdStr);
      if (!userPath) {
        console.warn('[SafeUpdate] Invalid user ID for last seen update:', userIdStr);
        return { realtime: false };
      }
      
      const existingData = await safeGet(userPath);
      
      await safeSet(userPath, {
        ...(existingData || {}),
        lastSeen: now,
        updatedAt: now
      });
      realtimeSuccess = true;
      console.log(`[SafeUpdate] Last seen updated in Realtime Database for user ${userIdStr}`);
    } catch (error: any) {
      console.error(`[SafeUpdate] Failed to update last seen in Realtime Database for user ${userIdStr}:`, error);
    }
  }

  return { realtime: realtimeSuccess };
}

/**
 * Main wrapper function for safe Telegram user storage (Realtime DB only)
 */
export async function safeTelegramUserStorage(
  userData: SafeUserData,
  options: {
    realtimeDb?: any;
    path?: string;
    enableLocalBackup?: boolean;
  } = {}
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  const {
    realtimeDb,
    path = 'telegram_users',
    enableLocalBackup = true
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  let hasSuccess = false;

  try {
    // Store in Realtime Database only
    const result = await safeRealtimeOnlyStorage(realtimeDb, userData);
    
    if (result.success) {
      hasSuccess = true;
    } else if (result.error) {
      errors.push(`Realtime DB: ${result.error}`);
    }

    // Local storage backup
    if (enableLocalBackup && typeof localStorage !== 'undefined') {
      try {
        const sanitizedData = sanitizeUserData(userData);
        const userId = sanitizedData.id.toString();
        localStorage.setItem('telegram_user_data', JSON.stringify(sanitizedData));
        localStorage.setItem(`telegram_user_${userId}`, JSON.stringify(sanitizedData));
        console.log(`[SafeStorage] Backup stored in localStorage for user ${userId}`);
        hasSuccess = true;
      } catch (localError: any) {
        warnings.push(`Local storage backup failed: ${localError.message}`);
      }
    }

    return {
      success: hasSuccess,
      errors,
      warnings
    };

  } catch (error: any) {
    errors.push(`Unexpected error: ${error.message}`);
    return {
      success: false,
      errors,
      warnings
    };
  }
}