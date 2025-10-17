/**
 * Telegram User Sync Initializer Component
 * 
 * Handles the initialization of Telegram user sync in React components
 * Runs once when the app starts and respects all requirements
 */

'use client';

import { useEffect } from 'react';
import { syncTelegramUser } from '@/lib/telegramUserSync';

const TelegramUserSyncInitializer = () => {
  useEffect(() => {
    // Initialize sync only once when component mounts
    const initializeSync = async () => {
      try {
        await syncTelegramUser();
      } catch (error) {
        // Silent error handling - only log if debug is enabled
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.error('[TelegramUserSyncInitializer] Sync failed:', error);
        }
      }
    };

    initializeSync();
  }, []); // Empty dependency array - run only once

  // This component renders nothing
  return null;
};

export default TelegramUserSyncInitializer;