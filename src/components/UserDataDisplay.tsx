'use client';

import { useTelegramUser } from '@/hooks/useTelegramUser';

export default function UserDataDisplay() {
  const { 
    userData, 
    isLoading, 
    error, 
    isAuthenticated, 
    isTelegramUser, 
    isBrowserUser, 
    displayName 
  } = useTelegramUser();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading User Data</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!isAuthenticated || !userData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No User Data</h3>
        <p className="text-yellow-600">Unable to capture user data. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {isTelegramUser ? '📱 Telegram User Data' : '🌐 Browser User Data'}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isTelegramUser 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {userData.source.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">User ID</label>
            <p className="text-gray-900 font-mono text-sm">{userData.id}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="text-gray-900">
              {userData.first_name}
              {userData.last_name && ` ${userData.last_name}`}
            </p>
          </div>

          {userData.username && (
            <div>
              <label className="text-sm font-medium text-gray-500">Username</label>
              <p className="text-gray-900">@{userData.username}</p>
            </div>
          )}

          {isTelegramUser && (userData as any).language_code && (
            <div>
              <label className="text-sm font-medium text-gray-500">Language</label>
              <p className="text-gray-900">{(userData as any).language_code}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">Captured At</label>
            <p className="text-gray-900 text-sm">
              {new Date(userData.capturedAt).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Last Seen</label>
            <p className="text-gray-900 text-sm">
              {new Date(userData.lastSeen).toLocaleString()}
            </p>
          </div>

          {isTelegramUser && (userData as any).is_premium !== undefined && (
            <div>
              <label className="text-sm font-medium text-gray-500">Telegram Premium</label>
              <p className="text-gray-900">
                {(userData as any).is_premium ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          )}

          {isTelegramUser && (userData as any).platform && (
            <div>
              <label className="text-sm font-medium text-gray-500">Platform</label>
              <p className="text-gray-900">{(userData as any).platform}</p>
            </div>
          )}
        </div>
      </div>

      {isTelegramUser && (userData as any).photo_url && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="text-sm font-medium text-gray-500 block mb-2">Profile Picture</label>
          <img 
            src={(userData as any).photo_url} 
            alt="Profile" 
            className="w-16 h-16 rounded-full border-2 border-gray-200"
          />
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          ✅ User data automatically captured and stored in Firebase
          {isTelegramUser ? ' (from Telegram WebApp)' : ' (browser fallback)'}
        </p>
      </div>
    </div>
  );
}