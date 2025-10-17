/**
 * Telegram Firebase Integrator
 * 
 * Complete integration component that properly detects Telegram users
 * and saves them to Firebase with full verification
 */

'use client';

import { useEffect, useState } from 'react';
import { integrateTelegramWithFirebase, detectTelegramUser, getCachedTelegramUser } from '@/lib/telegramWebAppIntegration';

interface IntegrationStatus {
  isDetecting: boolean;
  isSaving: boolean;
  isComplete: boolean;
  telegramUser: any | null;
  firebaseSaved: boolean;
  error: string | null;
  attempts: number;
}

const TelegramFirebaseIntegrator = () => {
  const [status, setStatus] = useState<IntegrationStatus>({
    isDetecting: false,
    isSaving: false,
    isComplete: false,
    telegramUser: null,
    firebaseSaved: false,
    error: null,
    attempts: 0
  });

  useEffect(() => {
    const runIntegration = async () => {
      try {
        console.log('[Integrator 🚀] Starting Telegram + Firebase integration...');
        
        setStatus(prev => ({
          ...prev,
          isDetecting: true,
          attempts: prev.attempts + 1
        }));

        // STEP 1: Detect Telegram user (with built-in retry logic)
        console.log('[Integrator 🔍] Detecting Telegram user...');
        const telegramUser = await detectTelegramUser();

        if (!telegramUser) {
          console.log('[Integrator ❌] No Telegram user found - stopping integration');
          setStatus(prev => ({
            ...prev,
            isDetecting: false,
            isComplete: true,
            error: 'Not in Telegram WebApp environment'
          }));
          return;
        }

        console.log('[Integrator ✅] Telegram user detected:', {
          id: telegramUser.id,
          name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
          username: telegramUser.username || 'N/A'
        });

        setStatus(prev => ({
          ...prev,
          isDetecting: false,
          isSaving: true,
          telegramUser
        }));

        // STEP 2: Complete integration (save to Firebase)
        console.log('[Integrator 💾] Saving to Firebase...');
        const success = await integrateTelegramWithFirebase();

        if (success) {
          console.log('[Integrator ✅] Integration completed successfully');
          setStatus(prev => ({
            ...prev,
            isSaving: false,
            isComplete: true,
            firebaseSaved: true,
            error: null
          }));
        } else {
          console.log('[Integrator ❌] Firebase save failed');
          setStatus(prev => ({
            ...prev,
            isSaving: false,
            isComplete: true,
            firebaseSaved: false,
            error: 'Firebase save failed'
          }));
        }

      } catch (error) {
        console.error('[Integrator ❌] Integration error:', error);
        setStatus(prev => ({
          ...prev,
          isDetecting: false,
          isSaving: false,
          isComplete: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    // Check if we already have a cached user
    const cachedUser = getCachedTelegramUser();
    if (cachedUser) {
      console.log('[Integrator ✅] Using cached Telegram user:', cachedUser.id);
      setStatus(prev => ({
        ...prev,
        telegramUser: cachedUser,
        isComplete: true,
        firebaseSaved: true
      }));
      return;
    }

    // Run integration
    runIntegration();
  }, []);

  // Show debug info only if debug mode is enabled
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    return (
      <div className="fixed top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-xs z-50 max-w-sm">
        <div className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">🔗</span>
          Telegram + Firebase Integration
        </div>
        
        <div className="space-y-2">
          {/* Detection Status */}
          <div className="flex justify-between items-center">
            <span>Telegram Detection:</span>
            <span className={`flex items-center ${
              status.isDetecting ? 'text-yellow-600' : 
              status.telegramUser ? 'text-green-600' : 'text-red-600'
            }`}>
              {status.isDetecting ? (
                <>⏳ Detecting...</>
              ) : status.telegramUser ? (
                <>✅ Found</>
              ) : (
                <>❌ Not Found</>
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

          {/* Firebase Status */}
          <div className="flex justify-between items-center">
            <span>Firebase Save:</span>
            <span className={`flex items-center ${
              status.isSaving ? 'text-yellow-600' : 
              status.firebaseSaved ? 'text-green-600' : 
              status.isComplete ? 'text-red-600' : 'text-gray-500'
            }`}>
              {status.isSaving ? (
                <>⏳ Saving...</>
              ) : status.firebaseSaved ? (
                <>✅ Saved</>
              ) : status.isComplete ? (
                <>❌ Failed</>
              ) : (
                <>⏸️ Pending</>
              )}
            </span>
          </div>

          {/* Firebase Path */}
          {status.telegramUser && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
              <div className="font-medium text-blue-800 mb-1">Firebase Path:</div>
              <code className="text-blue-700 text-xs bg-blue-100 px-2 py-1 rounded">
                telegram_users/{status.telegramUser.id}
              </code>
            </div>
          )}

          {/* Attempts Counter */}
          {status.attempts > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span>Attempts:</span>
              <span>{status.attempts}</span>
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
          {status.isComplete && status.firebaseSaved && !status.error && (
            <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
              <div className="font-medium text-green-800 mb-1">✅ Success!</div>
              <div className="text-green-700 text-xs">
                User data saved to Firebase at correct path
              </div>
            </div>
          )}

          {/* Not Telegram WebApp */}
          {status.isComplete && !status.telegramUser && !status.error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
              <div className="font-medium text-yellow-800 mb-1">ℹ️ Info</div>
              <div className="text-yellow-700 text-xs">
                Not running in Telegram WebApp environment
              </div>
            </div>
          )}
        </div>

        {/* Console Reminder */}
        <div className="mt-3 pt-2 border-t border-gray-200 text-gray-500 text-xs">
          💡 Check browser console for detailed logs
        </div>
      </div>
    );
  }

  // Silent operation in production
  return null;
};

export default TelegramFirebaseIntegrator;