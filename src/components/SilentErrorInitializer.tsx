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

    console.log('[SilentError] Initialization completed');
  }, []);

  return null; // This component doesn't render anything
}