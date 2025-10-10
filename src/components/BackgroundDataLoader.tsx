'use client';

import { useEffect } from 'react';
import { telegramUserCapture } from '@/lib/telegramUserCapture';

/**
 * Background Data Loader Component
 * 
 * This component handles all complex data loading operations in the background
 * without blocking the UI. It runs silently and updates data stores as needed.
 */
const BackgroundDataLoader = () => {
  useEffect(() => {
    const initializeBackgroundLoading = async () => {
      try {
        console.log('[BackgroundDataLoader] Starting background data initialization...');
        
        // Initialize user capture in background
        await telegramUserCapture.initialize();
        
        // Capture user data if not already available
        const userData = telegramUserCapture.getUserData();
        if (!userData) {
          console.log('[BackgroundDataLoader] Capturing user data in background...');
          await telegramUserCapture.captureUserData();
        }
        
        // Set up periodic data updates
        const updateInterval = setInterval(async () => {
          try {
            await telegramUserCapture.updateLastSeen();
          } catch (error) {
            console.warn('[BackgroundDataLoader] Failed to update last seen:', error);
          }
        }, 30000); // Every 30 seconds
        
        console.log('[BackgroundDataLoader] Background data loading completed successfully');
        
        return () => {
          clearInterval(updateInterval);
        };
        
      } catch (error) {
        console.error('[BackgroundDataLoader] Background loading failed:', error);
        // Don't throw error - let the app continue working
      }
    };

    initializeBackgroundLoading();
  }, []);

  // This component doesn't render anything - it just handles background tasks
  return null;
};

export default BackgroundDataLoader;