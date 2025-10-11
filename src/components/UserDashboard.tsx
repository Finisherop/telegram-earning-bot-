'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import EnhancedDashboard from './user/EnhancedDashboard';
import Task from './user/Task';
import Referral from './user/Referral';
import ShopWithdrawal from './user/ShopWithdrawal';
import Profile from './user/Profile';
import SkeletonLoader from './SkeletonLoader';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'task', label: 'Tasks', icon: '📋' },
  { id: 'referral', label: 'Referral', icon: '👥' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'shop', label: 'Shop/W.D.', icon: '💎' },
];

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, isLoading, hasError, isAuthenticated, updateUser } = useEnhancedAuth();

  // Handle user updates with optimistic UI
  const handleUserUpdate = useCallback(async (updateData: Partial<User>) => {
    if (!user?.telegramId) return;
    
    try {
      await updateUser(updateData);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, [user?.telegramId, updateUser]);

  // Show skeleton loader while data is loading
  if (isLoading || (!user && !hasError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Loading Banner */}
        <div className="bg-primary/90 text-white p-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Loading user data...</span>
          </div>
        </div>
        
        {/* Skeleton Content */}
        <SkeletonLoader 
          variant={activeTab as any}
          className="pb-20"
        />
        
        {/* Bottom Navigation Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="flex justify-around items-center py-2">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex flex-col items-center py-2 px-3">
                <div className="w-6 h-6 bg-gray-300 rounded mb-1 animate-pulse"></div>
                <div className="w-12 h-3 bg-gray-300 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">
            Failed to load user data. Please check your internet connection and try again.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EnhancedDashboard user={user} onUserUpdate={handleUserUpdate} />;
      case 'task':
        return <Task user={user} />;
      case 'referral':
        return <Referral user={user} />;
      case 'profile':
        return <Profile user={user} />;
      case 'shop':
        return (
          <ShopWithdrawal 
            user={user} 
            setUser={(updatedUser) => handleUserUpdate(updatedUser)}
            onClose={() => setActiveTab('dashboard')} 
          />
        );
      default:
        return <EnhancedDashboard user={user} onUserUpdate={handleUserUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Sync Status Banner (only show if there are sync issues) */}
      {hasError && user && (
        <div className="bg-yellow-500/90 text-white p-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs">⚠️ Sync issues - working offline</span>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="relative">
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