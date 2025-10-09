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
      // Listen for the custom event from the layout script
      window.addEventListener('telegramWebAppReady', (event: any) => {
        console.log('Received telegramWebAppReady event');
        this.webApp = event.detail.webApp;
        this.setupWebApp();
      });
      
      // Also try immediate initialization
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
      let retryCount = 0;
      const maxRetries = 100; // 10 seconds total
      
      // Wait for Telegram WebApp to be available
      const checkTelegram = () => {
        console.log(`Checking for Telegram WebApp... (attempt ${retryCount + 1}/${maxRetries})`);
        
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          console.log('Telegram WebApp found, initializing...');
          this.webApp = window.Telegram.WebApp;
          this.setupWebApp();
        } else if (retryCount < maxRetries) {
          retryCount++;
          // Retry after 100ms if Telegram is not ready
          setTimeout(checkTelegram, 100);
        } else {
          console.warn('Telegram WebApp not available after retries, using fallback mode');
          this.setupFallbackMode();
        }
      };
      
      // Start checking immediately
      checkTelegram();
    } catch (error) {
      console.error('Failed to initialize Telegram WebApp:', error);
      this.setupFallbackMode();
    }
  }

  private setupFallbackMode() {
    console.log('Setting up fallback mode...');
    
    // For development or when not in Telegram
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isVercelApp = hostname.includes('vercel.app');
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const hasUserParam = new URLSearchParams(window.location.search).get('user') === 'true';
      
      console.log('Fallback mode conditions:', {
        hostname,
        isDevelopment,
        isVercelApp,
        isLocalhost,
        hasUserParam
      });
      
      // Allow fallback in development, on Vercel apps, localhost, or with user param
      if (isDevelopment || isVercelApp || isLocalhost || hasUserParam) {
        this.user = {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en',
          is_premium: false
        };
        console.log('Using fallback user for testing:', this.user);
        this.isInitialized = true;
      } else {
        console.log('Fallback mode not activated - conditions not met');
      }
    }
  }

  private setupWebApp() {
    if (!this.webApp) return;

    try {
      console.log('Initializing Telegram WebApp...');
      
      // Initialize WebApp safely
      if (typeof this.webApp.ready === 'function') {
        this.webApp.ready();
      }
      if (typeof this.webApp.expand === 'function') {
        this.webApp.expand();
      }
      
      // Log WebApp data for debugging
      console.log('WebApp initData:', this.webApp.initData || 'Not available');
      console.log('WebApp initDataUnsafe:', this.webApp.initDataUnsafe || 'Not available');
      console.log('WebApp version:', this.webApp.version || 'Unknown');
      console.log('WebApp platform:', this.webApp.platform || 'Unknown');
      
      // Get user data with proper null checks
      if (this.webApp.initDataUnsafe?.user) {
        // Validate user data structure
        const userData = this.webApp.initDataUnsafe.user;
        if (userData.id && userData.first_name) {
          this.user = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name || undefined,
            username: userData.username || undefined,
            photo_url: userData.photo_url || undefined,
            language_code: userData.language_code || 'en',
            is_premium: userData.is_premium || false
          };
          console.log('User data received:', this.user);
        } else {
          console.warn('Invalid user data structure:', userData);
          // Don't immediately fall back, the user might be available later
          console.log('Waiting for user data to become available...');
        }
      } else {
        console.warn('No user data available in initDataUnsafe');
        // Check if we're in a Telegram environment but just don't have user data yet
        if (TelegramService.isTelegramEnvironment()) {
          console.log('In Telegram environment but no user data yet, will use fallback');
          this.setupFallbackMode();
        } else {
          console.log('Not in Telegram environment, using fallback mode');
          this.setupFallbackMode();
        }
      }
      
      // Get start parameter (for referrals) with null check
      if (this.webApp.initDataUnsafe?.start_param) {
        this.startParam = this.webApp.initDataUnsafe.start_param;
        console.log('Start parameter:', this.startParam);
      }
      
      // Set theme colors safely
      try {
        if (typeof this.webApp.setHeaderColor === 'function') {
          this.webApp.setHeaderColor('#0088cc');
        }
        if (typeof this.webApp.setBackgroundColor === 'function') {
          this.webApp.setBackgroundColor('#ffffff');
        }
        if (typeof this.webApp.enableClosingConfirmation === 'function') {
          this.webApp.enableClosingConfirmation();
        }
      } catch (themeError) {
        console.warn('Theme setup failed:', themeError);
      }
      
      this.isInitialized = true;
      console.log('Telegram WebApp initialized successfully');
      
    } catch (error) {
      console.error('WebApp setup error:', error);
      this.setupFallbackMode();
    }
  }

  public getUser(): TelegramUser | null {
    return this.user;
  }

  public getStartParam(): string | null {
    return this.startParam;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public waitForInitialization(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isInitialized) {
        resolve(true);
        return;
      }

      let attempts = 0;
      const maxAttempts = 100; // 10 seconds
      
      const checkInitialization = () => {
        if (this.isInitialized) {
          resolve(true);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkInitialization, 100);
        } else {
          console.warn('TelegramService initialization timeout');
          resolve(false);
        }
      };

      checkInitialization();
    });
  }

  public static isTelegramEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check user agent for Telegram
    const userAgent = window.navigator.userAgent;
    const isTelegramUserAgent = userAgent.includes('Telegram');
    
    // Check if Telegram WebApp is available
    const hasTelegramWebApp = !!(window as any).Telegram?.WebApp;
    
    // Check if we have Telegram-specific URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasTelegramParams = urlParams.has('tgWebAppData') || 
                             urlParams.has('tgWebAppVersion') ||
                             urlParams.has('tgWebAppPlatform');
    
    console.log('Telegram environment check:', {
      userAgent,
      isTelegramUserAgent,
      hasTelegramWebApp,
      hasTelegramParams,
      result: isTelegramUserAgent || hasTelegramWebApp || hasTelegramParams
    });
    
    return isTelegramUserAgent || hasTelegramWebApp || hasTelegramParams;
  }

  public showAlert(message: string, callback?: () => void): void {
    // Show Telegram alert
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }

    // Run callback (if provided)
    if (callback) callback();
  }

  public showConfirm(message: string, callback: (confirmed: boolean) => void): void {
    if (this.webApp) {
      this.webApp.showConfirm(message, callback);
    } else {
      const confirmed = confirm(message);
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

  // Telegram Invoice Payment Integration
  public async createInvoice(amount: number, description: string, tier: 'vip1' | 'vip2'): Promise<string | null> {
    try {
      console.log(`Creating invoice for ${tier}: ${amount} Stars - ${description}`);
      
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
          userId: this.user?.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.invoiceUrl;
      } else {
        console.error('Failed to create invoice:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      return null;
    }
  }

  public async requestStarsPayment(amount: number, description: string, tier: 'vip1' | 'vip2'): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Validate inputs
      if (!amount || amount <= 0) {
        console.error('Invalid payment amount:', amount);
        this.showAlert('Invalid payment amount');
        resolve(false);
        return;
      }

      if (!description || !tier) {
        console.error('Missing payment description or tier');
        this.showAlert('Payment configuration error');
        resolve(false);
        return;
      }

      try {
        console.log(`Requesting payment: ${amount} Stars for ${description}`);
        this.hapticFeedback('medium');
        
        // Check if we have WebApp and openInvoice function
        const hasInvoiceSupport = this.webApp && 
          typeof this.webApp.openInvoice === 'function';
        
        if (hasInvoiceSupport) {
          // Create invoice URL
          const invoiceUrl = await this.createInvoice(amount, description, tier);
          
          if (invoiceUrl) {
            console.log('Opening invoice:', invoiceUrl);
            
            // Open Telegram invoice with timeout
            const paymentTimeout = setTimeout(() => {
              console.warn('Payment timeout - no response from Telegram');
              resolve(false);
            }, 300000); // 5 minutes timeout
            
            this.webApp.openInvoice(invoiceUrl, (status: string) => {
              clearTimeout(paymentTimeout);
              console.log('Payment status:', status);
              
              switch (status) {
                case 'paid':
                  this.hapticFeedback('heavy');
                  this.showAlert('Payment successful! VIP activated.', () => {
                    resolve(true);
                  });
                  break;
                case 'cancelled':
                  this.showAlert('Payment cancelled.');
                  resolve(false);
                  break;
                case 'failed':
                  this.showAlert('Payment failed. Please try again.');
                  resolve(false);
                  break;
                case 'pending':
                  this.showAlert('Payment is being processed...');
                  // Keep waiting for final status
                  break;
                default:
                  console.warn('Unknown payment status:', status);
                  resolve(false);
              }
            });
          } else {
            console.warn('Failed to create invoice, using fallback');
            this.useFallbackPayment(amount, description, tier, resolve);
          }
        } else {
          console.warn('Invoice API not available, using fallback');
          this.useFallbackPayment(amount, description, tier, resolve);
        }
      } catch (error) {
        console.error('Payment request error:', error);
        this.showAlert('Payment error. Please try again.');
        resolve(false);
      }
    });
  }

  private useFallbackPayment(
    amount: number, 
    description: string, 
    tier: string, 
    resolve: (value: boolean) => void
  ) {
    // Fallback: Show confirmation dialog for testing
    this.showConfirm(
      `💰 Pay ${amount} Stars for ${description}?\n\n⭐ This will activate ${tier.toUpperCase()} benefits for 30 days\n\n(Test mode - no actual payment required)`,
      (confirmed) => {
        if (confirmed) {
          this.hapticFeedback('heavy');
          // Simulate successful payment for testing
          this.showAlert('✅ Payment successful! VIP activated.', () => {
            resolve(true);
          });
        } else {
          resolve(false);
        }
      }
    );
  }

  public generateReferralLink(userId: string): string {
    return `https://t.me/Finisher_task_bot?start=${userId}`;
  }

  public shareReferralLink(userId: string): void {
    const link = this.generateReferralLink(userId);
    const text = `🎉 Join me on this amazing Telegram Mini App and earn coins together! 💰\n\n${link}`;
    
    if (this.webApp) {
      this.webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else {
      navigator.clipboard.writeText(link);
      this.showAlert('Referral link copied to clipboard!');
    }
  }
}