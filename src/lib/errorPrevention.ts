/**
 * Comprehensive Error Prevention Service
 * 
 * Provides utilities to prevent undefined field values, permission errors,
 * and other common Firebase/Telegram integration issues.
 */

import { User } from '@/types';

/**
 * Firebase field value sanitizer
 * Removes undefined values and converts problematic types
 */
export function sanitizeForFirebase(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirebase(item)).filter(item => item !== undefined);
  }
  
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue; // Skip undefined values entirely
      }
      
      if (value === null) {
        sanitized[key] = null;
      } else if (typeof value === 'string') {
        sanitized[key] = value.trim() || null; // Empty strings become null
      } else if (typeof value === 'number') {
        sanitized[key] = isNaN(value) ? 0 : value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeForFirebase(value);
      } else {
        // Convert other types to string
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }
  
  if (typeof data === 'string') {
    return data.trim() || null;
  }
  
  if (typeof data === 'number') {
    return isNaN(data) ? 0 : data;
  }
  
  if (typeof data === 'boolean') {
    return data;
  }
  
  // Convert other types to string
  return String(data);
}

/**
 * Validates and sanitizes user ID
 */
export function sanitizeUserId(userId: any): string | null {
  if (!userId) {
    return null;
  }
  
  const stringId = String(userId).trim();
  
  if (stringId === '' || stringId === 'undefined' || stringId === 'null') {
    return null;
  }
  
  return stringId;
}

/**
 * Creates a default User object with safe values
 */
export function createDefaultUser(userId: string, telegramData?: any): User {
  const now = new Date();
  
  return {
    id: userId,
    telegramId: userId,
    username: telegramData?.username || null,
    firstName: telegramData?.first_name || 'User',
    lastName: telegramData?.last_name || null,
    profilePic: telegramData?.photo_url || null,
    languageCode: telegramData?.language_code || 'en',
    isPremium: telegramData?.is_premium || false,
    
    // Game data with safe defaults
    coins: 0,
    xp: 0,
    level: 1,
    
    // VIP data with safe defaults
    vipTier: 'free',
    farmingMultiplier: 1,
    referralMultiplier: 1,
    adsLimitPerDay: 5,
    withdrawalLimit: 1000,
    minWithdrawal: 100,
    vipEndTime: null,
    
    // Referral data
    referrerId: null,
    referralCount: 0,
    referralEarnings: 0,
    
    // Game state
    dailyStreak: 0,
    farmingStartTime: null,
    farmingEndTime: null,
    lastClaimDate: null,
    
    // Metadata
    source: 'telegram',
    createdAt: now,
    updatedAt: now,
    capturedAt: now
  };
}

/**
 * Validates user data and fills missing fields with safe defaults
 */
export function sanitizeUserData(userData: Partial<User>, userId: string): User {
  const defaultUser = createDefaultUser(userId);
  
  return {
    ...defaultUser,
    ...userData,
    // Always ensure these critical fields are safe
    id: userId,
    telegramId: userId,
    coins: userData.coins ?? 0,
    xp: userData.xp ?? 0,
    level: userData.level ?? 1,
    dailyStreak: userData.dailyStreak ?? 0,
    referralCount: userData.referralCount ?? 0,
    referralEarnings: userData.referralEarnings ?? 0,
    farmingMultiplier: userData.farmingMultiplier ?? 1,
    referralMultiplier: userData.referralMultiplier ?? 1,
    adsLimitPerDay: userData.adsLimitPerDay ?? 5,
    withdrawalLimit: userData.withdrawalLimit ?? 1000,
    minWithdrawal: userData.minWithdrawal ?? 100,
    vipTier: userData.vipTier ?? 'free',
    firstName: userData.firstName || 'User',
    languageCode: userData.languageCode || 'en',
    isPremium: userData.isPremium ?? false,
    source: userData.source ?? 'telegram',
    updatedAt: new Date() // Always update timestamp
  };
}

/**
 * Safe number operations to prevent NaN and undefined errors
 */
export class SafeMath {
  static add(a: any, b: any): number {
    const numA = this.toNumber(a);
    const numB = this.toNumber(b);
    return numA + numB;
  }
  
  static subtract(a: any, b: any): number {
    const numA = this.toNumber(a);
    const numB = this.toNumber(b);
    return Math.max(0, numA - numB); // Prevent negative values for things like coins
  }
  
  static multiply(a: any, b: any): number {
    const numA = this.toNumber(a);
    const numB = this.toNumber(b);
    return numA * numB;
  }
  
  static toNumber(value: any): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }
  
  static ensurePositive(value: any): number {
    return Math.max(0, this.toNumber(value));
  }
}

/**
 * Firebase error handler with user-friendly messages
 */
