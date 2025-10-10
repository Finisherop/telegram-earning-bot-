import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA_cKKrwrqNyb0xl28IbHAnaJa3ChOdsZU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'telegram-bot-2be45.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://telegram-bot-2be45-default-rtdb.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'telegram-bot-2be45',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'telegram-bot-2be45.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '947875567907',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:947875567907:web:ea7b37b36643872e199496',
};

// Debug environment variables
console.log('Environment variables debug:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET',
});

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  console.log('Validating Firebase config:', firebaseConfig);
  
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    return !value || value === 'undefined' || value === '';
  });
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    console.error('Current config values:', {
      apiKey: firebaseConfig.apiKey ? 'SET' : 'NOT SET',
      authDomain: firebaseConfig.authDomain ? 'SET' : 'NOT SET', 
      projectId: firebaseConfig.projectId ? 'SET' : 'NOT SET',
      appId: firebaseConfig.appId ? 'SET' : 'NOT SET',
    });
    throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
  }
  
  console.log('Firebase configuration validated successfully');
};

// Initialize Firebase with error handling
let app: FirebaseApp | null;
let db: Firestore | null;
let realtimeDb: Database | null;
let auth: Auth | null;

try {
  validateFirebaseConfig();
  
  // Initialize Firebase only if it hasn't been initialized already
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  
  // Initialize services
  db = getFirestore(app);
  realtimeDb = getDatabase(app);
  auth = getAuth(app);
  
  console.log('Firebase services initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  
  // Show user-friendly error message
  if (typeof window !== 'undefined') {
    const errorMessage = `Firebase initialization failed. This may be due to configuration issues. The app will continue in offline mode with limited functionality.`;
    console.warn(errorMessage);
    
    // Store error state for components to handle
    (window as any).__FIREBASE_ERROR__ = {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
  
  // Create mock services for development/fallback
  app = null;
  db = null;
  realtimeDb = null;
  auth = null;
}

export { db, realtimeDb, auth };
export default app;