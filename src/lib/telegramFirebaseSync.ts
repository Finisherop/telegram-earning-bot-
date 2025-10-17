/**
 * Telegram WebApp → Firebase Direct Sync
 * 
 * Fixes the data flow issue where Telegram user data gets lost between detection and Firebase write
 * Ensures direct, verified sync from Telegram WebApp to Firebase Realtime Database
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, Database } from 'firebase/database';

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface FirebaseUserData {
  id: number;
  telegramId: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  coins: number;
  xp: number;
  level: number;
  vipTier: string;
  createdAt: string;
  updatedAt: string;
}

class TelegramFirebaseSync {
  private static instance: TelegramFirebaseSync;
  private database: Database | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): TelegramFirebaseSync {
    if (!TelegramFirebaseSync.instance) {
      TelegramFirebaseSync.instance = new TelegramFirebaseSync();
    }
    return TelegramFirebaseSync.instance;
  }

  /**
   * Initialize Firebase Database with fallback hardcoded URLs for Telegram WebApp
   */
  private async initializeFirebase(): Promise<boolean> {
    if (this.isInitialized && this.database) {
      return true;
    }

    try {
      // Firebase config with fallback hardcoded URLs for Telegram WebApp environment
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC_SO0ZnItNVoWif48MyMeznuLsA-jq52k",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tgfjf-5bbfe.firebaseapp.com",
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://tgfjf-5bbfe-default-rtdb.firebaseio.com",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tgfjf-5bbfe",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tgfjf-5bbfe.firebasestorage.app",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "898327972915",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:898327972915:web:8450b0cfdf69134474e746"
      };

      console.log('[Firebase] 🔧 Config loaded:', {
        databaseURL: firebaseConfig.databaseURL,
        projectId: firebaseConfig.projectId,
        usingFallback: !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      });

      if (!firebaseConfig.databaseURL || !firebaseConfig.projectId) {
        console.error('[Firebase] ❌ Missing databaseURL or projectId even with fallbacks');
        return false;
      }

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      this.database = getDatabase(app);
      
      // Log connected host for verification
      const dbInfo = (this.database as any)._repoInfo_;
      const host = dbInfo?.host || 'unknown';
      console.log('[Firebase] Connected Host:', host);

      // Verify host includes firebaseio.com
      if (!host.includes('firebaseio.com')) {
        console.error('[Firebase] ❌ Invalid host detected:', host);
        console.error('[Firebase] ❌ Expected host to include "firebaseio.com"');
        console.error('[Firebase] 🚫 Blocking all Firebase writes due to invalid host');
        this.database = null;
        return false;
      }

      this.isInitialized = true;
      console.log('[Firebase] ✅ Database initialized with valid host');
      return true;
    } catch (error) {
      console.error('[Firebase] ❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get Telegram WebApp user with proper initialization
   */
  private async getTelegramUser(): Promise<TelegramWebAppUser | null> {
    try {
      // Only run in browser
      if (typeof window === 'undefined') {
        console.log('[Telegram] ❌ Not in browser environment');
        return null;
      }

      // STEP 1: Ensure Telegram WebApp initializes correctly
      const tg = (window as any).Telegram?.WebApp;
      
      if (!tg) {
        console.error('[Telegram] ❌ Telegram WebApp not available');
        alert('Open this app from Telegram!');
        return null;
      }

      // STEP 2: Call ready() to ensure WebApp is initialized
      console.log('[Telegram] 🚀 Calling Telegram.WebApp.ready()...');
      tg.ready();

      // STEP 3: Wait a moment for ready() to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // STEP 4: Get user data
      const user = tg.initDataUnsafe?.user;
      
      if (!user) {
        console.error('[Telegram] ❌ Telegram user not found');
        console.log('[Telegram] 🔍 initDataUnsafe:', tg.initDataUnsafe);
        alert('Open this app from Telegram!');
        return null;
      }

      // STEP 5: Verify user.id exists and is numeric
      if (!user.id || typeof user.id !== 'number') {
        console.error('[Telegram] ❌ Invalid user ID:', user.id);
        return null;
      }

      console.log('[Telegram] ✅ Valid Telegram user found:', {
        id: user.id,
        first_name: user.first_name,
        username: user.username || 'N/A'
      });

      return user;

    } catch (error) {
      console.error('[Telegram] ❌ Error getting Telegram user:', error);
      return null;
    }
  }

  /**
   * Create Firebase user data from Telegram user
   */
  private createFirebaseUserData(telegramUser: TelegramWebAppUser): FirebaseUserData {
    const now = new Date().toISOString();
    
    return {
      id: telegramUser.id,
      telegramId: telegramUser.id,
      username: telegramUser.username || '',
      first_name: telegramUser.first_name || '',
      last_name: telegramUser.last_name || '',
      photo_url: telegramUser.photo_url || '',
      coins: 0,
      xp: 0,
      level: 1,
      vipTier: 'free',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Direct sync from Telegram WebApp to Firebase
   */
  public async syncTelegramToFirebase(): Promise<boolean> {
    try {
      console.log('[Sync] 🚀 Starting Telegram → Firebase sync...');

      // STEP 1: Initialize Firebase
      const firebaseReady = await this.initializeFirebase();
      if (!firebaseReady || !this.database) {
        console.error('[Sync] ❌ Firebase not ready');
        return false;
      }

      // STEP 2: Get Telegram user (with proper WebApp initialization)
      const telegramUser = await this.getTelegramUser();
      if (!telegramUser) {
        console.error('[Sync] ❌ No Telegram user - blocking Firebase write');
        return false;
      }

      // STEP 3: Prepare Firebase data
      const userData = this.createFirebaseUserData(telegramUser);
      const userPath = `telegram_users/${telegramUser.id}`;

      console.log('[Firebase] 📝 Writing for Telegram ID:', telegramUser.id);
      console.log('[Firebase] 📍 Path:', userPath);

      // STEP 4: Safe write to Firebase with detailed logging
      const userRef = ref(this.database, userPath);
      
      console.log('📤 Writing user:', telegramUser.id);
      console.log('[Firebase] 📊 User data to write:', {
        id: userData.id,
        telegramId: userData.telegramId,
        username: userData.username,
        first_name: userData.first_name
      });
      
      await set(userRef, userData);
      console.log('✅ Write complete for:', telegramUser.id);
      console.log('[Firebase] ✅ Firebase write successful');

      // STEP 5: Verification read
      console.log('[Firebase] 🔍 Verifying write...');
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const savedData = snapshot.val();
        console.log('[Firebase] 📦 Firebase verification:', {
          id: savedData.id,
          username: savedData.username,
          first_name: savedData.first_name,
          path: userPath
        });
        console.log('[Sync] ✅ Telegram user successfully synced to Firebase');
        return true;
      } else {
        console.error('[Firebase] ❌ Verification failed - data not found');
        return false;
      }

    } catch (error) {
      console.error('[Sync] ❌ Sync failed:', error);
      return false;
    }
  }

  /**
   * Update existing Telegram user in Firebase
   */
  public async updateTelegramUser(updates: Partial<FirebaseUserData>): Promise<boolean> {
    try {
      // Get current Telegram user
      const telegramUser = await this.getTelegramUser();
      if (!telegramUser) {
        console.error('[Update] ❌ No Telegram user - blocking update');
        return false;
      }

      if (!this.database) {
        await this.initializeFirebase();
      }

      if (!this.database) {
        console.error('[Update] ❌ Firebase not available');
        return false;
      }

      // Verify path format
      const userPath = `telegram_users/${telegramUser.id}`;
      console.log('[Firebase] 🎯 Verified path format:', userPath);
      
      const userRef = ref(this.database, userPath);

      // Add updatedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      console.log('[Firebase] 🔄 Updating Telegram ID:', telegramUser.id);
      console.log('[Firebase] 📝 Update data:', Object.keys(updateData));

      console.log('📤 Writing user:', telegramUser.id);
      await set(userRef, updateData);
      console.log('✅ Write complete for:', telegramUser.id);
      console.log('[Firebase] ✅ Update successful');

      // Verify update
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        console.log('[Firebase] 📦 Update verification:', snapshot.val());
        return true;
      } else {
        console.error('[Firebase] ❌ Update verification failed');
        return false;
      }

    } catch (error) {
      console.error('[Update] ❌ Update failed:', error);
      return false;
    }
  }

  /**
   * Verify that setTelegramUserData writes to correct path
   */
  public async setTelegramUserData(userId: string, userData: FirebaseUserData): Promise<boolean> {
    try {
      if (!this.database) {
        const initialized = await this.initializeFirebase();
        if (!initialized) {
          console.error('[SetUserData] ❌ Firebase not initialized');
          return false;
        }
      }

      // Verify path format: telegram_users/{userId}
      const userPath = `telegram_users/${userId}`;
      console.log('[SetUserData] 🎯 Writing to verified path:', userPath);
      
      const userRef = ref(this.database!, userPath);

      console.log('📤 Writing user:', userId);
      console.log('[SetUserData] 📊 Data to write:', {
        id: userData.id,
        telegramId: userData.telegramId,
        username: userData.username,
        first_name: userData.first_name
      });

      await set(userRef, userData);
      console.log('✅ Write complete for:', userId);

      // Immediate verification
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        console.log('[SetUserData] 📦 Write verification successful:', {
          path: userPath,
          data: snapshot.val()
        });
        return true;
      } else {
        console.error('[SetUserData] ❌ Write verification failed - no data at path:', userPath);
        return false;
      }

    } catch (error) {
      console.error('[SetUserData] ❌ Write failed:', error);
      return false;
    }
  }

  /**
   * Check if current environment is Telegram WebApp
   */
  public isTelegramWebApp(): boolean {
    if (typeof window === 'undefined') return false;
    
    const tg = (window as any).Telegram?.WebApp;
    return !!(tg && tg.initDataUnsafe?.user);
  }

  /**
   * Get current Telegram user (cached)
   */
  public async getCurrentTelegramUser(): Promise<TelegramWebAppUser | null> {
    return this.getTelegramUser();
  }
}

