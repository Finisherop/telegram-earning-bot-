'use client';

import { useEffect, useState } from 'react';

interface FirebaseError {
  error: string;
  timestamp: string;
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [firebaseError, setFirebaseError] = useState<FirebaseError | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Check for Firebase initialization errors
    const checkFirebaseError = () => {
      if (typeof window !== 'undefined' && (window as any).__FIREBASE_ERROR__) {
        setFirebaseError((window as any).__FIREBASE_ERROR__);
        setShowError(true);
      }
    };

    checkFirebaseError();
    
    // Check periodically in case error occurs after initial load
    const interval = setInterval(checkFirebaseError, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (showError && firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuration Issue</h2>
            <p className="text-gray-600 mb-4">
              There's a configuration issue with the Firebase services. The app will continue with limited functionality.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-left mb-4">
              <strong>Error:</strong> {firebaseError.error}
            </div>
            <button
              onClick={() => setShowError(false)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Continue Anyway
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Some features may not work properly
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}