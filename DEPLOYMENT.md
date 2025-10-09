# Deployment Guide - Telegram Mini App

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd telegram-mini-app
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Firebase Setup**
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Set up authentication (optional)
   - Copy your web app config to `.env.local`

4. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

## 🌐 Deployment Options

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway
1. Connect your GitHub repository to Railway
2. Add environment variables
3. Deploy with automatic builds

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuration

### Admin Access
- Default admin key: `TELEGRAM_MINI_APP_ADMIN_2024`
- Access URL: `https://your-app.com/?admin=true&key=TELEGRAM_MINI_APP_ADMIN_2024`
- Change the key in Firebase settings after deployment

### Telegram Bot Setup
1. Create bot with @BotFather
2. Set Mini App URL: `https://your-app.com`
3. Configure webhook for payments (optional)

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true; // Adjust based on your auth needs
    }
    match /tasks/{taskId} {
      allow read: if true;
      allow write: if false; // Admin only
    }
    match /userTasks/{userTaskId} {
      allow read, write: if true;
    }
    match /withdrawals/{withdrawalId} {
      allow read, write: if true;
    }
    match /settings/{settingId} {
      allow read: if true;
      allow write: if false; // Admin only
    }
  }
}
```

## 📊 Initial Data Setup

### Seed Tasks (Optional)
```typescript
// Run this once to populate sample tasks
import { seedTasks } from './src/lib/seedTasks';
seedTasks();
```

### Admin Settings
The app will create default settings automatically. You can modify them through the admin panel.

## 🔍 Testing

### Local Development
```bash
npm run dev
```
Access at http://localhost:3000

### Production Testing
```bash
npm run build
npm start
```

### Admin Panel Testing
Visit: `http://localhost:3000/?admin=true&key=TELEGRAM_MINI_APP_ADMIN_2024`

## 🛡️ Security Checklist

- [ ] Change default admin secret key
- [ ] Set up proper Firebase security rules
- [ ] Configure environment variables securely
- [ ] Enable HTTPS in production
- [ ] Set up proper CORS policies
- [ ] Monitor for suspicious activities

## 📈 Performance Optimization

- [ ] Enable Next.js Image Optimization
- [ ] Configure CDN for static assets
- [ ] Set up proper caching headers
- [ ] Monitor Core Web Vitals
- [ ] Optimize Firebase queries

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check environment variables
   - Verify Firebase project settings
   - Ensure Firestore is enabled

2. **Build Failures**
   - Clear `.next` folder and rebuild
   - Check for TypeScript errors
   - Verify all dependencies are installed

3. **Telegram Integration Issues**
   - Test outside Telegram first
   - Check bot configuration
   - Verify Mini App URL settings

### Logs and Monitoring
- Check browser console for client-side errors
- Monitor Firebase console for database issues
- Set up error tracking (Sentry, LogRocket, etc.)

## 📞 Support

For deployment issues:
1. Check this guide first
2. Review error logs
3. Open an issue on GitHub
4. Contact the development team

---

Happy deploying! 🎉