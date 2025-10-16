import { NextRequest, NextResponse } from 'next/server';
import { safeUpdate, safeGet, buildUserPath, sanitizeUserId } from '@/lib/firebaseUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      return NextResponse.json(
        { error: 'Invalid userId format' },
        { status: 400 }
      );
    }

    console.log('[Confirm Referral] 🔄 Processing app open for user:', sanitizedUserId);
    
    const userPath = buildUserPath(sanitizedUserId);
    if (!userPath) {
      return NextResponse.json(
        { error: 'Failed to build user path' },
        { status: 500 }
      );
    }

    // Get current user data
    const currentUser = await safeGet(userPath);
    
    // Update user's last seen timestamp and activity
    const updates = {
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // If user doesn't exist, initialize with default values
      ...(currentUser ? {} : {
        coins: 0,
        referralCount: 0,
        referralEarnings: 0,
        xp: 0,
        level: 1,
        createdAt: new Date().toISOString()
      })
    };

    console.log('[Confirm Referral] 🔄 Updating user data:', updates);
    
    const success = await safeUpdate(userPath, updates);
    
    if (success) {
      console.log(`[Confirm Referral] ✅ Successfully confirmed app open for user ${sanitizedUserId}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Referral confirmed and user data updated',
        userId: sanitizedUserId
      });
    } else {
      console.error(`[Confirm Referral] ❌ Failed to update user data for ${sanitizedUserId}`);
      return NextResponse.json(
        { error: 'Failed to update user data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Confirm Referral] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}