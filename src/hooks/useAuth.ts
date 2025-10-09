'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { createUser, getUser } from '@/lib/firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const telegram = TelegramService.getInstance();
        const telegramUser = telegram.getUser();
        const startParam = telegram.getStartParam();

        if (!telegramUser) {
          // For development, create a mock user
          const mockUser: User = {
            id: 'dev_user_123',
            telegramId: 'dev_user_123',
            username: 'dev_user',
            firstName: 'Dev',
            lastName: 'User',
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
          setUser(mockUser);
          setLoading(false);
          return;
        }

        const telegramId = telegramUser.id.toString();
        
        // Check if user exists in Firebase
        let existingUser = await getUser(telegramId);
        
        if (!existingUser) {
          // Create new user
          await createUser({
            telegramId,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            profilePic: telegramUser.photo_url,
            referrerId: startParam || undefined, // This will be the referrer's ID
          });
          
          existingUser = await getUser(telegramId);
        }

        setUser(existingUser);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize user');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  const refreshUser = async () => {
    if (user) {
      const updatedUser = await getUser(user.telegramId);
      setUser(updatedUser);
    }
  };

  return {
    user,
    loading,
    error,
    refreshUser,
  };
};