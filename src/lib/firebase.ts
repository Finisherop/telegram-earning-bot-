import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

// Robust Firebase configuration for deployment with fallbacks
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA_cKKrwrqNyb0xl28IbHAnaJa3ChOdsZU',
  // authDomain is optional for Realtime DB only usage
  ...(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && { 
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN 
  }),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://telegram-bot-2be45-default-rtdb.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'telegram-bot-2be45',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'telegram-bot-2be45.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '947875567907',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:947875567907:web:ea7b37b36643872e199496',
};

// Enhanced environment variables debugging
const envDebug = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'NOT SET',
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET',
};

console.log('[Firebase] Environment variables debug:', envDebug);

// Robust Firebase configuration validation (authDomain optional)
const validateFirebaseConfig = () => {
  console.log('[Firebase] Validating configuration...');
  console.log('[Firebase] Config object:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'NOT SET',
    authDomain: (firebaseConfig as any).authDomain || 'OPTIONAL (not required)',
    projectId: firebaseConfig.projectId || 'NOT SET',
    appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 15)}...` : 'NOT SET',
    databaseURL: firebaseConfig.databaseURL || 'NOT SET',
    storageBucket: firebaseConfig.storageBucket || 'NOT SET',
  });
  
  // Only require essential fields for Realtime DB usage (no auth)
  const requiredFields = ['apiKey', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    return !value || value === 'undefined' || value === '' || value === 'null';
  });
  
  if (missingFields.length > 0) {
    const errorMsg = `Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`;
    console.error('[Firebase] Configuration error:', errorMsg);
    console.error('[Firebase] Environment check:', envDebug);
    
    // Store error for components to handle
    if (typeof window !== 'undefined') {
      (window as any).__FIREBASE_CONFIG_ERROR__ = {
        error: errorMsg,
        missingFields,
        envDebug,
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error(errorMsg);
  }
  
  // Validate API key format
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('AIza')) {
    console.warn('[Firebase] API key format may be invalid');
  }
  
  // Validate project ID format
  if (firebaseConfig.projectId && firebaseConfig.projectId.includes('your_project')) {
    console.warn('[Firebase] Project ID appears to be a placeholder');
  }
  
  console.log('[Firebase] Configuration validated successfully (authDomain optional)');
};

// Initialize Firebase with robust error handling for deployment
let app: FirebaseApp | null = null;
let realtimeDb: Database | null = null;
let auth: Auth | null = null;

// Only initialize Firebase on client side to prevent SSR issues
if (typeof window !== 'undefined') {
  try {
    validateFirebaseConfig();
    
    console.log('[Firebase] Initializing Firebase app...');
    
    // Initialize Firebase only if it hasn't been initialized already
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    console.log('[Firebase] Firebase app initialized, setting up services...');
    
    // Initialize services with individual error handling
    try {
      realtimeDb = getDatabase(app);
      console.log('[Firebase] Realtime Database initialized successfully');
    } catch (realtimeError) {
      console.error('[Firebase] Realtime Database initialization failed:', realtimeError);
      realtimeDb = null;
    }
    
    try {
      auth = getAuth(app);
      console.log('[Firebase] Auth initialized successfully');
    } catch (authError) {
      console.error('[Firebase] Auth initialization failed:', authError);
      auth = null;
    }
    
    console.log('[Firebase] Firebase services initialization completed');
    
    // Store successful initialization state
    (window as any).__FIREBASE_INITIALIZED__ = true;
    (window as any).__FIREBASE_SERVICES__ = {
      app: !!app,
      realtimeDb: !!realtimeDb,
      auth: !!auth
    };
    
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
    
    // Enhanced error handling and user feedback
    const errorDetails = {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      configError: (window as any).__FIREBASE_CONFIG_ERROR__ || null,
      envDebug: envDebug
    };
    
    (window as any).__FIREBASE_ERROR__ = errorDetails;
    (window as any).__FIREBASE_INITIALIZED__ = false;
    
    console.warn('[Firebase] App will continue in offline mode with limited functionality');
    
    // Ensure services are null on error
    app = null;
    realtimeDb = null;
    auth = null;
  }
} else {
  // Server-side: set everything to null to prevent SSR issues
  console.log('[Firebase] Server-side rendering detected, skipping Firebase initialization');
}

export { realtimeDb, auth };
export default app;