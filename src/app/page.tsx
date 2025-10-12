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
      
      // Example: Save user to Realtime Database
      if (user && user.id) {
        setTelegramUserData(user.id, user).then(success => {
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
      {/* Telegram User Welcome Message */}
      {user && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 text-center">
          <h2 className="text-lg font-bold">Welcome, {user.first_name}!</h2>
          {user.username && (
            <p className="text-sm opacity-90">@{user.username}</p>
          )}
        </div>
      )}
      
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