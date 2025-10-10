// firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

// ✅ Load Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Debug env variables
console.log('[Firebase] Environment variables status:');
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`  ${key}:`, value ? 'SET ✅' : 'NOT SET ❌');
});

// ✅ Validate required fields
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = requiredFields.filter(
  (field) => !firebaseConfig[field as keyof typeof firebaseConfig]
);

if (missingFields.length > 0) {
  throw new Error(
    `[Firebase] Missing required environment variables: ${missingFields.join(', ')}`
  );
}

// ✅ Initialize Firebase app
const app: FirebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// ✅ Initialize Firebase services
let db: Firestore | null = null;
let realtimeDb: Database | null = null;
let auth: Auth | null = null;

try {
  db = getFirestore(app);
  console.log('[Firebase] Firestore initialized ✅');
} catch (err) {
  console.error('[Firebase] Firestore initialization failed ❌', err);
}

try {
  realtimeDb = getDatabase(app);
  console.log('[Firebase] Realtime Database initialized ✅');
} catch (err) {
  console.error('[Firebase] Realtime Database initialization failed ❌', err);
}

try {
  auth = getAuth(app);
  console.log('[Firebase] Auth initialized ✅');
} catch (err) {
  console.error('[Firebase] Auth initialization failed ❌', err);
}

// ✅ Export services
export { app, db, realtimeDb, auth };
export default app;