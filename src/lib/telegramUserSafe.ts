/**
 * Safe Telegram WebApp User Capture Utility
 * 
 * Provides safe access to Telegram WebApp user data with proper fallbacks
 * and sanitization to prevent undefined values in Firebase operations.
 */

export interface SafeTelegramUser {
  id: number | null;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  language_code: string;
  is_premium: boolean;
  source: 'telegram' | 'browser';
  capturedAt: string;
}

/**
 * Safely captures Telegram WebApp user data with proper null/undefined handling
 * Always returns a valid user object with sanitized fields (no undefined values)
 * 
 * @returns SafeTelegramUser object with guaranteed no undefined fields
 */
export function getTelegramUserSafe(): SafeTelegramUser {
  // Check if running in Telegram WebApp environment
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    try {
      const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
      
      if (tgUser && tgUser.id && typeof tgUser.id === 'number' && tgUser.id > 0) {
        return {
          id: tgUser.id,
          username: tgUser.username ?? '',
          first_name: tgUser.first_name ?? 'Telegram User',
          last_name: tgUser.last_name ?? '',
          photo_url: tgUser.photo_url ?? '',
          language_code: tgUser.language_code ?? 'en',
          is_premium: tgUser.is_premium ?? false,
          source: 'telegram',
          capturedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn('[getTelegramUserSafe] Error accessing Telegram user data:', error);
    }
  }
  
  // Browser fallback - create a safe anonymous user
  return createBrowserFallbackUser();
}

/**
 * Creates a browser fallback user with safe defaults
 */
function createBrowserFallbackUser(): SafeTelegramUser {
  // Generate consistent browser user ID
  let browserId = 'browser_user';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('browser_user_id');
      if (stored) {
        browserId = stored;
      } else {
        browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('browser_user_id', browserId);
      }
    } catch (error) {
      console.warn('[getTelegramUserSafe] localStorage not available:', error);
      browserId = `browser_${Date.now()}`;
    }
  }
  
  // Get user preferences from localStorage if available
  let firstName = 'Browser User';
  let username = 'browseruser';
  
  if (typeof window !== 'undefined') {
    try {
      const storedName = localStorage.getItem('browser_user_name');
      const storedUsername = localStorage.getItem('browser_user_username');
      
      if (storedName && storedName.trim()) {
        firstName = storedName.trim();
      }
      if (storedUsername && storedUsername.trim()) {
        username = storedUsername.trim();
      }
    } catch (error) {
      console.warn('[getTelegramUserSafe] Error reading user preferences:', error);
    }
  }
  
  return {
    id: null, // Browser users don't have Telegram IDs
    username: username,
    first_name: firstName,
    last_name: '',
    photo_url: '',
    language_code: 'en',
    is_premium: false,
    source: 'browser',
    capturedAt: new Date().toISOString()
  };
}

/**
 * Sanitizes user data for Firebase operations
 * Ensures no undefined values that could cause Firebase errors
 */
export function sanitizeUserForFirebase(user: SafeTelegramUser): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  // Convert all values to safe Firebase types
  for (const [key, value] of Object.entries(user)) {
    if (value === null) {
      sanitized[key] = null;
    } else if (value === undefined) {
      // Convert undefined to appropriate defaults
      switch (key) {
        case 'id':
          sanitized[key] = null;
          break;
        case 'is_premium':
          sanitized[key] = false;
          break;
        default:
          sanitized[key] = '';
      }
    } else if (typeof value === 'string') {
      sanitized[key] = value.trim(); // Trim strings
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Gets the user ID as a string for Firebase operations
 * Returns null if user has no valid ID
 */
export function getUserIdForFirebase(user: SafeTelegramUser): string | null {
  if (user.id !== null && user.id > 0) {
    return user.id.toString();
  }
  
  // For browser users, use username or create a consistent ID
  if (user.source === 'browser' && user.username) {
    return `browser_${user.username}`;
  }
  
  return null;
}

/**
 * Checks if the user has a valid Telegram ID for Firebase operations
 */
export function isValidTelegramUser(user: SafeTelegramUser): boolean {
  return user.source === 'telegram' && user.id !== null && user.id > 0;
}

/**
 * Gets referral parameter safely from Telegram WebApp or URL
 */
export function getReferralParamSafe(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    // Check Telegram WebApp start param
    if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      return window.Telegram.WebApp.initDataUnsafe.start_param;
    }
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const referralSources = ['start', 'ref', 'referral', 'tgWebAppStartParam'];
    
    for (const param of referralSources) {
      const value = urlParams.get(param);
      if (value && value.trim()) {
        return value.trim();
      }
    }
  } catch (error) {
    console.warn('[getReferralParamSafe] Error getting referral param:', error);
  }
  
  return null;
}

/**
 * Global user data access (with caching)
 */
let cachedUser: SafeTelegramUser | null = null;
let lastCaptureTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export function getCachedTelegramUser(): SafeTelegramUser {
  const now = Date.now();
  
  // Return cached user if still valid
  if (cachedUser && (now - lastCaptureTime) < CACHE_DURATION) {
    return cachedUser;
  }
  
  // Capture fresh user data
  cachedUser = getTelegramUserSafe();
  lastCaptureTime = now;
  
  return cachedUser;
}

/**
 * Force refresh cached user data
 */
export function refreshTelegramUser(): SafeTelegramUser {
  cachedUser = null;
  return getCachedTelegramUser();
}