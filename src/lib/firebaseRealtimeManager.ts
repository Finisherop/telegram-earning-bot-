/**
 * Firebase Realtime Sync Manager
 * 
 * Comprehensive real-time synchronization system for Firebase Realtime Database
 * with auto-reconnection, undefined value sanitization, local caching, and 
 * instant admin-to-user panel sync capabilities.
 * 
 * Features:
 * - Real-time onValue() listeners with automatic reconnection
 * - Safe data writing with undefined value prevention
 * - Local caching using sessionStorage
 * - Auto-reconnect on tab/app visibility change
 * - Comprehensive error handling with exponential backoff retry
 * - Admin settings sync to user panels
 */

import { 
  ref, 
  onValue, 
  off, 
  update, 
  set, 
  get, 
  Database, 
  DataSnapshot 
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { User, AdminSettings, Task, UserTask } from '@/types';
import { DEFAULT_SETTINGS } from './constants';

// Types for listeners and callbacks
type ListenerCallback<T> = (data: T | null) => void;
type ErrorCallback = (error: Error) => void;
type UnsubscribeFunction = () => void;

interface RealtimeListener {
  id: string;
  path: string;
  callback: ListenerCallback<any>;
  unsubscribe: UnsubscribeFunction;
  isActive: boolean;
  errorCount: number;
  lastError?: Error;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresIn: number;
}

// Comprehensive Firebase Realtime Manager Class
class FirebaseRealtimeManager {
  private static instance: FirebaseRealtimeManager;
  private listeners = new Map<string, RealtimeListener>();
  private cache = new Map<string, CacheEntry>();
  private isOnline = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private visibilityListenerActive = false;

  // Session storage keys
  private readonly CACHE_PREFIX = 'firebase_cache_';
  private readonly USER_DATA_KEY = 'cached_user_data';
  private readonly ADMIN_SETTINGS_KEY = 'cached_admin_settings';
  private readonly TASKS_KEY = 'cached_tasks';

  private constructor() {
    this.setupVisibilityChangeListener();
    this.setupOnlineOfflineListeners();
    this.loadCacheFromStorage();
    console.log('[Firebase Realtime Manager] Initialized');
  }

  public static getInstance(): FirebaseRealtimeManager {
    if (!FirebaseRealtimeManager.instance) {
      FirebaseRealtimeManager.instance = new FirebaseRealtimeManager();
    }
    return FirebaseRealtimeManager.instance;
  }

  /**
   * Setup visibility change listener for auto-reconnection
   */
  private setupVisibilityChangeListener(): void {
    if (typeof document === 'undefined' || this.visibilityListenerActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Firebase Realtime Manager] App became visible, reconnecting Firebase listeners...');
        this.reconnectAllListeners();
      } else {
        console.log('[Firebase Realtime Manager] App went to background');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.visibilityListenerActive = true;
    
    console.log('[Firebase Realtime Manager] Visibility change listener setup complete');
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineOfflineListeners(): void {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[Firebase Realtime Manager] Network came online, reconnecting...');
      this.isOnline = true;
      this.reconnectAllListeners();
    };

    const handleOffline = () => {
      console.log('[Firebase Realtime Manager] Network went offline');
      this.isOnline = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Load cached data from sessionStorage
   */
  private loadCacheFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKeys = [this.USER_DATA_KEY, this.ADMIN_SETTINGS_KEY, this.TASKS_KEY];
      
      cacheKeys.forEach(key => {
        const cached = sessionStorage.getItem(this.CACHE_PREFIX + key);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.cache.set(key, parsed);
          console.log(`[Firebase Realtime Manager] Loaded cached data for ${key}`);
        }
      });
    } catch (error) {
      console.warn('[Firebase Realtime Manager] Failed to load cache from storage:', error);
    }
  }

  /**
   * Save data to cache and sessionStorage
   */
  private saveToCache(key: string, data: any, expiresIn: number = 300000): void { // 5 minutes default
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresIn
    };

    this.cache.set(key, entry);

    // Also save to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
      } catch (error) {
        console.warn('[Firebase Realtime Manager] Failed to save to sessionStorage:', error);
      }
    }
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(this.CACHE_PREFIX + key);
      }
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Sanitize data to prevent undefined values in Firebase
   */
  public static sanitizeFirebaseData(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data === 'string') {
      return data.trim() || null;
    }

    if (typeof data === 'number') {
      return isNaN(data) ? 0 : data;
    }

    if (typeof data === 'boolean') {
      return data;
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    if (Array.isArray(data)) {
      return data.map(item => FirebaseRealtimeManager.sanitizeFirebaseData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      Object.keys(data).forEach(key => {
        const value = FirebaseRealtimeManager.sanitizeFirebaseData(data[key]);
        if (value !== null && value !== undefined) {
          sanitized[key] = value;
        }
      });
      return sanitized;
    }

    return data;
  }

  /**
   * Safe Firebase update with retry logic
   */
  public async safeUpdate(path: string, data: any, retries: number = 3): Promise<void> {
    if (!realtimeDb) {
      throw new Error('Firebase not initialized');
    }

    const sanitizedData = FirebaseRealtimeManager.sanitizeFirebaseData(data);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const dbRef = ref(realtimeDb, path);
        await update(dbRef, sanitizedData);
        console.log(`[Firebase Realtime Manager] Successfully updated ${path}`);
        return;
      } catch (error) {
        console.error(`[Firebase Realtime Manager] Update attempt ${attempt} failed for ${path}:`, error);
        
        if (attempt === retries) {
          throw new Error(`Failed to update ${path} after ${retries} attempts: ${error}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Safe Firebase set with retry logic
   */
  public async safeSet(path: string, data: any, retries: number = 3): Promise<void> {
    if (!realtimeDb) {
      throw new Error('Firebase not initialized');
    }

    const sanitizedData = FirebaseRealtimeManager.sanitizeFirebaseData(data);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const dbRef = ref(realtimeDb, path);
        await set(dbRef, sanitizedData);
        console.log(`[Firebase Realtime Manager] Successfully set ${path}`);
        return;
      } catch (error) {
        console.error(`[Firebase Realtime Manager] Set attempt ${attempt} failed for ${path}:`, error);
        
        if (attempt === retries) {
          throw new Error(`Failed to set ${path} after ${retries} attempts: ${error}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Subscribe to real-time updates with caching and auto-reconnection
   */
  public subscribeToPath<T>(
    path: string,
    callback: ListenerCallback<T>,
    cacheKey?: string,
    onError?: ErrorCallback
  ): UnsubscribeFunction {
    if (!realtimeDb) {
      console.error('[Firebase Realtime Manager] Database not initialized');
      
      // Try to return cached data
      if (cacheKey) {
        const cached = this.getCachedData<T>(cacheKey);
        if (cached) {
          console.log(`[Firebase Realtime Manager] Returning cached data for ${path}`);
          setTimeout(() => callback(cached), 0);
        }
      }
      
      return () => {}; // Return empty unsubscribe function
    }

    const listenerId = `${path}_${Date.now()}_${Math.random()}`;
    const dbRef = ref(realtimeDb, path);
    
    const handleSnapshot = (snapshot: DataSnapshot) => {
      try {
        const data = snapshot.exists() ? snapshot.val() as T : null;
        
        // Cache the data if cacheKey provided
        if (cacheKey && data) {
          this.saveToCache(cacheKey, data);
        }
        
        callback(data);
        
        // Reset error count on successful data receipt
        const listener = this.listeners.get(listenerId);
        if (listener) {
          listener.errorCount = 0;
          listener.lastError = undefined;
        }
        
        console.log(`[Firebase Realtime Manager] Real-time data received for ${path}`);
      } catch (error) {
        console.error(`[Firebase Realtime Manager] Error processing snapshot for ${path}:`, error);
        this.handleListenerError(listenerId, error as Error, onError);
      }
    };

    const handleError = (error: Error) => {
      console.error(`[Firebase Realtime Manager] Listener error for ${path}:`, error);
      this.handleListenerError(listenerId, error, onError);
      
      // Try to return cached data on error
      if (cacheKey) {
        const cached = this.getCachedData<T>(cacheKey);
        if (cached) {
          console.log(`[Firebase Realtime Manager] Returning cached data after error for ${path}`);
          callback(cached);
        }
      }
    };

    // Set up the listener
    const unsubscribeFn = onValue(dbRef, handleSnapshot, handleError);
    
    // Store listener info
    this.listeners.set(listenerId, {
      id: listenerId,
      path,
      callback,
      unsubscribe: () => {
        off(dbRef, 'value', handleSnapshot);
        this.listeners.delete(listenerId);
      },
      isActive: true,
      errorCount: 0
    });

    console.log(`[Firebase Realtime Manager] Subscribed to ${path} with ID ${listenerId}`);
    
    // Return unsubscribe function
    return () => {
      const listener = this.listeners.get(listenerId);
      if (listener) {
        listener.unsubscribe();
        console.log(`[Firebase Realtime Manager] Unsubscribed from ${path}`);
      }
    };
  }

  /**
   * Handle listener errors with retry logic
   */
  private handleListenerError(listenerId: string, error: Error, onError?: ErrorCallback): void {
    const listener = this.listeners.get(listenerId);
    if (!listener) return;

    listener.errorCount++;
    listener.lastError = error;

    if (onError) {
      onError(error);
    }

    // If too many errors, deactivate listener
    if (listener.errorCount >= 3) {
      console.warn(`[Firebase Realtime Manager] Deactivating listener ${listenerId} due to repeated errors`);
      listener.isActive = false;
    }
  }

  /**
   * Reconnect all active listeners (called on visibility change)
   */
  public reconnectAllListeners(): void {
    if (!this.isOnline || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Firebase Realtime Manager] Skipping reconnection - offline or max attempts reached');
      return;
    }

    console.log(`[Firebase Realtime Manager] Reconnecting ${this.listeners.size} listeners...`);
    this.reconnectAttempts++;

    // Reconnect all active listeners
    this.listeners.forEach((listener) => {
      if (listener.isActive && listener.errorCount < 3) {
        try {
          // Unsubscribe old listener
          listener.unsubscribe();
          
          // Create new listener
          if (realtimeDb) {
            const dbRef = ref(realtimeDb, listener.path);
            const unsubscribeFn = onValue(dbRef, (snapshot) => {
              const data = snapshot.exists() ? snapshot.val() : null;
              listener.callback(data);
            });
            
            // Update unsubscribe function
            listener.unsubscribe = () => off(dbRef, 'value', unsubscribeFn);
            listener.errorCount = 0;
            
            console.log(`[Firebase Realtime Manager] Reconnected listener for ${listener.path}`);
          }
        } catch (error) {
          console.error(`[Firebase Realtime Manager] Failed to reconnect listener for ${listener.path}:`, error);
        }
      }
    });

    // Reset reconnect attempts on successful reconnection
    setTimeout(() => {
      this.reconnectAttempts = 0;
    }, 10000); // Reset after 10 seconds
  }

  /**
   * User data subscription with real-time sync
   */
  public subscribeToUser(userId: string, callback: ListenerCallback<User>): UnsubscribeFunction {
    const path = `telegram_users/${userId}`;
    const cacheKey = `${this.USER_DATA_KEY}_${userId}`;
    
    return this.subscribeToPath<any>(path, (data) => {
      if (data) {
        const user: User = {
          ...data,
          id: userId,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          lastClaimDate: data.lastClaimDate ? new Date(data.lastClaimDate) : undefined,
          farmingStartTime: data.farmingStartTime ? new Date(data.farmingStartTime) : undefined,
          farmingEndTime: data.farmingEndTime ? new Date(data.farmingEndTime) : undefined,
          vipEndTime: data.vipEndTime ? new Date(data.vipEndTime) : undefined
        };
        callback(user);
      } else {
        callback(null);
      }
    }, cacheKey);
  }

  /**
   * Admin settings subscription with real-time sync
   */
  public subscribeToAdminSettings(callback: ListenerCallback<AdminSettings>): UnsubscribeFunction {
    const path = 'admin_settings';
    const cacheKey = this.ADMIN_SETTINGS_KEY;
    
    return this.subscribeToPath<any>(path, (data) => {
      let settings: AdminSettings;
      if (data) {
        settings = {
          ...DEFAULT_SETTINGS,
          ...data,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
        };
      } else {
        settings = DEFAULT_SETTINGS;
      }
      callback(settings);
    }, cacheKey);
  }

  /**
   * Global config subscription for instant admin-to-user updates
   */
  public subscribeToGlobalConfig(callback: ListenerCallback<any>): UnsubscribeFunction {
    const path = 'config/globalSettings';
    const cacheKey = 'global_config';
    
    return this.subscribeToPath<any>(path, callback, cacheKey);
  }

  /**
   * Tasks subscription with real-time sync
   */
  public subscribeToTasks(callback: ListenerCallback<Task[]>): UnsubscribeFunction {
    const path = 'tasks';
    const cacheKey = this.TASKS_KEY;
    
    return this.subscribeToPath<any>(path, (data) => {
      const tasks: Task[] = [];
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([taskId, taskData]: [string, any]) => {
          if (taskData && typeof taskData === 'object') {
            const task: Task = {
              id: taskId,
              title: taskData.title || '',
              description: taskData.description || '',
              type: taskData.type || 'link',
              reward: taskData.reward || 0,
              url: taskData.url || '',
              isActive: taskData.isActive || false,
              createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
              updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date()
            };
            tasks.push(task);
          }
        });
      }
      callback(tasks);
    }, cacheKey);
  }

  /**
   * User tasks subscription
   */
  public subscribeToUserTasks(userId: string, callback: ListenerCallback<UserTask[]>): UnsubscribeFunction {
    const path = `userTasks/${userId}`;
    const cacheKey = `user_tasks_${userId}`;
    
    return this.subscribeToPath<any>(path, (data) => {
      const userTasks: UserTask[] = [];
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([taskId, taskData]: [string, any]) => {
          if (taskData && typeof taskData === 'object') {
            const userTask: UserTask = {
              id: taskId,
              userId: userId,
              taskId: taskId,
              status: taskData.status || 'pending',
              completedAt: taskData.completedAt ? new Date(taskData.completedAt) : undefined,
              claimedAt: taskData.claimedAt ? new Date(taskData.claimedAt) : undefined
            };
            userTasks.push(userTask);
          }
        });
      }
      callback(userTasks);
    }, cacheKey);
  }

  /**
   * Update user data with sanitization and retry
   */
  public async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    const safeUserData = {
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      username: userData.username || '',
      photoUrl: userData.photoUrl || '',
      coins: userData.coins ?? 0,
      xp: userData.xp ?? 0,
      level: userData.level ?? 1,
      vipTier: userData.vipTier || 'free',
      dailyStreak: userData.dailyStreak ?? 0,
      farmingMultiplier: userData.farmingMultiplier ?? 1,
      referralMultiplier: userData.referralMultiplier ?? 1,
      updatedAt: new Date().toISOString(),
      ...userData
    };

    const path = `telegram_users/${userId}`;
    await this.safeUpdate(path, safeUserData);
  }

  /**
   * Update admin settings with immediate user panel sync
   */
  public async updateAdminSettings(settings: Partial<AdminSettings>): Promise<void> {
    const sanitizedSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    // Update both admin_settings and global config for instant sync
    await Promise.all([
      this.safeUpdate('admin_settings', sanitizedSettings),
      this.safeUpdate('config/globalSettings', sanitizedSettings)
    ]);

    console.log('[Firebase Realtime Manager] Admin settings updated and synced globally');
  }

  /**
   * Get connection status
   */
  public getStatus() {
    return {
      isOnline: this.isOnline,
      listenersCount: this.listeners.size,
      activeListeners: Array.from(this.listeners.values()).filter(l => l.isActive).length,
      reconnectAttempts: this.reconnectAttempts,
      cacheSize: this.cache.size
    };
  }

  /**
   * Cleanup all listeners and cache
   */
  public cleanup(): void {
    console.log('[Firebase Realtime Manager] Cleaning up all listeners and cache...');
    
    this.listeners.forEach(listener => {
      listener.unsubscribe();
    });
    this.listeners.clear();
    
    this.cache.clear();
    
    if (typeof window !== 'undefined') {
      // Clear sessionStorage cache
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('[Firebase Realtime Manager] Cleanup complete');
  }
}

