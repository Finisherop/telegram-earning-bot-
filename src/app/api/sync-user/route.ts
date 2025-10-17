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

// Initialize Firebase Admin SDK with detailed logging
function initializeFirebaseAdmin() {
  console.log('[Firebase Admin] 🔧 Starting Firebase Admin initialization...');
  
  // Check if Firebase environment variables are defined
  const requiredEnvVars = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
    FIREBASE_CLIENT_CERT_URL: process.env.FIREBASE_CLIENT_CERT_URL,
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL
  };

  console.log('[Firebase Admin] 📋 Environment variables check:');
  const undefinedVars: string[] = [];
  
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (value === undefined) {
      console.error(`[Firebase Admin] ❌ ${key} is UNDEFINED`);
      undefinedVars.push(key);
    } else {
      console.log(`[Firebase Admin] ✅ ${key} is defined (length: ${value.length})`);
    }
  });

  if (undefinedVars.length > 0) {
    console.error('[Firebase Admin] 🚨 Missing environment variables:', undefinedVars);
    console.log('[Firebase Admin] 💡 Using fallback values for undefined variables');
  }

  if (getApps().length === 0) {
    try {
      console.log('[Firebase Admin] 🏗️ Creating Firebase Admin configuration...');
      
      // Firebase Admin configuration with detailed logging
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

      console.log('[Firebase Admin] 🔑 Service account config created:', {
        project_id: serviceAccount.project_id,
        client_email: serviceAccount.client_email ? 'SET' : 'MISSING',
        private_key: serviceAccount.private_key ? 'SET' : 'MISSING',
        private_key_id: serviceAccount.private_key_id ? 'SET' : 'MISSING'
      });

      const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://tgfjf-5bbfe-default-rtdb.firebaseio.com";
      console.log('[Firebase Admin] 🗄️ Database URL:', databaseURL);
      console.log('[Firebase Admin] 🔧 Initializing Firebase app...');

      const app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: databaseURL
      });

      console.log('[Firebase Admin] ✅ Firebase app initialized successfully');
      console.log('[Firebase Admin] 📱 App name:', app.name);
      console.log('[Firebase Admin] 🆔 Project ID:', app.options.projectId);
      
      return app;
    } catch (error) {
      console.error('[Firebase Admin] ❌ Initialization failed with error:', error);
      console.error('[Firebase Admin] 🔍 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  } else {
    console.log('[Firebase Admin] ♻️ Using existing Firebase app');
    const existingApp = getApps()[0];
    console.log('[Firebase Admin] 📱 Existing app name:', existingApp.name);
    return existingApp;
  }
}

