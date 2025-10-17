/**
 * Firebase Write Test Page
 * 
 * Test page to verify Firebase writes are working correctly
 * Shows real-time status and allows manual testing
 */

'use client';

import { useState, useEffect } from 'react';
import { writeTelegramUserToFirebase, updateTelegramUserInFirebase } from '@/lib/telegramFirebaseWriter';

interface TestResult {
  timestamp: Date;
  operation: string;
  success: boolean;
  userId?: string;
  path?: string;
  error?: string;
}

const FirebaseTestPage = () => {
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    // Check for Telegram user
    const checkTelegram = () => {
      const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (user?.id) {
        setTelegramUser(user);
        console.log('[Firebase Test] Telegram user detected:', user);
      } else {
        console.log('[Firebase Test] No Telegram user found');
      }
    };

    // Check immediately and after delay
    checkTelegram();
    setTimeout(checkTelegram, 2000);
  }, []);

  const addResult = (operation: string, success: boolean, userId?: string, path?: string, error?: string) => {
    const result: TestResult = {
      timestamp: new Date(),
      operation,
      success,
      userId,
      path,
      error
    };
    setResults(prev => [result, ...prev.slice(0, 9)]);
  };

  const testWriteUser = async () => {
    setIsLoading(true);
    console.log('[Firebase Test] 🧪 Testing user write...');
    
    try {
      const success = await writeTelegramUserToFirebase();
      const userId = telegramUser?.id?.toString();
      const path = userId ? `telegram_users/${userId}` : undefined;
      
      addResult('Write User', success, userId, path);
      
      if (success) {
        console.log('[Firebase Test] ✅ Write test successful');
      } else {
        console.log('[Firebase Test] ❌ Write test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('Write User', false, undefined, undefined, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateCoins = async () => {
    if (!telegramUser?.id) {
      addResult('Update Coins', false, undefined, undefined, 'No Telegram user');
      return;
    }

    setIsLoading(true);
    const userId = telegramUser.id.toString();
    const newCoins = Math.floor(Math.random() * 1000);
    
    console.log('[Firebase Test] 🧪 Testing coins update...');
    
    try {
      const success = await updateTelegramUserInFirebase(userId, { coins: newCoins });
      const path = `telegram_users/${userId}`;
      
      addResult('Update Coins', success, userId, path);
      
      if (success) {
        console.log('[Firebase Test] ✅ Coins update successful');
      } else {
        console.log('[Firebase Test] ❌ Coins update failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('Update Coins', false, userId, undefined, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🔥 Firebase Write Test
          </h1>
          <p className="text-gray-600">
            Test Firebase Realtime Database writes for Telegram users
          </p>
        </div>

        {/* Telegram User Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📱 Telegram WebApp Status
          </h2>
          
          {telegramUser ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-green-600 text-xl">✅</span>
                <span className="font-medium text-green-800">Real Telegram User Detected</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>User ID:</strong> {telegramUser.id}
                </div>
                <div>
                  <strong>Name:</strong> {telegramUser.first_name} {telegramUser.last_name || ''}
                </div>
                <div>
                  <strong>Username:</strong> @{telegramUser.username || 'N/A'}
                </div>
                <div>
                  <strong>Firebase Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">telegram_users/{telegramUser.id}</code>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <span className="font-medium text-yellow-800">No Telegram User Detected</span>
              </div>
              <p className="text-yellow-700 text-sm">
                This app only works in Telegram Mini WebApp environment.
                No browser fallback users will be created.
              </p>
            </div>
          )}
        </div>

        {/* Test Controls */}
        {telegramUser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🧪 Test Controls
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={testWriteUser}
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '⏳ Testing...' : '📝 Test Write User'}
              </button>

              <button
                onClick={testUpdateCoins}
                disabled={isLoading}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '⏳ Testing...' : '💰 Test Update Coins'}
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Expected Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">telegram_users/{telegramUser.id}</code></p>
              <p className="mt-1">Check Firebase console to verify data appears at this exact path.</p>
            </div>
          </div>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📊 Test Results</h2>
              <button
                onClick={() => setResults([])}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-medium ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.success ? '✅' : '❌'} {result.operation}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.userId && (
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>User ID:</strong> {result.userId}
                    </div>
                  )}
                  
                  {result.path && (
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{result.path}</code>
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="text-sm text-red-600 mt-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Testing Instructions
          </h2>
          
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <strong>1. Telegram WebApp:</strong> This page must be opened inside Telegram Mini WebApp
            </div>
            <div>
              <strong>2. Real User Only:</strong> No browser fallback users will be created
            </div>
            <div>
              <strong>3. Firebase Path:</strong> Data will be saved to <code className="bg-blue-100 px-2 py-1 rounded">telegram_users/{'{userId}'}</code>
            </div>
            <div>
              <strong>4. Verification:</strong> Each write is verified with a read-back operation
            </div>
            <div>
              <strong>5. Console Logs:</strong> Check browser console for detailed Firebase operation logs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTestPage;