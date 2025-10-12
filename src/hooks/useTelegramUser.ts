import { useState, useEffect } from 'react';
import { getTelegramUser, UserData, sanitizeUserData } from '@/lib/telegramUser';

/**
 * Simple hook to get Telegram user data
 */
export function useTelegramUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const telegramUser = getTelegramUser();
      
      if (telegramUser) {
        const userData = sanitizeUserData(telegramUser);
        setUser(userData);
      } else {
        setError('No Telegram user data available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user data');
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, error };
}