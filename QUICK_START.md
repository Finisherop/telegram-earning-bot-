# 🚀 Quick Start Guide - Telegram Mini App

## ⚡ Get Started in 5 Minutes

### 1. **Clone the Repository**
```bash
git clone https://github.com/Finisherop/telegram-earning-bot-.git
cd telegram-earning-bot-
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Set Up Environment**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

### 4. **Run Development Server**
```bash
npm run dev
```

Visit: http://localhost:3000

### 5. **Test Admin Panel**
Visit: http://localhost:3000/?admin=true&key=TELEGRAM_MINI_APP_ADMIN_2024

## 🎯 What You Get

### ✅ **User Features**
- 💰 Coin farming with VIP multipliers
- 📋 Task system with ads and links
- 👥 Referral system with rewards
- 💎 VIP shop with Stars payment
- 💸 UPI withdrawal system
- 👤 Complete user profile

### ✅ **Admin Features**
- 📊 Real-time analytics dashboard
- ⚙️ Business settings control
- 💸 Withdrawal request management
- 👑 VIP tier configuration

### ✅ **Technical Features**
- 🎨 Beautiful animations (Framer Motion)
- 📱 Mobile-optimized for Telegram
- 🔥 Firebase real-time database
- 🔐 Secure admin access
- ⚡ Next.js 15 performance

## 🔧 Quick Configuration

### Firebase Setup (5 minutes)
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable Firestore Database
4. Copy web app config to `.env.local`

### Telegram Bot Setup
1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Set Mini App URL: `/setminiapp`
4. Use your deployed URL

## 🚀 Deploy to Production

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Add environment variables
3. Deploy automatically

### Railway
1. Connect GitHub repo to Railway
2. Add environment variables
3. Deploy with one click

## 📱 Test Features

### User Dashboard
- ✅ Daily claim system
- ✅ 8-hour farming cycles
- ✅ Task completion with timers
- ✅ Referral link sharing
- ✅ VIP subscription purchase
- ✅ Withdrawal requests

### Admin Dashboard
- ✅ User statistics
- ✅ Revenue tracking
- ✅ Settings management
- ✅ Withdrawal approvals

## 🎨 Customization

### Colors (tailwind.config.js)
```js
colors: {
  primary: '#0088cc',    // Telegram blue
  secondary: '#40a7e3',  // Light blue
  accent: '#ffd700',     // Gold
}
```

### VIP Pricing (src/lib/constants.ts)
```js
vip1: { price: 75 },   // 75 Stars
vip2: { price: 150 },  // 150 Stars
```

## 🔐 Security

- ✅ Admin secret key protection
- ✅ Firebase security rules
- ✅ Environment variable protection
- ✅ User data encryption

## 📞 Support

- 📖 Read: `README.md` for detailed docs
- 🚀 Deploy: `DEPLOYMENT.md` for deployment guide
- ✨ Features: `FEATURES.md` for complete feature list

---

**Ready to launch your Telegram Mini App empire!** 🎉

Repository: https://github.com/Finisherop/telegram-earning-bot-