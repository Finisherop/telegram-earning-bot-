// Telegram Bot API Handler for Payment Integration
const BOT_TOKEN = process.env.BOT_TOKEN || '8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM';
const APP_URL = process.env.APP_URL || 'https://telegram-earning-bot.vercel.app';

class TelegramBotAPI {
    constructor() {
        this.baseURL = `https://api.telegram.org/bot${BOT_TOKEN}`;
    }

    // Send API request to Telegram
    async sendRequest(method, params = {}) {
        try {
            const response = await fetch(`${this.baseURL}/${method}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });
            
            const result = await response.json();
            
            if (!result.ok) {
                console.error('Telegram API Error:', result);
                throw new Error(result.description || 'Telegram API request failed');
            }
            
            return result.result;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Set webhook for receiving updates
    async setWebhook(webhookUrl) {
        return await this.sendRequest('setWebhook', {
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment']
        });
    }

    // Set bot commands
    async setMyCommands() {
        const commands = [
            { command: 'start', description: '🚀 Start the bot and open earning app' },
            { command: 'app', description: '🎮 Open the earning app directly' },
            { command: 'help', description: '❓ Get help and instructions' },
            { command: 'stats', description: '📊 Check your earnings stats' }
        ];
        
        return await this.sendRequest('setMyCommands', { commands });
    }

    // Set menu button (Web App)
    async setMenuButton(userId = null) {
        const menuButton = {
            type: 'web_app',
            text: '🎮 Open Earning App',
            web_app: { url: APP_URL }
        };
        
        const params = { menu_button: menuButton };
        if (userId) params.chat_id = userId;
        
        return await this.sendRequest('setChatMenuButton', params);
    }

    // Send message to user
    async sendMessage(chatId, text, options = {}) {
        return await this.sendRequest('sendMessage', {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...options
        });
    }

    // Create payment invoice
    async sendInvoice(chatId, invoiceData) {
        const {
            title,
            description,
            payload,
            providerToken,
            currency,
            prices,
            photoUrl = null,
            photoSize = null,
            photoWidth = null,
            photoHeight = null,
            needName = false,
            needPhoneNumber = false,
            needEmail = false,
            needShippingAddress = false,
            sendPhoneNumberToProvider = false,
            sendEmailToProvider = false,
            isFlexible = false
        } = invoiceData;

        return await this.sendRequest('sendInvoice', {
            chat_id: chatId,
            title,
            description,
            payload,
            provider_token: providerToken,
            currency,
            prices,
            photo_url: photoUrl,
            photo_size: photoSize,
            photo_width: photoWidth,
            photo_height: photoHeight,
            need_name: needName,
            need_phone_number: needPhoneNumber,
            need_email: needEmail,
            need_shipping_address: needShippingAddress,
            send_phone_number_to_provider: sendPhoneNumberToProvider,
            send_email_to_provider: sendEmailToProvider,
            is_flexible: isFlexible
        });
    }

    // Answer pre-checkout query
    async answerPreCheckoutQuery(preCheckoutQueryId, ok = true, errorMessage = null) {
        return await this.sendRequest('answerPreCheckoutQuery', {
            pre_checkout_query_id: preCheckoutQueryId,
            ok: ok,
            error_message: errorMessage
        });
    }

    // Get webhook info
    async getWebhookInfo() {
        return await this.sendRequest('getWebhookInfo');
    }
}

// Export for use in serverless functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramBotAPI;
}

// Global instance for browser use
if (typeof window !== 'undefined') {
    window.TelegramBotAPI = TelegramBotAPI;
}