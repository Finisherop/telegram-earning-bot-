/**
 * Example component showing how to use the new Telegram User Sync
 * 
 * Demonstrates:
 * - Getting cached user data
 * - Checking if in Telegram WebApp environment
 * - Displaying user info safely
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getTelegramUser, isTelegramWebApp } from '@/lib/getTelegramUser';

interface TelegramUserData {
  userId: string;
  name: string;
  profileUrl: string;
  isFromCache: boolean;
}

const TelegramUserExample = () => {
  const [user, setUser] = useState<TelegramUserData | null>(null);
  const [isWebApp, setIsWebApp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      setIsWebApp(isTelegramWebApp());
      const userData = getTelegramUser();
      setUser(userData);
      setLoading(false);
    };

    // Check immediately
    checkUser();

    // Check again after a short delay to ensure Telegram WebApp is fully loaded
    const timeout = setTimeout(checkUser, 1000);

    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mb-3"></div>
          <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
          <div className="w-24 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isWebApp) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <div>
            <h3 className="font-medium text-yellow-800">Not in Telegram WebApp</h3>
            <p className="text-sm text-yellow-600">
              This app is designed to run inside Telegram Mini WebApp
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600">ℹ️</span>
          <div>
            <h3 className="font-medium text-blue-800">User data not available</h3>
            <p className="text-sm text-blue-600">
              Telegram user sync is in progress...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
          {user.profileUrl ? (
            <Image
              src={user.profileUrl}
              alt={user.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-blue-600 text-2xl">👤</span>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600">ID: {user.userId}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              user.isFromCache 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user.isFromCache ? '💾 Cached' : '🔄 Live'}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              📱 Telegram WebApp
            </span>
          </div>
        </div>
      </div>
      
      {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
          <strong>Debug Info:</strong>
          <pre className="mt-1 text-gray-600">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TelegramUserExample;