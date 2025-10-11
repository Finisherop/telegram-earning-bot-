/**
 * Firebase Singleton Service
 * 
 * Ensures Firebase is initialized only once and provides shared instances
 * of Firestore, Realtime Database, and Auth services.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, Database, connectDatabaseEmulator } from 'firebase/database';
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

export interface FirebaseServices {
  app: FirebaseApp;
  db: Firestore;
  realtimeDb: Database;
  auth: Auth;
  isInitialized: boolean;
  initializationError: Error | null;
}

class FirebaseSingleton {
  private static instance: FirebaseSingleton;
  private services: FirebaseServices | null = null;
  private initializationPromise: Promise<FirebaseServices> | null = null;

  private constructor() {}

  public static getInstance(): FirebaseSingleton {
    if (!FirebaseSingleton.instance) {
      FirebaseSingleton.instance = new FirebaseSingleton();
    }
    return FirebaseSingleton.instance;
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

    console.log('[FirebaseSingleton] Configuration validated successfully');
  }

  /**
   * Initializes Firebase services (only once)
   */
  private async initializeServices(): Promise<FirebaseServices> {
    try {
      console.log('[FirebaseSingleton] Starting Firebase initialization...');
      
      // Validate configuration first
      this.validateConfig();

      // Initialize Firebase app (singleton pattern)
      let app: FirebaseApp;
      const existingApps = getApps();
      
      if (existingApps.length > 0) {
        console.log('[FirebaseSingleton] Using existing Firebase app');
        app = existingApps[0];
      } else {
        console.log('[FirebaseSingleton] Creating new Firebase app');
        app = initializeApp(firebaseConfig);
      }

      // Initialize services
      console.log('[FirebaseSingleton] Initializing Firebase services...');
      
      const db = getFirestore(app);
      const realtimeDb = getDatabase(app);
      const auth = getAuth(app);

      // Connect to emulators in development (optional)
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        try {
          // Only connect to emulators if they're not already connected
          if (!('_delegate' in db) || !(db as any)._delegate._databaseId) {
            // Check if emulator connection should be made
            const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
            if (useEmulator) {
              console.log('[FirebaseSingleton] Connecting to Firebase emulators...');
              connectFirestoreEmulator(db, 'localhost', 8080);
              connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
              connectAuthEmulator(auth, 'http://localhost:9099');
            }
          }
        } catch (emulatorError) {
          console.warn('[FirebaseSingleton] Emulator connection failed:', emulatorError);
          // Continue without emulators
        }
      }

      const services: FirebaseServices = {
        app,
        db,
        realtimeDb,
        auth,
        isInitialized: true,
        initializationError: null
      };

      console.log('[FirebaseSingleton] Firebase services initialized successfully');
      
      // Store global reference for debugging
      if (typeof window !== 'undefined') {
        (window as any).__FIREBASE_SERVICES__ = services;
      }

      return services;

    } catch (error) {
      console.error('[FirebaseSingleton] Firebase initialization failed:', error);
      
      const errorServices: FirebaseServices = {
        app: null as any,
        db: null as any,
        realtimeDb: null as any,
        auth: null as any,
        isInitialized: false,
        initializationError: error as Error
      };

      // Store error state for debugging
      if (typeof window !== 'undefined') {
        (window as any).__FIREBASE_INITIALIZATION_ERROR__ = error;
      }

      throw error;
    }
  }

  /**
   * Gets Firebase services (initializes on first call)
   */
  public async getServices(): Promise<FirebaseServices> {
    // Return cached services if already initialized
    if (this.services && this.services.isInitialized) {
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
   * Gets Firebase services synchronously (for cases where async isn't possible)
   * Returns null if services aren't initialized yet
   */
  public getServicesSync(): FirebaseServices | null {
    return this.services;
  }

  /**
   * Checks if Firebase is initialized
   */
  public isInitialized(): boolean {
    return this.services?.isInitialized ?? false;
  }

  /**
   * Gets initialization error if any
   */
  public getInitializationError(): Error | null {
    return this.services?.initializationError ?? null;
  }

  /**
   * Force re-initialization (for testing or error recovery)
   */
  public async reinitialize(): Promise<FirebaseServices> {
    console.log('[FirebaseSingleton] Force re-initializing Firebase...');
    this.services = null;
    this.initializationPromise = null;
    return this.getServices();
  }
}

// Export singleton instance
export const firebaseSingleton = FirebaseSingleton.getInstance();

/**
 * Convenience function to get Firebase services
 */
export async function getFirebaseServices(): Promise<FirebaseServices> {
  return firebaseSingleton.getServices();
}

/**
 * Convenience function to get Firebase services synchronously
 */
export function getFirebaseServicesSync(): FirebaseServices | null {
  return firebaseSingleton.getServicesSync();
}

/**
 * Initialize Firebase on client-side only
 */
if (typeof window !== 'undefined') {
  // Auto-initialize Firebase when module loads on client
  firebaseSingleton.getServices().catch(error => {
    console.error('[FirebaseSingleton] Auto-initialization failed:', error);
    // Don't throw here to prevent breaking the app
  });
}

// Export individual services for backward compatibility
export async function getFirestoreDb(): Promise<Firestore> {
  const services = await getFirebaseServices();
  return services.db;
}

export async function getRealtimeDatabase(): Promise<Database> {
  const services = await getFirebaseServices();
  return services.realtimeDb;
}

export async function getFirebaseAuth(): Promise<Auth> {
  const services = await getFirebaseServices();
  return services.auth;
}

// Export the legacy firebase services for existing code compatibility
export const { db, realtimeDb, auth } = (() => {
  // Only try to get sync services on client-side
  if (typeof window !== 'undefined') {
    const services = getFirebaseServicesSync();
    if (services) {
      return {
        db: services.db,
        realtimeDb: services.realtimeDb,
        auth: services.auth
      };
    }
  }
  
  // Return null for server-side rendering
  return {
    db: null as any,
    realtimeDb: null as any,
    auth: null as any
  };
})();

export default firebaseSingleton;