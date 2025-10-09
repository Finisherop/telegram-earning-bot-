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
        
        // Wait for Telegram service to be initialized
        console.log('Waiting for Telegram service initialization...');
        await telegram.waitForInitialization();
        console.log('Telegram service initialized, getting user data...');
        
        const telegramUser = telegram.getUser();
        const startParam = telegram.getStartParam();

        // Check if user mode is enabled via URL parameter
        const isUserMode = typeof window !== 'undefined' && 
          new URLSearchParams(window.location.search).get('user') === 'true';

        if (!telegramUser && !isUserMode) {
          console.log('No Telegram user data and not in user mode');
          setLoading(false);
          return;
        }

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
          // Mock user for testing
          userId = 'test_user_123';
          userData = {
            telegramId: userId,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            referrerId: startParam || undefined,
          };
        }

        console.log('Initializing user with ID:', userId);
        
        // Check if user exists in Firebase
        let existingUser = await getUser(userId);
        
        if (!existingUser) {
          console.log('Creating new user in Firebase');
          // Create new user
          await createUser(userData);
          existingUser = await getUser(userId);
        }

        if (existingUser) {
          setUser(existingUser);
          console.log('User initialized successfully:', existingUser);
        } else {
          throw new Error('Failed to create or retrieve user');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize user');
        
        // Fallback: create a local mock user for development
        if (process.env.NODE_ENV === 'development') {
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
          console.log('Using fallback mock user for development');
        }
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