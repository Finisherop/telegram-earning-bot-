/**
 * Real-time Synchronization Manager
 * 
 * Ensures perfect synchronization between Admin Panel and User Panel
 * with localStorage fallback and instant UI updates
 */

import { User, Task, UserTask, WithdrawalRequest, AdminSettings } from '@/types';
import { realtimeDb } from './firebase';
import { ref, onValue, off, set, update, push, get, Database } from 'firebase/database';

interface SyncListener<T> {
  callback: (data: T) => void;
  unsubscribe: () => void;
}

interface SyncState {
  isOnline: boolean;
  lastSyncTime: number;
  syncErrors: string[];
  activeListeners: number;
}

class RealtimeSyncManager {
  private static instance: RealtimeSyncManager;
  private listeners: Map<string, SyncListener<any>> = new Map();
  private syncState: SyncState = {
    isOnline: navigator.onLine,
    lastSyncTime: Date.now(),
    syncErrors: [],
    activeListeners: 0
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupNetworkListeners();
      this.setupVisibilityListeners();
    }
  }

  public static getInstance(): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager();
    }
    return RealtimeSyncManager.instance;
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[RealtimeSync] Network online - resuming sync');
      this.syncState.isOnline = true;
      this.resyncAll();
    });

    window.addEventListener('offline', () => {
      console.log('[RealtimeSync] Network offline - using localStorage fallback');
      this.syncState.isOnline = false;
    });
  }

  /**
   * Setup visibility change listeners for tab switching
   */
  private setupVisibilityListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.syncState.isOnline) {
        console.log('[RealtimeSync] Tab visible - refreshing data');
        this.resyncAll();
      }
    });
  }

  /**
   * Subscribe to user data with real-time updates and localStorage fallback
   */
  public subscribeToUserData(
    userId: string,
    callback: (user: User | null) => void
  ): () => void {
    const listenerId = `user_${userId}`;
    
    // Check localStorage first
    const cachedUser = this.getUserFromLocalStorage(userId);
    if (cachedUser) {
      callback(cachedUser);
    }

    if (!realtimeDb) {
      console.warn('[RealtimeSync] Database not available, using localStorage only');
      return () => {};
    }

    const userRef = ref(realtimeDb, `telegram_users/${userId}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const user: User = this.deserializeUser({ ...userData, id: userId });
          
          // Update localStorage immediately
          this.saveUserToLocalStorage(userId, user);
          
          // Notify callback
          callback(user);
          
          this.syncState.lastSyncTime = Date.now();
        } else {
          callback(null);
        }
      } catch (error) {
        console.error(`[RealtimeSync] User subscription error for ${userId}:`, error);
        this.handleSyncError(error as Error);
        
        // Fallback to localStorage
        const fallbackUser = this.getUserFromLocalStorage(userId);
        callback(fallbackUser);
      }
    }, (error) => {
      console.error(`[RealtimeSync] User subscription failed for ${userId}:`, error);
      this.handleSyncError(error);
      
      // Fallback to localStorage
      const fallbackUser = this.getUserFromLocalStorage(userId);
      callback(fallbackUser);
    });

    // Store listener for cleanup
    this.listeners.set(listenerId, {
      callback,
      unsubscribe: () => off(userRef, 'value', unsubscribe)
    });
    
    this.syncState.activeListeners++;

    return () => {
      const listener = this.listeners.get(listenerId);
      if (listener) {
        listener.unsubscribe();
        this.listeners.delete(listenerId);
        this.syncState.activeListeners--;
      }
    };
  }

  /**
   * Subscribe to all users data (for admin panel)
   */
  public subscribeToAllUsers(
    callback: (users: User[]) => void
  ): () => void {
    const listenerId = 'all_users';
    
    // Check localStorage first
    const cachedUsers = this.getAllUsersFromLocalStorage();
    if (cachedUsers.length > 0) {
      callback(cachedUsers);
    }

    if (!realtimeDb) {
      console.warn('[RealtimeSync] Database not available, using localStorage only');
      return () => {};
    }

    const usersRef = ref(realtimeDb, 'telegram_users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      try {
        const users: User[] = [];
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
            if (userData && typeof userData === 'object') {
              const user = this.deserializeUser({ ...userData, id: userId });
              users.push(user);
              
              // Update individual user in localStorage
              this.saveUserToLocalStorage(userId, user);
            }
          });
        }
        
        // Save all users to localStorage
        this.saveAllUsersToLocalStorage(users);
        
        callback(users);
        this.syncState.lastSyncTime = Date.now();
      } catch (error) {
        console.error('[RealtimeSync] All users subscription error:', error);
        this.handleSyncError(error as Error);
        
        // Fallback to localStorage
        const fallbackUsers = this.getAllUsersFromLocalStorage();
        callback(fallbackUsers);
      }
    }, (error) => {
      console.error('[RealtimeSync] All users subscription failed:', error);
      this.handleSyncError(error);
      
      // Fallback to localStorage
      const fallbackUsers = this.getAllUsersFromLocalStorage();
      callback(fallbackUsers);
    });

    this.listeners.set(listenerId, {
      callback,
      unsubscribe: () => off(usersRef, 'value', unsubscribe)
    });
    
    this.syncState.activeListeners++;

    return () => {
      const listener = this.listeners.get(listenerId);
      if (listener) {
        listener.unsubscribe();
        this.listeners.delete(listenerId);
        this.syncState.activeListeners--;
      }
    };
  }

  /**
   * Subscribe to tasks with real-time updates
   */
  public subscribeToTasks(
    callback: (tasks: Task[]) => void
  ): () => void {
    const listenerId = 'tasks';
    
    // Check localStorage first
    const cachedTasks = this.getTasksFromLocalStorage();
    if (cachedTasks.length > 0) {
      callback(cachedTasks);
    }

    if (!realtimeDb) {
      console.warn('[RealtimeSync] Database not available, using localStorage only');
      return () => {};
    }

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
                type: taskData.type || 'link',
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
        
        // Save to localStorage
        this.saveTasksToLocalStorage(tasks);
        
        callback(tasks);
        this.syncState.lastSyncTime = Date.now();
      } catch (error) {
        console.error('[RealtimeSync] Tasks subscription error:', error);
        this.handleSyncError(error as Error);
        
        // Fallback to localStorage
        const fallbackTasks = this.getTasksFromLocalStorage();
        callback(fallbackTasks);
      }
    }, (error) => {
      console.error('[RealtimeSync] Tasks subscription failed:', error);
      this.handleSyncError(error);
      
      // Fallback to localStorage
      const fallbackTasks = this.getTasksFromLocalStorage();
      callback(fallbackTasks);
    });

    this.listeners.set(listenerId, {
      callback,
      unsubscribe: () => off(tasksRef, 'value', unsubscribe)
    });
    
    this.syncState.activeListeners++;

    return () => {
      const listener = this.listeners.get(listenerId);
      if (listener) {
        listener.unsubscribe();
        this.listeners.delete(listenerId);
        this.syncState.activeListeners--;
      }
    };
  }

  /**
   * Subscribe to withdrawal requests (admin panel)
   */
  public subscribeToWithdrawals(
    callback: (withdrawals: WithdrawalRequest[]) => void
  ): () => void {
    const listenerId = 'withdrawals';
    
    // Check localStorage first
    const cachedWithdrawals = this.getWithdrawalsFromLocalStorage();
    if (cachedWithdrawals.length > 0) {
      callback(cachedWithdrawals);
    }

    if (!realtimeDb) {
      console.warn('[RealtimeSync] Database not available, using localStorage only');
      return () => {};
    }

    const withdrawalsRef = ref(realtimeDb, 'withdrawals');
    
    const unsubscribe = onValue(withdrawalsRef, (snapshot) => {
      try {
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
        
        // Save to localStorage
        this.saveWithdrawalsToLocalStorage(withdrawals);
        
        callback(withdrawals);
        this.syncState.lastSyncTime = Date.now();
      } catch (error) {
        console.error('[RealtimeSync] Withdrawals subscription error:', error);
        this.handleSyncError(error as Error);
        
        // Fallback to localStorage
        const fallbackWithdrawals = this.getWithdrawalsFromLocalStorage();
        callback(fallbackWithdrawals);
      }
    }, (error) => {
      console.error('[RealtimeSync] Withdrawals subscription failed:', error);
      this.handleSyncError(error);
      
      // Fallback to localStorage
      const fallbackWithdrawals = this.getWithdrawalsFromLocalStorage();
      callback(fallbackWithdrawals);
    });

    this.listeners.set(listenerId, {
      callback,
      unsubscribe: () => off(withdrawalsRef, 'value', unsubscribe)
    });
    
    this.syncState.activeListeners++;

    return () => {
      const listener = this.listeners.get(listenerId);
      if (listener) {
        listener.unsubscribe();
        this.listeners.delete(listenerId);
        this.syncState.activeListeners--;
      }
    };
  }

  /**
   * Update user data with instant UI update and Firebase sync
   */
  public async updateUserData(
    userId: string,
    updateData: Partial<User>,
    optimisticUpdate: boolean = true
  ): Promise<User | null> {
    try {
      // Get current user data
      let currentUser = this.getUserFromLocalStorage(userId);
      
      if (!currentUser && realtimeDb) {
        const userRef = ref(realtimeDb, `telegram_users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          currentUser = this.deserializeUser({ ...snapshot.val(), id: userId });
        }
      }

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Apply optimistic update for instant UI
      if (optimisticUpdate) {
        const optimisticUser = {
          ...currentUser,
          ...updateData,
          updatedAt: new Date()
        };
        
        this.saveUserToLocalStorage(userId, optimisticUser);
        
        // Notify all listeners immediately
        const listener = this.listeners.get(`user_${userId}`);
        if (listener) {
          listener.callback(optimisticUser);
        }
        
        // Also notify all users listener for admin panel
        const allUsersListener = this.listeners.get('all_users');
        if (allUsersListener) {
          const allUsers = this.getAllUsersFromLocalStorage();
          const updatedUsers = allUsers.map(u => u.id === userId ? optimisticUser : u);
          allUsersListener.callback(updatedUsers);
        }
      }

      // Sync to Firebase
      if (realtimeDb) {
        const userRef = ref(realtimeDb, `telegram_users/${userId}`);
        const sanitizedData = this.sanitizeForFirebase(updateData);
        sanitizedData.updatedAt = new Date().toISOString();
        
        await update(userRef, sanitizedData);
        console.log(`[RealtimeSync] User ${userId} updated in Firebase`);
      }

      return currentUser;
    } catch (error) {
      console.error('[RealtimeSync] Error updating user:', error);
      this.handleSyncError(error as Error);
      
      // Revert optimistic update on error
      if (optimisticUpdate) {
        const originalUser = this.getUserFromLocalStorage(userId);
        if (originalUser) {
          const listener = this.listeners.get(`user_${userId}`);
          if (listener) {
            listener.callback(originalUser);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Update withdrawal status (admin action)
   */
  public async updateWithdrawalStatus(
    withdrawalId: string,
    status: 'pending' | 'approved' | 'rejected' | 'paid',
    adminNotes?: string
  ): Promise<void> {
    try {
      if (realtimeDb) {
        const withdrawalRef = ref(realtimeDb, `withdrawals/${withdrawalId}`);
        await update(withdrawalRef, {
          status,
          processedAt: new Date().toISOString(),
          adminNotes: adminNotes || undefined
        });
        
        console.log(`[RealtimeSync] Withdrawal ${withdrawalId} status updated to ${status}`);
      }
    } catch (error) {
      console.error('[RealtimeSync] Error updating withdrawal status:', error);
      this.handleSyncError(error as Error);
      throw error;
    }
  }

  /**
   * Create new task (admin action)
   */
  public async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!realtimeDb) {
        throw new Error('Database not available');
      }

      const tasksRef = ref(realtimeDb, 'tasks');
      const newTaskRef = push(tasksRef);
      
      const now = new Date().toISOString();
      const task = {
        ...taskData,
        createdAt: now,
        updatedAt: now
      };
      
      await set(newTaskRef, task);
      
      console.log('[RealtimeSync] New task created:', newTaskRef.key);
      return newTaskRef.key!;
    } catch (error) {
      console.error('[RealtimeSync] Error creating task:', error);
      this.handleSyncError(error as Error);
      throw error;
    }
  }

  /**
   * Resync all active listeners
   */
  private resyncAll(): void {
    console.log(`[RealtimeSync] Resyncing ${this.listeners.size} active listeners`);
    // Firebase listeners will automatically resync when connection is restored
    this.syncState.lastSyncTime = Date.now();
  }

  /**
   * Handle sync errors
   */
  private handleSyncError(error: Error): void {
    this.syncState.syncErrors.push(`${new Date().toISOString()}: ${error.message}`);
    
    // Keep only last 10 errors
    if (this.syncState.syncErrors.length > 10) {
      this.syncState.syncErrors = this.syncState.syncErrors.slice(-10);
    }
  }

  /**
   * LocalStorage helper methods
   */
  private getUserFromLocalStorage(userId: string): User | null {
    try {
      const data = localStorage.getItem(`user_${userId}`);
      if (data) {
        const userData = JSON.parse(data);
        return this.deserializeUser(userData);
      }
    } catch (error) {
      console.error('[RealtimeSync] Error reading user from localStorage:', error);
    }
    return null;
  }

  private saveUserToLocalStorage(userId: string, user: User): void {
    try {
      const serializedUser = this.serializeUser(user);
      localStorage.setItem(`user_${userId}`, JSON.stringify(serializedUser));
    } catch (error) {
      console.error('[RealtimeSync] Error saving user to localStorage:', error);
    }
  }

  private getAllUsersFromLocalStorage(): User[] {
    try {
      const data = localStorage.getItem('all_users');
      if (data) {
        const usersData = JSON.parse(data);
        return usersData.map((userData: any) => this.deserializeUser(userData));
      }
    } catch (error) {
      console.error('[RealtimeSync] Error reading all users from localStorage:', error);
    }
    return [];
  }

  private saveAllUsersToLocalStorage(users: User[]): void {
    try {
      const serializedUsers = users.map(user => this.serializeUser(user));
      localStorage.setItem('all_users', JSON.stringify(serializedUsers));
    } catch (error) {
      console.error('[RealtimeSync] Error saving all users to localStorage:', error);
    }
  }

  private getTasksFromLocalStorage(): Task[] {
    try {
      const data = localStorage.getItem('tasks');
      if (data) {
        const tasksData = JSON.parse(data);
        return tasksData.map((taskData: any) => ({
          ...taskData,
          createdAt: new Date(taskData.createdAt),
          updatedAt: new Date(taskData.updatedAt)
        }));
      }
    } catch (error) {
      console.error('[RealtimeSync] Error reading tasks from localStorage:', error);
    }
    return [];
  }

  private saveTasksToLocalStorage(tasks: Task[]): void {
    try {
      const serializedTasks = tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      }));
      localStorage.setItem('tasks', JSON.stringify(serializedTasks));
    } catch (error) {
      console.error('[RealtimeSync] Error saving tasks to localStorage:', error);
    }
  }

  private getWithdrawalsFromLocalStorage(): WithdrawalRequest[] {
    try {
      const data = localStorage.getItem('withdrawals');
      if (data) {
        const withdrawalsData = JSON.parse(data);
        return withdrawalsData.map((withdrawalData: any) => ({
          ...withdrawalData,
          requestedAt: new Date(withdrawalData.requestedAt),
          processedAt: withdrawalData.processedAt ? new Date(withdrawalData.processedAt) : undefined
        }));
      }
    } catch (error) {
      console.error('[RealtimeSync] Error reading withdrawals from localStorage:', error);
    }
    return [];
  }

  private saveWithdrawalsToLocalStorage(withdrawals: WithdrawalRequest[]): void {
    try {
      const serializedWithdrawals = withdrawals.map(withdrawal => ({
        ...withdrawal,
        requestedAt: withdrawal.requestedAt.toISOString(),
        processedAt: withdrawal.processedAt?.toISOString()
      }));
      localStorage.setItem('withdrawals', JSON.stringify(serializedWithdrawals));
    } catch (error) {
      console.error('[RealtimeSync] Error saving withdrawals to localStorage:', error);
    }
  }

  /**
   * Serialize/deserialize helper methods
   */
  private serializeUser(user: User): any {
    return {
      ...user,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      lastClaimDate: user.lastClaimDate?.toISOString(),
      farmingStartTime: user.farmingStartTime?.toISOString(),
      farmingEndTime: user.farmingEndTime?.toISOString(),
      vipEndTime: user.vipEndTime?.toISOString(),
    };
  }

  private deserializeUser(userData: any): User {
    return {
      ...userData,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
      lastClaimDate: userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
      farmingStartTime: userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
      farmingEndTime: userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
      vipEndTime: userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
    };
  }

  private sanitizeForFirebase(data: any): any {
    const sanitized: any = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined) {
        return; // Skip undefined values
      }
      
      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'string') {
        sanitized[key] = value.trim() || '';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Get sync state
   */
  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Cleanup all listeners
   */
  public cleanup(): void {
    console.log(`[RealtimeSync] Cleaning up ${this.listeners.size} listeners`);
    
    this.listeners.forEach((listener) => {
      listener.unsubscribe();
    });
    
    this.listeners.clear();
    this.syncState.activeListeners = 0;
  }
}

