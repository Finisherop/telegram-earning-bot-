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