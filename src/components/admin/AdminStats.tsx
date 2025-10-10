'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DailyStats } from '@/types';
import { getEnhancedDailyStats } from '@/lib/enhancedFirebaseService';
import toast from 'react-hot-toast';

const AdminStats = () => {
  const [stats, setStats] = useState<DailyStats>({
    totalUsers: 0,
    activeVipUsers: 0,
    totalCoinsDistributed: 0,
    totalInrGenerated: 0,
    pendingWithdrawals: 0,
    totalPayments: 0,      // Initialize missing fields
    totalConversions: 0,   // Initialize missing fields
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      console.log('[Admin Stats] Loading enhanced daily stats...');
      const statsData = await getEnhancedDailyStats();
      
      // Merge with defaults to avoid missing fields
      setStats({
        totalUsers: statsData.totalUsers ?? 0,
        activeVipUsers: statsData.activeVipUsers ?? 0,
        totalCoinsDistributed: statsData.totalCoinsDistributed ?? 0,
        totalInrGenerated: statsData.totalInrGenerated ?? 0,
        pendingWithdrawals: statsData.pendingWithdrawals ?? 0,
        totalPayments: statsData.totalPayments ?? 0,
        totalConversions: statsData.totalConversions ?? 0,
      });
      
      console.log('[Admin Stats] Enhanced stats loaded successfully:', statsData);
    } catch (error) {
      console.error('[Admin Stats] Failed to load enhanced stats:', error);
      toast.error('Failed to load enhanced statistics');
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold mb-2">Enhanced Admin Dashboard! 👋</h2>
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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="bg-blue-500/10 text-blue-600"
          subtitle="Registered members"
        />
        
        <StatCard
          title="VIP Users"
          value={stats.activeVipUsers}
          icon="👑"
          color="bg-purple-500/10 text-purple-600"
          subtitle="Active subscriptions"
        />
        
        <StatCard
          title="Coins Distributed"
          value={stats.totalCoinsDistributed}
          icon="💰"
          color="bg-yellow-500/10 text-yellow-600"
          subtitle="Total rewards given"
        />
        
        <StatCard
          title="Revenue Generated"
          value={`₹${stats.totalInrGenerated}`}
          icon="💵"
          color="bg-green-500/10 text-green-600"
          subtitle="From VIP sales"
        />
        
        <StatCard
          title="Pending Withdrawals"
          value={stats.pendingWithdrawals}
          icon="⏳"
          color="bg-orange-500/10 text-orange-600"
          subtitle="Awaiting approval"
        />
        
        <StatCard
          title="Total Payments"
          value={stats.totalPayments}
          icon="💳"
          color="bg-indigo-500/10 text-indigo-600"
          subtitle="Processed payments"
        />
        
        <StatCard
          title="Total Conversions"
          value={stats.totalConversions}
          icon="📊"
          color="bg-pink-500/10 text-pink-600"
          subtitle="User actions tracked"
        />
        
        <StatCard
          title="Conversion Rate"
          value={`${stats.totalUsers > 0 ? ((stats.activeVipUsers / stats.totalUsers) * 100).toFixed(1) : 0}%`}
          icon="📈"
          color="bg-teal-500/10 text-teal-600"
          subtitle="Free to VIP"
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
            onClick={() => toast.success('Feature coming soon!')}
          >
            <div className="text-2xl mb-2">👑</div>
            <span className="text-sm">VIP Manager</span>
          </motion.button>
          
          <motion.button
            className="bg-orange-500 text-white p-4 rounded-xl font-bold hover:bg-orange-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadStats}
          >
            <div className="text-2xl mb-2">🔄</div>
            <span className="text-sm">Refresh Data</span>
          </motion.button>
        </div>
      </div>

      {/* Enhanced System Status */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Enhanced System Status</h3>
        
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
              <h4 className="font-bold text-gray-800">All Enhanced Features Operational</h4>
              <p className="text-gray-600 text-sm">
                Real-time sync, payment tracking ({stats.totalPayments} payments), 
                conversion analytics ({stats.totalConversions} events), and comprehensive error handling are all functioning normally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;