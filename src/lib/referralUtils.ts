import { safeGet } from './firebaseUtils';

export interface ReferralData {
  referralCount: number;
  totalReferralReward: number;
}

/**
 * Fetch referral data for a user from Firebase Realtime Database
 * Returns default values if data doesn't exist or fetch fails
 */
export const fetchReferralData = async (userId: string): Promise<ReferralData> => {
  try {
    if (!userId) {
      console.warn('[Referral Utils] No user ID provided');
      return { referralCount: 0, totalReferralReward: 0 };
    }

    // Fetch user's referral data from Firebase
    const userPath = `telegram_users/${userId}`;
    const userData = await safeGet(userPath);

    if (!userData) {
      console.log('[Referral Utils] No user data found, returning defaults');
      return { referralCount: 0, totalReferralReward: 0 };
    }

    // Extract referral data with safe defaults
    const referralCount = userData.referralCount || 0;
    const totalReferralReward = userData.referralEarnings || 0;

    console.log('[Referral Utils] Referral data fetched:', {
      userId,
      referralCount,
      totalReferralReward
    });

    return {
      referralCount,
      totalReferralReward
    };
  } catch (error) {
    console.error('[Referral Utils] Error fetching referral data:', error);
    // Return safe defaults on error
    return { referralCount: 0, totalReferralReward: 0 };
  }
};

/**
 * Get referral statistics path for a user
 */
export const getReferralPath = (userId: string): string => {
  return `referrals/${userId}`;
};

/**
 * Calculate referral reward based on user's VIP tier
 */
export const calculateReferralReward = (vipTier: string = 'free', baseReward: number = 100): number => {
  const multipliers: Record<string, number> = {
    'free': 1,
    'vip1': 1.5,
    'vip2': 2.0
  };

  const multiplier = multipliers[vipTier] || 1;
  return Math.floor(baseReward * multiplier);
};