/**
 * Simplified Telegram to Firebase User Sync Service
 * 
 * Handles syncing user data from Telegram WebApp to Firebase Realtime Database.
 */

import { getTelegramUser, sanitizeUserData, saveUserToFirebase } from './telegramUser';

export interface SyncResult {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

/**
 * Auto-sync user data on app load
 */
export async function autoSyncUserOnAppLoad(): Promise<SyncResult> {
  try {
    console.log('[TelegramUserSync] Starting auto-sync on app load...');

    // Get Telegram user data
    const telegramUser = getTelegramUser();
    
    if (!telegramUser) {
      return {
        success: false,
        message: 'No Telegram user data available'
      };
    }

    // Sanitize and save user data
    const userData = sanitizeUserData(telegramUser);
    const saved = await saveUserToFirebase(userData);

    if (saved) {
      return {
        success: true,
        message: 'User data synced successfully',
        userId: userData.userId.toString()
      };
    } else {
      return {
        success: false,
        message: 'Failed to save user data to Firebase'
      };
    }
  } catch (error) {
    console.error('[TelegramUserSync] Auto-sync failed:', error);
    return {
      success: false,
      message: 'Auto-sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Manual sync user data
 */
export async function syncUserData(): Promise<SyncResult> {
  return autoSyncUserOnAppLoad();
}