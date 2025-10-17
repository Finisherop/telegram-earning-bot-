/**
 * Telegram WebApp + Firebase Integration - Complete Solution
 * 
 * Properly detects Telegram WebApp user and passes data directly to Firebase
 * NO browser fallbacks, only real Telegram users
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

class TelegramWebAppIntegration {
  private static instance: TelegramWebAppIntegration;
  private database: Database | null = null;
  private isFirebaseInitialized = false;
  private cachedTelegramUser: TelegramUser | null = null;

  private constructor() {}

  public static getInstance(): TelegramWebAppIntegration {
    if (!TelegramWebAppIntegration.instance) {
      TelegramWebAppIntegration.instance = new TelegramWebAppIntegration();
    }
    return TelegramWebAppIntegration.instance;
  }

  /**
   * Initialize Firebase (only once)
   */
  private async initializeFirebase(): Promise<boolean> {
    if (this.isFirebaseInitialized && this.database) {
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
      this.isFirebaseInitialized = true;

      console.log('[Firebase] ✅ Firebase initialized for project:', firebaseConfig.projectId);
      console.log('[Firebase] 🗄️ Database URL:', firebaseConfig.databaseURL);

      return true;
    } catch (error) {
      console.error('[Firebase] ❌ Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect Telegram WebApp with retry logic
   * Retries every 500ms for max 5 attempts as requested
   */
  public async detectTelegramUser(): Promise<TelegramUser | null> {
    // Return cached user if available
    if (this.cachedTelegramUser) {
      console.log('[Telegram ✅] Using cached Telegram user:', this.cachedTelegramUser.id);
      return this.cachedTelegramUser;
    }

    // Only run in browser environment
    if (typeof window === 'undefined') {
      console.log('[Telegram ❌] Not in browser environment');
      return null;
    }

    console.log('[Telegram 🔍] Starting Telegram WebApp detection...');

    let attempts = 0;
    const maxAttempts = 5; // Max 5 attempts as requested
    const retryInterval = 500; // 500ms intervals as requested

    return new Promise((resolve) => {
      const checkTelegram = () => {
        attempts++;
        console.log(`[Telegram 🔍] Detection attempt ${attempts}/${maxAttempts}`);

        try {
          const telegram = (window as any).Telegram?.WebApp;
          const user = telegram?.initDataUnsafe?.user;

          // Check if we have a real Telegram user
          if (user && user.id && typeof user.id === 'number') {
            // Additional validation to ensure it's a real Telegram ID
            const userId = user.id.toString();
            
            // Validate user ID format (Telegram IDs are typically 8-10 digits)
            if (userId.length >= 5 && !userId.includes('browser') && !userId.includes('timestamp')) {
              console.log('[Telegram ✅] Real Telegram user detected:', {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name || '',
                username: user.username || '',
                photo_url: user.photo_url || ''
              });

              // Cache the user
              this.cachedTelegramUser = user;
              resolve(user);
              return;
            } else {
              console.log('[Telegram ⚠️] Invalid user ID format:', userId);
            }
          }

          // If we haven't found a valid user and haven't reached max attempts, retry
          if (attempts < maxAttempts) {
            console.log(`[Telegram ⏳] Telegram WebApp not ready, retrying in ${retryInterval}ms...`);
            setTimeout(checkTelegram, retryInterval);
          } else {
            console.log('[Telegram ❌] Skipped save, Telegram user missing after 5 attempts');
            resolve(null);
          }

        } catch (error) {
          console.error('[Telegram ❌] Error during detection:', error);
          
          if (attempts < maxAttempts) {
            setTimeout(checkTelegram, retryInterval);
          } else {
            resolve(null);
          }
        }
      };

      // Start the detection process
      checkTelegram();
    });
  }

  /**
   * Create user data from Telegram user object
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
   * Verify Firebase write with snapshot check
   */
  private async verifyWrite(path: string): Promise<boolean> {
    if (!this.database) return false;

    try {
      const dataRef = ref(this.database, path);
      const snapshot = await get(dataRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('[Firebase ✅] Write verification successful:', {
          path,
          telegramId: data.telegramId,
          firstName: data.firstName,
          username: data.username
        });
        return true;
      } else {
        console.error('[Firebase ❌] Write verification failed - data not found at path:', path);
        return false;
      }
    } catch (error) {
      console.error('[Firebase ❌] Write verification error:', error);
      return false;
    }
  }

  /**
   * Save Telegram user to Firebase with full user object
   * This is the main function that accepts Telegram user data directly
   */
  public async saveTelegramUserToFirebase(telegramUser: TelegramUser): Promise<boolean> {
    try {
      // STEP 1: Validate Telegram user object
      if (!telegramUser || !telegramUser.id || typeof telegramUser.id !== 'number') {
        console.log('[Firebase ❌] Skipped save, invalid Telegram user object');
        return false;
      }

      const userId = telegramUser.id.toString();
      
      // Additional validation
      if (userId.includes('browser') || userId.includes('timestamp') || userId.length < 5) {
        console.log('[Firebase ❌] Skipped save, invalid user ID format:', userId);
        return false;
      }

      console.log('[Telegram ✅] Processing real Telegram user:', {
        id: telegramUser.id,
        first_name: telegramUser.first_name,
        username: telegramUser.username || 'N/A'
      });

      // STEP 2: Initialize Firebase
      const initialized = await this.initializeFirebase();
      if (!initialized || !this.database) {
        console.error('[Firebase ❌] Firebase not available');
        return false;
      }

      // STEP 3: Prepare Firebase path
      const path = `telegram_users/${userId}`;
      console.log('[Firebase 📍] Target path:', path);

      // STEP 4: Check if user exists
      const userRef = ref(this.database, path);
      const existingSnapshot = await get(userRef);

      let userData: TelegramUserData;
      let operation: string;

      if (existingSnapshot.exists()) {
        // Update existing user with new Telegram data
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
      console.log(`[Firebase 📝] Performing ${operation} operation for user:`, userId);
      
      if (operation === 'update') {
        await update(userRef, userData);
      } else {
        await set(userRef, userData);
      }

      // STEP 6: Verify write with snapshot check
      const verified = await this.verifyWrite(path);
      
      if (verified) {
        console.log(`[Firebase ✅] Saved to path: telegram_users/${userId}`);
        console.log('[Firebase ✅] Data saved successfully with verification');
        return true;
      } else {
        console.error(`[Firebase ❌] Save failed for ${userId} - verification failed`);
        return false;
      }

    } catch (error) {
      console.error('[Firebase ❌] Error saving Telegram user:', error);
      return false;
    }
  }

  /**
   * Update user fields in Firebase
   */
  public async updateTelegramUserFields(telegramUser: TelegramUser, updates: Record<string, any>): Promise<boolean> {
    try {
      if (!telegramUser || !telegramUser.id) {
        console.log('[Firebase ❌] Skipped update, invalid Telegram user');
        return false;
      }

      const userId = telegramUser.id.toString();
      
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

      console.log('[Firebase 🔄] Updating fields for user:', userId);
      console.log('[Firebase 📝] Fields:', Object.keys(sanitizedUpdates));

      await update(userRef, sanitizedUpdates);

      // Verify update
      const verified = await this.verifyWrite(path);
      
      if (verified) {
        console.log(`[Firebase ✅] Saved to path: telegram_users/${userId}`);
        return true;
      } else {
        console.error(`[Firebase ❌] Update failed for ${userId}`);
        return false;
      }

    } catch (error) {
      console.error('[Firebase ❌] Error updating user fields:', error);
      return false;
    }
  }

  /**
   * Complete integration: Detect Telegram user and save to Firebase
   */
  public async integrateAndSave(): Promise<boolean> {
    try {
      console.log('[Integration 🚀] Starting Telegram WebApp + Firebase integration...');

      // STEP 1: Detect Telegram user with retry logic
      const telegramUser = await this.detectTelegramUser();
      
      if (!telegramUser) {
        console.log('[Integration ❌] No Telegram user detected - integration stopped');
        return false;
      }

      // STEP 2: Save to Firebase using the detected user data
      const saved = await this.saveTelegramUserToFirebase(telegramUser);
      
      if (saved) {
        console.log('[Integration ✅] Telegram WebApp + Firebase integration successful');
        return true;
      } else {
        console.log('[Integration ❌] Firebase save failed');
        return false;
      }

    } catch (error) {
      console.error('[Integration ❌] Integration error:', error);
      return false;
    }
  }

  /**
   * Get cached Telegram user (if available)
   */
  public getCachedTelegramUser(): TelegramUser | null {
    return this.cachedTelegramUser;
  }
}

// Export singleton instance
export const telegramWebAppIntegration = TelegramWebAppIntegration.getInstance();

/**
 * Main integration function - detects Telegram user and saves to Firebase
 * This is the primary function to use for complete integration
 */
export const integrateTelegramWithFirebase = async (): Promise<boolean> => {
  return telegramWebAppIntegration.integrateAndSave();
};

/**
 * Detect Telegram user with retry logic (500ms intervals, max 5 attempts)
 */
export const detectTelegramUser = async (): Promise<TelegramUser | null> => {
  return telegramWebAppIntegration.detectTelegramUser();
};

/**
 * Save specific Telegram user to Firebase
 * Pass full Telegram user object directly
 */
export const saveTelegramUserToFirebase = async (telegramUser: TelegramUser): Promise<boolean> => {
  return telegramWebAppIntegration.saveTelegramUserToFirebase(telegramUser);
};

/**
 * Update Telegram user fields in Firebase
 */
export const updateTelegramUserInFirebase = async (telegramUser: TelegramUser, updates: Record<string, any>): Promise<boolean> => {
  return telegramWebAppIntegration.updateTelegramUserFields(telegramUser, updates);
};

/**
 * Get cached Telegram user
 */
export const getCachedTelegramUser = (): TelegramUser | null => {
  return telegramWebAppIntegration.getCachedTelegramUser();
};

export default telegramWebAppIntegration;