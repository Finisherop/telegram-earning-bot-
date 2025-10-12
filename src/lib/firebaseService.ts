import {
  ref,
  get,
  set,
  onValue,
  off,
  push,
  remove,
  update,
  query,
  orderByChild,
  orderByKey,
  orderByValue,
  equalTo,
  limitToFirst,
  limitToLast,
  Database
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { safeSet, safeUpdate, safeGet, sanitizeUserId, buildUserPath, buildTaskPath, buildUserTaskPath, extractUserId, FirebaseLogger, safeListen } from './firebaseUtils';
import { User, Task, UserTask, WithdrawalRequest, AdminSettings, DailyStats } from '@/types';
import { VIP_TIERS, DEFAULT_SETTINGS } from './constants';

// Firebase service error handling - returns realtimeDb or null (no throws for user stability)
const getRealtimeDb = (): Database | null => {
  if (!realtimeDb) {
    console.warn('[Firebase] Realtime Database not initialized, running in offline mode');
    return null;
  }
  return realtimeDb;
};

// Global listeners map to prevent memory leaks
const listeners = new Map<string, () => void>();

/**
 * Real-time user data subscription
 */
export const subscribeToUser = (userId: string, callback: (user: User | null) => void): (() => void) => {
  const db = getRealtimeDb();
  
  if (!db) {
    // Return empty unsubscribe function if database not available
    console.warn('[Firebase] Database not available for user subscription, running in offline mode');
    callback(null);
    return () => {};
  }
  
  const userRef = ref(db, `telegram_users/${userId}`);
  
  const unsubscribe = onValue(userRef, (snapshot) => {
    try {
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
          vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
        };
        callback(user);
      } else {
        callback(null);
      }
    } catch (error) {
      console.error(`[Firebase] User subscription error for ${userId}:`, error);
      callback(null);
    }
  }, (error) => {
    console.error(`[Firebase] User subscription failed for ${userId}:`, error);
    callback(null);
  });

  const unsubscribeKey = `user_${userId}`;
  listeners.set(unsubscribeKey, () => off(userRef, 'value', unsubscribe));

  return () => {
    const listener = listeners.get(unsubscribeKey);
    if (listener) {
      listener();
      listeners.delete(unsubscribeKey);
    }
  };
};

/**
 * Real-time tasks subscription
 */
export const subscribeToTasks = (callback: (tasks: Task[]) => void): (() => void) => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for tasks subscription, running in offline mode');
    callback([]);
    return () => {};
  }
  
  const tasksRef = ref(db, 'tasks');
  
  const unsubscribe = onValue(tasksRef, (snapshot) => {
    try {
      const tasks: Task[] = [];
      if (snapshot.exists()) {
        const tasksData = snapshot.val();
        Object.entries(tasksData).forEach(([taskId, taskData]: [string, any]) => {
          if (taskData && typeof taskData === 'object') {
            const task: Task = {
              id: taskId,
              title: taskData.title || '',
              description: taskData.description || '',
              type: (taskData.type as 'link' | 'ads' | 'social' | 'referral' | 'farming' | 'daily') || 'link',
              reward: taskData.reward || 0,
              url: taskData.url || '',
              isActive: taskData.isActive || false,
              createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
              updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date()
            };
            tasks.push(task);
          }
        });
      }
      callback(tasks);
    } catch (error) {
      console.error('[Firebase] Tasks subscription error:', error);
      callback([]);
    }
  }, (error) => {
    console.error('[Firebase] Tasks subscription failed:', error);
    callback([]);
  });

  const unsubscribeKey = 'tasks_global';
  listeners.set(unsubscribeKey, () => off(tasksRef, 'value', unsubscribe));

  return () => {
    const listener = listeners.get(unsubscribeKey);
    if (listener) {
      listener();
      listeners.delete(unsubscribeKey);
    }
  };
};

/**
 * Real-time admin settings subscription
 */
