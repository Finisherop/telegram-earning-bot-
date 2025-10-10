'use client';

import { useState, useEffect } from 'react';
import { User, PaymentData, ConversionData, BotMessage } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { getUser, initializeUser } from '@/lib/firebaseService';
import { 
  subscribeToUserWithExtendedData, 
  safeUpdateUserWithRetry,
  cleanupAllListeners 
} from '@/lib/enhancedFirebaseService';

interface EnhancedAuthData {
  user: User | null;
  payments: PaymentData[];
  conversions: ConversionData[];
  messages: BotMessage[];
  isLoading: boolean;
  lastUpdate: Date | null;
}

export const useEnhancedAuth = () => {
  const [authData, setAuthData] = useState<EnhancedAuthData>({
    user: null,
    payments: [],
    conversions: [],
    messages: [],
    isLoading: true,
    lastUpdate: null,
  });

  useEffect(() => {
    let unsubscribeExtended: (() => void) | null = null;

    const initializeEnhancedAuth = async () => {
      try {
        console.log('[Enhanced Auth] Initializing enhanced authentication...');
        
        // Wait for Telegram service to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const telegram = TelegramService.getInstance();
        const telegramUser = telegram.getUser();
        const startParam = telegram.getStartParam();

        console.log('[Enhanced Auth] Telegram data:', { telegramUser, startParam });

        let userId: string;
        let userData: Partial<User>;

        if (telegramUser && telegramUser.id && telegramUser.id > 0) {
          // Real Telegram user or valid browser user
          userId = telegramUser.id.toString();
          userData = {
            telegramId: userId,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            profilePic: telegramUser.photo_url,
            referrerId: startParam || undefined,
          };
          console.log('[Enhanced Auth] Using authenticated user:', userData);
        } else {
          console.warn('[Enhanced Auth] No valid user data available');
          setAuthData(prev => ({ ...prev, isLoading: false }));
          return;
        }

        try {
          // Initialize or get existing user
          let existingUser = await getUser(userId);
          
          if (!existingUser) {
            console.log('[Enhanced Auth] Creating new user:', userId);
            existingUser = await initializeUser(userId);
          }
          
          // Update user with latest Telegram data using enhanced service
          existingUser = await safeUpdateUserWithRetry(userId, {
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            profilePic: telegramUser.photo_url,
          });
          
          // Handle referral for new users
          if (startParam && startParam !== userId && existingUser.createdAt) {
            const createdTime = new Date(existingUser.createdAt).getTime();
            const now = new Date().getTime();
            const isNewUser = (now - createdTime) < 300000; // Created within last 5 minutes
            
            if (isNewUser && !existingUser.referrerId) {
              console.log('[Enhanced Auth] Processing referral for new user:', startParam);
              try {
                // Set referrer for new user
                await safeUpdateUserWithRetry(userId, {
                  referrerId: startParam,
                });
                
                // Add referral reward to referrer
                const referrer = await getUser(startParam);
                if (referrer) {
                  await safeUpdateUserWithRetry(startParam, {
                    referralCount: (referrer.referralCount || 0) + 1,
                    referralEarnings: (referrer.referralEarnings || 0) + 500,
                    coins: (referrer.coins || 0) + 500,
                  });
                  console.log('[Enhanced Auth] Referral reward given to:', startParam);
                }
              } catch (referralError) {
                console.error('[Enhanced Auth] Error processing referral:', referralError);
              }
            }
          }

          // Set up enhanced real-time listener for user data with payments, conversions, and messages
          console.log('[Enhanced Auth] Setting up enhanced real-time listener for user:', userId);
          unsubscribeExtended = subscribeToUserWithExtendedData(
            userId,
            ({ user: updatedUser, payments, conversions, messages }) => {
              console.log('[Enhanced Auth] Enhanced real-time update received:', {
                user: !!updatedUser,
                payments: payments.length,
                conversions: conversions.length,
                messages: messages.length,
              });

              setAuthData({
                user: updatedUser,
                payments,
                conversions,
                messages,
                isLoading: false,
                lastUpdate: new Date(),
              });
            }
          );

        } catch (firebaseError) {
          console.error('[Enhanced Auth] Firebase error:', firebaseError);
          
          // Create a local user if Firebase fails temporarily
          const localUser: User = {
            id: userId,
            telegramId: userId,
            username: userData.username || 'user',
            firstName: userData.firstName || 'User',
            lastName: userData.lastName || '',
            profilePic: userData.profilePic,
            coins: 0,
            xp: 0,
            level: 1,
            vipTier: 'free',
            farmingMultiplier: 1.0,
            referralMultiplier: 1.0,
            adsLimitPerDay: 5,
            withdrawalLimit: 1,
            minWithdrawal: 200,
            referralCount: 0,
            referralEarnings: 0,
            referrerId: userData.referrerId,
            dailyStreak: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          setAuthData({
            user: localUser,
            payments: [],
            conversions: [],
            messages: [],
            isLoading: false,
            lastUpdate: new Date(),
          });
        }
      } catch (err) {
        console.error('[Enhanced Auth] Auth initialization error:', err);
        
        // Fallback user only if everything fails
        const fallbackUser: User = {
          id: 'error_user_' + Date.now(),
          telegramId: 'error_user_' + Date.now(),
          username: 'erroruser',
          firstName: 'Error User',
          lastName: '',
          coins: 0,
          xp: 0,
          level: 1,
          vipTier: 'free',
          farmingMultiplier: 1.0,
          referralMultiplier: 1.0,
          adsLimitPerDay: 5,
          withdrawalLimit: 1,
          minWithdrawal: 200,
          referralCount: 0,
          referralEarnings: 0,
          dailyStreak: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        setAuthData({
          user: fallbackUser,
          payments: [],
          conversions: [],
          messages: [],
          isLoading: false,
          lastUpdate: new Date(),
        });
      }
    };

    initializeEnhancedAuth();

    // Cleanup function
    return () => {
      console.log('[Enhanced Auth] Cleaning up enhanced auth listeners');
      if (unsubscribeExtended) {
        unsubscribeExtended();
      }
      cleanupAllListeners();
    };
  }, []);

  const refreshUser = async () => {
    if (authData.user) {
      const updatedUser = await getUser(authData.user.telegramId);
      if (updatedUser) {
        setAuthData(prev => ({
          ...prev,
          user: updatedUser,
          lastUpdate: new Date(),
        }));
      }
    }
  };

  return {
    ...authData,
    refreshUser,
  };
};