// Export singleton instance
export const telegramFirebaseSync = TelegramFirebaseSync.getInstance();

/**
 * Main sync function - call this to sync Telegram user to Firebase
 */
export const syncTelegramToFirebase = async (): Promise<boolean> => {
  return telegramFirebaseSync.syncTelegramToFirebase();
};

/**
 * Update current Telegram user in Firebase
 */
export const updateTelegramUserInFirebase = async (updates: Partial<FirebaseUserData>): Promise<boolean> => {
  return telegramFirebaseSync.updateTelegramUser(updates);
};

/**
 * Check if running in Telegram WebApp
 */
export const isTelegramWebApp = (): boolean => {
  return telegramFirebaseSync.isTelegramWebApp();
};

/**
 * Get current Telegram user
 */
export const getCurrentTelegramUser = async (): Promise<TelegramWebAppUser | null> => {
  return telegramFirebaseSync.getCurrentTelegramUser();
};

/**
 * Set Telegram user data to Firebase (verifies path: telegram_users/{userId})
 */
export const setTelegramUserData = async (userId: string, userData: FirebaseUserData): Promise<boolean> => {
  return telegramFirebaseSync.setTelegramUserData(userId, userData);
};

// Auto-sync when module loads (client-side only)
if (typeof window !== 'undefined') {
  // Wait for DOM and Telegram WebApp to be ready
  const autoSync = async () => {
    try {
      // Wait for page load
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Additional wait for Telegram WebApp
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('[Auto-Sync] 🚀 Starting automatic Telegram → Firebase sync...');
      const success = await syncTelegramToFirebase();
      
      if (success) {
        console.log('[Auto-Sync] ✅ Automatic sync completed');
      } else {
        console.log('[Auto-Sync] ⚠️ Automatic sync skipped (not Telegram WebApp or error)');
      }
    } catch (error) {
      console.error('[Auto-Sync] ❌ Automatic sync error:', error);
    }
  };

  autoSync();
}

export default telegramFirebaseSync;