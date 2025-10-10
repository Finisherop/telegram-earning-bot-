// Webhook Handler for Telegram Bot with Firebase Integration
const BOT_TOKEN = process.env.BOT_TOKEN || '8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM';
const APP_URL = process.env.APP_URL || 'https://telegram-earning-bot.vercel.app';

// Firebase Admin Setup (if available)
let admin;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'telegram-bot-2be45',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://telegram-bot-2be45-default-rtdb.firebaseio.com'
    });
  }
} catch (error) {
  console.warn('Firebase Admin not available, using HTTP API fallback');
  admin = null;
}

class WebhookHandler {
    constructor() {
        this.botAPI = new (require('./telegram-bot.js'))();
    }

    // Main webhook handler
    async handleUpdate(update) {
        try {
            console.log('📨 Received update:', JSON.stringify(update, null, 2));

            if (update.message) {
                await this.handleMessage(update.message);
            } else if (update.pre_checkout_query) {
                await this.handlePreCheckoutQuery(update.pre_checkout_query);
            } else if (update.successful_payment) {
                await this.handleSuccessfulPayment(update.successful_payment, update.message);
            } else if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }

            return { status: 'ok' };
        } catch (error) {
            console.error('❌ Webhook handler error:', error);
            return { status: 'error', message: error.message };
        }
    }

    // Handle regular messages
    async handleMessage(message) {
        const chatId = message.chat.id;
        const text = message.text;
        const user = message.from;

        console.log(`👤 User ${user.id} (${user.first_name}): ${text}`);

        // Store/update user data in Firebase
        await this.createOrUpdateUser(user, null);

        if (text.startsWith('/start')) {
            await this.handleStart(chatId, user, text);
        } else if (text === '/app') {
            await this.handleAppCommand(chatId, user);
        } else if (text === '/help') {
            await this.handleHelp(chatId);
        } else if (text === '/stats') {
            await this.handleStats(chatId, user);
        }
    }

    // Handle /start command
    async handleStart(chatId, user, text) {
        // Extract referral code if present
        const referralMatch = text.match(/\/start (.+)/);
        const referralCode = referralMatch ? referralMatch[1] : null;

        // Store user data with referral in Firebase
        await this.createOrUpdateUser(user, referralCode);

        const welcomeMessage = `
🎉 <b>Welcome to the Earning Bot!</b>

👋 Hi ${user.first_name}! Ready to start earning coins?

🌟 <b>What you can do:</b>
💰 Farm coins automatically (120+ coins per 8 hours)
📋 Complete tasks for instant rewards
👥 Refer friends and earn 500 coins each
🎁 Claim daily rewards (150-350 coins)
💎 Upgrade to VIP for 2x farming rewards

🎮 <b>Click the button below to open the app!</b>
        `;

        const keyboard = {
            inline_keyboard: [
                [{ 
                    text: '🎮 Open Earning App', 
                    web_app: { url: referralCode ? `${APP_URL}?start=${referralCode}` : APP_URL }
                }],
                [
                    { text: '📊 My Stats', callback_data: 'stats' },
                    { text: '❓ Help', callback_data: 'help' }
                ]
            ]
        };

        await this.botAPI.sendMessage(chatId, welcomeMessage, {
            reply_markup: keyboard,
            parse_mode: 'HTML'
        });
    }

    // Handle /app command
    async handleAppCommand(chatId, user) {
        const message = `
🎮 <b>Open Earning App</b>

Click the button below to start earning:
        `;

        const keyboard = {
            inline_keyboard: [
                [{ 
                    text: '🎮 Open App', 
                    web_app: { url: APP_URL }
                }]
            ]
        };

        await this.botAPI.sendMessage(chatId, message, {
            reply_markup: keyboard
        });
    }

    // Handle /help command
    async handleHelp(chatId) {
        const helpMessage = `
❓ <b>Help & Instructions</b>

🎮 <b>How to use:</b>
1️⃣ Click "Open App" button
2️⃣ Start farming coins (100+ per hour)
3️⃣ Complete tasks for bonus rewards  
4️⃣ Claim daily rewards (100-300 coins)
5️⃣ Refer friends to earn 500 coins each
6️⃣ Withdraw when you reach 1000+ coins

💎 <b>VIP Benefits:</b>
• 2x Farming rewards
• 1.5x Referral bonuses  
• +200 Daily claim bonus
• Lower withdrawal limits

🔗 <b>Commands:</b>
/start - Start earning
/app - Open earning app
/stats - Check your stats
/help - Show this help

💬 <b>Need support?</b> Contact @your_support_username
        `;

        await this.botAPI.sendMessage(chatId, helpMessage);
    }

    // Handle /stats command  
    async handleStats(chatId, user) {
        // Get user stats from Firebase (implement based on your setup)
        const userStats = await this.getUserStats(user.id);
        
        const statsMessage = `
📊 <b>Your Earning Stats</b>

👤 <b>User:</b> ${user.first_name}
🪙 <b>Coins:</b> ${userStats.coins || 0}
🌱 <b>Farming Status:</b> ${userStats.isFarming ? '🟢 Active' : '🔴 Inactive'}
👥 <b>Referrals:</b> ${userStats.referralCount || 0}
💰 <b>Total Earned:</b> ${userStats.totalEarned || 0}
👑 <b>VIP Status:</b> ${userStats.vipActive ? '✅ Active' : '❌ Free Tier'}

🎮 Open the app to manage your earnings!
        `;

        const keyboard = {
            inline_keyboard: [
                [{ 
                    text: '🎮 Open App', 
                    web_app: { url: APP_URL }
                }]
            ]
        };

        await this.botAPI.sendMessage(chatId, statsMessage, {
            reply_markup: keyboard
        });
    }

    // Handle pre-checkout query (before payment)
    async handlePreCheckoutQuery(preCheckoutQuery) {
        const { id, from, currency, total_amount, invoice_payload } = preCheckoutQuery;
        
        console.log('💳 Pre-checkout query:', preCheckoutQuery);

        try {
            // Validate payment data
            const payload = JSON.parse(invoice_payload);
            const userId = payload.userId;
            const plan = payload.plan;

            // Here you can add validation logic
            // For now, we'll approve all payments
            
            await this.botAPI.answerPreCheckoutQuery(id, true);
            
            console.log(`✅ Pre-checkout approved for user ${userId}, plan: ${plan}`);
        } catch (error) {
            console.error('❌ Pre-checkout error:', error);
            await this.botAPI.answerPreCheckoutQuery(id, false, 'Payment validation failed');
        }
    }

    // Handle successful payment
    async handleSuccessfulPayment(payment, message) {
        const { currency, total_amount, invoice_payload, provider_payment_charge_id } = payment;
        const user = message.from;
        
        console.log('🎉 Successful payment:', payment);

        try {
            const payload = JSON.parse(invoice_payload);
            const userId = payload.userId;
            const plan = payload.plan;

            // Activate VIP in Firebase (implement based on your setup)
            await this.activateVIP(userId, plan);

            const successMessage = `
🎉 <b>Payment Successful!</b>

💎 <b>VIP Activated!</b>
👤 <b>User:</b> ${user.first_name}  
💰 <b>Amount:</b> ${total_amount / 100} ${currency}
📦 <b>Plan:</b> ${plan}
⏰ <b>Duration:</b> 30 days

🌟 <b>VIP Benefits Now Active:</b>
• 2x Farming rewards
• 1.5x Referral bonuses
• +200 Daily claim bonus
• Priority support

🎮 Open the app to enjoy your VIP benefits!
            `;

            const keyboard = {
                inline_keyboard: [
                    [{ 
                        text: '🎮 Open App', 
                        web_app: { url: APP_URL }
                    }]
                ]
            };

            await this.botAPI.sendMessage(user.id, successMessage, {
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('❌ Payment processing error:', error);
            
            await this.botAPI.sendMessage(user.id, 
                '❌ Payment received but VIP activation failed. Please contact support.'
            );
        }
    }

    // Handle callback queries (inline keyboard buttons)
    async handleCallbackQuery(callbackQuery) {
        const { data, from, message } = callbackQuery;
        
        if (data === 'stats') {
            await this.handleStats(from.id, from);
        } else if (data === 'help') {
            await this.handleHelp(from.id);
        }
    }

    // Helper methods - Firebase integration
    async createOrUpdateUser(user, referralCode) {
        try {
            console.log(`Creating/updating user ${user.id} with referral: ${referralCode}`);
            
            const userData = {
                telegramId: user.id.toString(),
                username: user.username || '',
                firstName: user.first_name,
                lastName: user.last_name || '',
                profilePic: user.photo_url || null,
                referrerId: referralCode,
                updatedAt: new Date().toISOString(),
            };
            
            if (admin) {
                // Use Firebase Admin SDK
                const userRef = admin.database().ref(`users/${user.id}`);
                const userSnapshot = await userRef.once('value');
                
                if (!userSnapshot.exists()) {
                    // New user - create with defaults
                    const newUser = {
                        ...userData,
                        coins: 0,
                        xp: 0,
                        level: 1,
                        vipTier: 'free',
                        farmingMultiplier: 1.0,
                        referralMultiplier: 1.0,
                        referralCount: 0,
                        referralEarnings: 0,
                        dailyStreak: 0,
                        createdAt: new Date().toISOString(),
                    };
                    
                    await userRef.set(newUser);
                    
                    // Process referral if exists
                    if (referralCode && referralCode !== user.id.toString()) {
                        const referrerRef = admin.database().ref(`users/${referralCode}`);
                        const referrerSnapshot = await referrerRef.once('value');
                        if (referrerSnapshot.exists()) {
                            const referrerData = referrerSnapshot.val();
                            await referrerRef.update({
                                referralCount: (referrerData.referralCount || 0) + 1,
                                coins: (referrerData.coins || 0) + 500,
                                referralEarnings: (referrerData.referralEarnings || 0) + 500,
                                updatedAt: new Date().toISOString(),
                            });
                            console.log(`Referral bonus given to user ${referralCode}`);
                        }
                    }
                } else {
                    // Existing user - update data
                    await userRef.update(userData);
                }
            } else {
                console.log('Firebase Admin not available, user data stored locally in bot session');
            }
            
        } catch (error) {
            console.error('Error creating/updating user:', error);
        }
    }

    async getUserStats(userId) {
        try {
            if (admin) {
                const userRef = admin.database().ref(`users/${userId}`);
                const userSnapshot = await userRef.once('value');
                
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    return {
                        coins: userData.coins || 0,
                        isFarming: !!(userData.farmingStartTime && userData.farmingEndTime),
                        referralCount: userData.referralCount || 0,
                        totalEarned: (userData.coins || 0) + (userData.referralEarnings || 0),
                        vipActive: userData.vipTier && userData.vipTier !== 'free',
                    };
                }
            }
            
            // Fallback data
            return {
                coins: 0,
                isFarming: false,
                referralCount: 0,
                totalEarned: 0,
                vipActive: false
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                coins: 0,
                isFarming: false,
                referralCount: 0,
                totalEarned: 0,
                vipActive: false
            };
        }
    }

    async activateVIP(userId, plan) {
        try {
            console.log(`Activating VIP for user ${userId}, plan: ${plan}`);
            
            if (admin) {
                const userRef = admin.database().ref(`users/${userId}`);
                const vipEndTime = new Date();
                vipEndTime.setDate(vipEndTime.getDate() + 30); // 30 days
                
                const vipData = {
                    vipTier: plan.toLowerCase().includes('vip2') ? 'vip2' : 'vip1',
                    vipEndTime: vipEndTime.toISOString(),
                    farmingMultiplier: plan.toLowerCase().includes('vip2') ? 3.0 : 2.0,
                    referralMultiplier: plan.toLowerCase().includes('vip2') ? 2.0 : 1.5,
                    updatedAt: new Date().toISOString(),
                };
                
                await userRef.update(vipData);
                console.log(`VIP ${plan} activated for user ${userId} until ${vipEndTime}`);
            } else {
                console.log('Firebase Admin not available, VIP activation logged only');
            }
        } catch (error) {
            console.error('Error activating VIP:', error);
        }
    }
}

// Export class for reuse
WebhookHandler.WebhookHandler = WebhookHandler;

// Export as default handler for Vercel
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;
        const handler = new WebhookHandler();
        const result = await handler.handleUpdate(update);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};