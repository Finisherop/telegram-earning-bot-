// Webhook Handler for Telegram Bot
// This handles incoming updates from Telegram

// Import Firebase (you may need to adjust this based on your setup)
// const admin = require('firebase-admin');

const BOT_TOKEN = process.env.BOT_TOKEN || '8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM';
const APP_URL = process.env.APP_URL || 'https://telegram-earning-bot.vercel.app';

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

        // Store user data in Firebase (implement this based on your Firebase setup)
        await this.createOrUpdateUser(user, referralCode);

        const welcomeMessage = `
🎉 <b>Welcome to Earning Bot!</b>

👋 Hi ${user.first_name}! Ready to start earning coins?

🌟 <b>What you can do:</b>
💰 Farm coins automatically  
📋 Complete tasks for rewards
👥 Refer friends and earn bonuses
🎁 Daily claim rewards
💎 Upgrade to VIP for 2x rewards

🎮 <b>Click the button below to open the app!</b>
        `;

        const keyboard = {
            inline_keyboard: [
                [{ 
                    text: '🎮 Open Earning App', 
                    web_app: { url: referralCode ? `${APP_URL}?ref=${referralCode}` : APP_URL }
                }],
                [
                    { text: '📊 Stats', callback_data: 'stats' },
                    { text: '❓ Help', callback_data: 'help' }
                ]
            ]
        };

        await this.botAPI.sendMessage(chatId, welcomeMessage, {
            reply_markup: keyboard
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

    // Helper methods (implement these based on your Firebase setup)
    async createOrUpdateUser(user, referralCode) {
        // Implement Firebase user creation/update
        console.log(`Creating/updating user ${user.id} with referral: ${referralCode}`);
        // This should integrate with your existing Firebase user creation logic
    }

    async getUserStats(userId) {
        // Implement Firebase user stats retrieval
        console.log(`Getting stats for user ${userId}`);
        // Return mock data for now
        return {
            coins: 1500,
            isFarming: true,
            referralCount: 3,
            totalEarned: 5000,
            vipActive: false
        };
    }

    async activateVIP(userId, plan) {
        // Implement Firebase VIP activation
        console.log(`Activating VIP for user ${userId}, plan: ${plan}`);
        // This should integrate with your existing Firebase VIP activation logic
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