import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, update, get } from 'firebase/database';

// Firebase configuration for server-side operations
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for server-side operations
function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log('[Confirm Referral] Using existing Firebase app');
      return existingApps[0];
    }

    // Validate required configuration
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
      throw new Error('Missing required Firebase configuration');
    }

    const app = initializeApp(firebaseConfig);
    console.log('[Confirm Referral] Firebase initialized successfully for server-side operations');
    return app;

  } catch (error) {
    console.error('[Confirm Referral] Failed to initialize Firebase:', error);
    throw error;
  }
}

// Utility functions
function sanitizeUserId(userId: any): string | null {
  if (!userId) return null;
  const str = String(userId).trim();
  if (!str || str === 'undefined' || str === 'null') return null;
  return str;
}

function buildUserPath(userId: string): string {
  return `telegram_users/${userId}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, referrerId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Missing userId' },
        { status: 400 }
      );
    }

    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId format' },
        { status: 400 }
      );
    }

    console.log('[Confirm Referral] 🔄 Processing app open for user:', sanitizedUserId);
    
    // Initialize Firebase
    const app = initializeFirebase();
    const db = getDatabase(app);
    
    const userPath = buildUserPath(sanitizedUserId);
    const userRef = ref(db, userPath);

    // Get current user data
    const snapshot = await get(userRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    
    // Prepare updates
    const updates = {
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // If user doesn't exist, initialize with default values
      ...(existingData.coins !== undefined ? {} : {
        coins: 0,
        referralCount: 0,
        referralEarnings: 0,
        xp: 0,
        level: 1,
        createdAt: new Date().toISOString()
      })
    };

    // If referrerId is provided, handle referral logic
    if (referrerId && referrerId !== sanitizedUserId) {
      const sanitizedReferrerId = sanitizeUserId(referrerId);
      if (sanitizedReferrerId) {
        const referrerPath = buildUserPath(sanitizedReferrerId);
        const referrerRef = ref(db, referrerPath);
        
        try {
          const referrerSnapshot = await get(referrerRef);
          const referrerData = referrerSnapshot.exists() ? referrerSnapshot.val() : {};
          const newReferralCount = (referrerData.referrals || 0) + 1;
          
          await update(referrerRef, { 
            referrals: newReferralCount,
            updatedAt: new Date().toISOString()
          });
          
          console.log(`[Confirm Referral] ✅ Updated referrer ${sanitizedReferrerId} referral count to ${newReferralCount}`);
        } catch (referrerError) {
          console.error(`[Confirm Referral] ⚠️ Failed to update referrer ${sanitizedReferrerId}:`, referrerError);
          // Don't fail the entire request if referrer update fails
        }
      }
    }

    console.log('[Confirm Referral] 🔄 Updating user data:', updates);
    
    // Update user data
    await update(userRef, updates);
    
    console.log(`[Confirm Referral] ✅ Successfully confirmed app open for user ${sanitizedUserId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Referral confirmed successfully',
      userId: sanitizedUserId
    });

  } catch (error) {
    console.error('[Confirm Referral] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}