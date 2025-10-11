'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { TIER_CONFIGS } from '@/lib/constants';
import { createTelegramStarInvoice, createVipRequest, createWithdrawalRequest } from '@/lib/firebaseService';
import { playSound } from '@/lib/utils';
import { getSafeNumericUserId, createSafePaymentData, withSafeUserId, logSafeUserInfo } from '@/lib/userDataUtils';
import toast from 'react-hot-toast';

interface ShopWithdrawalProps {
  user: User;
  setUser: (user: User) => void;
  onClose: () => void;
}

const ShopWithdrawal = ({ user, setUser, onClose }: ShopWithdrawalProps) => {
  const [activeSection, setActiveSection] = useState<'shop' | 'withdrawal'>('shop');
  const [isProcessing, setIsProcessing] = useState(false);

  // Telegram Stars payment handler
  const handleStarPayment = async (tier: 'bronze' | 'diamond') => {
    if (!user || isProcessing) return;
    
    logSafeUserInfo(user, 'StarPayment');
    
    // Create safe payment data with validation
    const paymentDataResult = createSafePaymentData(user, tier, TIER_CONFIGS[tier].starCost);
    
    if (!paymentDataResult.isValid) {
      toast.error(paymentDataResult.error || 'Invalid user data');
      console.error('Payment validation failed:', paymentDataResult.error);
      return;
    }
    
    setIsProcessing(true);
    playSound('click');

    const tierConfig = TIER_CONFIGS[tier];

    try {
      const { userId, userIdString } = paymentDataResult.data;
      
      // Call our secure API endpoint
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdString,
          amount: tierConfig.starCost,
          description: `${tierConfig.name} VIP Upgrade - Unlock premium features!`,
          type: 'vip_upgrade',
          tier: tier,
          paymentMethod: 'stars'
        })
      });
      
      const invoiceData = await response.json();
      
      if (!invoiceData.success) {
        throw new Error(invoiceData.error || 'Failed to create payment');
      }

      if (invoiceData.invoiceUrl) {
        // Open invoice in Telegram WebApp
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.openInvoice(invoiceData.invoiceId, async (status) => {
            if (status === 'paid') {
              try {
                // Payment successful - the webhook will handle VIP activation
                toast.success('🎉 Payment successful! VIP benefits will be activated shortly.');
                playSound('success');
                
                // Refresh user data to get updated VIP status
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                
              } catch (error) {
                console.error('Error processing star payment:', error);
                toast.error('Payment successful but activation may be delayed. Contact support if needed.');
              }
            } else if (status === 'cancelled') {
              toast.error('Payment cancelled');
              playSound('error');
            } else if (status === 'failed') {
              toast.error('Payment failed. Please try again.');
              playSound('error');
            }
            setIsProcessing(false);
          });
        } else {
          // Fallback for non-Telegram environment
          window.open(invoiceData.invoiceUrl, '_blank');
          toast('Complete payment in the opened window', { icon: 'ℹ️' });
          setIsProcessing(false);
        }
      } else {
        throw new Error('No invoice URL received');
      }
    } catch (error) {
      console.error('Star payment error:', error);
      toast.error('Failed to create payment. Please try again.');
      playSound('error');
      setIsProcessing(false);
    }
  };

  // Local VIP activation
  const activateVip = (tier: 'bronze' | 'diamond') => {
    if (!user) return;

    const tierConfig = TIER_CONFIGS[tier];
    const vipExpiry = Date.now() + (tierConfig.duration * 24 * 60 * 60 * 1000);
    
    // Map new tier system to old tier system
    const mappedVipTier: 'free' | 'vip1' | 'vip2' = tier === 'bronze' ? 'vip1' : 'vip2';

    const updatedUser = {
      ...user,
      // Set all VIP tier fields
      vipTier: mappedVipTier,
      tier,
      vip_tier: tier,
      vip_expiry: vipExpiry,
      vipExpiry: vipExpiry,
      vipEndTime: new Date(vipExpiry),
      
      // Update multipliers and limits
      farmingMultiplier: tierConfig.farmingMultiplier,
      referralMultiplier: tierConfig.referralMultiplier,
      multiplier: tierConfig.farmingMultiplier,
      withdraw_limit: tierConfig.dailyWithdrawals,
      withdrawalLimit: tierConfig.dailyWithdrawals,
      minWithdrawal: tierConfig.minWithdrawal,
      adsLimitPerDay: tierConfig.adsLimitPerDay,
      referral_boost: tierConfig.referralMultiplier,
      
      // Add badge
      badges: [
        ...(user.badges || []),
        {
          type: tierConfig.badge,
          name: `${tierConfig.name} Member`,
          description: `Upgraded to ${tierConfig.name}`,
          icon: tier === 'bronze' ? '🥉' : '💎',
          color: tierConfig.color,
          unlockedAt: Date.now()
        }
      ]
    };

    setUser(updatedUser);
    onClose();
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
            
            {user.tier === undefined || user.tier === null ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🆓</div>
                <h3 className="text-lg font-bold text-gray-800">Free Tier</h3>
                <p className="text-gray-600 text-sm">Upgrade to VIP for amazing benefits!</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">👑</div>
                <h3 className="text-lg font-bold text-accent">{TIER_CONFIGS[user.tier].name} Active</h3>
                {user.vip_expiry && (
                  <p className="text-gray-600 text-sm">
                    Expires: {new Date(user.vip_expiry).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* VIP Cards */}
          <div className="space-y-4">
            {/* Bronze VIP Card */}
            <motion.div
              className="bg-gradient-to-r from-orange-400 to-yellow-600 rounded-2xl p-6 text-white shadow-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center">
                    🥉 Bronze VIP
                  </h3>
                  <p className="text-white/90 text-sm">30-day subscription</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{TIER_CONFIGS.bronze.starCost} ⭐</div>
                  <p className="text-white/80 text-sm">Stars</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{TIER_CONFIGS.bronze.farmingMultiplier}x Farming Speed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{TIER_CONFIGS.bronze.referralMultiplier}x Referral Rewards</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Unlimited Ads</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{TIER_CONFIGS.bronze.dailyWithdrawals} Withdrawals/day</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Priority Support</span>
                </div>
              </div>

              <motion.button
                onClick={() => handleStarPayment('bronze')}
                disabled={user.tier === 'bronze' || user.tier === 'diamond' || isProcessing}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  user.tier === 'bronze' || user.tier === 'diamond' || isProcessing
                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                    : 'bg-white text-orange-600 hover:bg-white/90'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: (!user.tier && !isProcessing) ? 1.02 : 1 }}
              >
                {isProcessing ? '⏳ Processing...' :
                 user.tier === 'bronze' ? '✅ Active' : 
                 user.tier === 'diamond' ? '💎 Diamond Active' :
                 `💰 Buy with ${TIER_CONFIGS.bronze.starCost} Stars ⭐`}
              </motion.button>
            </motion.div>

            {/* Diamond VIP Card */}
            <motion.div
              className="bg-gradient-to-r from-cyan-400 to-blue-600 rounded-2xl p-6 text-white shadow-lg border-2 border-accent"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center">
                    💎 Diamond VIP
                    <span className="ml-2 bg-accent text-dark text-xs px-2 py-1 rounded-full">
                      PREMIUM
                    </span>
                  </h3>
                  <p className="text-white/90 text-sm">30-day subscription</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{TIER_CONFIGS.diamond.starCost} ⭐</div>
                  <p className="text-white/80 text-sm">Stars</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{TIER_CONFIGS.diamond.farmingMultiplier}x Farming Speed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{TIER_CONFIGS.diamond.referralMultiplier}x Referral Rewards</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Unlimited Ads</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">{TIER_CONFIGS.diamond.dailyWithdrawals} Withdrawals/day</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">VIP Badge & Status</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-sm">Exclusive Features</span>
                </div>
              </div>

              <motion.button
                onClick={() => handleStarPayment('diamond')}
                disabled={user.tier === 'diamond' || isProcessing}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  user.tier === 'diamond' || isProcessing
                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                    : 'bg-accent text-dark hover:bg-accent/90'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: (user.tier !== 'diamond' && !isProcessing) ? 1.02 : 1 }}
              >
                {isProcessing ? '⏳ Processing...' :
                 user.tier === 'diamond' ? '✅ Active' : 
                 `💰 Buy with ${TIER_CONFIGS.diamond.starCost} Stars ⭐`}
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      {activeSection === 'withdrawal' && (
        <WithdrawalSection user={user} />
      )}
    </div>
  );
};

