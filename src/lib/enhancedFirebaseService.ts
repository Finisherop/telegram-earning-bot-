import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
  remove,
  serverTimestamp as realtimeServerTimestamp,
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { 
  User, 
  Task, 
  UserTask, 
  WithdrawalRequest, 
  AdminSettings, 
  DailyStats,
  PaymentData,
  ConversionData,
  BotMessage
} from '@/types';
import { VIP_TIERS, DEFAULT_SETTINGS } from './constants';
import { logFirebaseError } from './errorHandler';

// Enhanced error handling and logging
class FirebaseServiceError extends Error {
  constructor(message: string, public code?: string, public originalError?: any) {
    super(message);
    this.name = 'FirebaseServiceError';
  }
}

const logError = (operation: string, error: any, context?: any) => {
  console.error(`[Firebase Service] ${operation} failed:`, {
    error: error.message || error,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // Log to global error handler
  logFirebaseError(error, operation, { context });
};

const logSuccess = (operation: string, context?: any) => {
  console.log(`[Firebase Service] ${operation} successful:`, {
    context,
    timestamp: new Date().toISOString(),
  });
};

// Firebase connection check with enhanced validation
const checkFirebaseConnection = (): boolean => {
  if (!realtimeDb) {
    console.warn('[Firebase Service] Services not properly initialized. Some features may not work.');
    return false;
  }
  return true;
};

// Real-time listeners management
const listeners = new Map<string, () => void>();

// Enhanced user subscription with payment and conversion data
export const subscribeToUserWithExtendedData = (
  userId: string, 
  callback: (data: {
    user: User | null;
    payments: PaymentData[];
    conversions: ConversionData[];
    messages: BotMessage[];
  }) => void
): (() => void) => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot subscribe to user: Firebase not initialized');
    callback({ user: null, payments: [], conversions: [], messages: [] });
    return () => {};
  }
  
  const userRef = ref(realtimeDb, `users/${userId}`);
  const paymentsRef = ref(realtimeDb, `payments/${userId}`);
  const conversionsRef = ref(realtimeDb, `conversions/${userId}`);
  const messagesRef = ref(realtimeDb, `messages/${userId}`);
  
  let userData: User | null = null;
  let paymentsData: PaymentData[] = [];
  let conversionsData: ConversionData[] = [];
  let messagesData: BotMessage[] = [];
  
  const updateCallback = () => {
    callback({
      user: userData,
      payments: paymentsData,
      conversions: conversionsData,
      messages: messagesData,
    });
  };
  
  // User data listener
  const userUnsubscribe = onValue(userRef, (snapshot) => {
    try {
      if (snapshot.exists()) {
        const data = snapshot.val();
        userData = {
          ...data,
          id: userId,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          lastClaimDate: data.lastClaimDate ? new Date(data.lastClaimDate) : undefined,
          farmingStartTime: data.farmingStartTime ? new Date(data.farmingStartTime) : undefined,
          farmingEndTime: data.farmingEndTime ? new Date(data.farmingEndTime) : undefined,
          vipEndTime: data.vipEndTime ? new Date(data.vipEndTime) : undefined,
        };
        logSuccess('User data updated', { userId });
      } else {
        userData = null;
      }
      updateCallback();
    } catch (error) {
      logError('User data subscription', error, { userId });
      userData = null;
      updateCallback();
    }
  }, (error) => {
    logError('User subscription', error, { userId });
    userData = null;
    updateCallback();
  });
  
  // Payments listener
  const paymentsUnsubscribe = onValue(paymentsRef, (snapshot) => {
    try {
      paymentsData = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((paymentId) => {
          const payment = data[paymentId];
          paymentsData.push({
            ...payment,
            id: paymentId,
            createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
            completedAt: payment.completedAt ? new Date(payment.completedAt) : undefined,
          });
        });
        paymentsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      updateCallback();
    } catch (error) {
      logError('Payments subscription', error, { userId });
      paymentsData = [];
      updateCallback();
    }
  });
  
  // Conversions listener
  const conversionsUnsubscribe = onValue(conversionsRef, (snapshot) => {
    try {
      conversionsData = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((conversionId) => {
          const conversion = data[conversionId];
          conversionsData.push({
            ...conversion,
            id: conversionId,
            createdAt: conversion.createdAt ? new Date(conversion.createdAt) : new Date(),
          });
        });
        conversionsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      updateCallback();
    } catch (error) {
      logError('Conversions subscription', error, { userId });
      conversionsData = [];
      updateCallback();
    }
  });
  
  // Messages listener
  const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
    try {
      messagesData = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((messageId) => {
          const message = data[messageId];
          messagesData.push({
            ...message,
            id: messageId,
            createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          });
        });
        messagesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      updateCallback();
    } catch (error) {
      logError('Messages subscription', error, { userId });
      messagesData = [];
      updateCallback();
    }
  });
  
  const listenerId = `user_extended_${userId}`;
  listeners.set(listenerId, () => {
    off(userRef, 'value', userUnsubscribe);
    off(paymentsRef, 'value', paymentsUnsubscribe);
    off(conversionsRef, 'value', conversionsUnsubscribe);
    off(messagesRef, 'value', messagesUnsubscribe);
  });
  
  return () => {
    off(userRef, 'value', userUnsubscribe);
    off(paymentsRef, 'value', paymentsUnsubscribe);
    off(conversionsRef, 'value', conversionsUnsubscribe);
    off(messagesRef, 'value', messagesUnsubscribe);
    listeners.delete(listenerId);
  };
};

