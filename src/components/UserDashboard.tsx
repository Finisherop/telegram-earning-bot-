'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import { useUserData, useTasks, useSyncStatus } from '@/hooks/useRealtimeSync';
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
  const [telegramId, setTelegramId] = useState<string | null>(null);

  // Get Telegram user ID and initialize user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initializeUser = async () => {
        try {
          const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          let userId: string;
          let userInfo: any = {};
          
          if (tgUser?.id) {
            // Real Telegram user only
            userId = String(tgUser.id);
            userInfo = {
              firstName: tgUser.first_name || 'User',
              lastName: tgUser.last_name || '',
              username: tgUser.username || '',
              profilePic: tgUser.photo_url || ''
            };
            console.log('[UserDashboard] Real Telegram user detected:', userId, userInfo);
          } else {
            // NO browser fallback - exit silently
            console.log('[UserDashboard] ⚠️ Not in Telegram WebApp environment - no user created');
            return;
          }
          
          setTelegramId(userId);
          
          // Initialize user in Firebase if not exists
          const { initializeUser: initUser } = await import('@/lib/firebaseService');
          await initUser(userId);
          
          // Update user info if we have new data
          if (userInfo.firstName && userInfo.firstName !== 'User') {
            const { safeUpdateUser } = await import('@/lib/firebaseService');
            await safeUpdateUser(userId, userInfo);
          }
          
        } catch (error) {
          console.error('[UserDashboard] Error initializing user:', error);
          // NO fallback - exit silently if not Telegram WebApp
          return;
        }
      };
      
      initializeUser();
    }
  }, []);

  // Use real-time sync hooks
  const { data: user, isLoading, error, updateUser } = useUserData(telegramId);
  const { data: tasks } = useTasks();
  const { isOnline, timeSinceLastSync } = useSyncStatus();

  // Handle user updates with real-time sync
  const handleUserUpdate = useCallback(async (updateData: Partial<User>) => {
    if (!telegramId) return;
    
    console.log('[UserDashboard] 💾 Updating user data with real-time sync:', updateData);
    
    try {
      await updateUser(updateData);
      console.log('[UserDashboard] ✅ User update successful');
    } catch (error) {
      console.error('[UserDashboard] ❌ User update failed:', error);
    }
  }, [telegramId, updateUser]);

  // Show skeleton loader while data is loading
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Real-time Sync Status */}
        {!isOnline && (
          <div className="bg-amber-500/90 text-white p-2 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs">Offline - Using cached data</span>
            </div>
          </div>
        )}
        
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

  // Handle errors silently with cached data
  if (error && !user) {
    console.warn('[UserDashboard] Error loading user data:', error);
    return null;
  }

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
      {/* Real-time Sync Status Banner */}
      {!isOnline && (
        <div className="bg-amber-500/90 text-white p-1 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs">Offline - Using cached data</span>
          </div>
        </div>
      )}
      
      {/* Sync Status Indicator */}
      {isOnline && timeSinceLastSync > 30000 && (
        <div className="bg-blue-500/90 text-white p-1 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-xs">Syncing latest data...</span>
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