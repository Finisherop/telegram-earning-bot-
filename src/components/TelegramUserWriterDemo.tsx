/**
 * Telegram User Data Writer Demo Component
 * 
 * Demonstrates how to use the new Telegram user data writing functionality.
 * This component can be added to any page to test the user data writing feature.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  writeTelegramUserToFirebase, 
  writeTelegramUserWithData, 
  updateTelegramUserData,
  initializeTelegramUserSync 
} from '@/lib/telegramUserDataWriter';

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export default function TelegramUserWriterDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [autoSync, setAutoSync] = useState(false);

  // Initialize auto-sync on component mount
  useEffect(() => {
    if (autoSync) {
      console.log('Initializing Telegram user auto-sync...');
      initializeTelegramUserSync();
    }
  }, [autoSync]);

  const addResult = (success: boolean, message: string) => {
    const result: TestResult = {
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const handleBasicWrite = async () => {
    setIsLoading(true);
    try {
      const success = await writeTelegramUserToFirebase();
      if (success) {
        addResult(true, 'Basic user data write successful');
      } else {
        addResult(false, 'Basic user data write failed');
      }
    } catch (error) {
      addResult(false, `Error: ${error}`);
    }
    setIsLoading(false);
  };

  const handleWriteWithCoins = async () => {
    setIsLoading(true);
    try {
      const success = await writeTelegramUserWithData({ 
        coins: 100, 
        xp: 10,
        level: 1 
      });
      if (success) {
        addResult(true, 'User data with coins written successfully');
      } else {
        addResult(false, 'User data with coins write failed');
      }
    } catch (error) {
      addResult(false, `Error: ${error}`);
    }
    setIsLoading(false);
  };

  const handleUpdateCoins = async () => {
    setIsLoading(true);
    try {
      const success = await updateTelegramUserData({ 
        coins: Math.floor(Math.random() * 1000) + 100 
      });
      if (success) {
        addResult(true, 'User coins updated successfully');
      } else {
        addResult(false, 'User coins update failed');
      }
    } catch (error) {
      addResult(false, `Error: ${error}`);
    }
    setIsLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🔥 Telegram User Data Writer Demo
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✅ Safely captures Telegram user from window.Telegram.WebApp</li>
          <li>✅ Checks if user exists in Firebase database</li>
          <li>✅ Creates new user if doesn't exist, updates if exists</li>
          <li>✅ Handles errors gracefully with clear console messages</li>
          <li>✅ Only works inside Telegram WebApp environment</li>
        </ul>
      </div>

      {/* Auto-sync toggle */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="w-4 h-4 text-green-600"
          />
          <span className="text-green-800 font-medium">
            Enable Auto-Sync (syncs every 30 seconds)
          </span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleBasicWrite}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳' : '📝'} Basic Write
        </button>
        
        <button
          onClick={handleWriteWithCoins}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳' : '🪙'} Write + Coins
        </button>
        
        <button
          onClick={handleUpdateCoins}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳' : '🔄'} Update Coins
        </button>
      </div>

      {/* Results section */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Test Results ({results.length}/10)
          </h3>
          {results.length > 0 && (
            <button
              onClick={clearResults}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No test results yet. Click a button above to test!
            </p>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-sm ${
                  result.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="flex-1">
                    {result.success ? '✅' : '❌'} {result.message}
                  </span>
                  <span className="text-xs opacity-75 ml-2">
                    {result.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-semibold text-gray-800 mb-2">Usage Instructions:</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>1.</strong> Import the functions in your component:</p>
          <code className="block bg-gray-200 p-2 rounded text-xs">
            import &#123; writeTelegramUserToFirebase &#125; from '@/lib/telegramUserDataWriter';
          </code>
          
          <p><strong>2.</strong> Call the function when needed:</p>
          <code className="block bg-gray-200 p-2 rounded text-xs">
            const success = await writeTelegramUserToFirebase();
          </code>
          
          <p><strong>3.</strong> Check browser console for detailed logs!</p>
        </div>
      </div>
    </div>
  );
}