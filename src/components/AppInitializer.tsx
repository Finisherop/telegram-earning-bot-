'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { initializeTelegramUser, updateLastSeen, UserData } from '@/lib/telegramUser';
import MainDashboard from './MainDashboard';

interface AppInitializerProps {
  children?: React.ReactNode;
}

interface AppState {
  isLoading: boolean;
  isReady: boolean;
  user: UserData | null;
  error: string | null;
}

const AppInitializer = ({ children }: AppInitializerProps) => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isReady: false,
    user: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log('[AppInitializer] Starting app initialization...');

        // Initialize Telegram user
        const userData = await initializeTelegramUser();

        if (!mounted) return;

        if (userData) {
          setState({
            isLoading: false,
            isReady: true,
            user: userData,
            error: null,
          });

          // Set up periodic last seen updates
          const interval = setInterval(() => {
            updateLastSeen(userData.userId);
          }, 30000); // Every 30 seconds

          // Cleanup interval on unmount
          return () => clearInterval(interval);
        } else {
          setState({
            isLoading: false,
            isReady: false,
            user: null,
            error: 'Unable to initialize Telegram user. Please make sure you are opening this app from Telegram.',
          });
        }
      } catch (error) {
        console.error('[AppInitializer] Initialization failed:', error);
        
        if (!mounted) return;

        setState({
          isLoading: false,
          isReady: false,
          user: null,
          error: error instanceof Error ? error.message : 'Initialization failed',
        });
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          className="flex flex-col items-center space-y-4 p-8 bg-white rounded-2xl shadow-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-gray-700">Initializing...</p>
          <p className="text-sm text-gray-500">Setting up your Telegram user data</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <motion.div
          className="flex flex-col items-center space-y-4 p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Initialization Error</h2>
          <p className="text-sm text-gray-600 text-center">{state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // Success state - render main app
  if (state.isReady && state.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainDashboard user={state.user} />
        {children}
      </div>
    );
  }

  // Fallback
  return null;
};

export default AppInitializer;