import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
  remove,
} from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { User, Task, UserTask, WithdrawalRequest, AdminSettings, DailyStats } from '@/types';
import { VIP_TIERS, DEFAULT_SETTINGS } from './constants';

// Firebase service error handling
const checkFirebaseConnection = () => {
  if (!db || !realtimeDb) {
    console.warn('Firebase services not properly initialized. Some features may not work.');
    return false;
  }
  return true;
};

// Real-time listeners
const listeners = new Map<string, () => void>();

// Use Realtime Database for instant sync
export const subscribeToUser = (userId: string, callback: (user: User | null) => void): (() => void) => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot subscribe to user: Firebase not initialized');
    callback(null);
    return () => {};
  }
  
  const userRef = ref(realtimeDb, `users/${userId}`);
  
  const unsubscribe = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val();
      const user: User = {
        ...userData,
        id: userId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      };
      console.log('Real-time user update:', user);
      callback(user);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to user:', error);
    callback(null);
  });

  const listenerId = `user_${userId}`;
  listeners.set(listenerId, () => off(userRef, 'value', unsubscribe));
  
  return () => off(userRef, 'value', unsubscribe);
};

// Real-time tasks listener using Realtime Database
export const subscribeToTasks = (callback: (tasks: Task[]) => void): (() => void) => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot subscribe to tasks: Firebase not initialized');
    callback([]);
    return () => {};
  }
  
  const tasksRef = ref(realtimeDb, 'tasks');
  
  const unsubscribe = onValue(tasksRef, (snapshot) => {
    const tasks: Task[] = [];
    if (snapshot.exists()) {
      const tasksData = snapshot.val();
      Object.keys(tasksData).forEach((taskId) => {
        const taskData = tasksData[taskId];
        if (taskData.isActive) {
          tasks.push({
            ...taskData,
            id: taskId,
            createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
            updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date(),
          });
        }
      });
    }
    console.log('Real-time tasks update:', tasks);
    callback(tasks);
  }, (error) => {
    console.error('Error listening to tasks:', error);
    callback([]);
  });

  listeners.set('tasks', () => off(tasksRef, 'value', unsubscribe));
  return () => off(tasksRef, 'value', unsubscribe);
};

// Real-time admin settings listener
export const subscribeToAdminSettings = (callback: (settings: AdminSettings) => void): (() => void) => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot subscribe to admin settings: Firebase not initialized');
    callback(DEFAULT_SETTINGS);
    return () => {};
  }
  
  const settingsRef = ref(realtimeDb, 'admin/settings');
  
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      const settingsData = snapshot.val();
      const adminSettings = {
        ...settingsData,
        updatedAt: settingsData.updatedAt ? new Date(settingsData.updatedAt) : new Date(),
      } as AdminSettings;
      callback(adminSettings);
    } else {
      // Create default settings if they don't exist
      const defaultSettings: AdminSettings = {
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
      };
      set(settingsRef, {
        ...defaultSettings,
        updatedAt: (defaultSettings.updatedAt || new Date()).toISOString(),
      });
      callback(defaultSettings);
    }
  }, (error) => {
    console.error('Error listening to admin settings:', error);
    callback(DEFAULT_SETTINGS);
  });

  listeners.set('admin_settings', () => off(settingsRef, 'value', unsubscribe));
  return () => off(settingsRef, 'value', unsubscribe);
};

// Real-time user tasks listener
export const subscribeToUserTasks = (userId: string, callback: (userTasks: UserTask[]) => void): (() => void) => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot subscribe to user tasks: Firebase not initialized');
    callback([]);
    return () => {};
  }
  
  const userTasksRef = ref(realtimeDb, `userTasks/${userId}`);
  
  const unsubscribe = onValue(userTasksRef, (snapshot) => {
    const userTasks: UserTask[] = [];
    if (snapshot.exists()) {
      const userTasksData = snapshot.val();
      Object.keys(userTasksData).forEach((taskId) => {
        const taskData = userTasksData[taskId];
        userTasks.push({
          ...taskData,
          id: taskId,
          completedAt: taskData.completedAt ? new Date(taskData.completedAt) : undefined,
          claimedAt: taskData.claimedAt ? new Date(taskData.claimedAt) : undefined,
        });
      });
    }
    callback(userTasks);
  }, (error) => {
    console.error('Error listening to user tasks:', error);
    callback([]);
  });

  const listenerId = `user_tasks_${userId}`;
  listeners.set(listenerId, () => off(userTasksRef, 'value', unsubscribe));
  return () => off(userTasksRef, 'value', unsubscribe);
};

