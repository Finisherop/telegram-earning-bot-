// Payment API Handler for VIP purchases
const BOT_TOKEN = process.env.BOT_TOKEN || '8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM';

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
                plan = 'VIP'
            } = requestData;

            // Validate required fields
            if (!userId || !chatId || !amount) {
                throw new Error('Missing required fields: userId, chatId, amount');
            }

            // Create payload for tracking
            const payload = JSON.stringify({
                userId: userId,
                plan: plan,
                timestamp: Date.now()
            });

            // Prepare invoice data
            const invoiceData = {
                title: title,
                description: description,
                payload: payload,
                providerToken: '', // Empty for Telegram Stars
                currency: currency,
                prices: [
                    {
                        label: title,
                        amount: amount // Amount in smallest currency unit
                    }
                ],
                photoUrl: 'https://i.imgur.com/VIP_BADGE.png', // Optional VIP badge image
                photoWidth: 512,
                photoHeight: 512
            };

            // Send invoice to user
            const result = await this.botAPI.sendInvoice(chatId, invoiceData);
            
            console.log('✅ Invoice created successfully:', result);
            
            return {
                success: true,
                invoiceId: result.message_id,
                payload: payload
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