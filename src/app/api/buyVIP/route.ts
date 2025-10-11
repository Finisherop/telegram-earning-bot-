import { NextRequest, NextResponse } from 'next/server';
import { 
  getUser, 
  safeUpdateUserWithRetry, 
  createPayment, 
  updatePaymentStatus, 
  upgradeUserToVIP,
  logConversionEvent 
} from '@/lib/enhancedFirebaseService';
import { VIP_TIERS } from '@/lib/constants';

interface BuyVIPRequest {
  userId: string;
  tier: 'vip1' | 'vip2';
  paymentMethod: 'stars' | 'telegram_payment';
  telegramPaymentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BuyVIPRequest = await request.json();
    const { userId, tier, paymentMethod, telegramPaymentId } = body;

    console.log('[Buy VIP] Processing VIP purchase:', { userId, tier, paymentMethod });

    // Validate input
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || !tier || !VIP_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid request parameters - userId and tier are required' },
        { status: 400 }
      );
    }

    // Sanitize userId to ensure it's safe for Firebase operations
    const sanitizedUserId = userId.toString().trim();
    
    const vipTierInfo = VIP_TIERS[tier];
    const requiredStars = vipTierInfo.price;

    // Start atomic transaction
    try {
      // Step 1: Get current user data with retry logic
      const user = await getUser(sanitizedUserId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Step 2: Check if user already has active VIP
      if (user.vipTier !== 'free' && user.vipEndTime) {
        const now = new Date();
        const vipEndTime = new Date(user.vipEndTime);
        
        if (now < vipEndTime) {
          return NextResponse.json(
            { 
              error: 'VIP subscription already active',
              vipEndTime: vipEndTime.toISOString(),
              currentTier: user.vipTier
            },
            { status: 409 }
          );
        }
      }

      // Step 3: Check Stars balance (if using Stars payment)
      if (paymentMethod === 'stars') {
        const userStars = user.coins || 0; // Assuming Stars are stored as coins
        
        if (userStars < requiredStars) {
          return NextResponse.json(
            { 
              error: 'Insufficient Stars balance',
              required: requiredStars,
              available: userStars,
              shortfall: requiredStars - userStars
            },
            { status: 402 }
          );
        }
      }

      // Step 4: Create payment record for tracking
      const paymentId = await createPayment(sanitizedUserId, requiredStars, tier, {
        paymentMethod,
        telegramPaymentId: telegramPaymentId || '',
        userBalanceBefore: user.coins || 0,
        timestamp: new Date().toISOString(),
      });

      // Step 5: Process payment based on method
      if (paymentMethod === 'stars') {
        // Atomic Stars deduction and VIP upgrade
        const newStarsBalance = (user.coins || 0) - requiredStars;
        
        // Update user with new balance and VIP status atomically
        await safeUpdateUserWithRetry(sanitizedUserId, {
          coins: newStarsBalance,
          vipTier: tier,
          vipEndTime: new Date(Date.now() + vipTierInfo.duration * 24 * 60 * 60 * 1000),
          farmingMultiplier: vipTierInfo.farmingMultiplier,
          referralMultiplier: vipTierInfo.referralMultiplier,
          adsLimitPerDay: vipTierInfo.adsLimitPerDay,
          withdrawalLimit: vipTierInfo.withdrawalLimit,
          minWithdrawal: vipTierInfo.minWithdrawal,
        });

        // Mark payment as completed
        await updatePaymentStatus(sanitizedUserId, paymentId, 'completed', telegramPaymentId || '');

      } else if (paymentMethod === 'telegram_payment') {
        // For Telegram payments, upgrade immediately (payment already processed)
        await upgradeUserToVIP(sanitizedUserId, tier, requiredStars);
        await updatePaymentStatus(sanitizedUserId, paymentId, 'completed', telegramPaymentId || '');
      }

      // Step 6: Log conversion event for analytics
      await logConversionEvent(sanitizedUserId, 'vip_upgrade', {
        fromTier: user.vipTier,
        toTier: tier,
        paymentAmount: requiredStars,
        paymentMethod,
        paymentId,
      });

      // Step 7: Get updated user data to return
      const updatedUser = await getUser(sanitizedUserId);

      console.log('[Buy VIP] VIP purchase completed successfully:', {
        userId: sanitizedUserId,
        tier,
        paymentId,
        newBalance: updatedUser?.coins,
        vipEndTime: updatedUser?.vipEndTime,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${tier?.toUpperCase() || ''}!`,
        paymentId,
        user: {
          vipTier: updatedUser?.vipTier,
          vipEndTime: updatedUser?.vipEndTime,
          coins: updatedUser?.coins,
          farmingMultiplier: updatedUser?.farmingMultiplier,
        },
        transaction: {
          amount: requiredStars,
          method: paymentMethod,
          timestamp: new Date().toISOString(),
        }
      });

    } catch (transactionError) {
      console.error('[Buy VIP] Transaction failed:', transactionError);
      
      return NextResponse.json(
        { 
          error: 'Transaction failed',
          details: (transactionError as Error).message,
          code: 'TRANSACTION_FAILED'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Buy VIP] API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment. Please try again.',
        code: 'API_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check VIP purchase eligibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tier = searchParams.get('tier') as 'vip1' | 'vip2';

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'Missing userId or tier parameter' },
        { status: 400 }
      );
    }

    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const vipTierInfo = VIP_TIERS[tier];
    const requiredStars = vipTierInfo.price;
    const userStars = user.coins || 0;

    // Check current VIP status
    let hasActiveVIP = false;
    let vipEndTime = null;
    
    if (user.vipTier !== 'free' && user.vipEndTime) {
      const now = new Date();
      const endTime = new Date(user.vipEndTime);
      hasActiveVIP = now < endTime;
      vipEndTime = endTime.toISOString();
    }

    return NextResponse.json({
      eligible: userStars >= requiredStars && !hasActiveVIP,
      user: {
        id: userId,
        currentTier: user.vipTier,
        stars: userStars,
        hasActiveVIP,
        vipEndTime,
      },
      tier: {
        name: tier,
        price: requiredStars,
        duration: vipTierInfo.duration,
        benefits: {
          farmingMultiplier: vipTierInfo.farmingMultiplier,
          referralMultiplier: vipTierInfo.referralMultiplier,
          withdrawalLimit: vipTierInfo.withdrawalLimit,
        }
      },
      canAfford: userStars >= requiredStars,
      shortfall: Math.max(0, requiredStars - userStars),
    });

  } catch (error) {
    console.error('[Buy VIP] Eligibility check error:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}