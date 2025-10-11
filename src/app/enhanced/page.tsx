'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import IntegrationTest from '@/components/IntegrationTest';
import { motion } from 'framer-motion';

export default function EnhancedHome() {
  const { user, isLoading, hasError, isAuthenticated } = useEnhancedAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTests, setShowTests] = useState(false);

  // Mock data for enhanced features (replace with real data in production)
  const payments: any[] = [];
  const conversions: any[] = [];
  const messages: any[] = [];
  const lastUpdate: Date | null = new Date();

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
      const testParam = urlParams.get('test');
      
      if (adminParam === 'true') {
        setIsAdmin(true);
        console.log('[Enhanced Home] Admin mode activated');
      }

      if (testParam === 'true') {
        setShowTests(true);
        console.log('[Enhanced Home] Test mode activated');
      }
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            🔄
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Loading Enhanced Telegram Mini App...</h2>
          <p className="text-white/80 mb-4">
            Initializing real-time sync and enhanced features
          </p>
          <div className="bg-white/20 rounded-xl p-4 max-w-md">
            <div className="flex items-center justify-between text-sm">
              <span>Real-time listeners:</span>
              <span className="font-bold">Setting up...</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Payment tracking:</span>
              <span className="font-bold">Initializing...</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Error handling:</span>
              <span className="font-bold">Active</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showTests && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold mb-2">🧪 Enhanced Integration Testing</h1>
            <p className="text-white/90">
              Comprehensive testing suite for all enhanced features
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-bold">Payments: {payments.length}</div>
              </div>
              <div>
                <div className="font-bold">Conversions: {conversions.length}</div>
              </div>
              <div>
                <div className="font-bold">Messages: {messages.length}</div>
              </div>
              <div>
                <div className="font-bold">
                  Last Update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </div>
          </motion.div>

          <IntegrationTest userId={user.telegramId} />

          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => setShowTests(false)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              🏠 Back to App
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {/* Enhanced Status Bar */}
      {user && (
        <motion.div
          className="fixed top-0 left-0 right-0 bg-primary text-white px-4 py-2 text-xs z-50"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Sync</span>
              </div>
              <div>
                Payments: {payments.length} | Conversions: {conversions.length}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {messages.filter(m => !m.isRead).length > 0 && (
                <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  {messages.filter(m => !m.isRead).length} new
                </div>
              )}
              <span>
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Connecting...'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className={user ? 'pt-10' : ''}>
        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <UserDashboard />
        )}
      </div>

      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && user && (
        <motion.div
          className="fixed bottom-4 right-4 z-50"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-2">🛠️ Dev Tools</h4>
            <div className="space-y-2">
              <button
                onClick={() => setShowTests(true)}
                className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                🧪 Run Tests
              </button>
              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                👑 Toggle Admin
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                🔄 Reload
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}