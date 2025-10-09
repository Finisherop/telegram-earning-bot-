'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { createUser, getUser } from '@/lib/firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const telegram = TelegramService.getInstance();
        const telegramUser = telegram.getUser();
        const startParam = telegram.getStartParam();

        let userId: string;
        let userData: Partial<User>;

        if (telegramUser) {
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
        }

        // Check if user exists in Firebase
        let existingUser = await getUser(userId);
        
        if (!existingUser) {
          // Create new user
          await createUser(userData);
          existingUser = await getUser(userId);
        }

        if (existingUser) {
          setUser(existingUser);
        } else {
          // Create a default user if Firebase fails
          const defaultUser: User = {
            id: userId,
            telegramId: userId,
            username: userData.username || 'user',
            firstName: userData.firstName || 'User',
            lastName: userData.lastName || '',
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
          setUser(defaultUser);
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

    initializeUser();
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