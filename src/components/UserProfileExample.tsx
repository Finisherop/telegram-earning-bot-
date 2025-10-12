/**
 * Example Integration: User Profile Component with Firebase Writer
 * 
 * This is a complete example showing how to integrate the Telegram User Data Writer
 * into a typical React component. Copy this pattern for your own components.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  writeTelegramUserToFirebase, 
  updateTelegramUserData 
} from '@/lib/telegramUserDataWriter';

interface UserProfileProps {
  // Optional props - the component handles Telegram user detection automatically
  className?: string;
}

export default function UserProfileExample({ className = '' }: UserProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [coins, setCoins] = useState(0);

  // Auto-sync user data when component mounts
  useEffect(() => {
    const syncUserData = async () => {
      const success = await writeTelegramUserToFirebase();
      if (success) {
        setLastSyncTime(new Date());
      }
    };

    syncUserData();
  }, []);

  // Example: Handle earning coins
  const handleEarnCoins = async (amount: number) => {
    setIsLoading(true);
    
    try {
      // Update local state
      const newCoins = coins + amount;
      setCoins(newCoins);
      
      // Update in Firebase
      const success = await updateTelegramUserData({
        coins: newCoins
      });
      
      if (success) {
        setLastSyncTime(new Date());
        console.log(`User earned ${amount} coins! Total: ${newCoins}`);
      } else {
        // Revert local state if Firebase update failed
        setCoins(coins);
        console.error('Failed to update coins in Firebase');
      }
    } catch (error) {
      console.error('Error updating coins:', error);
      setCoins(coins); // Revert on error
    }
    
    setIsLoading(false);
  };

  // Example: Handle user data refresh
  const handleRefreshData = async () => {
    setIsLoading(true);
    
    const success = await writeTelegramUserToFirebase();
    if (success) {
      setLastSyncTime(new Date());
    }
    
    setIsLoading(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          User Profile
        </h2>
        {lastSyncTime && (
          <span className="text-sm text-gray-500">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {coins}
          </div>
          <div className="text-sm text-blue-800">
            Coins
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {lastSyncTime ? '✅' : '⏳'}
          </div>
          <div className="text-sm text-green-800">
            Sync Status
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => handleEarnCoins(10)}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳ Processing...' : '🪙 Earn 10 Coins'}
        </button>
        
        <button
          onClick={() => handleEarnCoins(50)}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳ Processing...' : '💰 Earn 50 Coins'}
        </button>
        
        <button
          onClick={handleRefreshData}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳ Syncing...' : '🔄 Refresh User Data'}
        </button>
      </div>

      {/* Status Messages */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">Integration Status:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✅ Telegram user detection: Active</li>
          <li>✅ Firebase connection: Ready</li>
          <li>✅ Auto-sync on mount: Enabled</li>
          <li>✅ Real-time updates: Working</li>
        </ul>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">How this works:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Component auto-detects Telegram user on mount</li>
          <li>2. Creates new user in Firebase if doesn't exist</li>
          <li>3. Updates existing user data when actions are performed</li>
          <li>4. All operations include error handling and loading states</li>
          <li>5. Check browser console for detailed logging</li>
        </ul>
      </div>
    </div>
  );
}