export const subscribeToAdminSettings = (callback: (settings: AdminSettings) => void): (() => void) => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for admin settings subscription, using defaults');
    callback(DEFAULT_SETTINGS);
    return () => {};
  }
  
  const settingsRef = ref(db, 'admin_settings');
  
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    try {
      let settings: AdminSettings;
      if (snapshot.exists()) {
        const settingsData = snapshot.val();
        settings = {
          ...DEFAULT_SETTINGS,
          ...settingsData,
          updatedAt: settingsData.updatedAt ? new Date(settingsData.updatedAt) : new Date()
        };
      } else {
        settings = DEFAULT_SETTINGS;
      }
      callback(settings);
    } catch (error) {
      console.error('[Firebase] Admin settings subscription error:', error);
      callback(DEFAULT_SETTINGS);
    }
  }, (error) => {
    console.error('[Firebase] Admin settings subscription failed:', error);
    callback(DEFAULT_SETTINGS);
  });

  const unsubscribeKey = 'admin_settings';
  listeners.set(unsubscribeKey, () => off(settingsRef, 'value', unsubscribe));

  return () => {
    const listener = listeners.get(unsubscribeKey);
    if (listener) {
      listener();
      listeners.delete(unsubscribeKey);
    }
  };
};

/**
 * Real-time user tasks subscription
 */
export const subscribeToUserTasks = (userId: string, callback: (userTasks: UserTask[]) => void): (() => void) => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for user tasks subscription, running in offline mode');
    callback([]);
    return () => {};
  }
  
  const userTasksRef = ref(db, `userTasks/${userId}`);
  
  const unsubscribe = onValue(userTasksRef, (snapshot) => {
    try {
      const userTasks: UserTask[] = [];
      if (snapshot.exists()) {
        const userTasksData = snapshot.val();
        Object.entries(userTasksData).forEach(([taskId, taskData]: [string, any]) => {
          if (taskData && typeof taskData === 'object') {
            const userTask: UserTask = {
              id: taskId,
              userId: userId,
              taskId: taskId,
              status: (taskData.status as 'pending' | 'completed' | 'claimed') || 'pending',
              completedAt: taskData.completedAt ? new Date(taskData.completedAt) : undefined,
              claimedAt: taskData.claimedAt ? new Date(taskData.claimedAt) : undefined
            };
            userTasks.push(userTask);
          }
        });
      }
      callback(userTasks);
    } catch (error) {
      console.error(`[Firebase] User tasks subscription error for ${userId}:`, error);
      callback([]);
    }
  }, (error) => {
    console.error(`[Firebase] User tasks subscription failed for ${userId}:`, error);
    callback([]);
  });

  const unsubscribeKey = `user_tasks_${userId}`;
  listeners.set(unsubscribeKey, () => off(userTasksRef, 'value', unsubscribe));

  return () => {
    const listener = listeners.get(unsubscribeKey);
    if (listener) {
      listener();
      listeners.delete(unsubscribeKey);
    }
  };
};

/**
 * Cleanup all active listeners
 */
export const cleanupListeners = () => {
  console.log(`[Firebase] Cleaning up ${listeners.size} active listeners`);
  listeners.forEach((unsubscribe) => unsubscribe());
  listeners.clear();
};

/**
 * Initialize or get user data with safe defaults
 */
