/**
 * Telegram Firebase Writer - Clean Implementation
 * 
 * ONLY writes real Telegram users to Firebase Realtime Database
 * Path: telegram_users/<telegramId>
 * NO browser fallbacks or fake users
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, Database } from 'firebase/database';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramUserData {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePic: string;
  coins: number;
  xp: number;
  level: number;
  vipTier: string;
  farmingMultiplier: number;
  referralMultiplier: number;
  adsLimitPerDay: number;
  withdrawalLimit: number;
  minWithdrawal: number;
  referralCount: number;
  referralEarnings: number;
  dailyStreak: number;
  createdAt: string;
  updatedAt: string;
}

class TelegramFirebaseWriter {
  private static instance: TelegramFirebaseWriter;
  private database: Database | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): TelegramFirebaseWriter {
    if (!TelegramFirebaseWriter.instance) {
      TelegramFirebaseWriter.instance = new TelegramFirebaseWriter();
    }
    return TelegramFirebaseWriter.instance;
  }

  /**
   * Initialize Firebase (only once)
   */
  private async initializeFirebase(): Promise<boolean> {
    if (this.isInitialized && this.database) {
      return true;
    }

    try {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Validate critical config
      if (!firebaseConfig.databaseURL || !firebaseConfig.projectId) {
        console.error('[Firebase] ❌ Missing databaseURL or projectId');
        return false;
      }

      // Initialize Firebase app
      let app: FirebaseApp;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      this.database = getDatabase(app);
      this.isInitialized = true;

      console.log('[Firebase] ✅ Firebase initialized for project:', firebaseConfig.projectId);
      console.log('[Firebase] 🗄️ Database URL:', firebaseConfig.databaseURL);

      return true;
    } catch (error) {
      console.error('[Firebase] ❌ Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Get real Telegram user (NO fallbacks)
   */
  private getTelegramUser(): TelegramUser | null {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined') {
        return null;
      }

      const telegram = (window as any).Telegram?.WebApp;
      const user = telegram?.initDataUnsafe?.user;

      // STRICT validation - must have real Telegram user ID
      if (!user || !user.id || typeof user.id !== 'number') {
        console.log('[Firebase] ⚠️ Skipped write — no Telegram user found');
        return null;
      }

      // Additional validation to prevent fake users
      const userId = user.id.toString();
      if (userId.includes('browser') || userId.includes('timestamp') || userId.length < 5) {
        console.log('[Firebase] ⚠️ Skipped write — detected invalid user ID:', userId);
        return null;
      }

      console.log('[Firebase] 👤 Real Telegram user detected:', {
        id: user.id,
        first_name: user.first_name,
        username: user.username || 'N/A'
      });

      return user;
    } catch (error) {
      console.error('[Firebase] ❌ Error detecting Telegram user:', error);
      return null;
    }
  }

  /**
   * Create user data with safe defaults
   */
  private createUserData(telegramUser: TelegramUser): TelegramUserData {
    const now = new Date().toISOString();
    const userId = telegramUser.id.toString();

    return {
      id: userId,
      telegramId: userId,
      firstName: telegramUser.first_name || 'User',
      lastName: telegramUser.last_name || '',
      username: telegramUser.username || '',
      profilePic: telegramUser.photo_url || '',
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
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Verify write by reading back the data
   */
  private async verifyWrite(path: string): Promise<boolean> {
    if (!this.database) return false;

    try {
      const dataRef = ref(this.database, path);
      const snapshot = await get(dataRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('[Firebase] ✅ Write verification successful:', {
          path,
          telegramId: data.telegramId,
          firstName: data.firstName,
          coins: data.coins
        });
        return true;
      } else {
        console.error('[Firebase] ❌ Write verification failed - data not found at path:', path);
        return false;
      }
    } catch (error) {
      console.error('[Firebase] ❌ Write verification error:', error);
      return false;
    }
  }

  /**
   * Write Telegram user to Firebase with verification
   */
  public async writeTelegramUser(): Promise<boolean> {
    try {
      // STEP 1: Get real Telegram user (returns early if not found)
      const telegramUser = this.getTelegramUser();
      if (!telegramUser) {
        return false; // Early return - no fake users created
      }

      // STEP 2: Initialize Firebase
      const initialized = await this.initializeFirebase();
      if (!initialized || !this.database) {
        console.error('[Firebase] ❌ Firebase not available');
        return false;
      }

      // STEP 3: Prepare data and path
      const userId = telegramUser.id.toString();
      const path = `telegram_users/${userId}`;
      
      console.log('[Firebase] 📍 Writing to path:', path);

      // STEP 4: Check if user exists
      const userRef = ref(this.database, path);
      const existingSnapshot = await get(userRef);

      let userData: TelegramUserData;
      let operation: string;

      if (existingSnapshot.exists()) {
        // Update existing user
        const existingData = existingSnapshot.val();
        userData = {
          ...existingData,
          firstName: telegramUser.first_name || existingData.firstName,
          lastName: telegramUser.last_name || existingData.lastName || '',
          username: telegramUser.username || existingData.username || '',
          profilePic: telegramUser.photo_url || existingData.profilePic || '',
          updatedAt: new Date().toISOString()
        };
        operation = 'update';
      } else {
        // Create new user
        userData = this.createUserData(telegramUser);
        operation = 'create';
      }

      // STEP 5: Write to Firebase
      console.log('[Firebase] 📝 Performing', operation, 'operation for user:', userId);
      
      if (operation === 'update') {
        await update(userRef, userData);
      } else {
        await set(userRef, userData);
      }

      // STEP 6: Verify write
      const verified = await this.verifyWrite(path);
      
      if (verified) {
        console.log(`[Firebase] ✅ Data updated successfully for ${userId}`);
        console.log('[Firebase] 🎯 Confirmed path:', path);
        return true;
      } else {
        console.error(`[Firebase] ❌ Write failed for ${userId} - verification failed`);
        return false;
      }

    } catch (error) {
      console.error('[Firebase] ❌ Error writing Telegram user:', error);
      return false;
    }
  }

  /**
   * Update specific user fields
   */
  public async updateUserFields(userId: string, updates: Record<string, any>): Promise<boolean> {
    try {
      // Validate this is a real Telegram user ID (not browser fallback)
      if (userId.includes('browser') || userId.includes('timestamp') || userId.length < 5) {
        console.log('[Firebase] ⚠️ Skipped update — invalid user ID:', userId);
        return false;
      }

      const initialized = await this.initializeFirebase();
      if (!initialized || !this.database) {
        return false;
      }

      const path = `telegram_users/${userId}`;
      const userRef = ref(this.database, path);

      // Add updatedAt timestamp
      const sanitizedUpdates: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(sanitizedUpdates).forEach(key => {
        if (sanitizedUpdates[key] === undefined) {
          delete sanitizedUpdates[key];
        }
      });

      console.log('[Firebase] 🔄 Updating fields for user:', userId);
      console.log('[Firebase] 📝 Fields:', Object.keys(sanitizedUpdates));

      await update(userRef, sanitizedUpdates);

      // Verify update
      const verified = await this.verifyWrite(path);
      
      if (verified) {
        console.log(`[Firebase] ✅ Data updated successfully for ${userId}`);
        return true;
      } else {
        console.error(`[Firebase] ❌ Update failed for ${userId}`);
        return false;
      }

    } catch (error) {
      console.error('[Firebase] ❌ Error updating user fields:', error);
      return false;
    }
  }
}

// Export singleton and functions
export const telegramFirebaseWriter = TelegramFirebaseWriter.getInstance();

/**
 * Main function to write current Telegram user to Firebase
 * ONLY works with real Telegram users - NO browser fallbacks
 */
export const writeTelegramUserToFirebase = async (): Promise<boolean> => {
  return telegramFirebaseWriter.writeTelegramUser();
};

/**
 * Update user fields in Firebase
 */
export const updateTelegramUserInFirebase = async (userId: string, updates: Record<string, any>): Promise<boolean> => {
  return telegramFirebaseWriter.updateUserFields(userId, updates);
};

// Auto-initialize when imported (client-side only)
if (typeof window !== 'undefined') {
  // Wait for Telegram WebApp to be ready
  const initWriter = () => {
    setTimeout(async () => {
      console.log('[Firebase] 🚀 Auto-initializing Telegram Firebase writer...');
      await writeTelegramUserToFirebase();
    }, 2000); // 2 second delay for Telegram WebApp
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWriter);
  } else {
    initWriter();
  }
}

export default telegramFirebaseWriter;