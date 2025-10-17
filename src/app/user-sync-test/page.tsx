/**
 * User Sync Test Page
 * 
 * Test the complete Telegram user creation logic:
 * 1. Telegram WebApp detection
 * 2. User data capture  
 * 3. API route sync
 * 4. Firebase Admin SDK write
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  syncTelegramUser, 
  isTelegramWebApp, 
  getTelegramUser,
  detectTelegramUser 
} from '@/lib/telegramUserSync';

interface TestStatus {
  isTelegramWebApp: boolean;
  telegramUser: any | null;
  lastSyncTime: Date | null;
  lastSyncSuccess: boolean;
  lastSyncOperation: 'create' | 'update' | null;
  firebasePath: string | null;
  isLoading: boolean;
  logs: string[];
}

const UserSyncTestPage = () => {
  const [status, setStatus] = useState<TestStatus>({
    isTelegramWebApp: false,
    telegramUser: null,
    lastSyncTime: null,
    lastSyncSuccess: false,
    lastSyncOperation: null,
    firebasePath: null,
    isLoading: false,
    logs: []
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setStatus(prev => ({
      ...prev,
      logs: [logMessage, ...prev.logs.slice(0, 19)] // Keep last 20 logs
    }));
  };

  useEffect(() => {
    const checkEnvironment = async () => {
      addLog('🔍 Checking Telegram WebApp environment...');
      
      const isWebApp = isTelegramWebApp();
      addLog(`📱 Is Telegram WebApp: ${isWebApp}`);

      if (isWebApp) {
        try {
          const user = await detectTelegramUser();
          if (user) {
            addLog(`✅ Telegram user detected: ID ${user.id}, Name: ${user.first_name}`);
            setStatus(prev => ({
              ...prev,
              isTelegramWebApp: true,
              telegramUser: user,
              firebasePath: `telegram_users/${user.id}`
            }));
          } else {
            addLog('❌ Failed to detect Telegram user data');
            setStatus(prev => ({
              ...prev,
              isTelegramWebApp: true,
              telegramUser: null
            }));
          }
        } catch (error) {
          addLog(`❌ Error detecting Telegram user: ${error}`);
        }
      } else {
        addLog('⚠️ Not in Telegram WebApp - open from Telegram app');
        setStatus(prev => ({
          ...prev,
          isTelegramWebApp: false
        }));
      }
    };

    checkEnvironment();
  }, []);

  const testCompleteSync = async () => {
    setStatus(prev => ({ ...prev, isLoading: true }));
    addLog('🚀 Starting complete sync process...');
    addLog('📋 Steps: 1) Detect Telegram user → 2) Send to API → 3) Firebase Admin write');

    try {
      const success = await syncTelegramUser();
      const now = new Date();
      
      if (success) {
        const user = getTelegramUser();
        addLog('✅ Complete sync successful!');
        addLog(`📍 User saved at: telegram_users/${user?.id}`);
        addLog('🔍 Check Firebase Console for verification');
        
        setStatus(prev => ({
          ...prev,
          lastSyncTime: now,
          lastSyncSuccess: true,
          firebasePath: user ? `telegram_users/${user.id}` : null,
          isLoading: false
        }));
      } else {
        addLog('❌ Complete sync failed');
        setStatus(prev => ({
          ...prev,
          lastSyncTime: now,
          lastSyncSuccess: false,
          isLoading: false
        }));
      }
    } catch (error) {
      addLog(`❌ Sync error: ${error}`);
      setStatus(prev => ({
        ...prev,
        lastSyncTime: new Date(),
        lastSyncSuccess: false,
        isLoading: false
      }));
    }
  };

  const testAPIRoute = async () => {
    if (!status.telegramUser) {
      addLog('❌ No Telegram user available for API test');
      return;
    }

    setStatus(prev => ({ ...prev, isLoading: true }));
    addLog('🧪 Testing /api/sync-user route directly...');

    try {
      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramUser: status.telegramUser
        })
      });

      addLog(`📡 API response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ API sync successful: ${result.operation}`);
        addLog(`📍 Firebase path: ${result.path}`);
        
        setStatus(prev => ({
          ...prev,
          lastSyncOperation: result.operation,
          firebasePath: result.path
        }));
      } else {
        const error = await response.json();
        addLog(`❌ API error: ${error.error}`);
      }
    } catch (error) {
      addLog(`❌ API request error: ${error}`);
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const clearLogs = () => {
    setStatus(prev => ({ ...prev, logs: [] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🔄 Telegram User Sync Test
          </h1>
          <p className="text-gray-600">
            Test the complete user creation logic: Telegram WebApp → API Route → Firebase Admin SDK
          </p>
        </div>

        {/* Environment Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📱 Environment Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${
              status.isTelegramWebApp 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`text-xl ${
                  status.isTelegramWebApp ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.isTelegramWebApp ? '✅' : '❌'}
                </span>
                <span className={`font-medium ${
                  status.isTelegramWebApp ? 'text-green-800' : 'text-red-800'
                }`}>
                  {status.isTelegramWebApp ? 'Telegram WebApp' : 'Browser Mode'}
                </span>
              </div>
              <p className={`text-sm ${
                status.isTelegramWebApp ? 'text-green-700' : 'text-red-700'
              }`}>
                {status.isTelegramWebApp 
                  ? 'Running in Telegram Mini App environment' 
                  : 'Must be opened from Telegram app'
                }
              </p>
            </div>

            {status.telegramUser && (
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl text-blue-600">👤</span>
                  <span className="font-medium text-blue-800">Telegram User</span>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div><strong>ID:</strong> {status.telegramUser.id}</div>
                  <div><strong>Name:</strong> {status.telegramUser.first_name} {status.telegramUser.last_name || ''}</div>
                  <div><strong>Username:</strong> @{status.telegramUser.username || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Firebase Path Info */}
        {status.firebasePath && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🗄️ Firebase Information
            </h2>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Database URL:</strong><br />
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    https://tgfjf-5bbfe-default-rtdb.firebaseio.com
                  </code>
                </div>
                <div>
                  <strong>User Path:</strong><br />
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {status.firebasePath}
                  </code>
                </div>
                <div>
                  <strong>API Route:</strong><br />
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    /api/sync-user
                  </code>
                </div>
                <div>
                  <strong>Method:</strong><br />
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Firebase Admin SDK
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        {status.isTelegramWebApp && status.telegramUser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🧪 Test Controls
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button
                onClick={testCompleteSync}
                disabled={status.isLoading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status.isLoading ? '⏳ Syncing...' : '🔄 Test Complete Sync'}
              </button>

              <button
                onClick={testAPIRoute}
                disabled={status.isLoading}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status.isLoading ? '⏳ Testing...' : '🔗 Test API Route'}
              </button>
            </div>

            {/* Last Sync Status */}
            {status.lastSyncTime && (
              <div className={`p-3 rounded-lg ${
                status.lastSyncSuccess 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`font-medium ${
                  status.lastSyncSuccess ? 'text-green-800' : 'text-red-800'
                }`}>
                  {status.lastSyncSuccess ? '✅ Last Sync: Success' : '❌ Last Sync: Failed'}
                </div>
                <div className={`text-sm ${
                  status.lastSyncSuccess ? 'text-green-700' : 'text-red-700'
                }`}>
                  {status.lastSyncTime.toLocaleString()}
                  {status.lastSyncOperation && ` (${status.lastSyncOperation})`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📋 Sync Logs</h2>
            <button
              onClick={clearLogs}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {status.logs.length > 0 ? (
              status.logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No logs yet...</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Testing Instructions
          </h2>
          
          <div className="space-y-2 text-sm text-blue-800">
            <div><strong>1. Environment:</strong> Must be opened inside Telegram Mini WebApp</div>
            <div><strong>2. Complete Sync:</strong> Tests full flow: Detection → API → Firebase Admin</div>
            <div><strong>3. API Route Test:</strong> Tests /api/sync-user endpoint directly</div>
            <div><strong>4. Data Structure:</strong> Creates user with coins: 0, level: 1, vipTier: "free"</div>
            <div><strong>5. No Browser Users:</strong> Only real Telegram user IDs accepted</div>
            <div><strong>6. Verification:</strong> Check Firebase Console at <code className="bg-blue-100 px-1 rounded">telegram_users/{'{user_id}'}</code></div>
            <div><strong>7. Logs:</strong> Monitor console and logs panel for detailed operation status</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSyncTestPage;