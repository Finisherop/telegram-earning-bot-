/**
 * Real-time Synchronization Test Component
 * 
 * This component demonstrates and tests the real-time sync between
 * admin and user panels with localStorage fallback
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserData, useAllUsers, useTasks, useSyncStatus } from '@/hooks/useRealtimeSync';
import toast from 'react-hot-toast';

const RealtimeSyncTest = () => {
  const [testUserId, setTestUserId] = useState('test_user_123');
  const [isAdminView, setIsAdminView] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);

  // User view hooks
  const { data: userData, isLoading: userLoading, updateUser } = useUserData(isAdminView ? null : testUserId);
  
  // Admin view hooks
  const { data: allUsers, updateUser: adminUpdateUser } = useAllUsers();
  const { data: tasks, createTask } = useTasks();
  
  // Sync status
  const { isOnline, timeSinceLastSync, activeListeners } = useSyncStatus();

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addToLog('Real-time sync test component initialized');
  }, []);

  useEffect(() => {
    if (userData) {
      addToLog(`User data updated: ${userData.firstName} - ${userData.coins} coins`);
    }
  }, [userData]);

  useEffect(() => {
    if (allUsers.length > 0) {
      addToLog(`Admin view: ${allUsers.length} users loaded`);
    }
  }, [allUsers.length]);

  // Test functions
  const testUserUpdate = async () => {
    try {
      addToLog('Testing user update...');
      const newCoins = (userData?.coins || 0) + 100;
      await updateUser({ coins: newCoins });
      addToLog(`✅ User coins updated to ${newCoins}`);
      toast.success('User update successful!');
    } catch (error) {
      addToLog(`❌ User update failed: ${error}`);
      toast.error('User update failed');
    }
  };

  const testAdminUpdate = async () => {
    try {
      addToLog('Testing admin update...');
      const testUser = allUsers.find(u => u.id === testUserId || u.telegramId === testUserId);
      if (testUser) {
        const newCoins = (testUser.coins || 0) + 200;
        await adminUpdateUser(testUser.id, { coins: newCoins });
        addToLog(`✅ Admin updated user coins to ${newCoins}`);
        toast.success('Admin update successful!');
      } else {
        addToLog('❌ Test user not found in admin view');
        toast.error('Test user not found');
      }
    } catch (error) {
      addToLog(`❌ Admin update failed: ${error}`);
      toast.error('Admin update failed');
    }
  };

  const testVipUpgrade = async () => {
    try {
      addToLog('Testing VIP upgrade...');
      const updateData = {
        vipTier: 'vip1' as const,
        vipEndTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        farmingMultiplier: 2.0,
        referralMultiplier: 1.5
      };

      if (isAdminView) {
        const testUser = allUsers.find(u => u.id === testUserId || u.telegramId === testUserId);
        if (testUser) {
          await adminUpdateUser(testUser.id, updateData);
        }
      } else {
        await updateUser(updateData);
      }
      
      addToLog('✅ VIP upgrade successful');
      toast.success('VIP upgrade successful!');
    } catch (error) {
      addToLog(`❌ VIP upgrade failed: ${error}`);
      toast.error('VIP upgrade failed');
    }
  };

  const testTaskCreation = async () => {
    try {
      addToLog('Testing task creation...');
      const taskId = await createTask({
        title: `Test Task ${Date.now()}`,
        description: 'This is a test task created for real-time sync testing',
        type: 'link',
        reward: 50,
        url: 'https://example.com',
        isActive: true
      });
      addToLog(`✅ Task created with ID: ${taskId}`);
      toast.success('Task created successfully!');
    } catch (error) {
      addToLog(`❌ Task creation failed: ${error}`);
      toast.error('Task creation failed');
    }
  };

  const testOfflineMode = () => {
    addToLog('Testing offline mode...');
    // Simulate offline by going offline
    if (navigator.onLine) {
      // This would typically be done by disconnecting network
      addToLog('💡 To test offline mode, disconnect your network and try updates');
      toast('Disconnect network to test offline mode', { icon: 'ℹ️' });
    } else {
      addToLog('📱 Currently offline - localStorage fallback active');
      toast('Offline mode active - using localStorage', { icon: '📱' });
    }
  };

  const clearTestLog = () => {
    setTestLog([]);
    addToLog('Test log cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                🔄 Real-time Sync Test Dashboard
              </h1>
              <p className="text-gray-600">
                Test real-time synchronization between admin and user panels
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setIsAdminView(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    !isAdminView 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-blue-500'
                  }`}
                >
                  👤 User View
                </button>
                <button
                  onClick={() => setIsAdminView(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isAdminView 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-red-500'
                  }`}
                >
                  🛡️ Admin View
                </button>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isOnline ? 'animate-pulse' : ''}`} />
                <span className={`text-sm font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-blue-50">
              <div className="text-sm text-blue-700">
                <strong>Last Sync:</strong> {Math.round(timeSinceLastSync / 1000)}s ago
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-purple-50">
              <div className="text-sm text-purple-700">
                <strong>Active Listeners:</strong> {activeListeners}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-orange-50">
              <div className="text-sm text-orange-700">
                <strong>View:</strong> {isAdminView ? 'Admin Panel' : 'User Panel'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🧪 Test Controls</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test User ID
                </label>
                <input
                  type="text"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter test user ID"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.button
                  onClick={testUserUpdate}
                  disabled={isAdminView || userLoading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileTap={{ scale: 0.95 }}
                >
                  💰 Add 100 Coins (User)
                </motion.button>

                <motion.button
                  onClick={testAdminUpdate}
                  disabled={!isAdminView}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileTap={{ scale: 0.95 }}
                >
                  💎 Add 200 Coins (Admin)
                </motion.button>

                <motion.button
                  onClick={testVipUpgrade}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
                  whileTap={{ scale: 0.95 }}
                >
                  👑 Upgrade to VIP1
                </motion.button>

                <motion.button
                  onClick={testTaskCreation}
                  disabled={!isAdminView}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileTap={{ scale: 0.95 }}
                >
                  📋 Create Test Task
                </motion.button>

                <motion.button
                  onClick={testOfflineMode}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
                  whileTap={{ scale: 0.95 }}
                >
                  📱 Test Offline Mode
                </motion.button>

                <motion.button
                  onClick={clearTestLog}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  whileTap={{ scale: 0.95 }}
                >
                  🗑️ Clear Log
                </motion.button>
              </div>
            </div>
          </div>

          {/* Current Data Display */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Current Data</h2>
            
            {isAdminView ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-2">Admin View - All Users</h3>
                  <div className="text-sm text-red-700">
                    <p><strong>Total Users:</strong> {allUsers.length}</p>
                    <p><strong>VIP Users:</strong> {allUsers.filter(u => u.vipTier !== 'free').length}</p>
                    <p><strong>Total Coins:</strong> {allUsers.reduce((sum, u) => sum + (u.coins || 0), 0)}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Tasks</h3>
                  <div className="text-sm text-green-700">
                    <p><strong>Total Tasks:</strong> {tasks.length}</p>
                    <p><strong>Active Tasks:</strong> {tasks.filter(t => t.isActive).length}</p>
                  </div>
                </div>

                {/* Test User in Admin View */}
                {(() => {
                  const testUser = allUsers.find(u => u.id === testUserId || u.telegramId === testUserId);
                  return testUser ? (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-2">Test User Data</h3>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Name:</strong> {testUser.firstName} {testUser.lastName}</p>
                        <p><strong>Coins:</strong> {testUser.coins || 0}</p>
                        <p><strong>VIP Tier:</strong> {testUser.vipTier}</p>
                        <p><strong>Last Updated:</strong> {testUser.updatedAt?.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Test user not found in admin view</p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-4">
                {userData ? (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">User Data</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Name:</strong> {userData.firstName} {userData.lastName}</p>
                      <p><strong>Telegram ID:</strong> {userData.telegramId}</p>
                      <p><strong>Coins:</strong> {userData.coins || 0}</p>
                      <p><strong>XP:</strong> {userData.xp || 0}</p>
                      <p><strong>Level:</strong> {userData.level || 1}</p>
                      <p><strong>VIP Tier:</strong> {userData.vipTier}</p>
                      <p><strong>Last Updated:</strong> {userData.updatedAt?.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ) : userLoading ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm">Loading user data...</p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm">No user data available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Test Log */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Test Log</h2>
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
            <div className="space-y-1 font-mono text-sm">
              {testLog.length === 0 ? (
                <div className="text-gray-500">No test events yet...</div>
              ) : (
                testLog.map((log, index) => (
                  <div key={index} className="text-green-400">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4">📋 Testing Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Real-time Sync Test:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Open this page in two browser tabs</li>
                <li>Set one tab to User View, another to Admin View</li>
                <li>Use the same Test User ID in both tabs</li>
                <li>Make changes in one tab and watch them appear instantly in the other</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium mb-2">Offline Mode Test:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Disconnect your internet connection</li>
                <li>Try making updates (they should work with localStorage)</li>
                <li>Reconnect internet</li>
                <li>Watch data sync back to Firebase automatically</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeSyncTest;