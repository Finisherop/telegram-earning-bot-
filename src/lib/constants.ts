import { VIPTier } from '@/types';

export const VIP_TIERS: Record<string, VIPTier> = {
  free: {
    tier: 'free',
    price: 0,
    farmingMultiplier: 1.0,
    referralMultiplier: 1.0,
    adsLimitPerDay: 5,
    withdrawalLimit: 1,
    minWithdrawal: 200,
    duration: 0,
  },
  vip1: {
    tier: 'vip1',
    price: 75,
    farmingMultiplier: 2.0,
    referralMultiplier: 1.5,
    adsLimitPerDay: -1, // unlimited
    withdrawalLimit: 3,
    minWithdrawal: 250,
    duration: 30,
  },
  vip2: {
    tier: 'vip2',
    price: 150,
    farmingMultiplier: 2.5,
    referralMultiplier: 2.0,
    adsLimitPerDay: -1, // unlimited
    withdrawalLimit: 5,
    minWithdrawal: 500,
    duration: 30,
  },
};

export const ADMIN_SECRET_KEY = 'TELEGRAM_MINI_APP_ADMIN_2024';

export const TELEGRAM_BOT_USERNAME = 'Finisher_task_bot';

export const DEFAULT_SETTINGS = {
  inrExchangeRate: 100, // 100 coins = ₹1
  baseAdReward: 10,
  vipTiers: {
    vip1: VIP_TIERS.vip1,
    vip2: VIP_TIERS.vip2,
  },
  secretKey: ADMIN_SECRET_KEY,
};

// New tier configurations for Telegram Stars payment system
export const TIER_CONFIGS = {
  bronze: {
    name: 'Bronze VIP',
    starCost: 75,
    duration: 30,
    farmingMultiplier: 2.0,
    referralMultiplier: 1.5,
    dailyWithdrawals: 3,
    badge: 'bronze_vip',
    color: '#CD7F32'
  },
  diamond: {
    name: 'Diamond VIP',
    starCost: 150,
    duration: 30,
    farmingMultiplier: 2.5,
    referralMultiplier: 2.0,
    dailyWithdrawals: 5,
    badge: 'diamond_vip',
    color: '#B9F2FF'
  }
};