export async function POST(request: NextRequest) {
  console.log('[Sync User API] 🚀 === NEW REQUEST RECEIVED ===');
  console.log('[Sync User API] 🕐 Timestamp:', new Date().toISOString());
  console.log('[Sync User API] 🌐 Request URL:', request.url);
  console.log('[Sync User API] 📋 Request method:', request.method);

  try {
    // Parse request body with detailed logging
    console.log('[Sync User API] 📥 Parsing request body...');
    const body = await request.json();
    
    console.log('[Sync User API] 📦 Raw request body:', JSON.stringify(body, null, 2));
    console.log('[Sync User API] 🔍 Body type:', typeof body);
    console.log('[Sync User API] 📊 Body keys:', Object.keys(body || {}));

    const { telegramUser }: { telegramUser: TelegramUserData } = body;

    console.log('[Sync User API] 👤 Extracted telegramUser:', JSON.stringify(telegramUser, null, 2));
    console.log('[Sync User API] 📱 Telegram user data received:', {
      id: telegramUser?.id,
      id_type: typeof telegramUser?.id,
      first_name: telegramUser?.first_name,
      last_name: telegramUser?.last_name,
      username: telegramUser?.username || 'N/A',
      photo_url: telegramUser?.photo_url || 'N/A'
    });

    // Validate Telegram user data with detailed logging
    console.log('[Sync User API] ✅ Validating Telegram user data...');
    
    if (!telegramUser) {
      console.error('[Sync User API] ❌ telegramUser is null/undefined');
      return NextResponse.json({ error: 'telegramUser is missing' }, { status: 400 });
    }

    if (!telegramUser.id) {
      console.error('[Sync User API] ❌ telegramUser.id is missing:', telegramUser.id);
      return NextResponse.json({ error: 'telegramUser.id is missing' }, { status: 400 });
    }

    if (typeof telegramUser.id !== 'number') {
      console.error('[Sync User API] ❌ telegramUser.id is not a number:', {
        value: telegramUser.id,
        type: typeof telegramUser.id
      });
      return NextResponse.json({ error: 'telegramUser.id must be a number' }, { status: 400 });
    }

    // Validate it's a real Telegram ID (not browser fallback)
    const userId = telegramUser.id.toString();
    console.log('[Sync User API] 🔢 User ID validation:', {
      originalId: telegramUser.id,
      stringId: userId,
      length: userId.length,
      containsBrowser: userId.includes('browser'),
      containsTimestamp: userId.includes('timestamp')
    });

    if (userId.includes('browser') || userId.includes('timestamp') || userId.length < 5) {
      console.error('[Sync User API] ❌ Invalid user ID format:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID format - only real Telegram users allowed' },
        { status: 400 }
      );
    }

    console.log('[Sync User API] ✅ Valid Telegram user ID:', userId);

    // Initialize Firebase Admin with detailed logging
    console.log('[Sync User API] 🔥 Initializing Firebase Admin...');
    let app, database;
    
    try {
      app = initializeFirebaseAdmin();
      console.log('[Sync User API] ✅ Firebase app initialized:', !!app);
      
      database = getDatabase(app);
      console.log('[Sync User API] ✅ Database instance created:', !!database);
      console.log('[Sync User API] 🗄️ Database app name:', database.app.name);
    } catch (firebaseInitError) {
      console.error('[Sync User API] ❌ Firebase initialization failed:', firebaseInitError);
      console.error('[Sync User API] 🔍 Firebase init error details:', {
        name: firebaseInitError instanceof Error ? firebaseInitError.name : 'Unknown',
        message: firebaseInitError instanceof Error ? firebaseInitError.message : 'Unknown error',
        stack: firebaseInitError instanceof Error ? firebaseInitError.stack : 'No stack trace'
      });
      return NextResponse.json(
        { error: 'Firebase initialization failed', details: firebaseInitError instanceof Error ? firebaseInitError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Prepare Firebase path with detailed logging
    const userPath = `telegram_users/${userId}`;
    console.log('[Sync User API] 📍 Target Firebase path:', userPath);
    console.log('[Sync User API] 🔗 Creating database reference...');

    let userRef;
    try {
      userRef = database.ref(userPath);
      console.log('[Sync User API] ✅ Database reference created successfully');
      console.log('[Sync User API] 📋 Reference details:', {
        key: userRef.key,
        toString: userRef.toString()
      });
    } catch (refError) {
      console.error('[Sync User API] ❌ Failed to create database reference:', refError);
      return NextResponse.json(
        { error: 'Failed to create database reference', details: refError instanceof Error ? refError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Check if user exists with detailed logging
    console.log('[Sync User API] 🔍 Checking if user exists...');
    let existingSnapshot, existingData;
    
    try {
      existingSnapshot = await userRef.once('value');
      existingData = existingSnapshot.val();
      
      console.log('[Sync User API] 📊 Existing user check result:', {
        exists: existingSnapshot.exists(),
        hasData: !!existingData,
        dataKeys: existingData ? Object.keys(existingData) : []
      });
      
      if (existingData) {
        console.log('[Sync User API] 👤 Existing user data preview:', {
          id: existingData.id,
          firstName: existingData.firstName,
          coins: existingData.coins,
          createdAt: existingData.createdAt
        });
      }
    } catch (readError) {
      console.error('[Sync User API] ❌ Failed to read existing user data:', readError);
      return NextResponse.json(
        { error: 'Failed to read existing user data', details: readError instanceof Error ? readError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    let userData: FirebaseUserData;
    let operation: string;

    if (existingData) {
      // Update existing user
      console.log('[Sync User API] 🔄 Updating existing user...');
      userData = {
        ...existingData,
        firstName: telegramUser.first_name || existingData.firstName,
        lastName: telegramUser.last_name || existingData.lastName || '',
        username: telegramUser.username || existingData.username || '',
        profilePic: telegramUser.photo_url || existingData.profilePic || '',
        updatedAt: new Date().toISOString()
      };
      operation = 'update';
      console.log('[Sync User API] 📝 Update data prepared');
    } else {
      // Create new user
      console.log('[Sync User API] 🆕 Creating new user...');
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
      console.log('[Sync User API] 📝 New user data prepared');
    }

    console.log('[Sync User API] 📋 Final user data to write:', JSON.stringify(userData, null, 2));
    console.log('[Sync User API] 🎯 Operation type:', operation);

    // Wrap Firebase write operation in try/catch block
    console.log('[Sync User API] 💾 === STARTING FIREBASE WRITE OPERATION ===');
    
    try {
      console.log('[Sync User API] 📤 Executing userRef.set()...');
      await userRef.set(userData);
      console.log('[Sync User API] ✅ Firebase write operation completed successfully');
    } catch (writeError) {
      console.error('[Sync User API] ❌ === FIREBASE WRITE OPERATION FAILED ===');
      console.error('[Sync User API] 🚨 Internal Firebase sync error:', writeError);
      console.error('[Sync User API] 🔍 Write error details:', {
        name: writeError instanceof Error ? writeError.name : 'Unknown',
        message: writeError instanceof Error ? writeError.message : 'Unknown error',
        code: (writeError as any)?.code || 'No error code',
        stack: writeError instanceof Error ? writeError.stack : 'No stack trace'
      });
      
      return NextResponse.json(
        { 
          error: 'Firebase write operation failed', 
          details: writeError instanceof Error ? writeError.message : 'Unknown error',
          code: (writeError as any)?.code || 'Unknown code'
        },
        { status: 500 }
      );
    }

    // Verify write with detailed logging
    console.log('[Sync User API] 🔍 === STARTING WRITE VERIFICATION ===');
    
    try {
      console.log('[Sync User API] 📖 Reading back written data...');
      const verificationSnapshot = await userRef.once('value');
      
      console.log('[Sync User API] 📊 Verification snapshot details:', {
        exists: verificationSnapshot.exists(),
        key: verificationSnapshot.key,
        hasChildren: verificationSnapshot.hasChildren()
      });
      
      if (verificationSnapshot.exists()) {
        const savedData = verificationSnapshot.val();
        console.log('[Sync User API] ✅ Write verification successful!');
        console.log('[Sync User API] 📦 Verified saved data:', {
          path: userPath,
          id: savedData.id,
          firstName: savedData.firstName,
          coins: savedData.coins,
          operation: operation
        });

        console.log('[Sync User API] 🎉 === REQUEST COMPLETED SUCCESSFULLY ===');
        
        return NextResponse.json({
          success: true,
          operation,
          user: savedData,
          path: userPath,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('[Sync User API] ❌ Write verification failed - no data found at path:', userPath);
        return NextResponse.json(
          { error: 'Write verification failed - data not found after write', path: userPath },
          { status: 500 }
        );
      }
    } catch (verificationError) {
      console.error('[Sync User API] ❌ Write verification error:', verificationError);
      return NextResponse.json(
        { error: 'Write verification failed', details: verificationError instanceof Error ? verificationError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Sync User API] ❌ === UNHANDLED ERROR IN REQUEST ===');
    console.error('[Sync User API] 🚨 Top-level error:', error);
    console.error('[Sync User API] 🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
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