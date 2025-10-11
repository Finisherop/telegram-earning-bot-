import { NextRequest, NextResponse } from 'next/server';
import { 
  ref,
  get,
  set,
  update,
  push
} from 'firebase/database';
import { getFirebaseServices } from '@/lib/firebaseSingleton';
import { User } from '@/types';

export interface CreateWithdrawalRequest {
  userId: string;
  amount: number;
  upiId: string;
}

interface WithdrawalResponse {
  success: boolean;
  withdrawalId?: string;
  message?: string;
  error?: string;
}

/**
 * Validates withdrawal request data
 */
function validateWithdrawalData(data: any): CreateWithdrawalRequest {
  const { userId, amount, upiId } = data;

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Valid amount greater than 0 is required');
  }

  if (!upiId || typeof upiId !== 'string') {
    throw new Error('Valid UPI ID is required');
  }

  // Basic UPI ID validation
  const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  if (!upiRegex.test(upiId)) {
    throw new Error('Invalid UPI ID format');
  }

  return {
    userId: userId.toString().trim(),
    amount: Math.floor(amount), // Ensure whole numbers
    upiId: upiId.trim()
  };
}

/**
 * Creates a withdrawal request
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[WithdrawalAPI] Processing withdrawal request creation');

    const body = await request.json();
    const { userId, amount, upiId } = validateWithdrawalData(body);

    console.log(`[WithdrawalAPI] Creating withdrawal for user ${userId}: ${amount} coins to ${upiId}`);

    const sanitizedUserId = userId.toString().trim();
    
    const { realtimeDb } = await getFirebaseServices();

    // Get current user data
    const userRef = ref(realtimeDb, `telegram_users/${sanitizedUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnapshot.val() as User;
    const currentBalance = userData.coins || 0;
    
    // Check minimum withdrawal amount
    const minWithdrawal = userData.minWithdrawal || 100;
    if (amount < minWithdrawal) {
      throw new Error(`Minimum withdrawal amount is ${minWithdrawal} coins`);
    }
    
    // Check withdrawal limit
    const withdrawalLimit = userData.withdrawalLimit || 1000;
    if (amount > withdrawalLimit) {
      throw new Error(`Maximum withdrawal amount is ${withdrawalLimit} coins`);
    }
    
    // Check if user has sufficient balance
    if (currentBalance < amount) {
      throw new Error(`Insufficient balance. Current balance: ${currentBalance} coins`);
    }

    // Check daily withdrawal limit (basic implementation)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const userWithdrawalsRef = ref(realtimeDb, `userWithdrawals/${sanitizedUserId}/${today}`);
    const todayWithdrawalsSnapshot = await get(userWithdrawalsRef);
    
    let todayTotal = 0;
    if (todayWithdrawalsSnapshot.exists()) {
      const todayWithdrawals = todayWithdrawalsSnapshot.val();
      todayTotal = Object.values(todayWithdrawals as Record<string, any>)
        .reduce((sum: number, withdrawal: any) => sum + (withdrawal.amount || 0), 0);
    }
    
    const dailyLimit = userData.withdrawalLimit || 1000;
    if (todayTotal + amount > dailyLimit) {
      throw new Error(`Daily withdrawal limit exceeded. Today's total: ${todayTotal}, Daily limit: ${dailyLimit}`);
    }

    // Create withdrawal request
    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    const newWithdrawalRef = push(withdrawalsRef);
    const withdrawalId = newWithdrawalRef.key!;

    const withdrawalData = {
      id: withdrawalId,
      userId: sanitizedUserId,
      amount,
      upiId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      processedAt: null,
      adminNotes: null
    };

    // Save withdrawal request
    await set(newWithdrawalRef, withdrawalData);

    // Update user's balance (deduct the amount)
    await update(userRef, {
      coins: currentBalance - amount,
      updatedAt: new Date().toISOString()
    });

    // Add to user's withdrawal history
    const userWithdrawalRef = ref(realtimeDb, `userWithdrawals/${sanitizedUserId}/${today}/${withdrawalId}`);
    await set(userWithdrawalRef, {
      withdrawalId,
      amount,
      timestamp: new Date().toISOString()
    });

    console.log(`[WithdrawalAPI] Withdrawal request created successfully: ${withdrawalId}`);

    return NextResponse.json<WithdrawalResponse>({
      success: true,
      withdrawalId,
      message: `Withdrawal request created successfully for ${amount} coins`
    });

  } catch (error) {
    console.error('[WithdrawalAPI] Withdrawal request creation failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json<WithdrawalResponse>(
      {
        success: false,
        error: errorMessage
      },
      { status: 400 }
    );
  }
}

/**
 * Gets withdrawal requests for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`[WithdrawalAPI] Getting withdrawal requests for user ${userId}`);

    const sanitizedUserId = userId.toString().trim();
    const { realtimeDb } = await getFirebaseServices();
    
    // Get user data to verify user exists
    const userRef = ref(realtimeDb, `telegram_users/${sanitizedUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all withdrawals and filter by user
    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    const withdrawalsSnapshot = await get(withdrawalsRef);
    
    const userWithdrawals: any[] = [];
    
    if (withdrawalsSnapshot.exists()) {
      const allWithdrawals = withdrawalsSnapshot.val();
      Object.entries(allWithdrawals).forEach(([id, data]: [string, any]) => {
        if (data && data.userId === sanitizedUserId) {
          userWithdrawals.push({
            ...data,
            id,
            requestedAt: data.requestedAt ? new Date(data.requestedAt) : new Date(),
            processedAt: data.processedAt ? new Date(data.processedAt) : null
          });
        }
      });
    }

    // Sort by requested date (newest first)
    userWithdrawals.sort((a, b) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      withdrawals: userWithdrawals,
      count: userWithdrawals.length
    });

  } catch (error) {
    console.error('[WithdrawalAPI] Failed to get withdrawal requests:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get withdrawal requests'
      },
      { status: 500 }
    );
  }
}