export const initializeUser = async (userId: string): Promise<User> => {
  const db = getRealtimeDb();
  
  if (!db) {
    // Return a default user object when offline
    console.warn('[Firebase] Database not available, creating offline user');
    const now = new Date();
    return {
      id: userId,
      telegramId: userId,
      firstName: 'User',
      lastName: '',
      username: '',
      profilePic: '',
      coins: 0,
      xp: 0,
      level: 1,
      vipTier: 'free',
      farmingMultiplier: 1,
      referralMultiplier: 1,
      adsLimitPerDay: 5,
      withdrawalLimit: 1000,
      minWithdrawal: 100,
      referralCount: 0,
      referralEarnings: 0,
      dailyStreak: 0,
      createdAt: now,
      updatedAt: now
    } as User;
  }
  
  try {
    const userRef = ref(db, `telegram_users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      return {
        ...userData,
        id: userId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
      };
    } else {
      // Create new user with default values - NO UNDEFINED VALUES
      const now = new Date().toISOString();
      const newUser: Omit<User, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string } = {
        id: userId,
        telegramId: userId,
        firstName: 'User', // Never undefined
        lastName: '', // Never undefined
        username: '', // Never undefined
        profilePic: '', // Never undefined
        coins: 0,
        xp: 0,
        level: 1,
        vipTier: 'free',
        farmingMultiplier: 1,
        referralMultiplier: 1,
        adsLimitPerDay: 5,
        withdrawalLimit: 1000,
        minWithdrawal: 100,
        referralCount: 0,
        referralEarnings: 0,
        dailyStreak: 0,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('[Firebase] Creating new user with safe defaults:', userId);
      const userPath = buildUserPath(userId);
      if (!userPath) {
        throw new Error('Invalid user ID for creating user');
      }
      await safeSet(userPath, newUser);
      
      // Return user object with proper Date objects
      return {
        ...newUser,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      } as User;
    }
  } catch (error) {
    console.error('[Firebase] Error initializing user:', error);
    throw error;
  }
};

/**
 * Safe user update with validation and undefined prevention
 */
export const safeUpdateUser = async (userId: string, updateData: Partial<User>): Promise<User> => {
  const db = getRealtimeDb();
  
  if (!db) {
    // Return current user with updates applied locally when offline
    console.warn('[Firebase] Database not available, applying updates locally');
    const now = new Date();
    return {
      id: userId,
      telegramId: userId,
      firstName: 'User',
      lastName: '',
      username: '',
      profilePic: '',
      coins: 0,
      xp: 0,
      level: 1,
      vipTier: 'free',
      farmingMultiplier: 1,
      referralMultiplier: 1,
      adsLimitPerDay: 5,
      withdrawalLimit: 1000,
      minWithdrawal: 100,
      referralCount: 0,
      referralEarnings: 0,
      dailyStreak: 0,
      createdAt: now,
      updatedAt: now,
      ...updateData
    } as User;
  }
  
  try {
    const sanitizedUserId = userId.toString().trim();
    
    if (!sanitizedUserId) {
      throw new Error('Valid user ID is required');
    }

    const userRef = ref(db, `telegram_users/${sanitizedUserId}`);
    
    // Prepare sanitized update data - CRITICAL for preventing undefined errors
    const sanitizedData: Record<string, any> = {};
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (value === undefined) {
        // NEVER send undefined to Firebase - log warning and skip
        console.warn(`[Firebase] Skipping undefined value for key '${key}' in user update`);
        return;
      }
      
      if (value === null) {
        sanitizedData[key] = null;
      } else if (value instanceof Date) {
        sanitizedData[key] = value.toISOString();
      } else if (typeof value === 'string') {
        sanitizedData[key] = value.trim() || '';
      } else {
        sanitizedData[key] = value;
      }
    });
    
    // Only update if we have valid data
    if (Object.keys(sanitizedData).length > 0) {
      sanitizedData.updatedAt = new Date().toISOString();
      
      console.log(`[Firebase] Updating user ${sanitizedUserId} with:`, Object.keys(sanitizedData));
      const userPath = buildUserPath(sanitizedUserId);
      if (!userPath) {
        throw new Error('Invalid user ID for updating user');
      }
      await safeUpdate(userPath, sanitizedData);
    } else {
      console.warn(`[Firebase] No valid data to update for user ${sanitizedUserId}`);
    }
    
    // Get updated user data
    const updatedSnapshot = await get(userRef);
    if (updatedSnapshot.exists()) {
      const userData = updatedSnapshot.val();
      return {
        ...userData,
        id: sanitizedUserId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
      };
    } else {
      throw new Error('User not found after update');
    }
  } catch (error) {
    console.error('[Firebase] Error updating user:', error);
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (userData: Partial<User>): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available, user creation skipped');
    return;
  }
  
  try {
    if (!userData.id && !userData.telegramId) {
      throw new Error('User ID or Telegram ID is required');
    }
    
    const userId = userData.id || userData.telegramId!;
    const userRef = ref(db, `telegram_users/${userId}`);
    
    const now = new Date().toISOString();
    const newUser = {
      id: userId,
      telegramId: userId,
      coins: 0,
      xp: 0,
      level: 1,
      vipTier: 'free',
      farmingMultiplier: 1,
      referralMultiplier: 1,
      adsLimitPerDay: 5,
      withdrawalLimit: 1000,
      minWithdrawal: 100,
      referralCount: 0,
      referralEarnings: 0,
      dailyStreak: 0,
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    
    const userPath = buildUserPath(userId);
    if (!userPath) {
      throw new Error('Invalid user ID for creating user');
    }
    await safeSet(userPath, newUser);
    console.log('[Firebase] User created successfully:', userId);
  } catch (error) {
    console.error('[Firebase] Error creating user:', error);
    throw error;
  }
};

/**
 * Get user by Telegram ID
 */
export const getUser = async (telegramId: string): Promise<User | null> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for getUser');
    return null;
  }
  
  try {
    const sanitizedTelegramId = telegramId.toString().trim();
    const userRef = ref(db, `telegram_users/${sanitizedTelegramId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      return {
        ...userData,
        id: sanitizedTelegramId,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
        lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Firebase] Error getting user:', error);
    return null;
  }
};

/**
 * Update user data
 */
export const updateUser = async (telegramId: string, updates: Partial<User>): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for updateUser');
    return;
  }
  
  try {
    const sanitizedTelegramId = telegramId.toString().trim();
    const userRef = ref(db, `telegram_users/${sanitizedTelegramId}`);
    
    // Sanitize updates
    const sanitizedUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          sanitizedUpdates[key] = value.toISOString();
        } else {
          sanitizedUpdates[key] = value;
        }
      }
    });
    
    sanitizedUpdates.updatedAt = new Date().toISOString();
    const userPath = buildUserPath(sanitizedTelegramId);
    if (!userPath) {
      throw new Error('Invalid user ID for updating user');
    }
    await safeUpdate(userPath, sanitizedUpdates);
  } catch (error) {
    console.error('[Firebase] Error updating user:', error);
    throw error;
  }
};

