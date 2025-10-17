/**
 * React Hook for Real-time Data Synchronization
 * 
 * Provides easy-to-use hooks for real-time data with localStorage fallback
 * and optimistic updates for instant UI responses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Task, WithdrawalRequest, AdminSettings } from '@/types';
import {
  subscribeToUserData,
  subscribeToAllUsers,
  subscribeToTasks,
  subscribeToWithdrawals,
  updateUserData as syncUpdateUserData,
  updateWithdrawalStatus as syncUpdateWithdrawalStatus,
  createTask as syncCreateTask,
  getSyncState
} from '@/lib/realtimeSyncManager';

interface UseRealtimeDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSyncTime: number;
}

interface UseRealtimeArrayState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSyncTime: number;
}

/**
 * Hook for subscribing to a single user's data with real-time updates
 */
export function useUserData(userId: string | null): UseRealtimeDataState<User> & {
  updateUser: (updateData: Partial<User>) => Promise<void>;
  refreshUser: () => void;
} {
  const [state, setState] = useState<UseRealtimeDataState<User>>({
    data: null,
    isLoading: true,
    error: null,
    isOnline: navigator.onLine,
    lastSyncTime: 0
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, data: null, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Subscribe to user data
    const unsubscribe = subscribeToUserData(userId, (user) => {
      const syncState = getSyncState();
      setState(prev => ({
        ...prev,
        data: user,
        isLoading: false,
        error: null,
        isOnline: syncState.isOnline,
        lastSyncTime: syncState.lastSyncTime
      }));
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId]);

  // Update user data with optimistic updates
  const updateUser = useCallback(async (updateData: Partial<User>) => {
    if (!userId) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      await syncUpdateUserData(userId, updateData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [userId]);

  // Refresh user data
  const refreshUser = useCallback(() => {
    if (userId && unsubscribeRef.current) {
      // Re-subscribe to trigger fresh data fetch
      unsubscribeRef.current();
      const unsubscribe = subscribeToUserData(userId, (user) => {
        const syncState = getSyncState();
        setState(prev => ({
          ...prev,
          data: user,
          isOnline: syncState.isOnline,
          lastSyncTime: syncState.lastSyncTime
        }));
      });
      unsubscribeRef.current = unsubscribe;
    }
  }, [userId]);

  return {
    ...state,
    updateUser,
    refreshUser
  };
}

/**
 * Hook for subscribing to all users data (admin panel)
 */
export function useAllUsers(): UseRealtimeArrayState<User> & {
  updateUser: (userId: string, updateData: Partial<User>) => Promise<void>;
  refreshUsers: () => void;
} {
  const [state, setState] = useState<UseRealtimeArrayState<User>>({
    data: [],
    isLoading: true,
    error: null,
    isOnline: navigator.onLine,
    lastSyncTime: 0
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Subscribe to all users data
    const unsubscribe = subscribeToAllUsers((users) => {
      const syncState = getSyncState();
      setState(prev => ({
        ...prev,
        data: users,
        isLoading: false,
        error: null,
        isOnline: syncState.isOnline,
        lastSyncTime: syncState.lastSyncTime
      }));
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Update specific user data
  const updateUser = useCallback(async (userId: string, updateData: Partial<User>) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await syncUpdateUserData(userId, updateData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Refresh all users data
  const refreshUsers = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      const unsubscribe = subscribeToAllUsers((users) => {
        const syncState = getSyncState();
        setState(prev => ({
          ...prev,
          data: users,
          isOnline: syncState.isOnline,
          lastSyncTime: syncState.lastSyncTime
        }));
      });
      unsubscribeRef.current = unsubscribe;
    }
  }, []);

  return {
    ...state,
    updateUser,
    refreshUsers
  };
}

/**
 * Hook for subscribing to tasks data
 */
export function useTasks(): UseRealtimeArrayState<Task> & {
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  refreshTasks: () => void;
} {
  const [state, setState] = useState<UseRealtimeArrayState<Task>>({
    data: [],
    isLoading: true,
    error: null,
    isOnline: navigator.onLine,
    lastSyncTime: 0
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Subscribe to tasks data
    const unsubscribe = subscribeToTasks((tasks) => {
      const syncState = getSyncState();
      setState(prev => ({
        ...prev,
        data: tasks,
        isLoading: false,
        error: null,
        isOnline: syncState.isOnline,
        lastSyncTime: syncState.lastSyncTime
      }));
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Create new task
  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return await syncCreateTask(taskData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Refresh tasks data
  const refreshTasks = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      const unsubscribe = subscribeToTasks((tasks) => {
        const syncState = getSyncState();
        setState(prev => ({
          ...prev,
          data: tasks,
          isOnline: syncState.isOnline,
          lastSyncTime: syncState.lastSyncTime
        }));
      });
      unsubscribeRef.current = unsubscribe;
    }
  }, []);

  return {
    ...state,
    createTask,
    refreshTasks
  };
}

/**
 * Hook for subscribing to withdrawal requests (admin panel)
 */
export function useWithdrawals(): UseRealtimeArrayState<WithdrawalRequest> & {
  updateWithdrawalStatus: (
    withdrawalId: string,
    status: 'pending' | 'approved' | 'rejected' | 'paid',
    adminNotes?: string
  ) => Promise<void>;
  refreshWithdrawals: () => void;
} {
  const [state, setState] = useState<UseRealtimeArrayState<WithdrawalRequest>>({
    data: [],
    isLoading: true,
    error: null,
    isOnline: navigator.onLine,
    lastSyncTime: 0
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Subscribe to withdrawals data
    const unsubscribe = subscribeToWithdrawals((withdrawals) => {
      const syncState = getSyncState();
      setState(prev => ({
        ...prev,
        data: withdrawals,
        isLoading: false,
        error: null,
        isOnline: syncState.isOnline,
        lastSyncTime: syncState.lastSyncTime
      }));
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Update withdrawal status
  const updateWithdrawalStatus = useCallback(async (
    withdrawalId: string,
    status: 'pending' | 'approved' | 'rejected' | 'paid',
    adminNotes?: string
  ) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await syncUpdateWithdrawalStatus(withdrawalId, status, adminNotes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update withdrawal status';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Refresh withdrawals data
  const refreshWithdrawals = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      const unsubscribe = subscribeToWithdrawals((withdrawals) => {
        const syncState = getSyncState();
        setState(prev => ({
          ...prev,
          data: withdrawals,
          isOnline: syncState.isOnline,
          lastSyncTime: syncState.lastSyncTime
        }));
      });
      unsubscribeRef.current = unsubscribe;
    }
  }, []);

  return {
    ...state,
    updateWithdrawalStatus,
    refreshWithdrawals
  };
}

/**
 * Hook for monitoring sync status
 */
export function useSyncStatus() {
  const [syncState, setSyncState] = useState(() => getSyncState());

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncState(getSyncState());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  return {
    isOnline: syncState.isOnline,
    lastSyncTime: syncState.lastSyncTime,
    syncErrors: syncState.syncErrors,
    activeListeners: syncState.activeListeners,
    timeSinceLastSync: Date.now() - syncState.lastSyncTime
  };
}

/**
 * Hook for optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalDataRef = useRef<T>(initialData);

  useEffect(() => {
    setData(initialData);
    originalDataRef.current = initialData;
  }, [initialData]);

  const update = useCallback(async (optimisticData: T) => {
    setIsUpdating(true);
    setError(null);
    
    // Apply optimistic update immediately
    setData(optimisticData);
    
    try {
      const result = await updateFn(optimisticData);
      setData(result);
      originalDataRef.current = result;
    } catch (err) {
      // Rollback on error
      setData(originalDataRef.current);
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [updateFn]);

  return {
    data,
    isUpdating,
    error,
    update
  };
}

export default {
  useUserData,
  useAllUsers,
  useTasks,
  useWithdrawals,
  useSyncStatus,
  useOptimisticUpdate
};