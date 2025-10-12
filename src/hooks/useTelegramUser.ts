import { useState, useEffect } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Simple hook to get Telegram user data from WebApp SDK only
 */
export function useTelegramUser() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Get user data directly from Telegram WebApp SDK
      const tg = (window as any).Telegram?.WebApp;
      
      if (tg?.initDataUnsafe?.user) {
        const telegramUser = tg.initDataUnsafe.user;
        
        // Validate user data
        if (telegramUser.id && telegramUser.first_name) {
          setUser({
            id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || '',
            username: telegramUser.username || '',
            photo_url: telegramUser.photo_url,
            language_code: telegramUser.language_code || 'en',
            is_premium: telegramUser.is_premium || false
          });
        } else {
          setError('Invalid Telegram user data');
        }
      } else {
        // Fallback for browser testing
        const browserId = localStorage.getItem('browserId') || `browser_${Date.now()}`;
        localStorage.setItem('browserId', browserId);
        
        setUser({
          id: parseInt(browserId.replace('browser_', '')) || Date.now(),
          first_name: 'Browser User',
          last_name: '',
          username: 'browseruser',
          language_code: 'en',
          is_premium: false
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user data');
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, error };
}