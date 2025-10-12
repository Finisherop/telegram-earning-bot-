import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

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

// Validate required configuration
function validateConfig() {
  const required = ['apiKey', 'databaseURL', 'projectId', 'appId'];
  const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    throw new Error(`Firebase configuration missing: ${missing.join(', ')}`);
  }
}

// Initialize Firebase
let app: FirebaseApp | null = null;
let realtimeDb: Database | null = null;
let auth: Auth | null = null;

// Only initialize on client side
if (typeof window !== 'undefined') {
  try {
    validateConfig();
    
    // Initialize Firebase app (only once)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // Initialize services
    realtimeDb = getDatabase(app);
    auth = getAuth(app);
    
    console.log('[Firebase] Initialized successfully');
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    app = null;
    realtimeDb = null;
    auth = null;
  }
}

export { realtimeDb, auth };
export default app;