// Enhanced user operations with atomic updates and race condition prevention
export const safeUpdateUserWithRetry = async (
  userId: string, 
  updateData: Partial<User>,
  maxRetries: number = 3
): Promise<User> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new FirebaseServiceError('Firebase not initialized');
  }
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userRef = ref(realtimeDb, `users/${userId}`);
      
      // Get current user data with retry logic
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) {
        // Create new user with default data
        const defaultData: User = {
          id: userId,
          telegramId: userId,
          username: undefined,
          firstName: 'User',
          lastName: '',
          profilePic: undefined,
          coins: 0,
          xp: 0,
          level: 1,
          vipTier: 'free',
          farmingMultiplier: VIP_TIERS.free.farmingMultiplier,
          referralMultiplier: VIP_TIERS.free.referralMultiplier,
          adsLimitPerDay: VIP_TIERS.free.adsLimitPerDay,
          withdrawalLimit: VIP_TIERS.free.withdrawalLimit,
          minWithdrawal: VIP_TIERS.free.minWithdrawal,
          referralCount: 0,
          referralEarnings: 0,
          dailyStreak: 0,
          farmingStartTime: undefined,
          farmingEndTime: undefined,
          lastClaimDate: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...updateData
        };
        
        await set(userRef, {
          ...defaultData,
          createdAt: defaultData.createdAt.toISOString(),
          updatedAt: defaultData.updatedAt.toISOString(),
          lastClaimDate: defaultData.lastClaimDate?.toISOString(),
          farmingStartTime: defaultData.farmingStartTime?.toISOString(),
          farmingEndTime: defaultData.farmingEndTime?.toISOString(),
          vipEndTime: defaultData.vipEndTime?.toISOString(),
        });
        
        logSuccess('User created', { userId, attempt });
        return defaultData;
      } else {
        // Update existing user atomically
        const currentData = userSnapshot.val();
        const updates: any = {
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        
        // Convert dates to ISO strings
        if (updates.lastClaimDate) updates.lastClaimDate = updates.lastClaimDate.toISOString();
        if (updates.farmingStartTime) updates.farmingStartTime = updates.farmingStartTime.toISOString();
        if (updates.farmingEndTime) updates.farmingEndTime = updates.farmingEndTime.toISOString();
        if (updates.vipEndTime) updates.vipEndTime = updates.vipEndTime.toISOString();
        
        await update(userRef, updates);
        
        // Get updated data to return
        const updatedSnapshot = await get(userRef);
        const userData = updatedSnapshot.val();
        
        const result: User = {
          ...userData,
          id: userId,
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
          updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
          lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
          farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
          farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
          vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
        };
        
        logSuccess('User updated', { userId, attempt, updates: Object.keys(updates) });
        return result;
      }
    } catch (error) {
      lastError = error;
      logError(`User update attempt ${attempt}`, error, { userId, updateData });
      
      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw new FirebaseServiceError(`Failed to update user after ${maxRetries} attempts`, 'MAX_RETRIES_EXCEEDED', lastError);
};

