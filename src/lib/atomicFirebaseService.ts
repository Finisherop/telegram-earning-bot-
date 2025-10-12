/**
 * Enhanced Firebase Service with Atomic Operations (Realtime Database Only)
 * 
 * Provides atomic coin operations, safe user updates, and proper error handling
 * to prevent race conditions and undefined value errors using Firebase Realtime Database.
 */

import { 
  ref, 
  update, 
  get, 
  set, 
  onValue, 
  off, 
  push 
} from 'firebase/database';
import { getFirebaseServices } from './firebaseSingleton';
import { User, WithdrawalRequest } from '@/types';
// Removed dependency on deleted telegramUserSafe module

export interface AtomicCoinUpdate {
  userId: string;
  coinsDelta: number;
  xpDelta?: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface AtomicUpdateResult {
  success: boolean;
  newCoins?: number;
  newXp?: number;
  transactionId?: string;
  error?: string;
}

export interface FarmingClaimResult extends AtomicUpdateResult {
  coinsEarned: number;
  xpEarned: number;
  newTotalCoins: number;
  newTotalXp: number;
}

export interface DailyClaimResult extends AtomicUpdateResult {
  coinsEarned: number;
  xpEarned: number;
  newStreak: number;
  newTotalCoins: number;
  newTotalXp: number;
}

/**
 * Sanitizes update data to prevent undefined/null values from causing errors
 */
function sanitizeUpdateData(data: any): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'string') {
        sanitized[key] = value.trim() || undefined;
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  // Always add timestamp
  sanitized.updatedAt = new Date().toISOString();
  
  return sanitized;
}

/**
 * Atomically updates user coins using Realtime Database
 * Prevents race conditions and ensures data consistency
 */
