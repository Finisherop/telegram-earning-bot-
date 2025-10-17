/**
 * React Hook for Telegram User Sync
 * 
 * Provides a simple way to use the Telegram user sync functionality
 * in React components with proper lifecycle management
 */

import { useEffect, useState } from 'react';
import { syncTelegramUser } from '@/lib/telegramUserSync';

interface UseTelegramUserSyncReturn {
  isInitialized: boolean;
  error: string | null;
}

/**
 * Hook to initialize Telegram user sync
 * Only runs once when component mounts
 */
export const useTelegramUserSync = (): UseTelegramUserSyncReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initSync = async () => {
      try {
        await syncTelegramUser();
        if (isMounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Sync failed');
          setIsInitialized(false);
        }
      }
    };

    initSync();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isInitialized,
    error
  };
};

export default useTelegramUserSync;