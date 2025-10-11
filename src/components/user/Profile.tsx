'use client';

import { motion } from 'framer-motion';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';

interface ProfileProps {
  user: User;
}

const Profile = ({ user }: ProfileProps) => {
  const getLevel = (xp: number) => {
    return Math.floor(xp / 100) + 1;
  };

  const getXpForNextLevel = (xp: number) => {
    const currentLevel = getLevel(xp);
    return currentLevel * 100;
  };

  const getVIPBadge = () => {
    if (user.vipTier === 'free') return null;
    
    return (
      <motion.div
        className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold ${
          user.vipTier === 'vip1' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
        }`}
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {user.vipTier === 'vip1' ? '👑 VIP 1' : '💎 VIP 2'}
      </motion.div>
    );
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const copyUserId = async () => {
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    
    try {
      await navigator.clipboard.writeText(user.telegramId);
      telegram.showAlert('User ID copied to clipboard!');
    } catch (error) {
      telegram.showAlert('Failed to copy User ID');
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <motion.div
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {user.profilePic ? (
                <img
                  src={user.profilePic}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>👤</span>
              )}
            </motion.div>
            {getVIPBadge()}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            {user.username && (
              <p className="text-white/80">@{user.username}</p>
            )}
            <motion.button
              onClick={copyUserId}
              className="text-white/90 text-sm hover:text-white transition-colors mt-1"
              whileTap={{ scale: 0.95 }}
            >
              ID: {user.telegramId} 📋
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-gray-800">
            {getLevel(user.xp)}
          </div>
          <p className="text-gray-600 text-sm">Level</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(user.xp % 100)}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {user.xp}/{getXpForNextLevel(user.xp)} XP
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-gray-800">
            {(user.coins || 0).toLocaleString()}
          </div>
          <p className="text-gray-600 text-sm">Total Coins</p>
          <p className="text-xs text-gray-500 mt-1">
            ≈ ₹{Math.floor((user.coins || 0) / 100)}
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-gray-800">
            {user.referralCount}
          </div>
          <p className="text-gray-600 text-sm">Referrals</p>
          <p className="text-xs text-gray-500 mt-1">
            +{user.referralEarnings} coins earned
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-2">🔥</div>
          <div className="text-2xl font-bold text-gray-800">
            {user.dailyStreak}
          </div>
          <p className="text-gray-600 text-sm">Day Streak</p>
          <p className="text-xs text-gray-500 mt-1">
            Last claim: {formatDate(user.lastClaimDate)}
          </p>
        </motion.div>
      </div>

      {/* VIP Status */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">VIP Status</h3>
        
        {user.vipTier === 'free' ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🆓</div>
            <h4 className="text-lg font-bold text-gray-800">Free Tier</h4>
            <p className="text-gray-600 text-sm mb-4">
              Upgrade to VIP for exclusive benefits!
            </p>
            <motion.button
              className="bg-accent text-dark px-6 py-2 rounded-xl font-bold hover:bg-accent/90 transition-all"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              Upgrade to VIP
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">
                  {user.vipTier === 'vip1' ? '👑' : '💎'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-800">
                    {user.vipTier.toUpperCase()} Active
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Expires: {formatDate(user.vipEndTime)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-accent font-bold">
                  {user.farmingMultiplier}x
                </div>
                <p className="text-gray-600 text-sm">Multiplier</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Farming Speed</p>
                <p className="font-bold text-primary">{user.farmingMultiplier}x</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Referral Bonus</p>
                <p className="font-bold text-primary">{user.referralMultiplier}x</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Daily Withdrawals</p>
                <p className="font-bold text-primary">{user.withdrawalLimit}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Min Withdrawal</p>
                <p className="font-bold text-primary">₹{user.minWithdrawal}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Account Information</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Member Since</span>
            <span className="font-semibold text-gray-800">
              {formatDate(user.createdAt)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Last Active</span>
            <span className="font-semibold text-gray-800">
              {formatDate(user.updatedAt)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Total XP</span>
            <span className="font-semibold text-gray-800">
              {(user.xp || 0).toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Ads Limit</span>
            <span className="font-semibold text-gray-800">
              {user.adsLimitPerDay === -1 ? 'Unlimited' : `${user.adsLimitPerDay}/day`}
            </span>
          </div>
        </div>
      </div>

      {/* Achievements (Placeholder) */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Achievements</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            className={`text-center p-4 rounded-xl ${
              user.dailyStreak >= 7 ? 'bg-accent/20 text-accent' : 'bg-gray-100 text-gray-400'
            }`}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl mb-2">🔥</div>
            <p className="text-xs font-bold">7-Day Streak</p>
          </motion.div>
          
          <motion.div
            className={`text-center p-4 rounded-xl ${
              user.referralCount >= 10 ? 'bg-accent/20 text-accent' : 'bg-gray-100 text-gray-400'
            }`}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl mb-2">👥</div>
            <p className="text-xs font-bold">10 Referrals</p>
          </motion.div>
          
          <motion.div
            className={`text-center p-4 rounded-xl ${
              user.coins >= 10000 ? 'bg-accent/20 text-accent' : 'bg-gray-100 text-gray-400'
            }`}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl mb-2">💰</div>
            <p className="text-xs font-bold">10K Coins</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;