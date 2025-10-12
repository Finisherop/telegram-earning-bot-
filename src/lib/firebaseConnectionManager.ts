/**
 * Firebase Connection Manager for Telegram WebApp (Realtime Database Only)
 * 
 * Handles Firebase initialization, reconnection, and lifecycle management
 * specifically designed for Telegram WebApp with background/resume events.
 */

import { initializeApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getDatabase, Database, connectDatabaseEmulator, goOffline, goOnline } from 'firebase/database';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration with environment variables
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
}

export interface FirebaseServices {
  app: FirebaseApp;
  realtimeDb: Database;
  auth: Auth;
  isInitialized: boolean;
  connectionStatus: ConnectionStatus;
}

class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private services: FirebaseServices | null = null;
  private initializationPromise: Promise<FirebaseServices> | null = null;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isInitialized: false,
    lastConnectionTime: 0,
    connectionAttempts: 0,
    error: null
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isDestroyed = false;
  private telegramEventListeners: (() => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupTelegramWebAppListeners();
      this.setupVisibilityChangeListeners();
      this.setupOnlineOfflineListeners();
    }
  }

  public static getInstance(): FirebaseConnectionManager {
    if (!FirebaseConnectionManager.instance) {
      FirebaseConnectionManager.instance = new FirebaseConnectionManager();
    }
    return FirebaseConnectionManager.instance;
  }

  /**
   * Setup Telegram WebApp lifecycle event listeners
   */
  private setupTelegramWebAppListeners(): void {
    const setupListeners = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.onEvent === 'function') {
        console.log('[FirebaseConnectionManager] Setting up Telegram WebApp event listeners');

        // Handle app resume from background
        const resumeHandler = () => {
          console.log('[FirebaseConnectionManager] Telegram WebApp resumed from background');
          this.handleAppResume();
        };

        // Handle app going to background
        const pauseHandler = () => {
          console.log('[FirebaseConnectionManager] Telegram WebApp going to background');
          this.handleAppPause();
        };

        // Handle viewport changes (often indicates app state change)
        const viewportChangedHandler = () => {
          console.log('[FirebaseConnectionManager] Telegram WebApp viewport changed');
          this.handleViewportChange();
        };

        // Add event listeners
        tg.onEvent('viewportChanged', viewportChangedHandler);
        tg.onEvent('themeChanged', resumeHandler); // Theme change often happens on resume
        
        // Store cleanup functions
        this.telegramEventListeners.push(() => {
          if (typeof tg.offEvent === 'function') {
            tg.offEvent('viewportChanged', viewportChangedHandler);
            tg.offEvent('themeChanged', resumeHandler);
          }
        });

        console.log('[FirebaseConnectionManager] Telegram WebApp event listeners registered');
      } else {
        console.log('[FirebaseConnectionManager] Telegram WebApp not available, retrying in 2s...');
        setTimeout(setupListeners, 2000);
      }
    };

    // Try to setup listeners immediately
    setupListeners();

    // Also listen for custom events from enhanced initialization
    window.addEventListener('telegramWebAppReady', setupListeners);
  }

  /**
   * Setup browser visibility change listeners
   */
  private setupVisibilityChangeListeners(): void {
    const visibilityChangeHandler = () => {
      if (document.hidden) {
        console.log('[FirebaseConnectionManager] Page hidden (going to background)');
        this.handleAppPause();
      } else {
        console.log('[FirebaseConnectionManager] Page visible (resumed from background)');
        this.handleAppResume();
      }
    };

    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
    this.telegramEventListeners.push(() => {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
    });
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineOfflineListeners(): void {
    const onlineHandler = () => {
      console.log('[FirebaseConnectionManager] Network came online');
      this.handleNetworkOnline();
    };

    const offlineHandler = () => {
      console.log('[FirebaseConnectionManager] Network went offline');
      this.handleNetworkOffline();
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    this.telegramEventListeners.push(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  }

  /**
   * Handle app resume from background
   */
  private async handleAppResume(): Promise<void> {
    try {
      console.log('[FirebaseConnectionManager] Handling app resume...');
      
      // Reset reconnection attempts on resume
      this.reconnectAttempts = 0;
      
      // Check if we need to reconnect Firebase
      if (this.services) {
        await this.reconnectFirebase();
      } else {
        // If no services, try to initialize
        await this.getServices();
      }
      
      console.log('[FirebaseConnectionManager] App resume handled successfully');
    } catch (error) {
      console.error('[FirebaseConnectionManager] Error handling app resume:', error);
    }
  }

  /**
   * Handle app pause (going to background)
   */
  private handleAppPause(): void {
    try {
      console.log('[FirebaseConnectionManager] Handling app pause...');
      
      // Optionally disconnect Firebase to save resources
      if (this.services) {
        this.gracefulDisconnect();
      }
      
      console.log('[FirebaseConnectionManager] App pause handled successfully');
    } catch (error) {
      console.error('[FirebaseConnectionManager] Error handling app pause:', error);
    }
  }

  /**
   * Handle viewport changes
   */
  private handleViewportChange(): void {
    // Viewport changes might indicate the app becoming active
    // Debounce this to avoid excessive reconnections
    setTimeout(() => {
      if (this.services && !this.connectionStatus.isConnected) {
        this.reconnectFirebase();
      }
    }, 1000);
  }

  /**
   * Handle network coming online
   */
  private async handleNetworkOnline(): Promise<void> {
    try {
      console.log('[FirebaseConnectionManager] Network online, reconnecting Firebase...');
      await this.reconnectFirebase();
    } catch (error) {
      console.error('[FirebaseConnectionManager] Error reconnecting after network online:', error);
    }
  }

  /**
   * Handle network going offline
   */
  private handleNetworkOffline(): void {
    console.log('[FirebaseConnectionManager] Network offline, updating connection status');
    this.connectionStatus.isConnected = false;
    this.connectionStatus.error = new Error('Network offline');
  }

  /**
   * Validates Firebase configuration
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

    console.log('[FirebaseConnectionManager] Configuration validated successfully');
  }

  /**
   * Initialize Firebase services with proper error handling
   */
  private async initializeServices(): Promise<FirebaseServices> {
    try {
      console.log('[FirebaseConnectionManager] Initializing Firebase services...');
      
      // Validate configuration
      this.validateConfig();

      // Clean up any existing apps first
      const existingApps = getApps();
      if (existingApps.length > 1) {
        console.log('[FirebaseConnectionManager] Multiple Firebase apps detected, cleaning up...');
        for (let i = 1; i < existingApps.length; i++) {
          await deleteApp(existingApps[i]);
        }
      }

      // Initialize or get existing Firebase app
      let app: FirebaseApp;
      if (existingApps.length === 0) {
        console.log('[FirebaseConnectionManager] Creating new Firebase app');
        app = initializeApp(firebaseConfig);
      } else {
        console.log('[FirebaseConnectionManager] Using existing Firebase app');
        app = existingApps[0];
      }

      // Initialize services with Telegram WebApp optimizations
      const realtimeDb = getDatabase(app);
      const auth = getAuth(app);

      // Connect to emulators in development
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        try {
          console.log('[FirebaseConnectionManager] Connecting to Firebase emulators...');
          connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
          connectAuthEmulator(auth, 'http://localhost:9099');
        } catch (emulatorError) {
          console.warn('[FirebaseConnectionManager] Emulator connection failed:', emulatorError);
        }
      }

      // Update connection status
      this.connectionStatus = {
        isConnected: true,
        isInitialized: true,
        lastConnectionTime: Date.now(),
        connectionAttempts: this.connectionStatus.connectionAttempts + 1,
        error: null
      };

      const services: FirebaseServices = {
        app,
        realtimeDb,
        auth,
        isInitialized: true,
        connectionStatus: this.connectionStatus
      };

      // Store global reference for debugging
      if (typeof window !== 'undefined') {
        (window as any).__FIREBASE_CONNECTION_MANAGER__ = this;
        (window as any).__FIREBASE_SERVICES__ = services;
      }

      console.log('[FirebaseConnectionManager] Firebase services initialized successfully');
      return services;

    } catch (error) {
      console.error('[FirebaseConnectionManager] Firebase initialization failed:', error);
      
      this.connectionStatus.error = error as Error;
      this.connectionStatus.isInitialized = false;
      this.connectionStatus.isConnected = false;

      throw error;
    }
  }

  /**
   * Get Firebase services (initializes on first call)
   */
  public async getServices(): Promise<FirebaseServices> {
    if (this.isDestroyed) {
      throw new Error('FirebaseConnectionManager has been destroyed');
    }

    // Return cached services if available and connected
    if (this.services && this.services.isInitialized && this.connectionStatus.isConnected) {
      return this.services;
    }

    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.initializeServices();
    
    try {
      this.services = await this.initializationPromise;
      return this.services;
    } catch (error) {
      // Reset promise so next call can retry
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
   * Reconnect Firebase services
   */
  public async reconnectFirebase(): Promise<void> {
    if (this.isDestroyed) {
      console.log('[FirebaseConnectionManager] Manager destroyed, skipping reconnection');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[FirebaseConnectionManager] Max reconnection attempts reached');
      return;
    }

    try {
      console.log(`[FirebaseConnectionManager] Reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts++;

      if (this.services) {
        // Try to reconnect Realtime Database
        try {
          goOnline(this.services.realtimeDb);
          
          this.connectionStatus.isConnected = true;
          this.connectionStatus.error = null;
          this.connectionStatus.lastConnectionTime = Date.now();
          
          console.log('[FirebaseConnectionManager] Firebase reconnected successfully');
          
          // Reset reconnection attempts on success
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
        } catch (networkError) {
          console.warn('[FirebaseConnectionManager] Network reconnect failed, reinitializing...', networkError);
          
          // Force reinitialization
          this.services = null;
          this.initializationPromise = null;
          await this.getServices();
        }
      } else {
        // No existing services, initialize fresh
        await this.getServices();
      }
      
    } catch (error) {
      console.error('[FirebaseConnectionManager] Reconnection failed:', error);
      
      this.connectionStatus.isConnected = false;
      this.connectionStatus.error = error as Error;
      
      // Exponential backoff for next attempt
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
      
      // Schedule next reconnection attempt
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectFirebase();
        }, this.reconnectDelay);
      }
    }
  }

  /**
   * Gracefully disconnect Firebase
   */
  private gracefulDisconnect(): void {
    try {
      if (this.services) {
        console.log('[FirebaseConnectionManager] Gracefully disconnecting Firebase...');
        
        goOffline(this.services.realtimeDb);
        
        this.connectionStatus.isConnected = false;
        console.log('[FirebaseConnectionManager] Firebase disconnected gracefully');
      }
    } catch (error) {
      console.error('[FirebaseConnectionManager] Error during graceful disconnect:', error);
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if Firebase is connected
   */
  public isConnected(): boolean {
    return this.connectionStatus.isConnected && this.services?.isInitialized === true;
  }

  /**
   * Force reinitialize Firebase
   */
  public async reinitialize(): Promise<FirebaseServices> {
    console.log('[FirebaseConnectionManager] Force reinitializing Firebase...');
    
    // Clean up existing services
    if (this.services) {
      try {
        await deleteApp(this.services.app);
      } catch (error) {
        console.warn('[FirebaseConnectionManager] Error deleting existing app:', error);
      }
    }
    
    this.services = null;
    this.initializationPromise = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    return this.getServices();
  }

  /**
   * Destroy the connection manager
   */
  public destroy(): void {
    console.log('[FirebaseConnectionManager] Destroying connection manager...');
    
    this.isDestroyed = true;
    
    // Clean up event listeners
    this.telegramEventListeners.forEach(cleanup => cleanup());
    this.telegramEventListeners = [];
    
    // Disconnect Firebase
    this.gracefulDisconnect();
    
    // Clean up services
    if (this.services) {
      try {
        deleteApp(this.services.app);
      } catch (error) {
        console.warn('[FirebaseConnectionManager] Error deleting app during destroy:', error);
      }
    }
    
    this.services = null;
    this.initializationPromise = null;
  }
}

// Export singleton instance
export const firebaseConnectionManager = FirebaseConnectionManager.getInstance();

// Convenience functions
export async function getFirebaseServices(): Promise<FirebaseServices> {
  return firebaseConnectionManager.getServices();
}

export function getFirebaseServicesSync(): FirebaseServices | null {
  return firebaseConnectionManager.getServicesSync();
}

export function reconnectFirebase(): Promise<void> {
  return firebaseConnectionManager.reconnectFirebase();
}

export function isFirebaseConnected(): boolean {
  return firebaseConnectionManager.isConnected();
}

// Auto-initialize on client-side
if (typeof window !== 'undefined') {
  // Initialize Firebase when module loads
  firebaseConnectionManager.getServices().catch(error => {
    console.error('[FirebaseConnectionManager] Auto-initialization failed:', error);
  });
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    firebaseConnectionManager.destroy();
  });
}

export default firebaseConnectionManager;