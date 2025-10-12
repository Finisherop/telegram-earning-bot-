/**
 * Telegram WebApp User Data Writer for Firebase Realtime Database
 * 
 * Captures Telegram user data safely and writes it to Firebase.
 * Automatically creates new users if they don't exist in Firebase.
 * 
 * Requirements:
 * 1. Capture Telegram user safely using window.Telegram.WebApp
 * 2. Show error if user not detected
 * 3. Connect to Firebase Realtime Database
 * 4. Check if user exists, if not create new user
 * 5. Clear console logging for all operations
 * 6. Only work when app is opened inside Telegram WebApp
 * 7. Optimize for real-time sync and fast write performance
 */

import { ref, get, set, update } from 'firebase/database';
import { realtimeDb } from './firebase';

// Types for Telegram WebApp
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  version?: string;
  platform?: string;
  ready?: () => void;
  expand?: () => void;
}

// New user data structure for Firebase
interface FirebaseUserData {
  userId: number;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
  coins: number;
  xp?: number;
  level?: number;
  vipTier?: string;
  referralCount?: number;
  joinedAt: string;
  updatedAt: string;
  lastSeen: string;
}

/**
 * Safely capture Telegram WebApp user data
 * Returns user object or null if not available
 */
function captureTelegramUser(): TelegramUser | null {
  try {
    // Check if running in browser environment
    if (typeof window === 'undefined') {
      console.log("Server-side rendering detected, Telegram user not available");
      return null;
    }

    // Get Telegram WebApp instance
    const tg = (window as any).Telegram?.WebApp as TelegramWebApp;
    
    if (!tg) {
      console.error("Telegram user not found");
      return null;
    }

    // Get user data from initDataUnsafe
    const user = tg.initDataUnsafe?.user;
    
    if (!user) {
      console.error("Telegram user not found");
      return null;
    }

    // Validate user data
    if (!user.id || typeof user.id !== 'number' || user.id <= 0) {
      console.error("Telegram user not found");
      return null;
    }

    if (!user.first_name || typeof user.first_name !== 'string') {
      console.error("Telegram user not found");
      return null;
    }

    console.log("Telegram user found and validated:", user.id);
    return user;
    
  } catch (error) {
    console.error("Telegram user not found");
    return null;
  }
}

/**
 * Get Firebase Database instance
 * Uses the Firebase config from the existing project
 */
function getFirebaseDatabase() {
  try {
    // Use the existing Firebase instance from the project
    if (!realtimeDb) {
      console.error("Error writing data to Firebase");
      throw new Error('Firebase Realtime Database not initialized');
    }
    
    return realtimeDb;
  } catch (error) {
    console.error("Error writing data to Firebase");
    throw error;
  }
}

/**
 * Check if user exists in Firebase Realtime Database
 */
async function checkUserExists(db: any, userId: number): Promise<boolean> {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error writing data to Firebase");
    throw error;
  }
}

/**
 * Create new user in Firebase Realtime Database
 */
async function createNewUser(db: any, telegramUser: TelegramUser): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    const newUserData: FirebaseUserData = {
      userId: telegramUser.id,
      username: telegramUser.username || "unknown",
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      photoUrl: telegramUser.photo_url,
      languageCode: telegramUser.language_code,
      isPremium: telegramUser.is_premium || false,
      coins: 0,
      xp: 0,
      level: 1,
      vipTier: 'free',
      referralCount: 0,
      joinedAt: now,
      updatedAt: now,
      lastSeen: now
    };

    const userRef = ref(db, `users/${telegramUser.id}`);
    await set(userRef, newUserData);
    
    console.log("New user created successfully");
  } catch (error) {
    console.error("Error writing data to Firebase");
    throw error;
  }
}

/**
 * Update existing user data in Firebase
 */
async function updateExistingUser(db: any, telegramUser: TelegramUser): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    const updateData = {
      username: telegramUser.username || "unknown",
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      photoUrl: telegramUser.photo_url,
      languageCode: telegramUser.language_code,
      isPremium: telegramUser.is_premium || false,
      updatedAt: now,
      lastSeen: now
    };

    const userRef = ref(db, `users/${telegramUser.id}`);
    await update(userRef, updateData);
    
    console.log("User found and updated");
  } catch (error) {
    console.error("Error writing data to Firebase");
    throw error;
  }
}

/**
 * Main function to write Telegram user data to Firebase
 * This is the primary function that should be called by the app
 */
