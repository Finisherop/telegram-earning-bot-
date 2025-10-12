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