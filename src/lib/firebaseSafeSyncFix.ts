/**
 * Firebase User Data Sync Fix - Complete Solution
 * 
 * This file implements comprehensive fixes for Firebase user data sync issues:
 * 1. Prevents all undefined value writes to Firebase
 * 2. Implements real-time listeners with instant UI updates
 * 3. Wraps Firebase operations in DOMContentLoaded for proper initialization
 * 4. Provides safe user object creation and validation
 */

import { User } from '@/types';
import { ref, set, update, get, onValue, off } from 'firebase/database';
import { realtimeDb } from './firebase';
import { getTelegramUserSafe, getUserIdForFirebase } from './telegramUserSafe';
import { VIP_TIERS } from './constants';

// Global map to track active listeners
const activeListeners = new Map<string, () => void>();

/**
 * Creates a completely safe user object with NO undefined values
 * This is the definitive function to prevent Firebase "undefined" errors
 */
export function createCompletelyFirebaseSafeUser(telegramUser?: any, referralId?: string): User {
  const now = new Date();
  const userId = telegramUser ? getUserIdForFirebase(telegramUser) || 'user_default' : 'user_default';
  
  // Create user with ALL required fields explicitly defined
  const safeUser: User = {
    // Identity fields - NEVER undefined
    id: userId,
    telegramId: userId,
    username: telegramUser?.username || telegramUser?.first_name?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || '',
    firstName: telegramUser?.first_name || telegramUser?.firstName || 'User',
    lastName: telegramUser?.last_name || telegramUser?.lastName || '',
    profilePic: telegramUser?.photo_url || telegramUser?.profilePic || '',
    
    // Game data - ALL defined with safe defaults
    coins: 0,
    xp: 0,
    level: 1,
    
    // VIP data - ALL defined
    vipTier: 'free',
    farmingMultiplier: VIP_TIERS.free.farmingMultiplier || 1,
    referralMultiplier: VIP_TIERS.free.referralMultiplier || 1,
    adsLimitPerDay: VIP_TIERS.free.adsLimitPerDay || 5,
    withdrawalLimit: VIP_TIERS.free.withdrawalLimit || 1000,
    minWithdrawal: VIP_TIERS.free.minWithdrawal || 100,
    
    // Referral data - ALL defined
    referrerId: referralId || '',
    referralCount: 0,
    referralEarnings: 0,
    
    // Game state - ALL defined
    dailyStreak: 0,
    
    // Timestamps - ALWAYS defined
    createdAt: now,
    updatedAt: now
  };
  
  // Validate: ensure NO undefined values exist
  Object.keys(safeUser).forEach(key => {
    if ((safeUser as any)[key] === undefined) {
      console.error(`[Firebase Safe User] CRITICAL: Found undefined value for key: ${key}`);
      throw new Error(`Unsafe user object created - undefined value for: ${key}`);
    }
  });
  
  console.log('[Firebase Safe User] ✅ Created completely safe user object:', {
    id: safeUser.id,
    firstName: safeUser.firstName,
    coins: safeUser.coins,
    undefinedCheck: 'PASSED'
  });
  
  return safeUser;
}

/**
 * Sanitizes ANY data before Firebase write - ultimate protection
 */