/**
 * Activate subscription (VIP)
 */
export const activateSubscription = async (
  userId: string,
  tier: 'vip1' | 'vip2',
  durationDays: number = 30
): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for activateSubscription');
    return;
  }
  
  try {
    const userRef = ref(db, `telegram_users/${userId}`);
    const vipConfig = VIP_TIERS[tier];
    
    if (!vipConfig) {
      throw new Error(`Invalid VIP tier: ${tier}`);
    }
    
    const now = new Date();
    const vipEndTime = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    
    const userPath = buildUserPath(userId);
    if (!userPath) {
      throw new Error('Invalid user ID for VIP activation');
    }
    
    await safeUpdate(userPath, {
      vipTier: tier,
      vipEndTime: vipEndTime.toISOString(),
      farmingMultiplier: vipConfig.farmingMultiplier,
      referralMultiplier: vipConfig.referralMultiplier,
      adsLimitPerDay: vipConfig.adsLimitPerDay,
      withdrawalLimit: vipConfig.withdrawalLimit,
      minWithdrawal: vipConfig.minWithdrawal,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`[Firebase] VIP ${tier} activated for user ${userId} until ${vipEndTime.toISOString()}`);
  } catch (error) {
    console.error('[Firebase] Error activating subscription:', error);
    throw error;
  }
};

/**
 * Get all tasks
 */
export const getTasks = async (): Promise<Task[]> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for getTasks');
    return [];
  }
  
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);
    
    const tasks: Task[] = [];
    if (snapshot.exists()) {
      const tasksData = snapshot.val();
      Object.entries(tasksData).forEach(([taskId, taskData]: [string, any]) => {
        if (taskData && typeof taskData === 'object') {
          const task: Task = {
            id: taskId,
            title: taskData.title || '',
            description: taskData.description || '',
            type: (taskData.type as 'link' | 'ads' | 'social' | 'referral' | 'farming' | 'daily') || 'link',
            reward: taskData.reward || 0,
            url: taskData.url || '',
            isActive: taskData.isActive || false,
            createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
            updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date()
          };
          tasks.push(task);
        }
      });
    }
    
    return tasks;
  } catch (error) {
    console.error('[Firebase] Error getting tasks:', error);
    return [];
  }
};

/**
 * Create a new task
 */
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for createTask');
    return;
  }
  
  try {
    const tasksRef = ref(db, 'tasks');
    const newTaskRef = push(tasksRef);
    
    const now = new Date().toISOString();
    const task = {
      ...taskData,
      createdAt: now,
      updatedAt: now
    };
    
    await safeSet(`tasks/${newTaskRef.key}`, task);
    console.log('[Firebase] Task created successfully');
  } catch (error) {
    console.error('[Firebase] Error creating task:', error);
    throw error;
  }
};

/**
 * Get user tasks
 */
export const getUserTasks = async (userId: string): Promise<UserTask[]> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for getUserTasks');
    return [];
  }
  
  try {
    const userTasksRef = ref(db, `userTasks/${userId}`);
    const snapshot = await get(userTasksRef);
    
    const userTasks: UserTask[] = [];
    if (snapshot.exists()) {
      const userTasksData = snapshot.val();
      Object.entries(userTasksData).forEach(([taskId, taskData]: [string, any]) => {
        if (taskData && typeof taskData === 'object') {
          const userTask: UserTask = {
            id: taskId,
            userId: userId,
            taskId: taskId,
            status: (taskData.status as 'pending' | 'completed' | 'claimed') || 'pending',
            completedAt: taskData.completedAt ? new Date(taskData.completedAt) : undefined,
            claimedAt: taskData.claimedAt ? new Date(taskData.claimedAt) : undefined
          };
          userTasks.push(userTask);
        }
      });
    }
    
    return userTasks;
  } catch (error) {
    console.error('[Firebase] Error getting user tasks:', error);
    return [];
  }
};

