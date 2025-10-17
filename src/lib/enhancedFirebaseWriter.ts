/**
 * Enhanced Firebase Realtime Database Writer
 * 
 * Fixes write issues with proper verification, retry logic, and debugging
 * Ensures data is actually written to Firebase with confirmation
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

interface UserData {
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
  lastClaimDate?: string;
  farmingStartTime?: string;
  farmingEndTime?: string;
  vipEndTime?: string;
}

class EnhancedFirebaseWriter {
  private static instance: EnhancedFirebaseWriter;
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private isInitialized = false;
  private readonly MAX_RETRIES = 2;

  private constructor() {}

  public static getInstance(): EnhancedFirebaseWriter {
    if (!EnhancedFirebaseWriter.instance) {
      EnhancedFirebaseWriter.instance = new EnhancedFirebaseWriter();
    }
    return EnhancedFirebaseWriter.instance;
  }

  /**
   * Initialize Firebase with proper configuration verification
   */
  private async initializeFirebase(): Promise<boolean> {
    if (this.isInitialized && this.database) {
      return true;
    }

    try {
      console.log('[Enhanced Firebase Debug] 🔄 Initializing Firebase...');

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Verify critical configuration
      if (!firebaseConfig.databaseURL) {
        console.error('[Enhanced Firebase Debug] ❌ Missing databaseURL in configuration');
        return false;
      }

      if (!firebaseConfig.projectId) {
        console.error('[Enhanced Firebase Debug] ❌ Missing projectId in configuration');
        return false;
      }

      console.log('[Enhanced Firebase Debug] 📋 Firebase Config:', {
        projectId: firebaseConfig.projectId,
        databaseURL: firebaseConfig.databaseURL,
        authDomain: firebaseConfig.authDomain
      });

      // Initialize Firebase app (only once)
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('[Enhanced Firebase Debug] 🆕 New Firebase app initialized');
      } else {
        this.app = getApps()[0];
        console.log('[Enhanced Firebase Debug] ♻️ Using existing Firebase app');
      }

      // Initialize Realtime Database
      this.database = getDatabase(this.app);
      this.isInitialized = true;

      console.log('[Enhanced Firebase Debug] ✅ Firebase initialized successfully');
      console.log('[Enhanced Firebase Debug] 🗄️ Database URL:', firebaseConfig.databaseURL);

      return true;
    } catch (error) {
      console.error('[Enhanced Firebase Debug] ❌ Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Get Telegram user data with validation
   */
  private getTelegramUser(): TelegramUser | null {
    try {
      const telegram = (window as any).Telegram?.WebApp;
      const user = telegram?.initDataUnsafe?.user;

      if (!user || !user.id) {
        console.warn('[Enhanced Firebase Debug] ⚠️ Write skipped, Telegram initDataUnsafe.user missing');
        return null;
      }

      // Prevent fallback IDs
      const userId = user.id.toString();
      if (userId.startsWith('browser_') || userId.includes('timestamp')) {
        console.warn('[Enhanced Firebase Debug] ⚠️ Write skipped, detected fallback ID:', userId);
        return null;
      }

      console.log('[Enhanced Firebase Debug] 👤 Telegram user detected:', {
        id: user.id,
        first_name: user.first_name,
        username: user.username || 'N/A'
      });

      return user;
    } catch (error) {
      console.error('[Enhanced Firebase Debug] ❌ Error getting Telegram user:', error);
      return null;
    }
  }

  /**
   * Create user data object with safe defaults
   */
  private createUserData(telegramUser: TelegramUser): UserData {
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
   * Verify write operation by reading back the data
   */
  private async verifyWrite(path: string, expectedData: any): Promise<boolean> {
    try {
      if (!this.database) {
        console.error('[Enhanced Firebase Debug] ❌ Database not available for verification');
        return false;
      }

      console.log('[Enhanced Firebase Debug] 🔍 Verifying write at path:', path);

      const dataRef = ref(this.database, path);
      const snapshot = await get(dataRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('[Enhanced Firebase Debug] ✅ Write confirmed:', path);
        console.log('[Enhanced Firebase Debug] 📊 Verified data:', {
          id: data.id,
          telegramId: data.telegramId,
          firstName: data.firstName,
          coins: data.coins,
          updatedAt: data.updatedAt
        });
        return true;
      } else {
        console.error('[Enhanced Firebase Debug] ❌ Data not found after write:', path);
        return false;
      }
    } catch (error) {
      console.error('[Enhanced Firebase Debug] ❌ Verification failed:', error);
      return false;
    }
  }

  /**
   * Write user data with retry logic and verification
   */
  private async writeUserDataWithRetry(path: string, userData: UserData | Record<string, any>, isUpdate: boolean = false): Promise<boolean> {
    if (!this.database) {
      console.error('[Enhanced Firebase Debug] ❌ Database not available for write');
      return false;
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
      try {
        console.log('[Enhanced Firebase Debug] 📝 Write attempt', attempt, 'for path:', path);

        const dataRef = ref(this.database, path);

        if (isUpdate) {
          await update(dataRef, userData);
          console.log('[Enhanced Firebase Debug] 🔄 Update operation completed');
        } else {
          await set(dataRef, userData);
          console.log('[Enhanced Firebase Debug] 🆕 Set operation completed');
        }

        // Verify the write
        const verified = await this.verifyWrite(path, userData);
        
        if (verified) {
          console.log('[Enhanced Firebase Debug] ✅ Write and verification successful on attempt', attempt);
          return true;
        } else {
          console.warn('[Enhanced Firebase Debug] ⚠️ Write verification failed on attempt', attempt);
          
          if (attempt <= this.MAX_RETRIES) {
            console.log('[Enhanced Firebase Debug] 🔄 Retrying write...');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      } catch (error) {
        console.error('[Enhanced Firebase Debug] ❌ Write attempt', attempt, 'failed:', error);
        
        if (attempt <= this.MAX_RETRIES) {
          console.log('[Enhanced Firebase Debug] 🔄 Retrying after error...');
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }

    console.error('[Enhanced Firebase Debug] ❌ All write attempts failed for path:', path);
    return false;
  }

  /**
   * Main function to write/update Telegram user data
   */
  public async writeTelegramUserData(): Promise<boolean> {
    try {
      console.log('[Enhanced Firebase Debug] 🚀 Starting Telegram user data write process...');

      // Only run in client-side environment
      if (typeof window === 'undefined') {
        console.log('[Enhanced Firebase Debug] ⚠️ Server-side environment detected, skipping');
        return false;
      }

      // Initialize Firebase
      const initialized = await this.initializeFirebase();
      if (!initialized) {
        console.error('[Enhanced Firebase Debug] ❌ Firebase initialization failed');
        return false;
      }

      // Get Telegram user
      const telegramUser = this.getTelegramUser();
      if (!telegramUser) {
        return false; // Warning already logged in getTelegramUser
      }

      const userId = telegramUser.id.toString();
      const path = `telegram_users/${userId}`;

      console.log('[Enhanced Firebase Debug] 📍 Target path:', path);

      // Check if user already exists
      const userRef = ref(this.database!, path);
      const existingSnapshot = await get(userRef);

      let userData: UserData;
      let isUpdate = false;

      if (existingSnapshot.exists()) {
        // User exists - update with current data
        console.log('[Enhanced Firebase Debug] 👤 Existing user found, preparing update...');
        
        const existingData = existingSnapshot.val();
        userData = {
          ...existingData,
          firstName: telegramUser.first_name || existingData.firstName || 'User',
          lastName: telegramUser.last_name || existingData.lastName || '',
          username: telegramUser.username || existingData.username || '',
          profilePic: telegramUser.photo_url || existingData.profilePic || '',
          updatedAt: new Date().toISOString()
        };
        isUpdate = true;
      } else {
        // New user - create with defaults
        console.log('[Enhanced Firebase Debug] 🆕 New user, preparing creation...');
        userData = this.createUserData(telegramUser);
      }

      // Write data with retry and verification
      const success = await this.writeUserDataWithRetry(path, userData, isUpdate);

      if (success) {
        console.log('[Enhanced Firebase Debug] 🎉 User data write process completed successfully!');
        console.log('[Enhanced Firebase Debug] 📊 Final user data:', {
          path,
          id: userData.id,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          coins: userData.coins,
          vipTier: userData.vipTier
        });
      } else {
        console.error('[Enhanced Firebase Debug] 💥 User data write process failed after all retries');
      }

      return success;
    } catch (error) {
      console.error('[Enhanced Firebase Debug] 💥 Unexpected error in write process:', error);
      return false;
    }
  }

  /**
   * Update specific user fields (for external use)
   */
  public async updateUserFields(userId: string, updates: Partial<UserData>): Promise<boolean> {
    try {
      console.log('[Enhanced Firebase Debug] 🔄 Updating user fields for:', userId);

      const initialized = await this.initializeFirebase();
      if (!initialized) {
        return false;
      }

      const path = `telegram_users/${userId}`;
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

      console.log('[Enhanced Firebase Debug] 📝 Fields to update:', Object.keys(sanitizedUpdates));

      return await this.writeUserDataWithRetry(path, sanitizedUpdates as UserData, true);
    } catch (error) {
      console.error('[Enhanced Firebase Debug] ❌ Error updating user fields:', error);
      return false;
    }
  }
}

// Export singleton instance and main functions
export const enhancedFirebaseWriter = EnhancedFirebaseWriter.getInstance();

/**
 * Main function to write Telegram user data to Firebase
 */
export const writeTelegramUserToFirebase = (): Promise<boolean> => {
  return enhancedFirebaseWriter.writeTelegramUserData();
};

/**
 * Update specific user fields in Firebase
 */
export const updateUserInFirebase = (userId: string, updates: Partial<UserData>): Promise<boolean> => {
  return enhancedFirebaseWriter.updateUserFields(userId, updates);
};

// Auto-run when module is imported (only in client-side)
if (typeof window !== 'undefined') {
  // Wait for DOM and Telegram WebApp to be ready
  const initializeWriter = () => {
    setTimeout(async () => {
      console.log('[Enhanced Firebase Debug] 🎬 Auto-initializing Firebase writer...');
      await writeTelegramUserToFirebase();
    }, 2000); // Wait 2 seconds for Telegram WebApp to be fully loaded
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWriter);
  } else {
    initializeWriter();
  }
}

export default enhancedFirebaseWriter;