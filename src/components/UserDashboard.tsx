'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import { 
  subscribeToUser, 
  subscribeToTasks, 
  subscribeToUserTasks,
  safeUpdateUser,
  getTasks,
  getUserTasks,
  getWithdrawalRequests
} from '@/lib/firebaseService';
import { hybridDataManager } from '@/lib/hybridDataManager.js';
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
            // Real Telegram user
            userId = String(tgUser.id);
            userInfo = {
              firstName: tgUser.first_name || 'User',
              lastName: tgUser.last_name || '',
              username: tgUser.username || '',
              profilePic: tgUser.photo_url || ''
            };
            console.log('[UserDashboard] Telegram user detected:', userId, userInfo);
          } else {
            // Fallback for browser mode
            userId = localStorage.getItem('browser_user_id') || `browser_${Date.now()}`;
            localStorage.setItem('browser_user_id', userId);
            userInfo = {
              firstName: 'Browser User',
              lastName: '',
              username: 'browseruser',
              profilePic: ''
            };
            console.log('[UserDashboard] Browser mode user:', userId);
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
          // Silent fallback
          const fallbackId = 'browser_user';
          setTelegramId(fallbackId);
        }
      };
      
      initializeUser();
    }
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<any>([]);
  const [userTasks, setUserTasks] = useState<any>([]);
  const [withdrawals, setWithdrawals] = useState<any>([]);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: true });

  useEffect(() => {
    if (!telegramId) return;

    setIsLoading(true);
    
    // Subscribe to user data using hybrid system
    console.log('[UserDashboard] Setting up hybrid data subscription for:', telegramId);
    const unsubscribeUser = hybridDataManager.subscribeToUserData(telegramId, (userData: any) => {
      console.log('[UserDashboard] 🔄 Hybrid user data received:', userData);
      if (userData) {
        // Ensure telegramId is always set
        userData.telegramId = userData.telegramId || userData.id || telegramId;
        console.log('[UserDashboard] ✅ User data processed:', {
          telegramId: userData.telegramId,
          coins: userData.coins,
          source: userData.source
        });
      }
      setUser(userData);
      setIsLoading(false);
    });

    // Subscribe to tasks
    const unsubscribeTasks = subscribeToTasks(setTasks);
    
    // Subscribe to user tasks
    const unsubscribeUserTasks = subscribeToUserTasks(telegramId, setUserTasks);

    // Load withdrawals
    getWithdrawalRequests().then(setWithdrawals);

    return () => {
      unsubscribeUser();
      unsubscribeTasks();
      unsubscribeUserTasks();
    };
  }, [telegramId]);

  // Handle user updates with hybrid system
  const handleUserUpdate = useCallback(async (updateData: Partial<User>) => {
    if (!telegramId) return;
    
    console.log('[UserDashboard] 💾 Updating user data:', updateData);
    
    // Update using hybrid system (LocalStorage + Firebase)
    if (user) {
      const updatedUser = { ...user, ...updateData };
      const success = await hybridDataManager.saveUserData(telegramId, updatedUser);
      console.log('[UserDashboard] User update result:', success ? '✅' : '❌');
    }
  }, [telegramId, user]);

  // Show skeleton loader while data is loading
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Connection Status - Silent */}
        {!connectionStatus.isConnected && (
          <div className="bg-gray-500/90 text-white p-2 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs">Syncing...</span>
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

  // No error states - silent handling

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
      {/* Connection Status Banner (silent) */}
      {!connectionStatus.isConnected && (
        <div className="bg-gray-500/90 text-white p-1 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs">Syncing...</span>
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