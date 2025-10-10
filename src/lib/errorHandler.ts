// Global error handling utility for the Telegram Mini App

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: any;
  context?: any;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  userAgent: string;
  url: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private isOnline: boolean = true;

  private constructor() {
    this.setupGlobalHandlers();
    this.setupNetworkListener();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers() {
    // Only setup handlers on client side
    if (typeof window === 'undefined') return;

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Error Handler] Unhandled promise rejection:', event.reason);
      this.logError(
        new Error(event.reason || 'Unhandled promise rejection'),
        { component: 'Global', action: 'unhandledrejection' }
      );
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('[Error Handler] JavaScript error:', event.error);
      this.logError(
        event.error || new Error(event.message),
        { component: 'Global', action: 'javascript_error' }
      );
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        console.error('[Error Handler] Resource loading error:', event.target);
        this.logError(
          new Error(`Failed to load resource: ${(event.target as any).src || (event.target as any).href}`),
          { component: 'Global', action: 'resource_error' }
        );
      }
    }, true);
  }

  private setupNetworkListener() {
    // Only setup listeners on client side
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[Error Handler] Network back online, processing queued errors');
      this.isOnline = true;
      this.processErrorQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[Error Handler] Network offline, queueing errors');
      this.isOnline = false;
    });
  }

  logError(error: Error, context: ErrorContext = {}): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorReport: ErrorReport = {
      id: errorId,
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server',
    };

    // Log to console with detailed information
    console.error('[Error Handler] Error logged:', {
      ...errorReport,
      error: error,
    });

    // Add to queue for potential remote logging
    this.errorQueue.push(errorReport);

    // Try to process queue if online
    if (this.isOnline) {
      this.processErrorQueue();
    }

    // Store in localStorage for persistence (client-side only)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const storedErrors = JSON.parse(localStorage.getItem('telegram_app_errors') || '[]');
        storedErrors.push(errorReport);
        
        // Keep only last 50 errors
        if (storedErrors.length > 50) {
          storedErrors.splice(0, storedErrors.length - 50);
        }
        
        localStorage.setItem('telegram_app_errors', JSON.stringify(storedErrors));
      } catch (storageError) {
        console.warn('[Error Handler] Failed to store error in localStorage:', storageError);
      }
    }

    return errorId;
  }

  private async processErrorQueue() {
    if (this.errorQueue.length === 0) return;

    // In a real app, you would send these to your error reporting service
    // For now, we'll just log them and clear the queue
    console.log('[Error Handler] Processing error queue:', this.errorQueue.length, 'errors');
    
    // Simulate sending to error reporting service
    try {
      // Example: await sendErrorsToService(this.errorQueue);
      console.log('[Error Handler] Errors would be sent to reporting service:', this.errorQueue);
      this.errorQueue = []; // Clear queue after successful processing
    } catch (error) {
      console.error('[Error Handler] Failed to process error queue:', error);
      // Keep errors in queue for retry
    }
  }

  // Utility method for Firebase errors
  logFirebaseError(error: any, operation: string, context: ErrorContext = {}) {
    const enhancedContext = {
      ...context,
      component: 'Firebase',
      action: operation,
      firebaseCode: error.code,
      firebaseMessage: error.message,
    };

    return this.logError(
      new Error(`Firebase ${operation} failed: ${error.message || error}`),
      enhancedContext
    );
  }

  // Utility method for API errors
  logApiError(error: any, endpoint: string, context: ErrorContext = {}) {
    const enhancedContext = {
      ...context,
      component: 'API',
      action: endpoint,
      status: error.status,
      statusText: error.statusText,
    };

    return this.logError(
      new Error(`API call to ${endpoint} failed: ${error.message || error}`),
      enhancedContext
    );
  }

  // Utility method for user action errors
  logUserActionError(error: any, action: string, userId?: string, context: ErrorContext = {}) {
    const enhancedContext = {
      ...context,
      component: 'UserAction',
      action,
      userId,
    };

    return this.logError(
      new Error(`User action ${action} failed: ${error.message || error}`),
      enhancedContext
    );
  }

  // Get stored errors for debugging
  getStoredErrors(): ErrorReport[] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    try {
      return JSON.parse(localStorage.getItem('telegram_app_errors') || '[]');
    } catch (error) {
      console.warn('[Error Handler] Failed to retrieve stored errors:', error);
      return [];
    }
  }

  // Clear stored errors
  clearStoredErrors() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem('telegram_app_errors');
      console.log('[Error Handler] Stored errors cleared');
    } catch (error) {
      console.warn('[Error Handler] Failed to clear stored errors:', error);
    }
  }

  // Get error statistics
  getErrorStats() {
    const errors = this.getStoredErrors();
    const stats = {
      total: errors.length,
      byComponent: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
      recent: errors.filter(e => 
        new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length,
    };

    errors.forEach(error => {
      const component = error.context.component || 'Unknown';
      const action = error.context.action || 'Unknown';
      
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
      stats.byAction[action] = (stats.byAction[action] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export utility functions for easy use
export const logError = (error: Error, context?: ErrorContext) => 
  errorHandler.logError(error, context);

export const logFirebaseError = (error: any, operation: string, context?: ErrorContext) =>
  errorHandler.logFirebaseError(error, operation, context);

export const logApiError = (error: any, endpoint: string, context?: ErrorContext) =>
  errorHandler.logApiError(error, endpoint, context);

export const logUserActionError = (error: any, action: string, userId?: string, context?: ErrorContext) =>
  errorHandler.logUserActionError(error, action, userId, context);

// React hook for error handling
export const useErrorHandler = () => {
  return {
    logError: (error: Error, context?: ErrorContext) => errorHandler.logError(error, context),
    logFirebaseError: (error: any, operation: string, context?: ErrorContext) =>
      errorHandler.logFirebaseError(error, operation, context),
    logApiError: (error: any, endpoint: string, context?: ErrorContext) =>
      errorHandler.logApiError(error, endpoint, context),
    logUserActionError: (error: any, action: string, userId?: string, context?: ErrorContext) =>
      errorHandler.logUserActionError(error, action, userId, context),
    getErrorStats: () => errorHandler.getErrorStats(),
    clearStoredErrors: () => errorHandler.clearStoredErrors(),
  };
};