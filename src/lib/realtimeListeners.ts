/**
 * Real-time Firebase Listeners Service
 * 
 * Enhanced with Firebase Connection Manager for better reliability
 * and Telegram WebApp lifecycle integration with auto-reconnection.
 */

import { 
  onSnapshot, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  Unsubscribe 
} from 'firebase/firestore';
import { 
  ref, 
  onValue, 
  off, 
  DatabaseReference 
} from 'firebase/database';
import { getFirebaseServices, isFirebaseInitialized, reconnectFirebaseServices } from './firebaseSingleton';
import { User, WithdrawalRequest, Task, UserTask } from '@/types';

export interface RealtimeListenerOptions {
  onError?: (error: Error) => void;
  retryOnError?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

const DEFAULT_OPTIONS: RealtimeListenerOptions = {
  onError: (error) => console.error('[RealtimeListener] Error:', error),
  retryOnError: true,
  retryDelay: 2000,
  maxRetries: 3
};

/**
 * Enhanced listener manager with connection recovery
 */
class ListenerManager {
  private listeners: Map<string, () => void> = new Map();
  private listenerCallbacks: Map<string, { callback: Function; options: RealtimeListenerOptions }> = new Map();
  private isReconnecting = false;
  
  constructor() {
    // Listen for Telegram WebApp lifecycle events
    if (typeof window !== 'undefined') {
      window.addEventListener('telegramWebAppResume', this.handleAppResume.bind(this));
      window.addEventListener('online', this.handleNetworkOnline.bind(this));
    }
  }

  /**
   * Handle app resume - reconnect all listeners
   */
  private async handleAppResume(): Promise<void> {
    try {
      if (this.isReconnecting) return;
      
      console.log('[ListenerManager] App resumed, checking listener connections...');
      this.isReconnecting = true;

      // Wait for Firebase to be ready
      if (!isFirebaseInitialized()) {
        console.log('[ListenerManager] Firebase not ready, triggering reconnection...');
        await reconnectFirebaseServices();
      }

      // Reconnect all listeners after a short delay
      setTimeout(() => {
        this.reconnectAllListeners();
        this.isReconnecting = false;
      }, 1000);

    } catch (error) {
      console.error('[ListenerManager] Error handling app resume:', error);
      this.isReconnecting = false;
    }
  }

  /**
   * Handle network online - reconnect listeners
   */
  private async handleNetworkOnline(): Promise<void> {
    try {
      if (this.isReconnecting) return;
      
      console.log('[ListenerManager] Network online, reconnecting listeners...');
      this.isReconnecting = true;

      // Trigger Firebase reconnection
      await reconnectFirebaseServices();
      
      // Reconnect listeners
      setTimeout(() => {
        this.reconnectAllListeners();
        this.isReconnecting = false;
      }, 2000);

    } catch (error) {
      console.error('[ListenerManager] Error handling network online:', error);
      this.isReconnecting = false;
    }
  }

  /**
   * Reconnect all active listeners
   */
  private reconnectAllListeners(): void {
    console.log(`[ListenerManager] Reconnecting ${this.listenerCallbacks.size} listeners...`);
    
    this.listenerCallbacks.forEach(({ callback, options }, id) => {
      try {
        // Remove old listener
        this.remove(id);
        
        // Re-establish listener
        setTimeout(() => {
          try {
            callback();
          } catch (error) {
            console.error(`[ListenerManager] Error reconnecting listener ${id}:`, error);
          }
        }, 500);
        
      } catch (error) {
        console.error(`[ListenerManager] Error reconnecting listener ${id}:`, error);
      }
    });
  }
  
  add(id: string, unsubscribe: () => void, callback?: Function, options?: RealtimeListenerOptions) {
    // Clean up existing listener if any
    const existing = this.listeners.get(id);
    if (existing) {
      existing();
    }
    
    this.listeners.set(id, unsubscribe);
    
    // Store callback for reconnection
    if (callback) {
      this.listenerCallbacks.set(id, { callback, options: options || DEFAULT_OPTIONS });
    }
  }
  
  remove(id: string) {
    const unsubscribe = this.listeners.get(id);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(id);
    }
    
    // Remove callback reference
    this.listenerCallbacks.delete(id);
  }
  
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.listenerCallbacks.clear();
  }
  
  getActiveCount(): number {
    return this.listeners.size;
  }
}

export const listenerManager = new ListenerManager();

