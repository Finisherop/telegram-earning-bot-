/**
 * Enhanced Main Dashboard Component
 * 
 * Integrates all the new services for safe Telegram user handling,
 * Firebase singleton, atomic operations, and real-time listeners.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Task, UserTask, WithdrawalRequest } from '@/types';
import { 
  getTelegramUserSafe, 
  getUserIdForFirebase,
  getCachedTelegramUser 
} from '@/lib/telegramUserSafe';
import { 
  syncTelegramUserToFirebase,
  autoSyncUserOnAppLoad 
} from '@/lib/telegramUserSync';
import { 
  atomicFarmingClaim,
  atomicDailyClaim,
  atomicTaskClaim 
} from '@/lib/atomicFirebaseService';
import { subscribeToDashboardData } from '@/lib/realtimeListeners';
import { 
  sanitizeForFirebase,
  FirebaseErrorHandler,
  safeAsyncOperation 
} from '@/lib/errorPrevention';
import { TelegramService } from '@/lib/telegram';
import { 
  userDataPersistence, 
  getCachedUser, 
  updateCachedUser, 
  optimisticallyUpdateCoins,
  subscribeToUserCache 
} from '@/lib/userDataPersistence';
import toast from 'react-hot-toast';

interface MainDashboardProps {
  initialUser?: User | null;
}

const MainDashboard = ({ initialUser }: MainDashboardProps) => {
  // State management with safe defaults and cached data
  const [user, setUser] = useState<User | null>(() => {
    // Initialize with cached user data if available, otherwise use initialUser
    const cached = getCachedUser();
    return cached || initialUser || null;
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Farming state
  const [farmingProgress, setFarmingProgress] = useState(0);
  const [isFarming, setIsFarming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [dailyClaimAvailable, setDailyClaimAvailable] = useState(true);
  
  // Operation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * Enhanced user data handler with persistence
   */
  const handleUserDataUpdate = useCallback((userData: User, source: 'firebase' | 'optimistic' = 'firebase') => {
    console.log(`[MainDashboard] Updating user data from ${source}:`, userData);
    
    if (source === 'firebase') {
      // Merge with cached data and update both state and cache
      const mergedUser = userDataPersistence.mergeWithFirebaseData(userData);
      setUser(mergedUser);
    } else {
      // Optimistic update - update state immediately and cache
      setUser(userData);
      updateCachedUser(userData, 'localStorage');
    }
    
    setLastUpdate(new Date());
  }, []);

  /**
   * Subscribe to cached user data changes (for cross-tab synchronization)
   */
  useEffect(() => {
    const unsubscribe = subscribeToUserCache((cacheData) => {
      if (cacheData?.user && cacheData.source === 'firebase') {
        console.log('[MainDashboard] Received cached user update from another tab');
        setUser(cacheData.user);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Initialize user and set up real-time listeners
   */
  const initializeUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[MainDashboard] Starting user initialization...');
      
      // Step 1: Get Telegram user data safely
      const telegramUser = getTelegramUserSafe();
      const userId = getUserIdForFirebase(telegramUser);
      
      if (!userId) {
        throw new Error('Unable to get valid user ID from Telegram');
      }
      
      console.log(`[MainDashboard] Telegram user captured: ${userId} (${telegramUser.source})`);
      
      // Step 2: Auto-sync user data to Firebase
      const syncResult = await safeAsyncOperation(
        () => autoSyncUserOnAppLoad(),
        'User sync to Firebase',
        { success: false, userId: null, isNewUser: false, errors: ['Sync failed'], warnings: [], firestoreSync: false, realtimeDbSync: false }
      );
      
      if (!syncResult.success) {
        console.warn('[MainDashboard] User sync failed, continuing with cached data');
      } else {
        console.log(`[MainDashboard] User sync successful for ${userId} (new user: ${syncResult.isNewUser})`);
      }
      
      // Step 3: Set up real-time listeners with enhanced data handling
      const unsubscribe = subscribeToDashboardData(
        userId,
        ({ user: userData, tasks: tasksData, userTasks: userTasksData, withdrawals: withdrawalsData }) => {
          console.log('[MainDashboard] Real-time update received:', {
            user: !!userData,
            tasks: tasksData.length,
            userTasks: userTasksData.length,
            withdrawals: withdrawalsData.length
          });
          
          if (userData) {
            // Use enhanced user data handler with persistence
            handleUserDataUpdate(userData, 'firebase');
          }
          setTasks(tasksData);
          setUserTasks(userTasksData);
          setWithdrawals(withdrawalsData);
        },
        {
          onError: (error) => {
            console.error('[MainDashboard] Real-time listener error:', error);
            const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
            setError(`Real-time sync error: ${errorMessage}`);
          }
        }
      );
      
      setIsInitialized(true);
      
      // Store unsubscribe function for cleanup
      return unsubscribe;
      
    } catch (error) {
      console.error('[MainDashboard] Initialization failed:', error);
      const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
      setError(errorMessage);
      return () => {}; // Return empty cleanup function
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update farming status based on user data
   */
  useEffect(() => {
    if (!user) return;
    
    const now = new Date();
    
    // Check farming status
    if (user.farmingStartTime && user.farmingEndTime) {
      const startTime = new Date(user.farmingStartTime);
      const endTime = new Date(user.farmingEndTime);
      
      if (now >= endTime) {
        setCanClaim(true);
        setFarmingProgress(100);
        setIsFarming(false);
      } else if (now >= startTime) {
        setIsFarming(true);
        setCanClaim(false);
        const totalDuration = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        const progress = (elapsed / totalDuration) * 100;
        setFarmingProgress(Math.min(progress, 100));
      } else {
        setIsFarming(false);
        setCanClaim(false);
        setFarmingProgress(0);
      }
    } else {
      setIsFarming(false);
      setCanClaim(false);
      setFarmingProgress(0);
    }
    
    // Check daily claim status
    if (user.lastClaimDate) {
      const lastClaim = new Date(user.lastClaimDate);
      const today = new Date();
      const isToday = lastClaim.toDateString() === today.toDateString();
      setDailyClaimAvailable(!isToday);
    } else {
      setDailyClaimAvailable(true);
    }
  }, [user]);

  /**
   * Start farming with atomic operations
   */
  const startFarming = useCallback(async () => {
    if (isProcessing || isFarming || !user) {
      toast.error('Cannot start farming right now');
      return;
    }
    
    setIsProcessing(true);
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    
    try {
      console.log('[MainDashboard] Starting farming...');
      
      const response = await fetch('/api/startFarming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.telegramId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('🚀 Farming started! Come back in 8 hours to claim your coins.');
        setIsFarming(true);
        setFarmingProgress(0);
        setCanClaim(false);
      } else {
        throw new Error(result.error || 'Failed to start farming');
      }
      
    } catch (error) {
      console.error('[MainDashboard] Farming start failed:', error);
      const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, isFarming, isProcessing]);

  /**
   * Claim farming rewards with atomic operations
   */
  const claimFarming = useCallback(async () => {
    if (isProcessing || !canClaim || !user) {
      toast.error('Farming not ready to claim yet!');
      return;
    }
    
    setIsProcessing(true);
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    try {
      console.log('[MainDashboard] Claiming farming rewards...');
      
      const baseReward = 120;
      const farmingMultiplier = user.farmingMultiplier || 1;
      
      const result = await atomicFarmingClaim(user.telegramId, baseReward, farmingMultiplier);
      
      if (result.success) {
        const message = user.vipTier !== 'free' 
          ? `💰 Claimed ${result.coinsEarned} coins! 🎉 (✨ VIP bonus applied!)`
          : `💰 Claimed ${result.coinsEarned} coins! 🎉`;
        
        toast.success(message);
        setCanClaim(false);
        setIsFarming(false);
        setFarmingProgress(0);
        
        console.log(`[MainDashboard] Farming claim successful: ${result.coinsEarned} coins`);
      } else {
        throw new Error(result.error || 'Failed to claim farming rewards');
      }
      
    } catch (error) {
      console.error('[MainDashboard] Farming claim failed:', error);
      const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, canClaim, isProcessing]);

  /**
   * Claim daily rewards with atomic operations
   */
  const claimDaily = useCallback(async () => {
    if (isProcessing || !dailyClaimAvailable || !user) {
      toast.error('Daily reward already claimed today!');
      return;
    }
    
    setIsProcessing(true);
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    try {
      console.log('[MainDashboard] Claiming daily rewards...');
      
      const baseReward = 150;
      const vipBonus = user.vipTier !== 'free' ? 200 : 0;
      
      const result = await atomicDailyClaim(user.telegramId, baseReward, vipBonus);
      
      if (result.success) {
        let message = `🎁 Daily reward claimed! +${result.coinsEarned} coins 🎉`;
        if (vipBonus > 0) {
          message += ` (✨ +${vipBonus} VIP bonus!)`;
        }
        if (result.newStreak > 1) {
          message += ` (🔥 ${result.newStreak} day streak!)`;
        }
        
        toast.success(message);
        setDailyClaimAvailable(false);
        
        console.log(`[MainDashboard] Daily claim successful: ${result.coinsEarned} coins, streak: ${result.newStreak}`);
      } else {
        throw new Error(result.error || 'Failed to claim daily reward');
      }
      
    } catch (error) {
      console.error('[MainDashboard] Daily claim failed:', error);
      const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, dailyClaimAvailable, isProcessing]);

  /**
   * Claim task rewards with atomic operations and optimistic updates
   */
  const claimTaskReward = useCallback(async (taskId: string, reward: number) => {
    if (isProcessing || !user) {
      return;
    }
    
    setIsProcessing(true);
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    // Optimistic update - immediately update UI
    const optimisticUser = {
      ...user,
      coins: user.coins + reward,
      updatedAt: new Date()
    };
    handleUserDataUpdate(optimisticUser, 'optimistic');
    optimisticallyUpdateCoins(optimisticUser.coins);
    
    try {
      console.log(`[MainDashboard] Claiming task ${taskId} reward: ${reward} coins`);
      
      const result = await atomicTaskClaim(user.telegramId, taskId, reward);
      
      if (result.success) {
        toast.success(`🎉 Task completed! +${reward} coins earned!`);
        console.log(`[MainDashboard] Task claim successful: ${reward} coins`);
        
        // Real Firebase data will come through real-time listener
        // and will be merged with optimistic update in persistence manager
      } else {
        // Revert optimistic update on failure
        handleUserDataUpdate(user, 'firebase');
        throw new Error(result.error || 'Failed to claim task reward');
      }
      
    } catch (error) {
      console.error('[MainDashboard] Task claim failed:', error);
      
      // Revert optimistic update on error
      handleUserDataUpdate(user, 'firebase');
      
      const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, isProcessing]);

  // Initialize on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    initializeUser().then((unsubscribe) => {
      cleanup = unsubscribe;
    });
    
    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [initializeUser]);

  // Utility functions
  const getLevel = (xp: number) => Math.floor(xp / 100) + 1;
  const getXpForNextLevel = (xp: number) => getLevel(xp) * 100;
  const safeUser = user || { coins: 0, xp: 0, dailyStreak: 0, firstName: 'User', vipTier: 'free' };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Initializing dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h3 className="text-lg font-bold text-red-800 mb-2">Dashboard Error</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600">
            Live • Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        {error && (
          <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
            Sync issues
          </div>
        )}
      </div>

      {/* Header Stats */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-white/80">{safeUser.firstName}</p>
          </div>
          {safeUser.vipTier !== 'free' && (
            <motion.div
              className="vip-glow bg-accent text-dark px-3 py-1 rounded-full text-sm font-bold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {safeUser.vipTier.toUpperCase()}
            </motion.div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <motion.div
              className="text-2xl font-bold coin-animation"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              key={safeUser.coins} // Re-animate when coins change
            >
              💰 {(safeUser.coins || 0).toLocaleString()}
            </motion.div>
            <p className="text-white/80 text-sm">Coins</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">⭐ {getLevel(safeUser.xp || 0)}</div>
            <p className="text-white/80 text-sm">Level</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">🔥 {safeUser.dailyStreak || 0}</div>
            <p className="text-white/80 text-sm">Streak</p>
          </div>
        </div>
        
        {/* XP Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>XP Progress</span>
            <span>{safeUser.xp || 0}/{getXpForNextLevel(safeUser.xp || 0)}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              className="bg-accent h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((safeUser.xp || 0) % 100)}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Daily Claim */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Daily Reward</h3>
            <p className="text-gray-600 text-sm">
              Claim your daily coins • Streak: {safeUser.dailyStreak || 0} days
            </p>
          </div>
          <motion.button
            onClick={claimDaily}
            disabled={!dailyClaimAvailable || isProcessing}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              dailyClaimAvailable && !isProcessing
                ? 'bg-accent text-dark hover:bg-accent/90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: dailyClaimAvailable && !isProcessing ? 1.05 : 1 }}
          >
            {isProcessing ? '⏳' : dailyClaimAvailable ? '🎁 Claim' : '✅ Claimed'}
          </motion.button>
        </div>
      </motion.div>

      {/* Farming Section */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Coin Farming</h3>
            <p className="text-gray-600 text-sm">
              {safeUser.vipTier !== 'free' && (
                <span className="text-accent font-bold">
                  {user?.farmingMultiplier || 1}x Speed Active! 
                </span>
              )}
              {safeUser.vipTier === 'free' && 'Earn coins every 8 hours'}
            </p>
          </div>
          
          {!isFarming && !canClaim && (
            <motion.button
              onClick={startFarming}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                isProcessing
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: isProcessing ? 1 : 1.05 }}
            >
              {isProcessing ? '⏳ Starting...' : '🚀 Start Farming'}
            </motion.button>
          )}
          
          {canClaim && (
            <motion.button
              onClick={claimFarming}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-xl font-bold transition-all pulse-glow ${
                isProcessing
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-accent text-dark hover:bg-accent/90'
              }`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: isProcessing ? 1 : 1.05 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {isProcessing ? '⏳ Claiming...' : '💰 Claim Coins'}
            </motion.button>
          )}
        </div>
        
        {(isFarming || canClaim) && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{Math.floor(farmingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${farmingProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              {canClaim ? 'Ready to claim!' : 'Farming in progress...'}
            </p>
          </div>
        )}
      </motion.div>

      {/* VIP Status */}
      {user?.vipTier !== 'free' && user?.vipEndTime && (
        <motion.div
          className="bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-2xl p-6"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                👑 VIP Status Active
              </h3>
              <p className="text-gray-600 text-sm">
                Expires: {new Date(user.vipEndTime).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-accent">
                {user.farmingMultiplier || 1}x
              </div>
              <p className="text-sm text-gray-600">Multiplier</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MainDashboard;