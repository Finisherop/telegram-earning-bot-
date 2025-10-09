# Telegram Mini App - High Performance Earning Platform

A fully-featured Telegram Mini App built with Next.js, React, and Firebase, featuring VIP subscriptions, task management, referral system, and UPI withdrawals.

## 🚀 Features

### User Features
- **Dashboard**: Real-time stats, daily claims, farming system with VIP multipliers
- **Task System**: Link visits, ad watching with 10-second timers, reward claiming
- **Referral System**: Web App-based referral tracking with multipliers
- **VIP Shop**: Stars payment integration for VIP 1 & VIP 2 subscriptions
- **Withdrawal System**: UPI-based withdrawals with tier-based limits
- **Profile**: Comprehensive user stats, achievements, and VIP status

### Admin Features
- **Analytics Dashboard**: Real-time user stats, revenue tracking, system status
- **Settings Management**: Configurable exchange rates, VIP pricing, multipliers
- **Withdrawal Approvals**: Complete withdrawal request management system

### Technical Features
- **URL-based Access**: `?admin=true&key=SECRET_KEY` for admin access
- **VIP Tiers**: 30-day fixed subscriptions with farming/referral multipliers
- **Animations**: Framer Motion animations throughout the app
- **Responsive Design**: Mobile-first design optimized for Telegram
- **Real-time Updates**: Firebase real-time database integration

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Animations**: Framer Motion
- **Database**: Firebase Firestore
- **Notifications**: React Hot Toast
- **Telegram Integration**: @telegram-apps/sdk

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-mini-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Firebase configuration and other settings.

4. **Set up Firebase**
   - Create a new Firebase project
   - Enable Firestore Database
   - Add your web app configuration to `.env.local`
   - Set up Firestore security rules (see below)

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔥 Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if resource.data.telegramId == request.auth.uid;
    }
    
    // Tasks collection (read-only for users)
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admin can write
    }
    
    // User tasks
    match /userTasks/{userTaskId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Withdrawals
    match /withdrawals/{withdrawalId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Settings (admin only)
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admin can write
    }
  }
}
```

## 🎯 VIP Tier Configuration

| Tier | Price (Stars) | Farming Multiplier | Referral Multiplier | Ads Limit | Withdrawal Limit | Min Withdrawal |
|------|---------------|-------------------|-------------------|-----------|------------------|----------------|
| Free | N/A | 1.0x | 1.0x | 5/day | 1/day | ₹200 |
| VIP 1 | 75 Stars | 2.0x | 1.5x | Unlimited | 3/day | ₹250 |
| VIP 2 | 150 Stars | 2.5x | 2.0x | Unlimited | 5/day | ₹500 |

## 🔐 Admin Access

Access the admin dashboard by visiting:
```
https://your-app-url.com/?admin=true&key=TELEGRAM_MINI_APP_ADMIN_2024
```

## 📱 Telegram Bot Setup

1. Create a new bot with @BotFather
2. Set up the Mini App URL in bot settings
3. Configure webhook for payment notifications (Stars API)
4. Update `TELEGRAM_BOT_USERNAME` in environment variables

## 🎨 Customization

### Colors
The app uses a custom color scheme defined in `tailwind.config.js`:
- Primary: `#0088cc` (Telegram blue)
- Secondary: `#40a7e3`
- Accent: `#ffd700` (Gold)

### Animations
Custom animations are defined in `globals.css`:
- `coin-animation`: Floating coin effect
- `pulse-glow`: Glowing pulse for important buttons
- `vip-glow`: Special glow effect for VIP elements

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 📊 Database Schema

### Users Collection
```typescript
{
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  coins: number;
  xp: number;
  vipTier: 'free' | 'vip1' | 'vip2';
  vipEndTime?: Date;
  farmingMultiplier: number;
  referralMultiplier: number;
  referralCount: number;
  dailyStreak: number;
  // ... more fields
}
```

### Tasks Collection
```typescript
{
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'link' | 'ads' | 'social';
  url?: string;
  isActive: boolean;
}
```

### Withdrawals Collection
```typescript
{
  id: string;
  userId: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: Date;
}
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure
```
src/
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── user/           # User dashboard components
│   └── admin/          # Admin dashboard components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and services
├── types/              # TypeScript type definitions
└── globals.css         # Global styles
```

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Issues**
   - Verify your Firebase configuration in `.env.local`
   - Check Firestore security rules
   - Ensure Firebase project is active

2. **Telegram Integration Issues**
   - Verify bot token and username
   - Check Mini App URL configuration
   - Test in Telegram's development environment

3. **Payment Issues**
   - Ensure Stars API is properly configured
   - Check webhook endpoints
   - Verify payment flow in Telegram

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

---

Built with ❤️ for the Telegram ecosystem