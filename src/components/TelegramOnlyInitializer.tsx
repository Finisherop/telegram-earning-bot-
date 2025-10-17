/**
 * Telegram Only Initializer
 * 
 * Initializes ONLY real Telegram users - NO browser fallbacks
 * Uses the clean Firebase writer that respects telegram_users/<telegramId> path
 */

'use client';

import { useEffect, useState } from 'react';
import { writeTelegramUserToFirebase } from '@/lib/telegramFirebaseWriter';

interface InitStatus {
  isTelegramWebApp: boolean;
  isInitialized: boolean;
  userId: string | null;
  error: string | null;
}

const TelegramOnlyInitializer = () => {
  const [status, setStatus] = useState<InitStatus>({
    isTelegramWebApp: false,
    isInitialized: false,
    userId: null,
    error: null
  });

  useEffect(() => {
    const initializeTelegramUser = async () => {
      try {
        // Wait for Telegram WebApp to be ready
        let attempts = 0;
        const maxAttempts = 25; // 5 seconds with 200ms intervals

        const checkTelegram = (): Promise<any> => {
          return new Promise((resolve) => {
            const check = () => {
              attempts++;
              
              const telegram = (window as any).Telegram?.WebApp;
              const user = telegram?.initDataUnsafe?.user;

              if (user?.id) {
                console.log('[TelegramOnly] 👤 Real Telegram user found:', user.id);
                resolve(user);
                return;
              }

              if (attempts >= maxAttempts) {
                console.log('[TelegramOnly] ⚠️ Telegram WebApp not available - exiting silently');
                resolve(null);
                return;
              }

              setTimeout(check, 200);
            };

            check();
          });
        };

        const telegramUser = await checkTelegram();

        if (!telegramUser) {
          // Not in Telegram WebApp - set status and exit
          setStatus({
            isTelegramWebApp: false,
            isInitialized: true,
            userId: null,
            error: null
          });
          return;
        }

        // Real Telegram user found
        const userId = telegramUser.id.toString();
        
        setStatus({
          isTelegramWebApp: true,
          isInitialized: false,
          userId,
          error: null
        });

        // Write to Firebase
        console.log('[TelegramOnly] 🔥 Writing Telegram user to Firebase...');
        const success = await writeTelegramUserToFirebase();

        if (success) {
          console.log('[TelegramOnly] ✅ Telegram user successfully written to Firebase');
          setStatus(prev => ({
            ...prev,
            isInitialized: true,
            error: null
          }));
        } else {
          console.error('[TelegramOnly] ❌ Failed to write Telegram user to Firebase');
          setStatus(prev => ({
            ...prev,
            isInitialized: true,
            error: 'Firebase write failed'
          }));
        }

      } catch (error) {
        console.error('[TelegramOnly] ❌ Initialization error:', error);
        setStatus(prev => ({
          ...prev,
          isInitialized: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    initializeTelegramUser();
  }, []);

  // Show debug info only if debug mode is enabled
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    return (
      <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs z-50 max-w-xs">
        <div className="font-semibold text-gray-800 mb-2">🔥 Telegram Firebase Status</div>
        
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Telegram WebApp:</span>
            <span className={status.isTelegramWebApp ? 'text-green-600' : 'text-red-600'}>
              {status.isTelegramWebApp ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Initialized:</span>
            <span className={status.isInitialized ? 'text-green-600' : 'text-yellow-600'}>
              {status.isInitialized ? '✅ Yes' : '⏳ Loading'}
            </span>
          </div>
          
          {status.userId && (
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="text-blue-600 font-mono">{status.userId}</span>
            </div>
          )}
          
          {status.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
              <div className="font-medium">Error:</div>
              <div className="break-words">{status.error}</div>
            </div>
          )}
          
          {!status.isTelegramWebApp && status.isInitialized && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
              <div className="font-medium">Not Telegram WebApp</div>
              <div>No user data will be created</div>
            </div>
          )}
          
          {status.isTelegramWebApp && status.isInitialized && !status.error && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
              <div className="font-medium">✅ Success</div>
              <div>User saved to telegram_users/{status.userId}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Silent operation in production
  return null;
};

export default TelegramOnlyInitializer;