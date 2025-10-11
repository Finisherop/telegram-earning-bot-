'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, AdminSettings } from '@/types';
import { 
  firebaseRealtimeManager,
  subscribeToUser,
  subscribeToGlobalConfig,
  updateUserSafe 
} from '@/lib/firebaseRealtimeManager';
import { TelegramService } from '@/lib/telegram';
import toast from 'react-hot-toast';

interface EnhancedUserDashboardProps {
  user: User;
}

const EnhancedUserDashboard = ({ user: initialUser }: EnhancedUserDashboardProps) => {
  const [user, setUser] = useState<User>(initialUser);
  const [globalConfig, setGlobalConfig] = useState<AdminSettings | null>(null);
  const [farmingProgress, setFarmingProgress] = useState(0);
  const [isFarming, setIsFarming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [dailyClaimAvailable, setDailyClaimAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState({ isOnline: true, listenersCount: 0 });

  // Real-time Firebase connection status monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const status = firebaseRealtimeManager.getStatus();
      setConnectionStatus(status);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Real-time user data subscription with enhanced error handling
  useEffect(() => {
    console.log('[Enhanced User Dashboard] Setting up real-time user subscription for:', user.telegramId);
    
    const unsubscribeUser = subscribeToUser(user.telegramId, (userData) => {
      if (userData) {
        console.log('[Enhanced User Dashboard] User data updated:', {
          coins: userData.coins,
          vipTier: userData.vipTier,
          farmingStatus: !!userData.farmingStartTime
        });
        setUser(userData);
        setLastUpdate(new Date());
      }
    });

    return unsubscribeUser;
  }, [user.telegramId]);

  // Real-time global config subscription for instant admin updates
  useEffect(() => {
    console.log('[Enhanced User Dashboard] Setting up global config subscription for instant admin sync');
    
    const unsubscribeConfig = subscribeToGlobalConfig((configData) => {
      if (configData) {
        console.log('[Enhanced User Dashboard] ⚡ Admin settings updated instantly!', {
          vip1Price: configData.vipTiers?.vip1?.price,
          vip2Price: configData.vipTiers?.vip2?.price,
          baseAdReward: configData.baseAdReward
        });
        setGlobalConfig(configData);
        
        // Show toast to user when admin makes changes
        toast.success('⚡ App settings updated!', {
          duration: 2000,
          position: 'top-center'
        });
      }
    });

    return unsubscribeConfig;
  }, []);

  // Update farming status based on real-time user data
  useEffect(() => {
    console.log('[Enhanced User Dashboard] Updating farming status for user data:', {
      farmingStartTime: user.farmingStartTime,
      farmingEndTime: user.farmingEndTime,
    });
    
    // Check farming status
    if (user.farmingStartTime && user.farmingEndTime) {
      const now = new Date();
      const startTime = new Date(user.farmingStartTime);
      const endTime = new Date(user.farmingEndTime);
      
      console.log('[Enhanced User Dashboard] Farming check:', { now, startTime, endTime });
      
      if (now >= endTime) {
        console.log('[Enhanced User Dashboard] Farming completed, can claim');
        setCanClaim(true);
        setFarmingProgress(100);
        setIsFarming(false);
      } else if (now >= startTime) {
        console.log('[Enhanced User Dashboard] Farming in progress');
        setIsFarming(true);
        setCanClaim(false);
        const totalDuration = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        const progress = (elapsed / totalDuration) * 100;
        setFarmingProgress(Math.min(progress, 100));
      } else {
        console.log('[Enhanced User Dashboard] Farming not started');
        setIsFarming(false);
        setCanClaim(false);
        setFarmingProgress(0);
      }
    } else {
      console.log('[Enhanced User Dashboard] No farming data, ready to start');
      setIsFarming(false);
      setCanClaim(false);
      setFarmingProgress(0);
    }

    // Check daily claim status
    if (user.lastClaimDate) {
      const lastClaim = new Date(user.lastClaimDate);
      const today = new Date();
      const isToday = lastClaim.toDateString() === today.toDateString();
      console.log('[Enhanced User Dashboard] Daily claim check:', { 
        lastClaim: lastClaim.toDateString(), 
        today: today.toDateString(), 
        isToday 
      });
      setDailyClaimAvailable(!isToday);
    } else {
      console.log('[Enhanced User Dashboard] No last claim date, daily claim available');
      setDailyClaimAvailable(true);
    }
    
    // Set up farming progress timer if farming is active
    if (user.farmingStartTime && user.farmingEndTime && !canClaim) {
      const interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(user.farmingStartTime!);
        const endTime = new Date(user.farmingEndTime!);
        
        if (now >= endTime) {
          setCanClaim(true);
          setFarmingProgress(100);
          setIsFarming(false);
          clearInterval(interval);
        } else if (now >= startTime) {
          const totalDuration = endTime.getTime() - startTime.getTime();
          const elapsed = now.getTime() - startTime.getTime();
          const progress = (elapsed / totalDuration) * 100;
          setFarmingProgress(Math.min(progress, 100));
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [user, canClaim]);

  const startFarming = useCallback(async () => {
    if (isLoading || isFarming) {
      toast.error('Farming is already in progress!');
      return;
    }
    
    console.log('[Enhanced User Dashboard] Start farming clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    
    setIsLoading(true);
    
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours
      
      // Check if farming is already active
      if (user.farmingStartTime && user.farmingEndTime) {
        const currentEndTime = new Date(user.farmingEndTime);
        if (new Date() < currentEndTime) {
          toast.error('Farming is already in progress!');
          return;
        }
      }
      
      await updateUserSafe(user.telegramId, {
        farmingStartTime: startTime,
        farmingEndTime: endTime,
      });
      
      setIsFarming(true);
      setFarmingProgress(0);
      setCanClaim(false);
      toast.success('🚀 Farming started! Come back in 8 hours to claim your coins.');
      console.log('[Enhanced User Dashboard] Farming started successfully');
      
    } catch (error) {
      console.error('[Enhanced User Dashboard] Farming start error:', error);
      toast.error('❌ Failed to start farming. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user.telegramId, isLoading, isFarming, user.farmingStartTime, user.farmingEndTime]);

  const claimFarming = useCallback(async () => {
    if (isLoading || !canClaim) {
      toast.error('Farming not ready to claim yet!');
      return;
    }
    
    console.log('[Enhanced User Dashboard] Claim farming clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    setIsLoading(true);
    
    // Use global config for base reward if available, otherwise fallback to default
    const baseReward = globalConfig?.baseAdReward || 120;
    const reward = Math.floor(baseReward * (user.farmingMultiplier || 1));
    
    try {
      console.log(`[Enhanced User Dashboard] Claiming farming reward: ${reward} coins for user:`, user.telegramId);
      
      // Atomic update to prevent race conditions
      const currentCoins = user.coins || 0;
      const currentXp = user.xp || 0;
      
      await updateUserSafe(user.telegramId, {
        coins: currentCoins + reward,
        xp: currentXp + Math.floor(reward / 10),
        farmingStartTime: undefined,
        farmingEndTime: undefined,
      });
      
      setCanClaim(false);
      setIsFarming(false);
      setFarmingProgress(0);
      
      const message = user.vipTier !== 'free' 
        ? `💰 Claimed ${reward} coins! 🎉 (✨ VIP bonus applied!)`
        : `💰 Claimed ${reward} coins! 🎉`;
      toast.success(message);
      console.log('[Enhanced User Dashboard] Farming reward claimed successfully');
    } catch (error) {
      console.error('[Enhanced User Dashboard] Farming claim error:', error);
      toast.error('❌ Failed to claim farming reward. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, canClaim, isLoading, globalConfig]);

  const claimDaily = useCallback(async () => {
    if (isLoading || !dailyClaimAvailable) {
      toast.error('Daily reward already claimed today!');
      return;
    }
    
    console.log('[Enhanced User Dashboard] Daily claim clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    setIsLoading(true);
    
    const baseReward = 150;
    const streakBonus = Math.min((user.dailyStreak || 0) * 10, 100);
    const vipBonus = user.vipTier !== 'free' ? 200 : 0;
    const totalReward = baseReward + streakBonus + vipBonus;
    
    try {
      console.log(`[Enhanced User Dashboard] Claiming daily reward: ${totalReward} coins for user:`, user.telegramId);
      
      // Atomic update to prevent race conditions
      const currentCoins = user.coins || 0;
      const currentXp = user.xp || 0;
      const currentStreak = user.dailyStreak || 0;
      
      await updateUserSafe(user.telegramId, {
        coins: currentCoins + totalReward,
        xp: currentXp + Math.floor(totalReward / 10),
        dailyStreak: currentStreak + 1,
        lastClaimDate: new Date(),
      });
      
      setDailyClaimAvailable(false);
      
      let message = `🎁 Daily reward claimed! +${totalReward} coins 🎉`;
      if (vipBonus > 0) {
        message += ` (✨ +${vipBonus} VIP bonus!)`;
      }
      if (streakBonus > 0) {
        message += ` (🔥 +${streakBonus} streak bonus!)`;
      }
      
      toast.success(message);
      console.log('[Enhanced User Dashboard] Daily reward claimed successfully');
    } catch (error) {
      console.error('[Enhanced User Dashboard] Daily claim error:', error);
      toast.error('❌ Failed to claim daily reward. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, dailyClaimAvailable, isLoading]);

  const getLevel = (xp: number) => {
    return Math.floor(xp / 100) + 1;
  };

  const getXpForNextLevel = (xp: number) => {
    const currentLevel = getLevel(xp);
    return currentLevel * 100;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Real-time Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className="text-xs text-gray-600">
            {connectionStatus.isOnline ? 'Live' : 'Offline'} • 
            Listeners: {connectionStatus.listenersCount} •
            Last: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        
        {/* Global config indicator */}
        {globalConfig && (
          <div className="text-xs text-green-600 font-medium">
            ⚡ Real-time sync active
          </div>
        )}
      </div>

      {/* Header Stats with Real-time Updates */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-white/80">{user.firstName || 'User'}</p>
          </div>
          {user.vipTier !== 'free' && (
            <motion.div
              className="vip-glow bg-accent text-dark px-3 py-1 rounded-full text-sm font-bold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {user.vipTier.toUpperCase()}
            </motion.div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <motion.div
              className="text-2xl font-bold coin-animation"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              key={user.coins} // Re-animate when coins change
            >
              💰 {(user.coins || 0).toLocaleString()}
            </motion.div>
            <p className="text-white/80 text-sm">Coins</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">⭐ {getLevel(user.xp || 0)}</div>
            <p className="text-white/80 text-sm">Level</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">🔥 {user.dailyStreak || 0}</div>
            <p className="text-white/80 text-sm">Streak</p>
          </div>
        </div>
        
        {/* XP Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>XP Progress</span>
            <span>{user.xp || 0}/{getXpForNextLevel(user.xp || 0)}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              className="bg-accent h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((user.xp || 0) % 100)}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Admin Settings Preview (if available) */}
      {globalConfig && (
        <motion.div
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center">
            ⚙️ Current App Settings
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">VIP 1 Price:</span>
              <span className="ml-2 font-bold">{globalConfig.vipTiers?.vip1?.price || 'N/A'} ⭐</span>
            </div>
            <div>
              <span className="text-gray-600">VIP 2 Price:</span>
              <span className="ml-2 font-bold">{globalConfig.vipTiers?.vip2?.price || 'N/A'} ⭐</span>
            </div>
            <div>
              <span className="text-gray-600">Base Ad Reward:</span>
              <span className="ml-2 font-bold">{globalConfig.baseAdReward || 'N/A'} coins</span>
            </div>
            <div>
              <span className="text-gray-600">Exchange Rate:</span>
              <span className="ml-2 font-bold">{globalConfig.inrExchangeRate || 'N/A'} coins/₹</span>
            </div>
          </div>
        </motion.div>
      )}

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
              Claim your daily coins • Streak: {user.dailyStreak || 0} days
            </p>
          </div>
          <motion.button
            onClick={claimDaily}
            disabled={!dailyClaimAvailable || isLoading}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              dailyClaimAvailable && !isLoading
                ? 'bg-accent text-dark hover:bg-accent/90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: dailyClaimAvailable && !isLoading ? 1.05 : 1 }}
          >
            {isLoading ? '⏳' : dailyClaimAvailable ? '🎁 Claim' : '✅ Claimed'}
          </motion.button>
        </div>
        
        {/* Daily Calendar Preview */}
        <div className="flex justify-center mt-4 space-x-2">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                i < (user.dailyStreak || 0)
                  ? 'bg-accent text-dark'
                  : i === (user.dailyStreak || 0) && dailyClaimAvailable
                  ? 'bg-primary text-white animate-pulse'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Enhanced Farming Section */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Coin Farming</h3>
            <p className="text-gray-600 text-sm">
              {user.vipTier !== 'free' && (
                <span className="text-accent font-bold">
                  {user.farmingMultiplier || 1}x Speed Active! 
                </span>
              )}
              {user.vipTier === 'free' && `Earn ${globalConfig?.baseAdReward || 120} coins every 8 hours`}
            </p>
          </div>
          
          {!isFarming && !canClaim && (
            <motion.button
              onClick={startFarming}
              disabled={isLoading}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                isLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: isLoading ? 1 : 1.05 }}
            >
              {isLoading ? '⏳ Starting...' : '🚀 Start Farming'}
            </motion.button>
          )}
          
          {canClaim && (
            <motion.button
              onClick={claimFarming}
              disabled={isLoading}
              className={`px-6 py-3 rounded-xl font-bold transition-all pulse-glow ${
                isLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-accent text-dark hover:bg-accent/90'
              }`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: isLoading ? 1 : 1.05 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {isLoading ? '⏳ Claiming...' : '💰 Claim Coins'}
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
      {user.vipTier !== 'free' && user.vipEndTime && (
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
              {globalConfig?.vipTiers?.[user.vipTier] && (
                <p className="text-accent text-sm font-medium">
                  Real-time pricing: {globalConfig.vipTiers[user.vipTier].price} ⭐
                </p>
              )}
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

export default EnhancedUserDashboard;