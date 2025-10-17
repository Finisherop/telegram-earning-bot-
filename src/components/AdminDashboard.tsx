'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllUsers, useWithdrawals, useTasks, useSyncStatus } from '@/hooks/useRealtimeSync';
import AdminStats from './admin/AdminStats';
import EnhancedAdminSettings from './admin/EnhancedAdminSettings';
import AdminApprovals from './admin/AdminApprovals';
import TaskManager from './admin/TaskManager';

const tabs = [
  { id: 'stats', label: 'Dashboard', icon: '📊' },
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'approvals', label: 'W/D Requests', icon: '💸' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  
  // Use real-time sync hooks for admin data
  const { data: users, isLoading: usersLoading, updateUser } = useAllUsers();
  const { data: withdrawals, isLoading: withdrawalsLoading, updateWithdrawalStatus } = useWithdrawals();
  const { data: tasks, isLoading: tasksLoading, createTask } = useTasks();
  const { isOnline, timeSinceLastSync, activeListeners } = useSyncStatus();

  // Calculate real-time stats from users data
  const dailyStats = {
    totalUsers: users.length,
    activeVipUsers: users.filter(user => user.vipTier !== 'free').length,
    totalCoinsDistributed: users.reduce((sum, user) => sum + (user.coins || 0), 0),
    totalInrGenerated: users.reduce((sum, user) => sum + (user.referralEarnings || 0), 0),
    pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
    totalPayments: withdrawals.filter(w => w.status === 'paid').length,
    totalConversions: users.filter(user => user.vipTier !== 'free').length
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <AdminStats users={users} dailyStats={dailyStats} />;
      case 'tasks':
        return <TaskManager tasks={tasks} createTask={createTask} />;
      case 'settings':
        return <EnhancedAdminSettings users={users} updateUser={updateUser} />;
      case 'approvals':
        return <AdminApprovals withdrawals={withdrawals} updateWithdrawalStatus={updateWithdrawalStatus} />;
      default:
        return <AdminStats users={users} dailyStats={dailyStats} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Real-time Sync Status */}
      {!isOnline && (
        <div className="bg-red-500/90 text-white p-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs">Offline - Admin data may be stale</span>
          </div>
        </div>
      )}
      
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              🛡️ Admin Dashboard
              {isOnline && (
                <span className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              )}
            </h1>
            <p className="text-white/80">
              Real-time Telegram Mini App Management
              {activeListeners > 0 && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                  {activeListeners} live connections
                </span>
              )}
            </p>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <div className="text-sm">
              <div className="font-bold">Admin Mode</div>
              <div className="text-xs text-white/80">
                Last sync: {Math.round(timeSinceLastSync / 1000)}s ago
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-center">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="activeAdminTab"
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;