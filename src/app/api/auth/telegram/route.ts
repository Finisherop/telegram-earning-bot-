import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

/**
 * Telegram Auto-Authentication API
 * 
 * Creates Firebase custom tokens for Telegram users without requiring manual login.
 * Uses Telegram user ID as the Firebase UID with 'tg_' prefix for security.
 * 
 * Features:
 * - Custom token generation for Telegram users
 * - Automatic user creation in Firebase Auth
 * - Secure UID mapping (tg_${telegramId})
 * - Admin SDK integration for full control
 */

interface TelegramAuthRequest {
  telegramId: string | number;
  userData?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
    is_premium?: boolean;
  };
}

interface TelegramAuthResponse {
  success: boolean;
  token?: string;
  uid?: string;
  message?: string;
  error?: string;
}

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    // Check if Firebase Admin is already initialized
    if (getApps().length > 0) {
      return getApps()[0];
    }

    // Initialize with service account (you'll need to add your service account key)
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || 'tgfjf-5bbfe',
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
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://tgfjf-5bbfe-default-rtdb.firebaseio.com'
    });

    console.log('[TelegramAuth] Firebase Admin SDK initialized successfully');
    return app;

  } catch (error) {
    console.error('[TelegramAuth] Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin SDK initialization failed');
  }
}

/**
 * Validates Telegram ID and converts to safe UID
 */
function validateAndSanitizeTelegramId(telegramId: string | number): string {
  if (!telegramId) {
    throw new Error('Telegram ID is required');
  }

  const idStr = String(telegramId).trim();
  
  if (!idStr || idStr === 'undefined' || idStr === 'null') {
    throw new Error('Invalid Telegram ID format');
  }

  // Validate that it's a valid number
  const idNum = parseInt(idStr, 10);
  if (isNaN(idNum) || idNum <= 0) {
    throw new Error('Telegram ID must be a positive number');
  }

  return `tg_${idStr}`;
}

/**
 * Creates or updates user record in Firebase Auth
 */
async function ensureUserExists(uid: string, userData?: any): Promise<void> {
  try {
    const auth = getAuth();
    
    // Try to get existing user
    try {
      await auth.getUser(uid);
      console.log(`[TelegramAuth] User ${uid} already exists in Firebase Auth`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        const userRecord = await auth.createUser({
          uid,
          displayName: userData?.first_name ? 
            `${userData.first_name} ${userData.last_name || ''}`.trim() : 
            undefined,
          photoURL: userData?.photo_url,
          disabled: false,
          customClaims: {
            provider: 'telegram',
            telegramId: uid.replace('tg_', ''),
            isPremium: userData?.is_premium || false,
            createdAt: Date.now()
          }
        });
        
        console.log(`[TelegramAuth] Created new user in Firebase Auth: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`[TelegramAuth] Error ensuring user exists:`, error);
    throw error;
  }
}

/**
 * POST /api/auth/telegram
 * 
 * Creates a Firebase custom token for Telegram authentication
 */
export async function POST(request: NextRequest): Promise<NextResponse<TelegramAuthResponse>> {
  try {
    console.log('[TelegramAuth] Processing Telegram authentication request');

    // Parse request body
    const body: TelegramAuthRequest = await request.json();
    const { telegramId, userData } = body;

    if (!telegramId) {
      return NextResponse.json({
        success: false,
        error: 'Telegram ID is required'
      }, { status: 400 });
    }

    // Initialize Firebase Admin SDK
    initializeFirebaseAdmin();

    // Validate and sanitize Telegram ID
    const uid = validateAndSanitizeTelegramId(telegramId);
    console.log(`[TelegramAuth] Processing auth for UID: ${uid}`);

    // Ensure user exists in Firebase Auth
    await ensureUserExists(uid, userData);

    // Create custom token
    const auth = getAuth();
    const customToken = await auth.createCustomToken(uid, {
      provider: 'telegram',
      telegramId: String(telegramId),
      authTime: Date.now(),
      userData: userData || {}
    });

    console.log(`[TelegramAuth] Custom token created successfully for ${uid}`);

    return NextResponse.json({
      success: true,
      token: customToken,
      uid,
      message: 'Authentication successful'
    });

  } catch (error: any) {
    console.error('[TelegramAuth] Authentication failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Authentication failed',
      message: 'Failed to authenticate Telegram user'
    }, { status: 500 });
  }
}

/**
 * GET /api/auth/telegram?telegramId=123456789
 * 
 * Alternative endpoint for GET requests (useful for testing)
 */
export async function GET(request: NextRequest): Promise<NextResponse<TelegramAuthResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({
        success: false,
        error: 'telegramId parameter is required'
      }, { status: 400 });
    }

    // Reuse POST logic
    const mockRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId })
    });

    return POST(mockRequest as NextRequest);

  } catch (error: any) {
    console.error('[TelegramAuth] GET request failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Authentication failed'
    }, { status: 500 });
  }
}

/**
 * Utility function for client-side usage
 * 
 * Usage in client code:
 * ```typescript
 * const response = await fetch('/api/auth/telegram', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     telegramId: telegramUser.id,
 *     userData: telegramUser
 *   })
 * });
 * 
 * const { success, token, uid } = await response.json();
 * 
 * if (success && token) {
 *   // Use token with Firebase Auth
 *   import { signInWithCustomToken } from 'firebase/auth';
 *   await signInWithCustomToken(auth, token);
 * }
 * ```
 */