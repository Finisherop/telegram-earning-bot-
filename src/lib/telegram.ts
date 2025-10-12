// Telegram WebApp Types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          start_param?: string;
          auth_date?: number;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: string;
        themeParams: any;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        isClosingConfirmationEnabled: boolean;
        BackButton: any;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isProgressVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        showPopup: (params: any, callback?: (buttonId: string) => void) => void;
        showScanQrPopup: (params: any, callback?: (text: string) => void) => void;
        closeScanQrPopup: () => void;
        readTextFromClipboard: (callback: (text: string) => void) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
        sendData: (data: string) => void;
        switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export class TelegramService {
  private static instance: TelegramService;
  private webApp: any = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.webApp = (window as any).Telegram?.WebApp || null;
    }
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  public getUser(): TelegramUser | null {
    // Get user data directly from Telegram WebApp SDK
    if (this.webApp?.initDataUnsafe?.user) {
      const user = this.webApp.initDataUnsafe.user;
      if (user.id && user.first_name) {
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name || '',
          username: user.username || '',
          photo_url: user.photo_url,
          language_code: user.language_code || 'en',
          is_premium: user.is_premium || false
        };
      }
    }
    
    // Fallback for browser testing
    const browserId = localStorage.getItem('browserId') || `browser_${Date.now()}`;
    localStorage.setItem('browserId', browserId);
    
    return {
      id: parseInt(browserId.replace('browser_', '')) || Date.now(),
      first_name: 'Browser User',
      last_name: '',
      username: 'browseruser',
      language_code: 'en',
      is_premium: false
    };
  }

  public getStartParam(): string | null {
    if (this.webApp?.initDataUnsafe?.start_param) {
      return this.webApp.initDataUnsafe.start_param;
    }
    
    // Check URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('start') || urlParams.get('ref') || null;
    }
    
    return null;
  }

  public showAlert(message: string, callback?: () => void): void {
    // Show Telegram alert
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.showAlert(message);
    } else {
      console.warn('[Telegram] Message silenced:', message);
    }

    // Run callback (if provided)
    if (callback) callback();
  }

  public showConfirm(message: string, callback: (confirmed: boolean) => void): void {
    if (this.webApp) {
      this.webApp.showConfirm(message, callback);
    } else {
      console.warn('[Telegram] Confirmation silenced:', message);
      const confirmed = false; // Always return false for safety
      callback(confirmed);
    }
  }

  public close(): void {
    if (this.webApp) {
      this.webApp.close();
    }
  }

  public openLink(url: string): void {
    if (this.webApp) {
      this.webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  public openTelegramLink(url: string): void {
    if (this.webApp) {
      this.webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  public hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'): void {
    if (this.webApp?.HapticFeedback) {
      switch (type) {
        case 'light':
          this.webApp.HapticFeedback.impactOccurred('light');
          break;
        case 'medium':
          this.webApp.HapticFeedback.impactOccurred('medium');
          break;
        case 'heavy':
          this.webApp.HapticFeedback.impactOccurred('heavy');
          break;
        case 'rigid':
          this.webApp.HapticFeedback.impactOccurred('rigid');
          break;
        case 'soft':
          this.webApp.HapticFeedback.impactOccurred('soft');
          break;
      }
    }
  }

  public showMainButton(text: string, onClick: () => void): void {
    if (this.webApp?.MainButton) {
      this.webApp.MainButton.setText(text);
      this.webApp.MainButton.show();
      this.webApp.MainButton.onClick(onClick);
    }
  }

  public hideMainButton(): void {
    if (this.webApp?.MainButton) {
      this.webApp.MainButton.hide();
    }
  }

  // Telegram Invoice Payment Integration - Enhanced
  public async createInvoice(amount: number, description: string, tier: 'vip1' | 'vip2'): Promise<string | null> {
    try {
      console.log(`Creating invoice for ${tier}: ${amount} Stars - ${description}`);
      
      const user = this.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Call your backend API to create Telegram invoice
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          description: description,
          tier: tier,
          userId: user.id,
          chatId: user.id, // Same as userId for direct messages
          title: `${tier?.toUpperCase() || ''} Membership - 30 Days`,
        })
      });
      
      // Enhanced JSON parsing with error handling
      let data;
      try {
        const responseText = await response.text();
        if (responseText && responseText.trim()) {
          // Validate JSON format before parsing
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            data = JSON.parse(responseText);
          } else {
            throw new Error('Invalid JSON response format');
          }
        } else {
          throw new Error('Empty response from server');
        }
      } catch (jsonError) {
        console.error('[TelegramService] JSON parsing error:', jsonError);
        throw new Error('Invalid response from payment service');
      }
      
      console.log('[TelegramService] Invoice API response:', data);
      
      if (response.ok && data.success) {
        console.log('Invoice created successfully:', data.invoiceUrl);
        return data.invoiceUrl;
      } else {
        console.error('Failed to create invoice:', data.error || response.statusText);
        this.showAlert(`❌ Payment system error: ${data.error || 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      this.showAlert('❌ Payment system temporarily unavailable. Please try again later.');
      return null;
    }
  }

  public async requestStarsPayment(amount: number, description: string, tier: 'vip1' | 'vip2'): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Enhanced validation
      if (!amount || amount <= 0) {
        console.error('Invalid payment amount:', amount);
        this.showAlert('❌ Invalid payment amount');
        resolve(false);
        return;
      }

      if (!description || !tier) {
        console.error('Missing payment description or tier');
        this.showAlert('❌ Payment configuration error');
        resolve(false);
        return;
      }

      const user = this.getUser();
      if (!user?.id) {
        console.error('User not authenticated');
        this.showAlert('❌ Please refresh the app and try again');
        resolve(false);
        return;
      }

      try {
        console.log(`Requesting payment: ${amount} Stars for ${description}`);
        this.hapticFeedback('medium');
        
        // Check if we have WebApp with invoice support
        const hasInvoiceSupport = this.webApp && 
          this.webApp.version && 
          parseFloat(this.webApp.version) >= 6.1 &&
          typeof this.webApp.openInvoice === 'function';
        
        if (hasInvoiceSupport) {
          // Create invoice URL
          const invoiceUrl = await this.createInvoice(amount, description, tier);
          
          if (invoiceUrl) {
            console.log('Opening invoice with Telegram WebApp:', invoiceUrl);
            
            // Set up payment timeout
            const paymentTimeout = setTimeout(() => {
              console.warn('Payment timeout - no response from Telegram');
              this.showAlert('⏰ Payment timeout. Please try again.');
              resolve(false);
            }, 300000); // 5 minutes timeout
            
            // Open invoice with callback
            this.webApp.openInvoice(invoiceUrl, (status: string) => {
              clearTimeout(paymentTimeout);
              console.log('Payment callback received:', status);
              
              switch (status) {
                case 'paid':
                  this.hapticFeedback('heavy');
                  console.log('Payment successful, activating VIP...');
                  this.activateVIPAfterPayment(tier).then(() => {
                    this.showAlert('🎉 Payment successful! VIP activated for 30 days!', () => {
                      resolve(true);
                    });
                  });
                  break;
                case 'cancelled':
                  console.log('Payment cancelled by user');
                  this.showAlert('❌ Payment cancelled.');
                  resolve(false);
                  break;
                case 'failed':
                  console.log('Payment failed');
                  this.showAlert('❌ Payment failed. Please try again.');
                  resolve(false);
                  break;
                case 'pending':
                  console.log('Payment pending');
                  this.showAlert('⏳ Payment is being processed...');
                  // Continue waiting for final status
                  break;
                default:
                  console.warn('Unknown payment status:', status);
                  this.showAlert('❓ Payment status unknown. Please contact support if charged.');
                  resolve(false);
              }
            });
          } else {
            console.warn('Failed to create invoice, using test mode');
            this.useTestPayment(amount, description, tier, resolve);
          }
        } else {
          console.warn('Invoice API not available, using test mode');
          console.log('WebApp version:', this.webApp?.version, 'Has openInvoice:', typeof this.webApp?.openInvoice);
          this.useTestPayment(amount, description, tier, resolve);
        }
      } catch (error) {
        console.error('Payment request error:', error);
        this.showAlert('❌ Payment error. Please check your connection and try again.');
        resolve(false);
      }
    });
  }

  private async activateVIPAfterPayment(tier: 'vip1' | 'vip2'): Promise<void> {
    try {
      const user = this.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Import the activation function dynamically to avoid circular dependency
      const { activateSubscription } = await import('@/lib/firebaseService');
      
      console.log(`Activating VIP ${tier} for user:`, user.id);
      await activateSubscription(user.id.toString(), tier, 30); // 30 days
      
      console.log('VIP activation completed successfully');
    } catch (error) {
      console.error('VIP activation error:', error);
      this.showAlert('✅ Payment received! VIP activation in progress...');
    }
  }

  private useTestPayment(
    amount: number, 
    description: string, 
    tier: string, 
    resolve: (value: boolean) => void
  ) {
    // Enhanced test mode for development/browser testing
    const testMessage = `💰 Test Payment: ${amount} Stars\n\n` +
                       `📦 ${description}\n\n` +
                       `⭐ This will activate ${tier?.toUpperCase() || ''} benefits for 30 days\n\n` +
                       `🧪 Test mode - no actual payment required\n\n` +
                       `Continue with test activation?`;
    
    this.showConfirm(testMessage, async (confirmed) => {
      if (confirmed) {
        this.hapticFeedback('heavy');
        try {
          // Simulate successful payment and activate VIP
          await this.activateVIPAfterPayment(tier as 'vip1' | 'vip2');
          this.showAlert('✅ Test payment successful! VIP activated for testing.', () => {
            resolve(true);
          });
        } catch (error) {
          console.error('Test payment activation error:', error);
          this.showAlert('❌ Test activation failed. Please try again.');
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  }

  public generateReferralLink(userId: string): string {
    return `https://t.me/finisher_task_bot?start=${userId}`;
  }

  public shareReferralLink(userId: string): void {
    const link = this.generateReferralLink(userId);
    const text = `🎉 Join me on this amazing Telegram earning bot and earn coins together! 💰\n\n🎮 Start earning with my referral link:\n${link}\n\n💎 You'll get bonus coins when you join!`;
    
    if (this.webApp && typeof this.webApp.openTelegramLink === 'function') {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
      this.webApp.openTelegramLink(shareUrl);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        this.showAlert('🔗 Referral link copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          this.showAlert('🔗 Referral link copied to clipboard!');
        } catch (err) {
          this.showAlert(`Your referral link: ${link}`);
        }
        document.body.removeChild(textArea);
      });
    } else {
      // Ultimate fallback - show the link
      this.showAlert(`Your referral link: ${link}`);
    }
  }
}