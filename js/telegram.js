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

    // Show alert
    showAlert(message, callback) {
        if (this.webApp && this.webApp.showAlert) {
            this.webApp.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) callback();
        }
    }

    // Show confirm
    showConfirm(message, callback) {
        if (this.webApp && this.webApp.showConfirm) {
            this.webApp.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            callback(result);
        }
    }

    // Haptic feedback
    hapticFeedback(type = 'medium') {
        if (this.webApp && this.webApp.HapticFeedback) {
            this.webApp.HapticFeedback.impactOccurred(type);
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

    // Copy to clipboard
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showAlert('Copied to clipboard!');
                this.hapticFeedback('light');
            }).catch(() => {
                this.showAlert('Failed to copy to clipboard');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showAlert('Copied to clipboard!');
                this.hapticFeedback('light');
            } catch (err) {
                this.showAlert('Failed to copy to clipboard');
            }
            document.body.removeChild(textArea);
        }
    }

    // Show/hide main button
    showMainButton(text, onClick) {
        if (this.webApp && this.webApp.MainButton) {
            this.webApp.MainButton.setText(text);
            this.webApp.MainButton.show();
            this.webApp.MainButton.onClick(onClick);
        }
    }

    hideMainButton() {
        if (this.webApp && this.webApp.MainButton) {
            this.webApp.MainButton.hide();
        }
    }
}

// Initialize Telegram app
const telegramApp = new TelegramApp();

// Export globally
window.TelegramApp = telegramApp;

export default telegramApp;