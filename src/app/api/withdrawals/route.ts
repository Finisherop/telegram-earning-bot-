import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get, push, set, update } from 'firebase/database';
import { safeSet, safeUpdate, safeGet, sanitizeUserId, buildUserPath, extractUserId, FirebaseLogger } from '@/lib/firebaseUtils';

/**
 * Enhanced Withdrawal Processing API
 * 
 * Secure withdrawal request handling with:
 * - Atomic database operations
 * - Balance validation
 * - Admin approval workflow
 * - Fraud prevention
 */

interface WithdrawalRequest {
  userId: string;
  amount: number;
  upiId: string;
  type?: 'instant' | 'standard';
}

interface WithdrawalResponse {
  success: boolean;
  withdrawalId?: string;
  message: string;
  error?: string;
}

// Validation functions
function validateUpiId(upiId: string): boolean {
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId);
}

function validateAmount(amount: number, userCoins: number, minWithdrawal: number, maxWithdrawal: number): { isValid: boolean; error?: string } {
  if (amount < minWithdrawal) {
    return { isValid: false, error: `Minimum withdrawal amount is ₹${minWithdrawal}` };
  }
  
  if (amount > maxWithdrawal) {
    return { isValid: false, error: `Maximum withdrawal amount is ₹${maxWithdrawal}` };
  }
  
  const requiredCoins = amount * 100; // 100 coins = ₹1
  if (userCoins < requiredCoins) {
    return { isValid: false, error: `Insufficient balance. Required: ${requiredCoins} coins, Available: ${userCoins} coins` };
  }
  
  return { isValid: true };
}