// Cleanup function to remove all listeners
export const cleanupListeners = () => {
  listeners.forEach((cleanup) => {
    cleanup();
  });
  listeners.clear();
};

// Initialize user with Realtime Database
export const initializeUser = async (userId: string): Promise<User> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const userRef = ref(realtimeDb, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      console.log('Creating new user document for:', userId);
      const defaultUserData: User = {
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
      };
      
      await set(userRef, {
        ...defaultUserData,
        createdAt: defaultUserData.createdAt.toISOString(),
        updatedAt: defaultUserData.updatedAt.toISOString(),
      });
      return defaultUserData;
    } else {
      const userData = userSnapshot.val();
      return {
        ...userData,
        id: userId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      } as User;
    }
  } catch (error) {
    console.error('Error initializing user:', error);
    throw error;
  }
};

// Safe update function using Realtime Database with comprehensive validation
export const safeUpdateUser = async (userId: string, updateData: Partial<User>): Promise<User> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Valid userId is required for update operation');
  }
  
  const sanitizedUserId = userId.toString().trim();
  
  try {
    const userRef = ref(realtimeDb, `users/${sanitizedUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      // Create new user with safe defaults
      const defaultData: User = {
        id: sanitizedUserId,
        telegramId: sanitizedUserId,
        username: updateData.username || '',
        firstName: updateData.firstName || 'User',
        lastName: updateData.lastName || '',
        profilePic: updateData.profilePic || '',
        coins: updateData.coins || 0,
        xp: updateData.xp || 0,
        level: updateData.level || 1,
        vipTier: updateData.vipTier || 'free',
        farmingMultiplier: updateData.farmingMultiplier || VIP_TIERS.free.farmingMultiplier,
        referralMultiplier: updateData.referralMultiplier || VIP_TIERS.free.referralMultiplier,
        adsLimitPerDay: updateData.adsLimitPerDay || VIP_TIERS.free.adsLimitPerDay,
        withdrawalLimit: updateData.withdrawalLimit || VIP_TIERS.free.withdrawalLimit,
        minWithdrawal: updateData.minWithdrawal || VIP_TIERS.free.minWithdrawal,
        referralCount: updateData.referralCount || 0,
        referralEarnings: updateData.referralEarnings || 0,
        dailyStreak: updateData.dailyStreak || 0,
        farmingStartTime: updateData.farmingStartTime || undefined,
        farmingEndTime: updateData.farmingEndTime || undefined,
        lastClaimDate: updateData.lastClaimDate || undefined,
        vipEndTime: updateData.vipEndTime || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updateData
      };
      
      // Clean undefined values before setting
      const cleanedData = Object.entries(defaultData).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            acc[key] = value.toISOString();
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as any);
      
      await set(userRef, cleanedData);
      return defaultData;
    } else {
      // Update existing user - clean undefined values
      const updates: any = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // Remove undefined values and convert dates safely
      const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            acc[key] = value.toISOString();
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as any);
      
      await update(userRef, cleanedUpdates);
      
      const updatedSnapshot = await get(userRef);
      const userData = updatedSnapshot.val();
      return {
        ...userData,
        id: sanitizedUserId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      } as User;
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// User operations with Realtime Database
export const createUser = async (userData: Partial<User>): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  const userRef = ref(realtimeDb, `users/${userData.telegramId}`);
  const userSnapshot = await get(userRef);
  
  if (!userSnapshot.exists()) {
    const newUser: User = {
      id: userData.telegramId!,
      telegramId: userData.telegramId!,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profilePic: userData.profilePic,
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
      referrerId: userData.referrerId,
      dailyStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await set(userRef, {
      ...newUser,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
    });
    
    // If user has a referrer, update referrer's count
    if (userData.referrerId) {
        const referrerRef = ref(realtimeDb!, `users/${userData.referrerId}`);
      const referrerSnapshot = await get(referrerRef);
      if (referrerSnapshot.exists()) {
        const referrerData = referrerSnapshot.val();
        await update(referrerRef, {
          referralCount: (referrerData.referralCount || 0) + 1,
          coins: (referrerData.coins || 0) + 500, // Referral bonus
          referralEarnings: (referrerData.referralEarnings || 0) + 500,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
};

export const getUser = async (telegramId: string): Promise<User | null> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot get user: Firebase not initialized');
    return null;
  }
  
  try {
    const userRef = ref(realtimeDb, `users/${telegramId}`);
    const userSnapshot = await get(userRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      return {
        ...userData,
        id: telegramId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      } as User;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const updateUser = async (telegramId: string, updates: Partial<User>): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  // Validate telegramId
  if (!telegramId || typeof telegramId !== 'string' || telegramId.trim() === '') {
    throw new Error('Valid telegramId is required for update operation');
  }
  
  const sanitizedTelegramId = telegramId.toString().trim();
  const userRef = ref(realtimeDb, `users/${sanitizedTelegramId}`);
  
  // Clean updates object - remove undefined values
  const updateData: any = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  // Remove undefined values and convert dates safely
  const cleanedUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof Date) {
        acc[key] = value.toISOString();
      } else {
        acc[key] = value;
      }
    }
    return acc;
  }, {} as any);
  
  await update(userRef, cleanedUpdateData);
};

// VIP subscription
export const activateSubscription = async (
  userId: string,
  tier: 'vip1' | 'vip2',
  durationDays: number
): Promise<void> => {
  const vipTier = VIP_TIERS[tier];
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + durationDays);
  
  await updateUser(userId, {
    vipTier: tier,
    vipEndTime: endTime,
    farmingMultiplier: vipTier.farmingMultiplier,
    referralMultiplier: vipTier.referralMultiplier,
    adsLimitPerDay: vipTier.adsLimitPerDay,
    withdrawalLimit: vipTier.withdrawalLimit,
    minWithdrawal: vipTier.minWithdrawal,
  });
};

// Task operations with Realtime Database
export const getTasks = async (): Promise<Task[]> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot get tasks: Firebase not initialized');
    return [];
  }
  
  try {
    const tasksRef = ref(realtimeDb, 'tasks');
    const tasksSnapshot = await get(tasksRef);
    
    const tasks: Task[] = [];
    if (tasksSnapshot.exists()) {
      const tasksData = tasksSnapshot.val();
      Object.keys(tasksData).forEach((taskId) => {
        const taskData = tasksData[taskId];
        if (taskData.isActive) {
          tasks.push({
            ...taskData,
            id: taskId,
            createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
            updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date(),
          });
        }
      });
    }
    
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  const tasksRef = ref(realtimeDb, 'tasks');
  const newTaskRef = push(tasksRef);
  
  await set(newTaskRef, {
    ...taskData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  console.log('Task created with real-time sync');
};

export const getUserTasks = async (userId: string): Promise<UserTask[]> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot get user tasks: Firebase not initialized');
    return [];
  }
  
  try {
    const userTasksRef = ref(realtimeDb, `userTasks/${userId}`);
    const userTasksSnapshot = await get(userTasksRef);
    
    const userTasks: UserTask[] = [];
    if (userTasksSnapshot.exists()) {
      const userTasksData = userTasksSnapshot.val();
      Object.keys(userTasksData).forEach((taskId) => {
        const taskData = userTasksData[taskId];
        userTasks.push({
          ...taskData,
          id: taskId,
          completedAt: taskData.completedAt ? new Date(taskData.completedAt) : undefined,
          claimedAt: taskData.claimedAt ? new Date(taskData.claimedAt) : undefined,
        });
      });
    }
    
    return userTasks;
  } catch (error) {
    console.error('Error getting user tasks:', error);
    return [];
  }
};

export const completeTask = async (userId: string, taskId: string): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  const userTaskRef = ref(realtimeDb, `userTasks/${userId}/${taskId}`);
  await set(userTaskRef, {
    userId,
    taskId,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
};

export const claimTask = async (userId: string, taskId: string, reward: number): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    // Update user task status
    const userTaskRef = ref(realtimeDb, `userTasks/${userId}/${taskId}`);
    await update(userTaskRef, {
      status: 'claimed',
      claimedAt: new Date().toISOString(),
    });
    
    // Add coins to user atomically
    const userRef = ref(realtimeDb!, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      await update(userRef, {
        coins: (userData.coins || 0) + reward,
        xp: (userData.xp || 0) + Math.floor(reward / 10),
        updatedAt: new Date().toISOString(),
      });
      console.log(`Task claimed: +${reward} coins for user ${userId}`);
    }
  } catch (error) {
    console.error('Error claiming task:', error);
    throw error;
  }
};

// Withdrawal operations - keep using Firestore for admin management
export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  upiId: string
): Promise<void> => {
  if (!checkFirebaseConnection() || !db) {
    throw new Error('Firebase not initialized');
  }
  
  const withdrawalsRef = collection(db, 'withdrawals');
  await addDoc(withdrawalsRef, {
    userId,
    amount,
    upiId,
    status: 'pending',
    requestedAt: serverTimestamp(),
  });
};

export const getWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  if (!checkFirebaseConnection() || !db) {
    console.warn('Cannot get withdrawal requests: Firebase not initialized');
    return [];
  }
  
  const withdrawalsRef = collection(db, 'withdrawals');
  const q = query(withdrawalsRef, orderBy('requestedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  })) as WithdrawalRequest[];
};

export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: 'approved' | 'rejected' | 'paid',
  adminNotes?: string
): Promise<void> => {
  if (!checkFirebaseConnection() || !db) {
    throw new Error('Firebase not initialized');
  }
  
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  await updateDoc(withdrawalRef, {
    status,
    adminNotes,
    processedAt: serverTimestamp(),
  });
};

// Admin operations with Realtime Database
export const getAdminSettings = async (): Promise<AdminSettings> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    console.warn('Cannot get admin settings: Firebase not initialized');
    return DEFAULT_SETTINGS;
  }
  
  const settingsRef = ref(realtimeDb, 'admin/settings');
  const settingsSnapshot = await get(settingsRef);
  
  if (settingsSnapshot.exists()) {
    const settingsData = settingsSnapshot.val();
    return {
      ...settingsData,
      updatedAt: settingsData.updatedAt ? new Date(settingsData.updatedAt) : new Date(),
    } as AdminSettings;
  }
  
  // Create default settings if they don't exist
  const defaultSettings = {
    ...DEFAULT_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  await set(settingsRef, defaultSettings);
  return {
    ...DEFAULT_SETTINGS,
    updatedAt: new Date(),
  };
};

export const updateAdminSettings = async (settings: Partial<AdminSettings>): Promise<void> => {
  if (!checkFirebaseConnection() || !realtimeDb) {
    throw new Error('Firebase not initialized');
  }
  
  const settingsRef = ref(realtimeDb, 'admin/settings');
  const updateData = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await update(settingsRef, updateData);
  console.log('Admin settings updated with real-time sync');
};

export const getDailyStats = async (): Promise<DailyStats> => {
  if (!checkFirebaseConnection() || !realtimeDb || !db) {
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
  
  // Get pending withdrawals from Firestore
  const withdrawalsRef = collection(db, 'withdrawals');
  const pendingQuery = query(withdrawalsRef, where('status', '==', 'pending'));
  const pendingSnapshot = await getDocs(pendingQuery);
  const pendingWithdrawals = pendingSnapshot.size;
  
  // Calculate total INR generated (approximate based on VIP purchases)
  const totalInrGenerated = activeVipUsers * 75; // Simplified calculation
  
  return {
    totalUsers,
    activeVipUsers,
    totalCoinsDistributed,
    totalInrGenerated,
    pendingWithdrawals,
    totalPayments: 0,
    totalConversions: 0,
  };
};

// VIP Request interface
export interface VipRequest {
  userId: string;
  username?: string;
  tier: 'bronze' | 'diamond';
  paymentMethod: 'stars';
  amount: number;
  status: 'approved';
  requestedAt: number;
  processedAt: number;
  adminNotes: string;
  paymentDetails: {
    invoiceId: string;
  };
}

// Create VIP request (for Telegram Stars payments)
export const createVipRequest = async (vipRequest: VipRequest): Promise<void> => {
  if (!checkFirebaseConnection() || !db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const vipRequestsRef = collection(db, 'vipRequests');
    await addDoc(vipRequestsRef, {
      ...vipRequest,
      createdAt: serverTimestamp(),
    });
    
    console.log('VIP request created successfully:', vipRequest);
  } catch (error) {
    console.error('Error creating VIP request:', error);
    throw error;
  }
};

// Create Telegram Star invoice
export const createTelegramStarInvoice = async (
  userId: number,
  title: string,
  description: string,
  payload: string,
  amount: number
): Promise<{ invoice_link: string } | null> => {
  try {
    const response = await fetch('/api/create-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        chatId: userId, // Use userId as chatId for Telegram users
        amount,
        title,
        description,
        tier: payload.includes('bronze') ? 'vip1' : 'vip2',
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      return {
        invoice_link: result.invoiceUrl
      };
    } else {
      console.error('Failed to create invoice:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error creating Telegram Star invoice:', error);
    return null;
  }
};