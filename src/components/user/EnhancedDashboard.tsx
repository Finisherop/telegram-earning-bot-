'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, PaymentData, ConversionData, BotMessage } from '@/types';
import { 
  subscribeToUserWithExtendedData, 
  safeUpdateUserWithRetry, 
  startFarmingWithValidation,
  logConversionEvent,
  markMessageAsRead
} from '@/lib/enhancedFirebaseService';
import { TelegramService } from '@/lib/telegram';
import toast from 'react-hot-toast';

interface EnhancedDashboardProps {
  user: User;
}

const EnhancedDashboard = ({ user: initialUser }: EnhancedDashboardProps) => {
  const [user, setUser] = useState<User>(initialUser);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [farmingProgress, setFarmingProgress] = useState(0);
  const [isFarming, setIsFarming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [dailyClaimAvailable, setDailyClaimAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Real-time subscription to user data with extended information
  useEffect(() => {
    console.log('[Enhanced Dashboard] Setting up real-time subscriptions for user:', user.telegramId);
    
    const unsubscribe = subscribeToUserWithExtendedData(
      user.telegramId,
      ({ user: userData, payments: paymentsData, conversions: conversionsData, messages: messagesData }) => {
        console.log('[Enhanced Dashboard] Real-time update received:', {
          user: !!userData,
          payments: paymentsData.length,
          conversions: conversionsData.length,
          messages: messagesData.length,
        });

        if (userData) {
          setUser(userData);
          setLastUpdate(new Date());
        }
        setPayments(paymentsData);
        setConversions(conversionsData);
        setMessages(messagesData);
      }
    );

    return () => {
      console.log('[Enhanced Dashboard] Cleaning up subscriptions');
      unsubscribe();
    };
  }, [user.telegramId]);

  // Update farming status based on real-time user data
  useEffect(() => {
    console.log('[Enhanced Dashboard] Updating farming status for user data:', {
      farmingStartTime: user.farmingStartTime,
      farmingEndTime: user.farmingEndTime,
    });
    
    // Check farming status
    if (user.farmingStartTime && user.farmingEndTime) {
      const now = new Date();
      const startTime = new Date(user.farmingStartTime);
      const endTime = new Date(user.farmingEndTime);
      
      console.log('[Enhanced Dashboard] Farming check:', { now, startTime, endTime });
      
      if (now >= endTime) {
        console.log('[Enhanced Dashboard] Farming completed, can claim');
        setCanClaim(true);
        setFarmingProgress(100);
        setIsFarming(false);
      } else if (now >= startTime) {
        console.log('[Enhanced Dashboard] Farming in progress');
        setIsFarming(true);
        setCanClaim(false);
        const totalDuration = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        const progress = (elapsed / totalDuration) * 100;
        setFarmingProgress(Math.min(progress, 100));
      } else {
        console.log('[Enhanced Dashboard] Farming not started');
        setIsFarming(false);
        setCanClaim(false);
        setFarmingProgress(0);
      }
    } else {
      console.log('[Enhanced Dashboard] No farming data, ready to start');
      setIsFarming(false);
      setCanClaim(false);
      setFarmingProgress(0);
    }

    // Check daily claim status
    if (user.lastClaimDate) {
      const lastClaim = new Date(user.lastClaimDate);
      const today = new Date();
      const isToday = lastClaim.toDateString() === today.toDateString();
      console.log('[Enhanced Dashboard] Daily claim check:', { 
        lastClaim: lastClaim.toDateString(), 
        today: today.toDateString(), 
        isToday 
      });
      setDailyClaimAvailable(!isToday);
    } else {
      console.log('[Enhanced Dashboard] No last claim date, daily claim available');
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
    
    console.log('[Enhanced Dashboard] Start farming clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    
    setIsLoading(true);
    
    try {
      const result = await startFarmingWithValidation(user.telegramId);
      
      if (result.success) {
        setIsFarming(true);
        setFarmingProgress(0);
        setCanClaim(false);
        toast.success('🚀 Farming started! Come back in 8 hours to claim your coins.');
        console.log('[Enhanced Dashboard] Farming started successfully');
      } else {
        toast.error(result.message);
        console.log('[Enhanced Dashboard] Farming start failed:', result.message);
      }
    } catch (error) {
      console.error('[Enhanced Dashboard] Farming start error:', error);
      toast.error('❌ Failed to start farming. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user.telegramId, isLoading, isFarming]);

  const claimFarming = useCallback(async () => {
    if (isLoading || !canClaim) {
      toast.error('Farming not ready to claim yet!');
      return;
    }
    
    console.log('[Enhanced Dashboard] Claim farming clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    setIsLoading(true);
    
    const baseReward = 120;
    const reward = Math.floor(baseReward * (user.farmingMultiplier || 1));
    
    try {
      console.log(`[Enhanced Dashboard] Claiming farming reward: ${reward} coins for user:`, user.telegramId);
      
      // Atomic update to prevent race conditions
      const currentCoins = user.coins || 0;
      const currentXp = user.xp || 0;
      
      await safeUpdateUserWithRetry(user.telegramId, {
        coins: currentCoins + reward,
        xp: currentXp + Math.floor(reward / 10),
        farmingStartTime: undefined,
        farmingEndTime: undefined,
      });
      
      // Log conversion event
      await logConversionEvent(user.telegramId, 'farming_claim', {
        coinsEarned: reward,
        farmingDuration: 8 * 60 * 60 * 1000, // 8 hours
      });
      
      setCanClaim(false);
      setIsFarming(false);
      setFarmingProgress(0);
      
      const message = user.vipTier !== 'free' 
        ? `💰 Claimed ${reward} coins! 🎉 (✨ VIP bonus applied!)`
        : `💰 Claimed ${reward} coins! 🎉`;
      toast.success(message);
      console.log('[Enhanced Dashboard] Farming reward claimed successfully');
    } catch (error) {
      console.error('[Enhanced Dashboard] Farming claim error:', error);
      toast.error('❌ Failed to claim farming reward. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, canClaim, isLoading]);

  const claimDaily = useCallback(async () => {
    if (isLoading || !dailyClaimAvailable) {
      toast.error('Daily reward already claimed today!');
      return;
    }
    
    console.log('[Enhanced Dashboard] Daily claim clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    setIsLoading(true);
    
    const baseReward = 150;
    const streakBonus = Math.min((user.dailyStreak || 0) * 10, 100);
    const vipBonus = user.vipTier !== 'free' ? 200 : 0;
    const totalReward = baseReward + streakBonus + vipBonus;
    
    try {
      console.log(`[Enhanced Dashboard] Claiming daily reward: ${totalReward} coins for user:`, user.telegramId);
      
      // Atomic update to prevent race conditions
      const currentCoins = user.coins || 0;
      const currentXp = user.xp || 0;
      const currentStreak = user.dailyStreak || 0;
      
      await safeUpdateUserWithRetry(user.telegramId, {
        coins: currentCoins + totalReward,
        xp: currentXp + Math.floor(totalReward / 10),
        dailyStreak: currentStreak + 1,
        lastClaimDate: new Date(),
      });
      
      // Log conversion event
      await logConversionEvent(user.telegramId, 'daily_claim', {
        coinsEarned: totalReward,
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
      console.log('[Enhanced Dashboard] Daily reward claimed successfully');
    } catch (error) {
      console.error('[Enhanced Dashboard] Daily claim error:', error);
      toast.error('❌ Failed to claim daily reward. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, dailyClaimAvailable, isLoading]);

  const handleMessageClick = useCallback(async (message: BotMessage) => {
    if (!message.isRead) {
      await markMessageAsRead(user.telegramId, message.id);
    }
  }, [user.telegramId]);

  const getLevel = (xp: number) => {
    return Math.floor(xp / 100) + 1;
  };

  const getXpForNextLevel = (xp: number) => {
    const currentLevel = getLevel(xp);
    return currentLevel * 100;
  };

  const unreadMessages = messages.filter(m => !m.isRead);
  const recentConversions = conversions.slice(0, 5);
  const recentPayments = payments.filter(p => p.status === 'completed').slice(0, 3);

  return (
    <div className="p-4 space-y-6">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600">
            Live • Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        {unreadMessages.length > 0 && (
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            {unreadMessages.length} new
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

      {/* Bot Messages */}
      {unreadMessages.length > 0 && (
        <motion.div
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
            🤖 Bot Messages
            <span className="ml-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
              {unreadMessages.length}
            </span>
          </h3>
          <div className="space-y-2">
            {unreadMessages.slice(0, 3).map((message) => (
              <motion.div
                key={message.id}
                className="bg-white p-3 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={() => handleMessageClick(message)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{message.title}</h4>
                    <p className="text-gray-600 text-sm">{message.message}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {message.createdAt.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Conversions */}
        <motion.div
          className="bg-white rounded-2xl p-4 shadow-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            📊 Recent Activity
          </h3>
          <div className="space-y-2">
            {recentConversions.length > 0 ? (
              recentConversions.map((conversion) => (
                <div key={conversion.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {conversion.type === 'vip_upgrade' && '👑 VIP Upgrade'}
                    {conversion.type === 'farming_claim' && '🚜 Farming'}
                    {conversion.type === 'daily_claim' && '🎁 Daily Reward'}
                    {conversion.type === 'task_completion' && '📋 Task'}
                    {conversion.type === 'referral_bonus' && '👥 Referral'}
                  </span>
                  <span className="font-bold text-green-600">
                    {conversion.coinsEarned && `+${conversion.coinsEarned}`}
                    {conversion.toTier && `→ ${conversion.toTier.toUpperCase()}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </motion.div>

        {/* Payment History */}
        <motion.div
          className="bg-white rounded-2xl p-4 shadow-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            💳 VIP Purchases
          </h3>
          <div className="space-y-2">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {payment.tier.toUpperCase()} - {payment.amount} ⭐
                  </span>
                  <span className="text-green-600 font-bold">✅</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No VIP purchases yet</p>
            )}
          </div>
        </motion.div>
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
              {user.vipTier === 'free' && 'Earn coins every 8 hours'}
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

export default EnhancedDashboard;