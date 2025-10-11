/**
 * Enhanced Telegram WebApp Integration with Firebase Connection Management
 * 
 * Provides robust lifecycle management for Telegram WebApp with proper
 * Firebase reconnection handling for background/resume scenarios.
 */

import { TelegramService } from './telegram';
import { reconnectFirebase, isFirebaseConnected } from './firebaseConnectionManager';

export interface TelegramWebAppState {
  isReady: boolean;
  isBackground: boolean;
  isConnected: boolean;
  lastActivityTime: number;
  resumeCount: number;
}

class TelegramWebAppManager {
  private static instance: TelegramWebAppManager;
  private telegramService: TelegramService | null = null;
  private state: TelegramWebAppState = {
    isReady: false,
    isBackground: false,
    isConnected: false,
    lastActivityTime: Date.now(),
    resumeCount: 0
  };
  private eventListeners: (() => void)[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebApp();
    }
  }

  public static getInstance(): TelegramWebAppManager {
    if (!TelegramWebAppManager.instance) {
      TelegramWebAppManager.instance = new TelegramWebAppManager();
    }
    return TelegramWebAppManager.instance;
  }

  /**
   * Initialize Telegram WebApp with enhanced lifecycle management
   */
  private initializeWebApp(): void {
    try {
      console.log('[TelegramWebAppManager] Initializing enhanced WebApp management...');

      // Get Telegram service instance
      this.telegramService = TelegramService.getInstance();

      // Setup enhanced Telegram WebApp event listeners
      this.setupTelegramEvents();
      
      // Setup browser event listeners
      this.setupBrowserEvents();
      
      // Setup heartbeat to monitor connection
      this.setupHeartbeat();
      
      // Mark as ready
      this.state.isReady = true;
      this.state.isConnected = true;
      this.state.lastActivityTime = Date.now();

      console.log('[TelegramWebAppManager] Enhanced WebApp management initialized successfully');
      
      // Store global reference for debugging
      if (typeof window !== 'undefined') {
        (window as any).__TELEGRAM_WEBAPP_MANAGER__ = this;
      }

    } catch (error) {
      console.error('[TelegramWebAppManager] Failed to initialize WebApp management:', error);
    }
  }

  /**
   * Setup Telegram WebApp specific event listeners
   */
  private setupTelegramEvents(): void {
    const setupEvents = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.onEvent === 'function') {
        console.log('[TelegramWebAppManager] Setting up Telegram WebApp event listeners');

        // Viewport changed (often indicates app resume/background)
        const viewportChangedHandler = () => {
          console.log('[TelegramWebAppManager] Viewport changed detected');
          this.handleViewportChange();
        };

        // Theme changed (often happens on resume)
        const themeChangedHandler = () => {
          console.log('[TelegramWebAppManager] Theme changed detected - likely app resume');
          this.handleAppResume();
        };

        // Main button clicked (indicates user activity)
        const mainButtonClickedHandler = () => {
          console.log('[TelegramWebAppManager] Main button activity detected');
          this.updateLastActivity();
        };

        // Setup popup events
        const popupClosedHandler = () => {
          console.log('[TelegramWebAppManager] Popup closed - app likely resumed');
          this.handleAppResume();
        };

        // Add event listeners
        tg.onEvent('viewportChanged', viewportChangedHandler);
        tg.onEvent('themeChanged', themeChangedHandler);
        tg.onEvent('mainButtonClicked', mainButtonClickedHandler);
        tg.onEvent('popupClosed', popupClosedHandler);

        // Store cleanup functions
        this.eventListeners.push(() => {
          if (typeof tg.offEvent === 'function') {
            tg.offEvent('viewportChanged', viewportChangedHandler);
            tg.offEvent('themeChanged', themeChangedHandler);
            tg.offEvent('mainButtonClicked', mainButtonClickedHandler);
            tg.offEvent('popupClosed', popupClosedHandler);
          }
        });

        console.log('[TelegramWebAppManager] Telegram event listeners registered');
      } else {
        // Retry if Telegram WebApp not ready
        console.log('[TelegramWebAppManager] Telegram WebApp not ready, retrying in 1s...');
        setTimeout(setupEvents, 1000);
      }
    };

    setupEvents();
  }

  /**
   * Setup browser-level event listeners
   */
  private setupBrowserEvents(): void {
    // Page visibility change
    const visibilityChangeHandler = () => {
      if (document.hidden) {
        console.log('[TelegramWebAppManager] Page hidden - app going to background');
        this.handleAppBackground();
      } else {
        console.log('[TelegramWebAppManager] Page visible - app resumed from background');
        this.handleAppResume();
      }
    };

    // Focus/blur events
    const focusHandler = () => {
      console.log('[TelegramWebAppManager] Window focused');
      this.handleAppResume();
    };

    const blurHandler = () => {
      console.log('[TelegramWebAppManager] Window blurred');
      this.handleAppBackground();
    };

    // Online/offline events
    const onlineHandler = () => {
      console.log('[TelegramWebAppManager] Network online');
      this.handleNetworkOnline();
    };

    const offlineHandler = () => {
      console.log('[TelegramWebAppManager] Network offline');
      this.handleNetworkOffline();
    };

    // User interaction events
    const activityHandler = () => {
      this.updateLastActivity();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    // User activity tracking
    document.addEventListener('click', activityHandler);
    document.addEventListener('keydown', activityHandler);
    document.addEventListener('touchstart', activityHandler);

    // Store cleanup functions
    this.eventListeners.push(() => {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      document.removeEventListener('click', activityHandler);
      document.removeEventListener('keydown', activityHandler);
      document.removeEventListener('touchstart', activityHandler);
    });
  }

  /**
   * Setup heartbeat to monitor connection health
   */
  private setupHeartbeat(): void {
    // Check connection health every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000);

    this.eventListeners.push(() => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    });
  }

  /**
   * Handle viewport changes
   */
  private handleViewportChange(): void {
    this.updateLastActivity();
    
    // Viewport changes might indicate app becoming active
    if (this.state.isBackground) {
      console.log('[TelegramWebAppManager] Viewport change while in background - triggering resume');
      this.handleAppResume();
    }
  }

  /**
   * Handle app resume from background
   */
  private async handleAppResume(): Promise<void> {
    try {
      console.log('[TelegramWebAppManager] Handling app resume...');
      
      // Update state
      const wasBackground = this.state.isBackground;
      this.state.isBackground = false;
      this.state.isConnected = true;
      this.state.lastActivityTime = Date.now();
      this.state.resumeCount++;

      // Only trigger Firebase reconnection if we were actually in background
      if (wasBackground) {
        console.log('[TelegramWebAppManager] App resumed from background, reconnecting Firebase...');
        
        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        // Attempt Firebase reconnection
        try {
          await reconnectFirebase();
          console.log('[TelegramWebAppManager] Firebase reconnected successfully after resume');
        } catch (error) {
          console.error('[TelegramWebAppManager] Firebase reconnection failed:', error);
          // Schedule retry
          this.scheduleReconnectRetry();
        }
      }

      // Dispatch custom event for other parts of the app
      window.dispatchEvent(new CustomEvent('telegramWebAppResume', {
        detail: {
          resumeCount: this.state.resumeCount,
          wasBackground: wasBackground,
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('[TelegramWebAppManager] Error handling app resume:', error);
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    try {
      console.log('[TelegramWebAppManager] Handling app going to background...');
      
      // Update state
      this.state.isBackground = true;
      this.state.lastActivityTime = Date.now();

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('telegramWebAppBackground', {
        detail: {
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('[TelegramWebAppManager] Error handling app background:', error);
    }
  }

  /**
   * Handle network coming online
   */
  private async handleNetworkOnline(): Promise<void> {
    try {
      console.log('[TelegramWebAppManager] Network online, checking Firebase connection...');
      
      this.state.isConnected = true;
      this.updateLastActivity();

      // Reconnect Firebase if needed
      if (!isFirebaseConnected()) {
        await reconnectFirebase();
      }

    } catch (error) {
      console.error('[TelegramWebAppManager] Error handling network online:', error);
    }
  }

  /**
   * Handle network going offline
   */
  private handleNetworkOffline(): void {
    console.log('[TelegramWebAppManager] Network offline');
    this.state.isConnected = false;
  }

  /**
   * Update last activity time
   */
  private updateLastActivity(): void {
    this.state.lastActivityTime = Date.now();
  }

  /**
   * Check connection health
   */
  private async checkConnectionHealth(): Promise<void> {
    try {
      const now = Date.now();
      const timeSinceLastActivity = now - this.state.lastActivityTime;
      
      // If no activity for more than 5 minutes, consider app might be in background
      if (timeSinceLastActivity > 300000 && !this.state.isBackground) {
        console.log('[TelegramWebAppManager] No activity detected, app might be in background');
        this.handleAppBackground();
      }

      // Check Firebase connection health
      if (!isFirebaseConnected() && !this.state.isBackground) {
        console.log('[TelegramWebAppManager] Firebase disconnected during heartbeat, reconnecting...');
        await reconnectFirebase();
      }

    } catch (error) {
      console.error('[TelegramWebAppManager] Heartbeat check failed:', error);
    }
  }

  /**
   * Schedule Firebase reconnection retry
   */
  private scheduleReconnectRetry(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        console.log('[TelegramWebAppManager] Retrying Firebase reconnection...');
        await reconnectFirebase();
        console.log('[TelegramWebAppManager] Firebase reconnection retry successful');
      } catch (error) {
        console.error('[TelegramWebAppManager] Firebase reconnection retry failed:', error);
        // Schedule another retry with exponential backoff
        this.scheduleReconnectRetry();
      }
    }, 5000);
  }

  /**
   * Get current state
   */
  public getState(): TelegramWebAppState {
    return { ...this.state };
  }

  /**
   * Manually trigger Firebase reconnection
   */
  public async reconnectFirebase(): Promise<void> {
    console.log('[TelegramWebAppManager] Manual Firebase reconnection triggered');
    return reconnectFirebase();
  }

  /**
   * Get Telegram service instance
   */
  public getTelegramService(): TelegramService | null {
    return this.telegramService;
  }

  /**
   * Check if app is ready
   */
  public isReady(): boolean {
    return this.state.isReady;
  }

  /**
   * Check if app is in background
   */
  public isInBackground(): boolean {
    return this.state.isBackground;
  }

  /**
   * Destroy the manager
   */
  public destroy(): void {
    console.log('[TelegramWebAppManager] Destroying WebApp manager...');
    
    // Clean up event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    
    // Clear intervals and timeouts
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset state
    this.state.isReady = false;
    this.state.isConnected = false;
  }
}

// Export singleton instance
export const telegramWebAppManager = TelegramWebAppManager.getInstance();

// Convenience functions
export function getTelegramWebAppState(): TelegramWebAppState {
  return telegramWebAppManager.getState();
}

export function isTelegramWebAppReady(): boolean {
  return telegramWebAppManager.isReady();
}

export function isTelegramWebAppInBackground(): boolean {
  return telegramWebAppManager.isInBackground();
}

export function reconnectTelegramFirebase(): Promise<void> {
  return telegramWebAppManager.reconnectFirebase();
}

// Auto-initialize on client-side
if (typeof window !== 'undefined') {
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    telegramWebAppManager.destroy();
  });
  
  // Expose global function for manual reconnection
  (window as any).reconnectFirebase = () => {
    return telegramWebAppManager.reconnectFirebase();
  };
}

export default telegramWebAppManager;