// Export singleton instance
export const realtimeSyncManager = RealtimeSyncManager.getInstance();

// Convenience functions
export function subscribeToUserData(userId: string, callback: (user: User | null) => void): () => void {
  return realtimeSyncManager.subscribeToUserData(userId, callback);
}

export function subscribeToAllUsers(callback: (users: User[]) => void): () => void {
  return realtimeSyncManager.subscribeToAllUsers(callback);
}

export function subscribeToTasks(callback: (tasks: Task[]) => void): () => void {
  return realtimeSyncManager.subscribeToTasks(callback);
}

export function subscribeToWithdrawals(callback: (withdrawals: WithdrawalRequest[]) => void): () => void {
  return realtimeSyncManager.subscribeToWithdrawals(callback);
}

export function updateUserData(userId: string, updateData: Partial<User>): Promise<User | null> {
  return realtimeSyncManager.updateUserData(userId, updateData);
}

export function updateWithdrawalStatus(
  withdrawalId: string,
  status: 'pending' | 'approved' | 'rejected' | 'paid',
  adminNotes?: string
): Promise<void> {
  return realtimeSyncManager.updateWithdrawalStatus(withdrawalId, status, adminNotes);
}

export function createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return realtimeSyncManager.createTask(taskData);
}

export function getSyncState(): SyncState {
  return realtimeSyncManager.getSyncState();
}

export function cleanupSync(): void {
  realtimeSyncManager.cleanup();
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeSyncManager.cleanup();
  });
}

export default realtimeSyncManager;