'use client';

import Image from 'next/image';
import { useTelegramUser } from '@/hooks/useTelegramUser';

export default function UserDataDisplay() {
  const { user, loading, error } = useTelegramUser();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No User Data</h3>
        <p className="text-yellow-600">No Telegram user data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">User Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {user.photo_url ? (
              <Image
                src={user.photo_url}
                alt={user.first_name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user.first_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h4 className="font-medium text-gray-800">
                {user.first_name} {user.last_name}
              </h4>
              {user.username && (
                <p className="text-sm text-gray-600">@{user.username}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">User ID:</span>
            <span className="font-medium">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Language:</span>
            <span className="font-medium">{user.language_code?.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Premium:</span>
            <span className={`font-medium ${user.is_premium ? 'text-yellow-600' : 'text-gray-500'}`}>
              {user.is_premium ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium text-green-600">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}