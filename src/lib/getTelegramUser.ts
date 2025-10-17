/**
 * Utility to get Telegram user data
 * 
 * Provides a simple way to access cached Telegram user data
 * that was synced by the TelegramUserSync module
 */

interface CachedUser {
  userId: string;
  name: string;
  profileUrl: string;
  lastCached: number;
}

interface TelegramUserData {
  userId: string;
  name: string;
  profileUrl: string;
  isFromCache: boolean;
}

/**
 * Get cached Telegram user data from localStorage
 */
export const getCachedTelegramUser = (): TelegramUserData | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Try to get current Telegram user ID
    const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (!telegramUser?.id) {
      return null;
    }

    const userId = telegramUser.id.toString();
    const cached = localStorage.getItem(`user_${userId}`);
    
    if (cached) {
      const user = JSON.parse(cached) as CachedUser;
      
      // Check if cache is still valid (24 hours)
      if (Date.now() - user.lastCached < 24 * 60 * 60 * 1000) {
        return {
          userId: user.userId,
          name: user.name,
          profileUrl: user.profileUrl,
          isFromCache: true
        };
      } else {
        // Remove expired cache
        localStorage.removeItem(`user_${userId}`);
      }
    }
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.error('[getTelegramUser] Error reading cached user:', error);
    }
  }

  return null;
};

/**
 * Get current Telegram user data (live from WebApp)
 */
export const getCurrentTelegramUser = (): TelegramUserData | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    
    if (telegramUser?.id) {
      const name = telegramUser.last_name 
        ? `${telegramUser.first_name} ${telegramUser.last_name}`.trim()
        : telegramUser.first_name;

      return {
        userId: telegramUser.id.toString(),
        name,
        profileUrl: telegramUser.photo_url || '',
        isFromCache: false
      };
    }
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.error('[getTelegramUser] Error reading current user:', error);
    }
  }

  return null;
};

/**
 * Get Telegram user data (cached first, then live)
 */
export const getTelegramUser = (): TelegramUserData | null => {
  // Try cached first for performance
  const cached = getCachedTelegramUser();
  if (cached) {
    return cached;
  }

  // Fall back to live data
  return getCurrentTelegramUser();
};

/**
 * Check if running in Telegram Mini WebApp environment
 */
export const isTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return !!(window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  } catch {
    return false;
  }
};

export default getTelegramUser;