// Enhanced farming operations with proper state management
export const startFarmingWithValidation = async (userId: string): Promise<{ success: boolean; message: string }> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new FirebaseServiceError('Firebase not initialized');
  }
  
  try {
    const userRef = ref(realtimeDb, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      throw new FirebaseServiceError('User not found');
    }
    
    const userData = userSnapshot.val();
    const now = new Date();
    
    // Check if farming is already active
    if (userData.farmingStartTime && userData.farmingEndTime) {
      const endTime = new Date(userData.farmingEndTime);
      if (now < endTime) {
        return { success: false, message: 'Farming is already in progress!' };
      }
    }
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours
    
    await update(userRef, {
      farmingStartTime: startTime.toISOString(),
      farmingEndTime: endTime.toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Log conversion event
    await logConversionEvent(userId, 'farming_claim', {
      farmingDuration: 8 * 60 * 60 * 1000, // 8 hours in ms
    });
    
    logSuccess('Farming started', { userId, startTime, endTime });
    return { success: true, message: 'Farming started successfully!' };
    
  } catch (error) {
    logError('Start farming', error, { userId });
    throw new FirebaseServiceError('Failed to start farming', 'FARMING_START_ERROR', error);
  }
};

// Payment tracking functions
export const createPayment = async (
  userId: string,
  amount: number,
  tier: 'vip1' | 'vip2',
  metadata?: any
): Promise<string> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new FirebaseServiceError('Firebase not initialized');
  }
  
  try {
    const paymentsRef = ref(realtimeDb, `payments/${userId}`);
    const newPaymentRef = push(paymentsRef);
    
    const paymentData: Omit<PaymentData, 'id'> = {
      userId,
      amount,
      tier,
      status: 'pending',
      createdAt: new Date(),
      metadata,
    };
    
    await set(newPaymentRef, {
      ...paymentData,
      createdAt: paymentData.createdAt.toISOString(),
    });
    
    logSuccess('Payment created', { userId, amount, tier, paymentId: newPaymentRef.key });
    return newPaymentRef.key!;
  } catch (error) {
    logError('Create payment', error, { userId, amount, tier });
    throw new FirebaseServiceError('Failed to create payment', 'PAYMENT_CREATE_ERROR', error);
  }
};

export const updatePaymentStatus = async (
  userId: string,
  paymentId: string,
  status: 'completed' | 'failed',
  telegramPaymentId?: string
): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new FirebaseServiceError('Firebase not initialized');
  }
  
  try {
    const paymentRef = ref(realtimeDb, `payments/${userId}/${paymentId}`);
    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
      if (telegramPaymentId) {
        updates.telegramPaymentId = telegramPaymentId;
      }
    }
    
    await update(paymentRef, updates);
    
    // If payment completed, upgrade user to VIP
    if (status === 'completed') {
      const paymentSnapshot = await get(paymentRef);
      if (paymentSnapshot.exists()) {
        const paymentData = paymentSnapshot.val();
        await upgradeUserToVIP(userId, paymentData.tier, paymentData.amount);
      }
    }
    
    logSuccess('Payment status updated', { userId, paymentId, status });
  } catch (error) {
    logError('Update payment status', error, { userId, paymentId, status });
    throw new FirebaseServiceError('Failed to update payment status', 'PAYMENT_UPDATE_ERROR', error);
  }
};

