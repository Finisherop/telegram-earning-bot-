/**
 * Telegram User Sync Manager Component
 * 
 * Manages Telegram user detection and Firebase sync via API route
 * Only works in Telegram Mini App environment
 */

'use client';

import { useEffect, useState } from 'react';
import { syncTelegramUser, isTelegramWebApp, getTelegramUser } from '@/lib/telegramUserSync';

interface SyncStatus {
  isChecking: boolean;
  isTelegramWebApp: boolean;
  telegramUser: any | null;
  isSyncing: boolean;
  syncSuccess: boolean;
  syncOperation: 'create' | 'update' | null;
  firebasePath: string | null;
  error: string | null;
}

const TelegramUserSyncManager = () => {
  const [status, setStatus] = useState<SyncStatus>({
    isChecking: true,
    isTelegramWebApp: false,
    telegramUser: null,
    isSyncing: false,
    syncSuccess: false,
    syncOperation: null,
    firebasePath: null,
    error: null
  });

  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('[Sync Manager] 🚀 Initializing Telegram user sync...');

        // Check if we're in Telegram WebApp
        setStatus(prev => ({ ...prev, isChecking: true }));
        
        const isWebApp = isTelegramWebApp();
        console.log('[Sync Manager] 📱 Is Telegram WebApp:', isWebApp);

        if (!isWebApp) {
          console.log('[Sync Manager] ⚠️ Not in Telegram WebApp - no sync needed');
          setStatus(prev => ({
            ...prev,
            isChecking: false,
            isTelegramWebApp: false,
            error: 'Not in Telegram WebApp environment'
          }));
          return;
        }

        setStatus(prev => ({
          ...prev,
          isChecking: false,
          isTelegramWebApp: true,
          isSyncing: true
        }));

        // Perform complete sync
        console.log('[Sync Manager] 🔄 Starting sync process...');
        const syncResult = await syncTelegramUser();

        // Get user data after sync
        const telegramUser = getTelegramUser();

        if (syncResult && telegramUser) {
          console.log('[Sync Manager] ✅ Sync completed successfully');
          setStatus(prev => ({
            ...prev,
            isSyncing: false,
            syncSuccess: true,
            telegramUser,
            firebasePath: `telegram_users/${telegramUser.id}`,
            error: null
          }));
        } else {
          console.log('[Sync Manager] ❌ Sync failed');
          setStatus(prev => ({
            ...prev,
            isSyncing: false,
            syncSuccess: false,
            error: 'Sync failed - check console for details'
          }));
        }

      } catch (error) {
        console.error('[Sync Manager] ❌ Initialization error:', error);
        setStatus(prev => ({
          ...prev,
          isChecking: false,
          isSyncing: false,
          syncSuccess: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    initializeSync();
  }, []);

  // Show debug info only if debug mode is enabled
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    return (
      <div className="fixed top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-xs z-50 max-w-sm">
        <div className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">🔄</span>
          Telegram User Sync Manager
        </div>
        
        <div className="space-y-2">
          {/* Environment Check */}
          <div className="flex justify-between items-center">
            <span>Environment:</span>
            <span className={`flex items-center ${
              status.isChecking ? 'text-yellow-600' : 
              status.isTelegramWebApp ? 'text-green-600' : 'text-red-600'
            }`}>
              {status.isChecking ? (
                <>⏳ Checking...</>
              ) : status.isTelegramWebApp ? (
                <>✅ Telegram WebApp</>
              ) : (
                <>❌ Browser</>
              )}
            </span>
          </div>

          {/* Sync Status */}
          <div className="flex justify-between items-center">
            <span>Sync Status:</span>
            <span className={`flex items-center ${
              status.isSyncing ? 'text-yellow-600' : 
              status.syncSuccess ? 'text-green-600' : 
              status.error ? 'text-red-600' : 'text-gray-500'
            }`}>
              {status.isSyncing ? (
                <>⏳ Syncing...</>
              ) : status.syncSuccess ? (
                <>✅ Success</>
              ) : status.error ? (
                <>❌ Failed</>
              ) : (
                <>⏸️ Pending</>
              )}
            </span>
          </div>

          {/* Telegram User Info */}
          {status.telegramUser && (
            <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
              <div className="font-medium text-green-800 mb-1">Telegram User:</div>
              <div className="text-green-700 space-y-1">
                <div><strong>ID:</strong> {status.telegramUser.id}</div>
                <div><strong>Name:</strong> {status.telegramUser.first_name} {status.telegramUser.last_name || ''}</div>
                <div><strong>Username:</strong> @{status.telegramUser.username || 'N/A'}</div>
              </div>
            </div>
          )}

          {/* Firebase Path */}
          {status.firebasePath && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
              <div className="font-medium text-blue-800 mb-1">Firebase Path:</div>
              <code className="text-blue-700 text-xs bg-blue-100 px-2 py-1 rounded break-all">
                {status.firebasePath}
              </code>
            </div>
          )}

          {/* Operation Type */}
          {status.syncOperation && (
            <div className="flex justify-between items-center">
              <span>Operation:</span>
              <span className={`text-xs px-2 py-1 rounded ${
                status.syncOperation === 'create' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {status.syncOperation === 'create' ? '🆕 Created' : '🔄 Updated'}
              </span>
            </div>
          )}

          {/* Error Display */}
          {status.error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
              <div className="font-medium text-red-800 mb-1">Error:</div>
              <div className="text-red-700 text-xs break-words">{status.error}</div>
            </div>
          )}

          {/* Success Message */}
          {status.syncSuccess && !status.error && (
            <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
              <div className="font-medium text-green-800 mb-1">✅ Sync Complete!</div>
              <div className="text-green-700 text-xs">
                User data synced to Firebase via API route
              </div>
            </div>
          )}

          {/* Not Telegram WebApp */}
          {!status.isChecking && !status.isTelegramWebApp && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
              <div className="font-medium text-yellow-800 mb-1">ℹ️ Info</div>
              <div className="text-yellow-700 text-xs">
                Open this app from Telegram to sync user data
              </div>
            </div>
          )}
        </div>

        {/* Console Reminder */}
        <div className="mt-3 pt-2 border-t border-gray-200 text-gray-500 text-xs">
          💡 Check console for detailed sync logs
        </div>
      </div>
    );
  }

  // Silent operation in production
  return null;
};

export default TelegramUserSyncManager;