'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTelegramUser } from '@/hooks/useTelegramUser';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import BackgroundDataLoader from '@/components/BackgroundDataLoader';

export default function Home() {
  const { user } = useAuth();
  const { userData: telegramUser, isLoading: telegramLoading, isTelegramUser, displayName } = useTelegramUser();
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

  // Remove complex loading screen - let the app load directly

  return (
    <div className="min-h-screen bg-light">
      {/* Background Data Loader - handles all complex loading silently */}
      <BackgroundDataLoader />
      
      {/* Enhanced Features Banner */}
      {user && !isAdmin && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 text-center">
          <p className="text-sm">
            🚀 <strong>New Enhanced Features Available!</strong> 
            <a 
              href="/enhanced" 
              className="ml-2 underline hover:text-blue-200 transition-colors"
            >
              Try Real-time Sync & Analytics →
            </a>
          </p>
        </div>
      )}
      
      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <UserDashboard user={user} />
      )}
    </div>
  );
}