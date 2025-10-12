/**
 * Silent Notification System
 * 
 * Replaces all toast messages, alerts, and popups with silent logging.
 * Provides a consistent interface for notifications without user-facing messages.
 */

interface NotificationOptions {
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  action?: string;
  data?: any;
}

class SilentNotificationManager {
  private logs: Array<{
    id: string;
    message: string;
    type: string;
    timestamp: number;
    action?: string;
    data?: any;
  }> = [];

  private maxLogs = 100;

  /**
   * Success notification (replaces toast.success)
   */
  public success(message: string, options?: NotificationOptions): void {
    this.log(message, 'success', options);
  }

  /**
   * Error notification (replaces toast.error)
   */
  public error(message: string, options?: NotificationOptions): void {
    this.log(message, 'error', options);
    
    // Only log critical errors to console
    if (options?.action === 'critical') {
      console.warn(`[Silent] ${message}`, options?.data);
    }
  }

  /**
   * Warning notification (replaces toast.warning)
   */
  public warning(message: string, options?: NotificationOptions): void {
    this.log(message, 'warning', options);
  }

  /**
   * Info notification (replaces toast.info)
   */
  public info(message: string, options?: NotificationOptions): void {
    this.log(message, 'info', options);
  }

  /**
   * Loading notification (replaces toast.loading)
   */
  public loading(message: string, options?: NotificationOptions): string {
    const id = this.generateId();
    this.log(message, 'loading', { ...options, action: 'loading' });
    return id;
  }

  /**
   * Dismiss notification (replaces toast.dismiss)
   */
  public dismiss(id?: string): void {
    if (id) {
      this.log(`Dismissed: ${id}`, 'dismiss');
    }
  }

  /**
   * Promise notification (replaces toast.promise)
   */
  public promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> {
    this.loading(messages.loading);
    
    return promise
      .then((result) => {
        this.success(messages.success);
        return result;
      })
      .catch((error) => {
        this.error(messages.error, { data: error });
        throw error;
      });
  }

  /**
   * Confirm dialog replacement (silent approval)
   */
  public confirm(message: string, options?: { 
    onConfirm?: () => void;
    onCancel?: () => void;
    autoConfirm?: boolean;
  }): boolean {
    this.log(`Confirm: ${message}`, 'confirm');
    
    // Auto-confirm for silent operation
    if (options?.autoConfirm !== false) {
      options?.onConfirm?.();
      return true;
    }
    
    return false;
  }

  /**
   * Alert replacement (silent logging)
   */
  public alert(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.log(`Alert: ${message}`, type);
  }

  /**
   * Get recent logs for debugging
   */
  public getLogs(limit?: number): typeof this.logs {
    const logs = [...this.logs].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Private logging method
   */
  private log(message: string, type: string, options?: NotificationOptions): void {
    const logEntry = {
      id: this.generateId(),
      message,
      type,
      timestamp: Date.now(),
      action: options?.action,
      data: options?.data
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Optional: Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        const recentLogs = this.logs.slice(-20); // Keep last 20 logs
        localStorage.setItem('silent_notifications', JSON.stringify(recentLogs));
      } catch (error) {
        // Silent fail
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load logs from localStorage
   */
  public loadPersistedLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('silent_notifications');
        if (stored) {
          const logs = JSON.parse(stored);
          this.logs = Array.isArray(logs) ? logs : [];
        }
      } catch (error) {
        // Silent fail
      }
    }
  }
}

// Singleton instance
export const silentNotifications = new SilentNotificationManager();

// Load persisted logs on initialization
if (typeof window !== 'undefined') {
  silentNotifications.loadPersistedLogs();
}

// Export individual functions for easy replacement
export const toast = {
  success: (message: string, options?: NotificationOptions) => silentNotifications.success(message, options),
  error: (message: string, options?: NotificationOptions) => silentNotifications.error(message, options),
  warning: (message: string, options?: NotificationOptions) => silentNotifications.warning(message, options),
  info: (message: string, options?: NotificationOptions) => silentNotifications.info(message, options),
  loading: (message: string, options?: NotificationOptions) => silentNotifications.loading(message, options),
  dismiss: (id?: string) => silentNotifications.dismiss(id),
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => 
    silentNotifications.promise(promise, messages)
};

export const alert = (message: string, type?: 'info' | 'warning' | 'error') => 
  silentNotifications.alert(message, type);

export const confirm = (message: string, options?: { 
  onConfirm?: () => void;
  onCancel?: () => void;
  autoConfirm?: boolean;
}) => silentNotifications.confirm(message, options);

export default silentNotifications;