/**
 * Enhanced User Data Persistence Manager
 * 
 * Provides persistent user data storage across tab switches and page reloads
 * with automatic synchronization and conflict resolution.
 */

import { User } from '@/types';

interface UserDataCache {
  user: User | null;
  lastUpdated: number;
  version: number;
  source: 'firebase' | 'localStorage' | 'initial';
}

interface PersistenceState {
  isHydrated: boolean;
  hasCache: boolean;
  cacheAge: number;
  lastSyncTime: number;
}

class UserDataPersistenceManager {
  private static instance: UserDataPersistenceManager;
  private storageKey = 'telegram_user_data_cache_v2';
  private maxCacheAge = 5 * 60 * 1000; // 5 minutes
  private currentData: UserDataCache | null = null;
  private listeners: Set<(data: UserDataCache | null) => void> = new Set();
  private syncInProgress = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeFromStorage();
      this.setupStorageListener();
    }
  }

  public static getInstance(): UserDataPersistenceManager {
    if (!UserDataPersistenceManager.instance) {
      UserDataPersistenceManager.instance = new UserDataPersistenceManager();
    }
    return UserDataPersistenceManager.instance;
  }

  /**
   * Initialize from localStorage on startup
   */
  private initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as UserDataCache;
        const age = Date.now() - parsed.lastUpdated;
        
        if (age < this.maxCacheAge && parsed.user) {
          console.log(`[UserPersistence] Loaded cached user data (age: ${Math.round(age / 1000)}s)`);
          
          // Convert date strings back to Date objects
          if (parsed.user) {
            parsed.user = this.deserializeUser(parsed.user);
          }
          
          this.currentData = parsed;
          this.notifyListeners();
        } else {
          console.log('[UserPersistence] Cached data is stale or invalid, clearing');
          this.clearCache();
        }
      }
    } catch (error) {
      console.error('[UserPersistence] Error loading from localStorage:', error);
      this.clearCache();
    }
  }

  /**
   * Setup listener for storage changes (across tabs)
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        console.log('[UserPersistence] Storage changed from another tab');
        this.initializeFromStorage();
      }
    });
  }

  /**
   * Serialize user data for storage (convert Dates to strings)
   */
  private serializeUser(user: User): any {
    return {
      ...user,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      lastClaimDate: user.lastClaimDate?.toISOString(),
      farmingStartTime: user.farmingStartTime?.toISOString(),
      farmingEndTime: user.farmingEndTime?.toISOString(),
      vipEndTime: user.vipEndTime?.toISOString(),
    };
  }

  /**
   * Deserialize user data from storage (convert strings back to Dates)
   */
  private deserializeUser(userData: any): User {
    return {
      ...userData,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
      lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
      farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
      farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
      vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
    };
  }

  /**
   * Update user data in cache and storage
   */
  public updateUserData(user: User, source: 'firebase' | 'localStorage' | 'initial' = 'firebase'): void {
    try {
      if (this.syncInProgress) {
        console.log('[UserPersistence] Sync in progress, queuing update');
        setTimeout(() => this.updateUserData(user, source), 100);
        return;
      }

      const now = Date.now();
      const newCache: UserDataCache = {
        user,
        lastUpdated: now,
        version: (this.currentData?.version ?? 0) + 1,
        source
      };

      // Only update if the data is actually different or newer
      if (this.shouldUpdateCache(newCache)) {
        this.currentData = newCache;
        
        // Save to localStorage
        const serializedUser = this.serializeUser(user);
        const cacheToStore = {
          ...newCache,
          user: serializedUser
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(cacheToStore));
        
        console.log(`[UserPersistence] Updated user data from ${source} (version: ${newCache.version})`);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[UserPersistence] Error updating user data:', error);
    }
  }

  /**
   * Check if cache should be updated
   */
  private shouldUpdateCache(newCache: UserDataCache): boolean {
    if (!this.currentData) return true;
    
    // Always update if coming from Firebase
    if (newCache.source === 'firebase') return true;
    
    // For other sources, check if it's newer
    return newCache.lastUpdated > this.currentData.lastUpdated;
  }

  /**
   * Get cached user data
   */
  public getCachedUserData(): UserDataCache | null {
    if (!this.currentData) return null;
    
    const age = Date.now() - this.currentData.lastUpdated;
    if (age > this.maxCacheAge) {
      console.log('[UserPersistence] Cached data expired, clearing');
      this.clearCache();
      return null;
    }
    
    return this.currentData;
  }

  /**
   * Get user data with fallback
   */
  public getUserWithFallback(): User | null {
    const cached = this.getCachedUserData();
    return cached?.user || null;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.currentData = null;
    try {
      localStorage.removeItem(this.storageKey);
      console.log('[UserPersistence] Cache cleared');
      this.notifyListeners();
    } catch (error) {
      console.error('[UserPersistence] Error clearing cache:', error);
    }
  }

  /**
   * Get persistence state info
   */
  public getPersistenceState(): PersistenceState {
    const cached = this.getCachedUserData();
    return {
      isHydrated: !!this.currentData,
      hasCache: !!cached,
      cacheAge: cached ? Date.now() - cached.lastUpdated : 0,
      lastSyncTime: cached?.lastUpdated || 0
    };
  }

  /**
   * Subscribe to data changes
   */
  public subscribe(listener: (data: UserDataCache | null) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current data
    listener(this.currentData);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentData);
      } catch (error) {
        console.error('[UserPersistence] Error in listener:', error);
      }
    });
  }

  /**
   * Merge user data from Firebase with cached data
   */
  public mergeWithFirebaseData(firebaseUser: User): User {
    const cached = this.getCachedUserData();
    
    if (!cached || !cached.user) {
      // No cache, use Firebase data
      this.updateUserData(firebaseUser, 'firebase');
      return firebaseUser;
    }

    // Merge cached data with Firebase data
    // Firebase data takes precedence for most fields
    const merged: User = {
      ...cached.user,
      ...firebaseUser,
      // Preserve client-side optimistic updates for coins if Firebase data is older
      coins: this.shouldPreserveCachedCoins(cached.user, firebaseUser) ? cached.user.coins : firebaseUser.coins,
      // Always use Firebase timestamps if available
      updatedAt: firebaseUser.updatedAt || cached.user.updatedAt,
      createdAt: firebaseUser.createdAt || cached.user.createdAt
    };

    this.updateUserData(merged, 'firebase');
    return merged;
  }

  /**
   * Check if cached coins should be preserved (optimistic updates)
   */
  private shouldPreserveCachedCoins(cachedUser: User, firebaseUser: User): boolean {
    // If cached coins are higher and updated recently (within 10 seconds), preserve them
    const cacheAge = Date.now() - (this.currentData?.lastUpdated || 0);
    return cachedUser.coins > firebaseUser.coins && cacheAge < 10000;
  }

  /**
   * Optimistically update coins (for immediate UI feedback)
   */
  public optimisticallyUpdateCoins(newCoins: number): void {
    if (this.currentData?.user) {
      const updatedUser = {
        ...this.currentData.user,
        coins: newCoins,
        updatedAt: new Date()
      };
      this.updateUserData(updatedUser, 'localStorage');
    }
  }

  /**
   * Start sync operation
   */
  public startSync(): void {
    this.syncInProgress = true;
  }

  /**
   * End sync operation
   */
  public endSync(): void {
    this.syncInProgress = false;
  }
}

// Export singleton instance
export const userDataPersistence = UserDataPersistenceManager.getInstance();

// Convenience functions
export function getCachedUser(): User | null {
  return userDataPersistence.getUserWithFallback();
}

export function updateCachedUser(user: User, source?: 'firebase' | 'localStorage' | 'initial'): void {
  userDataPersistence.updateUserData(user, source);
}

export function optimisticallyUpdateCoins(coins: number): void {
  userDataPersistence.optimisticallyUpdateCoins(coins);
}

export function clearUserCache(): void {
  userDataPersistence.clearCache();
}

export function subscribeToUserCache(listener: (data: any) => void): () => void {
  return userDataPersistence.subscribe(listener);
}

export default userDataPersistence;