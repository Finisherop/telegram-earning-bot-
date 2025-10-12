/**
 * Real-time Firebase Listeners Service (Realtime Database Only)
 * 
 * Provides onValue listeners for real-time data updates
 * with proper error handling and data sanitization.
 */

import { 
  ref, 
  onValue, 
  off, 
  DatabaseReference,
  get,
  query,
  orderByChild,
  orderByKey
} from 'firebase/database';
import { getFirebaseServices } from './firebaseSingleton';
import { User, WithdrawalRequest, Task, UserTask } from '@/types';

export interface RealtimeListenerOptions {
  onError?: (error: Error) => void;
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: RealtimeListenerOptions = {
  retryOnError: true,
  maxRetries: 3,
  retryDelay: 2000
};

/**
 * Listener manager to track active subscriptions
 */
class ListenerManager {
  private listeners = new Map<string, () => void>();

  add(id: string, unsubscribe: () => void) {
    this.listeners.set(id, unsubscribe);
  }

  remove(id: string): boolean {
    const listener = this.listeners.get(id);
    if (listener) {
      listener();
      this.listeners.delete(id);
      return true;
    }
    return false;
  }

  removeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  getActiveCount(): number {
    return this.listeners.size;
  }
}

export const listenerManager = new ListenerManager();

/**
 * Converts timestamp to Date safely
 */
function safeTimestampToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
  }
  
  // Handle different timestamp formats
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // Handle Firebase timestamp objects
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  return new Date();
}

/**
 * Sanitizes user data from database
 */
function sanitizeUserData(userData: any, userId: string): User {
  return {
    id: userId,
    telegramId: userData.telegramId || userId,
    username: userData.username || undefined,
    firstName: userData.firstName || 'User',
    lastName: userData.lastName || undefined,
    profilePic: userData.profilePic || undefined,
    
    // Game data with safe defaults
    coins: userData.coins || 0,
    xp: userData.xp || 0,
    level: userData.level || 1,
    
    // VIP data
    vipTier: userData.vipTier || 'free',
    farmingMultiplier: userData.farmingMultiplier || 1,
    referralMultiplier: userData.referralMultiplier || 1,
    adsLimitPerDay: userData.adsLimitPerDay || 5,
    withdrawalLimit: userData.withdrawalLimit || 1000,
    minWithdrawal: userData.minWithdrawal || 100,
    vipEndTime: userData.vipEndTime ? safeTimestampToDate(userData.vipEndTime) : undefined,
    
    // Referral data
    referrerId: userData.referrerId || undefined,
    referralCount: userData.referralCount || 0,
    referralEarnings: userData.referralEarnings || 0,
    
    // Game state
    dailyStreak: userData.dailyStreak || 0,
    farmingStartTime: userData.farmingStartTime ? safeTimestampToDate(userData.farmingStartTime) : undefined,
    farmingEndTime: userData.farmingEndTime ? safeTimestampToDate(userData.farmingEndTime) : undefined,
    lastClaimDate: userData.lastClaimDate ? safeTimestampToDate(userData.lastClaimDate) : undefined,
    
    // Metadata
    createdAt: safeTimestampToDate(userData.createdAt),
    updatedAt: safeTimestampToDate(userData.updatedAt)
  };
}

/**
 * Real-time user data listener using Realtime Database
 */
