/**
 * Telegram Firebase Direct Sync Component
 * 
 * Fixes the data flow issue - ensures Telegram WebApp user data flows directly to Firebase
 * No intermediate steps that can lose the user data
 */

'use client';

import { useEffect, useState } from 'react';
import { syncTelegramToFirebase, isTelegramWebApp, getCurrentTelegramUser } from '@/lib/telegramFirebaseSync';

interface SyncStatus {
  isChecking: boolean;
  isTelegramWebApp: boolean;
  telegramUser: any | null;
  isSyncing: boolean;
  syncSuccess: boolean;
  error: string | null;
  firebasePath: string | null;
}

const TelegramFirebaseDirectSync = () => {
  const [status, setStatus] = useState<SyncStatus>({
    isChecking: true,
    isTelegramWebApp: false,
    telegramUser: null,
    isSyncing: false,
    syncSuccess: false,
    error: null,
    firebasePath: null
  });

  useEffect(() => {
    const performDirectSync = async () => {
      try {
        console.log('[DirectSync] 🚀 Starting direct Telegram → Firebase sync...');

        // STEP 1: Check if we're in Telegram WebApp
        setStatus(prev => ({ ...prev, isChecking: true }));
        
        const isWebApp = isTelegramWebApp();
        console.log('[DirectSync] 📱 Is Telegram WebApp:', isWebApp);

        if (!isWebApp) {
          console.log('[DirectSync] ⚠️ Not in Telegram WebApp - no sync needed');
          setStatus(prev => ({
            ...prev,
            isChecking: false,
            isTelegramWebApp: false,
            error: 'Not in Telegram WebApp environment'
          }));
          return;
        }

        // STEP 2: Get Telegram user
        console.log('[DirectSync] 👤 Getting Telegram user...');
        const telegramUser = await getCurrentTelegramUser();
        
        if (!telegramUser) {
          console.error('[DirectSync] ❌ Failed to get Telegram user');
          setStatus(prev => ({
            ...prev,
            isChecking: false,
            isTelegramWebApp: true,
            error: 'Failed to get Telegram user data'
          }));
          return;
        }

        console.log('[DirectSync] ✅ Telegram user obtained:', {
          id: telegramUser.id,
          first_name: telegramUser.first_name,
          username: telegramUser.username || 'N/A'
        });

        setStatus(prev => ({
          ...prev,
          isChecking: false,
          isTelegramWebApp: true,
          telegramUser,
          isSyncing: true,
          firebasePath: `telegram_users/${telegramUser.id}`
        }));

        // STEP 3: Direct sync to Firebase
        console.log('[DirectSync] 💾 Syncing to Firebase...');
        const syncSuccess = await syncTelegramToFirebase();

        if (syncSuccess) {
          console.log('[DirectSync] ✅ Direct sync completed successfully');
          setStatus(prev => ({
            ...prev,
            isSyncing: false,
            syncSuccess: true,
            error: null
          }));
        } else {
          console.error('[DirectSync] ❌ Direct sync failed');
          setStatus(prev => ({
            ...prev,
            isSyncing: false,
            syncSuccess: false,
            error: 'Firebase sync failed'
          }));
        }

      } catch (error) {
        console.error('[DirectSync] ❌ Direct sync error:', error);
        setStatus(prev => ({
          ...prev,
          isChecking: false,
          isSyncing: false,
          syncSuccess: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    // Start the direct sync process
    performDirectSync();
  }, []);

  // Show debug info only if debug mode is enabled
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-xs z-50 max-w-sm">
        <div className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">🔄</span>
          Telegram → Firebase Direct Sync
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

          {/* Telegram User */}
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

          {/* Firebase Sync Status */}
          <div className="flex justify-between items-center">
            <span>Firebase Sync:</span>
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

          {/* Firebase Path */}
          {status.firebasePath && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
              <div className="font-medium text-blue-800 mb-1">Firebase Path:</div>
              <code className="text-blue-700 text-xs bg-blue-100 px-2 py-1 rounded break-all">
                {status.firebasePath}
              </code>
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
                Telegram user data saved to Firebase
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

export default TelegramFirebaseDirectSync;