'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminStats from './admin/AdminStats';
import EnhancedAdminSettings from './admin/EnhancedAdminSettings';
import AdminApprovals from './admin/AdminApprovals';

const tabs = [
  { id: 'stats', label: 'Dashboard', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'approvals', label: 'W/D Requests', icon: '💸' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <AdminStats />;
      case 'settings':
        return <EnhancedAdminSettings />;
      case 'approvals':
        return <AdminApprovals />;
      default:
        return <AdminStats />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              🛡️ Admin Dashboard
            </h1>
            <p className="text-white/80">Telegram Mini App Management</p>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <span className="text-sm font-bold">Admin Mode</span>
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