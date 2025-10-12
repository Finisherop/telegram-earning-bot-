'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set, update } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once on client side
let app = null;
let database = null;

function initializeFirebaseClient() {
  if (typeof window === 'undefined') {
    console.log('[Firebase Client] Skipping initialization on server side');
    return { app: null, database: null };
  }

  try {
    // Validate required configuration
    const required = ['apiKey', 'databaseURL', 'projectId', 'appId'];
    const missing = required.filter(key => !firebaseConfig[key]);
    
    if (missing.length > 0) {
      console.error('[Firebase Client] Configuration missing:', missing.join(', '));
      return { app: null, database: null };
    }

    // Initialize Firebase app (only once)
    if (!app) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      console.log('[Firebase Client] ✅ Firebase App initialized successfully');
    }
    
    // Initialize Realtime Database
    if (!database && app) {
      database = getDatabase(app);
      console.log('[Firebase Client] ✅ Realtime Database initialized successfully');
      console.log('[Firebase Client] 🔥 Firebase Realtime Database is ready for use!');
    }
    
    return { app, database };
  } catch (error) {
    console.error('[Firebase Client] Initialization failed:', error);
    return { app: null, database: null };
  }
}

// Initialize immediately if on client side
const { app: firebaseApp, database: realtimeDb } = initializeFirebaseClient();

// Example function to read Telegram user's data from Realtime Database
export async function getTelegramUserData(userId) {
  if (!realtimeDb || !userId) {
    console.warn('[Firebase Client] Realtime Database not available or no userId provided');
    return null;
  }

  try {
    const userRef = ref(realtimeDb, `telegram_users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      console.log('[Firebase Client] User data found:', snapshot.val());
      return snapshot.val();
    } else {
      console.log('[Firebase Client] No user data found for userId:', userId);
      return null;
    }
  } catch (error) {
    console.error('[Firebase Client] Error reading user data:', error);
    return null;
  }
}

// Example function to create/update Telegram user's data in Realtime Database
export async function setTelegramUserData(userId, userData) {
  if (!realtimeDb || !userId || !userData) {
    console.warn('[Firebase Client] Realtime Database not available or missing data');
    return false;
  }

  try {
    // Sanitize data to prevent undefined values
    const sanitizedData = {
      id: userData.id || userId,
      first_name: userData.first_name || 'User',
      last_name: userData.last_name || '',
      username: userData.username || '',
      language_code: userData.language_code || 'en',
      is_premium: userData.is_premium || false,
      updated_at: new Date().toISOString(),
      ...userData
    };

    // Remove any undefined values
    Object.keys(sanitizedData).forEach(key => {
      if (sanitizedData[key] === undefined) {
        delete sanitizedData[key];
      }
    });

    const userRef = ref(realtimeDb, `telegram_users/${userId}`);
    await set(userRef, sanitizedData);
    
    console.log('[Firebase Client] User data updated successfully:', sanitizedData);
    return true;
  } catch (error) {
    console.error('[Firebase Client] Error updating user data:', error);
    return false;
  }
}

// Export Firebase instances
export { firebaseApp, realtimeDb };
export default firebaseApp;