'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { getWithdrawalRequests } from '@/lib/firebaseService';

interface ProfileProps {
  user: User;
}

interface WithdrawalStats {
  total: number;
  successful: number;
  rejected: number;
  pending: number;
}

const Profile = ({ user }: ProfileProps) => {
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats>({
    total: 0,
    successful: 0,
    rejected: 0,
    pending: 0
  });

  useEffect(() => {
    const loadWithdrawalStats = async () => {
      try {
        const withdrawals = await getWithdrawalRequests();
        const userWithdrawals = withdrawals.filter(w => w.userId === user.telegramId);
        
        const stats = {
          total: userWithdrawals.length,
          successful: userWithdrawals.filter(w => w.status === 'approved' || w.status === 'paid').length,
          rejected: userWithdrawals.filter(w => w.status === 'rejected').length,
          pending: userWithdrawals.filter(w => w.status === 'pending').length,
        };
        
        setWithdrawalStats(stats);
      } catch (error) {
        console.error('Error loading withdrawal stats:', error);
      }
    };

    loadWithdrawalStats();
  }, [user.telegramId]);

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

      {/* Withdrawal Statistics */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Withdrawal Statistics</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="bg-blue-50 rounded-xl p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-blue-600">{withdrawalStats.total}</div>
            <p className="text-blue-800 text-sm font-medium">Total Withdrawals</p>
          </motion.div>

          <motion.div
            className="bg-green-50 rounded-xl p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-green-600">{withdrawalStats.successful}</div>
            <p className="text-green-800 text-sm font-medium">Successful</p>
          </motion.div>

          <motion.div
            className="bg-red-50 rounded-xl p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-red-600">{withdrawalStats.rejected}</div>
            <p className="text-red-800 text-sm font-medium">Rejected</p>
          </motion.div>

          <motion.div
            className="bg-yellow-50 rounded-xl p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-yellow-600">{withdrawalStats.pending}</div>
            <p className="text-yellow-800 text-sm font-medium">Pending</p>
          </motion.div>
        </div>
      </div>

    </div>
  );
};

export default Profile;