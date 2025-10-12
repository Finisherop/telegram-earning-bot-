/**
 * Simple Telegram User Demo Component
 * 
 * Shows basic Telegram user information.
 */

'use client';

import React from 'react';
import { getTelegramUser } from '@/lib/telegramUser';

const TelegramUserWriterDemo = () => {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const telegramUser = getTelegramUser();
    setUser(telegramUser);
  }, []);

  if (!user) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No Telegram user data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800 mb-2">Telegram User Data</h3>
      <div className="space-y-1 text-sm text-green-700">
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
        {user.username && <p><strong>Username:</strong> @{user.username}</p>}
        <p><strong>Language:</strong> {user.language_code}</p>
        <p><strong>Premium:</strong> {user.is_premium ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default TelegramUserWriterDemo;