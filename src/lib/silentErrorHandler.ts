/**
 * Silent Error Handler for Telegram WebApp
 * 
 * This module ensures that no error messages are shown to users,
 * providing a smooth experience even when Firebase connections fail.
 * All errors are logged silently and the app continues to function.
 */

// Override console.error to prevent error popups in Telegram WebApp
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Silent error logging - no user-facing messages
export const silentLogger = {
  error: (message: string, ...args: any[]) => {
    // Log to console but don't throw or show alerts
    if (process.env.NODE_ENV === 'development') {
      originalConsoleError(`[Silent] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      originalConsoleWarn(`[Silent] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Silent] ${message}`, ...args);
    }
  }
};

// Wrap async functions to handle errors silently
export function silentAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallbackValue?: any
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      silentLogger.error('Async operation failed', error);
      return fallbackValue;
    }
  }) as T;
}

// Wrap sync functions to handle errors silently
export function silentSync<T extends (...args: any[]) => any>(
  fn: T,
  fallbackValue?: any
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      silentLogger.error('Sync operation failed', error);
      return fallbackValue;
    }
  }) as T;
}

// Firebase operation wrapper
export async function silentFirebaseOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'Firebase operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    silentLogger.warn(`${operationName} failed, using fallback`, error);
    return fallbackValue;
  }
}

// Network operation wrapper
export async function silentNetworkOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'Network operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    silentLogger.warn(`${operationName} failed (network issue), using fallback`, error);
    return fallbackValue;
  }
}

// Global error handler setup
export function setupSilentErrorHandling(): void {
  if (typeof window === 'undefined') return;

  // Override global error handlers
  window.addEventListener('error', (event) => {
    silentLogger.error('Global error caught', event.error);
    event.preventDefault(); // Prevent default error handling
  });

  window.addEventListener('unhandledrejection', (event) => {
    silentLogger.error('Unhandled promise rejection', event.reason);
    event.preventDefault(); // Prevent default rejection handling
  });

  // Override console.error to prevent Firebase error popups
  console.error = (...args: any[]) => {
    // Check if it's a Firebase error
    const message = args[0]?.toString() || '';
    if (message.includes('Firebase') || message.includes('WebSocket') || message.includes('HttpStream')) {
      silentLogger.error('Firebase error silenced', ...args);
      return;
    }
    
    // Allow other errors in development
    if (process.env.NODE_ENV === 'development') {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Firebase') || message.includes('WebSocket') || message.includes('HttpStream')) {
      silentLogger.warn('Firebase warning silenced', ...args);
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      originalConsoleWarn(...args);
    }
  };
}

// Restore original console methods (for cleanup)
export function restoreConsole(): void {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}

// Auto-setup on module load
if (typeof window !== 'undefined') {
  setupSilentErrorHandling();
}

const silentErrorHandler = {
  silentLogger,
  silentAsync,
  silentSync,
  silentFirebaseOperation,
  silentNetworkOperation,
  setupSilentErrorHandling,
  restoreConsole
};

export default silentErrorHandler;