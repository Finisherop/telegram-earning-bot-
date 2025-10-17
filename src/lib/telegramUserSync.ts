/**
 * Telegram Mini WebApp User Sync Module
 * 
 * Captures Telegram user info and syncs to Firebase Realtime Database
 * with strict requirements compliance:
 * - Only runs in Telegram Mini WebApp environment
 * - No browser fallback users
 * - Respects existing Firebase fields
 * - Silent operation unless debug enabled
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, get, update, set, Database } from 'firebase/database';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
}

interface CachedUser {
  userId: string;
  name: string;
  profileUrl: string;
  lastCached: number;
}

class TelegramUserSyncManager {
  private static instance: TelegramUserSyncManager;
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private isInitialized = false;
  private readonly DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true';
  private readonly MAX_RETRIES = 25; // 5 seconds / 200ms
  private readonly RETRY_INTERVAL = 200;

  private constructor() {}

  public static getInstance(): TelegramUserSyncManager {
    if (!TelegramUserSyncManager.instance) {
      TelegramUserSyncManager.instance = new TelegramUserSyncManager();
    }
    return TelegramUserSyncManager.instance;
  }

  /**
   * Main entry point - detects Telegram user and syncs to Firebase
   */
  public async syncTelegramUser(): Promise<void> {
    // Only run in client-side environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Wait for Telegram WebApp to be available
      const telegramUser = await this.waitForTelegramUser();
      
      if (!telegramUser) {
        // Exit silently if not in Telegram Mini WebApp
        return;
      }

      const userId = telegramUser.id.toString();
      
      // Check cache first
      const cachedUser = this.getCachedUser(userId);
      if (cachedUser) {
        this.debugLog('Using cached user, updating lastSeen only');
        await this.updateLastSeen(userId);
        return;
      }

      // Initialize Firebase only after confirming Telegram user
      await this.initializeFirebase();
      
      if (!this.database) {
        this.debugLog('Firebase not available, exiting');
        return;
      }

      // Sync user data to Firebase
      await this.syncUserToFirebase(telegramUser);
      
      // Cache the user
      this.cacheUser(telegramUser);
      
    } catch (error) {
      this.debugLog('Error in syncTelegramUser:', error);
    }
  }

  /**
   * Wait for Telegram WebApp to be available with retry mechanism
   */
  private async waitForTelegramUser(): Promise<TelegramUser | null> {
    return new Promise((resolve) => {
      let attempts = 0;

      const checkTelegram = () => {
        attempts++;

        try {
          const telegram = (window as any).Telegram?.WebApp as TelegramWebApp;
          const user = telegram?.initDataUnsafe?.user;

          if (user && user.id) {
            this.debugLog('Telegram user detected:', user);
            resolve(user);
            return;
          }
        } catch (error) {
          this.debugLog('Error checking Telegram:', error);
        }

        if (attempts >= this.MAX_RETRIES) {
          this.debugLog('Telegram WebApp not available after retries, exiting');
          resolve(null);
          return;
        }

        setTimeout(checkTelegram, this.RETRY_INTERVAL);
      };

      checkTelegram();
    });
  }

  /**
   * Initialize Firebase only once and only after Telegram user is confirmed
   */
  private async initializeFirebase(): Promise<void> {
    if (this.isInitialized && this.app && this.database) {
      return;
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

      // Validate required config
      if (!firebaseConfig.databaseURL || !firebaseConfig.projectId) {
        this.debugLog('Firebase config incomplete');
        return;
      }

      // Initialize Firebase app (only once)
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }

      this.database = getDatabase(this.app);
      this.isInitialized = true;
      
      this.debugLog('Firebase initialized successfully');
    } catch (error) {
      this.debugLog('Firebase initialization failed:', error);
    }
  }

  /**
   * Sync user data to Firebase with safe update
   */
  private async syncUserToFirebase(telegramUser: TelegramUser): Promise<void> {
    if (!this.database) return;

    const userId = telegramUser.id.toString();
    const userRef = ref(this.database, `users/${userId}`);

    try {
      // Prepare user data - only the 3 required fields
      const userData = {
        name: this.combineName(telegramUser.first_name, telegramUser.last_name),
        profileUrl: telegramUser.photo_url || '',
        lastSeen: Date.now()
      };

      // Check if user exists
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        // User exists - update only our 3 fields
        await update(userRef, userData);
        this.debugLog('Updated existing user:', userId);
      } else {
        // User doesn't exist - create with minimal data
        await set(userRef, userData);
        this.debugLog('Created new user:', userId);
      }

    } catch (error) {
      this.debugLog('Error syncing user to Firebase:', error);
      throw error;
    }
  }

  /**
   * Update only lastSeen for cached users
   */
  private async updateLastSeen(userId: string): Promise<void> {
    if (!this.database) {
      await this.initializeFirebase();
    }
    
    if (!this.database) return;

    try {
      const userRef = ref(this.database, `users/${userId}`);
      await update(userRef, {
        lastSeen: Date.now()
      });
      
      this.debugLog('Updated lastSeen for user:', userId);
    } catch (error) {
      this.debugLog('Error updating lastSeen:', error);
    }
  }

  /**
   * Combine first and last name
   */
  private combineName(firstName: string, lastName?: string): string {
    return lastName ? `${firstName} ${lastName}`.trim() : firstName;
  }

  /**
   * Cache user in localStorage
   */
  private cacheUser(telegramUser: TelegramUser): void {
    try {
      const userId = telegramUser.id.toString();
      const cachedUser: CachedUser = {
        userId,
        name: this.combineName(telegramUser.first_name, telegramUser.last_name),
        profileUrl: telegramUser.photo_url || '',
        lastCached: Date.now()
      };

      localStorage.setItem(`user_${userId}`, JSON.stringify(cachedUser));
      this.debugLog('User cached:', userId);
    } catch (error) {
      this.debugLog('Error caching user:', error);
    }
  }

  /**
   * Get cached user from localStorage
   */
  private getCachedUser(userId: string): CachedUser | null {
    try {
      const cached = localStorage.getItem(`user_${userId}`);
      if (cached) {
        const user = JSON.parse(cached) as CachedUser;
        // Cache is valid for 24 hours
        if (Date.now() - user.lastCached < 24 * 60 * 60 * 1000) {
          return user;
        } else {
          // Remove expired cache
          localStorage.removeItem(`user_${userId}`);
        }
      }
    } catch (error) {
      this.debugLog('Error reading cached user:', error);
    }
    return null;
  }

  /**
   * Debug logging (only when enabled)
   */
  private debugLog(message: string, data?: any): void {
    if (this.DEBUG) {
      if (data) {
        console.log(`[TelegramUserSync] ${message}`, data);
      } else {
        console.log(`[TelegramUserSync] ${message}`);
      }
    }
  }
}

// Export singleton instance and main function
export const telegramUserSync = TelegramUserSyncManager.getInstance();

/**
 * Main function to sync Telegram user
 * Call this once when your app initializes
 */
export const syncTelegramUser = (): Promise<void> => {
  return telegramUserSync.syncTelegramUser();
};

// Auto-sync when module is imported (only in client-side)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => syncTelegramUser(), 100);
    });
  } else {
    // DOM is already ready
    setTimeout(() => syncTelegramUser(), 100);
  }
}

export default telegramUserSync;