#!/bin/bash

# Vercel Deployment Script for Telegram Earning Bot
# Run this after deploying to Vercel to set up the webhook

echo "🚀 Setting up Telegram Bot Webhook for Vercel Deployment"
echo "================================================="

BOT_TOKEN="8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM"
WEBHOOK_URL="https://telegram-earning-bot.vercel.app/api/webhook"
WEBAPP_URL="https://telegram-earning-bot.vercel.app"

echo "📡 Setting webhook..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{
       \"url\": \"${WEBHOOK_URL}\",
       \"allowed_updates\": [\"message\", \"callback_query\", \"pre_checkout_query\", \"successful_payment\"]
     }"

echo -e "\n\n🎮 Setting menu button..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \
     -H "Content-Type: application/json" \
     -d "{
       \"menu_button\": {
         \"type\": \"web_app\",
         \"text\": \"🎮 Open Earning App\",
         \"web_app\": {\"url\": \"${WEBAPP_URL}\"}
       }
     }"

echo -e "\n\n📋 Setting bot commands..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands" \
     -H "Content-Type: application/json" \
     -d '{
       "commands": [
         {"command": "start", "description": "🚀 Start the bot and open earning app"},
         {"command": "app", "description": "🎮 Open the earning app directly"},
         {"command": "help", "description": "❓ Get help and instructions"},
         {"command": "stats", "description": "📊 Check your earnings stats"}
       ]
     }'

echo -e "\n\n✅ Setup completed!"
echo "================================================="
echo "🤖 Bot: @finisher_task_bot"
echo "🌐 WebApp URL: ${WEBAPP_URL}"
echo "📡 Webhook URL: ${WEBHOOK_URL}"
echo "================================================="
echo "🧪 Test your bot:"
echo "1. Open: https://t.me/finisher_task_bot"
echo "2. Send: /start"
echo "3. Click: Menu button"
echo "4. App should open!"
echo "================================================="