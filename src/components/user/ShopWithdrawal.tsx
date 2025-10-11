'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { VIP_TIERS } from '@/lib/constants';
import { TelegramService } from '@/lib/telegram';
import { activateSubscription, createWithdrawalRequest } from '@/lib/firebaseService';
import toast from 'react-hot-toast';

interface ShopWithdrawalProps {
  user: User;
}

const ShopWithdrawal = ({ user }: ShopWithdrawalProps) => {
  const [activeSection, setActiveSection] = useState<'shop' | 'withdrawal'>('shop');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVIPPurchase = async (tier: 'vip1' | 'vip2') => {
    const telegram = TelegramService.getInstance();
    const vipTier = VIP_TIERS[tier];
    
    // Validate tier and price
    if (!vipTier || !vipTier.price || vipTier.price <= 0) {
      console.error('Invalid VIP tier configuration:', tier, vipTier);
      toast.error('VIP configuration error. Please try again.');
      return;
    }
    
    console.log(`VIP Purchase clicked: ${tier}`, vipTier);
    telegram.hapticFeedback('medium');
    
    // Show loading state
    setIsProcessing(true);
    
    try {
      console.log(`Requesting payment for ${tier}: ${vipTier.price} Stars`);
      
      // Validate user data
      if (!user || !user.telegramId) {
        throw new Error('User data not available');
      }
      
      const success = await telegram.requestStarsPayment(
        vipTier.price,
        `${tier.toUpperCase()} Subscription - 30 days`,
        tier
      );
      
      console.log('Payment result:', success);
      
      if (success) {
        console.log('Payment successful, activating VIP subscription...');
        
        try {
          // Activate VIP subscription
          await activateSubscription(user.telegramId, tier, 30);
          toast.success(`🎉 ${tier.toUpperCase()} activated successfully!`);
          telegram.hapticFeedback('heavy');
          
          // Refresh page to show new VIP status
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }, 2000);
        } catch (activationError) {
          console.error('VIP activation error:', activationError);
          toast.error('Payment successful but VIP activation failed. Please contact support.');
        }
      } else {
        console.log('Payment was not successful');
        toast.error('Payment was cancelled or failed.');
      }
    } catch (error) {
      console.error('VIP purchase error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Payment failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !upiId) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    
    if (amount < user.minWithdrawal) {
      toast.error(`Minimum withdrawal amount is ₹${user.minWithdrawal}`);
      return;
    }

    // Check if user has enough coins
    const requiredCoins = amount * 100; // Assuming 100 coins = ₹1
    if (user.coins < requiredCoins) {
      toast.error(`Insufficient coins. You need ${requiredCoins} coins for ₹${amount}`);
      return;
    }

    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('medium');

    setIsProcessing(true);
    
    try {
      await createWithdrawalRequest(user.telegramId, amount, upiId);
      toast.success('Withdrawal request submitted successfully!');
      setWithdrawalAmount('');
      setUpiId('');
    } catch (error) {
      toast.error('Failed to submit withdrawal request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCoinsNeeded = (amount: string) => {
    const amountNum = parseFloat(amount) || 0;
    return amountNum * 100; // 100 coins = ₹1
  };

  return (
    <div className="p-4 space-y-6">
      {/* Section Toggle */}
      <div className="bg-white rounded-2xl p-2 shadow-lg">
        <div className="flex">
          <motion.button
            onClick={() => setActiveSection('shop')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              activeSection === 'shop'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-primary'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            🛍️ VIP Shop
          </motion.button>
          <motion.button
            onClick={() => setActiveSection('withdrawal')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              activeSection === 'withdrawal'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-primary'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            💸 Withdrawal
          </motion.button>
        </div>
      </div>

      {activeSection === 'shop' && (
        <div className="space-y-4">
          {/* Current VIP Status */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">VIP Status</h2>
            
            {user.vipTier === 'free' ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🆓</div>
                <h3 className="text-lg font-bold text-gray-800">Free Tier</h3>
                <p className="text-gray-600 text-sm">Upgrade to VIP for amazing benefits!</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">👑</div>
                <h3 className="text-lg font-bold text-accent">{user.vipTier.toUpperCase()} Active</h3>
                {user.vipEndTime && (
                  <p className="text-gray-600 text-sm">
                    Expires: {new Date(user.vipEndTime).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* VIP Cards */}
          <div className="space-y-4">
            {/* VIP 1 Card */}
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center">
                    👑 VIP 1
                  </h3>
                  <p className="text-white/90 text-sm">30-day subscription</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{VIP_TIERS.vip1.price} ⭐</div>
                  <p className="text-white/80 text-sm">Stars</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{VIP_TIERS.vip1.farmingMultiplier}x Farming Speed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{VIP_TIERS.vip1.referralMultiplier}x Referral Rewards</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Unlimited Ads</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{VIP_TIERS.vip1.withdrawalLimit} Withdrawals/day</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Min withdrawal: ₹{VIP_TIERS.vip1.minWithdrawal}</span>
                </div>
              </div>

              <motion.button
                onClick={() => handleVIPPurchase('vip1')}
                disabled={user.vipTier === 'vip1' || user.vipTier === 'vip2' || isProcessing}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  user.vipTier === 'vip1' || user.vipTier === 'vip2' || isProcessing
                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                    : 'bg-white text-blue-600 hover:bg-white/90'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: (user.vipTier === 'free' && !isProcessing) ? 1.02 : 1 }}
              >
                {isProcessing ? '⏳ Processing...' :
                 user.vipTier === 'vip1' ? '✅ Active' : 
                 user.vipTier === 'vip2' ? '👑 VIP 2 Active' :
                 `💰 Buy with ${VIP_TIERS.vip1.price} Stars ⭐`}
              </motion.button>
            </motion.div>

            {/* VIP 2 Card */}
            <motion.div
              className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg border-2 border-accent"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center">
                    💎 VIP 2
                    <span className="ml-2 bg-accent text-dark text-xs px-2 py-1 rounded-full">
                      PREMIUM
                    </span>
                  </h3>
                  <p className="text-white/90 text-sm">30-day subscription</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{VIP_TIERS.vip2.price} ⭐</div>
                  <p className="text-white/80 text-sm">Stars</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{VIP_TIERS.vip2.farmingMultiplier}x Farming Speed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{VIP_TIERS.vip2.referralMultiplier}x Referral Rewards</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Unlimited Ads</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{VIP_TIERS.vip2.withdrawalLimit} Withdrawals/day</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Min withdrawal: ₹{VIP_TIERS.vip2.minWithdrawal}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Priority Support</span>
                </div>
              </div>

              <motion.button
                onClick={() => handleVIPPurchase('vip2')}
                disabled={user.vipTier === 'vip2' || isProcessing}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  user.vipTier === 'vip2' || isProcessing
                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                    : 'bg-accent text-dark hover:bg-accent/90'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: (user.vipTier !== 'vip2' && !isProcessing) ? 1.02 : 1 }}
              >
                {isProcessing ? '⏳ Processing...' :
                 user.vipTier === 'vip2' ? '✅ Active' : 
                 `💰 Buy with ${VIP_TIERS.vip2.price} Stars ⭐`}
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      {activeSection === 'withdrawal' && (
        <div className="space-y-4">
          {/* User Balance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Balance</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  💰 {(user.coins || 0).toLocaleString()}
                </div>
                <p className="text-gray-600 text-sm">Available Coins</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  ₹{Math.floor(user.coins / 100)}
                </div>
                <p className="text-gray-600 text-sm">INR Equivalent</p>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 text-sm text-center">
                Exchange Rate: 100 coins = ₹1
              </p>
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Withdrawal Request</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="example@paytm"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder={`Min: ₹${user.minWithdrawal}`}
                  min={user.minWithdrawal}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {withdrawalAmount && (
                  <p className="text-sm text-gray-600 mt-2">
                    Required coins: {getCoinsNeeded(withdrawalAmount).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 text-sm mb-2">Withdrawal Limits</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Minimum: ₹{user.minWithdrawal}</li>
                  <li>• Daily limit: {user.withdrawalLimit} requests</li>
                  <li>• Processing time: 24-48 hours</li>
                </ul>
              </div>

              <motion.button
                onClick={handleWithdrawal}
                disabled={isProcessing || !withdrawalAmount || !upiId}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  isProcessing || !withdrawalAmount || !upiId
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: (!isProcessing && withdrawalAmount && upiId) ? 1.02 : 1 }}
              >
                {isProcessing ? '⏳ Processing...' : '💸 Request Withdrawal'}
              </motion.button>
            </div>
          </div>

          {/* Withdrawal History Placeholder */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Withdrawals</h3>
            
            <div className="text-center py-8">
              <div className="text-4xl mb-3">💸</div>
              <p className="text-gray-600">No withdrawal history</p>
              <p className="text-gray-500 text-sm">Your withdrawal requests will appear here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopWithdrawal;