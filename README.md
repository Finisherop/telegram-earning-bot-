# Telegram Mini App with Firebase Sync

A complete Telegram Web Mini App with real-time Firebase Database synchronization, featuring user panel, admin panel, referral system, farming mechanics, and withdrawal system.

## Features

### 🚀 Core Features
- **Real-time Firebase Database Sync** - All data synced instantly across all users
- **Telegram User Integration** - Fetches user data (ID, username, first_name, last_name, photo_url)
- **Referral System** - Track referrals with real-time rewards
- **Coin Farming** - Automated coin earning system
- **Withdrawal System** - Request withdrawals with UPI integration
- **Admin Panel** - Complete task and user management

### 👤 User Panel
- **Dashboard** with farming status and stats
- **Tasks** - Complete tasks to earn coins
- **Referrals** - Share referral links and track rewards
- **Withdrawals** - Request coin withdrawals

### 🛠️ Admin Panel
- **Dashboard** with user statistics
- **Task Management** - Create, edit, and manage tasks
- **User Management** - View all users and their stats
- **Settings** - Configure rewards and system parameters

## 🔧 Technology Stack

- **Frontend**: HTML5, TailwindCSS, Vanilla JavaScript
- **Backend**: Firebase Realtime Database
- **Integration**: Telegram WebApp SDK
- **Real-time**: Firebase real-time listeners

## 🚀 Quick Start

### Prerequisites
- Telegram Bot created via @BotFather
- Firebase project with Realtime Database enabled

### Setup

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd telegram-mini-app
   ```

2. **Update Firebase configuration**:
   Edit `js/firebase-config.js` with your Firebase credentials

3. **Deploy**:
   - Upload files to your web server
   - Set up Telegram Bot menu button pointing to your domain

4. **Access**:
   - **User Panel**: `https://yourdomain.com/`
   - **Admin Panel**: `https://yourdomain.com/?admin=true`

### Telegram Bot Setup

1. Create bot with @BotFather
2. Set menu button:
   ```
   /setmenubutton
   @YourBot
   button_text: 🎮 Play Game
   web_app_url: https://yourdomain.com/
   ```

## 🎮 Usage

### For Users
1. Open the app via Telegram bot
2. Start farming to earn coins automatically
3. Complete tasks for bonus coins
4. Share referral link to earn from referrals
5. Request withdrawals when minimum reached

### For Admins
1. Access admin panel with `?admin=true`
2. Create and manage tasks
3. Monitor user activity and stats
4. Configure system settings

## 📊 Real-time Features

### User Experience
- **Instant coin updates** when farming completes
- **Real-time referral notifications** when someone joins via your link
- **Live task updates** when admin adds new tasks
- **Immediate reward reflection** for all activities

### Admin Experience
- **Live user statistics** updates
- **Real-time task completion** monitoring
- **Instant settings sync** across all users

## 🔐 Security Features

- Environment-based configuration
- Input validation and sanitization
- Firebase security rules (configure separately)
- XSS protection

## 📱 Mobile Optimization

- Fully responsive design
- Touch-friendly interface
- Telegram theme integration
- Haptic feedback support

## 🛡️ Database Structure

```
/users/{userId}
  - telegramId, username, firstName, lastName
  - coins, xp, level, vipTier
  - referralCount, referralEarnings, referrerId
  - farmingStartTime, farmingEndTime, isFarming
  - createdAt, updatedAt

/tasks/{taskId}
  - title, description, reward, type, url
  - isActive, createdAt, updatedAt

/userTasks/{userId}/{taskId}
  - status, completedAt, claimedAt

/withdrawals/{withdrawalId}
  - userId, amount, upiId, status
  - requestedAt, processedAt

/settings
  - referralReward, farmingReward
  - minWithdrawal, exchangeRate

/activities/{activityId}
  - userId, action, data, timestamp
```

## 🔧 Configuration

### Environment Variables (.env)
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
BOT_USERNAME=your_bot_username
```

### Default Settings
- **Referral Reward**: 500 coins per referral
- **Farming Reward**: 100 coins per hour
- **Minimum Withdrawal**: 1000 coins
- **Exchange Rate**: 100 coins = ₹1

## 🚀 Deployment

### Option 1: Static Hosting
- Deploy to Netlify, Vercel, or GitHub Pages
- No server-side code required
- All logic runs in browser

### Option 2: Web Server
- Upload to any web hosting service
- Ensure HTTPS is enabled (required by Telegram)
- Configure proper MIME types

### Option 3: CDN
- Use services like Cloudflare Pages
- Automatic SSL and global distribution
- Optimal performance

## 🔍 Troubleshooting

### Common Issues

1. **Telegram WebApp not loading**:
   - Ensure HTTPS is enabled
   - Check Telegram bot configuration
   - Verify domain is accessible

2. **Firebase connection issues**:
   - Verify Firebase configuration
   - Check database security rules
   - Ensure database URL is correct

3. **Real-time updates not working**:
   - Check browser console for errors
   - Verify Firebase rules allow read/write
   - Test internet connection stability

### Debug Mode
- Open browser developer tools
- Check console for detailed logs
- Monitor network tab for Firebase calls

## 📈 Analytics & Monitoring

The app includes built-in activity logging:
- User registration and login
- Task completions
- Farming activities
- Referral tracking
- Withdrawal requests

## 🔮 Future Enhancements

- Push notifications
- Advanced VIP tiers
- Leaderboards
- Mini-games
- Social features
- Multi-language support

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase console for errors
3. Test with different users
4. Check Telegram bot logs

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.