'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import BackgroundDataLoader from '@/components/BackgroundDataLoader';

export default function Home() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-xl font-bold">Loading Telegram Mini App...</h1>
          <p className="text-white/80 mt-2">Initializing your experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
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