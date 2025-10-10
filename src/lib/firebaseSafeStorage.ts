import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';

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
 * Safely store user data in Firestore with comprehensive error handling
 */
export async function safeFirestoreStorage(
  db: any, 
  userData: SafeUserData, 
  collection: string = 'telegram_users'
): Promise<{ success: boolean; error: string | null }> {
  if (!db) {
    return { success: false, error: 'Firestore not available' };
  }

  try {
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const sanitizedData = sanitizeUserData(userData);
    const userId = sanitizedData.id.toString();
    const userDocRef = doc(db, collection, userId);
    
    // Check if user already exists
    const existingDoc = await getDoc(userDocRef);
    
    if (existingDoc.exists()) {
      // Update existing user
      await setDoc(userDocRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log(`[SafeFirestore] Updated existing user ${userId} in Firestore`);
    } else {
      // Create new user
      await setDoc(userDocRef, {
        ...sanitizedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`[SafeFirestore] Created new user ${userId} in Firestore`);
    }
    
    return { success: true, error: null };
    
  } catch (error: any) {
    console.error('[SafeFirestore] Storage failed:', error);
    
    let errorMessage = 'Unknown Firestore error';
    
    // Handle specific Firestore errors
    if (error.code === 'permission-denied') {
      errorMessage = 'Firestore permission denied - check Firebase security rules';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Firestore temporarily unavailable';
    } else if (error.code === 'failed-precondition') {
      errorMessage = 'Firestore operation failed - invalid data format';
    } else if (error.code === 'invalid-argument') {
      errorMessage = 'Invalid data provided to Firestore';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
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

    await set(userRef, realtimeData);
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
 * Store user data in both Firestore and Realtime Database safely
 */
export async function safeDualStorage(
  db: any,
  realtimeDb: any,
  userData: SafeUserData
): Promise<{ firestore: { success: boolean; error: string | null }, realtime: { success: boolean; error: string | null } }> {
  
  // Validate once before attempting storage
  const validation = validateUserData(userData);
  if (!validation.isValid) {
    const error = validation.error;
    return {
      firestore: { success: false, error },
      realtime: { success: false, error }
    };
  }

  // Store in both databases concurrently
  const [firestoreResult, realtimeResult] = await Promise.allSettled([
    safeFirestoreStorage(db, userData),
    safeRealtimeStorage(realtimeDb, userData)
  ]);

  return {
    firestore: firestoreResult.status === 'fulfilled' 
      ? firestoreResult.value 
      : { success: false, error: firestoreResult.reason?.message || 'Firestore storage failed' },
    realtime: realtimeResult.status === 'fulfilled' 
      ? realtimeResult.value 
      : { success: false, error: realtimeResult.reason?.message || 'Realtime storage failed' }
  };
}

/**
 * Update only the lastSeen timestamp safely
 */
export async function safeUpdateLastSeen(
  db: any,
  realtimeDb: any,
  userId: string | number,
  collection: string = 'telegram_users',
  path: string = 'telegram_users'
): Promise<{ firestore: boolean; realtime: boolean }> {
  const userIdStr = userId.toString();
  const now = new Date().toISOString();
  
  let firestoreSuccess = false;
  let realtimeSuccess = false;

  // Update Firestore
  if (db) {
    try {
      const userDocRef = doc(db, collection, userIdStr);
      await setDoc(userDocRef, {
        lastSeen: now,
        updatedAt: serverTimestamp()
      }, { merge: true });
      firestoreSuccess = true;
      console.log(`[SafeUpdate] Last seen updated in Firestore for user ${userIdStr}`);
    } catch (error: any) {
      console.error(`[SafeUpdate] Failed to update last seen in Firestore for user ${userIdStr}:`, error);
    }
  }

  // Update Realtime Database
  if (realtimeDb) {
    try {
      const userRef = ref(realtimeDb, `${path}/${userIdStr}`);
      const existingData = await get(userRef);
      
      await set(userRef, {
        ...(existingData.exists() ? existingData.val() : {}),
        lastSeen: now,
        updatedAt: now
      });
      realtimeSuccess = true;
      console.log(`[SafeUpdate] Last seen updated in Realtime Database for user ${userIdStr}`);
    } catch (error: any) {
      console.error(`[SafeUpdate] Failed to update last seen in Realtime Database for user ${userIdStr}:`, error);
    }
  }

  return { firestore: firestoreSuccess, realtime: realtimeSuccess };
}

/**
 * Main wrapper function for safe Telegram user storage
 */
export async function safeTelegramUserStorage(
  userData: SafeUserData,
  options: {
    db?: any;
    realtimeDb?: any;
    collection?: string;
    path?: string;
    enableLocalBackup?: boolean;
  } = {}
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  const {
    db,
    realtimeDb,
    collection = 'telegram_users',
    path = 'telegram_users',
    enableLocalBackup = true
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  let hasSuccess = false;

  try {
    // Store in Firebase services
    const results = await safeDualStorage(db, realtimeDb, userData);
    
    if (results.firestore.success) {
      hasSuccess = true;
    } else if (results.firestore.error) {
      errors.push(`Firestore: ${results.firestore.error}`);
    }
    
    if (results.realtime.success) {
      hasSuccess = true;
    } else if (results.realtime.error) {
      errors.push(`Realtime DB: ${results.realtime.error}`);
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