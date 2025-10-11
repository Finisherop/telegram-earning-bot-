/**
 * Enhanced Main Dashboard Component
 * 
 * Uses the new Firebase Realtime Manager for comprehensive real-time sync,
 * auto-reconnection, undefined value sanitization, and instant admin updates.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { getTelegramUserSafe } from '@/lib/telegramUserSafe';
import EnhancedUserDashboard from './user/EnhancedUserDashboard';
import { 
  firebaseRealtimeManager,
  subscribeToUser 
} from '@/lib/firebaseRealtimeManager';
import { TelegramService } from '@/lib/telegram';
import toast from 'react-hot-toast';

interface MainDashboardProps {
  initialUser?: User | null;
}

const MainDashboard = ({ initialUser }: MainDashboardProps) => {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize user and set up real-time Firebase sync
   */
  const initializeUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[MainDashboard] Starting enhanced user initialization...');
      
      // Get Telegram user data safely
      const telegramUser = getTelegramUserSafe();
      
      if (!telegramUser || !telegramUser.id) {
        throw new Error('Unable to get valid user ID from Telegram');
      }

      const userId = telegramUser.id.toString();
      console.log(`[MainDashboard] Telegram user captured: ${userId}`);
      
      // Set up real-time user subscription using enhanced Firebase manager
      const unsubscribe = subscribeToUser(userId, (userData) => {
        if (userData) {
          console.log('[MainDashboard] Real-time user update received:', {
            coins: userData.coins,
            vipTier: userData.vipTier,
            farmingStatus: !!userData.farmingStartTime
          });
          setUser(userData);
          setIsInitialized(true);
        } else {
          // Create initial user data if not exists
          const defaultUser: User = {
            id: userId,
            telegramId: userId,
            firstName: telegramUser.first_name || 'User',
            lastName: telegramUser.last_name || '',
            username: telegramUser.username || '',
            photoUrl: telegramUser.photo_url || '',
            coins: 0,
            xp: 0,
            level: 1,
            vipTier: 'free',
            farmingMultiplier: 1,
            referralMultiplier: 1,
            adsLimitPerDay: 5,
            withdrawalLimit: 1000,
            minWithdrawal: 100,
            referralCount: 0,
            referralEarnings: 0,
            dailyStreak: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Initialize user in Firebase
          firebaseRealtimeManager.updateUser(userId, defaultUser).catch(err => {
            console.error('[MainDashboard] Failed to initialize user:', err);
          });
          
          setUser(defaultUser);
          setIsInitialized(true);
        }
      });
      
      console.log('[MainDashboard] Real-time subscription setup complete');
      
      // Store unsubscribe function for cleanup
      return unsubscribe;
      
    } catch (error) {
      console.error('[MainDashboard] Initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Initialization failed');
      return () => {}; // Return empty cleanup function
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    initializeUser().then((unsubscribe) => {
      cleanup = unsubscribe;
    });
    
    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
        console.log('[MainDashboard] Cleaned up Firebase listeners');
      }
    };
  }, [initializeUser]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Initializing enhanced dashboard...</p>
          <div className="text-xs text-gray-500 text-center">
            • Setting up real-time sync<br />
            • Configuring auto-reconnection<br />
            • Preparing instant admin updates
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h3 className="text-lg font-bold text-red-800 mb-2">Dashboard Error</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // Main dashboard - use enhanced user dashboard if we have user data
  if (user && isInitialized) {
    return <EnhancedUserDashboard user={user} />;
  }

  // Fallback state
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div
        className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-yellow-600 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-yellow-800 mb-2">Setting Up Dashboard</h3>
        <p className="text-yellow-700 text-sm">Please wait while we configure your account...</p>
      </motion.div>
    </div>
  );
};

export default MainDashboard;