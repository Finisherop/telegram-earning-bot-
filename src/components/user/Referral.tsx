'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { safeGet, safeUpdate, buildUserPath } from '@/lib/firebaseUtils';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface ReferralProps {
  user: User;
  onUserUpdate?: (updatedUser: Partial<User>) => void;
}

interface ReferredUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  referralStatus: 'pending' | 'confirmed';
  createdAt: string;
}

const Referral = ({ user, onUserUpdate }: ReferralProps) => {
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [isProcessingRewards, setIsProcessingRewards] = useState(false);
  const listenersRef = useRef<(() => void)[]>([]);
  const processedReferralsRef = useRef<Set<string>>(new Set());

  // Function to auto-trigger confirm-referral API for newly confirmed referrals
  const triggerConfirmReferralIfNeeded = async (referredUserId: string, status: string) => {
    // Only trigger for confirmed status and if not already processed
    if (status !== 'confirmed' || processedReferralsRef.current.has(referredUserId)) {
      return;
    }

    // Mark as processed to prevent duplicate calls
    processedReferralsRef.current.add(referredUserId);

    try {
      console.log(`[Referral] 🚀 Auto-triggering /confirm-referral for user ${referredUserId}`);
      
      const response = await fetch('/api/confirm-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: referredUserId }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`[Referral] ✅ Referral confirmed successfully for user ${referredUserId}:`, data);
        toast.success(`🎉 Referral confirmed! +1 referral count`);
      } else {
        console.error(`[Referral] ❌ Failed to confirm referral for user ${referredUserId}:`, data.message);
        // Remove from processed set so it can be retried
        processedReferralsRef.current.delete(referredUserId);
      }
      
    } catch (error) {
      console.error(`[Referral] ❌ Error triggering confirm-referral for user ${referredUserId}:`, error);
      // Remove from processed set so it can be retried
      processedReferralsRef.current.delete(referredUserId);
    }
  };

  useEffect(() => {
    const telegram = TelegramService.getInstance();
    const link = telegram.generateReferralLink(user.telegramId);
    setReferralLink(link);
  }, [user.telegramId]);

  // Function to get current user ID from Telegram WebApp
  const getCurrentUserId = useCallback(() => {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || user.telegramId;
  }, [user.telegramId]);

  // Function to calculate referral reward based on user's VIP tier
  const calculateReferralReward = (vipTier: string = 'free', referralMultiplier: number = 1) => {
    const baseReward = 100;
    return Math.floor(baseReward * referralMultiplier);
  };

  // Function to update user rewards for confirmed referrals
  const updateUserRewards = useCallback(async (confirmedCount: number) => {
    if (!realtimeDb || isProcessingRewards) return;

    try {
      setIsProcessingRewards(true);
      const userId = getCurrentUserId();
      const userPath = buildUserPath(userId);
      
      if (!userPath) {
        console.error('[Referral] Invalid user ID for reward update');
        return;
      }

      // Get current user data
      const currentUserData = await safeGet(userPath);
      if (!currentUserData) {
        console.error('[Referral] User data not found for reward update');
        return;
      }

      const currentRewardedCount = currentUserData.referralRewardedCount || 0;
      const newRewardsCount = confirmedCount - currentRewardedCount;

      if (newRewardsCount > 0) {
        const rewardPerReferral = calculateReferralReward(user.vipTier, user.referralMultiplier);
        const totalNewReward = newRewardsCount * rewardPerReferral;
        const newCoins = (currentUserData.coins || 0) + totalNewReward;
        const newReferralEarnings = (currentUserData.referralEarnings || 0) + totalNewReward;

        // Update user data
        const updates = {
          coins: newCoins,
          referralEarnings: newReferralEarnings,
          referralRewardedCount: confirmedCount,
          updatedAt: new Date().toISOString()
        };

        console.log(`[Referral] 🔄 Updating user rewards for ${userId}:`, updates);
        
        const success = await safeUpdate(userPath, updates);
        
        if (success) {
          console.log(`[Referral] ✅ Successfully updated user rewards for ${userId}`);
          
          // Notify parent component about the update ONLY after successful DB write
          if (onUserUpdate) {
            onUserUpdate({
              coins: newCoins,
              referralEarnings: newReferralEarnings,
              referralRewardedCount: confirmedCount
            });
          }

          // Show success toast
          toast.success(
            `🎉 Earned ${totalNewReward} coins from ${newRewardsCount} confirmed referral${newRewardsCount > 1 ? 's' : ''}!`,
            { duration: 5000 }
          );

          console.log(`[Referral] ✅ Rewarded ${totalNewReward} coins for ${newRewardsCount} new confirmed referrals`);
        } else {
          console.error(`[Referral] ❌ Failed to update user rewards for ${userId}`);
          toast.error('Failed to update rewards. Please try again.');
        }
      }
    } catch (error) {
      console.error('[Referral] Error updating user rewards:', error);
    } finally {
      setIsProcessingRewards(false);
    }
  }, [user.vipTier, user.referralMultiplier, isProcessingRewards, getCurrentUserId, onUserUpdate]);

  // Function to listen to referred users and track their status
  useEffect(() => {
    if (!realtimeDb) return;

    const userId = getCurrentUserId();
    console.log(`[Referral] Setting up referral tracking for user ${userId}`);

    // Clean up existing listeners
    listenersRef.current.forEach(cleanup => cleanup());
    listenersRef.current = [];

    // Listen to all users to find those referred by current user
    const usersRef = ref(realtimeDb, 'telegram_users');
    
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const allUsers = snapshot.val();
      const referred: ReferredUser[] = [];
      let confirmedCount = 0;

      // Find users referred by current user
      Object.entries(allUsers).forEach(([referredUserId, userData]: [string, any]) => {
        if (userData.referredBy === userId) {
          const referredUser: ReferredUser = {
            id: referredUserId,
            firstName: userData.firstName || 'User',
            lastName: userData.lastName || '',
            username: userData.username,
            referralStatus: userData.referralStatus || 'pending',
            createdAt: userData.createdAt || new Date().toISOString()
          };
          
          referred.push(referredUser);
          
          if (referredUser.referralStatus === 'confirmed') {
            confirmedCount++;
            
            // Auto-trigger confirm-referral API for newly confirmed referrals
            triggerConfirmReferralIfNeeded(referredUserId, referredUser.referralStatus);
          }
        }
      });

      // Sort by creation date (newest first)
      referred.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setReferredUsers(referred);
      
      // Update rewards if confirmed count increased
      updateUserRewards(confirmedCount);
    }, (error) => {
      console.error('[Referral] Error listening to users:', error);
    });

    listenersRef.current.push(() => off(usersRef, 'value', unsubscribeUsers));

    // Cleanup function
    return () => {
      listenersRef.current.forEach(cleanup => cleanup());
      listenersRef.current = [];
    };
  }, [user.telegramId, user.vipTier, user.referralMultiplier, isProcessingRewards, getCurrentUserId, updateUserRewards]);

  // Cleanup listeners on component unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(cleanup => cleanup());
      listenersRef.current = [];
    };
  }, []);

  const copyReferralLink = async () => {
    console.log('Copy referral link clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('📋 Referral link copied to clipboard!');
      console.log('Referral link copied:', referralLink);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy link error:', error);
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopied(true);
        toast.success('📋 Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        toast.error('Failed to copy link. Please copy manually.');
      }
    }
  };

  const shareReferralLink = () => {
    console.log('Share referral link clicked');
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');
    telegram.shareReferralLink(user.telegramId);
  };

  const getReferralReward = () => {
    const baseReward = 100;
    return Math.floor(baseReward * user.referralMultiplier);
  };

  // Helper function to get time ago string
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Invite Friends</h1>
        <p className="text-white/90">
          Earn {getReferralReward()} coins for each friend who joins!
        </p>
        {user.vipTier !== 'free' && (
          <div className="mt-2 bg-white/20 rounded-lg px-3 py-1 inline-block">
            <span className="text-sm font-bold">
              🚀 {user.referralMultiplier}x Referral Bonus Active!
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-gray-800">
            {referredUsers.length}
          </div>
          <p className="text-gray-600 text-sm">Friends Invited</p>
          <div className="mt-2 text-xs text-gray-500">
            {referredUsers.filter(u => u.referralStatus === 'confirmed').length} confirmed
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-gray-800">
            {(user.referralEarnings || 0).toLocaleString()}
          </div>
          <p className="text-gray-600 text-sm">Coins Earned</p>
        </motion.div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Referral Link</h3>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-gray-600 text-sm break-all font-mono">
            {referralLink}
          </p>
        </div>

        <div className="flex space-x-3">
          <motion.button
            onClick={copyReferralLink}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
          >
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </motion.button>

          <motion.button
            onClick={shareReferralLink}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
          >
            📤 Share
          </motion.button>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">How Referrals Work</h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Share Your Link</h4>
              <p className="text-gray-600 text-sm">
                Send your referral link to friends via Telegram, WhatsApp, or any social media
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Friend Joins</h4>
              <p className="text-gray-600 text-sm">
                When your friend opens the Mini App through your link, they become your referral
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Earn Rewards</h4>
              <p className="text-gray-600 text-sm">
                You instantly receive {getReferralReward()} coins when they join!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIP Benefits */}
      {user.vipTier === 'free' && (
        <motion.div
          className="bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-2xl p-6"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-3">👑</span>
            <h3 className="text-lg font-bold text-gray-800">VIP Referral Benefits</h3>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>VIP 1: 1.5x referral rewards (150 coins per friend)</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>VIP 2: 2.0x referral rewards (200 coins per friend)</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Bonus rewards for active referrals</span>
            </div>
          </div>
          
          <motion.button
            className="mt-4 bg-accent text-dark px-6 py-2 rounded-xl font-bold hover:bg-accent/90 transition-all"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            Upgrade to VIP
          </motion.button>
        </motion.div>
      )}

      {/* Recent Referrals */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Recent Referrals</h3>
          {isProcessingRewards && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>Processing rewards...</span>
            </div>
          )}
        </div>
        
        {referredUsers.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {referredUsers.map((referredUser) => {
              const displayName = referredUser.firstName + (referredUser.lastName ? ` ${referredUser.lastName}` : '') || referredUser.username || 'Anonymous User';
              const isConfirmed = referredUser.referralStatus === 'confirmed';
              const joinedDate = new Date(referredUser.createdAt);
              const timeAgo = getTimeAgo(joinedDate);
              
              return (
                <motion.div
                  key={referredUser.id}
                  className={`flex items-center justify-between py-3 px-3 rounded-xl transition-all ${
                    isConfirmed ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isConfirmed ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className={`font-bold ${
                        isConfirmed ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {isConfirmed ? '✅' : '⏳'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {displayName}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {isConfirmed ? 'Confirmed' : 'Pending'} • {timeAgo}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${
                    isConfirmed ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {isConfirmed ? `+${getReferralReward()}` : `+${getReferralReward()}`}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-gray-600">No referrals yet</p>
            <p className="text-gray-500 text-sm">Start inviting friends to see them here!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Referral;