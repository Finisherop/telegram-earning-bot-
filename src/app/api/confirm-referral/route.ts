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
    const { userId } = body;

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

    console.log('[Confirm Referral] 🔄 Processing referral confirmation for user:', sanitizedUserId);
    
    // Initialize Firebase
    const app = initializeFirebase();
    const db = getDatabase(app);
    
    const userPath = buildUserPath(sanitizedUserId);
    const userRef = ref(db, userPath);

    // Get current user data to find who referred them
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userData = snapshot.val();
    const referrerId = userData.referredBy;

    if (!referrerId) {
      console.log(`[Confirm Referral] ⚠️ User ${sanitizedUserId} has no referrer`);
      return NextResponse.json({ 
        success: true, 
        message: 'No referrer to update',
        userId: sanitizedUserId
      });
    }

    const sanitizedReferrerId = sanitizeUserId(referrerId);
    if (!sanitizedReferrerId) {
      return NextResponse.json(
        { success: false, message: 'Invalid referrer ID format' },
        { status: 400 }
      );
    }

    console.log(`[Confirm Referral] 🔄 Found referrer ${sanitizedReferrerId} for user ${sanitizedUserId}`);

    // Update referrer's referral count
    const referrerPath = buildUserPath(sanitizedReferrerId);
    const referrerRef = ref(db, referrerPath);
    
    try {
      const referrerSnapshot = await get(referrerRef);
      const referrerData = referrerSnapshot.exists() ? referrerSnapshot.val() : {};
      
      // Increment referral count (use referralCount field to match frontend expectations)
      const currentReferralCount = referrerData.referralCount || 0;
      const newReferralCount = currentReferralCount + 1;
      
      // Also increment referrals field for backward compatibility
      const currentReferrals = referrerData.referrals || 0;
      const newReferrals = currentReferrals + 1;
      
      const referrerUpdates = {
        referralCount: newReferralCount,
        referrals: newReferrals,
        updatedAt: new Date().toISOString()
      };

      await update(referrerRef, referrerUpdates);
      
      console.log(`[Confirm Referral] ✅ Updated referrer ${sanitizedReferrerId}:`, {
        referralCount: newReferralCount,
        referrals: newReferrals
      });

      // Also update the confirmed user's last activity
      const userUpdates = {
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await update(userRef, userUpdates);
      
      console.log(`[Confirm Referral] ✅ Successfully processed referral confirmation for user ${sanitizedUserId}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Referral confirmed successfully',
        userId: sanitizedUserId,
        referrerId: sanitizedReferrerId,
        newReferralCount: newReferralCount
      });

    } catch (referrerError) {
      console.error(`[Confirm Referral] ❌ Failed to update referrer ${sanitizedReferrerId}:`, referrerError);
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to update referrer: ${referrerError instanceof Error ? referrerError.message : 'Unknown error'}` 
        },
        { status: 500 }
      );
    }

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