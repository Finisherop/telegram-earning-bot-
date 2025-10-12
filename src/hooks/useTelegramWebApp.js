'use client';

import { useState, useEffect } from 'react';

/**
 * React hook for Telegram WebApp integration
 * Detects and initializes Telegram.WebApp on the client side
 * Returns { tg, user } where user is tg.initDataUnsafe.user
 * Handles fallback or warning if Telegram isn't detected
 */
export function useTelegramWebApp() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    console.log('[useTelegramWebApp] Initializing Telegram WebApp hook...');

    const initializeTelegram = () => {
      try {
        // Check if Telegram WebApp is available
        if (window.Telegram && window.Telegram.WebApp) {
          const telegramWebApp = window.Telegram.WebApp;
          
          console.log('[useTelegramWebApp] Telegram WebApp detected:', telegramWebApp);
          
          // Initialize WebApp
          if (typeof telegramWebApp.ready === 'function') {
            telegramWebApp.ready();
            console.log('[useTelegramWebApp] Telegram WebApp ready() called');
          }
          
          // Expand the WebApp
          if (typeof telegramWebApp.expand === 'function') {
            telegramWebApp.expand();
            console.log('[useTelegramWebApp] Telegram WebApp expanded');
          }
          
          // Set theme colors
          if (typeof telegramWebApp.setHeaderColor === 'function') {
            telegramWebApp.setHeaderColor('#0088cc');
          }
          
          if (typeof telegramWebApp.setBackgroundColor === 'function') {
            telegramWebApp.setBackgroundColor('#ffffff');
          }
          
          setTg(telegramWebApp);
          
          // Extract user data if available
          if (telegramWebApp.initDataUnsafe && telegramWebApp.initDataUnsafe.user) {
            const telegramUser = telegramWebApp.initDataUnsafe.user;
            console.log('[useTelegramWebApp] Telegram user data:', telegramUser);
            setUser(telegramUser);
          } else {
            console.warn('[useTelegramWebApp] No user data available in initDataUnsafe');
            setUser(null);
          }
          
          setError(null);
          console.log('[useTelegramWebApp] ✅ Successfully initialized Telegram WebApp');
          console.log('[useTelegramWebApp] 📱 Telegram WebApp is ready for use!');
          
        } else {
          // Fallback for non-Telegram environments (browser testing)
          console.log('[useTelegramWebApp] Running in browser mode (not Telegram WebApp)');
          setTg(null);
          setUser(null);
          setError(null); // Don't treat this as an error for browser testing
        }
      } catch (err) {
        console.error('[useTelegramWebApp] Error initializing Telegram WebApp:', err);
        setError(err.message || 'Failed to initialize Telegram WebApp');
        setTg(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for Telegram WebApp script to load
    const checkTelegramAvailability = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        initializeTelegram();
      } else {
        // Check if the script is still loading
        const telegramScript = document.querySelector('script[src*="telegram-web-app.js"]');
        if (telegramScript) {
          // Script exists, wait a bit more
          setTimeout(checkTelegramAvailability, 100);
        } else {
          // No script found, probably not in Telegram environment
          console.warn('[useTelegramWebApp] Telegram WebApp script not found');
          setError('Telegram WebApp script not loaded');
          setTg(null);
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Start checking for Telegram availability
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkTelegramAvailability);
    } else {
      // DOM is already ready, check immediately
      setTimeout(checkTelegramAvailability, 100);
    }

    // Cleanup
    return () => {
      document.removeEventListener('DOMContentLoaded', checkTelegramAvailability);
    };
  }, []);

  return {
    tg,
    user,
    isLoading,
    error,
    isInTelegram: tg !== null
  };
}

export default useTelegramWebApp;