'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import BackgroundDataLoader from '@/components/BackgroundDataLoader';
import FirebaseSafetyValidator from '@/components/FirebaseSafetyValidator';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp.js';
import { getTelegramUserData, setTelegramUserData } from '@/lib/firebaseClient.js';

export default function Home() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { tg, user, isLoading: telegramLoading } = useTelegramWebApp() as any;

  useEffect(() => {
    // Log Telegram user info once loaded
    if (user && tg) {
      console.log('[Telegram WebApp] ✅ User loaded:', user);
      console.log('[Telegram WebApp] ✅ WebApp instance ready:', tg);
      console.log('[Integration] 🎉 Both Telegram and Firebase are ready!');
      
      // Send referral confirmation to backend
      if (user && user.id) {
        // Call /confirm-referral endpoint
        fetch('/api/confirm-referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('[Referral] ✅ App open confirmed for user:', user.id);
          } else {
            console.warn('[Referral] ⚠️ Failed to confirm app open:', data.error);
          }
        })
        .catch(error => {
          console.error('[Referral] ❌ Error confirming app open:', error);
        });

        // Example: Save user to Realtime Database
        const userData = {
          id: user.id,
          name: `${user.first_name} ${user.last_name || ''}`.trim(),
          profile_pic: user.photo_url || ''
        };
        setTelegramUserData(userData).then(success => {
          if (success) {
            console.log('[Firebase] ✅ Telegram user saved to Realtime Database successfully');
          }
        });
      }
    }

    // Check if we're in browser mode and need setup
    if (typeof window !== 'undefined') {
      const isTelegramWebApp = !!(window as any).Telegram?.WebApp;
      
      if (!isTelegramWebApp) {
        // Browser mode - check if user data exists
        const hasUserData = localStorage.getItem('browserUserData');
        const urlParams = new URLSearchParams(window.location.search);
        const isAdminMode = urlParams.get('admin') === 'true';
        
        if (!hasUserData && !isAdminMode) {
          // Redirect to setup with referral if present
          const referral = urlParams.get('ref') || urlParams.get('start') || urlParams.get('startapp');
          let setupUrl = '/setup';
          if (referral) {
            setupUrl += `?ref=${encodeURIComponent(referral)}`;
          }
          router.push(setupUrl);
          return;
        }
      }
      
      // Check for admin mode
      const urlParams = new URLSearchParams(window.location.search);
      const adminParam = urlParams.get('admin');
      
      if (adminParam === 'true') {
        setIsAdmin(true);
        console.log('Admin mode activated');
      }
    }
    
    setIsLoading(false);
  }, [router, user, tg]);

  if (isLoading || telegramLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          {telegramLoading ? (
            <>
              <h1 className="text-xl font-bold">Waiting for Telegram WebApp...</h1>
              <p className="text-white/80 mt-2">Connecting to Telegram</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">Loading Telegram Mini App...</h1>
              <p className="text-white/80 mt-2">Initializing your experience</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {/* Firebase Safety Validator - shows validation status */}
      <FirebaseSafetyValidator />
      
      {/* Background Data Loader - handles all complex loading silently */}
      <BackgroundDataLoader />
      
      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <UserDashboard />
      )}
    </div>
  );
}