/**
 * Telegram Sync Test Page
 * 
 * Direct testing of Telegram WebApp → Firebase sync
 * Shows real-time status and allows manual sync testing
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  syncTelegramToFirebase, 
  isTelegramWebApp, 
  getCurrentTelegramUser,
  updateTelegramUserInFirebase 
} from '@/lib/telegramFirebaseSync';

interface TestStatus {
  isTelegramWebApp: boolean;
  telegramUser: any | null;
  lastSyncTime: Date | null;
  lastSyncSuccess: boolean;
  isLoading: boolean;
  logs: string[];
}

const TelegramSyncTestPage = () => {
  const [status, setStatus] = useState<TestStatus>({
    isTelegramWebApp: false,
    telegramUser: null,
    lastSyncTime: null,
    lastSyncSuccess: false,
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
          const user = await getCurrentTelegramUser();
          if (user) {
            addLog(`✅ Telegram user found: ID ${user.id}, Name: ${user.first_name}`);
            setStatus(prev => ({
              ...prev,
              isTelegramWebApp: true,
              telegramUser: user
            }));
          } else {
            addLog('❌ Failed to get Telegram user data');
            setStatus(prev => ({
              ...prev,
              isTelegramWebApp: true,
              telegramUser: null
            }));
          }
        } catch (error) {
          addLog(`❌ Error getting Telegram user: ${error}`);
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

  const testDirectSync = async () => {
    setStatus(prev => ({ ...prev, isLoading: true }));
    addLog('🚀 Starting direct Telegram → Firebase sync...');

    try {
      const success = await syncTelegramToFirebase();
      const now = new Date();
      
      if (success) {
        addLog('✅ Direct sync successful!');
        addLog(`📍 Data saved to: telegram_users/${status.telegramUser?.id}`);
        setStatus(prev => ({
          ...prev,
          lastSyncTime: now,
          lastSyncSuccess: true,
          isLoading: false
        }));
      } else {
        addLog('❌ Direct sync failed');
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

  const testUpdateCoins = async () => {
    if (!status.telegramUser) {
      addLog('❌ No Telegram user available for update');
      return;
    }

    setStatus(prev => ({ ...prev, isLoading: true }));
    const newCoins = Math.floor(Math.random() * 1000);
    addLog(`🪙 Testing coins update to ${newCoins}...`);

    try {
      const success = await updateTelegramUserInFirebase({ coins: newCoins });
      
      if (success) {
        addLog(`✅ Coins updated to ${newCoins}`);
      } else {
        addLog('❌ Coins update failed');
      }
    } catch (error) {
      addLog(`❌ Update error: ${error}`);
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
            🔄 Telegram → Firebase Direct Sync Test
          </h1>
          <p className="text-gray-600">
            Test the direct data flow from Telegram WebApp to Firebase Realtime Database
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
                  ? 'Running in Telegram WebApp environment' 
                  : 'Open this page from Telegram app'
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
                  <div><strong>Firebase Path:</strong> <code className="bg-blue-100 px-1 rounded">telegram_users/{status.telegramUser.id}</code></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Controls */}
        {status.isTelegramWebApp && status.telegramUser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🧪 Test Controls
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button
                onClick={testDirectSync}
                disabled={status.isLoading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status.isLoading ? '⏳ Syncing...' : '🔄 Test Direct Sync'}
              </button>

              <button
                onClick={testUpdateCoins}
                disabled={status.isLoading}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status.isLoading ? '⏳ Updating...' : '🪙 Test Update Coins'}
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
            <div><strong>1. Environment:</strong> This page must be opened inside Telegram Mini WebApp</div>
            <div><strong>2. Direct Sync:</strong> Tests the complete Telegram → Firebase data flow</div>
            <div><strong>3. Update Test:</strong> Tests updating existing user data in Firebase</div>
            <div><strong>4. Verification:</strong> Check Firebase Console at <code className="bg-blue-100 px-1 rounded">telegram_users/{'{user_id}'}</code></div>
            <div><strong>5. Logs:</strong> Monitor console and logs panel for detailed operation status</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSyncTestPage;