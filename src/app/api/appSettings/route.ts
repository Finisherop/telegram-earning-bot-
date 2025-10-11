import { NextRequest, NextResponse } from 'next/server';
import { getAdminSettings } from '@/lib/enhancedFirebaseService';

// Cache settings for 5 minutes to reduce database calls
let settingsCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    console.log('[App Settings] Fetching global app settings');

    // Check cache first
    const now = Date.now();
    if (settingsCache && (now - settingsCache.timestamp) < CACHE_DURATION) {
      console.log('[App Settings] Returning cached settings');
      return NextResponse.json({
        success: true,
        settings: settingsCache.data,
        cached: true,
        cacheAge: now - settingsCache.timestamp,
      });
    }

    // Fetch fresh settings from database
    const adminSettings = await getAdminSettings();
    
    // Prepare public settings (exclude sensitive data)
    const publicSettings = {
      // Withdrawal conversion settings
      withdrawal: {
        conversionRate: adminSettings.inrExchangeRate, // coins per ₹1
        currency: 'INR',
        symbol: '₹',
        minWithdrawal: {
          free: 200,
          vip1: adminSettings.vipTiers.vip1.minWithdrawal,
          vip2: adminSettings.vipTiers.vip2.minWithdrawal,
        },
        withdrawalLimits: {
          free: 1,
          vip1: adminSettings.vipTiers.vip1.withdrawalLimit,
          vip2: adminSettings.vipTiers.vip2.withdrawalLimit,
        }
      },
      
      // VIP tier information (public data only)
      vipTiers: {
        vip1: {
          price: adminSettings.vipTiers.vip1.price,
          duration: adminSettings.vipTiers.vip1.duration,
          farmingMultiplier: adminSettings.vipTiers.vip1.farmingMultiplier,
          referralMultiplier: adminSettings.vipTiers.vip1.referralMultiplier,
          benefits: [
            `${adminSettings.vipTiers.vip1.farmingMultiplier}x Farming Speed`,
            `${adminSettings.vipTiers.vip1.referralMultiplier}x Referral Bonus`,
            `Up to ${adminSettings.vipTiers.vip1.withdrawalLimit} withdrawals/day`,
            'Unlimited ads',
            'Priority support'
          ]
        },
        vip2: {
          price: adminSettings.vipTiers.vip2.price,
          duration: adminSettings.vipTiers.vip2.duration,
          farmingMultiplier: adminSettings.vipTiers.vip2.farmingMultiplier,
          referralMultiplier: adminSettings.vipTiers.vip2.referralMultiplier,
          benefits: [
            `${adminSettings.vipTiers.vip2.farmingMultiplier}x Farming Speed`,
            `${adminSettings.vipTiers.vip2.referralMultiplier}x Referral Bonus`,
            `Up to ${adminSettings.vipTiers.vip2.withdrawalLimit} withdrawals/day`,
            'Unlimited ads',
            'Premium support',
            'Exclusive features'
          ]
        }
      },
      
      // Reward settings
      rewards: {
        baseAdReward: adminSettings.baseAdReward,
        baseFarmingReward: 120,
        baseDailyReward: 150,
        referralBonus: 500,
      },
      
      // App metadata
      app: {
        version: '2.0.0',
        lastUpdated: adminSettings.updatedAt?.toISOString() || new Date().toISOString(),
        features: {
          farming: true,
          vipTiers: true,
          referrals: true,
          tasks: true,
          withdrawals: true,
        }
      }
    };

    // Update cache
    settingsCache = {
      data: publicSettings,
      timestamp: now,
    };

    console.log('[App Settings] Settings fetched and cached successfully');

    return NextResponse.json({
      success: true,
      settings: publicSettings,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[App Settings] Failed to fetch settings:', error);
    
    // Return cached data if available, even if stale
    if (settingsCache) {
      console.log('[App Settings] Returning stale cached data due to error');
      return NextResponse.json({
        success: true,
        settings: settingsCache.data,
        cached: true,
        stale: true,
        error: 'Failed to fetch fresh data',
      });
    }

    // Return default settings if no cache available
    const defaultSettings = {
      withdrawal: {
        conversionRate: 100, // 100 coins = ₹1
        currency: 'INR',
        symbol: '₹',
        minWithdrawal: {
          free: 200,
          vip1: 250,
          vip2: 500,
        },
        withdrawalLimits: {
          free: 1,
          vip1: 3,
          vip2: 5,
        }
      },
      vipTiers: {
        vip1: {
          price: 75,
          duration: 30,
          farmingMultiplier: 2.0,
          referralMultiplier: 1.5,
        },
        vip2: {
          price: 150,
          duration: 30,
          farmingMultiplier: 2.5,
          referralMultiplier: 2.0,
        }
      },
      rewards: {
        baseAdReward: 10,
        baseFarmingReward: 120,
        baseDailyReward: 150,
        referralBonus: 500,
      },
      app: {
        version: '2.0.0',
        lastUpdated: new Date().toISOString(),
      }
    };

    return NextResponse.json({
      success: false,
      settings: defaultSettings,
      error: 'Using default settings due to database error',
      fallback: true,
    }, { status: 200 }); // Return 200 to prevent app crashes
  }
}