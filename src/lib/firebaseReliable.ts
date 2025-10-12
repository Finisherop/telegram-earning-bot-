/**
 * Reliable Firebase Integration Module
 * 
 * Features:
 * - Silent auto-reconnect with exponential backoff
 * - Offline cache with IndexedDB and auto-sync
 * - Zero user-facing errors or popups
 * - Automatic user creation in telegram_users
 * - Connection monitoring with long-polling fallback
 * - Lightweight listeners with duplicate prevention
 * - Full offline functionality
 */

import { 
  getDatabase, 
  ref, 
  onValue, 
  get, 
  set, 
  update, 
  onDisconnect,
  goOffline,
  goOnline,
  connectDatabaseEmulator,
  Database,
  DataSnapshot,
  DatabaseReference,
  Unsubscribe
} from 'firebase/database';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

// Types
interface CacheEntry {
  data: any;
  timestamp: number;
  path: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface ConnectionState {
  isOnline: boolean;
  isConnected: boolean;
  lastConnected: number;
  retryCount: number;
  mode: 'websocket' | 'longpoll' | 'offline';
}

interface QueuedOperation {
  id: string;
  type: 'set' | 'update' | 'remove';
  path: string;
  data?: any;
  timestamp: number;
  retries: number;
}

// Configuration
const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://tgfjf-5bbfe-default-rtdb.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

const CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  syncInterval: 30000, // 30 seconds
  dbName: 'TelegramAppCache',
  version: 1
};

class FirebaseReliableManager {
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private connectionState: ConnectionState = {
    isOnline: navigator.onLine,
    isConnected: false,
    lastConnected: 0,
    retryCount: 0,
    mode: 'websocket'
  };
  
  private cache: Map<string, CacheEntry> = new Map();
  private db: IDBDatabase | null = null;
  private operationQueue: QueuedOperation[] = [];
  private listeners: Map<string, Unsubscribe> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private connectionMonitor: NodeJS.Timeout | null = null;
  
  private isInitialized = false;
  private isTelegramWebApp = false;

  constructor() {
    this.detectEnvironment();
    this.setupNetworkMonitoring();
    this.initializeIndexedDB();
  }

  /**
   * Detect if running in Telegram WebApp
   */
  private detectEnvironment(): void {
    if (typeof window !== 'undefined') {
      this.isTelegramWebApp = !!(window as any).Telegram?.WebApp;
      this.connectionState.isOnline = navigator.onLine;
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.connectionState.isOnline = true;
      this.handleNetworkRestore();
    });

    window.addEventListener('offline', () => {
      this.connectionState.isOnline = false;
      this.connectionState.isConnected = false;
      this.connectionState.mode = 'offline';
    });

