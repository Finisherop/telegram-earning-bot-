# Vercel Environment Variables Setup

To fix the Firebase configuration errors, you need to set these environment variables in your Vercel dashboard:

## Required Environment Variables

Go to your Vercel project dashboard → Settings → Environment Variables and add:

### Firebase Configuration (Client-side)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA_cKKrwrqNyb0xl28IbHAnaJa3ChOdsZU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=telegram-bot-2be45.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://telegram-bot-2be45-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=telegram-bot-2be45
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=telegram-bot-2be45.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=947875567907
NEXT_PUBLIC_FIREBASE_APP_ID=1:947875567907:web:ea7b37b36643872e199496
```

### Telegram Bot Configuration
```
BOT_TOKEN=8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM
TELEGRAM_BOT_TOKEN=8484469509:AAHNw8rM2fzw35Lp1d_UTLjdFhobasHoOnM
BOT_USERNAME=finisher_task_bot
BOT_WEBHOOK_URL=https://telegram-earning-bot.vercel.app/api/webhook
```

### App Configuration
```
ADMIN_SECRET_KEY=admin123
APP_URL=https://telegram-earning-bot.vercel.app
```

## Important Notes

1. **NEXT_PUBLIC_ prefix is required** for client-side environment variables in Next.js
2. Set these for **Production**, **Preview**, and **Development** environments
3. After adding variables, **redeploy your application**
4. The Firebase configuration will be validated at runtime and show detailed error messages

## Alternative: Use Vercel CLI

You can also set environment variables using Vercel CLI:

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
# ... add all other variables
```

After setting up the environment variables, redeploy your application to apply the changes.