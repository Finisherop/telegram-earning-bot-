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
 * Get Telegram user data directly from WebApp SDK with enhanced validation
 */
export function getTelegramUser(): TelegramUser | null {
  console.log('[TelegramUser] Getting Telegram user data...');
  
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('[TelegramUser] Not in browser environment');
      return null;
    }

    // Wait for Telegram WebApp to be ready
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      console.log('[TelegramUser] Telegram WebApp found, version:', tg.version);
      console.log('[TelegramUser] Platform:', tg.platform);
      console.log('[TelegramUser] InitDataUnsafe available:', !!tg.initDataUnsafe);
      
      // Method 1: Try initDataUnsafe.user
      if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        console.log('[TelegramUser] Raw user from initDataUnsafe:', user);
        
        if (user.id && user.first_name && Number(user.id) > 0) {
          const telegramUser = {
            id: Number(user.id),
            first_name: String(user.first_name).trim(),
            last_name: user.last_name ? String(user.last_name).trim() : '',
            username: user.username ? String(user.username).trim() : '',
            photo_url: user.photo_url ? String(user.photo_url) : undefined,
            language_code: user.language_code ? String(user.language_code) : 'en',
            is_premium: Boolean(user.is_premium)
          };
          
          console.log('[TelegramUser] Successfully parsed user:', telegramUser);
          return telegramUser;
        } else {
          console.warn('[TelegramUser] Invalid user data in initDataUnsafe:', user);
        }
      }
      
      // Method 2: Try parsing initData string
      if (tg.initData && tg.initData.length > 0) {
        console.log('[TelegramUser] Trying to parse initData string...');
        try {
          const urlParams = new URLSearchParams(tg.initData);
          const userParam = urlParams.get('user');
          
          if (userParam) {
            const decodedUser = decodeURIComponent(userParam);
            console.log('[TelegramUser] Decoded user param:', decodedUser);
            
            const parsedUser = JSON.parse(decodedUser);
            console.log('[TelegramUser] Parsed user from initData:', parsedUser);
            
            if (parsedUser.id && parsedUser.first_name && Number(parsedUser.id) > 0) {
              const telegramUser = {
                id: Number(parsedUser.id),
                first_name: String(parsedUser.first_name).trim(),
                last_name: parsedUser.last_name ? String(parsedUser.last_name).trim() : '',
                username: parsedUser.username ? String(parsedUser.username).trim() : '',
                photo_url: parsedUser.photo_url ? String(parsedUser.photo_url) : undefined,
                language_code: parsedUser.language_code ? String(parsedUser.language_code) : 'en',
                is_premium: Boolean(parsedUser.is_premium)
              };
              
              console.log('[TelegramUser] Successfully parsed user from initData:', telegramUser);
              return telegramUser;
            }
          }
        } catch (parseError) {
          console.warn('[TelegramUser] Failed to parse initData:', parseError);
        }
      }
      
      console.warn('[TelegramUser] No valid user data found in Telegram WebApp');
    } else {
      console.log('[TelegramUser] Telegram WebApp not available, using fallback');
    }
    
    // Enhanced fallback for browser testing
    console.log('[TelegramUser] Creating fallback user for testing...');
    
    let testUserId: number;
    let testUsername: string;
    
    // Try to get consistent test user from localStorage
    const storedTestUser = localStorage.getItem('testTelegramUser');
    if (storedTestUser) {
      try {
        const parsed = JSON.parse(storedTestUser);
        if (parsed.id && parsed.first_name) {
          console.log('[TelegramUser] Using stored test user:', parsed);
          return parsed;
        }
      } catch (e) {
        console.warn('[TelegramUser] Failed to parse stored test user');
      }
    }
    
    // Create new test user
    testUserId = Math.floor(Math.random() * 900000) + 100000; // 6-digit number
    testUsername = `testuser${testUserId}`;
    
    const fallbackUser: TelegramUser = {
      id: testUserId,
      first_name: 'Test User',
      last_name: 'Browser',
      username: testUsername,
      language_code: 'en',
      is_premium: false
    };
    
    // Store for consistency
    localStorage.setItem('testTelegramUser', JSON.stringify(fallbackUser));
    
    console.log('[TelegramUser] Created fallback user:', fallbackUser);
    return fallbackUser;
    
  } catch (error) {
    console.error('[TelegramUser] Error getting Telegram user:', error);
    
    // Emergency fallback
    const emergencyId = Date.now() % 1000000; // Keep it reasonable
    const emergencyUser: TelegramUser = {
      id: emergencyId,
      first_name: 'Emergency User',
      last_name: '',
      username: `emergency${emergencyId}`,
      language_code: 'en',
      is_premium: false
    };
    
    console.log('[TelegramUser] Emergency fallback user:', emergencyUser);
    return emergencyUser;
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