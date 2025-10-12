'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { getWithdrawalRequests } from '@/lib/firebaseService';
import { realtimeDb } from '@/lib/firebaseClient.js';
import { ref, get, set, onValue, off } from 'firebase/database';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp.js';

interface ProfileProps {
  user?: User;
}

interface WithdrawalStats {
  total: number;
  successful: number;
  rejected: number;
  pending: number;
}

interface FirebaseUser {
  id: string;
  first_name: string;
  username?: string;
  coins: number;
  createdAt: number;
  vipTier?: string;
  profilePic?: string;
  lastName?: string;
  telegramId?: string;
}

const Profile = ({ user: propUser }: ProfileProps) => {
  const { user: telegramUser } = useTelegramWebApp() as any;
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats>({
    total: 0,
    successful: 0,
    rejected: 0,
    pending: 0
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!realtimeDb) {
        console.error('❌ Firebase Realtime Database not available');
        setError('Firebase not available');
        setLoading(false);
        return;
      }

      // Get user ID from Telegram or fallback to prop user
      const userId = telegramUser?.id || propUser?.telegramId;
      
      if (!userId) {
        console.warn('Profile: No user ID available');
        setError('No user ID available');
        setLoading(false);
        return;
      }

      console.log('Loading profile for user:', userId);
      setLoading(true);
      setError(null);

      try {
        const userRef = ref(realtimeDb, `telegram_users/${userId}`);
        
        // Set up real-time listener
        const unsubscribe = onValue(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('✅ Profile loaded from Firebase:', userData);
            setFirebaseUser(userData);
          } else {
            // User doesn't exist, create default profile
            console.log('🆕 New user detected, creating profile...');
            const defaultUser: FirebaseUser = {
              id: String(userId),
              first_name: telegramUser?.first_name || propUser?.firstName || 'User',
              username: telegramUser?.username || propUser?.username || '',
              coins: 0,
              createdAt: Date.now(),
              vipTier: 'free',
              telegramId: String(userId)
            };

            await set(userRef, defaultUser);
            console.log('🆕 New user created in Firebase:', defaultUser);
            setFirebaseUser(defaultUser);
          }
          setLoading(false);
        }, (error) => {
          console.error('❌ Firebase error:', error);
          setError('Failed to load profile');
          setLoading(false);
        });

        // Load withdrawal stats
        loadWithdrawalStats(String(userId));

        return () => {
          off(userRef, 'value', unsubscribe);
        };
      } catch (error) {
        console.error('❌ Firebase error:', error);
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    const loadWithdrawalStats = async (userId: string) => {
      try {
        const withdrawals = await getWithdrawalRequests();
        const userWithdrawals = withdrawals.filter(w => w.userId === userId);
        
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

    loadUserProfile();
  }, [telegramUser?.id, propUser?.telegramId]);

  const getVIPBadge = () => {
    if (!firebaseUser || firebaseUser.vipTier === 'free') return null;
    
    return (
      <motion.div
        className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold ${
          firebaseUser.vipTier === 'vip1' 
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
        {firebaseUser.vipTier === 'vip1' ? '👑 VIP 1' : '💎 VIP 2'}
      </motion.div>
    );
  };

  const copyUserId = async () => {
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    
    // Validate user ID before copying
    if (!firebaseUser || !firebaseUser.id) {
      telegram.showAlert('User ID not available');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(firebaseUser.id);
      telegram.showAlert('User ID copied to clipboard!');
    } catch (error) {
      telegram.showAlert('Failed to copy User ID');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Loading profile...</h2>
          <p className="text-gray-600">Fetching your data from Firebase</p>
        </div>
      </div>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <div className="p-4 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Profile Data Unavailable</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh App
          </button>
        </div>
      </div>
    );
  }

  // Show error if no Firebase user data
  if (!firebaseUser) {
    return (
      <div className="p-4 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Profile Data Unavailable</h2>
          <p className="text-red-600 mb-4">Unable to load profile data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh App
          </button>
        </div>
      </div>
    );
  }

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
              {firebaseUser.profilePic ? (
                <img
                  src={firebaseUser.profilePic}
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
              {firebaseUser.first_name} {firebaseUser.lastName || ''}
            </h1>
            {firebaseUser.username && (
              <p className="text-white/80">@{firebaseUser.username}</p>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <motion.button
                onClick={copyUserId}
                className="text-white/90 text-sm hover:text-white transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                ID: {firebaseUser.id} 📋
              </motion.button>
              <div className="text-white/90 text-sm">
                💰 {firebaseUser.coins} coins
              </div>
            </div>
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