/**
 * useFirebaseReliable Hook
 * 
 * React hook that provides reliable Firebase operations with:
 * - Silent error handling
 * - Offline support
 * - Automatic reconnection
 * - No user-facing errors
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { firebaseReliableService } from '@/lib/firebaseReliableService';
import { User, Task, UserTask, WithdrawalRequest, AdminSettings } from '@/types';

interface ConnectionStatus {
  isOnline: boolean;
  isConnected: boolean;
  mode: 'websocket' | 'longpoll' | 'offline';
  lastConnected: number;
}

interface UseFirebaseReliableReturn {
  // User operations
  user: User | null;
  userLoading: boolean;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
  
  // Task operations
  tasks: Task[];
  userTasks: UserTask[];
  tasksLoading: boolean;
  completeTask: (taskId: string, reward: number) => Promise<boolean>;
  
  // Withdrawal operations
  withdrawals: WithdrawalRequest[];
  withdrawalsLoading: boolean;
  createWithdrawal: (amount: number, upiId: string) => Promise<string | null>;
  updateWithdrawalStatus: (withdrawalId: string, status: 'approved' | 'rejected', adminNotes?: string) => Promise<boolean>;
  
  // Admin operations
  adminSettings: AdminSettings | null;
  updateAdminSettings: (settings: Partial<AdminSettings>) => Promise<boolean>;
  dailyStats: any;
  
  // Connection status
  connectionStatus: ConnectionStatus;
  
  // Utility
  processReferral: (referrerId: string | number, newUserId: string | number, bonus?: number) => Promise<boolean>;
}

export function useFirebaseReliable(telegramId?: string | number): UseFirebaseReliableReturn {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: true,
    isConnected: false,
    mode: 'offline',
    lastConnected: 0
  });

  // Refs for cleanup
  const unsubscribersRef = useRef<(() => void)[]>([]);

  /**
   * Initialize user data
   */
  const initializeUser = useCallback(async () => {
    if (!telegramId) return;

    try {
      setUserLoading(true);
      
      // Get user data (auto-creates if doesn't exist)
      const userData = await firebaseReliableService.getUser(telegramId);
      setUser(userData);
      
      // Subscribe to user updates
      const unsubscribeUser = await firebaseReliableService.subscribeToUser(
        telegramId,
        (updatedUser) => {
          setUser(updatedUser);
        }
      );
      unsubscribersRef.current.push(unsubscribeUser);
      
    } catch (error) {
      // Silent error handling - no user-facing errors
      console.warn('[useFirebaseReliable] User initialization failed silently');
    } finally {
      setUserLoading(false);
    }
  }, [telegramId]);

  /**
   * Initialize tasks data
   */
  const initializeTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      
      // Get tasks
      const tasksData = await firebaseReliableService.getTasks();
      setTasks(tasksData);
      
      // Subscribe to task updates
      const unsubscribeTasks = await firebaseReliableService.subscribeToTasks(
        (updatedTasks) => {
          setTasks(updatedTasks);
        }
      );
      unsubscribersRef.current.push(unsubscribeTasks);
      
      // Get user tasks if user ID available
      if (telegramId) {
        const userTasksData = await firebaseReliableService.getUserTasks(telegramId);
        setUserTasks(userTasksData);
        
        // Subscribe to user task updates
        const unsubscribeUserTasks = await firebaseReliableService.subscribeToUserTasks(
          telegramId,
          (updatedUserTasks) => {
            setUserTasks(updatedUserTasks);
          }
        );
        unsubscribersRef.current.push(unsubscribeUserTasks);
      }
      
    } catch (error) {
      console.warn('[useFirebaseReliable] Tasks initialization failed silently');
    } finally {
      setTasksLoading(false);
    }
  }, [telegramId]);

  /**
   * Initialize withdrawals data
   */
  const initializeWithdrawals = useCallback(async () => {
    try {
      setWithdrawalsLoading(true);
      
      const withdrawalsData = await firebaseReliableService.getWithdrawals(telegramId);
      setWithdrawals(withdrawalsData);
      
    } catch (error) {
      console.warn('[useFirebaseReliable] Withdrawals initialization failed silently');
    } finally {
      setWithdrawalsLoading(false);
    }
  }, [telegramId]);

  /**
   * Initialize admin data
   */
  const initializeAdmin = useCallback(async () => {
    try {
      const [settings, stats] = await Promise.all([
        firebaseReliableService.getAdminSettings(),
        firebaseReliableService.getDailyStats()
      ]);
      
      setAdminSettings(settings);
      setDailyStats(stats);
      
    } catch (error) {
      console.warn('[useFirebaseReliable] Admin initialization failed silently');
    }
  }, []);

  /**
   * Monitor connection status
   */
  const monitorConnection = useCallback(() => {
    const interval = setInterval(() => {
      const status = firebaseReliableService.getConnectionStatus();
      setConnectionStatus(status);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * User operations
   */
  const updateUser = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!telegramId) return false;
    
    try {
      const success = await firebaseReliableService.updateUser(telegramId, updates);
      
      // Optimistic update
      if (success && user) {
        setUser({ ...user, ...updates });
      }
      
      return success;
    } catch (error) {
      console.warn('[useFirebaseReliable] User update failed silently');
      return false;
    }
  }, [telegramId, user]);

  /**
   * Task operations
   */
  const completeTask = useCallback(async (taskId: string, reward: number): Promise<boolean> => {
    if (!telegramId) return false;
    
    try {
      const success = await firebaseReliableService.completeTask(telegramId, taskId, reward);
      
      // Optimistic updates
      if (success) {
        // Update user coins
        if (user) {
          setUser({
            ...user,
            coins: (user.coins || 0) + reward,
            xp: (user.xp || 0) + Math.floor(reward / 10)
          });
        }
        
        // Update user tasks
        const newUserTask: UserTask = {
          id: `${telegramId}_${taskId}`,
          userId: String(telegramId),
          taskId,
          status: 'completed' as const,
          completedAt: new Date()
        };
        
        setUserTasks(prev => [...prev.filter(ut => ut.taskId !== taskId), newUserTask]);
      }
      
      return success;
    } catch (error) {
      console.warn('[useFirebaseReliable] Task completion failed silently');
      return false;
    }
  }, [telegramId, user]);

  /**
   * Withdrawal operations
   */
  const createWithdrawal = useCallback(async (amount: number, upiId: string): Promise<string | null> => {
    if (!telegramId) return null;
    
    try {
      const withdrawalId = await firebaseReliableService.createWithdrawal(telegramId, amount, upiId);
      
      // Refresh withdrawals list
      if (withdrawalId) {
        const updatedWithdrawals = await firebaseReliableService.getWithdrawals(telegramId);
        setWithdrawals(updatedWithdrawals);
      }
      
      return withdrawalId;
    } catch (error) {
      console.warn('[useFirebaseReliable] Withdrawal creation failed silently');
      return null;
    }
  }, [telegramId]);

  const updateWithdrawalStatus = useCallback(async (
    withdrawalId: string, 
    status: 'approved' | 'rejected', 
    adminNotes?: string
  ): Promise<boolean> => {
    try {
      const success = await firebaseReliableService.updateWithdrawalStatus(withdrawalId, status, adminNotes);
      
      // Refresh withdrawals list
      if (success) {
        const updatedWithdrawals = await firebaseReliableService.getWithdrawals();
        setWithdrawals(updatedWithdrawals);
      }
      
      return success;
    } catch (error) {
      console.warn('[useFirebaseReliable] Withdrawal status update failed silently');
      return false;
    }
  }, []);

  /**
   * Admin operations
   */
  const updateAdminSettings = useCallback(async (settings: Partial<AdminSettings>): Promise<boolean> => {
    try {
      const success = await firebaseReliableService.updateAdminSettings(settings);
      
      // Optimistic update
      if (success && adminSettings) {
        setAdminSettings({ ...adminSettings, ...settings });
      }
      
      return success;
    } catch (error) {
      console.warn('[useFirebaseReliable] Admin settings update failed silently');
      return false;
    }
  }, [adminSettings]);

  /**
   * Referral operations
   */
  const processReferral = useCallback(async (
    referrerId: string | number, 
    newUserId: string | number, 
    bonus: number = 100
  ): Promise<boolean> => {
    try {
      return await firebaseReliableService.processReferral(referrerId, newUserId, bonus);
    } catch (error) {
      console.warn('[useFirebaseReliable] Referral processing failed silently');
      return false;
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      await firebaseReliableService.initialize();
      
      // Start connection monitoring
      const stopMonitoring = monitorConnection();
      
      // Initialize data
      await Promise.all([
        initializeUser(),
        initializeTasks(),
        initializeWithdrawals(),
        initializeAdmin()
      ]);
      
      return stopMonitoring;
    };

    const cleanup = initialize();
    
    return () => {
      cleanup.then(stop => stop?.());
      
      // Cleanup subscriptions
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, [initializeUser, initializeTasks, initializeWithdrawals, initializeAdmin, monitorConnection]);

  /**
   * Refresh data when connection is restored
   */
  useEffect(() => {
    if (connectionStatus.isConnected && connectionStatus.mode !== 'offline') {
      // Refresh data silently when connection is restored
      initializeWithdrawals();
      initializeAdmin();
    }
  }, [connectionStatus.isConnected, connectionStatus.mode, initializeWithdrawals, initializeAdmin]);

  return {
    // User operations
    user,
    userLoading,
    updateUser,
    
    // Task operations
    tasks,
    userTasks,
    tasksLoading,
    completeTask,
    
    // Withdrawal operations
    withdrawals,
    withdrawalsLoading,
    createWithdrawal,
    updateWithdrawalStatus,
    
    // Admin operations
    adminSettings,
    updateAdminSettings,
    dailyStats,
    
    // Connection status
    connectionStatus,
    
    // Utility
    processReferral
  };
}

export default useFirebaseReliable;