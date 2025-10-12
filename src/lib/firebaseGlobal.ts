import { getDatabase, ref, set, update, get, onValue, off, Database } from "firebase/database";
import { realtimeDb } from "./firebase";

/**
 * Global Firebase Helper Functions
 * 
 * This module provides safe, sanitized Firebase operations that prevent
 * undefined values and invalid paths from causing Firebase write failures.
 * 
 * Key Features:
 * - Automatic sanitization of user IDs and data
 * - Path validation to prevent "undefined" in Firebase paths
 * - Comprehensive logging for debugging
 * - Consistent error handling across the application
 */

// Firebase service error handling - returns realtimeDb or throws
const getRealtimeDb = (): Database => {
  if (!realtimeDb) {
    throw new Error('Firebase Realtime Database not initialized. Check your Firebase configuration.');
  }
  return realtimeDb;
};

/**
 * Sanitizes a user ID to ensure it's safe for Firebase paths
 * @param raw - Raw user ID value (can be undefined, null, or any type)
 * @returns Sanitized string or null if invalid
 */
export function sanitizeUserId(raw?: any): string | null {
  if (raw === undefined || raw === null) {
    console.warn('🔸 [Firebase] sanitizeUserId: Received undefined/null user ID');
    return null;
  }
  
  const str = String(raw).trim();
  if (!str.length) {
    console.warn('🔸 [Firebase] sanitizeUserId: Received empty user ID');
    return null;
  }
  
  // Additional validation for common problematic values
  if (str === 'undefined' || str === 'null' || str === '[object Object]') {
    console.warn('🔸 [Firebase] sanitizeUserId: Received invalid user ID format:', str);
    return null;
  }
  
  return str;
}

/**
 * Recursively removes undefined values from an object
 * @param obj - Object to clean
 * @returns Clean object without undefined values
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const cleaned: any = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively clean nested objects
        const cleanedNested = removeUndefined(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

/**
 * Validates a Firebase path to ensure it doesn't contain invalid segments
 * @param path - Firebase path to validate
 * @returns true if path is valid, false otherwise
 */
