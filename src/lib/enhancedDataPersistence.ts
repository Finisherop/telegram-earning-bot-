/**
 * Enhanced Data Persistence Manager
 * 
 * Comprehensive solution for user data persistence across:
 * - Tab switches and navigation
 * - Page refreshes
 * - Network interruptions
 * - Firebase + LocalStorage synchronization
 */

import { User } from '@/types';
import { safeUpdateUser, getUser, subscribeToUser } from './firebaseService';

interface DataCache {
  user: User | null;
  timestamp: number;
  version: number;
  source: 'firebase' | 'localStorage' | 'optimistic';
  isStale: boolean;
}

interface SyncState {
  isLoading: boolean;
  hasError: boolean;
  lastSyncTime: number;
  syncInProgress: boolean;
  retryCount: number;
}

type DataListener = (data: { user: User | null; isLoading: boolean; hasError: boolean }) => void;

class EnhancedDataPersistenceManager {
  private static instance: EnhancedDataPersistenceManager;
  private readonly CACHE_KEY = 'telegram_user_data_v3';
  private readonly SYNC_STATE_KEY = 'telegram_sync_state_v3';
  private readonly MAX_CACHE_AGE = 10 * 60 * 1000; // 10 minutes
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRIES = 5;

  private cache: DataCache | null = null;
  private syncState: SyncState = {
    isLoading: false,
    hasError: false,
    lastSyncTime: 0,
    syncInProgress: false,
    retryCount: 0
  };
  
  private listeners = new Set<DataListener>();
  private firebaseUnsubscribe: (() => void) | null = null;
  private syncTimeoutId: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  public static getInstance(): EnhancedDataPersistenceManager {
    if (!EnhancedDataPersistenceManager.instance) {
      EnhancedDataPersistenceManager.instance = new EnhancedDataPersistenceManager();
    }
    return EnhancedDataPersistenceManager.instance;
  }

