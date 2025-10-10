import { db, realtimeDb } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';
import { safeTelegramUserStorage, safeUpdateLastSeen } from './firebaseSafeStorage';

// Telegram User Interface (no authentication required)
export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
  // Additional tracking fields
  capturedAt: string;
  lastSeen: string;
  userAgent?: string;
  platform?: string;
  source: 'telegram' | 'browser';
}

// Browser fallback user data
interface BrowserUserData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  capturedAt: string;
  lastSeen: string;
  userAgent?: string;
  source: 'browser';
}

class TelegramUserCapture {
  private static instance: TelegramUserCapture;
  private userData: TelegramUserData | BrowserUserData | null = null;
  private isCapturing = false;

  private constructor() {}

  public static getInstance(): TelegramUserCapture {
    if (!TelegramUserCapture.instance) {
      TelegramUserCapture.instance = new TelegramUserCapture();
    }
    return TelegramUserCapture.instance;
  }

  /**
   * Automatically capture user data from Telegram WebApp or create browser fallback
   */
  public async captureUserData(): Promise<TelegramUserData | BrowserUserData | null> {
    if (this.isCapturing) {
      console.log('[UserCapture] Already capturing user data...');
      return this.userData;
    }

    this.isCapturing = true;

    try {
      console.log('[UserCapture] Starting automatic user data capture...');

      // Check if running in Telegram WebApp
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        console.log('[UserCapture] Telegram WebApp detected');

        // Get user data from Telegram
        const telegramUser = tg.initDataUnsafe?.user;
        
        if (telegramUser && telegramUser.id) {
          console.log('[UserCapture] Telegram user data found:', telegramUser);
          
          const userData: TelegramUserData = {
            id: telegramUser.id,
            first_name: telegramUser.first_name || 'Telegram User',
            last_name: telegramUser.last_name || undefined,
            username: telegramUser.username || undefined,
            photo_url: telegramUser.photo_url || undefined,
            language_code: telegramUser.language_code || 'en',
            is_premium: telegramUser.is_premium || false,
            capturedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: tg.platform || 'unknown',
            source: 'telegram'
          };

          this.userData = userData;
          await this.storeUserData(userData);
          return userData;
        } else {
          console.log('[UserCapture] No valid Telegram user data, using browser fallback');
        }
      }

      // Browser fallback - create anonymous user
      console.log('[UserCapture] Creating browser fallback user');
      const browserUserData = await this.createBrowserUser();
      this.userData = browserUserData;
      await this.storeUserData(browserUserData);
      return browserUserData;

    } catch (error) {
      console.error('[UserCapture] Error capturing user data:', error);
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Create browser fallback user data
   */
  private async createBrowserUser(): Promise<BrowserUserData> {
    // Generate or retrieve browser user ID
    let browserId = localStorage.getItem('telegram_browser_user_id');
    if (!browserId) {
      browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('telegram_browser_user_id', browserId);
    }

    // Get or create user name
    let firstName = localStorage.getItem('telegram_browser_user_name') || 'Browser User';
    
    const browserUserData: BrowserUserData = {
      id: browserId,
      first_name: firstName,
      last_name: undefined,
      username: `browser_${browserId.split('_')[1]}`,
      capturedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userAgent: navigator.userAgent,
      source: 'browser'
    };

    return browserUserData;
  }

  /**
   * Store user data in Firebase (both Firestore and Realtime DB for redundancy)
   * Enhanced with safe data handling and error resilience
   */
  private async storeUserData(userData: TelegramUserData | BrowserUserData): Promise<void> {
    // Only run on client side
    if (typeof window === 'undefined') {
      console.log('[UserCapture] Server-side detected, skipping Firebase storage');
      return;
    }

    // Validate user data
    if (!userData || !userData.id) {
      console.error('[UserCapture] Invalid user data: missing user or user.id');
      return;
    }

    try {
      const userId = userData.id.toString();
      console.log('[UserCapture] Storing user data for ID:', userId);

      // Import Firebase services dynamically to ensure they're available
      const { db, realtimeDb } = await import('./firebase');

      // Use the safe storage utility
      const storageResult = await safeTelegramUserStorage(userData, {
        db,
        realtimeDb,
        collection: 'telegram_users',
        path: 'telegram_users',
        enableLocalBackup: true
      });

      if (storageResult.success) {
        console.log('[UserCapture] User data storage completed successfully');
      } else {
        console.error('[UserCapture] Storage failed with errors:', storageResult.errors);
        if (storageResult.warnings.length > 0) {
          console.warn('[UserCapture] Storage warnings:', storageResult.warnings);
        }
      }

      // Log detailed results
      if (storageResult.errors.length > 0) {
        console.error('[UserCapture] Storage errors:', storageResult.errors);
      }
      if (storageResult.warnings.length > 0) {
        console.warn('[UserCapture] Storage warnings:', storageResult.warnings);
      }

    } catch (error) {
      console.error('[UserCapture] Failed to store user data:', error);
      // Don't throw error to prevent app from breaking if Firebase fails
      console.warn('[UserCapture] Continuing without Firebase storage - app remains functional');
    }
  }

  /**
   * Get current user data
   */
  public getUserData(): TelegramUserData | BrowserUserData | null {
    return this.userData;
  }

  /**
   * Update user last seen timestamp with safe Firebase handling
   */
  public async updateLastSeen(): Promise<void> {
    if (!this.userData) {
      console.warn('[UserCapture] No user data available for last seen update');
      return;
    }

    try {
      const userId = this.userData.id.toString();
      const now = new Date().toISOString();

      // Update in memory
      this.userData.lastSeen = now;

      // Import Firebase services dynamically
      const { db, realtimeDb } = await import('./firebase');

      // Use the safe update utility
      const updateResult = await safeUpdateLastSeen(db, realtimeDb, userId);
      
      if (updateResult.firestore || updateResult.realtime) {
        console.log('[UserCapture] Last seen updated successfully', updateResult);
      } else {
        console.warn('[UserCapture] Failed to update last seen in both Firebase services');
      }

      // Always update locally as backup
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('telegram_user_data', JSON.stringify(this.userData));
          localStorage.setItem(`telegram_user_${userId}`, JSON.stringify(this.userData));
          console.log('[UserCapture] Last seen updated in localStorage');
        }
      } catch (localError) {
        console.error('[UserCapture] Failed to update last seen locally:', localError);
      }

    } catch (error) {
      console.error('[UserCapture] Failed to update last seen:', error);
      // Don't throw error to prevent app from breaking
    }
  }

  /**
   * Initialize automatic capture on app start
   */
  public async initialize(): Promise<void> {
    console.log('[UserCapture] Initializing automatic user capture...');

    // Wait for Telegram WebApp to be ready
    if (typeof window !== 'undefined') {
      // Listen for Telegram WebApp ready event
      window.addEventListener('telegramWebAppReady', async () => {
        console.log('[UserCapture] Telegram WebApp ready, capturing user data...');
        await this.captureUserData();
      });

      // Fallback timeout for browser mode
      setTimeout(async () => {
        if (!this.userData) {
          console.log('[UserCapture] Timeout reached, capturing user data...');
          await this.captureUserData();
        }
      }, 2000);

      // Update last seen periodically
      setInterval(() => {
        this.updateLastSeen();
      }, 30000); // Every 30 seconds
    }
  }
}

// Export singleton instance
export const telegramUserCapture = TelegramUserCapture.getInstance();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  telegramUserCapture.initialize();
}

export default telegramUserCapture;