export async function writeTelegramUserToFirebase(): Promise<boolean> {
  try {
    // Step 1: Capture Telegram user safely
    const user = captureTelegramUser();
    
    if (!user) {
      // Error message already logged in captureTelegramUser
      return false;
    }

    // Step 2: Connect to Firebase Realtime Database
    const db = getFirebaseDatabase();
    
    if (!db) {
      console.error("Error writing data to Firebase");
      return false;
    }

    // Step 3: Check if user exists in Firebase
    const userExists = await checkUserExists(db, user.id);
    
    if (userExists) {
      // Step 4a: Update existing user
      await updateExistingUser(db, user);
    } else {
      // Step 4b: Create new user
      await createNewUser(db, user);
    }

    return true;

  } catch (error) {
    console.error("Error writing data to Firebase");
    return false;
  }
}

/**
 * Convenience function to write user data with additional data
 * Allows passing additional fields like coins, referral info, etc.
 */
export async function writeTelegramUserWithData(additionalData?: Partial<FirebaseUserData>): Promise<boolean> {
  try {
    // Step 1: Capture Telegram user safely
    const user = captureTelegramUser();
    
    if (!user) {
      return false;
    }

    // Step 2: Connect to Firebase Realtime Database
    const db = getFirebaseDatabase();
    
    if (!db) {
      console.error("Error writing data to Firebase");
      return false;
    }

    // Step 3: Check if user exists
    const userExists = await checkUserExists(db, user.id);
    
    if (userExists) {
      // Update existing user with additional data
      const now = new Date().toISOString();
      const updateData = {
        username: user.username || "unknown",
        firstName: user.first_name,
        lastName: user.last_name,
        photoUrl: user.photo_url,
        languageCode: user.language_code,
        isPremium: user.is_premium || false,
        updatedAt: now,
        lastSeen: now,
        ...additionalData // Merge additional data
      };

      const userRef = ref(db, `users/${user.id}`);
      await update(userRef, updateData);
      
      console.log("User found and updated");
    } else {
      // Create new user with additional data
      const now = new Date().toISOString();
      const newUserData: FirebaseUserData = {
        userId: user.id,
        username: user.username || "unknown",
        firstName: user.first_name,
        lastName: user.last_name,
        photoUrl: user.photo_url,
        languageCode: user.language_code,
        isPremium: user.is_premium || false,
        coins: 0,
        xp: 0,
        level: 1,
        vipTier: 'free',
        referralCount: 0,
        joinedAt: now,
        updatedAt: now,
        lastSeen: now,
        ...additionalData // Merge additional data
      };

      const userRef = ref(db, `users/${user.id}`);
      await set(userRef, newUserData);
      
      console.log("New user created successfully");
    }

    return true;

  } catch (error) {
    console.error("Error writing data to Firebase");
    return false;
  }
}

/**
 * Function to update specific user fields (like coins)
 * This is optimized for real-time updates
 */
export async function updateTelegramUserData(updates: Partial<FirebaseUserData>): Promise<boolean> {
  try {
    // Step 1: Capture Telegram user safely
    const user = captureTelegramUser();
    
    if (!user) {
      return false;
    }

    // Step 2: Connect to Firebase Realtime Database
    const db = getFirebaseDatabase();
    
    if (!db) {
      console.error("Error writing data to Firebase");
      return false;
    }

    // Step 3: Update user data
    const now = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: now,
      lastSeen: now
    };

    const userRef = ref(db, `users/${user.id}`);
    await update(userRef, updateData);
    
    console.log("User found and updated");
    return true;

  } catch (error) {
    console.error("Error writing data to Firebase");
    return false;
  }
}

/**
 * Auto-initialization function
 * Call this when the app loads to ensure user data is synced
 */
export function initializeTelegramUserSync(): void {
  if (typeof window !== 'undefined') {
    // Only run in Telegram WebApp environment
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      // Wait for Telegram WebApp to be ready
      if (typeof tg.ready === 'function') {
        tg.ready();
      }
      
      // Auto-sync user data when app loads
      setTimeout(async () => {
        await writeTelegramUserToFirebase();
      }, 1000);
      
      // Set up periodic sync (every 30 seconds)
      setInterval(async () => {
        await updateTelegramUserData({});
      }, 30000);
    }
  }
}

// Export types for external use
export type { TelegramUser, FirebaseUserData };