// VIP upgrade with real-time sync
export const upgradeUserToVIP = async (
  userId: string,
  tier: 'vip1' | 'vip2',
  paymentAmount?: number
): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new FirebaseServiceError('Firebase not initialized');
  }
  
  try {
    const vipTier = VIP_TIERS[tier];
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + vipTier.duration);
    
    await safeUpdateUserWithRetry(userId, {
      vipTier: tier,
      vipEndTime: endTime,
      farmingMultiplier: vipTier.farmingMultiplier,
      referralMultiplier: vipTier.referralMultiplier,
      adsLimitPerDay: vipTier.adsLimitPerDay,
      withdrawalLimit: vipTier.withdrawalLimit,
      minWithdrawal: vipTier.minWithdrawal,
    });
    
    // Log conversion event
    await logConversionEvent(userId, 'vip_upgrade', {
      toTier: tier,
      paymentAmount,
    });
    
    // Send bot message
    await sendBotMessage(userId, {
      type: 'vip_upgrade',
      title: `🎉 VIP ${tier?.toUpperCase() || ''} Activated!`,
      message: `Congratulations! Your VIP ${tier?.toUpperCase() || ''} subscription is now active. Enjoy ${vipTier.farmingMultiplier}x farming speed and other premium benefits!`,
      metadata: { tier, amount: paymentAmount },
    });
    
    logSuccess('User upgraded to VIP', { userId, tier, endTime });
  } catch (error) {
    logError('VIP upgrade', error, { userId, tier });
    throw new FirebaseServiceError('Failed to upgrade user to VIP', 'VIP_UPGRADE_ERROR', error);
  }
};

// Conversion tracking
export const logConversionEvent = async (
  userId: string,
  type: ConversionData['type'],
  metadata?: any
): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    return; // Don't throw error for analytics, just skip
  }
  
  try {
    const conversionsRef = ref(realtimeDb, `conversions/${userId}`);
    const newConversionRef = push(conversionsRef);
    
    const conversionData: Omit<ConversionData, 'id'> = {
      userId,
      type,
      createdAt: new Date(),
      ...metadata,
    };
    
    await set(newConversionRef, {
      ...conversionData,
      createdAt: conversionData.createdAt.toISOString(),
    });
    
    logSuccess('Conversion logged', { userId, type, metadata });
  } catch (error) {
    logError('Log conversion', error, { userId, type, metadata });
    // Don't throw error for analytics
  }
};

// Bot message system
export const sendBotMessage = async (
  userId: string,
  messageData: Omit<BotMessage, 'id' | 'userId' | 'isRead' | 'createdAt'>
): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    return; // Don't throw error for messages, just skip
  }
  
  try {
    const messagesRef = ref(realtimeDb, `messages/${userId}`);
    const newMessageRef = push(messagesRef);
    
    const message: Omit<BotMessage, 'id'> = {
      userId,
      isRead: false,
      createdAt: new Date(),
      ...messageData,
    };
    
    await set(newMessageRef, {
      ...message,
      createdAt: message.createdAt.toISOString(),
    });
    
    logSuccess('Bot message sent', { userId, type: messageData.type });
  } catch (error) {
    logError('Send bot message', error, { userId, messageData });
    // Don't throw error for messages
  }
};

export const markMessageAsRead = async (userId: string, messageId: string): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    return;
  }
  
  try {
    const messageRef = ref(realtimeDb, `messages/${userId}/${messageId}`);
    await update(messageRef, {
      isRead: true,
      readAt: new Date().toISOString(),
    });
  } catch (error) {
    logError('Mark message as read', error, { userId, messageId });
  }
};