// Withdrawal Section Component
const WithdrawalSection = ({ user }: { user: User }) => {
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const minWithdrawal = user.minWithdrawal || 200;
  const maxWithdrawal = Math.floor(user.coins / 100); // Convert coins to INR
  const dailyLimit = user.withdrawalLimit || 1;

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !upiId) {
      toast.error('Please fill in all fields');
      return;
    }
    
    logSafeUserInfo(user, 'Withdrawal');
    
    try {
      await withSafeUserId(user, async (userId) => {
        const amount = parseInt(withdrawalAmount);
        
        setIsProcessing(true);
        
        // Call secure withdrawal API
        const response = await fetch('/api/withdrawals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            amount: amount,
            upiId: upiId.trim(),
            type: 'standard'
          })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Withdrawal request failed');
        }
        
        toast.success(result.message);
        setWithdrawalAmount('');
        setUpiId('');
        
        // Refresh user data to reflect balance changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
    } catch (error) {
      console.error('Withdrawal request error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
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
        <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Request Withdrawal</h3>
        
        <div className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount (₹)
            </label>
            <input
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder={`Min: ₹${minWithdrawal}, Max: ₹${maxWithdrawal}`}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              min={minWithdrawal}
              max={maxWithdrawal}
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: ₹{maxWithdrawal} • Min: ₹{minWithdrawal} • Daily Limit: {dailyLimit} withdrawal(s)
            </p>
          </div>

          {/* UPI ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UPI ID
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@paytm, yourname@phonepe, etc."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your UPI ID (e.g., 9876543210@paytm)
            </p>
          </div>

          {/* Submit Button */}
          <motion.button
            onClick={handleWithdrawal}
            disabled={isProcessing || !withdrawalAmount || !upiId}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              isProcessing || !withdrawalAmount || !upiId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: (!isProcessing && withdrawalAmount && upiId) ? 1.02 : 1 }}
          >
            {isProcessing ? '⏳ Processing...' : '💸 Submit Withdrawal Request'}
          </motion.button>
        </div>
      </div>

      {/* Withdrawal Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h4 className="font-bold text-blue-800 mb-2">Withdrawal Information</h4>
            <div className="space-y-1 text-blue-700 text-sm">
              <p>• Withdrawals are processed within 24-48 hours</p>
              <p>• Minimum withdrawal: ₹{minWithdrawal}</p>
              <p>• Daily withdrawal limit: {dailyLimit} request(s)</p>
              <p>• VIP members get higher limits and faster processing</p>
              <p>• Make sure your UPI ID is correct and active</p>
            </div>
          </div>
        </div>
      </div>

      {/* VIP Benefits Reminder */}
      {user.vipTier === 'free' && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-bold mb-3">🌟 Upgrade for Better Withdrawal Limits</h3>
          <div className="space-y-2 text-sm">
            <p>• VIP Bronze: {TIER_CONFIGS.bronze.dailyWithdrawals} withdrawals/day, Min: ₹{TIER_CONFIGS.bronze.minWithdrawal}</p>
            <p>• VIP Diamond: {TIER_CONFIGS.diamond.dailyWithdrawals} withdrawals/day, Min: ₹{TIER_CONFIGS.diamond.minWithdrawal}</p>
            <p>• Faster processing for VIP members</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopWithdrawal;