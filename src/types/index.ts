export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  coins: number;
  xp: number;
  level: number;
  vipTier: 'free' | 'vip1' | 'vip2';
  vipEndTime?: Date;
  farmingMultiplier: number;
  referralMultiplier: number;
  adsLimitPerDay: number;
  withdrawalLimit: number;
  minWithdrawal: number;
  referralCount: number;
  referralEarnings: number;
  referrerId?: string;
  dailyStreak: number;
  lastClaimDate?: Date;
  farmingStartTime?: Date;
  farmingEndTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VIPTier {
  tier: 'free' | 'vip1' | 'vip2';
  price: number; // in Stars
  farmingMultiplier: number;
  referralMultiplier: number;
  adsLimitPerDay: number;
  withdrawalLimit: number;
  minWithdrawal: number;
  duration: number; // in days
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'link' | 'ads' | 'social' | 'referral';
  url?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTask {
  id: string;
  userId: string;
  taskId: string;
  status: 'pending' | 'completed' | 'claimed';
  completedAt?: Date;
  claimedAt?: Date;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number; // in INR
  upiId: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: Date;
  processedAt?: Date;
  adminNotes?: string;
}

export interface AdminSettings {
  inrExchangeRate: number; // coins to ₹1
  baseAdReward: number;
  vipTiers: {
    vip1: VIPTier;
    vip2: VIPTier;
  };
  secretKey: string;
}

export interface DailyStats {
  totalUsers: number;
  activeVipUsers: number;
  totalCoinsDistributed: number;
  totalInrGenerated: number;
  pendingWithdrawals: number;
}