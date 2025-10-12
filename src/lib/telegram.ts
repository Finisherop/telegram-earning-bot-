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
  private user: TelegramUser | null = null;
  private startParam: string | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebApp();
    }
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  private initializeWebApp() {
    try {
      // Listen for the custom event from the enhanced initialization
      window.addEventListener('telegramWebAppReady', (event: any) => {
        console.log('[TelegramService] WebApp ready event received');
        this.webApp = event.detail.webApp;
        this.setupWebApp();
      });
      
      window.addEventListener('telegramWebAppBrowserMode', () => {
        console.log('[TelegramService] Browser mode event received');
        this.setupFallbackMode();
      });
      
      // Fallback timeout in case events don't fire
      setTimeout(() => {
        if (!this.isInitialized) {
          if (typeof window !== 'undefined' && (window as any).__TELEGRAM_WEBAPP__) {
            console.log('[TelegramService] Using global WebApp reference');
            this.webApp = (window as any).__TELEGRAM_WEBAPP__;
            this.setupWebApp();
          } else {
            console.log('[TelegramService] Timeout reached, using fallback mode');
            this.setupFallbackMode();
          }
        }
      }, 2000);
    } catch (error) {
      console.error('[TelegramService] Failed to initialize Telegram WebApp:', error);
      this.setupFallbackMode();
    }
  }

  private setupFallbackMode() {
    // Generate unique user ID for browser users
    let browserId = localStorage.getItem('browserId');
    if (!browserId) {
      browserId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('browserId', browserId);
    }
    
    // Get user data from localStorage or create new
    const storedUserData = localStorage.getItem('browserUserData');
    if (storedUserData && storedUserData.trim()) {
      try {
        // Validate JSON before parsing
        if (storedUserData.startsWith('{') && storedUserData.endsWith('}')) {
          const userData = JSON.parse(storedUserData);
          if (userData && typeof userData === 'object') {
            this.user = {
              id: parseInt(browserId.replace('browser_', '')) || Date.now(),
              first_name: userData.first_name || 'Browser User',
              last_name: userData.last_name || '',
              username: userData.username || 'browseruser',
              language_code: userData.language_code || 'en',
              is_premium: false
            };
          }
        } else {
          console.warn('[TelegramService] Invalid JSON format in stored user data');
          localStorage.removeItem('browserUserData'); // Clean up invalid data
        }
      } catch (error) {
        console.error('[TelegramService] Error parsing stored user data:', error);
        localStorage.removeItem('browserUserData'); // Clean up corrupted data
      }
    }
    
    // If no user data, create default but prompt for setup
    if (!this.user) {
      this.user = {
        id: parseInt(browserId.replace('browser_', '')) || Date.now(),
        first_name: 'Browser User',
        last_name: '',
        username: 'browseruser',
        language_code: 'en',
        is_premium: false
      };
    }
    
    // Check for referral in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const referral = urlParams.get('ref') || urlParams.get('start') || urlParams.get('startapp');
      if (referral) {
        this.startParam = referral;
        console.log('Browser referral detected:', referral);
      }
    }
    
    this.isInitialized = true;
    console.log('Browser fallback mode setup completed:', this.user);
  }

  private setupWebApp() {
    if (!this.webApp) {
      console.warn('WebApp not available, falling back to browser mode');
      this.setupFallbackMode();
      return;
    }

    try {
      console.log('Setting up Telegram WebApp...');
      
      // Initialize WebApp
      if (typeof this.webApp.ready === 'function') {
        this.webApp.ready();
      }
      if (typeof this.webApp.expand === 'function') {
        this.webApp.expand();
      }
      
      // Log all available data for debugging
      console.log('WebApp initData:', this.webApp.initData);
      console.log('WebApp initDataUnsafe:', this.webApp.initDataUnsafe);
      console.log('WebApp version:', this.webApp.version);
      console.log('WebApp platform:', this.webApp.platform);
      
      // Get user data from Telegram with better validation
      if (this.webApp.initDataUnsafe?.user) {
        const userData = this.webApp.initDataUnsafe.user;
        console.log('Raw Telegram user data:', userData);
        
        // Validate user data more thoroughly
        if (userData.id && typeof userData.id === 'number' && userData.id > 0 && userData.first_name) {
          this.user = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name || '',
            username: userData.username || '',
            photo_url: userData.photo_url || undefined,
            language_code: userData.language_code || 'en',
            is_premium: userData.is_premium || false
          };
          console.log('Valid Telegram user data set:', this.user);
        } else {
          console.warn('Invalid Telegram user data:', userData);
        }
      } else {
        console.log('No user data in initDataUnsafe');
      }
      
      // Get start parameter with comprehensive checking
      const startSources = [
        this.webApp.initDataUnsafe?.start_param,
        this.webApp.initDataUnsafe?.startapp,
        new URLSearchParams(window.location.search).get('tgWebAppStartParam'),
        new URLSearchParams(window.location.search).get('start'),
        new URLSearchParams(window.location.search).get('startapp'),
        new URLSearchParams(window.location.search).get('ref'),
      ];
      
      for (const source of startSources) {
        if (source) {
          this.startParam = source;
          console.log('Start param found:', this.startParam, 'from source');
          break;
        }
      }
      
      // If no valid user data from Telegram, use enhanced fallback
      if (!this.user || !this.user.id || this.user.id <= 0) {
        console.log('No valid Telegram user data, using enhanced fallback');
        this.setupFallbackMode();
      } else {
        this.isInitialized = true;
        console.log('Telegram WebApp setup completed successfully with real user:', this.user);
      }
      
    } catch (error) {
      console.error('WebApp setup error:', error);
      this.setupFallbackMode();
    }
  }

  public getUser(): TelegramUser | null {
    // First try to get from the new capture system
    if (typeof window !== 'undefined' && (window as any).__TELEGRAM_USER_DATA__) {
      const capturedData = (window as any).__TELEGRAM_USER_DATA__;
      if (capturedData.source === 'telegram') {
        return {
          id: capturedData.id,
          first_name: capturedData.first_name,
          last_name: capturedData.last_name,
          username: capturedData.username,
          photo_url: capturedData.photo_url,
          language_code: capturedData.language_code,
          is_premium: capturedData.is_premium
        };
      }
    }
    
    // Fallback to existing user data
    return this.user;
  }

  public getStartParam(): string | null {
    return this.startParam;
  }

  public isReady(): boolean {
    return this.isInitialized;
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
      
      if (!this.user?.id) {
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
          userId: this.user.id,
          chatId: this.user.id, // Same as userId for direct messages
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

      if (!this.user?.id) {
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
      if (!this.user?.id) {
        throw new Error('User not authenticated');
      }

      // Import the activation function dynamically to avoid circular dependency
      const { activateSubscription } = await import('@/lib/firebaseService');
      
      console.log(`Activating VIP ${tier} for user:`, this.user.id);
      await activateSubscription(this.user.id.toString(), tier, 30); // 30 days
      
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