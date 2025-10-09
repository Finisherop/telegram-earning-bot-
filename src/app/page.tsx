'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import LoadingScreen from '@/components/LoadingScreen';
import TelegramDebug from '@/components/TelegramDebug';

export default function Home() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserMode, setIsUserMode] = useState(false);

  useEffect(() => {
    // Check URL parameters for admin access and user mode
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const adminParam = urlParams.get('admin');
      const keyParam = urlParams.get('key');
      const userParam = urlParams.get('user');
      
      // Admin mode check
      if (adminParam === 'true' && keyParam === ADMIN_SECRET_KEY) {
        setIsAdmin(true);
      }
      
      // User mode check (for testing/debugging)
      if (userParam === 'true') {
        setIsUserMode(true);
        console.log('User mode activated via URL parameter');
      }
      
      // Log current URL for debugging
      console.log('Current URL:', window.location.href);
      console.log('URL Parameters:', {
        admin: adminParam,
        user: userParam,
        key: keyParam ? '[HIDDEN]' : null
      });
    }
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user && !isUserMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="text-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Welcome to Telegram Mini App</h1>
          <p className="text-lg opacity-90 mb-4">Please open this app through Telegram</p>
          <div className="text-sm opacity-75">
            <p>🌐 Current domain: {typeof window !== 'undefined' ? window.location.hostname : 'Unknown'}</p>
            <p className="mt-2">For testing, add ?user=true to the URL</p>
          </div>
        </div>
        <TelegramDebug />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {isAdmin ? (
        <AdminDashboard />
      ) : user ? (
        <UserDashboard user={user} />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
          <div className="text-center text-white p-8">
            <h1 className="text-2xl font-bold mb-4">Loading User Data...</h1>
            <p className="text-lg opacity-90">Please wait while we initialize your account</p>
          </div>
        </div>
      )}
      <TelegramDebug />
    </div>
  );
}