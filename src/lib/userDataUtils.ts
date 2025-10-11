/**
 * Utility functions for safe user data handling
 * Prevents undefined values from causing Firebase errors
 */

import { User } from '@/types';

export interface SafeUserData {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePic: string;
  coins: number;
  xp: number;
  level: number;
  vipTier: 'free' | 'vip1' | 'vip2';
  referralCount: number;
  referralEarnings: number;
  dailyStreak: number;
  farmingMultiplier: number;
  referralMultiplier: number;
  adsLimitPerDay: number;
  withdrawalLimit: number;
  minWithdrawal: number;
  createdAt: Date;
  updatedAt: Date;
  farmingStartTime?: Date;
  farmingEndTime?: Date;
  lastClaimDate?: Date;
  vipEndTime?: Date;
  referrerId?: string;
}

/**
 * Safely extract user ID from various possible user data formats
 */
export function getSafeUserId(user: any): string | null {
  if (!user) {
    console.error('[UserDataUtils] User object is null or undefined');
    return null;
  }

  // Try different possible ID field names
  const possibleIds = [
    user.id,
    user.userId, 
    user.telegramId,
    user.telegram_id,
    user.user_id
  ];

  for (const id of possibleIds) {
    if (id !== undefined && id !== null) {
      const stringId = id.toString().trim();
      if (stringId && stringId !== '' && stringId !== '0') {
        return stringId;
      }
    }
  }

  console.error('[UserDataUtils] No valid user ID found in user object:', user);
  return null;
}

/**
 * Safely extract numeric user ID for Telegram API calls
 */
export function getSafeNumericUserId(user: any): number | null {
  const userId = getSafeUserId(user);
  
  if (!userId) {
    return null;
  }

  const numericId = parseInt(userId);
  
  if (isNaN(numericId) || numericId <= 0) {
    console.error('[UserDataUtils] Invalid numeric user ID:', userId);
    return null;
  }

  return numericId;
}

/**
 * Sanitize user data to ensure no undefined values before Firebase operations
 */
export function sanitizeUserForFirebase(user: Partial<User>): Partial<SafeUserData> {
  const sanitized: Partial<SafeUserData> = {};

  // Required fields with safe defaults
  if (user.id !== undefined) sanitized.id = user.id.toString();
  if (user.telegramId !== undefined) sanitized.telegramId = user.telegramId.toString();
  
  // String fields - replace undefined with empty string
  sanitized.username = user.username || '';
  sanitized.firstName = user.firstName || 'User';
  sanitized.lastName = user.lastName || '';
  sanitized.profilePic = user.profilePic || '';
  sanitized.referrerId = user.referrerId || '';

  // Numeric fields - replace undefined with safe defaults
  sanitized.coins = user.coins ?? 0;
  sanitized.xp = user.xp ?? 0;
  sanitized.level = user.level ?? 1;
  sanitized.referralCount = user.referralCount ?? 0;
  sanitized.referralEarnings = user.referralEarnings ?? 0;
  sanitized.dailyStreak = user.dailyStreak ?? 0;
  sanitized.farmingMultiplier = user.farmingMultiplier ?? 1.0;
  sanitized.referralMultiplier = user.referralMultiplier ?? 1.0;
  sanitized.adsLimitPerDay = user.adsLimitPerDay ?? 5;
  sanitized.withdrawalLimit = user.withdrawalLimit ?? 1;
  sanitized.minWithdrawal = user.minWithdrawal ?? 200;

  // VIP tier with safe default
  sanitized.vipTier = user.vipTier || 'free';

  // Date fields - only include if valid
  if (user.createdAt) sanitized.createdAt = user.createdAt;
  if (user.updatedAt) sanitized.updatedAt = user.updatedAt;
  if (user.farmingStartTime) sanitized.farmingStartTime = user.farmingStartTime;
  if (user.farmingEndTime) sanitized.farmingEndTime = user.farmingEndTime;
  if (user.lastClaimDate) sanitized.lastClaimDate = user.lastClaimDate;
  if (user.vipEndTime) sanitized.vipEndTime = user.vipEndTime;

  return sanitized;
}

/**
 * Validate user data before API operations
 */
export function validateUserData(user: any): { isValid: boolean; error: string | null; userId: string | null } {
  if (!user) {
    return { isValid: false, error: 'User object is required', userId: null };
  }

  const userId = getSafeUserId(user);
  
  if (!userId) {
    return { isValid: false, error: 'Valid user ID is required', userId: null };
  }

  return { isValid: true, error: null, userId };
}

/**
 * Create safe payment request data
 */
export function createSafePaymentData(user: any, tier: string, amount: number): { isValid: boolean; data: any; error?: string } {
  const validation = validateUserData(user);
  
  if (!validation.isValid) {
    return { isValid: false, data: null, error: validation.error || 'Invalid user data' };
  }

  const numericUserId = getSafeNumericUserId(user);
  
  if (!numericUserId) {
    return { isValid: false, data: null, error: 'Valid numeric user ID required for payment' };
  }

  return {
    isValid: true,
    data: {
      userId: numericUserId,
      tier,
      amount,
      userIdString: validation.userId,
      username: user.username || '',
      firstName: user.firstName || 'User'
    }
  };
}

/**
 * Safe wrapper for API calls that require user ID
 */
export function withSafeUserId<T>(user: any, callback: (userId: string) => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const validation = validateUserData(user);
    
    if (!validation.isValid) {
      reject(new Error(validation.error || 'Invalid user data'));
      return;
    }

    callback(validation.userId!)
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Log safe user info for debugging (excluding sensitive data)
 */
export function logSafeUserInfo(user: any, context: string = '') {
  const userId = getSafeUserId(user);
  const username = user?.username || 'unknown';
  const firstName = user?.firstName || 'unknown';
  
  console.log(`[${context}] User: ${userId} (${username}/${firstName})`);
}