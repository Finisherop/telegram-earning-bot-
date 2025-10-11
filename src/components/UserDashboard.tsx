'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import EnhancedDashboard from './user/EnhancedDashboard';
import Task from './user/Task';
import Referral from './user/Referral';
import ShopWithdrawal from './user/ShopWithdrawal';
import UserDataDisplay from './UserDataDisplay';

interface UserDashboardProps {
  user: User | null;
  setUser?: (user: User) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'task', label: 'Tasks', icon: '📋' },
  { id: 'referral', label: 'Referral', icon: '👥' },
  { id: 'shop', label: 'Shop/W.D.', icon: '💎' },
];

const UserDashboard = ({ user, setUser }: UserDashboardProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Create a safe user object with defaults to prevent undefined errors
  const safeUser: User = user || {
    id: 'loading',
    telegramId: 'loading',
    userId: 'loading',
    username: 'loading',
    firstName: 'Loading...',
    lastName: '',
    coins: 0,
    xp: 0,
    level: 1,
    vipTier: 'free',
    farmingMultiplier: 1.0,
    referralMultiplier: 1.0,
    adsLimitPerDay: 5,
    withdrawalLimit: 1,
    minWithdrawal: 200,
    referralCount: 0,
    referralEarnings: 0,
    dailyStreak: 0,
    badges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const isLoading = !user;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            {!isLoading && <UserDataDisplay />}
            <EnhancedDashboard user={safeUser} />
          </div>
        );
      case 'task':
        return <Task user={safeUser} />;
      case 'referral':
        return <Referral user={safeUser} />;
      case 'shop':
        return (
          <ShopWithdrawal 
            user={safeUser} 
            setUser={setUser || (() => {})} 
            onClose={() => setActiveTab('dashboard')} 
          />
        );
      default:
        return <EnhancedDashboard user={safeUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Loading overlay - shows while data loads in background */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-white p-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Loading user data...</span>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center py-2">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-500 hover:text-primary'
              }`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                className="text-xl mb-1"
                animate={{
                  scale: activeTab === tab.id ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {tab.icon}
              </motion.span>
              <span className="text-xs font-medium">{tab.label}</span>
              
              {activeTab === tab.id && (
                <motion.div
                  className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                  layoutId="activeTab"
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;