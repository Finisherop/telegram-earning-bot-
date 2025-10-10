'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { createUser, getUser, updateUser, initializeUser, safeUpdateUser, subscribeToUser, cleanupListeners } from '@/lib/firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const initializeUserAuth = async () => {
      try {
        // Wait a bit for Telegram service to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const telegram = TelegramService.getInstance();
        const telegramUser = telegram.getUser();
        const startParam = telegram.getStartParam();

        console.log('Initializing user with:', { telegramUser, startParam });

        let userId: string;
        let userData: Partial<User>;

        if (telegramUser && telegramUser.id !== 123456789) {
          // Real Telegram user
          userId = telegramUser.id.toString();
          userData = {
            telegramId: userId,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            profilePic: telegramUser.photo_url,
            referrerId: startParam || undefined,
          };
          console.log('Using real Telegram user:', userData);
        } else {
          // Default user - always create one
          userId = 'default_user_123';
          userData = {
            telegramId: userId,
            username: 'user',
            firstName: 'User',
            lastName: '',
            referrerId: startParam || undefined,
          };
          console.log('Using default user:', userData);
        }

        try {
          // Initialize user safely (creates if doesn't exist)
          let existingUser = await getUser(userId);
          
          if (!existingUser) {
            existingUser = await initializeUser(userId);
          }
          
          // Update user with Telegram data if we have it
          if (telegramUser && telegramUser.id !== 123456789) {
            existingUser = await safeUpdateUser(userId, {
              username: telegramUser.username,
              firstName: telegramUser.first_name,
              lastName: telegramUser.last_name,
              profilePic: telegramUser.photo_url,
              referrerId: startParam || undefined,
            });
          }
          
          // Handle referral if startParam exists and user is new
          if (startParam && startParam !== userId && existingUser.createdAt) {
            const createdTime = new Date(existingUser.createdAt).getTime();
            const now = new Date().getTime();
            const isNewUser = (now - createdTime) < 60000; // Created within last minute
            
            if (isNewUser) {
              console.log('Processing referral for new user:', startParam);
              try {
                // Add referral count to referrer using safe update
                const referrer = await getUser(startParam);
                if (referrer) {
                  await safeUpdateUser(startParam, {
                    referralCount: (referrer.referralCount || 0) + 1,
                    referralEarnings: (referrer.referralEarnings || 0) + 100, // 100 coins reward
                    coins: (referrer.coins || 0) + 100,
                  });
                  console.log('Referral reward given to:', startParam);
                }
              } catch (referralError) {
                console.error('Error processing referral:', referralError);
              }
            }
          }

          // Set up real-time listener for user data
          console.log('Setting up real-time listener for user:', userId);
          unsubscribeUser = subscribeToUser(userId, (updatedUser) => {
            if (updatedUser) {
              console.log('Real-time user update received:', updatedUser);
              setUser(updatedUser);
            }
          });

        } catch (firebaseError) {
          console.error('Firebase error, using local user:', firebaseError);
          
          // Create a local user if Firebase fails
          const localUser: User = {
            id: userId,
            telegramId: userId,
            username: userData.username || 'user',
            firstName: userData.firstName || 'User',
            lastName: userData.lastName || '',
            profilePic: userData.profilePic,
            coins: 1000,
            xp: 100,
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
          setUser(localUser);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        
        // Always provide a fallback user
        const fallbackUser: User = {
          id: 'fallback_user_123',
          telegramId: 'fallback_user_123',
          username: 'user',
          firstName: 'User',
          lastName: '',
          coins: 1000,
          xp: 100,
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
        setUser(fallbackUser);
      }
    };

    initializeUserAuth();

    // Cleanup function
    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  const refreshUser = async () => {
    if (user) {
      const updatedUser = await getUser(user.telegramId);
      if (updatedUser) {
        setUser(updatedUser);
      }
    }
  };

  return {
    user,
    refreshUser,
  };
};