/**
 * Converts Firestore timestamp to Date safely
 */
function safeTimestampToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
  }
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  return new Date();
}

/**
 * Sanitizes user data from Firebase
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
 * Real-time user data listener with enhanced reconnection
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
      
      // Check Firebase connection status
      if (!isFirebaseInitialized()) {
        console.log('[RealtimeListener] Firebase not initialized, waiting...');
        await reconnectFirebaseServices();
      }
      
      const { db, realtimeDb } = await getFirebaseServices();
      
      // Primary listener: Realtime Database (for faster updates)
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
      
      // Fallback listener: Firestore (for data consistency)
      const firestoreUserRef = doc(db, 'telegram_users', userId);
      
      const firestoreUnsubscribe = onSnapshot(firestoreUserRef, (docSnapshot) => {
        try {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const user = sanitizeUserData(userData, userId);
            console.log(`[RealtimeListener] Firestore update for user ${userId}`);
            // Only call callback if we don't have realtime data to avoid duplicate calls
            // This is a fallback mechanism
          }
        } catch (callbackError) {
          console.error(`[RealtimeListener] Firestore callback error for user ${userId}:`, callbackError);
        }
      }, (error) => {
        console.error(`[RealtimeListener] Firestore error for user ${userId}:`, error);
      });
      
      // Combined unsubscribe function
      const combinedUnsubscribe = () => {
        off(realtimeUserRef, 'value', realtimeUnsubscribe);
        firestoreUnsubscribe();
        listenerManager.remove(listenerId);
        console.log(`[RealtimeListener] Unsubscribed from user ${userId}`);
      };
      
      listenerManager.add(listenerId, combinedUnsubscribe, createListener, opts);
      return combinedUnsubscribe;
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create user listener for ${userId}:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
      
      // Retry logic for connection failures
      if (opts.retryOnError && retryCount < (opts.maxRetries || 3)) {
        retryCount++;
        console.log(`[RealtimeListener] Retrying user listener creation (${retryCount}/${opts.maxRetries})`);
        setTimeout(createListener, opts.retryDelay || 2000);
      }
      
      // Return empty unsubscribe function
      return () => {};
    }
  };
  
  createListener();
  
  // Return unsubscribe function
  return () => {
    listenerManager.remove(listenerId);
  };
}

/**
 * Real-time withdrawals listener for a specific user
 */
