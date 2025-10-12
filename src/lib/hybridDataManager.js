'use client';

import { localStorageService } from './localStorageService.js';
import { realtimeDb } from './firebaseClient.js';
import { ref, get, set, onValue, off } from 'firebase/database';

/**
 * Hybrid Data Manager
 * Manages data sync between Firebase Realtime Database and LocalStorage
 * Provides offline support and data persistence
 */

class HybridDataManager {
  constructor() {
    this.listeners = new Map();
    this.syncQueue = [];
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.setupOnlineListener();
  }

  setupOnlineListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[HybridData] Back online, syncing data...');
        this.isOnline = true;
        this.syncPendingData();
      });

      window.addEventListener('offline', () => {
        console.log('[HybridData] Gone offline, using LocalStorage...');
        this.isOnline = false;
      });
    }
  }

  // User Data Operations
  async getUserData(userId) {
    console.log('[HybridData] Getting user data for:', userId);
    
    if (!userId) {
      console.warn('[HybridData] No userId provided');
      return null;
    }

    try {
      // Try Firebase first if online
      if (this.isOnline && realtimeDb) {
        console.log('[HybridData] Trying Firebase for user data...');
        const userRef = ref(realtimeDb, `telegram_users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const firebaseData = snapshot.val();
          const userData = {
            ...firebaseData,
            telegramId: firebaseData.telegramId || firebaseData.id || userId,
            source: 'firebase'
          };
          
          // Save to LocalStorage as backup
          localStorageService.saveUserData(userId, userData);
          console.log('[HybridData] ✅ User data loaded from Firebase:', userId);
          return userData;
        }
      }

      // Fallback to LocalStorage
      console.log('[HybridData] Trying LocalStorage for user data...');
      const localData = localStorageService.getUserData(userId);
      
      if (localData) {
        console.log('[HybridData] ✅ User data loaded from LocalStorage:', userId);
        return localData;
      }

      // Create default user if not found anywhere
      console.log('[HybridData] Creating default user data:', userId);
      const defaultUser = this.createDefaultUser(userId);
      await this.saveUserData(userId, defaultUser);
      return defaultUser;

    } catch (error) {
      console.error('[HybridData] Error getting user data:', error);
      
      // Try LocalStorage as last resort
      const localData = localStorageService.getUserData(userId);
      if (localData) {
        console.log('[HybridData] ✅ Fallback to LocalStorage successful');
        return localData;
      }
      
      return null;
    }
  }

  async saveUserData(userId, userData) {
    console.log('[HybridData] Saving user data for:', userId);
    
    if (!userId || !userData) {
      console.warn('[HybridData] Invalid userId or userData');
      return false;
    }

    try {
      // Ensure telegramId is set
      const safeUserData = {
        ...userData,
        telegramId: userData.telegramId || userData.id || userId,
        lastUpdated: new Date().toISOString()
      };

      // Always save to LocalStorage first (immediate)
      const localSaved = localStorageService.saveUserData(userId, safeUserData);
      console.log('[HybridData] LocalStorage save:', localSaved ? '✅' : '❌');

      // Try Firebase if online
      if (this.isOnline && realtimeDb) {
        try {
          const userRef = ref(realtimeDb, `telegram_users/${userId}`);
          await set(userRef, safeUserData);
          console.log('[HybridData] ✅ Firebase save successful');
          localStorageService.setLastSync();
          return true;
        } catch (firebaseError) {
          console.error('[HybridData] Firebase save failed:', firebaseError);
          // Add to sync queue for later
          this.addToSyncQueue('user', userId, safeUserData);
        }
      } else {
        // Add to sync queue for when online
        this.addToSyncQueue('user', userId, safeUserData);
        console.log('[HybridData] Added to sync queue (offline)');
      }

      return localSaved;
    } catch (error) {
      console.error('[HybridData] Error saving user data:', error);
      return false;
    }
  }

  // Real-time User Data Subscription
  subscribeToUserData(userId, callback) {
    console.log('[HybridData] Setting up user data subscription:', userId);
    
    if (!userId || !callback) {
      console.warn('[HybridData] Invalid userId or callback');
      return () => {};
    }

    const subscriptionKey = `user_${userId}`;
    
    // Setup Firebase listener if online
    if (this.isOnline && realtimeDb) {
      try {
        const userRef = ref(realtimeDb, `telegram_users/${userId}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
          try {
            if (snapshot.exists()) {
              const firebaseData = snapshot.val();
              const userData = {
                ...firebaseData,
                telegramId: firebaseData.telegramId || firebaseData.id || userId,
                source: 'firebase'
              };
              
              // Save to LocalStorage
              localStorageService.saveUserData(userId, userData);
              console.log('[HybridData] 🔄 Real-time user data update from Firebase');
              callback(userData);
            } else {
              // Try LocalStorage fallback
              const localData = localStorageService.getUserData(userId);
              if (localData) {
                console.log('[HybridData] 🔄 Fallback to LocalStorage data');
                callback(localData);
              } else {
                // Create default user
                const defaultUser = this.createDefaultUser(userId);
                this.saveUserData(userId, defaultUser);
                callback(defaultUser);
              }
            }
          } catch (error) {
            console.error('[HybridData] Error in Firebase listener:', error);
            // Fallback to LocalStorage
            const localData = localStorageService.getUserData(userId);
            if (localData) {
              callback(localData);
            }
          }
        });

        this.listeners.set(subscriptionKey, unsubscribe);
        return unsubscribe;
      } catch (error) {
        console.error('[HybridData] Error setting up Firebase listener:', error);
      }
    }

    // Offline mode - return LocalStorage data immediately
    const localData = localStorageService.getUserData(userId);
    if (localData) {
      console.log('[HybridData] 📱 Offline mode - using LocalStorage data');
      setTimeout(() => callback(localData), 0);
    } else {
      // Create default user for offline mode
      const defaultUser = this.createDefaultUser(userId);
      localStorageService.saveUserData(userId, defaultUser);
      setTimeout(() => callback(defaultUser), 0);
    }

    // Return cleanup function
    return () => {
      const listener = this.listeners.get(subscriptionKey);
      if (listener) {
        if (realtimeDb) {
          const userRef = ref(realtimeDb, `telegram_users/${userId}`);
          off(userRef, 'value', listener);
        }
        this.listeners.delete(subscriptionKey);
      }
    };
  }

  // Tasks Operations
  async getTasks() {
    console.log('[HybridData] Getting tasks...');
    
    try {
      // Try Firebase first if online
      if (this.isOnline && realtimeDb) {
        const tasksRef = ref(realtimeDb, 'tasks');
        const snapshot = await get(tasksRef);
        
        if (snapshot.exists()) {
          const tasksData = snapshot.val();
          const tasksArray = Object.keys(tasksData).map(key => ({
            id: key,
            ...tasksData[key]
          })).filter(task => task.isActive !== false);
          
          // Save to LocalStorage
          localStorageService.saveTasks(tasksArray);
          console.log('[HybridData] ✅ Tasks loaded from Firebase:', tasksArray.length);
          return tasksArray;
        }
      }

      // Fallback to LocalStorage
      const localTasks = localStorageService.getTasks();
      if (localTasks.length > 0) {
        console.log('[HybridData] ✅ Tasks loaded from LocalStorage:', localTasks.length);
        return localTasks;
      }

      // Return default tasks
      console.log('[HybridData] Using default tasks');
      return this.getDefaultTasks();
    } catch (error) {
      console.error('[HybridData] Error getting tasks:', error);
      return localStorageService.getTasks() || this.getDefaultTasks();
    }
  }

  // User Tasks Operations
  async getUserTasks(userId) {
    console.log('[HybridData] Getting user tasks for:', userId);
    
    if (!userId) return [];

    try {
      // Try Firebase first if online
      if (this.isOnline && realtimeDb) {
        const userTasksRef = ref(realtimeDb, `userTasks/${userId}`);
        const snapshot = await get(userTasksRef);
        
        if (snapshot.exists()) {
          const userTasksData = snapshot.val();
          const userTasksArray = Object.keys(userTasksData).map(key => ({
            id: key,
            taskId: key,
            userId: userId,
            ...userTasksData[key]
          }));
          
          // Save to LocalStorage
          localStorageService.saveUserTasks(userId, userTasksArray);
          console.log('[HybridData] ✅ User tasks loaded from Firebase:', userTasksArray.length);
          return userTasksArray;
        }
      }

      // Fallback to LocalStorage
      const localUserTasks = localStorageService.getUserTasks(userId);
      console.log('[HybridData] ✅ User tasks loaded from LocalStorage:', localUserTasks.length);
      return localUserTasks;
    } catch (error) {
      console.error('[HybridData] Error getting user tasks:', error);
      return localStorageService.getUserTasks(userId) || [];
    }
  }

  // Sync Queue Management
  addToSyncQueue(type, id, data) {
    this.syncQueue.push({
      type,
      id,
      data,
      timestamp: new Date().toISOString()
    });
    console.log('[HybridData] Added to sync queue:', type, id);
  }

  async syncPendingData() {
    if (!this.isOnline || !realtimeDb || this.syncQueue.length === 0) {
      return;
    }

    console.log('[HybridData] Syncing pending data:', this.syncQueue.length, 'items');
    
    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToSync) {
      try {
        if (item.type === 'user') {
          const userRef = ref(realtimeDb, `telegram_users/${item.id}`);
          await set(userRef, item.data);
          console.log('[HybridData] ✅ Synced user data:', item.id);
        }
        // Add more sync types as needed
      } catch (error) {
        console.error('[HybridData] Error syncing item:', error);
        // Re-add to queue for retry
        this.syncQueue.push(item);
      }
    }

    if (this.syncQueue.length === 0) {
      localStorageService.setLastSync();
      console.log('[HybridData] ✅ All data synced successfully');
    }
  }

  // Helper Methods
  createDefaultUser(userId) {
    return {
      id: userId,
      telegramId: userId,
      first_name: 'User',
      last_name: '',
      username: '',
      coins: 0,
      xp: 0,
      level: 1,
      dailyStreak: 0,
      vipTier: 'free',
      adsLimitPerDay: 5,
      farmingMultiplier: 1,
      referralMultiplier: 1,
      withdrawalLimit: 1000,
      minWithdrawal: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'default'
    };
  }

  getDefaultTasks() {
    return [
      {
        id: 'task_1',
        title: 'Join Telegram Channel',
        description: 'Join our official Telegram channel',
        type: 'social',
        reward: 100,
        url: 'https://t.me/your_channel',
        isActive: true
      },
      {
        id: 'task_2',
        title: 'Watch Advertisement',
        description: 'Watch a short video ad to earn coins',
        type: 'ads',
        reward: 50,
        isActive: true
      },
      {
        id: 'task_3',
        title: 'Daily Reward',
        description: 'Claim your daily reward',
        type: 'daily',
        reward: 50,
        isActive: true
      }
    ];
  }

  // Cleanup
  cleanup() {
    this.listeners.forEach((unsubscribe, key) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
    console.log('[HybridData] Cleanup completed');
  }
}

// Export singleton instance
export const hybridDataManager = new HybridDataManager();
export default hybridDataManager;