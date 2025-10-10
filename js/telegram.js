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
        // Create fallback user for testing
        this.user = {
            id: '123456789',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            profilePic: '',
            languageCode: 'en',
            isPremium: false
        };

        // Check URL for start parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.startParam = urlParams.get('start') || urlParams.get('ref');
        
        console.log('🔧 Fallback mode initialized');
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

    // Generate referral link
    generateReferralLink(userId) {
        return `https://t.me/Finisher_task_bot/app?startapp=${userId}`;
    }

    // Share referral link
    shareReferralLink(userId) {
        const link = this.generateReferralLink(userId);
        const text = `🎉 Join me on this amazing Telegram Mini App and earn coins together! 💰`;
        
        if (this.webApp) {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
            this.openTelegramLink(shareUrl);
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(link).then(() => {
                this.showAlert('Referral link copied to clipboard!');
            }).catch(() => {
                this.showAlert(`Share this link: ${link}`);
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
}

// Initialize Telegram app
const telegramApp = new TelegramApp();

// Export globally
window.TelegramApp = telegramApp;

export default telegramApp;