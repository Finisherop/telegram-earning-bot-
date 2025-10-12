/**
 * Enhanced Main Dashboard Component
 * 
 * Now uses comprehensive Firebase safety fixes to prevent all undefined value errors
 * and implements instant real-time UI updates with proper DOM ready handling.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { 
  initializeUserSafely,
  setupRealtimeUserListener,
  cleanupAllListeners,
  createSafeUser,
  safeFirebaseUserSync
} from '@/lib/firebaseSafeSyncFix';
import EnhancedUserDashboard from './user/EnhancedUserDashboard';
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
   * Initialize user with comprehensive Firebase safety fixes
   * Implements real-time listeners and proper DOM ready handling
   */
  const initializeUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[MainDashboard] 🚀 Starting SAFE user initialization...');
      
      // Use the new safe initialization system
      const { user, userId, setupListener } = await initializeUserSafely();
      
      if (user && userId) {
        console.log('[MainDashboard] ✅ User initialization successful:', {
          id: userId,
          firstName: user.firstName,
          coins: user.coins,
          vipTier: user.vipTier
        });
        
        setUser(user);
        setIsInitialized(true);
        
        // Set up real-time listener for instant UI updates
        const unsubscribe = setupRealtimeUserListener(userId, (updatedUser) => {
          if (updatedUser) {
            console.log('[MainDashboard] 📡 Real-time update received:', {
              coins: updatedUser.coins,
              vipTier: updatedUser.vipTier,
              timestamp: new Date().toISOString()
            });
            
            setUser(updatedUser);
            
            // Show subtle notification for significant changes
            if (user.coins !== updatedUser.coins) {
              toast.success('💰 Coins updated!', { duration: 2000 });
            }
          } else {
            console.log('[MainDashboard] ⚠️ User data not found in real-time update');
          }
        }, (error) => {
          console.error('[MainDashboard] Real-time listener error:', error);
          setError('Real-time sync error');
        });
        
        console.log('[MainDashboard] 🔄 Real-time listener established');
        return unsubscribe;
        
      } else {
        throw new Error('Failed to initialize user data');
      }
      
    } catch (error) {
      console.error('[MainDashboard] ❌ Initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Initialization failed');
      
      // Show user-friendly error message
      toast.error('Failed to load user data. Please refresh the app.', {
        duration: 5000,
        position: 'top-center'
      });
      
      return () => {}; // Return empty cleanup function
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize with comprehensive safety and real-time sync
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    // Initialize the safe user system
    initializeUser().then((unsubscribe) => {
      cleanup = unsubscribe;
    });
    
    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
      // Clean up all Firebase listeners
      cleanupAllListeners();
      console.log('[MainDashboard] 🧹 Complete cleanup performed');
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