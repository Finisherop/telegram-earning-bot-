'use client';

import { useEffect, useState } from 'react';

interface ErrorDetails {
  error: string;
  timestamp: string;
  configError?: any;
  envDebug?: any;
  missingFields?: string[];
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [showError, setShowError] = useState(false);
  const [errorType, setErrorType] = useState<'firebase' | 'config' | 'network'>('firebase');

  useEffect(() => {
    // Enhanced error checking for multiple error types
    const checkForErrors = () => {
      if (typeof window !== 'undefined') {
        // Check for Firebase errors
        if ((window as any).__FIREBASE_ERROR__) {
          setErrorDetails((window as any).__FIREBASE_ERROR__);
          setErrorType('firebase');
          setShowError(true);
          return;
        }
        
        // Check for configuration errors
        if ((window as any).__FIREBASE_CONFIG_ERROR__) {
          setErrorDetails((window as any).__FIREBASE_CONFIG_ERROR__);
          setErrorType('config');
          setShowError(true);
          return;
        }
        
        // Check for network/initialization issues
        const checkNetworkIssues = () => {
          // If Firebase hasn't initialized after reasonable time, show network error
          setTimeout(() => {
            if (!(window as any).__FIREBASE_INITIALIZED__ && !(window as any).__FIREBASE_ERROR__) {
              setErrorDetails({
                error: 'Network or initialization timeout',
                timestamp: new Date().toISOString()
              });
              setErrorType('network');
              setShowError(true);
            }
          }, 10000); // 10 second timeout
        };
        
        checkNetworkIssues();
      }
    };

    checkForErrors();
    
    // Check periodically for errors
    const interval = setInterval(checkForErrors, 3000);
    
    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.warn('[ErrorBoundary] Global error caught:', event.error);
      // Don't show UI for Telegram-specific errors
      if (event.error?.message?.includes('[NET-4-C-0]') || 
          event.error?.message?.includes('[MP-MTPROTO]')) {
        return;
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  const getErrorIcon = () => {
    switch (errorType) {
      case 'config': return '⚙️';
      case 'network': return '🌐';
      default: return '⚠️';
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'config': return 'Configuration Issue';
      case 'network': return 'Connection Issue';
      default: return 'Service Issue';
    }
  };

  const getErrorMessage = () => {
    switch (errorType) {
      case 'config': return 'There\'s a configuration issue with the services. Please check your environment variables.';
      case 'network': return 'Unable to connect to services. Please check your internet connection.';
      default: return 'There\'s an issue with the services. The app will continue with limited functionality.';
    }
  };

  if (showError && errorDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">{getErrorIcon()}</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{getErrorTitle()}</h2>
            <p className="text-gray-600 mb-4">
              {getErrorMessage()}
            </p>
            
            <div className="bg-gray-100 p-3 rounded text-sm text-left mb-4 max-h-32 overflow-y-auto">
              <strong>Error Details:</strong>
              <div className="mt-1 text-xs text-gray-700">
                {errorDetails.error}
              </div>
              {errorDetails.missingFields && (
                <div className="mt-2">
                  <strong>Missing:</strong> {errorDetails.missingFields.join(', ')}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setShowError(false);
                  // Clear error states to allow retry
                  if (typeof window !== 'undefined') {
                    delete (window as any).__FIREBASE_ERROR__;
                    delete (window as any).__FIREBASE_CONFIG_ERROR__;
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Continue Anyway
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Retry
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Some features may not work properly in offline mode
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}