export function subscribeToUser(
  userId: string,
  callback: (user: User | null) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const listenerId = `user_${userId}`;
  let retryCount = 0;
  
  const createListener = async () => {
    try {
      console.log(`[RealtimeListener] Setting up user subscription for ${userId}`);
      
      const { realtimeDb } = await getFirebaseServices();
      
      // Realtime Database listener
      const realtimeUserRef = ref(realtimeDb, `telegram_users/${userId}`);
      
      const realtimeUnsubscribe = onValue(realtimeUserRef, (snapshot) => {
        try {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const user = sanitizeUserData(userData, userId);
            console.log(`[RealtimeListener] Realtime DB update for user ${userId}`);
            callback(user);
          } else {
            console.log(`[RealtimeListener] User ${userId} not found in Realtime DB`);
            callback(null);
          }
        } catch (callbackError) {
          console.error(`[RealtimeListener] Callback error for user ${userId}:`, callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error(`[RealtimeListener] Realtime DB error for user ${userId}:`, error);
        if (opts.onError) {
          opts.onError(error);
        }
        
        // Retry on error if enabled
        if (opts.retryOnError && retryCount < (opts.maxRetries || 3)) {
          retryCount++;
          console.log(`[RealtimeListener] Retrying user subscription ${retryCount}/${opts.maxRetries}`);
          setTimeout(createListener, opts.retryDelay || 2000);
        }
      });
      
      // Unsubscribe function
      const unsubscribe = () => {
        off(realtimeUserRef, 'value', realtimeUnsubscribe);
        listenerManager.remove(listenerId);
        console.log(`[RealtimeListener] Unsubscribed from user ${userId}`);
      };
      
      listenerManager.add(listenerId, unsubscribe);
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create user listener for ${userId}:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
    }
  };
  
  createListener();
  
  return () => {
    listenerManager.remove(listenerId);
  };
}

/**
 * Real-time withdrawals listener
 */
export function subscribeToUserWithdrawals(
  userId: string,
  callback: (withdrawals: WithdrawalRequest[]) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const listenerId = `withdrawals_${userId}`;
  let retryCount = 0;
  
  const createListener = async () => {
    try {
      console.log(`[RealtimeListener] Setting up withdrawals subscription for user ${userId}`);
      
      const { realtimeDb } = await getFirebaseServices();
      
      const withdrawalsRef = ref(realtimeDb, 'withdrawals');
      
      const unsubscribe = onValue(withdrawalsRef, (snapshot) => {
        try {
          const withdrawals: WithdrawalRequest[] = [];
          if (snapshot.exists()) {
            const withdrawalsData = snapshot.val();
            Object.entries(withdrawalsData).forEach(([id, data]: [string, any]) => {
              if (data && typeof data === 'object' && data.userId === userId) {
                const withdrawal: WithdrawalRequest = {
                  id,
                  userId: data.userId,
                  amount: data.amount || 0,
                  upiId: data.upiId || '',
                  status: data.status || 'pending',
                  requestedAt: safeTimestampToDate(data.requestedAt),
                  processedAt: data.processedAt ? safeTimestampToDate(data.processedAt) : undefined,
                  adminNotes: data.adminNotes || undefined
                };
                
                withdrawals.push(withdrawal);
              }
            });
          }
          callback(withdrawals);
        } catch (callbackError) {
          console.error(`[RealtimeListener] Withdrawals callback error for user ${userId}:`, callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error(`[RealtimeListener] Withdrawals subscription error for user ${userId}:`, error);
        if (opts.onError) {
          opts.onError(error);
        }
        
        if (opts.retryOnError && retryCount < (opts.maxRetries || 3)) {
          retryCount++;
          console.log(`[RealtimeListener] Retrying withdrawals subscription ${retryCount}/${opts.maxRetries}`);
          setTimeout(createListener, opts.retryDelay || 2000);
        }
      });
      
      const unsubscribeFn = () => {
        off(withdrawalsRef, 'value', unsubscribe);
        listenerManager.remove(listenerId);
        console.log(`[RealtimeListener] Unsubscribed from withdrawals for user ${userId}`);
      };
      
      listenerManager.add(listenerId, unsubscribeFn);
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create withdrawals listener for user ${userId}:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
    }
  };
  
  createListener();
  
  return () => {
    listenerManager.remove(listenerId);
  };
}

/**
 * Real-time tasks listener
 */
export function subscribeToTasks(
  callback: (tasks: Task[]) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const listenerId = 'tasks_global';
  let retryCount = 0;
  
  const createListener = async () => {
    try {
      console.log(`[RealtimeListener] Setting up tasks subscription`);
      
      const { realtimeDb } = await getFirebaseServices();
      
      const tasksRef = ref(realtimeDb, 'tasks');
      
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
        } catch (callbackError) {
          console.error(`[RealtimeListener] Tasks callback error:`, callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error(`[RealtimeListener] Tasks subscription error:`, error);
        if (opts.onError) {
          opts.onError(error);
        }
        
        if (opts.retryOnError && retryCount < (opts.maxRetries || 3)) {
          retryCount++;
          console.log(`[RealtimeListener] Retrying tasks subscription ${retryCount}/${opts.maxRetries}`);
          setTimeout(createListener, opts.retryDelay || 2000);
        }
      });
      
      const unsubscribeFn = () => {
        off(tasksRef, 'value', unsubscribe);
        listenerManager.remove(listenerId);
        console.log(`[RealtimeListener] Unsubscribed from tasks`);
      };
      
      listenerManager.add(listenerId, unsubscribeFn);
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create tasks listener:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
    }
  };
  
  createListener();
  
  return () => {
    listenerManager.remove(listenerId);
  };
}

/**
 * Real-time user tasks listener
 */
export function subscribeToUserTasks(
  userId: string,
  callback: (userTasks: UserTask[]) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const listenerId = `user_tasks_${userId}`;
  let retryCount = 0;
  
  const createListener = async () => {
    try {
      console.log(`[RealtimeListener] Setting up user tasks subscription for ${userId}`);
      
      const { realtimeDb } = await getFirebaseServices();
      
      const userTasksRef = ref(realtimeDb, `userTasks/${userId}`);
      
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
        } catch (callbackError) {
          console.error(`[RealtimeListener] User tasks callback error for ${userId}:`, callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error(`[RealtimeListener] User tasks subscription error for ${userId}:`, error);
        if (opts.onError) {
          opts.onError(error);
        }
        
        if (opts.retryOnError && retryCount < (opts.maxRetries || 3)) {
          retryCount++;
          console.log(`[RealtimeListener] Retrying user tasks subscription ${retryCount}/${opts.maxRetries}`);
          setTimeout(createListener, opts.retryDelay || 2000);
        }
      });
      
      const unsubscribeFn = () => {
        off(userTasksRef, 'value', unsubscribe);
        listenerManager.remove(listenerId);
        console.log(`[RealtimeListener] Unsubscribed from user tasks for ${userId}`);
      };
      
      listenerManager.add(listenerId, unsubscribeFn);
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create user tasks listener for ${userId}:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
    }
  };
  
  createListener();
  
  return () => {
    listenerManager.remove(listenerId);
  };
}

/**
 * Dashboard data subscription (combines user, tasks, and user tasks)
 */
export function subscribeToDashboardData(
  userId: string,
  callback: (data: {
    user: User | null;
    tasks: Task[];
    userTasks: UserTask[];
  }) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  let user: User | null = null;
  let tasks: Task[] = [];
  let userTasks: UserTask[] = [];
  
  const updateCallback = () => {
    callback({ user, tasks, userTasks });
  };
  
  // Subscribe to all data sources
  const unsubscribeUser = subscribeToUser(userId, (userData) => {
    user = userData;
    updateCallback();
  }, options);
  
  const unsubscribeTasks = subscribeToTasks((tasksData) => {
    tasks = tasksData;
    updateCallback();
  }, options);
  
  const unsubscribeUserTasks = subscribeToUserTasks(userId, (userTasksData) => {
    userTasks = userTasksData;
    updateCallback();
  }, options);
  
  return () => {
    unsubscribeUser();
    unsubscribeTasks();
    unsubscribeUserTasks();
  };
}

const realtimeListeners = {
  subscribeToUser,
  subscribeToUserWithdrawals,
  subscribeToTasks,
  subscribeToUserTasks,
  subscribeToDashboardData,
  listenerManager
};

export default realtimeListeners;