// Export singleton instance
export const firebaseRealtimeManager = FirebaseRealtimeManager.getInstance();

// Convenience functions
export const subscribeToUser = (userId: string, callback: ListenerCallback<User>) => 
  firebaseRealtimeManager.subscribeToUser(userId, callback);

export const subscribeToAdminSettings = (callback: ListenerCallback<AdminSettings>) =>
  firebaseRealtimeManager.subscribeToAdminSettings(callback);

export const subscribeToTasks = (callback: ListenerCallback<Task[]>) =>
  firebaseRealtimeManager.subscribeToTasks(callback);

export const subscribeToUserTasks = (userId: string, callback: ListenerCallback<UserTask[]>) =>
  firebaseRealtimeManager.subscribeToUserTasks(userId, callback);

export const subscribeToGlobalConfig = (callback: ListenerCallback<any>) =>
  firebaseRealtimeManager.subscribeToGlobalConfig(callback);

export const updateUserSafe = (userId: string, userData: Partial<User>) =>
  firebaseRealtimeManager.updateUser(userId, userData);

export const updateAdminSettingsSafe = (settings: Partial<AdminSettings>) =>
  firebaseRealtimeManager.updateAdminSettings(settings);

export const sanitizeForFirebase = FirebaseRealtimeManager.sanitizeFirebaseData;

export default firebaseRealtimeManager;