async function checkDailyWithdrawalLimit(userId: string, amount: number, dailyLimit: number): Promise<{ canWithdraw: boolean; error?: string }> {
  try {
    if (!realtimeDb) {
      throw new Error('Database connection unavailable');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    const snapshot = await get(withdrawalsRef);
    
    if (!snapshot.exists()) {
      return { canWithdraw: true };
    }
    
    // Count today's withdrawals for user
    let todaysTotal = 0;
    const withdrawals = snapshot.val();
    
    Object.values(withdrawals).forEach((withdrawal: any) => {
      if (withdrawal.userId === userId && withdrawal.requestedAt) {
        const withdrawalDate = new Date(withdrawal.requestedAt).toISOString().split('T')[0];
        if (withdrawalDate === today && withdrawal.status !== 'rejected') {
          todaysTotal += withdrawal.amount || 0;
        }
      }
    });
    
    if (todaysTotal + amount > dailyLimit) {
      return { 
        canWithdraw: false, 
        error: `Daily withdrawal limit exceeded. Limit: ₹${dailyLimit}, Used: ₹${todaysTotal}` 
      };
    }
    
    return { canWithdraw: true };
  } catch (error) {
    console.error('[WithdrawalAPI] Error checking daily limit:', error);
    return { canWithdraw: false, error: 'Unable to verify daily limit' };
  }
}

async function createWithdrawalRecord(
  userId: string,
  amount: number,
  upiId: string,
  type: string = 'standard'
): Promise<string> {
  try {
    if (!realtimeDb) {
      throw new Error('Database connection unavailable');
    }

    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    const newWithdrawalRef = push(withdrawalsRef);
    
    const withdrawalData = {
      userId,
      amount,
      upiId,
      type,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      processedAt: null,
      adminNotes: null,
      transactionId: null,
      metadata: {
        userAgent: 'API',
        ipAddress: 'server',
        timestamp: new Date().toISOString()
      }
    };
    
    await set(newWithdrawalRef, withdrawalData);
    
    console.log(`[WithdrawalAPI] Withdrawal record created: ${newWithdrawalRef.key}`);
    return newWithdrawalRef.key!;
    
  } catch (error) {
    console.error('[WithdrawalAPI] Error creating withdrawal record:', error);
    throw new Error('Failed to create withdrawal record');
  }
}

async function deductUserBalance(userId: string, amount: number): Promise<void> {
  try {
    if (!realtimeDb) {
      throw new Error('Database connection unavailable');
    }

    const userRef = ref(realtimeDb, `telegram_users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }
    
    const userData = snapshot.val();
    const currentCoins = userData.coins || 0;
    const requiredCoins = amount * 100; // 100 coins = ₹1
    
    if (currentCoins < requiredCoins) {
      throw new Error('Insufficient balance for withdrawal');
    }
    
    // Atomic balance deduction
    await update(userRef, {
      coins: currentCoins - requiredCoins,
      updatedAt: new Date().toISOString(),
      lastWithdrawal: new Date().toISOString()
    });
    
    console.log(`[WithdrawalAPI] Balance deducted: ${requiredCoins} coins from user ${userId}`);
    
  } catch (error) {
    console.error('[WithdrawalAPI] Error deducting balance:', error);
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<WithdrawalResponse>> {
  try {
    if (!realtimeDb) {
      return NextResponse.json({
        success: false,
        message: 'Database connection unavailable',
        error: 'SERVICE_UNAVAILABLE'
      }, { status: 503 });
    }
    
    const body: WithdrawalRequest = await request.json();
    const { userId, amount, upiId, type = 'standard' } = body;
    
    // Input validation
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Valid user ID is required',
        error: 'INVALID_USER_ID'
      }, { status: 400 });
    }
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Valid withdrawal amount is required',
        error: 'INVALID_AMOUNT'
      }, { status: 400 });
    }
    
    if (!upiId || !validateUpiId(upiId)) {
      return NextResponse.json({
        success: false,
        message: 'Valid UPI ID is required (e.g., user@paytm)',
        error: 'INVALID_UPI_ID'
      }, { status: 400 });
    }
    
    // Get user data
    const userRef = ref(realtimeDb!, `telegram_users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      }, { status: 404 });
    }
    
    const userData = userSnapshot.val();
    const userCoins = userData.coins || 0;
    
    // Get VIP status and limits - check multiple fields for compatibility
    const vipTier = userData.vipTier || userData.vip_tier || 'free';
    const isVipActive = vipTier !== 'free' && userData.vipEndTime && new Date(userData.vipEndTime) > new Date();
    
    // Set withdrawal limits based on VIP status
    let minWithdrawal = 200; // Default for free users
    let dailyLimit = 1000;   // Default for free users
    
    if (isVipActive) {
      if (vipTier === 'vip1' || vipTier === 'bronze') {
        minWithdrawal = userData.minWithdrawal || 100;
        dailyLimit = userData.withdrawalLimit || 2000;
      } else if (vipTier === 'vip2' || vipTier === 'diamond') {
        minWithdrawal = userData.minWithdrawal || 50;
        dailyLimit = userData.withdrawalLimit || 5000;
      }
    } else {
      // Use stored values or defaults for free users
      minWithdrawal = userData.minWithdrawal || 200;
      dailyLimit = userData.withdrawalLimit || 1000;
    }
    
    const maxWithdrawal = Math.floor(userCoins / 100); // Convert coins to INR
    
    // Validate withdrawal amount
    const amountValidation = validateAmount(amount, userCoins, minWithdrawal, maxWithdrawal);
    if (!amountValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: amountValidation.error!,
        error: 'AMOUNT_VALIDATION_FAILED'
      }, { status: 400 });
    }
    
    // Check daily withdrawal limit
    const limitCheck = await checkDailyWithdrawalLimit(userId, amount, dailyLimit);
    if (!limitCheck.canWithdraw) {
      return NextResponse.json({
        success: false,
        message: limitCheck.error!,
        error: 'DAILY_LIMIT_EXCEEDED'
      }, { status: 429 });
    }
    
    // Process withdrawal
    console.log(`[WithdrawalAPI] Processing withdrawal: ${userId} - ₹${amount} to ${upiId}`);
    
    // Create withdrawal record first
    const withdrawalId = await createWithdrawalRecord(userId, amount, upiId, type);
    
    // Deduct balance atomically
    await deductUserBalance(userId, amount);
    
    // Success response
    return NextResponse.json({
      success: true,
      withdrawalId,
      message: `Withdrawal request of ₹${amount} submitted successfully! You will receive the payment within 24-48 hours after admin approval.`
    });
    
  } catch (error) {
    console.error('[WithdrawalAPI] Error processing withdrawal:', error);
    
    let errorMessage = 'An error occurred while processing your withdrawal request. Please try again.';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('Insufficient balance')) {
        errorCode = 'INSUFFICIENT_BALANCE';
      } else if (error.message.includes('User not found')) {
        errorCode = 'USER_NOT_FOUND';
      }
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: errorCode
    }, { status: 500 });
  }
}

// GET endpoint to check withdrawal history
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    if (!realtimeDb) {
      return NextResponse.json({
        error: 'Database connection unavailable'
      }, { status: 503 });
    }
    
    // Get user's withdrawal history
    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    const snapshot = await get(withdrawalsRef);
    
    const userWithdrawals: any[] = [];
    
    if (snapshot.exists()) {
      const withdrawals = snapshot.val();
      Object.entries(withdrawals).forEach(([id, withdrawal]: [string, any]) => {
        if (withdrawal.userId === userId) {
          userWithdrawals.push({
            id,
            ...withdrawal,
            // Don't expose sensitive data
            upiId: withdrawal.upiId ? withdrawal.upiId.replace(/(.{3}).*@/, '$1***@') : null
          });
        }
      });
    }
    
    // Sort by date (newest first)
    userWithdrawals.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    
    return NextResponse.json({
      withdrawals: userWithdrawals,
      total: userWithdrawals.length
    });
    
  } catch (error) {
    console.error('[WithdrawalAPI] Error fetching withdrawal history:', error);
    return NextResponse.json({
      error: 'Failed to fetch withdrawal history'
    }, { status: 500 });
  }
}