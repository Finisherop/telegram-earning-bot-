'use client';

import { useState, useEffect } from 'react';
import { telegramUserCapture, TelegramUserData } from '@/lib/telegramUserCapture';

interface BrowserUserData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  capturedAt: string;
  lastSeen: string;
  userAgent?: string;
  source: 'browser';
}

type UserData = TelegramUserData | BrowserUserData;

export function useTelegramUser() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if data is already available globally
        if (typeof window !== 'undefined' && (window as any).__TELEGRAM_USER_DATA__) {
          const globalData = (window as any).__TELEGRAM_USER_DATA__;
          setUserData(globalData);
          setIsLoading(false);
          return;
        }

        // Try to get from capture service
        const existingData = telegramUserCapture.getUserData();
        if (existingData) {
          setUserData(existingData);
          setIsLoading(false);
          return;
        }

        // Try to capture new data
        const capturedData = await telegramUserCapture.captureUserData();
        if (capturedData) {
          setUserData(capturedData);
        } else {
          setError('Failed to capture user data');
        }
      } catch (err) {
        console.error('[useTelegramUser] Error loading user data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();

    // Listen for user data capture events
    const handleUserCaptured = (event: CustomEvent) => {
      console.log('[useTelegramUser] User captured event received:', event.detail);
      setUserData(event.detail);
      setIsLoading(false);
      setError(null);
    };

    window.addEventListener('telegramUserCaptured', handleUserCaptured as EventListener);

    return () => {
      window.removeEventListener('telegramUserCaptured', handleUserCaptured as EventListener);
    };
  }, []);

  const updateLastSeen = async () => {
    try {
      await telegramUserCapture.updateLastSeen();
    } catch (err) {
      console.error('[useTelegramUser] Error updating last seen:', err);
    }
  };

  const refreshUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newData = await telegramUserCapture.captureUserData();
      if (newData) {
        setUserData(newData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userData,
    isLoading,
    error,
    updateLastSeen,
    refreshUserData,
    // Helper properties
    isAuthenticated: !!userData,
    isTelegramUser: userData?.source === 'telegram',
    isBrowserUser: userData?.source === 'browser',
    userId: userData?.id?.toString() || null,
    displayName: userData?.first_name || 'Anonymous User'
  };
}