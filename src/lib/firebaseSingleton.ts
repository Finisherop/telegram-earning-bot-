/**
 * Firebase Singleton Service
 * 
 * Updated to use the new FirebaseConnectionManager for better
 * real-time connection management and Telegram WebApp integration.
 */

import { 
  firebaseConnectionManager, 
  getFirebaseServices as getConnectionManagerServices,
  getFirebaseServicesSync as getConnectionManagerServicesSync,
  reconnectFirebase,
  isFirebaseConnected
} from './firebaseConnectionManager';
import { FirebaseApp, getApps } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Database } from 'firebase/database';
import { Auth } from 'firebase/auth';

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
  connectionStatus: {
    isConnected: boolean;
    isInitialized: boolean;
    lastConnectionTime: number;
    connectionAttempts: number;
    error: Error | null;
  };
}

/**
 * Legacy singleton class for backwards compatibility
 * Now delegates to the new FirebaseConnectionManager
 */
class FirebaseSingleton {
  private static instance: FirebaseSingleton;

  private constructor() {}

  public static getInstance(): FirebaseSingleton {
    if (!FirebaseSingleton.instance) {
      FirebaseSingleton.instance = new FirebaseSingleton();
    }
    return FirebaseSingleton.instance;
  }

  /**
   * Gets Firebase services using the connection manager
   */
  public async getServices(): Promise<FirebaseServices> {
    return getConnectionManagerServices();
  }

  /**
   * Gets Firebase services synchronously
   */
  public getServicesSync(): FirebaseServices | null {
    return getConnectionManagerServicesSync();
  }

  /**
   * Checks if Firebase is initialized and connected
   */
  public isInitialized(): boolean {
    return isFirebaseConnected();
  }

  /**
   * Gets connection status
   */
  public getConnectionStatus() {
    return firebaseConnectionManager.getConnectionStatus();
  }

  /**
   * Force re-initialization
   */
  public async reinitialize(): Promise<FirebaseServices> {
    console.log('[FirebaseSingleton] Delegating reinitialize to connection manager');
    return firebaseConnectionManager.reinitialize();
  }

  /**
   * Manually trigger reconnection
   */
  public async reconnect(): Promise<void> {
    return reconnectFirebase();
  }
}

// Export singleton instance
export const firebaseSingleton = FirebaseSingleton.getInstance();

/**
 * Convenience function to get Firebase services
 */
export async function getFirebaseServices(): Promise<FirebaseServices> {
  return getConnectionManagerServices();
}

/**
 * Convenience function to get Firebase services synchronously
 */
export function getFirebaseServicesSync(): FirebaseServices | null {
  return getConnectionManagerServicesSync();
}

/**
 * Check if Firebase is connected
 */
export function isFirebaseInitialized(): boolean {
  return isFirebaseConnected();
}

/**
 * Manually reconnect Firebase
 */
export function reconnectFirebaseServices(): Promise<void> {
  return reconnectFirebase();
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