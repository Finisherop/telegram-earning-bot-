// Telegram WebApp utilities
class TelegramApp {
    constructor() {
        this.webApp = null;
        this.user = null;
        this.startParam = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('🔄 Initializing Telegram WebApp...');
        
        // Wait for page to load
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }

        // Initialize Telegram WebApp
        this.setupTelegramWebApp();
        
        // Mark as initialized
        this.isInitialized = true;
        console.log('✅ Telegram WebApp initialized');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('telegramReady', {
            detail: { user: this.user, startParam: this.startParam }
        }));
    }

    setupTelegramWebApp() {
        try {
            // Check if Telegram WebApp is available
            if (window.Telegram && window.Telegram.WebApp) {
                console.log('📱 Telegram WebApp detected');
                this.webApp = window.Telegram.WebApp;
                
                // Initialize WebApp
                this.webApp.ready();
                this.webApp.expand();
                
                // Set theme
                this.webApp.setHeaderColor('#667eea');
                this.webApp.setBackgroundColor('#f8f9fa');
                
                // Get user data
                if (this.webApp.initDataUnsafe && this.webApp.initDataUnsafe.user) {
                    const userData = this.webApp.initDataUnsafe.user;
                    this.user = {
                        id: userData.id.toString(),
                        username: userData.username || '',
                        firstName: userData.first_name || '',
                        lastName: userData.last_name || '',
                        profilePic: userData.photo_url || '',
                        languageCode: userData.language_code || 'en',
                        isPremium: userData.is_premium || false
                    };
                    console.log('👤 User data loaded:', this.user);
                }
                
                // Get start parameter (referral code)
                if (this.webApp.initDataUnsafe && this.webApp.initDataUnsafe.start_param) {
                    this.startParam = this.webApp.initDataUnsafe.start_param;
                    console.log('🔗 Start parameter:', this.startParam);
                }
                
            } else {
                console.log('🖥️ Running in fallback mode (not in Telegram)');
                this.setupFallbackMode();
            }
        } catch (error) {
            console.error('❌ Error setting up Telegram WebApp:', error);
            this.setupFallbackMode();
        }
    }

    setupFallbackMode() {
        // ✅ Better fallback user generation for browser mode
        const generateUserId = () => {
            // Check if there's a stored user ID in localStorage
            let userId = localStorage.getItem('fallback_user_id');
            if (!userId) {
                // Generate a unique ID for this browser session
                userId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('fallback_user_id', userId);
            }
            return userId;
        };

        // Create consistent fallback user for browser testing
        this.user = {
            id: generateUserId(),
            username: localStorage.getItem('fallback_username') || 'browser_user',
            firstName: localStorage.getItem('fallback_firstname') || 'Browser',
            lastName: localStorage.getItem('fallback_lastname') || 'User',
            profilePic: '',
            languageCode: 'hi', // Hindi for Indian users
            isPremium: false
        };

        // Check URL for start parameter (referral)
        const urlParams = new URLSearchParams(window.location.search);
        this.startParam = urlParams.get('start') || urlParams.get('ref') || urlParams.get('startapp');
        
        // Also check stored referral for browser mode
        if (!this.startParam) {
            const storedReferral = localStorage.getItem('browser_referral');
            if (storedReferral) {
                this.startParam = storedReferral;
                // Clear it after use to prevent repeated referrals
                localStorage.removeItem('browser_referral');
            }
        }
        
        console.log('🔧 Browser fallback mode initialized with user:', this.user.id);
        console.log('🔗 Referral parameter:', this.startParam);

        // Store user data for consistency across browser sessions
        localStorage.setItem('fallback_username', this.user.username);
        localStorage.setItem('fallback_firstname', this.user.firstName);
        localStorage.setItem('fallback_lastname', this.user.lastName);
    }

    // Get user information
    getUser() {
        return this.user;
    }

    // Get start parameter (referral code)
    getStartParam() {
        return this.startParam;
    }

    // Check if app is ready
    isReady() {
        return this.isInitialized && this.user !== null;
    }

    // ✅ Safe Telegram WebApp methods with version checking and fallbacks
    
    // Safe showAlert with version compatibility
    showAlert(message, callback, title = "Notice") {
        try {
            if (this.webApp && this.webApp.version >= "6.1" && typeof this.webApp.showPopup === "function") {
                // Use modern showPopup for newer versions
                this.webApp.showPopup({ 
                    title: title, 
                    message: message,
                    buttons: [{ type: 'ok' }]
                }, () => {
                    if (callback) callback();
                });
            } else if (this.webApp && typeof this.webApp.showAlert === "function") {
                // Fallback to showAlert
                this.webApp.showAlert(message, callback);
            } else {
                // Browser fallback
                alert(message);
                if (callback) callback();
            }
        } catch (error) {
            console.error('Telegram showAlert error:', error);
            alert(message); // Final fallback
            if (callback) callback();
        }
    }

    // Safe showConfirm with error handling
    showConfirm(message, callback, title = "Confirm") {
        try {
            if (this.webApp && this.webApp.version >= "6.1" && typeof this.webApp.showPopup === "function") {
                this.webApp.showPopup({
                    title: title,
                    message: message,
                    buttons: [
                        { type: 'ok', text: 'Yes' },
                        { type: 'cancel', text: 'No' }
                    ]
                }, (buttonId) => {
                    callback(buttonId === 'ok');
                });
            } else if (this.webApp && typeof this.webApp.showConfirm === "function") {
                this.webApp.showConfirm(message, callback);
            } else {
                const result = confirm(message);
                callback(result);
            }
        } catch (error) {
            console.error('Telegram showConfirm error:', error);
            const result = confirm(message);
            callback(result);
        }
    }

    // Safe haptic feedback
    hapticFeedback(type = 'medium') {
        try {
            if (this.webApp && 
                this.webApp.HapticFeedback && 
                typeof this.webApp.HapticFeedback.impactOccurred === "function") {
                
                // Validate haptic type
                const validTypes = ['light', 'medium', 'heavy', 'rigid', 'soft'];
                const safeType = validTypes.includes(type) ? type : 'medium';
                
                this.webApp.HapticFeedback.impactOccurred(safeType);
                console.log(`✅ Haptic feedback: ${safeType}`);
            } else {
                console.warn('Haptic feedback not available');
            }
        } catch (error) {
            console.error('Haptic feedback error:', error);
        }
    }

    // Safe notification feedback
    notificationFeedback(type = 'success') {
        try {
            if (this.webApp && 
                this.webApp.HapticFeedback && 
                typeof this.webApp.HapticFeedback.notificationOccurred === "function") {
                
                const validTypes = ['error', 'success', 'warning'];
                const safeType = validTypes.includes(type) ? type : 'success';
                
                this.webApp.HapticFeedback.notificationOccurred(safeType);
                console.log(`✅ Notification feedback: ${safeType}`);
            }
        } catch (error) {
            console.error('Notification feedback error:', error);
        }
    }

    // Close app
    close() {
        if (this.webApp) {
            this.webApp.close();
        }
    }

    // Open link
    openLink(url) {
        if (this.webApp && this.webApp.openLink) {
            this.webApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    // Open Telegram link
    openTelegramLink(url) {
        if (this.webApp && this.webApp.openTelegramLink) {
            this.webApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    // Generate referral link with proper bot username
    generateReferralLink(userId) {
        return `https://t.me/finisher_task_bot?start=${userId}`;
    }

    // Share referral link with proper bot integration
    shareReferralLink(userId) {
        const link = this.generateReferralLink(userId);
        const text = `🎉 Join me on this amazing Telegram Mini App and earn coins together! 💰\n\n🎮 Complete tasks, farm coins, and refer friends!\n💎 Get VIP for 2x rewards!\n\n${link}`;
        
        if (this.webApp) {
            this.webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
        } else {
            // Fallback for browser mode
            navigator.clipboard.writeText(link).then(() => {
                this.showAlert('🔗 Referral link copied to clipboard!\n\nShare it with friends to earn 500 coins per referral! 💰');
            }).catch(() => {
                this.showAlert(`Share this link with friends:\n\n${link}\n\nEarn 500 coins per referral! 💰`);
            });
        }
    }

    // ✅ Safe clipboard operations with multiple fallbacks
    copyToClipboard(text) {
        if (!text) {
            this.showAlert('Nothing to copy');
            return;
        }

        try {
            // Use standard clipboard API with secure context check
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showAlert('Copied to clipboard!');
                    this.hapticFeedback('light');
                }).catch((error) => {
                    console.error('Clipboard write failed:', error);
                    this.fallbackCopy(text);
                });
            } else {
                this.fallbackCopy(text);
            }
        } catch (error) {
            console.error('Clipboard operation error:', error);
            this.fallbackCopy(text);
        }
    }

    // Secure fallback copy method
    fallbackCopy(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                this.showAlert('Copied to clipboard!');
                this.hapticFeedback('light');
            } else {
                this.showAlert(`Please copy: ${text}`);
            }
        } catch (error) {
            console.error('Fallback copy failed:', error);
            this.showAlert(`Copy this text: ${text}`);
        }
    }

    // ✅ Safe main button operations with validation
    showMainButton(text, onClick) {
        try {
            if (this.webApp && this.webApp.MainButton) {
                this.webApp.MainButton.setText(text || 'Continue');
                this.webApp.MainButton.show();
                if (typeof onClick === 'function') {
                    this.webApp.MainButton.onClick(onClick);
                }
                console.log(`✅ Main button shown: ${text}`);
            } else {
                console.warn('Main button not available');
            }
        } catch (error) {
            console.error('Main button show error:', error);
        }
    }

    hideMainButton() {
        try {
            if (this.webApp && this.webApp.MainButton) {
                this.webApp.MainButton.hide();
                console.log('✅ Main button hidden');
            }
        } catch (error) {
            console.error('Main button hide error:', error);
        }
    }

    // ✅ Telegram Star Payment Integration
    
    // ✅ Enhanced Telegram WebApp environment detection
    checkTelegramEnvironment() {
        const isTelegram = !!(window.Telegram && window.Telegram.WebApp);
        const hasValidData = !!(this.webApp && this.webApp.initData);
        
        if (isTelegram) {
            console.log('✅ Running inside Telegram WebApp');
            return true;
        } else {
            console.log('🌐 Running in browser mode - all features still available');
            return false; // Don't show alert, just log
        }
    }

    // Enhanced browser mode support 
    isBrowserMode() {
        return !window.Telegram || !window.Telegram.WebApp;
    }

    // Safe environment message
    showEnvironmentMessage() {
        if (this.isBrowserMode()) {
            // Show friendly message instead of warning
            const environmentDiv = document.createElement('div');
            environmentDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; text-align: center; font-size: 14px; position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;">
                    🌐 Browser Mode Active | सभी features उपलब्ध हैं | Open in Telegram for full experience
                    <button onclick="this.parentNode.remove()" style="float: right; background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            `;
            document.body.appendChild(environmentDiv);
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                if (environmentDiv.parentNode) {
                    environmentDiv.parentNode.removeChild(environmentDiv);
                }
            }, 5000);
        }
    }

    // Safe Telegram Star Payment
    async requestStarPayment(amount, title, description, payload) {
        const isTelegram = this.checkTelegramEnvironment();
        
        try {
            console.log(`🌟 Requesting payment: ${amount} for ${title}`);
            
            // Get VIP settings for payment configuration
            const vipSettings = await window.Firebase?.getVIPSettings() || {
                vipAmount: amount,
                vipCurrency: "XTR", // Telegram Stars
                paymentProviderToken: ""
            };

            // Prepare payment data
            const paymentData = {
                type: "invoice",
                title: title || "VIP Membership",
                description: description || "Upgrade to VIP for exclusive benefits",
                payload: JSON.stringify(payload || { 
                    userId: this.user?.id, 
                    plan: "VIP",
                    timestamp: Date.now()
                }),
                provider_token: vipSettings.paymentProviderToken || "",
                currency: isTelegram ? "XTR" : vipSettings.vipCurrency,
                prices: [{ 
                    label: title || "VIP Membership", 
                    amount: amount || vipSettings.vipAmount 
                }]
            };

            if (isTelegram && this.webApp && typeof this.webApp.sendData === 'function') {
                // Use Telegram's payment API
                this.webApp.sendData(JSON.stringify(paymentData));
                this.hapticFeedback('medium');
                
                return { 
                    success: true, 
                    message: 'Payment request sent',
                    paymentData 
                };
            } else if (isTelegram && this.webApp && typeof this.webApp.openInvoice === 'function') {
                // Alternative: Use openInvoice if available
                const invoiceUrl = await this.createPaymentInvoice(paymentData);
                if (invoiceUrl) {
                    this.webApp.openInvoice(invoiceUrl, (status) => {
                        this.handlePaymentStatus(status, payload);
                    });
                    return { success: true, message: 'Payment invoice opened' };
                }
            }

            // ✅ Always allow browser mode simulation - no error
            return this.simulatePayment(amount, title, payload);

        } catch (error) {
            console.error('Payment error:', error);
            // In browser mode, still allow simulation
            if (!isTelegram) {
                return this.simulatePayment(amount, title, payload);
            }
            return { success: false, message: 'Payment request failed', error };
        }
    }

    // Create payment invoice (integrates with your API)
    async createPaymentInvoice(paymentData) {
        try {
            console.log('🔄 Creating payment invoice via API...');
            
            // Call your backend API to create invoice
            const response = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user?.id,
                    chatId: this.user?.id, // Same as userId for Telegram
                    amount: paymentData.prices[0].amount,
                    currency: paymentData.currency,
                    title: paymentData.title,
                    description: paymentData.description,
                    plan: 'VIP'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Invoice created via API:', result);
                
                if (result.success) {
                    return `https://t.me/invoice/${result.invoiceId}`;
                } else {
                    throw new Error(result.error || 'Invoice creation failed');
                }
            } else {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Invoice creation error:', error);
            
            // If API fails, show user-friendly message
            this.showAlert(`💳 Payment system temporarily unavailable.\n\nPlease try again later or contact support.`);
            return null;
        }
    }

    // Handle payment status callback
    async handlePaymentStatus(status, payload) {
        console.log(`Payment status: ${status}`, payload);
        
        try {
            switch (status) {
                case 'paid':
                    await this.onPaymentSuccess(payload);
                    this.notificationFeedback('success');
                    break;
                case 'cancelled':
                    this.showAlert('Payment cancelled');
                    break;
                case 'failed':
                    this.showAlert('Payment failed. Please try again.');
                    this.notificationFeedback('error');
                    break;
                default:
                    console.log('Unknown payment status:', status);
            }
        } catch (error) {
            console.error('Error handling payment status:', error);
        }
    }

    // Payment success handler
    async onPaymentSuccess(payload) {
        try {
            const userId = this.user?.id;
            if (!userId) {
                console.error('No user ID for payment success');
                return;
            }

            // Activate VIP for user
            const vipActivated = await window.Firebase?.activateVIP(userId, 30);
            
            if (vipActivated) {
                this.showAlert(
                    `⭐ VIP Activated! Welcome to VIP membership, ${this.user?.firstName || 'User'}!`,
                    () => {
                        // Refresh the page or update UI
                        window.location.reload();
                    },
                    'VIP Activated'
                );
            } else {
                this.showAlert('VIP activation failed. Please contact support.');
            }

        } catch (error) {
            console.error('Payment success handling error:', error);
            this.showAlert('Payment processed but activation failed. Please contact support.');
        }
    }

    // Simulate payment for testing (when not in Telegram)
    simulatePayment(amount, title, payload) {
        console.log('🧪 Simulating payment for testing...');
        
        this.showConfirm(
            `💰 Simulate payment of ${amount} stars for ${title}?\n\n⭐ This is a test mode - no real payment required`,
            async (confirmed) => {
                if (confirmed) {
                    this.hapticFeedback('heavy');
                    await this.onPaymentSuccess(payload);
                }
            },
            'Simulate Payment'
        );

        return { success: true, message: 'Payment simulation started' };
    }

    // Main VIP purchase method
    async buyVIP() {
        try {
            const vipSettings = await window.Firebase?.getVIPSettings();
            if (!vipSettings) {
                this.showAlert('VIP settings not available');
                return;
            }

            const amount = vipSettings.vipAmount;
            const currency = vipSettings.vipCurrency;
            
            // Convert amount display based on currency
            const displayAmount = currency === 'XTR' ? 
                `${amount} Stars` : 
                `${(amount / 100).toFixed(2)} ${currency}`;

            const result = await this.requestStarPayment(
                amount,
                "VIP Membership",
                `Upgrade to VIP for ${vipSettings.vipDuration} days`,
                {
                    userId: this.user?.id,
                    plan: "VIP",
                    duration: vipSettings.vipDuration,
                    amount: amount,
                    currency: currency
                }
            );

            if (!result.success) {
                this.showAlert(`Payment failed: ${result.message}`);
            }

        } catch (error) {
            console.error('VIP purchase error:', error);
            this.showAlert('VIP purchase failed. Please try again.');
        }
    }

    // Setup main button for VIP purchase
    setupVIPPurchaseButton() {
        if (this.checkTelegramEnvironment() && this.webApp.MainButton) {
            this.webApp.MainButton.setText("⭐ Buy VIP");
            this.webApp.MainButton.show();
            this.webApp.MainButton.onClick(() => this.buyVIP());
        }
    }
}

// Initialize Telegram app
const telegramApp = new TelegramApp();

// Export globally
window.TelegramApp = telegramApp;

export default telegramApp;