// Enhanced stats with payment and conversion data
export const getEnhancedDailyStats = async (): Promise<DailyStats> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot get daily stats: Firebase not initialized');
    return {
      totalUsers: 0,
      activeVipUsers: 0,
      totalCoinsDistributed: 0,
      totalInrGenerated: 0,
      pendingWithdrawals: 0,
      totalPayments: 0,
      totalConversions: 0,
    };
  }
  
  try {
    // Get users data
    const usersRef = ref(realtimeDb, 'users');
    const usersSnapshot = await get(usersRef);
    
    let totalUsers = 0;
    let activeVipUsers = 0;
    let totalCoinsDistributed = 0;
    
    if (usersSnapshot.exists()) {
      const usersData = usersSnapshot.val();
      Object.keys(usersData).forEach((userId) => {
        const user = usersData[userId];
        totalUsers++;
        if (user.vipTier && user.vipTier !== 'free') {
          activeVipUsers++;
        }
        totalCoinsDistributed += user.coins || 0;
      });
    }
    
    // Get payments data
    const paymentsRef = ref(realtimeDb, 'payments');
    const paymentsSnapshot = await get(paymentsRef);
    let totalPayments = 0;
    let totalInrGenerated = 0;
    
    if (paymentsSnapshot.exists()) {
      const paymentsData = paymentsSnapshot.val();
      Object.keys(paymentsData).forEach((userId) => {
        const userPayments = paymentsData[userId];
        Object.keys(userPayments).forEach((paymentId) => {
          const payment = userPayments[paymentId];
          if (payment.status === 'completed') {
            totalPayments++;
            totalInrGenerated += payment.amount * 0.75; // Approximate Stars to INR conversion
          }
        });
      });
    }
    
    // Get conversions data
    const conversionsRef = ref(realtimeDb, 'conversions');
    const conversionsSnapshot = await get(conversionsRef);
    let totalConversions = 0;
    
    if (conversionsSnapshot.exists()) {
      const conversionsData = conversionsSnapshot.val();
      Object.keys(conversionsData).forEach((userId) => {
        const userConversions = conversionsData[userId];
        totalConversions += Object.keys(userConversions).length;
      });
    }
    
    // Get pending withdrawals from Realtime Database
    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    const withdrawalsSnapshot = await get(withdrawalsRef);
    
    let pendingWithdrawals = 0;
    if (withdrawalsSnapshot.exists()) {
      const withdrawalsData = withdrawalsSnapshot.val();
      Object.values(withdrawalsData).forEach((withdrawal: any) => {
        if (withdrawal && withdrawal.status === 'pending') {
          pendingWithdrawals++;
        }
      });
    }
    
    return {
      totalUsers,
      activeVipUsers,
      totalCoinsDistributed,
      totalInrGenerated,
      pendingWithdrawals,
      totalPayments,
      totalConversions,
    };
  } catch (error) {
    logError('Get enhanced daily stats', error);
    return {
      totalUsers: 0,
      activeVipUsers: 0,
      totalCoinsDistributed: 0,
      totalInrGenerated: 0,
      pendingWithdrawals: 0,
      totalPayments: 0,
      totalConversions: 0,
    };
  }
};

// Cleanup function
export const cleanupAllListeners = () => {
  listeners.forEach((cleanup) => {
    cleanup();
  });
  listeners.clear();
  logSuccess('All listeners cleaned up');
};

// Re-export existing functions for backward compatibility
export {
  subscribeToUser,
  subscribeToTasks,
  subscribeToAdminSettings,
  subscribeToUserTasks,
  initializeUser,
  safeUpdateUser,
  createUser,
  getUser,
  updateUser,
  activateSubscription,
  getTasks,
  createTask,
  getUserTasks,
  completeTask,
  claimTask,
  createWithdrawalRequest,
  getWithdrawalRequests,
  updateWithdrawalStatus,
  getAdminSettings,
  updateAdminSettings,
  getDailyStats,
  cleanupListeners,
} from './firebaseService';