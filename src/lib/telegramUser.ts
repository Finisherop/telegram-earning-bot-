// Simple Telegram user interface matching the hook
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

// User data interface for compatibility
export interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Get Telegram user data directly from WebApp SDK
 */
export function getTelegramUser(): TelegramUser | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user;
      if (user.id && user.first_name) {
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name || '',
          username: user.username || '',
          photo_url: user.photo_url,
          language_code: user.language_code || 'en',
          is_premium: user.is_premium || false
        };
      }
    }
    
    // Fallback for browser testing
    const browserId = localStorage.getItem('browserId') || `browser_${Date.now()}`;
    localStorage.setItem('browserId', browserId);
    
    return {
      id: parseInt(browserId.replace('browser_', '')) || Date.now(),
      first_name: 'Browser User',
      last_name: '',
      username: 'browseruser',
      language_code: 'en',
      is_premium: false
    };
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
  }
}

/**
 * Convert Telegram user to UserData format
 */
export function sanitizeUserData(telegramUser: TelegramUser): UserData {
  return {
    id: telegramUser.id,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name,
    username: telegramUser.username,
    photo_url: telegramUser.photo_url,
    language_code: telegramUser.language_code,
    is_premium: telegramUser.is_premium
  };
}

/**
 * Initialize Telegram user (simplified)
 */
export async function initializeTelegramUser(): Promise<UserData | null> {
  const telegramUser = getTelegramUser();
  return telegramUser ? sanitizeUserData(telegramUser) : null;
}

/**
 * Update last seen (no-op for compatibility)
 */
export async function updateLastSeen(userId: number): Promise<boolean> {
  console.log(`[TelegramUser] Last seen updated for user: ${userId}`);
  return true;
}

/**
 * Save user to Firebase (handled by Firebase service)
 */
export async function saveUserToFirebase(userData: UserData): Promise<boolean> {
  console.log(`[TelegramUser] User data would be saved to Firebase: ${userData.id}`);
  return true;
}