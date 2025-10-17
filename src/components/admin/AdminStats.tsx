'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DailyStats, User } from '@/types';
import { updateUserData } from '@/lib/realtimeSyncManager';
import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import toast from 'react-hot-toast';

interface AdminStatsProps {
  users: User[];
  dailyStats: DailyStats;
}

const AdminStats = ({ users, dailyStats }: AdminStatsProps) => {
  const [loading, setLoading] = useState(false);
  
  // VIP Management State
  const [showVipManager, setShowVipManager] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Real-time stats are now passed as props, no need for manual loading
  useEffect(() => {
    console.log('[Admin Stats] Real-time stats updated:', dailyStats);
  }, [dailyStats]);

  // VIP Management Functions
  const searchUser = async () => {
    if (!searchUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setSearchLoading(true);
    try {
      if (!realtimeDb) {
        toast.error('Firebase not available');
        return;
      }
      
      console.log('[Admin VIP] Searching for user:', searchUserId);
      const userRef = ref(realtimeDb, `telegram_users/${searchUserId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setFoundUser({
          ...userData,
          telegramId: userData.telegramId || userData.id || searchUserId
        });
        console.log('[Admin VIP] ✅ User found:', userData);
        toast.success('User found!');
      } else {
        setFoundUser(null);
        toast.error('User not found');
      }
    } catch (error) {
      console.error('[Admin VIP] Error searching user:', error);
      toast.error('Error searching user');
      setFoundUser(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const upgradeUserToVip = async (tier: 'vip1' | 'vip2') => {
    if (!foundUser) {
      toast.error('No user selected');
      return;
    }

    setUpgradeLoading(true);
    try {
      console.log('[Admin VIP] Upgrading user to', tier, ':', foundUser.telegramId);
      
      // Use real-time sync manager for instant updates
      const vipEndTime = new Date();
      vipEndTime.setDate(vipEndTime.getDate() + 30); // 30 days VIP
      
      await updateUserData(foundUser.telegramId, {
        vipTier: tier,
        vipEndTime: vipEndTime,
        farmingMultiplier: tier === 'vip1' ? 2.0 : 2.5,
        referralMultiplier: tier === 'vip1' ? 1.5 : 2.0,
        adsLimitPerDay: -1, // unlimited
        withdrawalLimit: tier === 'vip1' ? 3 : 5,
        minWithdrawal: tier === 'vip1' ? 250 : 500
      });
      
      // Update found user state
      setFoundUser({
        ...foundUser,
        vipTier: tier,
        vipEndTime: vipEndTime
      });
      
      toast.success(`✅ User upgraded to ${tier.toUpperCase()} successfully!`);
      console.log('[Admin VIP] ✅ User upgrade successful');
      
    } catch (error) {
      console.error('[Admin VIP] Error upgrading user:', error);
      toast.error('Failed to upgrade user');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: string; 
    color: string; 
    subtitle?: string;
  }) => (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-lg"
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        <div className="text-right">
          <motion.div
            className="text-2xl font-bold text-gray-800"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </motion.div>
          <p className="text-gray-600 text-sm">{title}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${color.replace('bg-', 'bg-').replace('/10', '')}`}
          initial={{ width: 0 }}
          animate={{ width: '75%' }}
          transition={{ delay: 0.5, duration: 1 }}
        />
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="text-right">
                  <div className="w-16 h-8 bg-gray-200 rounded mb-2" />
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard! 👋</h2>
          <p className="text-white/90 text-lg">
            Real-time performance overview with payment & conversion tracking
          </p>
          <div className="mt-4 flex items-center space-x-4 text-sm">
            <div className="bg-white/20 px-3 py-1 rounded-full">
              📅 {new Date().toLocaleDateString()}
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full">
              🕒 {new Date().toLocaleTimeString()}
            </div>
            <div className="bg-green-400/20 px-3 py-1 rounded-full flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Stats Grid - Real-time Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={dailyStats.totalUsers}
          icon="👥"
          color="bg-blue-500/10 text-blue-600"
          subtitle="Registered members (Live)"
        />
        
        <StatCard
          title="VIP Users"
          value={dailyStats.activeVipUsers}
          icon="👑"
          color="bg-purple-500/10 text-purple-600"
          subtitle="Active subscriptions (Live)"
        />
        
        <StatCard
          title="Coins Distributed"
          value={dailyStats.totalCoinsDistributed}
          icon="💰"
          color="bg-yellow-500/10 text-yellow-600"
          subtitle="Total rewards given (Live)"
        />
        
        <StatCard
          title="Revenue Generated"
          value={`₹${dailyStats.totalInrGenerated}`}
          icon="💵"
          color="bg-green-500/10 text-green-600"
          subtitle="From VIP sales (Live)"
        />
        
        <StatCard
          title="Pending Withdrawals"
          value={dailyStats.pendingWithdrawals}
          icon="⏳"
          color="bg-orange-500/10 text-orange-600"
          subtitle="Awaiting approval (Live)"
        />
        
        <StatCard
          title="Total Payments"
          value={dailyStats.totalPayments}
          icon="💳"
          color="bg-indigo-500/10 text-indigo-600"
          subtitle="Processed payments (Live)"
        />
        
        <StatCard
          title="Total Conversions"
          value={dailyStats.totalConversions}
          icon="📊"
          color="bg-pink-500/10 text-pink-600"
          subtitle="User actions tracked (Live)"
        />
        
        <StatCard
          title="Conversion Rate"
          value={`${dailyStats.totalUsers > 0 ? ((dailyStats.activeVipUsers / dailyStats.totalUsers) * 100).toFixed(1) : 0}%`}
          icon="📈"
          color="bg-teal-500/10 text-teal-600"
          subtitle="Free to VIP (Live)"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart Placeholder */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">User Growth</h3>
          <div className="h-64 bg-gradient-to-t from-blue-50 to-transparent rounded-xl flex items-end justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>Chart visualization would go here</p>
              <p className="text-sm">Integration with charting library needed</p>
            </div>
          </div>
        </motion.div>

        {/* Revenue Chart Placeholder */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Revenue Trends</h3>
          <div className="h-64 bg-gradient-to-t from-green-50 to-transparent rounded-xl flex items-end justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">💹</div>
              <p>Revenue chart would go here</p>
              <p className="text-sm">Shows VIP subscription trends</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.button
            className="bg-blue-500 text-white p-4 rounded-xl font-bold hover:bg-blue-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toast.success('Feature coming soon!')}
          >
            <div className="text-2xl mb-2">📢</div>
            <span className="text-sm">Send Broadcast</span>
          </motion.button>
          
          <motion.button
            className="bg-green-500 text-white p-4 rounded-xl font-bold hover:bg-green-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toast.success('Feature coming soon!')}
          >
            <div className="text-2xl mb-2">📋</div>
            <span className="text-sm">Add Task</span>
          </motion.button>
          
          <motion.button
            className="bg-purple-500 text-white p-4 rounded-xl font-bold hover:bg-purple-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowVipManager(true)}
          >
            <div className="text-2xl mb-2">👑</div>
            <span className="text-sm">VIP Manager</span>
          </motion.button>
          
          <motion.button
            className="bg-orange-500 text-white p-4 rounded-xl font-bold hover:bg-orange-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toast.success('Data is already live! 🔄')}
          >
            <div className="text-2xl mb-2">⚡</div>
            <span className="text-sm">Live Data</span>
          </motion.button>
        </div>
      </div>

      {/* Enhanced System Status */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">System Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700">Real-time Sync: Active</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700">Payment Tracking: Online</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700">Conversion Analytics: Active</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700">Error Handling: Enabled</span>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-green-50 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="text-green-600 text-xl">✅</div>
            <div>
              <h4 className="font-bold text-gray-800">All Features Operational</h4>
              <p className="text-gray-600 text-sm">
                Real-time sync, payment tracking ({dailyStats.totalPayments} payments), 
                conversion analytics ({dailyStats.totalConversions} events), and comprehensive error handling are all functioning normally.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIP Manager Modal */}
      {showVipManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">👑 VIP Manager</h3>
              <button
                onClick={() => {
                  setShowVipManager(false);
                  setFoundUser(null);
                  setSearchUserId('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* User Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search User by Telegram ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  placeholder="Enter Telegram User ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <motion.button
                  onClick={searchUser}
                  disabled={searchLoading}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  whileTap={{ scale: 0.95 }}
                >
                  {searchLoading ? '⏳' : '🔍'}
                </motion.button>
              </div>
            </div>

            {/* User Found */}
            {foundUser && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">User Found:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {foundUser.firstName || (foundUser as any).first_name} {foundUser.lastName || (foundUser as any).last_name}</p>
                  <p><strong>Username:</strong> @{foundUser.username || 'N/A'}</p>
                  <p><strong>ID:</strong> {foundUser.telegramId}</p>
                  <p><strong>Current VIP:</strong> <span className={`font-bold ${foundUser.vipTier === 'free' ? 'text-gray-500' : 'text-purple-600'}`}>
                    {foundUser.vipTier?.toUpperCase() || 'FREE'}
                  </span></p>
                  <p><strong>Coins:</strong> {foundUser.coins || 0}</p>
                </div>

                {/* VIP Upgrade Buttons */}
                <div className="mt-4 space-y-2">
                  <h5 className="font-medium text-gray-700">Upgrade to:</h5>
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={() => upgradeUserToVip('vip1')}
                      disabled={upgradeLoading || foundUser.vipTier === 'vip1'}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      whileTap={{ scale: 0.95 }}
                    >
                      {upgradeLoading ? '⏳' : '👑 VIP 1'}
                    </motion.button>
                    <motion.button
                      onClick={() => upgradeUserToVip('vip2')}
                      disabled={upgradeLoading || foundUser.vipTier === 'vip2'}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      whileTap={{ scale: 0.95 }}
                    >
                      {upgradeLoading ? '⏳' : '💎 VIP 2'}
                    </motion.button>
                  </div>
                  
                  {foundUser.vipTier !== 'free' && (
                    <motion.button
                      onClick={async () => {
                        setUpgradeLoading(true);
                        try {
                          await updateUserData(foundUser.telegramId, {
                            vipTier: 'free',
                            vipEndTime: undefined,
                            farmingMultiplier: 1.0,
                            referralMultiplier: 1.0,
                            adsLimitPerDay: 5,
                            withdrawalLimit: 1,
                            minWithdrawal: 200
                          });
                          setFoundUser({ ...foundUser, vipTier: 'free' });
                          toast.success('VIP status removed successfully!');
                        } catch (error) {
                          toast.error('Failed to remove VIP status');
                        } finally {
                          setUpgradeLoading(false);
                        }
                      }}
                      disabled={upgradeLoading}
                      className="w-full bg-gray-500 text-white py-2 px-3 rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
                      whileTap={{ scale: 0.95 }}
                    >
                      {upgradeLoading ? '⏳' : '🚫 Remove VIP'}
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-xs text-gray-500 text-center">
              Enter a Telegram User ID to search and manage their VIP status
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminStats;