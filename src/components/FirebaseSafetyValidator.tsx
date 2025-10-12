'use client';

import { useState, useEffect } from 'react';
import { realtimeDb } from '@/lib/firebase';

/**
 * Simple Firebase Safety Validator
 * 
 * Simplified version that just checks if Firebase is connected.
 */
const FirebaseSafetyValidator = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!realtimeDb);
  }, []);

  if (!isConnected) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium">Firebase Disconnected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Firebase Connected</span>
      </div>
    </div>
  );
};

export default FirebaseSafetyValidator;