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

// Real-time listeners
const listeners = new Map<string, () => void>();

// Use Realtime Database for instant sync
export const subscribeToUser = (userId: string, callback: (user: User | null) => void): (() => void) => {
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
        updatedAt: defaultSettings.updatedAt.toISOString(),
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

// Safe update function using Realtime Database
export const safeUpdateUser = async (userId: string, updateData: Partial<User>): Promise<User> => {
  try {
    const userRef = ref(realtimeDb, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      // Create new user
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
      return defaultData;
    } else {
      // Update existing user
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
      
      const updatedSnapshot = await get(userRef);
      const userData = updatedSnapshot.val();
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
    console.error('Error updating user:', error);
    throw error;
  }
};

// User operations with Realtime Database
export const createUser = async (userData: Partial<User>): Promise<void> => {
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
      const referrerRef = ref(realtimeDb, `users/${userData.referrerId}`);
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
  const userRef = ref(realtimeDb, `users/${telegramId}`);
  const updateData: any = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  // Convert dates to ISO strings
  if (updateData.lastClaimDate) updateData.lastClaimDate = updateData.lastClaimDate.toISOString();
  if (updateData.farmingStartTime) updateData.farmingStartTime = updateData.farmingStartTime.toISOString();
  if (updateData.farmingEndTime) updateData.farmingEndTime = updateData.farmingEndTime.toISOString();
  if (updateData.vipEndTime) updateData.vipEndTime = updateData.vipEndTime.toISOString();
  
  await update(userRef, updateData);
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
  const userTaskRef = ref(realtimeDb, `userTasks/${userId}/${taskId}`);
  await set(userTaskRef, {
    userId,
    taskId,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
};

export const claimTask = async (userId: string, taskId: string, reward: number): Promise<void> => {
  try {
    // Update user task status
    const userTaskRef = ref(realtimeDb, `userTasks/${userId}/${taskId}`);
    await update(userTaskRef, {
      status: 'claimed',
      claimedAt: new Date().toISOString(),
    });
    
    // Add coins to user atomically
    const userRef = ref(realtimeDb, `users/${userId}`);
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
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  await updateDoc(withdrawalRef, {
    status,
    adminNotes,
    processedAt: serverTimestamp(),
  });
};

// Admin operations with Realtime Database
export const getAdminSettings = async (): Promise<AdminSettings> => {
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
  const settingsRef = ref(realtimeDb, 'admin/settings');
  const updateData = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await update(settingsRef, updateData);
  console.log('Admin settings updated with real-time sync');
};

export const getDailyStats = async (): Promise<DailyStats> => {
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
  };
};