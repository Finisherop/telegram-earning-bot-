/**
 * Firebase Write Test Component
 * 
 * Provides manual testing interface for Firebase write operations
 * Shows real-time status and allows manual triggers
 */

'use client';

import { useState } from 'react';
import { writeTelegramUserToFirebase, updateUserInFirebase } from '@/lib/enhancedFirebaseWriter';

interface TestResult {
  timestamp: Date;
  operation: string;
  success: boolean;
  error?: string;
}

const FirebaseWriteTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (operation: string, success: boolean, error?: string) => {
    const result: TestResult = {
      timestamp: new Date(),
      operation,
      success,
      error
    };
    setResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testWriteUser = async () => {
    setIsLoading(true);
    console.log('[Firebase Write Test] 🧪 Testing user write...');
    
    try {
      const success = await writeTelegramUserToFirebase();
      addResult('Write User', success);
      
      if (success) {
        console.log('[Firebase Write Test] ✅ User write test successful');
      } else {
        console.log('[Firebase Write Test] ❌ User write test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('Write User', false, errorMessage);
      console.error('[Firebase Write Test] 💥 User write test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateUser = async () => {
    setIsLoading(true);
    console.log('[Firebase Write Test] 🧪 Testing user update...');
    
    try {
      // Get current Telegram user ID
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (!telegramUser?.id) {
        addResult('Update User', false, 'No Telegram user found');
        return;
      }

      const userId = telegramUser.id.toString();
      const updates = {
        coins: Math.floor(Math.random() * 1000),
        updatedAt: new Date().toISOString()
      };

      const success = await updateUserInFirebase(userId, updates);
      addResult('Update User', success);
      
      if (success) {
        console.log('[Firebase Write Test] ✅ User update test successful');
      } else {
        console.log('[Firebase Write Test] ❌ User update test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('Update User', false, errorMessage);
      console.error('[Firebase Write Test] 💥 User update test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    console.log('[Firebase Write Test] 🧹 Results cleared');
  };

  // Only show in debug mode
  if (process.env.NEXT_PUBLIC_DEBUG !== 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">🧪 Firebase Write Test</h3>
        <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`} />
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={testWriteUser}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳ Testing...' : '📝 Test Write User'}
        </button>

        <button
          onClick={testUpdateUser}
          disabled={isLoading}
          className="w-full bg-green-500 text-white text-sm py-2 px-3 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳ Testing...' : '🔄 Test Update User'}
        </button>

        {results.length > 0 && (
          <button
            onClick={clearResults}
            disabled={isLoading}
            className="w-full bg-gray-500 text-white text-sm py-1 px-3 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🧹 Clear Results
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <h4 className="font-medium text-gray-700 text-xs">Recent Tests:</h4>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded text-xs ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? '✅' : '❌'} {result.operation}
                </span>
                <span className="text-gray-500 text-xs">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
              {result.error && (
                <div className="text-red-600 text-xs mt-1 break-words">
                  {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-gray-500 text-xs">
          Open console for detailed logs
        </div>
      </div>
    </div>
  );
};

export default FirebaseWriteTest;