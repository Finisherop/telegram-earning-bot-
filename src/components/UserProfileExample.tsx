/**
 * Simple User Profile Example Component
 * 
 * Shows basic user profile information.
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { getTelegramUser } from '@/lib/telegramUser';

const UserProfileExample = () => {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const telegramUser = getTelegramUser();
    setUser(telegramUser);
  }, []);

  if (!user) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">User Profile</h3>
        <p className="text-gray-600">No user data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">User Profile</h3>
      <div className="space-y-2">
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
                {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
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
        <div className="mt-4 space-y-1 text-sm text-gray-600">
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Language:</strong> {user.language_code}</p>
          <p><strong>Premium:</strong> {user.is_premium ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileExample;