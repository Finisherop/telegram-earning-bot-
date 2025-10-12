/**
 * Clean Main Dashboard Component
 * 
 * Simple dashboard that displays user information and provides navigation.
 */

'use client';

import { motion } from 'framer-motion';
import { UserData } from '@/lib/telegramUser';
import UserDashboard from './user/Dashboard';

interface MainDashboardProps {
  user: UserData;
}

const MainDashboard = ({ user }: MainDashboardProps) => {
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center space-x-4">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.first_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.first_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome, {user.first_name}!
              </h1>
              <p className="text-gray-600">
                {user.username ? `@${user.username}` : `User ID: ${user.id}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <UserDashboard user={user} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MainDashboard;