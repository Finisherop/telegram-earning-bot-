/**
 * Sync User API Route
 * 
 * Server-side Firebase Admin SDK route to create/update Telegram users
 * Path: /api/sync-user
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface FirebaseUserData {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  profilePic: string;
  coins: number;
  level: number;
  xp: number;
  referralCount: number;
  referralEarnings: number;
  createdAt: string;
  updatedAt: string;
  vipTier: string;
}

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Firebase Admin configuration
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "tgfjf-5bbfe",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };

      const app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://tgfjf-5bbfe-default-rtdb.firebaseio.com"
      });

      console.log('[Firebase Admin] ✅ Initialized successfully');
      console.log('[Firebase Admin] 🗄️ Database URL:', process.env.FIREBASE_DATABASE_URL || "https://tgfjf-5bbfe-default-rtdb.firebaseio.com");
      
      return app;
    } catch (error) {
      console.error('[Firebase Admin] ❌ Initialization failed:', error);
      throw error;
    }
  }
  
  return getApps()[0];
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Sync User API] 🚀 Request received');

    // Parse request body
    const body = await request.json();
    const { telegramUser }: { telegramUser: TelegramUserData } = body;

    console.log('[Sync User API] 📱 Telegram user data received:', {
      id: telegramUser?.id,
      first_name: telegramUser?.first_name,
      username: telegramUser?.username || 'N/A'
    });

    // Validate Telegram user data
    if (!telegramUser || !telegramUser.id || typeof telegramUser.id !== 'number') {
      console.error('[Sync User API] ❌ Invalid Telegram user data');
      return NextResponse.json(
        { error: 'Invalid Telegram user data' },
        { status: 400 }
      );
    }

    // Validate it's a real Telegram ID (not browser fallback)
    const userId = telegramUser.id.toString();
    if (userId.includes('browser') || userId.includes('timestamp') || userId.length < 5) {
      console.error('[Sync User API] ❌ Invalid user ID format:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID format - only real Telegram users allowed' },
        { status: 400 }
      );
    }

    console.log('[Sync User API] ✅ Valid Telegram user ID:', userId);

    // Initialize Firebase Admin
    const app = initializeFirebaseAdmin();
    const database = getDatabase(app);

    // Prepare Firebase path
    const userPath = `telegram_users/${userId}`;
    console.log('[Sync User API] 📍 Target Firebase path:', userPath);

    // Check if user exists
    const userRef = database.ref(userPath);
    const existingSnapshot = await userRef.once('value');
    const existingData = existingSnapshot.val();

    let userData: FirebaseUserData;
    let operation: string;

    if (existingData) {
      // Update existing user
      userData = {
        ...existingData,
        firstName: telegramUser.first_name || existingData.firstName,
        lastName: telegramUser.last_name || existingData.lastName || '',
        username: telegramUser.username || existingData.username || '',
        profilePic: telegramUser.photo_url || existingData.profilePic || '',
        updatedAt: new Date().toISOString()
      };
      operation = 'update';
      console.log('[Sync User API] 🔄 Updating existing user');
    } else {
      // Create new user
      const now = new Date().toISOString();
      userData = {
        id: telegramUser.id,
        firstName: telegramUser.first_name || 'User',
        lastName: telegramUser.last_name || '',
        username: telegramUser.username || '',
        profilePic: telegramUser.photo_url || '',
        coins: 0,
        level: 1,
        xp: 0,
        referralCount: 0,
        referralEarnings: 0,
        createdAt: now,
        updatedAt: now,
        vipTier: 'free'
      };
      operation = 'create';
      console.log('[Sync User API] 🆕 Creating new user');
    }

    console.log('[Sync User API] 📝 User data to write:', {
      id: userData.id,
      firstName: userData.firstName,
      username: userData.username,
      operation
    });

    // Write to Firebase
    console.log('[Sync User API] 💾 Writing to Firebase...');
    await userRef.set(userData);
    console.log('[Sync User API] ✅ Firebase write successful');

    // Verify write
    console.log('[Sync User API] 🔍 Verifying write...');
    const verificationSnapshot = await userRef.once('value');
    
    if (verificationSnapshot.exists()) {
      const savedData = verificationSnapshot.val();
      console.log('[Sync User API] 📦 Write verification successful:', {
        path: userPath,
        id: savedData.id,
        firstName: savedData.firstName,
        coins: savedData.coins
      });

      return NextResponse.json({
        success: true,
        operation,
        user: savedData,
        path: userPath
      });
    } else {
      console.error('[Sync User API] ❌ Write verification failed - no data found');
      return NextResponse.json(
        { error: 'Write verification failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Sync User API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Sync User API - Use POST method with Telegram user data',
    expectedBody: {
      telegramUser: {
        id: 'number',
        first_name: 'string',
        last_name: 'string (optional)',
        username: 'string (optional)',
        photo_url: 'string (optional)'
      }
    }
  });
}