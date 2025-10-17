/**
 * Enhanced Firebase Initializer Component
 * 
 * Uses the enhanced Firebase writer with proper verification and debugging
 * Provides real-time status updates and error handling
 */

'use client';

import { useState, useEffect } from 'react';
import { writeTelegramUserToFirebase } from '@/lib/enhancedFirebaseWriter';

interface FirebaseStatus {
  isInitialized: boolean;
  isWriting: boolean;
  writeSuccess: boolean | null;
  error: string | null;
  lastAttempt: Date | null;
}

const EnhancedFirebaseInitializer = () => {
  const [status, setStatus] = useState<FirebaseStatus>({
    isInitialized: false,
    isWriting: false,
    writeSuccess: null,
    error: null,
    lastAttempt: null
  });

  useEffect(() => {
    const initializeFirebase = async () => {
      console.log('[Enhanced Firebase Debug] 🎬 React component initializing...');
      
      setStatus(prev => ({
        ...prev,
        isWriting: true,
        error: null,
        lastAttempt: new Date()
      }));

      try {
        const success = await writeTelegramUserToFirebase();
        
        setStatus(prev => ({
          ...prev,
          isInitialized: true,
          isWriting: false,
          writeSuccess: success,
          error: success ? null : 'Write operation failed after retries'
        }));

        if (success) {
          console.log('[Enhanced Firebase Debug] 🎉 React component: Firebase write successful!');
        } else {
          console.error('[Enhanced Firebase Debug] ❌ React component: Firebase write failed!');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setStatus(prev => ({
          ...prev,
          isInitialized: true,
          isWriting: false,
          writeSuccess: false,
          error: errorMessage
        }));

        console.error('[Enhanced Firebase Debug] 💥 React component error:', error);
      }
    };

    // Initialize after a short delay to ensure Telegram WebApp is ready
    const timer = setTimeout(initializeFirebase, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Manual retry function
  const retryWrite = async () => {
    console.log('[Enhanced Firebase Debug] 🔄 Manual retry triggered...');
    
    setStatus(prev => ({
      ...prev,
      isWriting: true,
      error: null,
      lastAttempt: new Date()
    }));

    try {
      const success = await writeTelegramUserToFirebase();
      
      setStatus(prev => ({
        ...prev,
        isWriting: false,
        writeSuccess: success,
        error: success ? null : 'Retry failed'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry error';
      
      setStatus(prev => ({
        ...prev,
        isWriting: false,
        writeSuccess: false,
        error: errorMessage
      }));
    }
  };

  // Only show debug UI if debug mode is enabled
  if (process.env.NEXT_PUBLIC_DEBUG !== 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">🔥 Firebase Debug</h3>
        <div className={`w-3 h-3 rounded-full ${
          status.isWriting 
            ? 'bg-yellow-400 animate-pulse' 
            : status.writeSuccess === true 
            ? 'bg-green-400' 
            : status.writeSuccess === false 
            ? 'bg-red-400' 
            : 'bg-gray-300'
        }`} />
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${
            status.isWriting 
              ? 'text-yellow-600' 
              : status.writeSuccess === true 
              ? 'text-green-600' 
              : status.writeSuccess === false 
              ? 'text-red-600' 
              : 'text-gray-600'
          }`}>
            {status.isWriting 
              ? 'Writing...' 
              : status.writeSuccess === true 
              ? 'Success' 
              : status.writeSuccess === false 
              ? 'Failed' 
              : 'Pending'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Initialized:</span>
          <span className={status.isInitialized ? 'text-green-600' : 'text-gray-600'}>
            {status.isInitialized ? 'Yes' : 'No'}
          </span>
        </div>

        {status.lastAttempt && (
          <div className="flex justify-between">
            <span className="text-gray-600">Last Attempt:</span>
            <span className="text-gray-600">
              {status.lastAttempt.toLocaleTimeString()}
            </span>
          </div>
        )}

        {status.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
            <div className="font-medium text-xs">Error:</div>
            <div className="text-xs break-words">{status.error}</div>
          </div>
        )}

        {(status.writeSuccess === false || status.error) && !status.isWriting && (
          <button
            onClick={retryWrite}
            className="w-full mt-2 bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600 transition-colors"
          >
            🔄 Retry Write
          </button>
        )}

        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-gray-500 text-xs">
            Check console for detailed logs
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFirebaseInitializer;