'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserData } from '@/lib/telegramUser';

interface DashboardProps {
  user: UserData;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-medium">{user.userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
            </div>
            {user.username && (
              <div className="flex justify-between">
                <span className="text-gray-600">Username:</span>
                <span className="font-medium">@{user.username}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Language:</span>
              <span className="font-medium">{user.languageCode.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Premium:</span>
              <span className={`font-medium ${user.isPremium ? 'text-yellow-600' : 'text-gray-500'}`}>
                {user.isPremium ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member Since:</span>
              <span className="font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Activity Card */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Activity</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <div>
              <h3 className="font-medium text-green-800">Last Seen</h3>
              <p className="text-sm text-green-600">
                {new Date(user.lastSeen).toLocaleString()}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-medium text-blue-800">Current Time</h3>
              <p className="text-sm text-blue-600">
                {currentTime.toLocaleString()}
              </p>
            </div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </motion.div>

      {/* Status Card */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Status</h2>
        <div className="flex items-center justify-center p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Connected</h3>
            <p className="text-gray-600">Your Telegram user data is safely stored</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;