'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import { TelegramService } from '@/lib/telegram';
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
        <div className="text-center text-white p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Welcome to Telegram Mini App</h1>
          <p className="text-lg opacity-90 mb-6">Please open this app through Telegram</p>
          
          <div className="bg-white/10 rounded-lg p-4 text-sm space-y-2 mb-6">
            <p>🌐 <strong>Domain:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'Unknown'}</p>
            <p>🔧 <strong>Environment:</strong> {process.env.NODE_ENV || 'Unknown'}</p>
            <p>📱 <strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent.includes('Telegram') ? 'Telegram' : 'Other' : 'Unknown'}</p>
            <p>🤖 <strong>Telegram Env:</strong> {typeof window !== 'undefined' ? TelegramService.isTelegramEnvironment() ? 'Yes' : 'No' : 'Unknown'}</p>
            <p>⚡ <strong>WebApp Available:</strong> {typeof window !== 'undefined' && (window as any).Telegram?.WebApp ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="text-sm opacity-75 space-y-2">
            <p>💡 <strong>For testing:</strong></p>
            <p>Add <code className="bg-white/20 px-2 py-1 rounded">?user=true</code> to the URL</p>
            <p>Or open in Telegram app</p>
          </div>
          
          {typeof window !== 'undefined' && (
            <button
              onClick={() => {
                const currentUrl = window.location.href;
                const separator = currentUrl.includes('?') ? '&' : '?';
                window.location.href = currentUrl + separator + 'user=true';
              }}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🚀 Enable Test Mode
            </button>
          )}
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