export function validateFirebasePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  const trimmedPath = path.trim();
  if (!trimmedPath.length) {
    return false;
  }
  
  // Check for common problematic values in path
  const problematicValues = ['undefined', 'null', '[object Object]', ''];
  const pathSegments = trimmedPath.split('/');
  
  for (const segment of pathSegments) {
    if (problematicValues.includes(segment)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Safe Firebase set operation with automatic sanitization and validation
 * @param path - Firebase path (will be validated)
 * @param data - Data to set (will be sanitized)
 * @returns Promise that resolves when operation completes
 */
export async function safeSet(path: string, data: any): Promise<void> {
  try {
    // Validate path
    if (!validateFirebasePath(path)) {
      console.error('❌ [Firebase SafeSet] Invalid path detected:', {
        originalPath: path,
        pathType: typeof path,
        pathLength: path?.length || 0
      });
      return;
    }
    
    // Get database instance
    const db = getRealtimeDb();
    
    // Sanitize data
    const cleanData = removeUndefined(data);
    
    // Log the operation for debugging
    console.log('🔄 [Firebase SafeSet] Starting operation:', {
      path,
      originalDataKeys: data ? Object.keys(data) : [],
      cleanDataKeys: cleanData ? Object.keys(cleanData) : [],
      timestamp: new Date().toISOString()
    });
    
    // Perform the set operation
    await set(ref(db, path), cleanData);
    
    console.log('✅ [Firebase SafeSet] Operation completed successfully:', {
      path,
      dataSize: JSON.stringify(cleanData).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔥 [Firebase SafeSet] Operation failed:', {
      path,
      data: data ? Object.keys(data) : 'null/undefined',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // Re-throw for caller to handle if needed
    throw error;
  }
}

/**
 * Safe Firebase update operation with automatic sanitization and validation
 * @param path - Firebase path (will be validated)
 * @param data - Data to update (will be sanitized)
 * @returns Promise that resolves when operation completes
 */
export async function safeUpdate(path: string, data: any): Promise<void> {
  try {
    // Validate path
    if (!validateFirebasePath(path)) {
      console.error('❌ [Firebase SafeUpdate] Invalid path detected:', {
        originalPath: path,
        pathType: typeof path,
        pathLength: path?.length || 0
      });
      return;
    }
    
    // Get database instance
    const db = getRealtimeDb();
    
    // Sanitize data
    const cleanData = removeUndefined(data);
    
    // Ensure we have data to update
    if (!cleanData || Object.keys(cleanData).length === 0) {
      console.warn('⚠️ [Firebase SafeUpdate] No valid data to update after sanitization:', {
        path,
        originalData: data,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Log the operation for debugging
    console.log('🔄 [Firebase SafeUpdate] Starting operation:', {
      path,
      originalDataKeys: data ? Object.keys(data) : [],
      cleanDataKeys: Object.keys(cleanData),
      timestamp: new Date().toISOString()
    });
    
    // Perform the update operation
    await update(ref(db, path), cleanData);
    
    console.log('✅ [Firebase SafeUpdate] Operation completed successfully:', {
      path,
      updatedFields: Object.keys(cleanData),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔥 [Firebase SafeUpdate] Operation failed:', {
      path,
      data: data ? Object.keys(data) : 'null/undefined',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // Re-throw for caller to handle if needed
    throw error;
  }
}

/**
 * Safe Firebase get operation with path validation
 * @param path - Firebase path (will be validated)
 * @returns Promise that resolves with the data or null
 */
export async function safeGet(path: string): Promise<any> {
  try {
    // Validate path
    if (!validateFirebasePath(path)) {
      console.error('❌ [Firebase SafeGet] Invalid path detected:', {
        originalPath: path,
        pathType: typeof path,
        pathLength: path?.length || 0
      });
      return null;
    }
    
    // Get database instance
    const db = getRealtimeDb();
    
    // Log the operation for debugging
    console.log('🔄 [Firebase SafeGet] Starting operation:', {
      path,
      timestamp: new Date().toISOString()
    });
    
    // Perform the get operation
    const snapshot = await get(ref(db, path));
    const data = snapshot.exists() ? snapshot.val() : null;
    
    console.log('✅ [Firebase SafeGet] Operation completed successfully:', {
      path,
      hasData: !!data,
      dataType: typeof data,
      timestamp: new Date().toISOString()
    });
    
    return data;
    
  } catch (error) {
    console.error('🔥 [Firebase SafeGet] Operation failed:', {
      path,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // Return null instead of throwing for get operations
    return null;
  }
}

/**
 * Safe Firebase listener with path validation and automatic cleanup
 * @param path - Firebase path (will be validated)
 * @param callback - Callback function to handle data changes
 * @returns Unsubscribe function
 */
export function safeListen(path: string, callback: (data: any) => void): (() => void) {
  try {
    // Validate path
    if (!validateFirebasePath(path)) {
      console.error('❌ [Firebase SafeListen] Invalid path detected:', {
        originalPath: path,
        pathType: typeof path,
        pathLength: path?.length || 0
      });
      return () => {}; // Return no-op unsubscribe function
    }
    
    // Get database instance
    const db = getRealtimeDb();
    
    // Log the operation for debugging
    console.log('🔄 [Firebase SafeListen] Starting listener:', {
      path,
      timestamp: new Date().toISOString()
    });
    
    const dbRef = ref(db, path);
    
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        const data = snapshot.exists() ? snapshot.val() : null;
        callback(data);
      } catch (callbackError) {
        console.error('🔥 [Firebase SafeListen] Callback error:', {
          path,
          error: callbackError instanceof Error ? callbackError.message : String(callbackError),
          timestamp: new Date().toISOString()
        });
      }
    }, (error) => {
      console.error('🔥 [Firebase SafeListen] Listener error:', {
        path,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    });
    
    // Return cleanup function
    return () => {
      try {
        off(dbRef, 'value', unsubscribe);
        console.log('🧹 [Firebase SafeListen] Listener cleaned up:', {
          path,
          timestamp: new Date().toISOString()
        });
      } catch (cleanupError) {
        console.error('🔥 [Firebase SafeListen] Cleanup error:', {
          path,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          timestamp: new Date().toISOString()
        });
      }
    };
    
  } catch (error) {
    console.error('🔥 [Firebase SafeListen] Setup failed:', {
      path,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // Return no-op unsubscribe function
    return () => {};
  }
}

/**
 * Helper function to build safe user paths
 * @param userId - User ID to sanitize
 * @param subPath - Optional sub-path within user data
 * @returns Safe Firebase path or null if user ID is invalid
 */
export function buildUserPath(userId?: any, subPath?: string): string | null {
  const cleanUserId = sanitizeUserId(userId);
  if (!cleanUserId) {
    return null;
  }
  
  const basePath = `telegram_users/${cleanUserId}`;
  return subPath ? `${basePath}/${subPath}` : basePath;
}

/**
 * Helper function to build safe task paths
 * @param taskId - Task ID to include in path
 * @returns Safe Firebase path
 */
export function buildTaskPath(taskId?: string): string | null {
  if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
    return null;
  }
  
  return `tasks/${taskId.trim()}`;
}

/**
 * Helper function to build safe user task paths
 * @param userId - User ID to sanitize
 * @param taskId - Task ID to include in path
 * @returns Safe Firebase path or null if invalid
 */
export function buildUserTaskPath(userId?: any, taskId?: string): string | null {
  const cleanUserId = sanitizeUserId(userId);
  if (!cleanUserId || !taskId || typeof taskId !== 'string' || !taskId.trim()) {
    return null;
  }
  
  return `user_tasks/${cleanUserId}/${taskId.trim()}`;
}

/**
 * Utility function to safely extract user ID from Telegram user object
 * @param telegramUser - Telegram user object or user ID
 * @returns Sanitized user ID or null
 */
export function extractUserId(telegramUser?: any): string | null {
  if (!telegramUser) {
    return null;
  }
  
  // If it's already a string/number, treat as user ID
  if (typeof telegramUser === 'string' || typeof telegramUser === 'number') {
    return sanitizeUserId(telegramUser);
  }
  
  // If it's an object, try to extract ID
  if (typeof telegramUser === 'object') {
    const id = telegramUser.id || telegramUser.userId || telegramUser.telegram_id;
    return sanitizeUserId(id);
  }
  
  return null;
}

/**
 * Enhanced logging for Firebase operations
 */
export const FirebaseLogger = {
  operation: (type: string, path: string, details?: any) => {
    console.log(`🔄 [Firebase ${type}]`, {
      path,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  success: (type: string, path: string, details?: any) => {
    console.log(`✅ [Firebase ${type}] Success`, {
      path,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  error: (type: string, path: string, error: any, details?: any) => {
    console.error(`🔥 [Firebase ${type}] Error`, {
      path,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  warning: (type: string, message: string, details?: any) => {
    console.warn(`⚠️ [Firebase ${type}] Warning: ${message}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};