/**
 * Mark task as completed
 */
export const completeTask = async (userId: string, taskId: string): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for completeTask');
    return;
  }
  
  try {
    const userTaskPath = buildUserTaskPath(userId, taskId);
    if (!userTaskPath) {
      throw new Error('Invalid user ID or task ID for completing task');
    }
    
    await safeUpdate(userTaskPath, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Firebase] Error completing task:', error);
    throw error;
  }
};

/**
 * Claim task reward
 */
export const claimTask = async (userId: string, taskId: string, reward: number): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for claimTask');
    return;
  }
  
  try {
    const userRef = ref(db, `telegram_users/${userId}`);
    const userTaskRef = ref(db, `userTasks/${userId}/${taskId}`);
    
    // Get current user data
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      // Auto-create user if not found
      console.log(`[Firebase] User ${userId} not found, creating new user before claiming task`);
      const newUser = await initializeUser(userId);
      if (!newUser) {
        throw new Error(`Failed to initialize user ${userId}`);
      }
    }
    
    // Get user data again after potential creation
    const updatedUserSnapshot = await get(userRef);
    const userData = updatedUserSnapshot.val();
    const currentCoins = userData.coins || 0;
    const currentXp = userData.xp || 0;
    
    // Update user coins and XP
    await update(userRef, {
      coins: currentCoins + reward,
      xp: currentXp + Math.floor(reward / 10),
      updatedAt: new Date().toISOString()
    });
    
    // Mark task as claimed
    await update(userTaskRef, {
      status: 'claimed',
      claimedAt: new Date().toISOString()
    });
    
    console.log(`[Firebase] Task ${taskId} claimed successfully by user ${userId} for ${reward} coins`);
  } catch (error) {
    console.error('[Firebase] Error claiming task:', error);
    throw error;
  }
};

/**
 * Create withdrawal request
 */
export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  upiId: string
): Promise<string> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for createWithdrawalRequest');
    throw new Error('Service temporarily unavailable');
  }
  
  try {
    const withdrawalsRef = ref(db, 'withdrawals');
    const newWithdrawalRef = push(withdrawalsRef);
    
    const withdrawal: Omit<WithdrawalRequest, 'id'> = {
      userId,
      amount,
      upiId,
      status: 'pending',
      requestedAt: new Date()
    };
    
    await set(newWithdrawalRef, {
      ...withdrawal,
      requestedAt: withdrawal.requestedAt.toISOString()
    });
    
    return newWithdrawalRef.key!;
  } catch (error) {
    console.error('[Firebase] Error creating withdrawal request:', error);
    throw error;
  }
};

/**
 * Get withdrawal requests
 */
export const getWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for getWithdrawalRequests');
    return [];
  }
  
  try {
    const withdrawalsRef = ref(db, 'withdrawals');
    const snapshot = await get(withdrawalsRef);
    
    const withdrawals: WithdrawalRequest[] = [];
    if (snapshot.exists()) {
      const withdrawalsData = snapshot.val();
      Object.entries(withdrawalsData).forEach(([id, data]: [string, any]) => {
        if (data && typeof data === 'object') {
          const withdrawal: WithdrawalRequest = {
            id,
            userId: data.userId,
            amount: data.amount || 0,
            upiId: data.upiId || '',
            status: data.status || 'pending',
            requestedAt: data.requestedAt ? new Date(data.requestedAt) : new Date(),
            processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
            adminNotes: data.adminNotes || undefined
          };
          withdrawals.push(withdrawal);
        }
      });
    }
    
    return withdrawals;
  } catch (error) {
    console.error('[Firebase] Error getting withdrawal requests:', error);
    return [];
  }
};

/**
 * Update withdrawal status
 */
export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: 'pending' | 'approved' | 'rejected' | 'paid',
  adminNotes?: string
): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for updateWithdrawalStatus');
    return;
  }
  
  try {
    const withdrawalRef = ref(db, `withdrawals/${withdrawalId}`);
    await update(withdrawalRef, {
      status,
      processedAt: new Date().toISOString(),
      adminNotes: adminNotes || undefined
    });
  } catch (error) {
    console.error('[Firebase] Error updating withdrawal status:', error);
    throw error;
  }
};

