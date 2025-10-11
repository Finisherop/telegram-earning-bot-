// Payment API Handler for VIP purchases
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    throw new Error('Bot token not found in environment variables. Please set BOT_TOKEN or TELEGRAM_BOT_TOKEN.');
}

class PaymentAPI {
    constructor() {
        this.botAPI = new (require('./telegram-bot.js'))();
    }

    // Create invoice for VIP purchase
    async createInvoice(requestData) {
        try {
            const { 
                userId, 
                chatId, 
                amount, 
                currency = 'XTR', // Telegram Stars
                title = 'VIP Membership',
                description = 'Upgrade to VIP for exclusive benefits',
                plan = 'VIP',
                tier
            } = requestData;

            // Validate required fields - use userId as chatId if not provided
            if (!userId || !amount) {
                throw new Error('Missing required fields: userId, amount');
            }
            
            const actualChatId = chatId || userId;

            // Create payload for tracking
            const payload = JSON.stringify({
                userId: userId,
                plan: plan,
                timestamp: Date.now()
            });

            // Prepare invoice data for createInvoiceLink
            const invoiceData = {
                title: title,
                description: description,
                payload: payload,
                provider_token: '', // Empty for Telegram Stars
                currency: currency,
                prices: [
                    {
                        label: title,
                        amount: amount // Amount in smallest currency unit
                    }
                ],
                photo_url: 'https://via.placeholder.com/512x512/0088cc/ffffff?text=VIP',
                photo_width: 512,
                photo_height: 512
            };

            // Create invoice link using Telegram Bot API
            const result = await this.botAPI.createInvoiceLink(invoiceData);
            
            console.log('✅ Invoice link created successfully:', result);
            
            return {
                success: true,
                invoiceUrl: result, // The invoice link URL
                invoiceId: payload // Use payload as invoice ID for tracking
            };

        } catch (error) {
            console.error('❌ Invoice creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Handle payment verification
    async verifyPayment(paymentData) {
        try {
            const { 
                telegramPaymentChargeId,
                providerPaymentChargeId,
                invoicePayload,
                totalAmount,
                currency
            } = paymentData;

            // Parse payload
            const payload = JSON.parse(invoicePayload);
            const { userId, plan } = payload;

            console.log(`💳 Verifying payment for user ${userId}, plan: ${plan}`);

            // Here you can add additional verification logic
            // For now, we'll consider all payments valid

            // Log payment for records
            await this.logPayment({
                userId,
                plan,
                amount: totalAmount,
                currency,
                telegramChargeId: telegramPaymentChargeId,
                providerChargeId: providerPaymentChargeId,
                timestamp: Date.now()
            });

            return {
                success: true,
                verified: true,
                userId: userId,
                plan: plan
            };

        } catch (error) {
            console.error('❌ Payment verification failed:', error);
            return {
                success: false,
                verified: false,
                error: error.message
            };
        }
    }

    // Log payment to database
    async logPayment(paymentRecord) {
        try {
            console.log('📝 Logging payment:', paymentRecord);
            
            // Here you would save to your database (Firebase, etc.)
            // For now, we'll just log to console
            
            return true;
        } catch (error) {
            console.error('❌ Payment logging failed:', error);
            return false;
        }
    }

    // Get VIP pricing configuration
    getVIPPricing() {
        return {
            vip1: {
                name: 'VIP Membership',
                price: 99, // 99 Telegram Stars
                currency: 'XTR',
                duration: 30, // days
                benefits: [
                    '2x Farming rewards',
                    '1.5x Referral bonuses', 
                    '+200 Daily claim bonus',
                    'Priority support'
                ]
            }
        };
    }
}

// Export class for reuse  
PaymentAPI.PaymentAPI = PaymentAPI;

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
        const requestData = req.body;
        const paymentAPI = new PaymentAPI();
        const result = await paymentAPI.createInvoice(requestData);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};