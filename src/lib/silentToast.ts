/**
 * Silent Toast Wrapper for Telegram WebApp
 * 
 * This module replaces all toast.error and toast.warning calls with silent logging,
 * ensuring no error messages are shown to users in Telegram WebApp.
 */

import { silentLogger } from './silentErrorHandler';

// Silent toast replacement functions
export const silentToast = {
  error: (message: string, ...args: any[]) => {
    silentLogger.error(`Toast Error: ${message}`, ...args);
  },
  
  warning: (message: string, ...args: any[]) => {
    silentLogger.warn(`Toast Warning: ${message}`, ...args);
  },
  
  success: (message: string, ...args: any[]) => {
    // Allow success messages in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Toast Success: ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    silentLogger.info(`Toast Info: ${message}`, ...args);
  }
};

// Override toast methods globally
export function overrideToastMethods(): void {
  if (typeof window === 'undefined') return;

  // Wait for toast library to load
  setTimeout(() => {
    try {
      // Try to import and override react-hot-toast
      import('react-hot-toast').then((toast) => {
        // Store original method
        const originalError = toast.default.error;
        
        // Override error method to silence it
        (toast.default as any).error = (message: any, options?: any) => {
          silentLogger.error(`Toast Error Silenced: ${String(message)}`);
          // Return empty string instead of showing toast
          return '';
        };
        
        // Keep success and info for positive feedback
        // toast.default.success and toast.default remain unchanged
        
      }).catch(() => {
        // Toast library not available, that's fine
        silentLogger.info('Toast library not available');
      });
    } catch (error) {
      // Silent fail
      silentLogger.warn('Failed to override toast methods');
    }
  }, 1000);
}

// Auto-setup
if (typeof window !== 'undefined') {
  overrideToastMethods();
}

export default silentToast;