export function subscribeToUserWithdrawals(
  userId: string,
  callback: (withdrawals: WithdrawalRequest[]) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const listenerId = `withdrawals_${userId}`;
  
  const createListener = async () => {
    try {
      console.log(`[RealtimeListener] Setting up withdrawals subscription for ${userId}`);
      
      const { db } = await getFirebaseServices();
      
      // Query withdrawals for this user
      const withdrawalsQuery = query(
        collection(db, 'withdrawals'),
        where('userId', '==', userId),
        orderBy('requestedAt', 'desc'),
        limit(20) // Limit to last 20 withdrawals
      );
      
      const unsubscribe = onSnapshot(withdrawalsQuery, (querySnapshot) => {
        try {
          const withdrawals: WithdrawalRequest[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const withdrawal: WithdrawalRequest = {
              id: doc.id,
              userId: data.userId,
              amount: data.amount || 0,
              upiId: data.upiId || '',
              status: data.status || 'pending',
              requestedAt: safeTimestampToDate(data.requestedAt),
              processedAt: data.processedAt ? safeTimestampToDate(data.processedAt) : undefined,
              adminNotes: data.adminNotes || undefined
            };
            
            withdrawals.push(withdrawal);
          });
          
          console.log(`[RealtimeListener] Withdrawals update for user ${userId}: ${withdrawals.length} items`);
          callback(withdrawals);
          
        } catch (callbackError) {
          console.error(`[RealtimeListener] Withdrawals callback error for user ${userId}:`, callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error(`[RealtimeListener] Withdrawals query error for user ${userId}:`, error);
        if (opts.onError) {
          opts.onError(error);
        }
      });
      
      listenerManager.add(listenerId, unsubscribe);
      return unsubscribe;
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create withdrawals listener for ${userId}:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
      
      return () => {};
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
  const listenerId = 'tasks';
  
  const createListener = async () => {
    try {
      console.log('[RealtimeListener] Setting up tasks subscription');
      
      const { realtimeDb } = await getFirebaseServices();
      
      const tasksRef = ref(realtimeDb, 'tasks');
      
      const unsubscribe = onValue(tasksRef, (snapshot) => {
        try {
          const tasks: Task[] = [];
          
          if (snapshot.exists()) {
            const tasksData = snapshot.val();
            Object.keys(tasksData).forEach((taskId) => {
              const taskData = tasksData[taskId];
              
              if (taskData.isActive) {
                const task: Task = {
                  id: taskId,
                  title: taskData.title || 'Untitled Task',
                  description: taskData.description || '',
                  type: taskData.type || 'link',
                  reward: taskData.reward || 0,
                  url: taskData.url || undefined,
                  isActive: taskData.isActive || false,
                  createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
                  updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date()
                };
                
                tasks.push(task);
              }
            });
          }
          
          // Sort by creation date (newest first)
          tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          console.log(`[RealtimeListener] Tasks update: ${tasks.length} active tasks`);
          callback(tasks);
          
        } catch (callbackError) {
          console.error('[RealtimeListener] Tasks callback error:', callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error('[RealtimeListener] Tasks error:', error);
        if (opts.onError) {
          opts.onError(error);
        }
      });
      
      listenerManager.add(listenerId, () => off(tasksRef, 'value', unsubscribe));
      return () => off(tasksRef, 'value', unsubscribe);
      
    } catch (error) {
      console.error('[RealtimeListener] Failed to create tasks listener:', error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
      
      return () => {};
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
            Object.keys(userTasksData).forEach((taskId) => {
              const taskData = userTasksData[taskId];
              
              const userTask: UserTask = {
                id: taskId,
                userId: userId,
                taskId: taskId,
                status: taskData.status || 'pending',
                completedAt: taskData.completedAt ? new Date(taskData.completedAt) : undefined,
                claimedAt: taskData.claimedAt ? new Date(taskData.claimedAt) : undefined
              };
              
              userTasks.push(userTask);
            });
          }
          
          console.log(`[RealtimeListener] User tasks update for ${userId}: ${userTasks.length} tasks`);
          callback(userTasks);
          
        } catch (callbackError) {
          console.error(`[RealtimeListener] User tasks callback error for ${userId}:`, callbackError);
          if (opts.onError) {
            opts.onError(callbackError as Error);
          }
        }
      }, (error) => {
        console.error(`[RealtimeListener] User tasks error for ${userId}:`, error);
        if (opts.onError) {
          opts.onError(error);
        }
      });
      
      listenerManager.add(listenerId, () => off(userTasksRef, 'value', unsubscribe));
      return () => off(userTasksRef, 'value', unsubscribe);
      
    } catch (error) {
      console.error(`[RealtimeListener] Failed to create user tasks listener for ${userId}:`, error);
      if (opts.onError) {
        opts.onError(error as Error);
      }
      
      return () => {};
    }
  };
  
  createListener();
  
  return () => {
    listenerManager.remove(listenerId);
  };
}

/**
 * Combined real-time dashboard listener
 * Subscribes to user data, tasks, user tasks, and withdrawals
 */
export function subscribeToDashboardData(
  userId: string,
  callback: (data: {
    user: User | null;
    tasks: Task[];
    userTasks: UserTask[];
    withdrawals: WithdrawalRequest[];
  }) => void,
  options: RealtimeListenerOptions = {}
): () => void {
  let user: User | null = null;
  let tasks: Task[] = [];
  let userTasks: UserTask[] = [];
  let withdrawals: WithdrawalRequest[] = [];
  
  const updateCallback = () => {
    callback({ user, tasks, userTasks, withdrawals });
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
  
  const unsubscribeWithdrawals = subscribeToUserWithdrawals(userId, (withdrawalsData) => {
    withdrawals = withdrawalsData;
    updateCallback();
  }, options);
  
  // Return combined unsubscribe function
  return () => {
    unsubscribeUser();
    unsubscribeTasks();
    unsubscribeUserTasks();
    unsubscribeWithdrawals();
  };
}

/**
 * Cleanup all active listeners
 */
export function cleanupAllListeners(): void {
  console.log(`[RealtimeListener] Cleaning up ${listenerManager.getActiveCount()} active listeners`);
  listenerManager.cleanup();
}

/**
 * Get active listeners count (for debugging)
 */
export function getActiveListenersCount(): number {
  return listenerManager.getActiveCount();
}