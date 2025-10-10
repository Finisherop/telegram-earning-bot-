// Bot Setup Script - Run this to configure your Telegram bot
// Usage: node setup-bot.js

const TelegramBotAPI = require('./api/telegram-bot.js');

class BotSetup {
    constructor() {
        this.bot = new TelegramBotAPI();
        this.APP_URL = 'https://your-app-domain.com'; // Replace with your deployed URL
    }

    async setupBot() {
        try {
            console.log('🤖 Setting up Telegram Bot...\n');

            // Step 1: Set bot commands
            console.log('📋 Setting bot commands...');
            await this.bot.setMyCommands();
            console.log('✅ Commands set successfully\n');

            // Step 2: Set menu button (Web App)  
            console.log('🎮 Setting menu button...');
            await this.bot.setMenuButton();
            console.log('✅ Menu button set successfully\n');

            // Step 3: Get webhook info
            console.log('🔗 Getting webhook info...');
            const webhookInfo = await this.bot.getWebhookInfo();
            console.log('📝 Current webhook:', webhookInfo.url || 'Not set');
            
            // Step 4: Instructions for webhook setup
            if (!webhookInfo.url) {
                console.log('\n⚠️  WEBHOOK NOT SET!');
                console.log('📝 To set webhook, run:');
                console.log(`   node -e "new (require('./api/telegram-bot.js'))().setWebhook('${this.APP_URL}/api/webhook')"`);
            }

            console.log('\n🎉 Bot setup completed successfully!');
            console.log('\n📱 Test your bot:');
            console.log(`   1. Open: https://t.me/finisher_task_bot`);
            console.log(`   2. Send: /start`);
            console.log(`   3. Click: Menu button`);
            console.log(`   4. App should open: ${this.APP_URL}`);

        } catch (error) {
            console.error('❌ Bot setup failed:', error);
        }
    }

    // Test bot functionality
    async testBot() {
        try {
            console.log('🧪 Testing bot functionality...\n');

            // Test 1: Get bot info
            const botInfo = await this.bot.sendRequest('getMe');
            console.log('🤖 Bot info:', {
                id: botInfo.id,
                username: botInfo.username,
                first_name: botInfo.first_name
            });

            // Test 2: Get commands
            const commands = await this.bot.sendRequest('getMyCommands');
            console.log('📋 Commands:', commands.length);

            // Test 3: Get menu button
            const menuButton = await this.bot.sendRequest('getChatMenuButton');
            console.log('🎮 Menu button:', menuButton.type);

            console.log('\n✅ All tests passed!');

        } catch (error) {
            console.error('❌ Bot test failed:', error);
        }
    }

    // Show configuration summary
    showConfig() {
        console.log('\n📋 Bot Configuration Summary:');
        console.log('═'.repeat(50));
        console.log(`🤖 Bot Token: 8484469509:AAH***`);
        console.log(`👤 Bot Username: @finisher_task_bot`);
        console.log(`🌐 App URL: ${this.APP_URL}`);
        console.log(`🔗 Webhook URL: ${this.APP_URL}/api/webhook`);
        console.log(`📱 Bot Link: https://t.me/finisher_task_bot`);
        console.log('═'.repeat(50));
        
        console.log('\n📝 Next Steps:');
        console.log('1. Deploy your app to Netlify/Vercel');
        console.log('2. Update APP_URL in this script');
        console.log('3. Run: node setup-bot.js');
        console.log('4. Set webhook with your deployed URL');
        console.log('5. Test the bot!');
    }
}

// Main execution
async function main() {
    const setup = new BotSetup();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
        await setup.testBot();
    } else if (args.includes('--config')) {
        setup.showConfig();
    } else {
        await setup.setupBot();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = BotSetup;