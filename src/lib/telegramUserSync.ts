/**
 * Telegram to Firebase User Sync Service (Realtime Database Only)
 * 
 * Handles syncing user data from Telegram WebApp to Firebase Realtime Database with proper
 * sanitization, error handling, and atomic operations.
 */

import { 
  ref, 
  set, 
  update, 
  get, 
  serverTimestamp as realtimeServerTimestamp 
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { 
  getTelegramUserSafe, 
  sanitizeUserForFirebase, 
  getUserIdForFirebase,
  isValidTelegramUser,
  getReferralParamSafe,
  SafeTelegramUser 
} from './telegramUserSafe';
import { User } from '@/types';
import { VIP_TIERS } from './constants';

export interface SyncResult {
  success: boolean;
  userId: string | null;
  isNewUser: boolean;
  errors: string[];
  warnings: string[];
  realtimeDbSync: boolean;
}

export interface SyncOptions {
  enableRealtimeDb: boolean;
  createIfNotExists: boolean;
  mergeData: boolean;
  syncToPath: string; // Realtime DB path
}

const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  enableRealtimeDb: true,
  createIfNotExists: true,
  mergeData: true,
  syncToPath: 'telegram_users'
};

/**
 * Sanitizes user data payload before Firebase write operations
 * Removes undefined values and converts dates to proper formats
 */
function sanitizeFirebasePayload(data: any): any {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      // Skip undefined values completely
      continue;
    }
    
    if (value === null) {
      sanitized[key] = null;
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (typeof value === 'string') {
      sanitized[key] = value.trim() || null; // Empty strings become null
    } else if (typeof value === 'number' && !isNaN(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeFirebasePayload(value);
    } else {
      // Convert other types to string
      sanitized[key] = String(value);
    }
  }
  
  return sanitized;
}

/**
 * Creates a User object from Telegram user data with safe defaults
 */
function createUserFromTelegramData(telegramUser: SafeTelegramUser, referralId?: string): User {
  const now = new Date();
  const userId = getUserIdForFirebase(telegramUser);
  
  if (!userId) {
    throw new Error('Unable to generate valid user ID from Telegram data');
  }

  return {
    id: userId,
    telegramId: userId,
    username: telegramUser.username || undefined,
    firstName: telegramUser.first_name || 'User',
    lastName: telegramUser.last_name || undefined,
    profilePic: telegramUser.photo_url || undefined,
    // Default game values
    coins: 0,
    xp: 0,
    level: 1,
    
    // VIP status
    vipTier: 'free',
    farmingMultiplier: VIP_TIERS.free.farmingMultiplier,
    referralMultiplier: VIP_TIERS.free.referralMultiplier,
    adsLimitPerDay: VIP_TIERS.free.adsLimitPerDay,
    withdrawalLimit: VIP_TIERS.free.withdrawalLimit,
    minWithdrawal: VIP_TIERS.free.minWithdrawal,
    vipEndTime: undefined,
    
    // Referrals
    referrerId: referralId || undefined,
    referralCount: 0,
    referralEarnings: 0,
    
    // Game state
    dailyStreak: 0,
    farmingStartTime: undefined,
    farmingEndTime: undefined,
    lastClaimDate: undefined,
    
    // Timestamps
    createdAt: now,
    updatedAt: now,
    
    // Telegram specific
  };
}

/**
 * Updates existing user data with new Telegram information
 */
function updateUserWithTelegramData(existingUser: User, telegramUser: SafeTelegramUser): Partial<User> {
  const updates: Partial<User> = {
    // Always update these fields from Telegram
    username: telegramUser.username || existingUser.username,
    firstName: telegramUser.first_name || existingUser.firstName,
    lastName: telegramUser.last_name || existingUser.lastName,
    profilePic: telegramUser.photo_url || existingUser.profilePic,
    // Update timestamps
    updatedAt: new Date()
  };

  return updates;
}

/**
 * Syncs user data to Realtime Database only
 */
