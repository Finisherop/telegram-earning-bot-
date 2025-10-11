/**
 * Enhanced Tab-Aware Firebase Connection Manager
 * 
 * Fixes tab switching issues by distinguishing between:
 * 1. Tab switching (should maintain connection)
 * 2. App backgrounding (can disconnect to save resources)
 * 3. Network changes (should reconnect)
 */

import { initializeApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getDatabase, Database, connectDatabaseEmulator, goOffline, goOnline } from 'firebase/database';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA_cKKrwrqNyb0xl28IbHAnaJa3ChOdsZU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'telegram-bot-2be45.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://telegram-bot-2be45-default-rtdb.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'telegram-bot-2be45',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'telegram-bot-2be45.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '947875567907',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:947875567907:web:ea7b37b36643872e199496',
};

export interface ConnectionStatus {
  isConnected: boolean;
  isInitialized: boolean;
  lastConnectionTime: number;
  connectionAttempts: number;
  error: Error | null;
  isTabActive: boolean;
  lastTabSwitchTime: number;
}

export interface FirebaseServices {
  app: FirebaseApp;
  db: Firestore;
  realtimeDb: Database;
  auth: Auth;
  isInitialized: boolean;
  connectionStatus: ConnectionStatus;
}

class EnhancedFirebaseConnectionManager {
  private static instance: EnhancedFirebaseConnectionManager;
  private services: FirebaseServices | null = null;
  private initializationPromise: Promise<FirebaseServices> | null = null;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isInitialized: false,
    lastConnectionTime: 0,
    connectionAttempts: 0,
    error: null,
    isTabActive: true,
    lastTabSwitchTime: Date.now()
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isDestroyed = false;
  private eventListeners: (() => void)[] = [];
  private tabSwitchTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupEnhancedListeners();
    }
  }

  public static getInstance(): EnhancedFirebaseConnectionManager {
    if (!EnhancedFirebaseConnectionManager.instance) {
      EnhancedFirebaseConnectionManager.instance = new EnhancedFirebaseConnectionManager();
    }
    return EnhancedFirebaseConnectionManager.instance;
  }

  /**
   * Setup enhanced listeners that distinguish between tab switching and app backgrounding
   */
  private setupEnhancedListeners(): void {
    // Tab/Window visibility change listener (enhanced)
    const visibilityChangeHandler = () => {
      const now = Date.now();
      this.connectionStatus.lastTabSwitchTime = now;
      
      if (document.hidden) {
        console.log('[EnhancedFirebaseManager] Tab hidden - monitoring for background vs tab switch');
        this.handleTabHidden();
      } else {
        console.log('[EnhancedFirebaseManager] Tab visible - ensuring connection is active');
        this.handleTabVisible();
      }
    };

    // Focus/blur handlers for better tab switching detection
    const focusHandler = () => {
      console.log('[EnhancedFirebaseManager] Window focused - tab is active');
      this.connectionStatus.isTabActive = true;
      this.connectionStatus.lastTabSwitchTime = Date.now();
      
      // Clear any pending background timeout
      if (this.tabSwitchTimeout) {
        clearTimeout(this.tabSwitchTimeout);
        this.tabSwitchTimeout = null;
      }
      
      // Ensure Firebase is connected
      this.ensureFirebaseConnection();
    };

    const blurHandler = () => {
      console.log('[EnhancedFirebaseManager] Window blurred - checking if tab switch or background');
      this.connectionStatus.isTabActive = false;
      this.connectionStatus.lastTabSwitchTime = Date.now();
      
      // Don't immediately disconnect - might be just tab switching
      // Wait 5 seconds to see if user comes back
      this.tabSwitchTimeout = setTimeout(() => {
        if (!this.connectionStatus.isTabActive && document.hidden) {
          console.log('[EnhancedFirebaseManager] Confirmed app backgrounding after tab switch delay');
          this.handleRealBackground();
        }
      }, 5000);
    };

    // Network online/offline handlers
    const onlineHandler = () => {
      console.log('[EnhancedFirebaseManager] Network online - reconnecting Firebase');
      this.connectionStatus.isConnected = true;
      this.reconnectFirebase();
    };

    const offlineHandler = () => {
      console.log('[EnhancedFirebaseManager] Network offline');
      this.connectionStatus.isConnected = false;
      this.connectionStatus.error = new Error('Network offline');
    };

    // Page unload handler
    const beforeUnloadHandler = () => {
      console.log('[EnhancedFirebaseManager] Page unloading - graceful shutdown');
      this.gracefulDisconnect();
    };

    // Mouse/keyboard activity handlers (to detect real user activity)
    const activityHandler = () => {
      if (!this.connectionStatus.isTabActive) {
        console.log('[EnhancedFirebaseManager] User activity detected - ensuring connection');
        this.connectionStatus.isTabActive = true;
        this.ensureFirebaseConnection();
      }
    };

    // Add all event listeners
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('beforeunload', beforeUnloadHandler);
    
    // User activity detection
    document.addEventListener('click', activityHandler, { passive: true });
    document.addEventListener('keydown', activityHandler, { passive: true });
    document.addEventListener('mousemove', activityHandler, { passive: true });
    document.addEventListener('touchstart', activityHandler, { passive: true });

    // Store cleanup functions
    this.eventListeners.push(() => {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      document.removeEventListener('click', activityHandler);
      document.removeEventListener('keydown', activityHandler);
      document.removeEventListener('mousemove', activityHandler);
      document.removeEventListener('touchstart', activityHandler);
      
      if (this.tabSwitchTimeout) {
        clearTimeout(this.tabSwitchTimeout);
      }
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    // Setup Telegram WebApp specific listeners
    this.setupTelegramListeners();
    
    // Setup connection heartbeat
    this.setupConnectionHeartbeat();

    console.log('[EnhancedFirebaseManager] Enhanced tab-aware listeners setup completed');
  }

  /**
   * Setup Telegram WebApp specific listeners
   */
  private setupTelegramListeners(): void {
    const setupTgListeners = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.onEvent === 'function') {
        console.log('[EnhancedFirebaseManager] Setting up Telegram WebApp listeners');

        const viewportHandler = () => {
          console.log('[EnhancedFirebaseManager] Telegram viewport changed - ensuring connection');
          this.ensureFirebaseConnection();
        };

        const themeHandler = () => {
          console.log('[EnhancedFirebaseManager] Telegram theme changed - likely app resumed');
          this.connectionStatus.isTabActive = true;
          this.ensureFirebaseConnection();
        };

        tg.onEvent('viewportChanged', viewportHandler);
        tg.onEvent('themeChanged', themeHandler);

        this.eventListeners.push(() => {
          if (typeof tg.offEvent === 'function') {
            tg.offEvent('viewportChanged', viewportHandler);
            tg.offEvent('themeChanged', themeHandler);
          }
        });

        console.log('[EnhancedFirebaseManager] Telegram listeners registered');
      } else {
        setTimeout(setupTgListeners, 2000);
      }
    };

    setupTgListeners();
  }

  /**
   * Setup connection heartbeat to monitor health
   */
  private setupConnectionHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // Only check connection if tab is active
      if (this.connectionStatus.isTabActive && !document.hidden) {
        this.checkConnectionHealth();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle tab becoming hidden (might be tab switch or backgrounding)
   */
  private handleTabHidden(): void {
    // Don't immediately disconnect - could be just tab switching
    console.log('[EnhancedFirebaseManager] Tab hidden - waiting to determine if background or tab switch');
    this.connectionStatus.isTabActive = false;
    
    // Wait 3 seconds before considering it a real background event
    this.tabSwitchTimeout = setTimeout(() => {
      if (document.hidden && !this.connectionStatus.isTabActive) {
        console.log('[EnhancedFirebaseManager] Confirmed backgrounding - optimizing connection');
        this.handleRealBackground();
      }
    }, 3000);
  }

  /**
   * Handle tab becoming visible (returning from tab switch or background)
   */
  private handleTabVisible(): void {
    console.log('[EnhancedFirebaseManager] Tab visible - ensuring active connection');
    this.connectionStatus.isTabActive = true;
    
    // Clear any background timeout
    if (this.tabSwitchTimeout) {
      clearTimeout(this.tabSwitchTimeout);
      this.tabSwitchTimeout = null;
    }
    
    // Ensure Firebase connection is active
    this.ensureFirebaseConnection();
  }

  /**
   * Handle real backgrounding (not just tab switching)
   */
  private handleRealBackground(): void {
    console.log('[EnhancedFirebaseManager] Real backgrounding detected - optimizing resources');
    // Note: We don't fully disconnect, just optimize
    // Firebase will handle connection optimization internally
  }

  /**
   * Ensure Firebase connection is active
   */
  private async ensureFirebaseConnection(): Promise<void> {
    try {
      if (!this.services || !this.connectionStatus.isConnected) {
        console.log('[EnhancedFirebaseManager] Ensuring Firebase connection...');
        await this.reconnectFirebase();
      } else {
        // Just verify connection is healthy
        await this.verifyConnection();
      }
    } catch (error) {
      console.error('[EnhancedFirebaseManager] Error ensuring connection:', error);
    }
  }

  /**
   * Verify connection health without full reconnect
   */
  private async verifyConnection(): Promise<void> {
    try {
      if (this.services) {
        // Try to enable network (no-op if already enabled)
        await enableNetwork(this.services.db);
        goOnline(this.services.realtimeDb);
        
        this.connectionStatus.isConnected = true;
        this.connectionStatus.error = null;
        console.log('[EnhancedFirebaseManager] Connection verified healthy');
      }
    } catch (error) {
      console.warn('[EnhancedFirebaseManager] Connection verification failed, triggering reconnect:', error);
      await this.reconnectFirebase();
    }
  }

  /**
   * Check connection health
   */
  private checkConnectionHealth(): void {
    if (!this.services || !this.connectionStatus.isConnected) {
      console.log('[EnhancedFirebaseManager] Health check failed - reconnecting');
      this.reconnectFirebase();
    }
  }

  /**
   * Validate Firebase configuration
   */
  private validateConfig(): void {
    const requiredFields = ['apiKey', 'projectId', 'appId'];
    const missingFields = requiredFields.filter(field => {
      const value = firebaseConfig[field as keyof typeof firebaseConfig];
      return !value || value === 'undefined' || value === '' || value === 'null';
    });

    if (missingFields.length > 0) {
      throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Initialize Firebase services
   */
  private async initializeServices(): Promise<FirebaseServices> {
    try {
      console.log('[EnhancedFirebaseManager] Initializing Firebase services...');
      this.validateConfig();

      // Clean up any existing apps
      const existingApps = getApps();
      if (existingApps.length > 1) {
        for (let i = 1; i < existingApps.length; i++) {
          await deleteApp(existingApps[i]);
        }
      }

      // Initialize or get existing app
      let app: FirebaseApp;
      if (existingApps.length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = existingApps[0];
      }

      const db = getFirestore(app);
      const realtimeDb = getDatabase(app);
      const auth = getAuth(app);

      // Connect to emulators in development
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        try {
          connectFirestoreEmulator(db, 'localhost', 8080);
          connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
          connectAuthEmulator(auth, 'http://localhost:9099');
        } catch (emulatorError) {
          console.warn('[EnhancedFirebaseManager] Emulator connection failed:', emulatorError);
        }
      }

      this.connectionStatus = {
        ...this.connectionStatus,
        isConnected: true,
        isInitialized: true,
        lastConnectionTime: Date.now(),
        connectionAttempts: this.connectionStatus.connectionAttempts + 1,
        error: null
      };

      const services: FirebaseServices = {
        app,
        db,
        realtimeDb,
        auth,
        isInitialized: true,
        connectionStatus: this.connectionStatus
      };

      // Store global reference
      if (typeof window !== 'undefined') {
        (window as any).__ENHANCED_FIREBASE_MANAGER__ = this;
        (window as any).__FIREBASE_SERVICES__ = services;
      }

      console.log('[EnhancedFirebaseManager] Firebase services initialized successfully');
      return services;

    } catch (error) {
      this.connectionStatus.error = error as Error;
      this.connectionStatus.isInitialized = false;
      this.connectionStatus.isConnected = false;
      throw error;
    }
  }

  /**
   * Get Firebase services
   */
  public async getServices(): Promise<FirebaseServices> {
    if (this.isDestroyed) {
      throw new Error('Firebase manager has been destroyed');
    }

    if (this.services && this.services.isInitialized && this.connectionStatus.isConnected) {
      return this.services;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeServices();
    
    try {
      this.services = await this.initializationPromise;
      return this.services;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get Firebase services synchronously
   */
  public getServicesSync(): FirebaseServices | null {
    return this.services;
  }

  /**
   * Reconnect Firebase
   */
  public async reconnectFirebase(): Promise<void> {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    try {
      console.log(`[EnhancedFirebaseManager] Reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts++;

      if (this.services) {
        try {
          await enableNetwork(this.services.db);
          goOnline(this.services.realtimeDb);
          
          this.connectionStatus.isConnected = true;
          this.connectionStatus.error = null;
          this.connectionStatus.lastConnectionTime = Date.now();
          
          this.reconnectAttempts = 0; // Reset on success
          this.reconnectDelay = 1000;
          
          console.log('[EnhancedFirebaseManager] Firebase reconnected successfully');
        } catch (networkError) {
          this.services = null;
          this.initializationPromise = null;
          await this.getServices();
        }
      } else {
        await this.getServices();
      }
      
    } catch (error) {
      console.error('[EnhancedFirebaseManager] Reconnection failed:', error);
      this.connectionStatus.isConnected = false;
      this.connectionStatus.error = error as Error;
      
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectFirebase();
        }, this.reconnectDelay);
      }
    }
  }

  /**
   * Gracefully disconnect
   */
  private gracefulDisconnect(): void {
    try {
      if (this.services) {
        console.log('[EnhancedFirebaseManager] Gracefully disconnecting...');
        disableNetwork(this.services.db).catch(() => {});
        goOffline(this.services.realtimeDb);
        this.connectionStatus.isConnected = false;
      }
    } catch (error) {
      console.error('[EnhancedFirebaseManager] Error during graceful disconnect:', error);
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connectionStatus.isConnected && this.services?.isInitialized === true;
  }

  /**
   * Force reinitialize
   */
  public async reinitialize(): Promise<FirebaseServices> {
    console.log('[EnhancedFirebaseManager] Force reinitializing...');
    
    if (this.services) {
      try {
        await deleteApp(this.services.app);
      } catch (error) {
        console.warn('[EnhancedFirebaseManager] Error deleting existing app:', error);
      }
    }
    
    this.services = null;
    this.initializationPromise = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    return this.getServices();
  }

  /**
   * Destroy the manager
   */
  public destroy(): void {
    console.log('[EnhancedFirebaseManager] Destroying manager...');
    
    this.isDestroyed = true;
    
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    
    this.gracefulDisconnect();
    
    if (this.services) {
      try {
        deleteApp(this.services.app);
      } catch (error) {
        console.warn('[EnhancedFirebaseManager] Error deleting app during destroy:', error);
      }
    }
    
    this.services = null;
    this.initializationPromise = null;
  }
}

// Export singleton instance
export const enhancedFirebaseManager = EnhancedFirebaseConnectionManager.getInstance();

// Convenience functions
export async function getFirebaseServices(): Promise<FirebaseServices> {
  return enhancedFirebaseManager.getServices();
}

export function getFirebaseServicesSync(): FirebaseServices | null {
  return enhancedFirebaseManager.getServicesSync();
}

export function reconnectFirebase(): Promise<void> {
  return enhancedFirebaseManager.reconnectFirebase();
}

export function isFirebaseConnected(): boolean {
  return enhancedFirebaseManager.isConnected();
}

// Global functions for debugging
if (typeof window !== 'undefined') {
  (window as any).reconnectFirebase = () => enhancedFirebaseManager.reconnectFirebase();
  (window as any).getFirebaseStatus = () => enhancedFirebaseManager.getConnectionStatus();
  
  // Auto-initialize
  enhancedFirebaseManager.getServices().catch(error => {
    console.error('[EnhancedFirebaseManager] Auto-initialization failed:', error);
  });
}

export default enhancedFirebaseManager;