    // Start connection monitoring
    this.startConnectionMonitoring();
  }

  /**
   * Initialize IndexedDB for offline cache
   */
  private async initializeIndexedDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const request = indexedDB.open(CACHE_CONFIG.dbName, CACHE_CONFIG.version);
      
      request.onerror = () => {
        console.warn('[Firebase] IndexedDB not available, using memory cache');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'path' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.loadQueueFromStorage();
      };
    } catch (error) {
      console.warn('[Firebase] IndexedDB initialization failed, using memory cache');
    }
  }

  /**
   * Initialize Firebase with silent error handling
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Validate configuration silently
      if (!FIREBASE_CONFIG.databaseURL || !FIREBASE_CONFIG.projectId) {
        console.warn('[Firebase] Configuration incomplete, using offline mode');
        return false;
      }

      // Initialize Firebase app
      this.app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
      this.database = getDatabase(this.app);

      // Test connection silently
      const connected = await this.testConnection();
      if (connected) {
        this.connectionState.isConnected = true;
        this.connectionState.lastConnected = Date.now();
        this.connectionState.mode = 'websocket';
        this.startSyncInterval();
      } else {
        // Try long-polling mode
        await this.enableLongPollingMode();
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.warn('[Firebase] Initialization failed, running in offline mode');
      this.connectionState.mode = 'offline';
      return false;
    }
  }

  /**
   * Test Firebase connection silently
   */
  private async testConnection(): Promise<boolean> {
    if (!this.database) return false;

    try {
      const testRef = ref(this.database, '.info/connected');
      const snapshot = await get(testRef);
      return snapshot.exists();
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable long-polling mode as fallback
   */
  private async enableLongPollingMode(): Promise<void> {
    if (!this.database) return;

    try {
      // Force offline then online to trigger long-polling
      goOffline(this.database);
      await new Promise(resolve => setTimeout(resolve, 100));
      goOnline(this.database);
      
      this.connectionState.mode = 'longpoll';
      this.connectionState.isConnected = true;
      this.startSyncInterval();
    } catch (error) {
      this.connectionState.mode = 'offline';
    }
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    if (this.connectionMonitor) return;

    this.connectionMonitor = setInterval(async () => {
      if (!this.connectionState.isOnline) return;

      const wasConnected = this.connectionState.isConnected;
      const isConnected = await this.testConnection();

      if (!wasConnected && isConnected) {
        this.handleNetworkRestore();
      } else if (wasConnected && !isConnected) {
        this.handleConnectionLoss();
      }

      this.connectionState.isConnected = isConnected;
      
      // Update last connected time if connected
      if (isConnected) {
        this.connectionState.lastConnected = Date.now();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Handle network restoration
   */
  private async handleNetworkRestore(): Promise<void> {
    console.log('[Firebase] Network restored, reconnecting...');
    
    this.connectionState.retryCount = 0;
    
    if (!this.isInitialized) {
      await this.initialize();
    } else if (this.database) {
      goOnline(this.database);
      this.connectionState.isConnected = true;
      this.connectionState.mode = 'websocket';
    }

    // Process queued operations
    await this.processOperationQueue();
    
    // Restart sync interval
    this.startSyncInterval();
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLoss(): void {
    console.log('[Firebase] Connection lost, switching to offline mode');
    
    this.connectionState.isConnected = false;
    this.connectionState.mode = 'offline';
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    config: RetryConfig = RETRY_CONFIG
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxRetries) break;

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.warn('[Firebase] Operation failed after retries:', lastError?.message);
    return null;
  }

  /**
   * Safe database read with cache fallback
   */
  public async safeRead(path: string): Promise<any> {
    // Try cache first if offline
    if (!this.connectionState.isConnected) {
      return this.getCachedData(path);
    }

    if (!this.database) {
      return this.getCachedData(path);
    }

    const result = await this.retryOperation(async () => {
      const snapshot = await get(ref(this.database!, path));
      const data = snapshot.exists() ? snapshot.val() : null;
      
      // Cache the result
      if (data !== null) {
        await this.setCachedData(path, data);
      }
      
      return data;
    });

    // Fallback to cache if operation failed
    return result !== null ? result : this.getCachedData(path);
  }

  /**
   * Safe database write with queue fallback
   */
  public async safeWrite(path: string, data: any): Promise<boolean> {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random()}`,
      type: 'set',
      path,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    // If online, try immediate write
    if (this.connectionState.isConnected && this.database) {
      const success = await this.retryOperation(async () => {
        await set(ref(this.database!, path), data);
        return true;
      });

      if (success) {
        // Update cache
        await this.setCachedData(path, data);
        return true;
      }
    }

    // Queue for later if offline or failed
    this.operationQueue.push(operation);
    await this.saveQueueToStorage();
    
    // Update cache immediately for optimistic UI
    await this.setCachedData(path, data);
    return true;
  }

  /**
   * Safe database update with queue fallback
   */
  public async safeUpdate(path: string, updates: any): Promise<boolean> {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random()}`,
      type: 'update',
      path,
      data: updates,
      timestamp: Date.now(),
      retries: 0
    };

    // If online, try immediate update
    if (this.connectionState.isConnected && this.database) {
      const success = await this.retryOperation(async () => {
        await update(ref(this.database!, path), updates);
        return true;
      });

      if (success) {
        // Update cache
        const cached = await this.getCachedData(path) || {};
        await this.setCachedData(path, { ...cached, ...updates });
        return true;
      }
    }

    // Queue for later if offline or failed
    this.operationQueue.push(operation);
    await this.saveQueueToStorage();
    
    // Update cache immediately for optimistic UI
    const cached = await this.getCachedData(path) || {};
    await this.setCachedData(path, { ...cached, ...updates });
    return true;
  }

  /**
   * Safe listener with automatic reconnection
   */
  public safeListener(
    path: string, 
    callback: (data: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    const listenerId = `${path}_${Date.now()}`;
    
    // Remove existing listener if any
    if (this.listeners.has(path)) {
      this.listeners.get(path)!();
      this.listeners.delete(path);
    }

    const setupListener = () => {
      if (!this.database || !this.connectionState.isConnected) {
        // Use cached data if offline
        const cached = this.getCachedData(path);
        if (cached !== null) {
          callback(cached);
        }
        return;
      }

      try {
        const unsubscribe = onValue(
          ref(this.database, path),
          (snapshot) => {
            const data = snapshot.exists() ? snapshot.val() : null;
            callback(data);
            
            // Update cache
            if (data !== null) {
              this.setCachedData(path, data);
            }
          },
          (error) => {
            console.warn(`[Firebase] Listener error for ${path}:`, error.message);
            if (onError) onError(error);
            
            // Fallback to cached data
            const cached = this.getCachedData(path);
            if (cached !== null) {
              callback(cached);
            }
          }
        );

        this.listeners.set(path, unsubscribe);
      } catch (error) {
        console.warn(`[Firebase] Failed to setup listener for ${path}`);
        const cached = this.getCachedData(path);
        if (cached !== null) {
          callback(cached);
        }
      }
    };

    // Setup initial listener
    setupListener();

    // Return cleanup function
    return () => {
      if (this.listeners.has(path)) {
        this.listeners.get(path)!();
        this.listeners.delete(path);
      }
    };
  }

  /**
   * Auto-create user if doesn't exist
   */
  public async ensureUserExists(telegramId: string | number): Promise<any> {
    const userId = String(telegramId);
    const userPath = `telegram_users/${userId}`;
    
    // Check if user exists
    let userData = await this.safeRead(userPath);
    
    if (!userData) {
      // Create minimal user data
      const minimalUser = {
        id: userId,
        telegramId: userId,
        username: '',
        firstName: 'Telegram User',
        coins: 0,
        xp: 0,
        level: 1,
        dailyStreak: 0,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isActive: true,
        vipTier: 'free'
      };

      // Try to get more data from Telegram WebApp
      if (this.isTelegramWebApp && typeof window !== 'undefined') {
        try {
          const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          if (tgUser) {
            minimalUser.username = tgUser.username || '';
            minimalUser.firstName = tgUser.first_name || 'Telegram User';
          }
        } catch (error) {
          // Silent fail
        }
      }

      // Create user
      await this.safeWrite(userPath, minimalUser);
      userData = minimalUser;
    }

    return userData;
  }

  /**
   * Cache management
   */
  private async getCachedData(path: string): Promise<any> {
    // Try memory cache first
    const memoryEntry = this.cache.get(path);
    if (memoryEntry && Date.now() - memoryEntry.timestamp < CACHE_CONFIG.maxAge) {
      return memoryEntry.data;
    }

    // Try IndexedDB cache
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.get(path);
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result && Date.now() - result.timestamp < CACHE_CONFIG.maxAge) {
              // Update memory cache
              this.cache.set(path, result);
              resolve(result.data);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  private async setCachedData(path: string, data: any): Promise<void> {
    const entry: CacheEntry = {
      path,
      data,
      timestamp: Date.now()
    };

    // Update memory cache
    this.cache.set(path, entry);

    // Update IndexedDB cache
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.put(entry);
      } catch (error) {
        // Silent fail
      }
    }
  }

  /**
   * Operation queue management
   */
  private async processOperationQueue(): Promise<void> {
    if (!this.connectionState.isConnected || !this.database) return;

    const operations = [...this.operationQueue];
    this.operationQueue = [];

    for (const operation of operations) {
      const success = await this.retryOperation(async () => {
        const dbRef = ref(this.database!, operation.path);
        
        switch (operation.type) {
          case 'set':
            await set(dbRef, operation.data);
            break;
          case 'update':
            await update(dbRef, operation.data);
            break;
          case 'remove':
            await set(dbRef, null);
            break;
        }
        return true;
      });

      if (!success && operation.retries < RETRY_CONFIG.maxRetries) {
        operation.retries++;
        this.operationQueue.push(operation);
      }
    }

    await this.saveQueueToStorage();
  }

  private async saveQueueToStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      
      // Clear existing queue
      store.clear();
      
      // Save current queue
      for (const operation of this.operationQueue) {
        store.add(operation);
      }
    } catch (error) {
      // Silent fail
    }
  }

  private async loadQueueFromStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      const request = store.getAll();
      
      request.onsuccess = () => {
        this.operationQueue = request.result || [];
      };
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (this.connectionState.isConnected) {
        await this.processOperationQueue();
      }
    }, CACHE_CONFIG.syncInterval);
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }

    // Unsubscribe all listeners
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();

    // Close IndexedDB
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const firebaseReliable = new FirebaseReliableManager();

// Auto-initialize
if (typeof window !== 'undefined') {
  firebaseReliable.initialize();
}

export default firebaseReliable;