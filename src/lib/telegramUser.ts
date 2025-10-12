import { realtimeDb } from './firebase';
import { ref, set, get } from 'firebase/database';

// Telegram WebApp user interface
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

// Clean user data for Firebase storage
export interface UserData {
  userId: number;
  firstName: string;
  lastName: string;
  username: string;
  photoUrl: string;
  languageCode: string;
  isPremium: boolean;
  createdAt: string;
  lastSeen: string;
}

/**
 * Safely get Telegram WebApp user data
 * Returns null if user is not available or invalid
 */
export function getTelegramUser(): TelegramUser | null {
  try {
    // Check if running in Telegram WebApp environment
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
      console.log('[TelegramUser] Not running in Telegram WebApp environment');
      return null;
    }

    const telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
    
    // Validate user data
    if (!telegramUser || !telegramUser.id || typeof telegramUser.id !== 'number' || telegramUser.id <= 0) {
      console.error('[TelegramUser] Invalid or missing Telegram user data');
      return null;
    }

    console.log('[TelegramUser] Valid Telegram user found:', telegramUser.id);
    return telegramUser;
  } catch (error) {
    console.error('[TelegramUser] Error accessing Telegram user data:', error);
    return null;
  }
}

/**
 * Convert Telegram user to minimal Firebase user data
 * Only stores essential fields - no extra device info or initData
 */
export function sanitizeUserData(telegramUser: TelegramUser): UserData {
  return {
    userId: telegramUser.id,
    firstName: telegramUser.first_name || 'Telegram User',
    lastName: '', // Minimal data - don't store last name
    username: telegramUser.username || '',
    photoUrl: '', // Minimal data - don't store photo URL
    languageCode: telegramUser.language_code || 'en',
    isPremium: false, // Minimal data - don't store premium status
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
}

/**
 * Save user data to Firebase Realtime Database
 * Path: users/{userId}
 */
export async function saveUserToFirebase(userData: UserData): Promise<boolean> {
  try {
    if (!realtimeDb) {
      console.error('[TelegramUser] Firebase Realtime Database not initialized');
      return false;
    }

    const userRef = ref(realtimeDb, `users/${userData.userId}`);
    
    // Check if user already exists
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      // Update only lastSeen for existing users
      const existingData = snapshot.val();
      await set(userRef, {
        ...existingData,
        lastSeen: userData.lastSeen,
      });
      console.log('[TelegramUser] Updated existing user:', userData.userId);
    } else {
      // Create new user
      await set(userRef, userData);
      console.log('[TelegramUser] Created new user:', userData.userId);
    }

    return true;
  } catch (error) {
    console.error('[TelegramUser] Failed to save user to Firebase:', error);
    return false;
  }
}

/**
 * Initialize and save Telegram user data
 * Main function to call on app start
 */
export async function initializeTelegramUser(): Promise<UserData | null> {
  try {
    // Get Telegram user data
    const telegramUser = getTelegramUser();
    
    if (!telegramUser) {
      console.log('[TelegramUser] No valid Telegram user found');
      return null;
    }

    // Sanitize user data
    const userData = sanitizeUserData(telegramUser);
    
    // Save to Firebase
    const saved = await saveUserToFirebase(userData);
    
    if (saved) {
      console.log('[TelegramUser] User initialization completed successfully');
      return userData;
    } else {
      console.error('[TelegramUser] Failed to save user to Firebase');
      return null;
    }
  } catch (error) {
    console.error('[TelegramUser] User initialization failed:', error);
    return null;
  }
}

/**
 * Update user's last seen timestamp
 */
export async function updateLastSeen(userId: number): Promise<boolean> {
  try {
    if (!realtimeDb) {
      console.error('[TelegramUser] Firebase Realtime Database not initialized');
      return false;
    }

    const userRef = ref(realtimeDb, `users/${userId}/lastSeen`);
    await set(userRef, new Date().toISOString());
    
    console.log('[TelegramUser] Updated last seen for user:', userId);
    return true;
  } catch (error) {
    console.error('[TelegramUser] Failed to update last seen:', error);
    return false;
  }
}