async function syncToRealtimeDbOnly(
  userId: string, 
  userData: User, 
  isNewUser: boolean, 
  options: SyncOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!realtimeDb) {
      throw new Error('Realtime Database not initialized');
    }
    
    const userRef = ref(realtimeDb, `${options.syncToPath}/${userId}`);
    
    // Sanitize data for Realtime Database
    const sanitizedData = sanitizeFirebasePayload(userData);
    
    if (isNewUser) {
      // Set complete user data
      await set(userRef, {
        ...sanitizedData,
        createdAt: realtimeServerTimestamp(),
        updatedAt: realtimeServerTimestamp()
      });
    } else {
      // Update existing data
      await update(userRef, {
        ...sanitizedData,
        updatedAt: realtimeServerTimestamp()
      });
    }
    
    console.log(`[UserSync] Realtime DB sync successful for user ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[UserSync] Realtime DB sync failed for user ${userId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown Realtime DB error' 
    };
  }
}

/**
 * Checks if user exists in Realtime Database only
 */
async function checkUserExists(userId: string, options: SyncOptions): Promise<{
  realtimeExists: boolean;
  realtimeUser?: User;
}> {
  const result = {
    realtimeExists: false,
    realtimeUser: undefined as User | undefined
  };

  try {
    if (!realtimeDb) {
      console.warn('[UserSync] Realtime Database not initialized');
      return result;
    }

    // Check Realtime Database
    if (options.enableRealtimeDb) {
      try {
        const realtimeSnapshot = await get(ref(realtimeDb, `${options.syncToPath}/${userId}`));
        if (realtimeSnapshot.exists()) {
          result.realtimeExists = true;
          const data = realtimeSnapshot.val();
          result.realtimeUser = {
            ...data,
            id: userId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            lastClaimDate: data.lastClaimDate ? new Date(data.lastClaimDate) : undefined,
            farmingStartTime: data.farmingStartTime ? new Date(data.farmingStartTime) : undefined,
            farmingEndTime: data.farmingEndTime ? new Date(data.farmingEndTime) : undefined,
            vipEndTime: data.vipEndTime ? new Date(data.vipEndTime) : undefined,
            capturedAt: data.capturedAt ? new Date(data.capturedAt) : new Date()
          } as User;
        }
      } catch (realtimeError) {
        console.warn(`[UserSync] Realtime DB check failed for user ${userId}:`, realtimeError);
      }
    }

  } catch (error) {
    console.error(`[UserSync] User existence check failed for user ${userId}:`, error);
  }

  return result;
}

/**
 * Main function to sync Telegram user to Firebase Realtime Database
 * Automatically captures current Telegram user and syncs to Realtime Database
 */
export async function syncTelegramUserToFirebase(
  customOptions?: Partial<SyncOptions>
): Promise<SyncResult> {
  const options = { ...DEFAULT_SYNC_OPTIONS, ...customOptions };
  const result: SyncResult = {
    success: false,
    userId: null,
    isNewUser: false,
    errors: [],
    warnings: [],
    realtimeDbSync: false
  };

  try {
    console.log('[UserSync] Starting Telegram user sync to Firebase Realtime Database...');

    // Step 1: Capture Telegram user data safely
    const telegramUser = getTelegramUserSafe();
    const userId = getUserIdForFirebase(telegramUser);
    
    if (!userId) {
      result.errors.push('Unable to generate valid user ID from Telegram data');
      return result;
    }
    
    result.userId = userId;
    console.log(`[UserSync] Processing user sync for ID: ${userId} (${telegramUser.source})`);

    // Step 2: Check if user exists in Realtime Database
    const existingUserCheck = await checkUserExists(userId, options);
    const userExists = existingUserCheck.realtimeExists;
    result.isNewUser = !userExists;

    // Step 3: Prepare user data
    let userData: User;
    
    if (result.isNewUser && options.createIfNotExists) {
      // Create new user
      const referralParam = getReferralParamSafe() || undefined;
      userData = createUserFromTelegramData(telegramUser, referralParam);
      console.log(`[UserSync] Creating new user ${userId} with referral: ${referralParam}`);
      
    } else if (userExists) {
      // Update existing user
      const existingUser = existingUserCheck.realtimeUser;
      if (!existingUser) {
        result.errors.push('User exists but data could not be retrieved');
        return result;
      }
      
      const updates = updateUserWithTelegramData(existingUser, telegramUser);
      userData = { ...existingUser, ...updates };
      console.log(`[UserSync] Updating existing user ${userId}`);
      
    } else {
      result.warnings.push('User does not exist and createIfNotExists is false');
      return result;
    }

    // Step 4: Sync to Realtime Database only
    if (options.enableRealtimeDb) {
      const realtimeResult = await syncToRealtimeDbOnly(userId, userData, result.isNewUser, options);
      result.realtimeDbSync = realtimeResult.success;
      if (realtimeResult.error) {
        result.errors.push(`Realtime DB: ${realtimeResult.error}`);
      }
    }

    // Step 5: Determine overall success
    result.success = result.realtimeDbSync;

    if (result.success) {
      console.log(`[UserSync] User sync completed successfully for ${userId}`);
    } else {
      console.error(`[UserSync] User sync failed for ${userId}:`, result.errors);
    }

    return result;

  } catch (error) {
    console.error('[UserSync] Sync operation failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    return result;
  }
}

/**
 * Syncs a specific Telegram user to Firebase Realtime Database
 */
export async function syncSpecificUserToFirebase(
  telegramUser: SafeTelegramUser,
  customOptions?: Partial<SyncOptions>
): Promise<SyncResult> {
  const options = { ...DEFAULT_SYNC_OPTIONS, ...customOptions };
  const result: SyncResult = {
    success: false,
    userId: null,
    isNewUser: false,
    errors: [],
    warnings: [],
    realtimeDbSync: false
  };

  try {
    const userId = getUserIdForFirebase(telegramUser);
    
    if (!userId) {
      result.errors.push('Unable to generate valid user ID from provided Telegram data');
      return result;
    }

    result.userId = userId;

    // Check if user exists
    const existingUserCheck = await checkUserExists(userId, options);
    const userExists = existingUserCheck.realtimeExists;
    result.isNewUser = !userExists;

    // Prepare user data
    let userData: User;
    
    if (result.isNewUser && options.createIfNotExists) {
      userData = createUserFromTelegramData(telegramUser);
    } else if (userExists) {
      const existingUser = existingUserCheck.realtimeUser;
      if (!existingUser) {
        result.errors.push('User exists but data could not be retrieved');
        return result;
      }
      
      const updates = updateUserWithTelegramData(existingUser, telegramUser);
      userData = { ...existingUser, ...updates };
    } else {
      result.warnings.push('User does not exist and createIfNotExists is false');
      return result;
    }

    // Sync to Realtime Database only
    if (options.enableRealtimeDb) {
      const realtimeResult = await syncToRealtimeDbOnly(userId, userData, result.isNewUser, options);
      result.realtimeDbSync = realtimeResult.success;
      if (realtimeResult.error) {
        result.errors.push(`Realtime DB: ${realtimeResult.error}`);
      }
    }

    result.success = result.realtimeDbSync;

    return result;

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    return result;
  }
}

/**
 * Auto-sync user data on app load
 * Call this function when the app starts to ensure user data is synced
 */
export async function autoSyncUserOnAppLoad(): Promise<SyncResult> {
  console.log('[UserSync] Auto-syncing user data on app load...');
  
  return syncTelegramUserToFirebase({
    enableRealtimeDb: true,
    createIfNotExists: true,
    mergeData: true,
    syncToPath: 'telegram_users'
  });
}

/**
 * Force update user profile from Telegram
 */
export async function updateUserProfileFromTelegram(): Promise<SyncResult> {
  console.log('[UserSync] Force updating user profile from Telegram...');
  
  return syncTelegramUserToFirebase({
    enableRealtimeDb: true,
    createIfNotExists: false, // Don't create if not exists, only update
    mergeData: true,
    syncToPath: 'telegram_users'
  });
}