export class FirebaseErrorHandler {
  static getErrorMessage(error: any): string {
    if (!error) {
      return 'Unknown error occurred';
    }
    
    const errorCode = error.code || error.message || error;
    
    // Firebase Auth errors
    if (errorCode.includes('permission-denied')) {
      return 'Access denied. Please check your permissions.';
    }
    
    if (errorCode.includes('not-found')) {
      return 'Data not found. It may have been deleted or moved.';
    }
    
    if (errorCode.includes('unavailable')) {
      return 'Service temporarily unavailable. Please try again.';
    }
    
    if (errorCode.includes('invalid-argument')) {
      return 'Invalid data provided. Please check your input.';
    }
    
    if (errorCode.includes('deadline-exceeded')) {
      return 'Request timeout. Please check your connection.';
    }
    
    if (errorCode.includes('already-exists')) {
      return 'This data already exists.';
    }
    
    if (errorCode.includes('resource-exhausted')) {
      return 'Service limits exceeded. Please try again later.';
    }
    
    if (errorCode.includes('failed-precondition')) {
      return 'Operation failed. Please refresh and try again.';
    }
    
    if (errorCode.includes('unauthenticated')) {
      return 'Authentication required. Please log in.';
    }
    
    if (errorCode.includes('out-of-range')) {
      return 'Value out of acceptable range.';
    }
    
    // Telegram specific errors
    if (errorCode.includes('telegram')) {
      return 'Telegram connection error. Please refresh the app.';
    }
    
    // Generic network errors
    if (errorCode.includes('network') || errorCode.includes('offline')) {
      return 'Network error. Please check your internet connection.';
    }
    
    // Return the original error message if no match found
    return error.message || String(errorCode);
  }
  
  static logError(operation: string, error: any, context?: any): void {
    console.error(`[${operation}] Error:`, {
      error: error.message || error,
      code: error.code,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
    });
  }
  
  static handleFirebaseError(operation: string, error: any, context?: any): {
    success: false;
    error: string;
    code?: string;
  } {
    this.logError(operation, error, context);
    
    return {
      success: false,
      error: this.getErrorMessage(error),
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Safe async operation wrapper
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  defaultValue: T
): Promise<T> {
  try {
    console.log(`[SafeAsync] Starting ${operationName}...`);
    const result = await operation();
    console.log(`[SafeAsync] ${operationName} completed successfully`);
    return result;
  } catch (error) {
    console.error(`[SafeAsync] ${operationName} failed:`, error);
    FirebaseErrorHandler.logError(operationName, error);
    return defaultValue;
  }
}

/**
 * Validates Firebase write operations before execution
 */
export function validateFirebaseWrite(data: any): { 
  isValid: boolean; 
  errors: string[]; 
  sanitizedData?: any; 
} {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return { isValid: false, errors };
  }
  
  // Check for undefined values
  const checkForUndefined = (obj: any, path: string = ''): void => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value === undefined) {
        errors.push(`Undefined value at ${currentPath}`);
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        checkForUndefined(value, currentPath);
      }
    }
  };
  
  checkForUndefined(data);
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Sanitize the data
  const sanitizedData = sanitizeForFirebase(data);
  
  return {
    isValid: true,
    errors: [],
    sanitizedData
  };
}

/**
 * Environment-aware configuration
 */
export class EnvConfig {
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
  
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
  
  static getFirebaseConfig(): any {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
  }
  
  static validateEnvironment(): { isValid: boolean; missingVars: string[] } {
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const value = process.env[varName];
      return !value || value === 'undefined' || value === '';
    });
    
    return {
      isValid: missingVars.length === 0,
      missingVars
    };
  }
}

/**
 * Retry mechanism for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }
  
  throw lastError;
}

/**
 * Global error boundary for React components
 */
export function createErrorBoundary(componentName: string) {
  return (error: Error, errorInfo: any) => {
    console.error(`[ErrorBoundary] ${componentName} error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
    
    // Log to external service in production
    if (EnvConfig.isProduction()) {
      // Add your error reporting service here
      // Example: Sentry, LogRocket, etc.
    }
  };
}

/**
 * Debounced function to prevent excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Rate limiter to prevent API abuse
 */
export class RateLimiter {
  private static instances = new Map<string, RateLimiter>();
  private calls: number[] = [];
  
  constructor(
    private maxCalls: number,
    private windowMs: number
  ) {}
  
  static getInstance(key: string, maxCalls: number = 10, windowMs: number = 60000): RateLimiter {
    if (!this.instances.has(key)) {
      this.instances.set(key, new RateLimiter(maxCalls, windowMs));
    }
    return this.instances.get(key)!;
  }
  
  isAllowed(): boolean {
    const now = Date.now();
    
    // Remove calls outside the window
    this.calls = this.calls.filter(callTime => now - callTime < this.windowMs);
    
    if (this.calls.length >= this.maxCalls) {
      return false;
    }
    
    this.calls.push(now);
    return true;
  }
  
  getTimeUntilReset(): number {
    if (this.calls.length === 0) {
      return 0;
    }
    
    const oldestCall = Math.min(...this.calls);
    return Math.max(0, this.windowMs - (Date.now() - oldestCall));
  }
}