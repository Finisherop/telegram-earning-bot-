// Import WebApp from window.Telegram instead of SDK
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export class TelegramService {
  private static instance: TelegramService;
  private webApp: any = null;
  private user: TelegramUser | null = null;
  private startParam: string | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.webApp = window.Telegram?.WebApp;
        this.initializeWebApp();
      } catch (error) {
        console.error('Failed to initialize Telegram WebApp:', error);
      }
    }
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  private initializeWebApp() {
    if (!this.webApp) return;

    try {
      this.webApp.ready();
      this.webApp.expand();
      
      // Get user data
      if (this.webApp.initDataUnsafe?.user) {
        this.user = this.webApp.initDataUnsafe.user;
      }
      
      // Get start parameter (for referrals)
      if (this.webApp.initDataUnsafe?.start_param) {
        this.startParam = this.webApp.initDataUnsafe.start_param;
      }
      
      // Set theme
      this.webApp.setHeaderColor('#0088cc');
      this.webApp.setBackgroundColor('#ffffff');
      
    } catch (error) {
      console.error('WebApp initialization error:', error);
    }
  }

  public getUser(): TelegramUser | null {
    return this.user;
  }

  public getStartParam(): string | null {
    return this.startParam;
  }

  public showAlert(message: string): void {
    if (this.webApp) {
      this.webApp.showAlert(message);
    } else {
      alert(message);
    }
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

  // Stars payment integration
  public requestStarsPayment(amount: number, description: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webApp) {
        try {
          // This would integrate with Telegram Stars API
          // For now, we'll simulate the payment
          this.showConfirm(
            `Pay ${amount} Stars for ${description}?`,
            (confirmed) => {
              if (confirmed) {
                this.hapticFeedback('heavy');
                resolve(true);
              } else {
                resolve(false);
              }
            }
          );
        } catch (error) {
          console.error('Stars payment error:', error);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
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