export interface User {
  id: string;
  telegramId: string;
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  photoUrl?: string; // Added for Telegram API compatibility
  coins: number;
  xp: number;
  level: number;
  tier?: 'bronze' | 'diamond';
  vip_tier?: 'bronze' | 'diamond';
  vip_expiry?: number;
  vipTier: 'free' | 'vip1' | 'vip2';
  vipExpiry?: number;
  vipEndTime?: Date;
  farmingMultiplier: number;
  referralMultiplier: number;
  multiplier?: number;
  withdraw_limit?: number;
  referral_boost?: number;
  adsLimitPerDay: number;
  withdrawalLimit: number;
  minWithdrawal: number;
  referralCount: number;
  referralEarnings: number;
  referralRewardedCount?: number; // Track how many confirmed referrals have been rewarded
  referrerId?: string;
  referredBy?: string; // ID of the user who referred this user
  referralStatus?: 'pending' | 'confirmed'; // Status of this user's referral
  dailyStreak: number;
  lastClaimDate?: Date;
  farmingStartTime?: Date;
  farmingEndTime?: Date;
  languageCode?: string; // Added for Telegram API compatibility
  isPremium?: boolean; // Added for Telegram API compatibility
  badges?: Array<{
    type: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    unlockedAt: number;
  }>;
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
  type: 'link' | 'ads' | 'social' | 'referral' | 'farming' | 'daily';
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
  updatedAt?: Date;
}

export interface PaymentData {
  id: string;
  userId: string;
  amount: number; // in Stars
  tier: 'vip1' | 'vip2';
  status: 'pending' | 'completed' | 'failed';
  telegramPaymentId?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: {
    botMessageId?: string;
    invoiceId?: string;
  };
}

export interface ConversionData {
  id: string;
  userId: string;
  type: 'vip_upgrade' | 'task_completion' | 'referral_bonus' | 'farming_claim' | 'daily_claim';
  fromTier?: 'free' | 'vip1' | 'vip2';
  toTier?: 'free' | 'vip1' | 'vip2';
  coinsEarned?: number;
  paymentAmount?: number; // in Stars
  createdAt: Date;
  metadata?: {
    taskId?: string;
    referrerId?: string;
    farmingDuration?: number;
  };
}

export interface BotMessage {
  id: string;
  userId: string;
  type: 'payment_confirmation' | 'vip_upgrade' | 'welcome' | 'task_reminder';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  metadata?: {
    paymentId?: string;
    tier?: string;
    amount?: number;
  };
}

export interface DailyStats {
  totalUsers: number;
  activeVipUsers: number;
  totalCoinsDistributed: number;
  totalInrGenerated: number;
  pendingWithdrawals: number;
  totalPayments: number;
  totalConversions: number;
}