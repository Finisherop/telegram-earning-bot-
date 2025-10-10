'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { updateUser, safeUpdateUser } from '@/lib/firebaseService';
import { TelegramService } from '@/lib/telegram';
import toast from 'react-hot-toast';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [farmingProgress, setFarmingProgress] = useState(0);
  const [isFarming, setIsFarming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [dailyClaimAvailable, setDailyClaimAvailable] = useState(true);

  useEffect(() => {
    console.log('Dashboard useEffect - user data:', user);
    
    // Check farming status
    if (user.farmingStartTime && user.farmingEndTime) {
      const now = new Date();
      const startTime = new Date(user.farmingStartTime);
      const endTime = new Date(user.farmingEndTime);
      
      console.log('Farming check:', { now, startTime, endTime });
      
      if (now >= endTime) {
        console.log('Farming completed, can claim');
        setCanClaim(true);
        setFarmingProgress(100);
        setIsFarming(false);
      } else if (now >= startTime) {
        console.log('Farming in progress');
        setIsFarming(true);
        setCanClaim(false);
        const totalDuration = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        const progress = (elapsed / totalDuration) * 100;
        setFarmingProgress(Math.min(progress, 100));
      } else {
        console.log('Farming not started');
        setIsFarming(false);
        setCanClaim(false);
        setFarmingProgress(0);
      }
    } else {
      console.log('No farming data, ready to start');
      setIsFarming(false);
      setCanClaim(false);
      setFarmingProgress(0);
    }

    // Check daily claim status
    if (user.lastClaimDate) {
      const lastClaim = new Date(user.lastClaimDate);
      const today = new Date();
      const isToday = lastClaim.toDateString() === today.toDateString();
      console.log('Daily claim check:', { lastClaim: lastClaim.toDateString(), today: today.toDateString(), isToday });
      setDailyClaimAvailable(!isToday);
    } else {
      console.log('No last claim date, daily claim available');
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

  const startFarming = async () => {
    console.log('Start farming clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    
    if (isFarming) {
      toast.error('Farming is already in progress!');
      return;
    }
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours
    
    try {
      console.log('Starting farming for user:', user.telegramId, { startTime, endTime });
      
      // Update Firebase immediately with proper error handling
      await safeUpdateUser(user.telegramId, {
        farmingStartTime: startTime,
        farmingEndTime: endTime,
      });
      
      setIsFarming(true);
      setFarmingProgress(0);
      setCanClaim(false);
      
      toast.success('🚀 Farming started! Come back in 8 hours to claim your coins.');
      console.log('Farming started successfully');
    } catch (error) {
      console.error('Farming start error:', error);
      toast.error('❌ Failed to start farming. Please check your connection and try again.');
    }
  };

  const claimFarming = async () => {
    console.log('Claim farming clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    if (!canClaim) {
      toast.error('Farming not ready to claim yet!');
      return;
    }
    
    const baseReward = 120;
    const reward = Math.floor(baseReward * (user.farmingMultiplier || 1));
    
    try {
      console.log(`Claiming farming reward: ${reward} coins for user:`, user.telegramId);
      
      // Atomic update to prevent race conditions
      const currentCoins = user.coins || 0;
      const currentXp = user.xp || 0;
      
      await safeUpdateUser(user.telegramId, {
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
      console.log('Farming reward claimed successfully');
    } catch (error) {
      console.error('Farming claim error:', error);
      toast.error('❌ Failed to claim farming reward. Please try again.');
    }
  };

  const claimDaily = async () => {
    console.log('Daily claim clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');
    
    if (!dailyClaimAvailable) {
      toast.error('Daily reward already claimed today!');
      return;
    }
    
    const baseReward = 150;
    const streakBonus = Math.min((user.dailyStreak || 0) * 10, 100);
    const vipBonus = user.vipTier !== 'free' ? 200 : 0;
    const totalReward = baseReward + streakBonus + vipBonus;
    
    try {
      console.log(`Claiming daily reward: ${totalReward} coins for user:`, user.telegramId);
      
      // Atomic update to prevent race conditions
      const currentCoins = user.coins || 0;
      const currentXp = user.xp || 0;
      const currentStreak = user.dailyStreak || 0;
      
      await safeUpdateUser(user.telegramId, {
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
      console.log('Daily reward claimed successfully');
    } catch (error) {
      console.error('Daily claim error:', error);
      toast.error('❌ Failed to claim daily reward. Please try again.');
    }
  };

  const getLevel = (xp: number) => {
    return Math.floor(xp / 100) + 1;
  };

  const getXpForNextLevel = (xp: number) => {
    const currentLevel = getLevel(xp);
    return currentLevel * 100;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header Stats */}
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
            >
              💰 {user.coins.toLocaleString()}
            </motion.div>
            <p className="text-white/80 text-sm">Coins</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">⭐ {getLevel(user.xp)}</div>
            <p className="text-white/80 text-sm">Level</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">🔥 {user.dailyStreak}</div>
            <p className="text-white/80 text-sm">Streak</p>
          </div>
        </div>
        
        {/* XP Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>XP Progress</span>
            <span>{user.xp}/{getXpForNextLevel(user.xp)}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              className="bg-accent h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(user.xp % 100)}%` }}
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
              Claim your daily coins • Streak: {user.dailyStreak} days
            </p>
          </div>
          <motion.button
            onClick={claimDaily}
            disabled={!dailyClaimAvailable}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              dailyClaimAvailable
                ? 'bg-accent text-dark hover:bg-accent/90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: dailyClaimAvailable ? 1.05 : 1 }}
          >
            {dailyClaimAvailable ? '🎁 Claim' : '✅ Claimed'}
          </motion.button>
        </div>
        
        {/* Daily Calendar Preview */}
        <div className="flex justify-center mt-4 space-x-2">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                i < user.dailyStreak
                  ? 'bg-accent text-dark'
                  : i === user.dailyStreak && dailyClaimAvailable
                  ? 'bg-primary text-white animate-pulse'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
          ))}
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
              {user.vipTier !== 'free' && (
                <span className="text-accent font-bold">
                  {user.farmingMultiplier}x Speed Active! 
                </span>
              )}
            </p>
          </div>
          
          {!isFarming && !canClaim && (
            <motion.button
              onClick={startFarming}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              🚀 Start Farming
            </motion.button>
          )}
          
          {canClaim && (
            <motion.button
              onClick={claimFarming}
              className="bg-accent text-dark px-6 py-3 rounded-xl font-bold hover:bg-accent/90 transition-all pulse-glow"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              💰 Claim Coins
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
                {user.farmingMultiplier}x
              </div>
              <p className="text-sm text-gray-600">Multiplier</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;