/**
 * Get admin settings
 */
export const getAdminSettings = async (): Promise<AdminSettings> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for getAdminSettings');
    return DEFAULT_SETTINGS;
  }
  
  try {
    const settingsRef = ref(db, 'admin_settings');
    const snapshot = await get(settingsRef);
    
    if (snapshot.exists()) {
      const settingsData = snapshot.val();
      return {
        ...DEFAULT_SETTINGS,
        ...settingsData,
        updatedAt: settingsData.updatedAt ? new Date(settingsData.updatedAt) : new Date()
      };
    }
    
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[Firebase] Error getting admin settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Update admin settings
 */
export const updateAdminSettings = async (settings: Partial<AdminSettings>): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for updateAdminSettings');
    return;
  }
  
  try {
    const settingsRef = ref(db, 'admin_settings');
    await update(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Firebase] Error updating admin settings:', error);
    throw error;
  }
};

/**
 * Get daily stats
 */
export const getDailyStats = async (): Promise<DailyStats> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for getDailyStats');
    return {
      totalUsers: 0,
      activeVipUsers: 0,
      totalCoinsDistributed: 0,
      totalInrGenerated: 0,
      pendingWithdrawals: 0,
      totalPayments: 0,
      totalConversions: 0
    };
  }
  
  try {
    const usersRef = ref(db, 'telegram_users');
    const snapshot = await get(usersRef);
    
    let totalUsers = 0;
    let activeUsers = 0;
    let totalCoins = 0;
    let totalWithdrawals = 0;
    
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      Object.values(usersData).forEach((userData: any) => {
        if (userData && typeof userData === 'object') {
          totalUsers++;
          totalCoins += userData.coins || 0;
          
          // Consider user active if they logged in within last 7 days
          if (userData.updatedAt) {
            const lastActive = new Date(userData.updatedAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (lastActive > weekAgo) {
              activeUsers++;
            }
          }
        }
      });
    }
    
    return {
      totalUsers,
      activeVipUsers: activeUsers, // Rename to match interface
      totalCoinsDistributed: totalCoins,
      totalInrGenerated: 0,
      pendingWithdrawals: 0, // Would need to query withdrawals collection
      totalPayments: 0,
      totalConversions: 0
    };
  } catch (error) {
    console.error('[Firebase] Error getting daily stats:', error);
    return {
      totalUsers: 0,
      activeVipUsers: 0,
      totalCoinsDistributed: 0,
      totalInrGenerated: 0,
      pendingWithdrawals: 0,
      totalPayments: 0,
      totalConversions: 0
    };
  }
};

// VIP interfaces for compatibility
interface VipRequest {
  userId: string;
  tier: 'vip1' | 'vip2';
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

/**
 * Create VIP request
 */
export const createVipRequest = async (vipRequest: VipRequest): Promise<void> => {
  const db = getRealtimeDb();
  
  if (!db) {
    console.warn('[Firebase] Database not available for createVipRequest');
    return;
  }
  
  try {
    const vipRequestsRef = ref(db, 'vipRequests');
    const newVipRequestRef = push(vipRequestsRef);
    
    await set(newVipRequestRef, {
      ...vipRequest,
      createdAt: vipRequest.createdAt.toISOString()
    });
  } catch (error) {
    console.error('[Firebase] Error creating VIP request:', error);
    throw error;
  }
};

/**
 * Create Telegram star invoice (placeholder for API compatibility)
 */
export const createTelegramStarInvoice = async (
  userId: string,
  amount: number,
  description: string
): Promise<string> => {
  // This would typically integrate with Telegram's payment system
  // For now, return a mock invoice ID
  console.log(`[Firebase] Creating Telegram star invoice for user ${userId}: ${amount} stars`);
  return `invoice_${Date.now()}_${userId}`;
};

// Auto-cleanup on page unload and visibility change
if (typeof window !== 'undefined') {
  // Clean up listeners when page is unloaded
  window.addEventListener('beforeunload', () => {
    cleanupListeners();
  });

  // Clean up listeners when page becomes hidden (tab switch, minimize, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cleanupListeners();
    }
  });

  // Clean up listeners on page focus loss
  window.addEventListener('blur', () => {
    cleanupListeners();
  });
}

const firebaseService = {
  subscribeToUser,
  subscribeToTasks,
  subscribeToAdminSettings,
  subscribeToUserTasks,
  cleanupListeners,
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
  createVipRequest,
  createTelegramStarInvoice
};

export default firebaseService;