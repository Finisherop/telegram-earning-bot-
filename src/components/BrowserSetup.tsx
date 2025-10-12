'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TelegramService } from '@/lib/telegram';

const BrowserSetup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user already has data stored
    const storedData = localStorage.getItem('browserUserData');
    if (storedData) {
      try {
        const userData = JSON.parse(storedData);
        setFormData(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (!formData.firstName.trim()) {
        console.warn('[BrowserSetup] First name required');
        return;
      }

      // Store user data in localStorage
      localStorage.setItem('browserUserData', JSON.stringify(formData));
      
      // Get referral from URL
      const urlParams = new URLSearchParams(window.location.search);
      const referral = urlParams.get('ref') || urlParams.get('start') || urlParams.get('startapp');
      
      // Redirect to main app with referral
      let redirectUrl = '/';
      if (referral) {
        redirectUrl += `?start=${referral}`;
      }
      
      // Force reload to reinitialize with new user data
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('Setup error:', error);
      console.error('[BrowserSetup] Setup failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎮 Browser Setup
          </h1>
          <p className="text-gray-600">
            Set up your profile to start earning coins
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="Enter your first name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.95 }}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-secondary hover:opacity-90'
            }`}
          >
            {isSubmitting ? '🔄 Setting up...' : '🚀 Start Earning!'}
          </motion.button>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🌟 What you'll get:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 💰 Automatic coin farming every 8 hours</li>
            <li>• 🎁 Daily rewards up to 350 coins</li>
            <li>• 👥 500 coins for each friend referral</li>
            <li>• 💎 VIP upgrades for 2x rewards</li>
            <li>• 💸 Withdraw earnings via UPI</li>
          </ul>
        </div>

        {/* Best for Telegram */}
        <div className="mt-6 text-center text-sm text-gray-500">
          💡 For the best experience, use this bot from{' '}
          <a 
            href="https://t.me/finisher_task_bot" 
            target="_blank" 
            className="text-primary font-semibold hover:underline"
          >
            @finisher_task_bot
          </a>{' '}
          on Telegram
        </div>
      </motion.div>
    </div>
  );
};

export default BrowserSetup;