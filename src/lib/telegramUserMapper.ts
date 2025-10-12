/**
 * Telegram User Data Mapping Utilities
 * 
 * Safely maps between Telegram API field names (snake_case) and 
 * TypeScript interface field names (camelCase) with proper fallbacks.
 */

import { User } from '@/types';
import { TelegramUser } from './telegram';
import { UserData } from './telegramUser';

/**
 * Maps Telegram API user data to our User interface format
 * Handles field name conversion and provides safe defaults for undefined values
 */
export function mapTelegramUserToUser(telegramUser: TelegramUser | UserData | any): Partial<User> {
  // Ensure we have valid input
  if (!telegramUser) {
    return createDefaultUserData();
  }

  const userId = telegramUser.id?.toString() || '';
  
  return {
    id: userId,
    telegramId: userId,
    // Handle both camelCase and snake_case field names
    firstName: telegramUser.firstName || telegramUser.first_name || 'User',
    lastName: telegramUser.lastName || telegramUser.last_name || '',
    username: telegramUser.username || '',
    photoUrl: telegramUser.photoUrl || telegramUser.photo_url || '',
    profilePic: telegramUser.profilePic || telegramUser.photo_url || '',
    languageCode: telegramUser.languageCode || telegramUser.language_code || 'en',
    isPremium: telegramUser.isPremium || telegramUser.is_premium || false,
    // Default numeric values
    coins: 0,
    xp: 0,
    level: 1,
    vipTier: 'free',
    farmingMultiplier: 1,
    referralMultiplier: 1,
    adsLimitPerDay: 5,
    withdrawalLimit: 1000,
    minWithdrawal: 100,
    referralCount: 0,
    referralEarnings: 0,
    dailyStreak: 0,
    // Dates
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Creates a safe default user data object with no undefined values
 */
export function createDefaultUserData(userId?: string): Partial<User> {
  const defaultId = userId || `user_${Date.now()}`;
  
  return {
    id: defaultId,
    telegramId: defaultId,
    firstName: 'User',
    lastName: '',
    username: '',
    photoUrl: '',
    profilePic: '',
    languageCode: 'en',
    isPremium: false,
    coins: 0,
    xp: 0,
    level: 1,
    vipTier: 'free',
    farmingMultiplier: 1,
    referralMultiplier: 1,
    adsLimitPerDay: 5,
    withdrawalLimit: 1000,
    minWithdrawal: 100,
    referralCount: 0,
    referralEarnings: 0,
    dailyStreak: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Sanitizes user data for Firebase operations
 * Ensures no undefined values that could cause Firebase errors
 */
export function sanitizeUserDataForFirebase(userData: Partial<User>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  Object.entries(userData).forEach(([key, value]) => {
    if (value === undefined) {
      // Convert undefined to safe defaults based on field type
      switch (key) {
        case 'coins':
        case 'xp':
        case 'level':
        case 'farmingMultiplier':
        case 'referralMultiplier':
        case 'adsLimitPerDay':
        case 'withdrawalLimit':
        case 'minWithdrawal':
        case 'referralCount':
        case 'referralEarnings':
        case 'dailyStreak':
          sanitized[key] = 0;
          break;
        case 'vipTier':
          sanitized[key] = 'free';
          break;
        case 'isPremium':
          sanitized[key] = false;
          break;
        case 'createdAt':
        case 'updatedAt':
          sanitized[key] = new Date().toISOString();
          break;
        default:
          sanitized[key] = null;
      }
    } else if (value === null) {
      sanitized[key] = null;
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (typeof value === 'string') {
      sanitized[key] = value.trim() || null;
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Validates user data and fills missing required fields
 */
export function validateAndCompleteUserData(userData: Partial<User>): User {
  const defaults = createDefaultUserData();
  
  return {
    id: userData.id || defaults.id!,
    telegramId: userData.telegramId || userData.id || defaults.telegramId!,
    userId: userData.userId,
    username: userData.username ?? defaults.username!,
    firstName: userData.firstName ?? defaults.firstName!,
    lastName: userData.lastName ?? defaults.lastName!,
    profilePic: userData.profilePic ?? defaults.profilePic!,
    photoUrl: userData.photoUrl ?? defaults.photoUrl!,
    coins: userData.coins ?? defaults.coins!,
    xp: userData.xp ?? defaults.xp!,
    level: userData.level ?? defaults.level!,
    tier: userData.tier,
    vip_tier: userData.vip_tier,
    vip_expiry: userData.vip_expiry,
    vipTier: userData.vipTier ?? defaults.vipTier!,
    vipExpiry: userData.vipExpiry,
    vipEndTime: userData.vipEndTime,
    farmingMultiplier: userData.farmingMultiplier ?? defaults.farmingMultiplier!,
    referralMultiplier: userData.referralMultiplier ?? defaults.referralMultiplier!,
    multiplier: userData.multiplier,
    withdraw_limit: userData.withdraw_limit,
    referral_boost: userData.referral_boost,
    adsLimitPerDay: userData.adsLimitPerDay ?? defaults.adsLimitPerDay!,
    withdrawalLimit: userData.withdrawalLimit ?? defaults.withdrawalLimit!,
    minWithdrawal: userData.minWithdrawal ?? defaults.minWithdrawal!,
    referralCount: userData.referralCount ?? defaults.referralCount!,
    referralEarnings: userData.referralEarnings ?? defaults.referralEarnings!,
    referrerId: userData.referrerId,
    dailyStreak: userData.dailyStreak ?? defaults.dailyStreak!,
    lastClaimDate: userData.lastClaimDate,
    farmingStartTime: userData.farmingStartTime,
    farmingEndTime: userData.farmingEndTime,
    languageCode: userData.languageCode ?? defaults.languageCode!,
    isPremium: userData.isPremium ?? defaults.isPremium!,
    badges: userData.badges,
    createdAt: userData.createdAt ?? defaults.createdAt!,
    updatedAt: userData.updatedAt ?? defaults.updatedAt!
  };
}

/**
 * Safely converts Telegram API snake_case fields to camelCase
 */
export function convertTelegramFieldNames(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const converted: any = {};
  
  Object.entries(data).forEach(([key, value]) => {
    switch (key) {
      case 'first_name':
        converted.firstName = value;
        break;
      case 'last_name':
        converted.lastName = value;
        break;
      case 'photo_url':
        converted.photoUrl = value;
        break;
      case 'language_code':
        converted.languageCode = value;
        break;
      case 'is_premium':
        converted.isPremium = value;
        break;
      default:
        converted[key] = value;
    }
  });
  
  return converted;
}

/**
 * Creates a safe user object with guaranteed no undefined properties
 */
export function createSafeUser(input: any): User {
  const mapped = mapTelegramUserToUser(input);
  const validated = validateAndCompleteUserData(mapped);
  return validated;
}