'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminSettings as AdminSettingsType, User, PaymentData } from '@/types';
import { 
  getAdminSettings, 
  updateAdminSettings, 
  subscribeToAdminSettings,
  upgradeUserToVIP,
  getEnhancedDailyStats
} from '@/lib/enhancedFirebaseService';
import { getUser } from '@/lib/firebaseService';
import toast from 'react-hot-toast';

const EnhancedAdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSearchId, setUserSearchId] = useState('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Set up real-time listener for admin settings
    console.log('[Enhanced Admin Settings] Setting up real-time listener for admin settings');
    
    const unsubscribe = subscribeToAdminSettings((settingsData) => {
      console.log('[Enhanced Admin Settings] Real-time admin settings update:', settingsData);
      setSettings(settingsData);
      setLoading(false);
    });

    // Load enhanced stats
    loadStats();

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await getEnhancedDailyStats();
      setStats(statsData);
    } catch (error) {
      console.error('[Enhanced Admin Settings] Failed to load stats:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateAdminSettings(settings);
      toast.success('✅ Settings updated successfully with real-time sync!');
    } catch (error) {
      console.error('[Enhanced Admin Settings] Save error:', error);
      toast.error('❌ Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (path: string, value: any) => {
    if (!settings) return;
    
    const keys = path.split('.');
    const newSettings = { ...settings };
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  const searchUser = async () => {
    if (!userSearchId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setSearchLoading(true);
    try {
      const user = await getUser(userSearchId.trim());
      if (user) {
        setSearchedUser(user);
        toast.success('User found!');
      } else {
        setSearchedUser(null);
        toast.error('User not found');
      }
    } catch (error) {
      console.error('[Enhanced Admin Settings] User search error:', error);
      toast.error('Failed to search user');
      setSearchedUser(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const upgradeUser = async (tier: 'vip1' | 'vip2') => {
    if (!searchedUser) {
      toast.error('No user selected');
      return;
    }

    setUpgradeLoading(true);
    try {
      await upgradeUserToVIP(searchedUser.telegramId, tier);
      toast.success(`✅ User upgraded to ${tier.toUpperCase()} successfully!`);
      
      // Refresh user data
      const updatedUser = await getUser(searchedUser.telegramId);
      if (updatedUser) {
        setSearchedUser(updatedUser);
      }
    } catch (error) {
      console.error('[Enhanced Admin Settings] User upgrade error:', error);
      toast.error('❌ Failed to upgrade user');
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="w-48 h-6 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="w-full h-4 bg-gray-200 rounded" />
                <div className="w-3/4 h-4 bg-gray-200 rounded" />
                <div className="w-1/2 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Settings Not Found</h3>
        <p className="text-gray-600">Failed to load admin settings</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Enhanced Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">⚙️ Enhanced Admin Settings</h2>
        <p className="text-white/90">Configure your app with real-time sync</p>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="text-white/80 text-sm">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.activeVipUsers}</div>
              <div className="text-white/80 text-sm">VIP Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
              <div className="text-white/80 text-sm">Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₹{stats.totalInrGenerated}</div>
              <div className="text-white/80 text-sm">Revenue</div>
            </div>
          </div>
        )}
      </div>

      {/* VIP User Management */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-6">👑 VIP User Management</h3>
        
        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={userSearchId}
              onChange={(e) => setUserSearchId(e.target.value)}
              placeholder="Enter Telegram User ID"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <motion.button
              onClick={searchUser}
              disabled={searchLoading}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                searchLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {searchLoading ? '🔍 Searching...' : '🔍 Search User'}
            </motion.button>
          </div>

          {searchedUser && (
            <motion.div
              className="bg-gray-50 rounded-xl p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-800">
                    {searchedUser.firstName} {searchedUser.lastName}
                  </h4>
                  <p className="text-gray-600 text-sm">@{searchedUser.username}</p>
                  <p className="text-gray-600 text-sm">ID: {searchedUser.telegramId}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    💰 {searchedUser.coins.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Current Tier: <span className="font-bold text-accent">
                      {searchedUser.vipTier.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  onClick={() => upgradeUser('vip1')}
                  disabled={upgradeLoading || searchedUser.vipTier === 'vip1'}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    searchedUser.vipTier === 'vip1'
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : upgradeLoading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {searchedUser.vipTier === 'vip1' ? '✅ VIP1 Active' : upgradeLoading ? '⏳' : '👑 Upgrade to VIP1'}
                </motion.button>

                <motion.button
                  onClick={() => upgradeUser('vip2')}
                  disabled={upgradeLoading || searchedUser.vipTier === 'vip2'}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    searchedUser.vipTier === 'vip2'
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : upgradeLoading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {searchedUser.vipTier === 'vip2' ? '✅ VIP2 Active' : upgradeLoading ? '⏳' : '💎 Upgrade to VIP2'}
                </motion.button>
              </div>

              {searchedUser.vipEndTime && (
                <div className="mt-3 text-sm text-gray-600">
                  VIP expires: {new Date(searchedUser.vipEndTime).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* General Settings */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-6">💰 Economic Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              INR Exchange Rate (Coins to ₹1)
            </label>
            <input
              type="number"
              value={settings.inrExchangeRate}
              onChange={(e) => updateSetting('inrExchangeRate', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="100"
            />
            <p className="text-gray-500 text-sm mt-1">
              How many coins equal ₹1 for withdrawals
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Ad Reward (Coins)
            </label>
            <input
              type="number"
              value={settings.baseAdReward}
              onChange={(e) => updateSetting('baseAdReward', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="10"
            />
            <p className="text-gray-500 text-sm mt-1">
              Base coins earned per ad watched
            </p>
          </div>
        </div>
      </motion.div>

      {/* VIP 1 Settings */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-6">👑 VIP 1 Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (Stars)
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip1.price}
              onChange={(e) => updateSetting('vipTiers.vip1.price', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farming Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.vipTiers.vip1.farmingMultiplier}
              onChange={(e) => updateSetting('vipTiers.vip1.farmingMultiplier', parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referral Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.vipTiers.vip1.referralMultiplier}
              onChange={(e) => updateSetting('vipTiers.vip1.referralMultiplier', parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Withdrawal Limit
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip1.withdrawalLimit}
              onChange={(e) => updateSetting('vipTiers.vip1.withdrawalLimit', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Withdrawal (INR)
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip1.minWithdrawal}
              onChange={(e) => updateSetting('vipTiers.vip1.minWithdrawal', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip1.duration}
              onChange={(e) => updateSetting('vipTiers.vip1.duration', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </motion.div>

      {/* VIP 2 Settings */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-6">💎 VIP 2 Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (Stars)
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip2.price}
              onChange={(e) => updateSetting('vipTiers.vip2.price', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farming Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.vipTiers.vip2.farmingMultiplier}
              onChange={(e) => updateSetting('vipTiers.vip2.farmingMultiplier', parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referral Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.vipTiers.vip2.referralMultiplier}
              onChange={(e) => updateSetting('vipTiers.vip2.referralMultiplier', parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Withdrawal Limit
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip2.withdrawalLimit}
              onChange={(e) => updateSetting('vipTiers.vip2.withdrawalLimit', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Withdrawal (INR)
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip2.minWithdrawal}
              onChange={(e) => updateSetting('vipTiers.vip2.minWithdrawal', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              value={settings.vipTiers.vip2.duration}
              onChange={(e) => updateSetting('vipTiers.vip2.duration', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-red-500"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-6">🔐 Security Settings</h3>
        
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Secret Key
          </label>
          <input
            type="password"
            value={settings.secretKey}
            onChange={(e) => updateSetting('secretKey', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter new secret key"
          />
          <p className="text-gray-500 text-sm mt-1">
            Used for admin access: ?admin=true&key=SECRET_KEY
          </p>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          onClick={handleSave}
          disabled={saving}
          className={`px-8 py-3 rounded-xl font-bold transition-all ${
            saving
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
          whileHover={{ scale: saving ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {saving ? '⏳ Saving with Real-time Sync...' : '💾 Save Settings'}
        </motion.button>
      </motion.div>

      {/* Enhanced Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="text-amber-600 text-xl">⚠️</div>
          <div>
            <h4 className="font-bold text-amber-800">Enhanced Admin Panel</h4>
            <p className="text-amber-700 text-sm mt-1">
              All changes are synced in real-time across all users. VIP upgrades are instant and include bot notifications.
              Payment tracking and conversion analytics are automatically logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminSettings;