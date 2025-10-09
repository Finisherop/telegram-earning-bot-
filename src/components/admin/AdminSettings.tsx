'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminSettings as AdminSettingsType } from '@/types';
import { getAdminSettings, updateAdminSettings } from '@/lib/firebaseService';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await getAdminSettings();
      setSettings(settingsData);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateAdminSettings(settings);
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
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
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">⚙️ System Settings</h2>
        <p className="text-white/90">Configure your app's business parameters</p>
      </div>

      {/* General Settings */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
        transition={{ delay: 0.2 }}
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
        transition={{ delay: 0.3 }}
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
        transition={{ delay: 0.4 }}
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
        transition={{ delay: 0.5 }}
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
          {saving ? '⏳ Saving...' : '💾 Save Settings'}
        </motion.button>
      </motion.div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="text-amber-600 text-xl">⚠️</div>
          <div>
            <h4 className="font-bold text-amber-800">Important Notice</h4>
            <p className="text-amber-700 text-sm mt-1">
              Changes to these settings will affect all users immediately. Please review carefully before saving.
              VIP tier changes will apply to new subscriptions only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;