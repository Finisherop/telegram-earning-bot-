'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { TIER_CONFIGS } from '@/lib/constants';
import { createTelegramStarInvoice, createVipRequest } from '@/lib/firebaseService';
import { playSound } from '@/lib/utils';
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
    setIsProcessing(true);
    playSound('click');

    const tierConfig = TIER_CONFIGS[tier];

    try {
      // Create Telegram Star invoice
      const invoice = await createTelegramStarInvoice(
        parseInt(user.userId || user.telegramId),
        `${tierConfig.name} VIP Upgrade`,
        `Upgrade to ${tierConfig.name} and unlock premium features!`,
        `vip_${tier}_${user.userId || user.telegramId}_${Date.now()}`,
        tierConfig.starCost
      );

      if (invoice) {
        // Open invoice in Telegram WebApp
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.openInvoice(invoice.invoice_link, async (status) => {
            if (status === 'paid') {
              try {
                const vipRequest = {
                  userId: user.userId || user.telegramId,
                  username: user.username,
                  tier,
                  paymentMethod: 'stars' as const,
                  amount: tierConfig.starCost,
                  status: 'approved' as const, // Auto-approve star payments
                  requestedAt: Date.now(),
                  processedAt: Date.now(),
                  adminNotes: 'Auto-approved Telegram Stars payment',
                  paymentDetails: {
                    invoiceId: invoice.invoice_link
                  }
                };

                await createVipRequest(vipRequest);
                activateVip(tier);
                toast.success('🎉 VIP Activated! Payment successful!');
                playSound('success');
              } catch (error) {
                console.error('Error processing star payment:', error);
                toast.error('Payment successful but activation failed. Contact admin.');
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
          window.open(invoice.invoice_link, '_blank');
          toast('Complete payment in the opened window', { icon: 'ℹ️' });
          setIsProcessing(false);
        }
      } else {
        throw new Error('Failed to create invoice');
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

    const updatedUser = {
      ...user,
      tier,
      vip_tier: tier,
      vip_expiry: vipExpiry,
      vipExpiry: vipExpiry,
      multiplier: tierConfig.farmingMultiplier,
      withdraw_limit: tierConfig.dailyWithdrawals,
      referral_boost: tierConfig.referralMultiplier,
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

          {/* Withdrawal Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🚧</div>
              <h3 className="text-lg font-bold text-blue-800 mb-2">Withdrawal System Update</h3>
              <p className="text-blue-700 text-sm mb-4">
                We're upgrading our withdrawal system to support Telegram Stars payments. 
                Traditional withdrawals will be available soon.
              </p>
              <div className="bg-blue-100 rounded-lg p-3">
                <p className="text-blue-800 text-xs">
                  💡 Tip: Use your coins to purchase VIP upgrades with Telegram Stars for instant benefits!
                </p>
              </div>
            </div>
          </div>

          {/* VIP Benefits Reminder */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-bold mb-3">🌟 Maximize Your Earnings</h3>
            <div className="space-y-2 text-sm">
              <p>• Upgrade to VIP for faster coin generation</p>
              <p>• Higher referral bonuses with VIP status</p>
              <p>• Exclusive access to premium features</p>
            </div>
            <motion.button
              onClick={() => setActiveSection('shop')}
              className="mt-4 bg-white text-purple-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              View VIP Plans →
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopWithdrawal;