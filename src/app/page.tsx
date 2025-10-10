'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTelegramUser } from '@/hooks/useTelegramUser';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';

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

  if (isLoading || telegramLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold">Loading Telegram Mini App...</h2>
          <p className="text-white/80 mt-2">
            {telegramLoading ? 'Capturing user data...' : 'Initializing your earning dashboard'}
          </p>
          {telegramUser && (
            <p className="text-white/60 mt-1 text-sm">
              Welcome, {displayName}! {isTelegramUser ? '(Telegram User)' : '(Browser User)'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
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