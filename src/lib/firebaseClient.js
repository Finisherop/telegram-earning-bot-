'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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
let db = null;

function initializeFirebaseClient() {
  if (typeof window === 'undefined') {
    console.log('[Firebase Client] Skipping initialization on server side');
    return { app: null, db: null };
  }

  try {
    // Validate required configuration
    const required = ['apiKey', 'projectId', 'appId'];
    const missing = required.filter(key => !firebaseConfig[key]);
    
    if (missing.length > 0) {
      console.error('[Firebase Client] Configuration missing:', missing.join(', '));
      return { app: null, db: null };
    }

    // Initialize Firebase app (only once)
    if (!app) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      console.log('[Firebase Client] ✅ Firebase App initialized successfully');
    }
    
    // Initialize Firestore
    if (!db && app) {
      db = getFirestore(app);
      console.log('[Firebase Client] ✅ Firestore initialized successfully');
      console.log('[Firebase Client] 🔥 Firebase is ready for use!');
    }
    
    return { app, db };
  } catch (error) {
    console.error('[Firebase Client] Initialization failed:', error);
    return { app: null, db: null };
  }
}

// Initialize immediately if on client side
const { app: firebaseApp, db: firestore } = initializeFirebaseClient();

// Example function to read Telegram user's document from Firestore
export async function getTelegramUserDoc(userId) {
  if (!firestore || !userId) {
    console.warn('[Firebase Client] Firestore not available or no userId provided');
    return null;
  }

  try {
    const userDocRef = doc(firestore, 'telegram_users', String(userId));
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log('[Firebase Client] User document found:', userDoc.data());
      return userDoc.data();
    } else {
      console.log('[Firebase Client] No user document found for userId:', userId);
      return null;
    }
  } catch (error) {
    console.error('[Firebase Client] Error reading user document:', error);
    return null;
  }
}

// Example function to create/update Telegram user's document in Firestore
export async function setTelegramUserDoc(userId, userData) {
  if (!firestore || !userId || !userData) {
    console.warn('[Firebase Client] Firestore not available or missing data');
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

    const userDocRef = doc(firestore, 'telegram_users', String(userId));
    await setDoc(userDocRef, sanitizedData, { merge: true });
    
    console.log('[Firebase Client] User document updated successfully:', sanitizedData);
    return true;
  } catch (error) {
    console.error('[Firebase Client] Error updating user document:', error);
    return false;
  }
}

// Export Firebase instances
export { firebaseApp, firestore };
export default firebaseApp;