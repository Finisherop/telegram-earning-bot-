'use client';

/**
 * LocalStorage Service for User Data Backup & Sync
 * Provides offline support and data persistence
 */

const STORAGE_KEYS = {
  USER_DATA: 'telegram_user_data',
  TASKS: 'telegram_tasks',
  USER_TASKS: 'telegram_user_tasks',
  SETTINGS: 'telegram_settings',
  LAST_SYNC: 'telegram_last_sync'
};

class LocalStorageService {
  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      if (typeof window === 'undefined') return false;
      
      const test = 'localStorage_test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('[LocalStorage] Not available:', e);
      return false;
    }
  }

  // User Data Operations
  saveUserData(userId, userData) {
    if (!this.isAvailable || !userId) return false;
    
    try {
      const key = `${STORAGE_KEYS.USER_DATA}_${userId}`;
      const dataToSave = {
        ...userData,
        telegramId: userData.telegramId || userData.id || userId,
        lastUpdated: new Date().toISOString(),
        source: 'localStorage'
      };
      
      localStorage.setItem(key, JSON.stringify(dataToSave));
      console.log('[LocalStorage] User data saved:', userId);
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error saving user data:', error);
      return false;
    }
  }

  getUserData(userId) {
    if (!this.isAvailable || !userId) return null;
    
    try {
      const key = `${STORAGE_KEYS.USER_DATA}_${userId}`;
      const data = localStorage.getItem(key);
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('[LocalStorage] User data loaded:', userId);
        return parsedData;
      }
      
      return null;
    } catch (error) {
      console.error('[LocalStorage] Error loading user data:', error);
      return null;
    }
  }

  // Tasks Operations
  saveTasks(tasks) {
    if (!this.isAvailable) return false;
    
    try {
      const dataToSave = {
        tasks,
        lastUpdated: new Date().toISOString(),
        source: 'localStorage'
      };
      
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(dataToSave));
      console.log('[LocalStorage] Tasks saved:', tasks.length);
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error saving tasks:', error);
      return false;
    }
  }

  getTasks() {
    if (!this.isAvailable) return [];
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('[LocalStorage] Tasks loaded:', parsedData.tasks?.length || 0);
        return parsedData.tasks || [];
      }
      
      return [];
    } catch (error) {
      console.error('[LocalStorage] Error loading tasks:', error);
      return [];
    }
  }

  // User Tasks Operations
  saveUserTasks(userId, userTasks) {
    if (!this.isAvailable || !userId) return false;
    
    try {
      const key = `${STORAGE_KEYS.USER_TASKS}_${userId}`;
      const dataToSave = {
        userTasks,
        lastUpdated: new Date().toISOString(),
        source: 'localStorage'
      };
      
      localStorage.setItem(key, JSON.stringify(dataToSave));
      console.log('[LocalStorage] User tasks saved:', userId, userTasks.length);
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error saving user tasks:', error);
      return false;
    }
  }

  getUserTasks(userId) {
    if (!this.isAvailable || !userId) return [];
    
    try {
      const key = `${STORAGE_KEYS.USER_TASKS}_${userId}`;
      const data = localStorage.getItem(key);
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('[LocalStorage] User tasks loaded:', userId, parsedData.userTasks?.length || 0);
        return parsedData.userTasks || [];
      }
      
      return [];
    } catch (error) {
      console.error('[LocalStorage] Error loading user tasks:', error);
      return [];
    }
  }

  // Settings Operations
  saveSettings(settings) {
    if (!this.isAvailable) return false;
    
    try {
      const dataToSave = {
        settings,
        lastUpdated: new Date().toISOString(),
        source: 'localStorage'
      };
      
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(dataToSave));
      console.log('[LocalStorage] Settings saved');
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error saving settings:', error);
      return false;
    }
  }

  getSettings() {
    if (!this.isAvailable) return {};
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('[LocalStorage] Settings loaded');
        return parsedData.settings || {};
      }
      
      return {};
    } catch (error) {
      console.error('[LocalStorage] Error loading settings:', error);
      return {};
    }
  }

  // Sync Operations
  setLastSync(timestamp = new Date().toISOString()) {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error setting last sync:', error);
      return false;
    }
  }

  getLastSync() {
    if (!this.isAvailable) return null;
    
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('[LocalStorage] Error getting last sync:', error);
      return null;
    }
  }

  // Utility Operations
  clearUserData(userId) {
    if (!this.isAvailable || !userId) return false;
    
    try {
      const userDataKey = `${STORAGE_KEYS.USER_DATA}_${userId}`;
      const userTasksKey = `${STORAGE_KEYS.USER_TASKS}_${userId}`;
      
      localStorage.removeItem(userDataKey);
      localStorage.removeItem(userTasksKey);
      
      console.log('[LocalStorage] User data cleared:', userId);
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error clearing user data:', error);
      return false;
    }
  }

  clearAll() {
    if (!this.isAvailable) return false;
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        // Clear all keys that start with our prefixes
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(key)) {
            localStorage.removeItem(storageKey);
          }
        }
      });
      
      console.log('[LocalStorage] All data cleared');
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error clearing all data:', error);
      return false;
    }
  }

  // Get storage info
  getStorageInfo() {
    if (!this.isAvailable) return { available: false };
    
    try {
      const info = {
        available: true,
        lastSync: this.getLastSync(),
        userDataKeys: [],
        totalSize: 0
      };
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('telegram_')) {
          const value = localStorage.getItem(key);
          info.userDataKeys.push(key);
          info.totalSize += (key.length + (value?.length || 0));
        }
      }
      
      return info;
    } catch (error) {
      console.error('[LocalStorage] Error getting storage info:', error);
      return { available: false, error: error.message };
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
export default localStorageService;