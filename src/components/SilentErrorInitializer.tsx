'use client';

import { useEffect } from 'react';

/**
 * Silent Error Initializer Component
 * 
 * This component sets up silent error handling for the entire app,
 * ensuring no Firebase or network errors are shown to users.
 */
export default function SilentErrorInitializer() {
  useEffect(() => {
    // Setup silent error handling
    const setupSilentHandling = async () => {
      try {
        const { setupSilentErrorHandling } = await import('@/lib/silentErrorHandler');
        const { overrideToastMethods } = await import('@/lib/silentToast');
        
        setupSilentErrorHandling();
        overrideToastMethods();
        
        console.log('[SilentError] Error handling and toast overrides initialized for Telegram WebApp');
      } catch (error) {
        console.warn('[SilentError] Failed to setup silent error handling:', error);
      }
    };

    setupSilentHandling();

    // Also initialize the Telegram-optimized Firebase
    const initTelegramFirebase = async () => {
      try {
        const { telegramFirebase } = await import('@/lib/firebaseTelegramOptimized');
        await telegramFirebase.getServices();
        console.log('[TelegramFirebase] Initialized successfully');
      } catch (error) {
        console.warn('[TelegramFirebase] Initialization failed, running in offline mode');
      }
    };

    initTelegramFirebase();

    // Initialize offline data manager
    const initOfflineManager = async () => {
      try {
        const { offlineDataManager } = await import('@/lib/offlineDataManager');
        console.log('[OfflineManager] Initialized successfully');
      } catch (error) {
        console.warn('[OfflineManager] Initialization failed');
      }
    };

    initOfflineManager();
  }, []);

  return null; // This component doesn't render anything
}