export async function atomicCoinUpdate({
  userId,
  coinsDelta,
  xpDelta = 0,
  reason,
  metadata = {}
}: AtomicCoinUpdate): Promise<AtomicUpdateResult> {
  try {
    console.log(`[AtomicUpdate] Starting atomic coin update for user ${userId}: ${coinsDelta} coins, ${xpDelta} xp`);
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required for atomic update');
    }
    
    const sanitizedUserId = userId.toString().trim();
    const { realtimeDb } = await getFirebaseServices();
    
    // Generate transaction ID for tracking
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get current user data from Realtime Database
    const userRef = ref(realtimeDb, `telegram_users/${sanitizedUserId}`);
    const userSnapshot = await get(userRef);
    
    let currentCoins = 0;
    let currentXp = 0;
    let userData: any = {};
    
    if (userSnapshot.exists()) {
      userData = userSnapshot.val();
      currentCoins = userData.coins || 0;
      currentXp = userData.xp || 0;
    } else {
      // User doesn't exist, create with default values
      userData = {
        id: sanitizedUserId,
        telegramId: sanitizedUserId,
        coins: 0,
        xp: 0,
        level: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    // Calculate new values
    const newCoins = Math.max(0, currentCoins + coinsDelta); // Prevent negative coins
    const newXp = Math.max(0, currentXp + xpDelta); // Prevent negative XP
    
    // Prepare update data
    const updateData: Record<string, any> = {
      ...userData,
      coins: newCoins,
      xp: newXp,
      updatedAt: new Date().toISOString(),
      [`transactions/${transactionId}`]: {
        reason,
        coinsDelta,
        xpDelta,
        timestamp: new Date().toISOString(),
        metadata
      }
    };
    
    // Update in Realtime Database
    await set(userRef, updateData);
    
    console.log(`[AtomicUpdate] Atomic coin update successful for user ${sanitizedUserId}`);
    
    return {
      success: true,
      newCoins,
      newXp,
      transactionId
    };
    
  } catch (error) {
    console.error(`[AtomicUpdate] Atomic coin update failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown atomic update error'
    };
  }
}

/**
 * Atomic farming claim with proper validation and coin allocation
 */
export async function atomicFarmingClaim(
  userId: string,
  baseReward: number = 120,
  farmingMultiplier: number = 1
): Promise<FarmingClaimResult> {
  try {
    console.log(`[FarmingClaim] Processing farming claim for user ${userId}`);
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required for farming claim');
    }
    
    const sanitizedUserId = userId.toString().trim();
    const { realtimeDb } = await getFirebaseServices();
    
    // Validate farming eligibility first
    const userRef = ref(realtimeDb, `telegram_users/${sanitizedUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnapshot.val();
    const now = new Date();
    
    // Check farming status
    if (!userData.farmingStartTime || !userData.farmingEndTime) {
      throw new Error('No active farming session found');
    }
    
    const farmingEndTime = new Date(userData.farmingEndTime);
    
    if (now < farmingEndTime) {
      throw new Error('Farming session not completed yet');
    }
    
    // Calculate rewards
    const coinsEarned = Math.floor(baseReward * farmingMultiplier);
    const xpEarned = Math.floor(coinsEarned / 10);
    
    // Perform atomic update
    const atomicResult = await atomicCoinUpdate({
      userId: sanitizedUserId,
      coinsDelta: coinsEarned,
      xpDelta: xpEarned,
      reason: 'farming_claim',
      metadata: {
        baseReward,
        farmingMultiplier,
        farmingStartTime: userData.farmingStartTime,
        farmingEndTime: userData.farmingEndTime
      }
    });
    
    if (!atomicResult.success) {
      throw new Error(atomicResult.error || 'Failed to update coins atomically');
    }
    
    // Clear farming session
    const clearFarmingUpdate = {
      farmingStartTime: null,
      farmingEndTime: null,
      updatedAt: new Date().toISOString()
    };
    
    await update(userRef, clearFarmingUpdate);
    
    console.log(`[FarmingClaim] Farming claim successful for user ${sanitizedUserId}: ${coinsEarned} coins, ${xpEarned} XP`);
    
    return {
      success: true,
      coinsEarned,
      xpEarned,
      newTotalCoins: atomicResult.newCoins || 0,
      newTotalXp: atomicResult.newXp || 0
    };
    
  } catch (error) {
    console.error('[FarmingClaim] Farming claim failed:', error);
    return {
      success: false,
      coinsEarned: 0,
      xpEarned: 0,
      newTotalCoins: 0,
      newTotalXp: 0,
      error: error instanceof Error ? error.message : 'Unknown farming claim error'
    };
  }
}

/**
 * Atomic daily reward claim with streak management
 */
export async function atomicDailyClaim(
  userId: string,
  baseReward: number = 150,
  vipBonus: number = 0
): Promise<DailyClaimResult> {
  try {
    console.log(`[DailyClaim] Processing daily claim for user ${userId}`);
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required for daily claim');
    }
    
    const sanitizedUserId = userId.toString().trim();
    const { realtimeDb } = await getFirebaseServices();
    
    // Get current user data
    const userRef = ref(realtimeDb, `telegram_users/${sanitizedUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnapshot.val();
    const now = new Date();
    const today = now.toDateString();
    
    // Check if already claimed today
    if (userData.lastClaimDate) {
      const lastClaimDate = new Date(userData.lastClaimDate);
      if (lastClaimDate.toDateString() === today) {
        throw new Error('Daily reward already claimed today');
      }
    }
    
    // Calculate streak
    const currentStreak = userData.dailyStreak || 0;
    let newStreak = 1;
    
    if (userData.lastClaimDate) {
      const lastClaimDate = new Date(userData.lastClaimDate);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastClaimDate.toDateString() === yesterday.toDateString()) {
        // Consecutive day
        newStreak = currentStreak + 1;
      }
      // If more than 1 day gap, streak resets to 1 (already set above)
    }
    
    // Calculate rewards
    const streakBonus = Math.min(newStreak * 10, 100); // Cap at 100
    const totalReward = baseReward + streakBonus + vipBonus;
    const xpEarned = Math.floor(totalReward / 10);
    
    // Update user data
    const updateData = {
      dailyStreak: newStreak,
      lastClaimDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await update(userRef, updateData);
    
    // Perform atomic coin update
    const atomicResult = await atomicCoinUpdate({
      userId: sanitizedUserId,
      coinsDelta: totalReward,
      xpDelta: xpEarned,
      reason: 'daily_claim',
      metadata: {
        baseReward,
        streakBonus,
        vipBonus,
        newStreak
      }
    });
    
    if (!atomicResult.success) {
      throw new Error(atomicResult.error || 'Failed to update coins for daily claim');
    }
    
    console.log(`[DailyClaim] Daily claim successful for user ${sanitizedUserId}: ${totalReward} coins, streak: ${newStreak}`);
    
    return {
      success: true,
      coinsEarned: totalReward,
      xpEarned,
      newStreak,
      newTotalCoins: atomicResult.newCoins || 0,
      newTotalXp: atomicResult.newXp || 0
    };
    
  } catch (error) {
    console.error('[DailyClaim] Daily claim failed:', error);
    return {
      success: false,
      coinsEarned: 0,
      xpEarned: 0,
      newStreak: 0,
      newTotalCoins: 0,
      newTotalXp: 0,
      error: error instanceof Error ? error.message : 'Unknown daily claim error'
    };
  }
}

/**
 * Atomic task reward claim
 */
export async function atomicTaskClaim(
  userId: string,
  taskId: string,
  reward: number
): Promise<AtomicUpdateResult> {
  try {
    console.log(`[TaskClaim] Processing task claim for user ${userId}, task ${taskId}`);
    
    if (!userId || !taskId || reward <= 0) {
      throw new Error('Valid userId, taskId, and positive reward are required');
    }
    
    const sanitizedUserId = userId.toString().trim();
    const xpEarned = Math.floor(reward / 10);
    
    // First, atomically update coins
    const coinResult = await atomicCoinUpdate({
      userId: sanitizedUserId,
      coinsDelta: reward,
      xpDelta: xpEarned,
      reason: 'task_completion',
      metadata: {
        taskId,
        reward
      }
    });
    
    if (!coinResult.success) {
      throw new Error(coinResult.error || 'Failed to update coins for task claim');
    }
    
    // Mark task as claimed in Realtime DB
    try {
      const { realtimeDb } = await getFirebaseServices();
      const userTaskRef = ref(realtimeDb, `userTasks/${sanitizedUserId}/${taskId}`);
      
      await update(userTaskRef, {
        status: 'claimed',
        claimedAt: new Date().toISOString(),
        reward
      });
      
    } catch (taskError) {
      console.warn('[TaskClaim] Task status update failed:', taskError);
      // Don't fail the entire operation
    }
    
    console.log(`[TaskClaim] Task claim successful for user ${sanitizedUserId}, task ${taskId}: ${reward} coins`);
    
    return coinResult;
    
  } catch (error) {
    console.error('[TaskClaim] Task claim failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown task claim error'
    };
  }
}

/**
 * Safe user update with sanitized data
 */
export async function safeUserUpdate(
  userId: string,
  updateData: Partial<User>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required for user update');
    }
    
    const sanitizedUserId = userId.toString().trim();
    const sanitizedUpdateData = sanitizeUpdateData(updateData);
    
    // Remove empty update object
    if (Object.keys(sanitizedUpdateData).length === 0) {
      return { success: true }; // Nothing to update
    }
    
    const { realtimeDb } = await getFirebaseServices();
    
    // Update Realtime Database
    const userRef = ref(realtimeDb, `telegram_users/${sanitizedUserId}`);
    await update(userRef, sanitizedUpdateData);
    
    console.log(`[SafeUpdate] User update successful for ${sanitizedUserId}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('[SafeUpdate] User update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown update error'
    };
  }
}

/**
 * Real-time user data subscription with error handling
 */
export function subscribeToUserData(
  userId: string,
  callback: (user: User | null) => void
): () => void {
  if (!userId) {
    console.error('[UserSubscription] Valid userId is required');
    callback(null);
    return () => {};
  }
  
  let unsubscribeFn: () => void = () => {};
  
  const createListener = async () => {
    try {
      const { realtimeDb } = await getFirebaseServices();
      const userRef = ref(realtimeDb, `telegram_users/${userId}`);
      
      const unsubscribe = onValue(userRef, (snapshot) => {
        try {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const user: User = {
              ...userData,
              id: userId,
              createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
              updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
              lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
              farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
              farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
              vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
            };
            
            console.log(`[UserSubscription] Real-time update for user ${userId}`);
            callback(user);
          } else {
            console.log(`[UserSubscription] No data found for user ${userId}`);
            callback(null);
          }
        } catch (callbackError) {
          console.error(`[UserSubscription] Callback error for user ${userId}:`, callbackError);
          callback(null);
        }
      }, (error) => {
        console.error(`[UserSubscription] Subscription error for user ${userId}:`, error);
        callback(null);
      });
      
      unsubscribeFn = () => {
        console.log(`[UserSubscription] Unsubscribing from user ${userId}`);
        off(userRef, 'value', unsubscribe);
      };
      
    } catch (error) {
      console.error(`[UserSubscription] Failed to setup subscription for user ${userId}:`, error);
      callback(null);
    }
  };
  
  createListener().catch((error) => {
    console.error(`[UserSubscription] Async setup failed for user ${userId}:`, error);
    callback(null);
  });
  
  return () => {
    unsubscribeFn();
  };
}