/**
 * Enhanced App Initializer with Firebase Connection Manager
 * 
 * Handles app initialization with robust Firebase and Telegram WebApp
 * integration with automatic reconnection capabilities.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getFirebaseServices, isFirebaseInitialized, reconnectFirebaseServices } from '@/lib/firebaseSingleton';
import { telegramWebAppManager, getTelegramWebAppState } from '@/lib/telegramWebAppManager';
import { 
  getTelegramUserSafe, 
  getCachedTelegramUser,
  refreshTelegramUser 
} from '@/lib/telegramUserSafe';
import { autoSyncUserOnAppLoad } from '@/lib/telegramUserSync';
import { 
  EnvConfig, 
  FirebaseErrorHandler,
  safeAsyncOperation 
} from '@/lib/errorPrevention';
import MainDashboard from './MainDashboard';

interface AppInitializerProps {
  children?: React.ReactNode;
}

interface InitializationState {
  isLoading: boolean;
  isFirebaseReady: boolean;
  isTelegramReady: boolean;
  isUserSynced: boolean;
  isConnected: boolean;
  connectionStatus: string;
  error: string | null;
  progress: number;
}

const AppInitializer = ({ children }: AppInitializerProps) => {
  const [state, setState] = useState<InitializationState>({
    isLoading: true,
    isFirebaseReady: false,
    isTelegramReady: false,
    isUserSynced: false,
    isConnected: false,
    connectionStatus: 'Initializing...',
    error: null,
    progress: 0
  });

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  /**
   * Update initialization state
   */
  const updateState = (updates: Partial<InitializationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  /**
   * Calculate overall progress
   */
  const calculateProgress = (firebase: boolean, telegram: boolean, sync: boolean) => {
    let progress = 0;
    if (firebase) progress += 40;
    if (telegram) progress += 30;
    if (sync) progress += 30;
    return progress;
  };

  /**
   * Initialize Firebase services
   */
  const initializeFirebase = async (): Promise<boolean> => {
    try {
      console.log('[AppInitializer] Initializing Firebase services...');
      
      // Validate environment first
      const envValidation = EnvConfig.validateEnvironment();
      if (!envValidation.isValid) {
        throw new Error(`Missing environment variables: ${envValidation.missingVars.join(', ')}`);
      }
      
      // Initialize Firebase services
      const services = await getFirebaseServices();
      
      if (!services.isInitialized) {
        throw new Error(services.initializationError?.message || 'Firebase initialization failed');
      }
      
      console.log('[AppInitializer] Firebase services initialized successfully');
      return true;
      
    } catch (error) {
      console.error('[AppInitializer] Firebase initialization failed:', error);
      FirebaseErrorHandler.logError('Firebase initialization', error);
      throw error;
    }
  };

  /**
   * Initialize Telegram WebApp integration
   */
  const initializeTelegram = async (): Promise<boolean> => {
    try {
      console.log('[AppInitializer] Initializing Telegram WebApp...');
      
      // Get Telegram user data
      const telegramUser = getTelegramUserSafe();
      
      if (telegramUser.source === 'telegram') {
        console.log('[AppInitializer] Telegram WebApp user detected');
      } else {
        console.log('[AppInitializer] Browser mode fallback activated');
      }
      
      // Validate we have a usable user
      if (!telegramUser.id && telegramUser.source === 'telegram') {
        throw new Error('Failed to get valid Telegram user data');
      }
      
      console.log('[AppInitializer] Telegram integration successful');
      return true;
      
    } catch (error) {
      console.error('[AppInitializer] Telegram initialization failed:', error);
      FirebaseErrorHandler.logError('Telegram initialization', error);
      throw error;
    }
  };

  /**
   * Sync user data to Firebase
   */
  const syncUserData = async (): Promise<boolean> => {
    try {
      console.log('[AppInitializer] Syncing user data to Firebase...');
      
      const syncResult = await autoSyncUserOnAppLoad();
      
      if (!syncResult.success) {
        console.warn('[AppInitializer] User sync had errors:', syncResult.errors);
        // Don't fail completely if sync has issues, just log warnings
      }
      
      console.log(`[AppInitializer] User sync completed for ${syncResult.userId} (new: ${syncResult.isNewUser})`);
      return true;
      
    } catch (error) {
      console.error('[AppInitializer] User sync failed:', error);
      FirebaseErrorHandler.logError('User sync', error);
      throw error;
    }
  };

  /**
   * Main initialization sequence
   */
  const initializeApp = async () => {
    try {
      console.log('[AppInitializer] Starting app initialization...');
      
      updateState({ 
        isLoading: true, 
        error: null, 
        progress: 0 
      });

      // Step 1: Initialize Firebase (40% progress)
      const firebaseReady = await safeAsyncOperation(
        () => initializeFirebase(),
        'Firebase initialization',
        false
      );
      
      updateState({ 
        isFirebaseReady: firebaseReady, 
        progress: calculateProgress(firebaseReady, false, false) 
      });
      
      if (!firebaseReady) {
        throw new Error('Firebase initialization failed');
      }

      // Step 2: Initialize Telegram (70% progress)
      const telegramReady = await safeAsyncOperation(
        () => initializeTelegram(),
        'Telegram initialization',
        false
      );
      
      updateState({ 
        isTelegramReady: telegramReady, 
        progress: calculateProgress(firebaseReady, telegramReady, false) 
      });
      
      if (!telegramReady) {
        throw new Error('Telegram initialization failed');
      }

      // Step 3: Sync user data (100% progress)
      const syncReady = await safeAsyncOperation(
        () => syncUserData(),
        'User data sync',
        false
      );
      
      updateState({ 
        isUserSynced: syncReady, 
        progress: calculateProgress(firebaseReady, telegramReady, syncReady),
        isLoading: false 
      });
      
      if (!syncReady) {
        console.warn('[AppInitializer] User sync failed, but continuing...');
        // Don't fail the app if sync fails, just continue
      }

      console.log('[AppInitializer] App initialization completed successfully');
      
    } catch (error) {
      console.error('[AppInitializer] App initialization failed:', error);
      const errorMessage = FirebaseErrorHandler.getErrorMessage(error);
      
      updateState({ 
        error: errorMessage,
        isLoading: false 
      });
    }
  };

  /**
   * Retry initialization
   */
  const retryInitialization = async () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      console.log(`[AppInitializer] Retrying initialization (${retryCount + 1}/${maxRetries})...`);
      await initializeApp();
    }
  };

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  /**
   * Monitor connection status and Telegram WebApp lifecycle
   */
  useEffect(() => {
    const checkConnectionStatus = () => {
      const isConnected = isFirebaseInitialized();
      const telegramState = getTelegramWebAppState();
      
      setState(prev => ({
        ...prev,
        isConnected,
        connectionStatus: isConnected 
          ? telegramState.isBackground 
            ? 'Connected (Background)' 
            : 'Connected'
          : 'Disconnected'
      }));
    };

    // Initial check
    checkConnectionStatus();

    // Listen for Telegram WebApp lifecycle events
    const handleAppResume = () => {
      console.log('[AppInitializer] Telegram WebApp resumed');
      checkConnectionStatus();
    };

    const handleAppBackground = () => {
      console.log('[AppInitializer] Telegram WebApp backgrounded');
      checkConnectionStatus();
    };

    // Listen for network changes
    const handleOnline = () => {
      console.log('[AppInitializer] Network online');
      checkConnectionStatus();
    };

    const handleOffline = () => {
      console.log('[AppInitializer] Network offline');
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'Offline'
      }));
    };

    // Add event listeners
    window.addEventListener('telegramWebAppResume', handleAppResume);
    window.addEventListener('telegramWebAppBackground', handleAppBackground);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connection check
    const connectionCheckInterval = setInterval(checkConnectionStatus, 30000); // Every 30 seconds

    // Cleanup
    return () => {
      window.removeEventListener('telegramWebAppResume', handleAppResume);
      window.removeEventListener('telegramWebAppBackground', handleAppBackground);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
    };
  }, []);

  /**
   * Auto-retry on certain errors
   */
  useEffect(() => {
    if (state.error && retryCount < maxRetries) {
      const shouldAutoRetry = 
        state.error.includes('network') || 
        state.error.includes('timeout') || 
        state.error.includes('unavailable');
      
      if (shouldAutoRetry) {
        console.log('[AppInitializer] Auto-retrying due to network error...');
        setTimeout(retryInitialization, 2000 * (retryCount + 1)); // Exponential backoff
      }
    }
  }, [state.error, retryCount, retryInitialization]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
        <motion.div
          className="flex flex-col items-center space-y-6 p-8 bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo/Icon */}
          <motion.div
            className="text-6xl mb-4"
            animate={{ 
              rotate: state.progress > 0 ? 360 : 0,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity }
            }}
          >
            🚀
          </motion.div>
          
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Initializing App
            </h2>
            <p className="text-gray-600 text-sm">
              Setting up your dashboard...
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Progress</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${state.progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Firebase Services</span>
              <span className={`font-bold ${state.isFirebaseReady ? 'text-green-600' : 'text-gray-400'}`}>
                {state.isFirebaseReady ? '✅' : '⏳'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Connection Status</span>
              <span className={`text-xs font-medium ${state.isConnected ? 'text-green-600' : 'text-orange-500'}`}>
                {state.connectionStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Telegram Integration</span>
              <span className={`font-bold ${state.isTelegramReady ? 'text-green-600' : 'text-gray-400'}`}>
                {state.isTelegramReady ? '✅' : '⏳'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">User Data Sync</span>
              <span className={`font-bold ${state.isUserSynced ? 'text-green-600' : 'text-gray-400'}`}>
                {state.isUserSynced ? '✅' : '⏳'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-red-500 text-6xl mb-4">❌</div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Initialization Failed
          </h2>
          
          <p className="text-gray-600 text-sm mb-6">
            {state.error}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={retryInitialization}
              disabled={retryCount >= maxRetries}
              className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${
                retryCount >= maxRetries
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {retryCount >= maxRetries ? 'Max Retries Reached' : `Retry (${retryCount}/${maxRetries})`}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
            >
              Reload Page
            </button>
          </div>
          
          {EnvConfig.isDevelopment() && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Debug Info
              </summary>
              <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded overflow-auto">
                {JSON.stringify({
                  firebaseReady: state.isFirebaseReady,
                  telegramReady: state.isTelegramReady,
                  userSynced: state.isUserSynced,
                  retryCount,
                  error: state.error
                }, null, 2)}
              </pre>
            </details>
          )}
        </motion.div>
      </div>
    );
  }

  // Success - render main app
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {children || <MainDashboard />}
    </motion.div>
  );
};

export default AppInitializer;