  /**
   * Initialize the persistence manager
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[DataPersistence] Initializing enhanced data persistence...');
    
    try {
      // Load cached data first for instant UI
      await this.loadFromCache();
      
      // Setup storage listener for cross-tab sync
      this.setupStorageListener();
      
      // Setup visibility change handler for tab focus sync
      this.setupVisibilityHandler();
      
      this.isInitialized = true;
      
      // Notify listeners with initial data
      this.notifyListeners();
      
      console.log('[DataPersistence] Initialization complete');
    } catch (error) {
      console.error('[DataPersistence] Initialization error:', error);
      this.syncState.hasError = true;
      this.notifyListeners();
    }
  }

  /**
   * Load data from localStorage cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cachedData = localStorage.getItem(this.CACHE_KEY);
      const syncStateData = localStorage.getItem(this.SYNC_STATE_KEY);
      
      if (cachedData) {
        const parsed: DataCache = JSON.parse(cachedData);
        const age = Date.now() - parsed.timestamp;
        
        if (age < this.MAX_CACHE_AGE && parsed.user) {
          // Deserialize user data (convert date strings back to Date objects)
          parsed.user = this.deserializeUser(parsed.user);
          parsed.isStale = age > 60000; // Mark as stale if older than 1 minute
          
          this.cache = parsed;
          
          console.log(`[DataPersistence] Loaded cached user data (age: ${Math.round(age / 1000)}s, stale: ${parsed.isStale})`);
        } else {
          console.log('[DataPersistence] Cached data expired, clearing');
          this.clearCache();
        }
      }
      
      if (syncStateData) {
        this.syncState = { ...this.syncState, ...JSON.parse(syncStateData) };
      }
    } catch (error) {
      console.error('[DataPersistence] Error loading cache:', error);
      this.clearCache();
    }
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.CACHE_KEY) {
        console.log('[DataPersistence] Storage changed from another tab');
        this.loadFromCache().then(() => this.notifyListeners());
      }
    });
  }

  /**
   * Setup visibility change handler for tab focus sync
   */
  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.cache?.user) {
        console.log('[DataPersistence] Tab became visible, refreshing data');
        this.refreshFromFirebase(this.cache.user.telegramId);
      }
    });
  }

  /**
   * Initialize user authentication and data sync
   */
  public async initializeUser(telegramId: string): Promise<User | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`[DataPersistence] Initializing user: ${telegramId}`);
    
    try {
      this.syncState.isLoading = true;
      this.syncState.hasError = false;
      this.notifyListeners();

      // Check if we have recent cached data
      if (this.cache?.user?.telegramId === telegramId && !this.cache.isStale) {
        console.log('[DataPersistence] Using fresh cached data');
        this.syncState.isLoading = false;
        this.notifyListeners();
        
        // Still sync in background
        this.backgroundSync(telegramId);
        return this.cache.user;
      }

      // Fetch from Firebase
      const firebaseUser = await this.fetchFromFirebase(telegramId);
      
      if (firebaseUser) {
        // Setup real-time listener
        this.setupFirebaseListener(telegramId);
        
        // Update cache
        this.updateCache(firebaseUser, 'firebase');
        
        this.syncState.isLoading = false;
        this.syncState.lastSyncTime = Date.now();
        this.syncState.retryCount = 0;
        this.saveSyncState();
        
        this.notifyListeners();
        return firebaseUser;
      }

      throw new Error('Failed to fetch user from Firebase');
      
    } catch (error) {
      console.error('[DataPersistence] Error initializing user:', error);
      
      this.syncState.isLoading = false;
      this.syncState.hasError = true;
      this.syncState.retryCount++;
      
      // Use cached data as fallback if available
      if (this.cache?.user?.telegramId === telegramId) {
        console.log('[DataPersistence] Using cached data as fallback');
        this.notifyListeners();
        
        // Retry sync in background
        this.scheduleRetry(telegramId);
        return this.cache.user;
      }
      
      this.saveSyncState();
      this.notifyListeners();
      return null;
    }
  }

  /**
   * Fetch user data from Firebase
   */
  private async fetchFromFirebase(telegramId: string): Promise<User | null> {
    try {
      console.log(`[DataPersistence] Fetching user from Firebase: ${telegramId}`);
      return await getUser(telegramId);
    } catch (error) {
      console.error('[DataPersistence] Firebase fetch error:', error);
      return null;
    }
  }

  /**
   * Setup Firebase real-time listener
   */
  private setupFirebaseListener(telegramId: string): void {
    if (this.firebaseUnsubscribe) {
      this.firebaseUnsubscribe();
    }

    this.firebaseUnsubscribe = subscribeToUser(telegramId, (user) => {
      if (user) {
        console.log('[DataPersistence] Firebase real-time update received');
        this.updateCache(user, 'firebase');
        this.syncState.lastSyncTime = Date.now();
        this.saveSyncState();
        this.notifyListeners();
      }
    });
  }

  /**
   * Update user data with optimistic updates
   */
  public async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    try {
      console.log('[DataPersistence] Updating user:', userId, updateData);
      
      // Optimistic update - update cache immediately
      if (this.cache?.user) {
        const optimisticUser = { 
          ...this.cache.user, 
          ...updateData, 
          updatedAt: new Date() 
        };
        
        this.updateCache(optimisticUser, 'optimistic');
        this.notifyListeners();
      }

      // Update Firebase
      const updatedUser = await safeUpdateUser(userId, updateData);
      
      // Update cache with Firebase response
      if (updatedUser) {
        this.updateCache(updatedUser, 'firebase');
        this.syncState.lastSyncTime = Date.now();
        this.saveSyncState();
        this.notifyListeners();
      }
      
      return updatedUser;
      
    } catch (error) {
      console.error('[DataPersistence] Error updating user:', error);
      
      // Revert optimistic update on error
      if (this.cache?.user && this.cache.source === 'optimistic') {
        console.log('[DataPersistence] Reverting optimistic update due to error');
        await this.refreshFromFirebase(userId);
      }
      
      throw error;
    }
  }

  /**
   * Refresh data from Firebase
   */
  public async refreshFromFirebase(telegramId: string): Promise<User | null> {
    try {
      this.syncState.syncInProgress = true;
      this.notifyListeners();
      
      const firebaseUser = await this.fetchFromFirebase(telegramId);
      
      if (firebaseUser) {
        this.updateCache(firebaseUser, 'firebase');
        this.syncState.lastSyncTime = Date.now();
        this.syncState.retryCount = 0;
      }
      
      this.syncState.syncInProgress = false;
      this.saveSyncState();
      this.notifyListeners();
      
      return firebaseUser;
      
    } catch (error) {
      console.error('[DataPersistence] Error refreshing from Firebase:', error);
      
      this.syncState.syncInProgress = false;
      this.syncState.hasError = true;
      this.syncState.retryCount++;
      
      this.saveSyncState();
      this.notifyListeners();
      
      return null;
    }
  }

  /**
   * Background sync without affecting UI loading state
   */
  private async backgroundSync(telegramId: string): Promise<void> {
    try {
      const firebaseUser = await this.fetchFromFirebase(telegramId);
      if (firebaseUser && this.cache?.user) {
        // Only update if Firebase data is newer
        const firebaseTime = firebaseUser.updatedAt?.getTime() || 0;
        const cacheTime = this.cache.user.updatedAt?.getTime() || 0;
        
        if (firebaseTime > cacheTime) {
          console.log('[DataPersistence] Background sync: Firebase data is newer');
          this.updateCache(firebaseUser, 'firebase');
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error('[DataPersistence] Background sync error:', error);
    }
  }

  /**
   * Schedule retry for failed sync
   */
  private scheduleRetry(telegramId: string): void {
    if (this.syncState.retryCount < this.MAX_RETRIES) {
      const delay = this.RETRY_DELAY * Math.pow(2, this.syncState.retryCount); // Exponential backoff
      
      this.syncTimeoutId = setTimeout(() => {
        console.log(`[DataPersistence] Retrying sync (attempt ${this.syncState.retryCount + 1})`);
        this.refreshFromFirebase(telegramId);
      }, delay);
    }
  }

  /**
   * Update cache with new user data
   */
  private updateCache(user: User, source: 'firebase' | 'localStorage' | 'optimistic'): void {
    const now = Date.now();
    
    this.cache = {
      user,
      timestamp: now,
      version: (this.cache?.version || 0) + 1,
      source,
      isStale: false
    };
    
    // Save to localStorage
    try {
      const serializedUser = this.serializeUser(user);
      const cacheToStore = {
        ...this.cache,
        user: serializedUser
      };
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheToStore));
    } catch (error) {
      console.error('[DataPersistence] Error saving to localStorage:', error);
    }
  }

  /**
   * Serialize user for storage
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
   * Deserialize user from storage
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
   * Save sync state to localStorage
   */
  private saveSyncState(): void {
    try {
      localStorage.setItem(this.SYNC_STATE_KEY, JSON.stringify(this.syncState));
    } catch (error) {
      console.error('[DataPersistence] Error saving sync state:', error);
    }
  }

  /**
   * Clear cache and reset state
   */
  public clearCache(): void {
    this.cache = null;
    this.syncState = {
      isLoading: false,
      hasError: false,
      lastSyncTime: 0,
      syncInProgress: false,
      retryCount: 0
    };
    
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.SYNC_STATE_KEY);
    } catch (error) {
      console.error('[DataPersistence] Error clearing cache:', error);
    }
    
    this.notifyListeners();
  }

  /**
   * Subscribe to data changes
   */
  public subscribe(listener: DataListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener({
      user: this.cache?.user || null,
      isLoading: this.syncState.isLoading,
      hasError: this.syncState.hasError
    });
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of data changes
   */
  private notifyListeners(): void {
    const data = {
      user: this.cache?.user || null,
      isLoading: this.syncState.isLoading,
      hasError: this.syncState.hasError
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[DataPersistence] Error in listener:', error);
      }
    });
  }

  /**
   * Get current cached user data
   */
  public getCurrentUser(): User | null {
    return this.cache?.user || null;
  }

  /**
   * Get current sync state
   */
  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Check if data is loading
   */
  public isLoading(): boolean {
    return this.syncState.isLoading;
  }

  /**
   * Check if there's an error
   */
  public hasError(): boolean {
    return this.syncState.hasError;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.firebaseUnsubscribe) {
      this.firebaseUnsubscribe();
      this.firebaseUnsubscribe = null;
    }
    
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
    
    this.listeners.clear();
  }
}

// Export singleton instance
export const enhancedDataPersistence = EnhancedDataPersistenceManager.getInstance();

// Convenience functions
export function initializeUserData(telegramId: string): Promise<User | null> {
  return enhancedDataPersistence.initializeUser(telegramId);
}

export function updateUserData(userId: string, updateData: Partial<User>): Promise<User | null> {
  return enhancedDataPersistence.updateUser(userId, updateData);
}

export function refreshUserData(telegramId: string): Promise<User | null> {
  return enhancedDataPersistence.refreshFromFirebase(telegramId);
}

export function getCurrentUserData(): User | null {
  return enhancedDataPersistence.getCurrentUser();
}

export function subscribeToUserData(listener: DataListener): () => void {
  return enhancedDataPersistence.subscribe(listener);
}

export function clearUserData(): void {
  enhancedDataPersistence.clearCache();
}

export default enhancedDataPersistence;