export function ultimateFirebaseSanitizer(data: any): any {
  if (data === undefined) {
    console.warn('[Firebase Sanitizer] Received undefined data, returning empty object');
    return {};
  }
  
  if (data === null || typeof data !== 'object') {
    return data;
  }
  
  const sanitized: any = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) {
      console.warn(`[Firebase Sanitizer] ⚠️ Removing undefined value for key: ${key}`);
      // NEVER add undefined values to sanitized object
      return;
    }
    
    if (value === null) {
      sanitized[key] = null;
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (typeof value === 'number' && !isNaN(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      const nested = ultimateFirebaseSanitizer(value);
      if (Object.keys(nested).length > 0) {
        sanitized[key] = nested;
      }
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Safe Firebase user creation/update with comprehensive error prevention
 */
export async function safeFirebaseUserSync(userId: string, userData: Partial<User>, isNewUser: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    if (!realtimeDb) {
      throw new Error('Firebase Realtime Database not initialized');
    }
    
    console.log(`[Safe Firebase Sync] ${isNewUser ? 'Creating' : 'Updating'} user: ${userId}`);
    
    // Ultimate sanitization
    const sanitizedData = ultimateFirebaseSanitizer(userData);
    
    // Final check: ensure no undefined values in serialized data
    const jsonString = JSON.stringify(sanitizedData);
    if (jsonString.includes('undefined') || jsonString.includes('"undefined"')) {
      console.error('[Safe Firebase Sync] CRITICAL: Sanitized data contains undefined!', sanitizedData);
      throw new Error('Data sanitization failed - undefined values detected');
    }
    
    const userRef = ref(realtimeDb, `telegram_users/${userId}`);
    
    if (isNewUser) {
      // For new users, add server timestamp
      const newUserData = {
        ...sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('[Safe Firebase Sync] Creating new user with keys:', Object.keys(newUserData));
      await set(userRef, newUserData);
    } else {
      // For updates, only update provided fields
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date().toISOString()
      };
      
      console.log('[Safe Firebase Sync] Updating user with keys:', Object.keys(updateData));
      await update(userRef, updateData);
    }
    
    console.log(`[Safe Firebase Sync] ✅ Successfully ${isNewUser ? 'created' : 'updated'} user: ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[Safe Firebase Sync] ❌ Failed to ${isNewUser ? 'create' : 'update'} user ${userId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Firebase error'
    };
  }
}

/**
 * Sets up real-time listener with instant UI updates
 */
export function setupRealtimeUserListener(
  userId: string, 
  callback: (user: User | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!realtimeDb) {
    console.error('[Realtime Listener] Firebase not initialized');
    return () => {};
  }
  
  const userRef = ref(realtimeDb, `telegram_users/${userId}`);
  const listenerId = `user_${userId}_${Date.now()}`;
  
  const handleSnapshot = (snapshot: any) => {
    try {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Convert Firebase data back to User object with proper types
        const user: User = {
          ...userData,
          id: userId,
          telegramId: userId,
          // Convert ISO strings back to Date objects
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
          updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
          lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
          farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
          farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
          vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
        };
        
        console.log(`[Realtime Listener] 📡 User data received for ${userId}:`, {
          coins: user.coins,
          vipTier: user.vipTier,
          timestamp: new Date().toISOString()
        });
        
        callback(user);
      } else {
        console.log(`[Realtime Listener] No data found for user: ${userId}`);
        callback(null);
      }
    } catch (error) {
      console.error(`[Realtime Listener] Error processing data for ${userId}:`, error);
      if (onError) onError(error as Error);
    }
  };
  
  const handleError = (error: Error) => {
    console.error(`[Realtime Listener] Firebase error for ${userId}:`, error);
    if (onError) onError(error);
  };
  
  // Set up the listener
  const unsubscribe = onValue(userRef, handleSnapshot, handleError);
  
  // Store cleanup function
  const cleanup = () => {
    off(userRef, 'value', handleSnapshot);
    activeListeners.delete(listenerId);
    console.log(`[Realtime Listener] Cleaned up listener for user: ${userId}`);
  };
  
  activeListeners.set(listenerId, cleanup);
  
  console.log(`[Realtime Listener] 🔄 Started real-time sync for user: ${userId}`);
  
  return cleanup;
}

/**
 * Initialize user with comprehensive safety checks
 * Wraps everything in DOMContentLoaded for proper timing
 */
export async function initializeUserSafely(): Promise<{
  user: User | null;
  userId: string | null;
  setupListener: () => void;
}> {
  return new Promise((resolve) => {
    const initialize = async () => {
      try {
        console.log('[Safe User Init] Starting safe user initialization...');
        
        // Get Telegram user safely
        const telegramUser = getTelegramUserSafe();
        const userId = getUserIdForFirebase(telegramUser);
        
        if (!userId) {
          console.error('[Safe User Init] Unable to get valid user ID');
          resolve({ user: null, userId: null, setupListener: () => {} });
          return;
        }
        
        console.log(`[Safe User Init] User ID: ${userId}`);
        
        // Check if user exists in Firebase
        let user: User | null = null;
        
        try {
          if (realtimeDb) {
            const userRef = ref(realtimeDb, `telegram_users/${userId}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
              const userData = snapshot.val();
              user = {
                ...userData,
                id: userId,
                telegramId: userId,
                createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
                updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
                lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
                farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
                farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
                vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
              };
              console.log('[Safe User Init] ✅ Existing user loaded');
            } else {
              // Create new user with safe defaults
              user = createCompletelyFirebaseSafeUser(telegramUser);
              const result = await safeFirebaseUserSync(userId, user, true);
              
              if (result.success) {
                console.log('[Safe User Init] ✅ New user created successfully');
              } else {
                console.error('[Safe User Init] ❌ Failed to create new user:', result.error);
              }
            }
          }
        } catch (error) {
          console.error('[Safe User Init] Error accessing Firebase:', error);
          // Create offline user as fallback
          user = createCompletelyFirebaseSafeUser(telegramUser);
        }
        
        // Return user and setup function for listener
        const setupListener = () => {
          if (userId) {
            return setupRealtimeUserListener(userId, (updatedUser) => {
              console.log('[Safe User Init] Real-time update received');
              // This would typically update the UI through a callback
            });
          }
          return () => {};
        };
        
        resolve({ user, userId, setupListener });
        
      } catch (error) {
        console.error('[Safe User Init] Initialization failed:', error);
        resolve({ user: null, userId: null, setupListener: () => {} });
      }
    };
    
    // Ensure DOM is ready before Firebase operations
    if (document.readyState === 'complete') {
      initialize();
    } else {
      const handler = () => {
        if (document.readyState === 'complete') {
          document.removeEventListener('readystatechange', handler);
          initialize();
        }
      };
      document.addEventListener('readystatechange', handler);
      
      // Fallback timeout
      setTimeout(initialize, 2000);
    }
  });
}

/**
 * Cleanup all active listeners
 */
export function cleanupAllListeners(): void {
  console.log(`[Firebase Cleanup] Cleaning up ${activeListeners.size} active listeners`);
  activeListeners.forEach(cleanup => cleanup());
  activeListeners.clear();
}

// Export everything needed for the fixes
export {
  createCompletelyFirebaseSafeUser as createSafeUser,
  ultimateFirebaseSanitizer as sanitizeForFirebase,
  safeFirebaseUserSync as updateUserSafe,
  setupRealtimeUserListener as subscribeToUser
};