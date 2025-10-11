'use client';

import { useEffect, useState } from 'react';
import { telegramUserCapture, TelegramUserData } from '@/lib/telegramUserCapture';

interface BrowserUserData {
  id: string | number;
  first_name: string;
  firstName?: string; // Support both naming conventions
  last_name?: string;
  lastName?: string; // Support both naming conventions
  username?: string;
  capturedAt: string;
  lastSeen: string;
  userAgent?: string;
  source: 'browser';
}

// Union type with proper fallbacks
type UserDataType = TelegramUserData | BrowserUserData | null;

export default function UserCaptureInitializer() {
  const [userData, setUserData] = useState<UserDataType>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const initializeCapture = async () => {
      if (isCapturing) return;
      
      setIsCapturing(true);
      console.log('[UserCaptureInitializer] Initializing user data capture...');

      try {
        // Wait a bit for Telegram WebApp to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Capture user data automatically
        const capturedData = await telegramUserCapture.captureUserData();
        
        if (capturedData) {
          setUserData(capturedData);
          console.log('[UserCaptureInitializer] User data captured successfully:', capturedData);
          
          // Store in global window for other components to access
          if (typeof window !== 'undefined') {
            (window as any).__TELEGRAM_USER_DATA__ = capturedData;
            
            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('telegramUserCaptured', {
              detail: capturedData
            }));
          }
        } else {
          console.warn('[UserCaptureInitializer] Failed to capture user data');
        }
      } catch (error) {
        console.error('[UserCaptureInitializer] Error during initialization:', error);
      } finally {
        setIsCapturing(false);
      }
    };

    // Initialize capture
    initializeCapture();

    // Listen for Telegram WebApp ready event
    const handleTelegramReady = () => {
      console.log('[UserCaptureInitializer] Telegram WebApp ready event received');
      if (!userData && !isCapturing) {
        initializeCapture();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('telegramWebAppReady', handleTelegramReady);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('telegramWebAppReady', handleTelegramReady);
      }
    };
  }, [isCapturing, userData]);

  // Update last seen periodically
  useEffect(() => {
    if (!userData) return;

    const interval = setInterval(() => {
      try {
        telegramUserCapture.updateLastSeen();
      } catch (error) {
        console.warn('[UserCaptureInitializer] Error updating last seen:', error);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [userData]);

  // This component doesn't render anything visible
  return null;
}