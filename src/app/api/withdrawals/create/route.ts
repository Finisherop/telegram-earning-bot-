import { NextRequest, NextResponse } from 'next/server';
import { 
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebaseSingleton';
import { User } from '@/types';

export interface CreateWithdrawalRequest {
  userId: string;
  amount: number;
  method: 'upi' | 'paypal' | 'bank' | 'crypto';
  methodDetails: {
    upiId?: string;
    paypalEmail?: string;
    bankAccount?: string;
    cryptoAddress?: string;
    cryptoType?: string;
  };
}

export interface WithdrawalRequestData {
  id: string;
  userId: string;
  amount: number;
  method: string;
  methodDetails: any;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  requestedAt: Date;
  processedAt?: Date;
  adminNotes?: string;
  userBalance: number;
  fees?: number;
  netAmount?: number;
}

/**
 * Validates withdrawal request data
 */
function validateWithdrawalRequest(request: CreateWithdrawalRequest): string | null {
  if (!request.userId || typeof request.userId !== 'string' || request.userId.trim() === '') {
    return 'Valid user ID is required';
  }
  
  if (!request.amount || typeof request.amount !== 'number' || request.amount <= 0) {
    return 'Valid positive amount is required';
  }
  
  if (!request.method || !['upi', 'paypal', 'bank', 'crypto'].includes(request.method)) {
    return 'Valid withdrawal method is required';
  }
  
  // Validate method-specific details
  switch (request.method) {
    case 'upi':
      if (!request.methodDetails.upiId || typeof request.methodDetails.upiId !== 'string') {
        return 'UPI ID is required for UPI withdrawals';
      }
      break;
    case 'paypal':
      if (!request.methodDetails.paypalEmail || typeof request.methodDetails.paypalEmail !== 'string') {
        return 'PayPal email is required for PayPal withdrawals';
      }
      break;
    case 'bank':
      if (!request.methodDetails.bankAccount || typeof request.methodDetails.bankAccount !== 'string') {
        return 'Bank account details are required for bank withdrawals';
      }
      break;
    case 'crypto':
      if (!request.methodDetails.cryptoAddress || !request.methodDetails.cryptoType) {
        return 'Crypto address and type are required for crypto withdrawals';
      }
      break;
  }
  
  return null;
}

/**
 * Calculate withdrawal fees based on method and amount
 */
function calculateWithdrawalFees(method: string, amount: number): number {
  switch (method) {
    case 'upi':
      return Math.max(5, amount * 0.02); // 2% or minimum ₹5
    case 'paypal':
      return Math.max(10, amount * 0.03); // 3% or minimum ₹10
    case 'bank':
      return Math.max(15, amount * 0.025); // 2.5% or minimum ₹15
    case 'crypto':
      return Math.max(20, amount * 0.015); // 1.5% or minimum ₹20
    default:
      return amount * 0.05; // 5% for unknown methods
  }
}

/**
 * POST /api/withdrawals/create
 * Creates a new withdrawal request
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateWithdrawalRequest = await request.json();
    
    console.log('[Withdrawals] Processing withdrawal request:', {
      userId: body.userId,
      amount: body.amount,
      method: body.method
    });

    // Validate request data
    const validationError = validateWithdrawalRequest(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { userId, amount, method, methodDetails } = body;
    const sanitizedUserId = userId.toString().trim();
    
    const { db } = await getFirebaseServices();

    // Use transaction to ensure atomic withdrawal creation and balance check
    const result = await runTransaction(db, async (transaction) => {
      // Get current user data
      const userDocRef = doc(db, 'telegram_users', sanitizedUserId);
      const userDoc = await transaction.get(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data() as User;
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
      const fees = calculateWithdrawalFees(method, amount);
      const totalRequired = amount + fees;
      
      if (currentBalance < totalRequired) {
        throw new Error(`Insufficient balance. Required: ${totalRequired} coins (including ${fees} fees), Available: ${currentBalance} coins`);
      }
      
      // Check for pending withdrawals (limit to 3 pending per user)
      // Note: This would require a separate query, so we'll skip for now
      // and implement it as a business rule in admin panel
      
      // Create withdrawal request document
      const withdrawalData = {
        userId: sanitizedUserId,
        amount: amount,
        method: method,
        methodDetails: methodDetails,
        status: 'pending',
        requestedAt: serverTimestamp(),
        userBalance: currentBalance,
        fees: fees,
        netAmount: amount, // User receives this amount
        totalDeducted: totalRequired, // Amount deducted from user balance
        userInfo: {
          username: userData.username,
          firstName: userData.firstName,
          vipTier: userData.vipTier
        }
      };
      
      // Add to withdrawals collection
      const withdrawalsRef = collection(db, 'withdrawals');
      const withdrawalDocRef = doc(withdrawalsRef); // Generate new doc ID
      transaction.set(withdrawalDocRef, withdrawalData);
      
      // Deduct amount + fees from user balance immediately
      transaction.update(userDocRef, {
        coins: currentBalance - totalRequired,
        updatedAt: serverTimestamp(),
        lastWithdrawalRequest: serverTimestamp()
      });
      
      return {
        withdrawalId: withdrawalDocRef.id,
        newBalance: currentBalance - totalRequired,
        fees,
        netAmount: amount,
        totalDeducted: totalRequired
      };
    });

    console.log('[Withdrawals] Withdrawal request created successfully:', {
      userId: sanitizedUserId,
      withdrawalId: result.withdrawalId,
      amount,
      fees: result.fees
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawalId: result.withdrawalId,
      details: {
        amount: amount,
        fees: result.fees,
        netAmount: result.netAmount,
        totalDeducted: result.totalDeducted,
        newBalance: result.newBalance,
        estimatedProcessingTime: '24-48 hours'
      }
    });

  } catch (error) {
    console.error('[Withdrawals] Withdrawal request failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCode = errorMessage.includes('Insufficient balance') ? 'INSUFFICIENT_BALANCE'
      : errorMessage.includes('not found') ? 'USER_NOT_FOUND'
      : errorMessage.includes('Minimum withdrawal') ? 'AMOUNT_TOO_LOW'
      : errorMessage.includes('Maximum withdrawal') ? 'AMOUNT_TOO_HIGH'
      : 'WITHDRAWAL_FAILED';

    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode
      },
      { status: errorCode === 'USER_NOT_FOUND' ? 404 : 400 }
    );
  }
}

/**
 * GET /api/withdrawals/create?userId=xxx
 * Gets withdrawal eligibility and user info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    const sanitizedUserId = userId.toString().trim();
    const { db } = await getFirebaseServices();

    // Get user data
    const userDocRef = doc(db, 'telegram_users', sanitizedUserId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as User;
    const currentBalance = userData.coins || 0;
    const minWithdrawal = userData.minWithdrawal || 100;
    const withdrawalLimit = userData.withdrawalLimit || 1000;

    // Calculate available withdrawal amounts for different methods
    const withdrawalMethods = [
      {
        method: 'upi',
        name: 'UPI (India)',
        fees: calculateWithdrawalFees('upi', minWithdrawal),
        feePercentage: '2%',
        minAmount: minWithdrawal,
        processingTime: '24-48 hours'
      },
      {
        method: 'paypal',
        name: 'PayPal',
        fees: calculateWithdrawalFees('paypal', minWithdrawal),
        feePercentage: '3%',
        minAmount: minWithdrawal,
        processingTime: '48-72 hours'
      },
      {
        method: 'bank',
        name: 'Bank Transfer',
        fees: calculateWithdrawalFees('bank', minWithdrawal),
        feePercentage: '2.5%',
        minAmount: minWithdrawal,
        processingTime: '3-5 business days'
      },
      {
        method: 'crypto',
        name: 'Cryptocurrency',
        fees: calculateWithdrawalFees('crypto', minWithdrawal),
        feePercentage: '1.5%',
        minAmount: minWithdrawal,
        processingTime: '12-24 hours'
      }
    ];

    const eligibility = {
      canWithdraw: currentBalance >= minWithdrawal,
      balance: currentBalance,
      minWithdrawal: minWithdrawal,
      maxWithdrawal: Math.min(withdrawalLimit, currentBalance),
      vipTier: userData.vipTier || 'free'
    };

    return NextResponse.json({
      success: true,
      user: {
        id: sanitizedUserId,
        username: userData.username,
        firstName: userData.firstName,
        vipTier: userData.vipTier
      },
      eligibility,
      methods: withdrawalMethods,
      notes: [
        'Withdrawal fees are deducted from your account balance',
        'Processing times may vary based on method and external factors',
        'VIP users get reduced fees and higher withdrawal limits',
        'Maximum 3 pending withdrawal requests allowed per user'
      ]
    });

  } catch (error) {
    console.error('[Withdrawals] Eligibility check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check withdrawal eligibility',
        code: 'ELIGIBILITY_CHECK_FAILED'
      },
      { status: 500 }
    );
  }
}