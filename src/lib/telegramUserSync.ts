/**
 * Telegram User Sync - Client-side
 * 
 * Detects Telegram WebApp context and syncs user data via API route
 * Only works in Telegram Mini App environment
 */

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface SyncResponse {
  success: boolean;
  operation: 'create' | 'update';
  user: any;
  path: string;
  error?: string;
}

class TelegramUserSync {
  private static instance: TelegramUserSync;
  private isInitialized = false;
  private cachedUser: TelegramWebAppUser | null = null;

  private constructor() {}

  public static getInstance(): TelegramUserSync {
    if (!TelegramUserSync.instance) {
      TelegramUserSync.instance = new TelegramUserSync();
    }
    return TelegramUserSync.instance;
  }

  /**
   * Detect Telegram WebApp context and get user data
   */
  public async detectTelegramUser(): Promise<TelegramWebAppUser | null> {
    try {
      console.log('[Telegram Sync] 🔍 Detecting Telegram WebApp context...');

      // Only run in browser environment
      if (typeof window === 'undefined') {
        console.log('[Telegram Sync] ❌ Not in browser environment');
        return null;
      }

      // Check for Telegram WebApp
      const telegram = (window as any).Telegram?.WebApp;
      
      if (!telegram) {
        console.log('[Telegram Sync] ❌ Telegram WebApp not available');
        console.log('[Telegram Sync] ℹ️ This app must be opened from Telegram Mini App');
        return null;
      }

      console.log('[Telegram Sync] ✅ Telegram WebApp detected');

      // Initialize Telegram WebApp
      console.log('[Telegram Sync] 🚀 Initializing Telegram WebApp...');
      telegram.ready();

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get user data
      const user = telegram.initDataUnsafe?.user;
      
      if (!user || !user.id || typeof user.id !== 'number') {
        console.log('[Telegram Sync] ❌ No valid Telegram user found');
        console.log('[Telegram Sync] 🔍 initDataUnsafe:', telegram.initDataUnsafe);
        return null;
      }

      // Validate user ID (no browser fallbacks)
      const userId = user.id.toString();
      if (userId.includes('browser') || userId.includes('timestamp') || userId.length < 5) {
        console.log('[Telegram Sync] ❌ Invalid user ID detected:', userId);
        return null;
      }

      console.log('[Telegram Sync] ✅ Valid Telegram user detected:', {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        username: user.username || '',
        photo_url: user.photo_url || ''
      });

      this.cachedUser = user;
      return user;

    } catch (error) {
      console.error('[Telegram Sync] ❌ Error detecting Telegram user:', error);
      return null;
    }
  }

  /**
   * Sync Telegram user to Firebase via API route
   */
  public async syncUserToFirebase(telegramUser: TelegramWebAppUser): Promise<SyncResponse | null> {
    try {
      console.log('[Telegram Sync] 🚀 Syncing user to Firebase via API...');
      console.log('[Telegram Sync] 📤 Sending user data:', {
        id: telegramUser.id,
        first_name: telegramUser.first_name,
        username: telegramUser.username || 'N/A'
      });

      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramUser
        })
      });

      console.log('[Telegram Sync] 📡 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Telegram Sync] ❌ API error:', errorData);
        return {
          success: false,
          operation: 'create',
          user: null,
          path: '',
          error: errorData.error || 'API request failed'
        };
      }

      const result: SyncResponse = await response.json();
      
      console.log('[Telegram Sync] ✅ API sync successful:', {
        operation: result.operation,
        path: result.path,
        userId: result.user?.id
      });

      return result;

    } catch (error) {
      console.error('[Telegram Sync] ❌ Sync error:', error);
      return {
        success: false,
        operation: 'create',
        user: null,
        path: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Complete sync process: detect + sync
   */
  public async performCompleteSync(): Promise<boolean> {
    try {
      console.log('[Telegram Sync] 🎯 Starting complete sync process...');

      // Step 1: Detect Telegram user
      const telegramUser = await this.detectTelegramUser();
      
      if (!telegramUser) {
        console.log('[Telegram Sync] ⚠️ No Telegram user detected - sync aborted');
        return false;
      }

      // Step 2: Sync to Firebase
      const syncResult = await this.syncUserToFirebase(telegramUser);
      
      if (!syncResult || !syncResult.success) {
        console.log('[Telegram Sync] ❌ Firebase sync failed:', syncResult?.error);
        return false;
      }

      console.log('[Telegram Sync] 🎉 Complete sync successful!');
      console.log('[Telegram Sync] 📍 User saved at:', syncResult.path);
      
      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('[Telegram Sync] ❌ Complete sync error:', error);
      return false;
    }
  }

  /**
   * Check if user is in Telegram WebApp environment
   */
  public isTelegramWebApp(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).Telegram?.WebApp;
  }

  /**
   * Get cached Telegram user
   */
  public getCachedUser(): TelegramWebAppUser | null {
    return this.cachedUser;
  }

  /**
   * Check if sync is initialized
   */
  public isSync(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const telegramUserSync = TelegramUserSync.getInstance();

/**
 * Main sync function - detects Telegram user and syncs to Firebase
 */
export const syncTelegramUser = async (): Promise<boolean> => {
  return telegramUserSync.performCompleteSync();
};

/**
 * Check if running in Telegram WebApp
 */
export const isTelegramWebApp = (): boolean => {
  return telegramUserSync.isTelegramWebApp();
};

/**
 * Get current Telegram user (if cached)
 */
export const getTelegramUser = (): TelegramWebAppUser | null => {
  return telegramUserSync.getCachedUser();
};

/**
 * Detect Telegram user without syncing
 */
export const detectTelegramUser = async (): Promise<TelegramWebAppUser | null> => {
  return telegramUserSync.detectTelegramUser();
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
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('[Auto Sync] 🚀 Starting automatic Telegram user sync...');
      const success = await syncTelegramUser();
      
      if (success) {
        console.log('[Auto Sync] ✅ Automatic sync completed');
      } else {
        console.log('[Auto Sync] ⚠️ Automatic sync skipped (not Telegram WebApp or error)');
      }
    } catch (error) {
      console.error('[Auto Sync] ❌ Automatic sync error:', error);
    }
  };

  autoSync();
}

export default telegramUserSync;