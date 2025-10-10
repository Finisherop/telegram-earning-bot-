// Payment API Handler for VIP purchases
const BOT_TOKEN = '8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM';

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

// Export for use in API endpoints
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentAPI;
}

// API endpoint for creating invoices
exports.createInvoice = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const requestData = JSON.parse(event.body);
        const paymentAPI = new PaymentAPI();
        const result = await paymentAPI.createInvoice(requestData);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Create invoice error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: false, 
                error: 'Internal server error' 
            })
        };
    }
};

// Handle preflight requests
exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }
    
    return exports.createInvoice(event, context);
};