'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { fetchReferralData, ReferralData } from '@/lib/referralUtils';

interface ReferralCardProps {
  user: User;
  className?: string;
}

const ReferralCard = ({ user, className = '' }: ReferralCardProps) => {
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCount: 0,
    totalReferralReward: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReferralData = async () => {
      if (!user?.telegramId) {
        console.warn('[ReferralCard] No telegram ID available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchReferralData(user.telegramId);
        setReferralData(data);
      } catch (error) {
        console.error('[ReferralCard] Error loading referral data:', error);
        // Keep default values on error
      } finally {
        setIsLoading(false);
      }
    };

    loadReferralData();
  }, [user?.telegramId]);

  // Use data from user object as fallback or primary source
  const displayReferralCount = user?.referralCount ?? referralData.referralCount;
  const displayTotalReward = user?.referralEarnings ?? referralData.totalReferralReward;

  return (
    <motion.div
      className={`bg-white rounded-2xl p-4 shadow-lg ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            👥 Referrals
          </h3>
          <p className="text-gray-600 text-sm">
            Invite friends and earn rewards
          </p>
        </div>
        <div className="text-2xl">
          🎯
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-12 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <motion.div
              className="text-2xl font-bold text-blue-600"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              key={displayReferralCount}
            >
              {displayReferralCount}
            </motion.div>
            <p className="text-blue-600 text-sm font-medium">Friends</p>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-xl">
            <motion.div
              className="text-2xl font-bold text-green-600"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              key={displayTotalReward}
            >
              {displayTotalReward}
            </motion.div>
            <p className="text-green-600 text-sm font-medium">Coins</p>
          </div>
        </div>
      )}

      {/* VIP Bonus Indicator */}
      {user?.vipTier && user.vipTier !== 'free' && (
        <div className="mt-3 p-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-purple-600 font-bold text-sm">
              👑 {user.referralMultiplier || 1}x VIP Bonus Active
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayReferralCount === 0 && (
        <div className="mt-3 text-center py-2">
          <p className="text-gray-500 text-sm">
            Start inviting friends to earn rewards!
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default ReferralCard;