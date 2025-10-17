/**
 * Firebase Client Setup for Next.js 15
 * 
 * Client-side Firebase configuration using only firebase/app and firebase/database
 * No admin SDK, no private keys - completely client-safe
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database, ref, set, get } from 'firebase/database';

// Firebase configuration using existing environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app (only once)
let app: FirebaseApp;
let database: Database;

function initializeFirebaseClient(): FirebaseApp {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    console.log('[Firebase Client] 🚀 Initializing Firebase client...');
    
    // Validate required config
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
      console.error('[Firebase Client] ❌ Missing required Firebase configuration');
      throw new Error('Missing required Firebase configuration');
    }

    app = initializeApp(firebaseConfig);
    console.log('[Firebase Client] ✅ Firebase client initialized successfully');
    console.log('[Firebase Client] 🗄️ Database URL:', firebaseConfig.databaseURL);
    console.log('[Firebase Client] 🆔 Project ID:', firebaseConfig.projectId);
  } else {
    app = getApps()[0];
    console.log('[Firebase Client] ♻️ Using existing Firebase app');
  }

  return app;
}

// Initialize the app and get database instance
export function getFirebaseDatabase(): Database {
  if (!database) {
    const firebaseApp = initializeFirebaseClient();
    database = getDatabase(firebaseApp);
    console.log('[Firebase Client] 📊 Database instance created');
  }
  return database;
}

// User data interface
interface UserData {
  name: string;
  id: string | number;
  profile_pic?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save user data to Firebase Realtime Database
 * Path: users/{id}
 * Client-safe function using Firebase client SDK
 */
export async function saveUserData(user: UserData): Promise<boolean> {
  try {
    console.log('[Firebase Client] 💾 Saving user data:', {
      id: user.id,
      name: user.name,
      has_profile_pic: !!user.profile_pic
    });

    // Get database instance
    const db = getFirebaseDatabase();

    // Prepare user data with timestamps
    const userData = {
      name: user.name,
      id: user.id.toString(),
      profile_pic: user.profile_pic || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create reference to users/{id}
    const userPath = `users/${user.id}`;
    const userRef = ref(db, userPath);

    console.log('[Firebase Client] 📍 Writing to path:', userPath);

    // Check if user already exists
    const existingSnapshot = await get(userRef);
    
    if (existingSnapshot.exists()) {
      // Update existing user (preserve created_at)
      const existingData = existingSnapshot.val();
      userData.created_at = existingData.created_at || userData.created_at;
      console.log('[Firebase Client] 🔄 Updating existing user');
    } else {
      console.log('[Firebase Client] 🆕 Creating new user');
    }

    // Write data to Firebase
    await set(userRef, userData);
    console.log('[Firebase Client] ✅ User data saved successfully');

    // Verify write
    const verificationSnapshot = await get(userRef);
    if (verificationSnapshot.exists()) {
      const savedData = verificationSnapshot.val();
      console.log('[Firebase Client] 📦 Write verification successful:', {
        path: userPath,
        id: savedData.id,
        name: savedData.name
      });
      return true;
    } else {
      console.error('[Firebase Client] ❌ Write verification failed');
      return false;
    }

  } catch (error) {
    console.error('[Firebase Client] ❌ Error saving user data:', error);
    console.error('[Firebase Client] 🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code || 'No error code'
    });
    return false;
  }
}

/**
 * Get user data from Firebase Realtime Database
 * Path: users/{id}
 */
export async function getUserData(userId: string | number): Promise<UserData | null> {
  try {
    console.log('[Firebase Client] 📖 Getting user data for ID:', userId);

    const db = getFirebaseDatabase();
    const userPath = `users/${userId}`;
    const userRef = ref(db, userPath);

    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log('[Firebase Client] ✅ User data retrieved:', {
        id: userData.id,
        name: userData.name,
        path: userPath
      });
      return userData;
    } else {
      console.log('[Firebase Client] ⚠️ User not found:', userPath);
      return null;
    }

  } catch (error) {
    console.error('[Firebase Client] ❌ Error getting user data:', error);
    return null;
  }
}

/**
 * Check if Firebase client is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
  );
}

/**
 * Get Firebase configuration info (for debugging)
 */
export function getFirebaseConfig() {
  return {
    hasApiKey: !!firebaseConfig.apiKey,
    hasDatabaseURL: !!firebaseConfig.databaseURL,
    hasProjectId: !!firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL,
    projectId: firebaseConfig.projectId
  };
}

// Database function is exported above

// Export the initialized app for other Firebase services if needed
export function getFirebaseApp(): FirebaseApp {
  return initializeFirebaseClient();
}

// Legacy aliases for backward compatibility
export const getTelegramUserData = getUserData;
export const setTelegramUserData = saveUserData;

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
  try {
    initializeFirebaseClient();
  } catch (error) {
    console.error('[Firebase Client] ❌ Auto-initialization failed:', error);
  }
}