'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import toast from 'react-hot-toast';

interface ReferralProps {
  user: User;
}

const Referral = ({ user }: ReferralProps) => {
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const telegram = TelegramService.getInstance();
    const link = telegram.generateReferralLink(user.telegramId);
    setReferralLink(link);
  }, [user.telegramId]);

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
            {user.referralCount}
          </div>
          <p className="text-gray-600 text-sm">Friends Invited</p>
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

      {/* Recent Referrals (placeholder) */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Referrals</h3>
        
        {user.referralCount > 0 ? (
          <div className="space-y-3">
            {/* This would show actual referral data */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">👤</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Friend joined</p>
                  <p className="text-gray-600 text-sm">2 hours ago</p>
                </div>
              </div>
              <div className="text-accent font-bold">+{getReferralReward()}</div>
            </div>
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