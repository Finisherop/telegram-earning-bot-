# 🤖 Telegram Bot Setup Guide | टेलीग्राम बॉट सेटअप गाइड

## 📱 Step 1: Create Telegram Bot | बॉट बनाएं

### 1. BotFather से बात करें
1. Telegram में **@BotFather** search करें
2. `/start` command भेजें
3. `/newbot` command भेजें
4. अपने bot का **name** enter करें (जैसे: `My Earning Bot`)
5. अपने bot का **username** enter करें (जैसे: `myearningbot` - must end with 'bot')

### 2. Bot Token Save करें
- BotFather आपको **Bot Token** देगा
- यह token इस format में होगा: `1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
- **इस token को safe रखें!**

---

## 🌐 Step 2: Web App Setup | वेब ऐप सेटअप

### 1. Deploy Your App | अपना ऐप deploy करें

**Option A: Netlify (Recommended)**
```bash
1. GitHub repository को Netlify से connect करें
2. Build settings:
   - Build command: (empty)
   - Publish directory: /
3. Deploy करें
4. URL मिलेगा: https://your-app-name.netlify.app
```

**Option B: Vercel**
```bash
1. GitHub repository को Vercel से connect करें  
2. Deploy करें
3. URL मिलेगा: https://your-app-name.vercel.app
```

**Option C: GitHub Pages**
```bash
1. Repository Settings में जाएं
2. Pages section में जाकर source select करें
3. URL मिलेगा: https://yourusername.github.io/repository-name
```

### 2. Test Your Deployment | deployment test करें
- अपने URL को browser में open करें
- Check करें कि app properly load हो रहा है
- Firebase connection test करें

---

## ⚙️ Step 3: Configure Bot | बॉट configure करें

### 1. Set Web App URL
BotFather के साथ:
```
/setmenubutton
@YourBotUsername
button_text: 🎮 Open App
web_app_url: https://your-deployed-url.com/
```

### 2. Set Bot Commands | Commands set करें
```
/setcommands
@YourBotUsername

start - 🚀 Start the bot and open app
app - 🎮 Open the earning app  
help - ❓ Get help and support
admin - 🛠️ Admin panel (admin only)
```

### 3. Set Bot Description | Description set करें
```
/setdescription
@YourBotUsername

🎮 Earn coins by completing tasks!
🌱 Farm coins automatically
👥 Refer friends and earn more
💰 Withdraw to your UPI account

टास्क complete करके coins कमाएं!
```

### 4. Set About Text
```
/setabouttext
@YourBotUsername

💰 Earning Bot - Complete tasks, farm coins, refer friends!
🇮🇳 Made for Indian users with UPI withdrawal support
```

---

## 🔧 Step 4: Advanced Configuration | Advanced सेटिंग

### 1. Enable Payments (Optional)
यदि आप real Telegram Star payments enable करना चाहते हैं:

```
/mybots → Select your bot → Bot Settings → Payments
```

### 2. Set Bot Profile Picture
```
/setuserpic
@YourBotUsername
(Upload image - 512x512 px recommended)
```

### 3. Configure Inline Mode (Optional)
```
/setinline
@YourBotUsername
Share earning app with friends!
```

---

## 🧪 Step 5: Testing | टेस्टिंग

### 1. Test in Telegram
1. अपने bot को Telegram में search करें
2. `/start` command भेजें  
3. Menu button पर click करें
4. Web app open होना चाहिए

### 2. Test All Features | सभी features test करें
- ✅ User registration और Firebase sync
- ✅ Coin farming start/claim
- ✅ Task completion
- ✅ Daily claim system
- ✅ VIP purchase (simulation mode)
- ✅ Referral system

### 3. Test Browser Mode | Browser mode test करें
- अपने app URL को directly browser में open करें
- सभी features काम करने चाहिए
- "Browser Mode Active" message दिखेगा

---

## 📋 Step 6: Admin Setup | Admin सेटअप

### 1. Access Admin Panel
```
URL: https://your-app-url.com/?admin=true
```

### 2. Configure Settings | Settings configure करें
- **Referral Reward**: 500 coins (default)
- **Farming Reward**: 100 coins/hour (default)  
- **Min Withdrawal**: 1000 coins (default)
- **VIP Price**: 99 Stars (default)

### 3. Create Tasks | Tasks बनाएं
Admin panel में:
1. "Add New Task" section में जाएं
2. Task name, reward, और link enter करें
3. "Add Task" पर click करें
4. Task automatically सभी users को दिखेगा

---

## 🔥 Step 7: Go Live | Live जाना

### 1. Share Your Bot | बॉट share करें
```
Bot Link: https://t.me/YourBotUsername
Direct App Link: https://your-app-url.com/
```

### 2. Promotion Ideas | Promotion ideas
- Social media पर share करें
- Friends को referral link भेजें
- Telegram groups में promote करें
- YouTube video बनाएं

### 3. Monitor Performance | Performance monitor करें
- Admin panel से user stats check करें
- Firebase console में activity देखें
- Error logs check करें

---

## 🛠️ Troubleshooting | समस्या निवारण

### Common Issues | आम समस्याएं

**1. Web App Not Opening | वेब ऐप नहीं खुल रहा**
```
✅ Check: HTTPS enabled on your domain
✅ Check: Correct URL in BotFather
✅ Check: Web app URL format correct
```

**2. Firebase Errors | Firebase errors**
```
✅ Check: Internet connection
✅ Check: Firebase config is correct  
✅ Check: Database rules allow read/write
```

**3. Farming/Tasks Not Working | Farming/tasks काम नहीं कर रहे**
```
✅ Check: User properly logged in
✅ Check: Firebase connection active
✅ Check: No JavaScript errors in console
```

**4. Browser Mode Issues | Browser mode की समस्याएं**
```
✅ Check: localStorage enabled
✅ Check: Cookies enabled
✅ Check: JavaScript enabled
```

---

## 📱 Usage Examples | उपयोग के उदाहरण

### For Users | Users के लिए
```
1. Bot में /start करें
2. Menu button से app open करें  
3. Daily claim करें (100-300 coins)
4. Tasks complete करें (rewards vary)
5. Farming start करें (100+ coins/hour)
6. Friends को refer करें (500 coins/referral)
7. 1000+ coins पर withdraw करें
```

### For Admins | Admins के लिए  
```
1. Admin panel access करें (?admin=true)
2. New tasks create करें
3. VIP settings configure करें
4. User statistics monitor करें
5. Withdrawal requests handle करें
```

---

## 🎉 Success Checklist | सफलता की checklist

- ✅ Bot successfully created via BotFather
- ✅ Web app deployed और accessible
- ✅ Menu button configured और working  
- ✅ Web app opens in Telegram
- ✅ Web app works in browser mode
- ✅ User registration working
- ✅ Firebase sync active
- ✅ Farming start/claim working
- ✅ Task completion working
- ✅ Daily claim working  
- ✅ VIP system working
- ✅ Referral system active
- ✅ Admin panel accessible
- ✅ No console errors

**आपका Telegram Mini App अब पूरी तरह से ready है! 🚀**

---

## 📞 Support | सपोर्ट

यदि कोई समस्या आए तो:
1. Browser console में errors check करें
2. Firebase console में logs देखें  
3. Test सभी features को systematically
4. Documentation फिर से पढ़ें

**Happy Earning! 💰**