import { NextRequest, NextResponse } from 'next/server';
import { 
  getUser, 
  startFarmingWithValidation,
  logConversionEvent 
} from '@/lib/enhancedFirebaseService';

interface StartFarmingRequest {
  userId: string;
}

interface FarmingStatus {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  progress?: number;
  canClaim?: boolean;
  timeRemaining?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: StartFarmingRequest = await request.json();
    const { userId } = body;

    console.log('[Start Farming] Processing farming start request:', { userId });

    // Validate input
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json(
        { error: 'Valid User ID is required' },
        { status: 400 }
      );
    }

    // Sanitize userId to ensure it's safe for Firebase operations
    const sanitizedUserId = userId.toString().trim();

    // Step 1: Get current user data and validate farming status
    const user = await getUser(sanitizedUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Step 2: Check current farming status to prevent multiple sessions
    const now = new Date();
    let currentFarmingStatus: FarmingStatus = {
      isActive: false,
    };

    if (user.farmingStartTime && user.farmingEndTime) {
      const startTime = new Date(user.farmingStartTime);
      const endTime = new Date(user.farmingEndTime);
      
      currentFarmingStatus = {
        isActive: now >= startTime && now < endTime,
        startTime,
        endTime,
        progress: Math.min(((now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())) * 100, 100),
        canClaim: now >= endTime,
        timeRemaining: Math.max(0, endTime.getTime() - now.getTime()),
      };
    }

    // Step 3: Validate farming eligibility
    if (currentFarmingStatus.isActive) {
      return NextResponse.json(
        { 
          error: 'Farming session already active',
          status: currentFarmingStatus,
          message: 'Please wait for current farming session to complete'
        },
        { status: 409 }
      );
    }

    if (currentFarmingStatus.canClaim) {
      return NextResponse.json(
        { 
          error: 'Farming rewards ready to claim',
          status: currentFarmingStatus,
          message: 'Please claim your current farming rewards before starting a new session'
        },
        { status: 409 }
      );
    }

    // Step 4: Get VIP multiplier and calculate farming parameters
    const vipMultiplier = user.vipTier !== 'free' ? user.farmingMultiplier || 1 : 1;
    const baseFarmingDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const farmingDuration = Math.floor(baseFarmingDuration / vipMultiplier); // VIP reduces time
    const baseReward = 120;
    const expectedReward = Math.floor(baseReward * vipMultiplier);

    console.log('[Start Farming] Farming parameters:', {
      userId: sanitizedUserId,
      vipTier: user.vipTier,
      vipMultiplier,
      farmingDuration: farmingDuration / (60 * 60 * 1000), // hours
      expectedReward,
    });

    // Step 5: Start farming with validation (atomic operation)
    try {
      const result = await startFarmingWithValidation(sanitizedUserId);
      
      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.message,
            code: 'FARMING_VALIDATION_FAILED'
          },
          { status: 400 }
        );
      }

      // Step 6: Get updated user data to confirm farming started
      const updatedUser = await getUser(sanitizedUserId);
      if (!updatedUser || !updatedUser.farmingStartTime || !updatedUser.farmingEndTime) {
        throw new Error('Farming start verification failed');
      }

      const farmingStartTime = new Date(updatedUser.farmingStartTime);
      const farmingEndTime = new Date(updatedUser.farmingEndTime);

      // Step 7: Log conversion event for analytics
      await logConversionEvent(sanitizedUserId, 'farming_claim', {
        farmingDuration,
        vipMultiplier,
        expectedReward,
        startTime: farmingStartTime.toISOString(),
        endTime: farmingEndTime.toISOString(),
      });

      console.log('[Start Farming] Farming started successfully:', {
        userId: sanitizedUserId,
        startTime: farmingStartTime,
        endTime: farmingEndTime,
        duration: farmingDuration / (60 * 60 * 1000), // hours
      });

      return NextResponse.json({
        success: true,
        message: `Farming started! ${vipMultiplier > 1 ? `VIP ${vipMultiplier}x speed active!` : 'Come back in 8 hours to claim your coins.'}`,
        farming: {
          startTime: farmingStartTime.toISOString(),
          endTime: farmingEndTime.toISOString(),
          duration: farmingDuration,
          expectedReward,
          vipMultiplier,
          vipActive: user.vipTier !== 'free',
        },
        user: {
          vipTier: updatedUser.vipTier,
          farmingMultiplier: updatedUser.farmingMultiplier,
        }
      });

    } catch (farmingError) {
      console.error('[Start Farming] Farming start failed:', farmingError);
      
      return NextResponse.json(
        { 
          error: 'Failed to start farming session',
          details: (farmingError as Error).message,
          code: 'FARMING_START_FAILED'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Start Farming] API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start farming. Please check your connection and try again.',
        code: 'API_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check farming status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    const now = new Date();
    let farmingStatus: FarmingStatus = {
      isActive: false,
    };

    if (user.farmingStartTime && user.farmingEndTime) {
      const startTime = new Date(user.farmingStartTime);
      const endTime = new Date(user.farmingEndTime);
      
      farmingStatus = {
        isActive: now >= startTime && now < endTime,
        startTime,
        endTime,
        progress: Math.min(((now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())) * 100, 100),
        canClaim: now >= endTime,
        timeRemaining: Math.max(0, endTime.getTime() - now.getTime()),
      };
    }

    const vipMultiplier = user.vipTier !== 'free' ? user.farmingMultiplier || 1 : 1;
    const baseReward = 120;
    const expectedReward = Math.floor(baseReward * vipMultiplier);

    return NextResponse.json({
      success: true,
      farming: farmingStatus,
      user: {
        id: userId,
        vipTier: user.vipTier,
        farmingMultiplier: vipMultiplier,
        coins: user.coins,
      },
      rewards: {
        baseReward,
        vipMultiplier,
        expectedReward,
      }
    });

  } catch (error) {
    console.error('[Start Farming] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check farming status' },
      { status: 500 }
    );
  }
}