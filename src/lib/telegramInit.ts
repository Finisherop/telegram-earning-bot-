/**
 * Telegram WebApp Initialization Helper
 * यह file Telegram WebApp को properly initialize करने के लिए है
 */

export interface TelegramWebAppInitResult {
  isReady: boolean;
  hasUser: boolean;
  user: any | null;
  error?: string;
  webApp?: any;
}

/**
 * Initialize Telegram WebApp with proper error handling
 */
export async function initializeTelegramWebApp(): Promise<TelegramWebAppInitResult> {
  console.log('[TelegramInit] Starting Telegram WebApp initialization...');
  
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return {
        isReady: false,
        hasUser: false,
        user: null,
        error: 'Not in browser environment'
      };
    }

    // Wait for Telegram script to load
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (attempts < maxAttempts) {
      if (window.Telegram?.WebApp) {
        console.log('[TelegramInit] Telegram WebApp found!');
        break;
      }
      
      console.log(`[TelegramInit] Waiting for Telegram WebApp... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.Telegram?.WebApp) {
      console.warn('[TelegramInit] Telegram WebApp not found after waiting');
      return {
        isReady: false,
        hasUser: false,
        user: null,
        error: 'Telegram WebApp not available'
      };
    }

    const webApp = window.Telegram.WebApp;
    
    // Initialize WebApp
    console.log('[TelegramInit] Calling webApp.ready()...');
    webApp.ready();
    
    // Log WebApp info
    console.log('[TelegramInit] WebApp Info:', {
      version: webApp.version,
      platform: webApp.platform,
      colorScheme: webApp.colorScheme,
      isExpanded: webApp.isExpanded,
      viewportHeight: webApp.viewportHeight,
      initData: webApp.initData ? 'Present' : 'Not present',
      initDataUnsafe: webApp.initDataUnsafe ? 'Present' : 'Not present'
    });

    // Check for user data
    let user = null;
    let hasUser = false;

    if (webApp.initDataUnsafe?.user) {
      user = webApp.initDataUnsafe.user;
      hasUser = true;
      console.log('[TelegramInit] User found in initDataUnsafe:', user);
    } else if (webApp.initData) {
      // Try to parse user from initData string
      try {
        const urlParams = new URLSearchParams(webApp.initData);
        const userParam = urlParams.get('user');
        if (userParam) {
          user = JSON.parse(decodeURIComponent(userParam));
          hasUser = true;
          console.log('[TelegramInit] User parsed from initData:', user);
        }
      } catch (parseError) {
        console.warn('[TelegramInit] Failed to parse user from initData:', parseError);
      }
    }

    if (!hasUser) {
      console.warn('[TelegramInit] No user data found in WebApp');
    }

    // Validate user data
    if (hasUser && user) {
      if (!user.id || !user.first_name || user.id <= 0) {
        console.warn('[TelegramInit] Invalid user data:', user);
        hasUser = false;
        user = null;
      } else {
        console.log('[TelegramInit] Valid user data confirmed:', {
          id: user.id,
          first_name: user.first_name,
          username: user.username
        });
      }
    }

    return {
      isReady: true,
      hasUser,
      user,
      webApp
    };

  } catch (error) {
    console.error('[TelegramInit] Initialization error:', error);
    return {
      isReady: false,
      hasUser: false,
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Wait for Telegram WebApp to be ready with timeout
 */
export function waitForTelegramWebApp(timeoutMs: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        console.log('[TelegramInit] WebApp ready!');
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        console.warn('[TelegramInit] Timeout waiting for WebApp');
        resolve(false);
        return;
      }
      
      setTimeout(checkTelegram, 100);
    };
    
    checkTelegram();
  });
}

/**
 * Debug function to log all available Telegram data
 */
export function debugTelegramWebApp(): void {
  console.log('[TelegramInit] === TELEGRAM WEBAPP DEBUG INFO ===');
  
  if (typeof window === 'undefined') {
    console.log('[TelegramInit] Not in browser environment');
    return;
  }

  console.log('[TelegramInit] Window.Telegram available:', !!window.Telegram);
  
  if (window.Telegram) {
    console.log('[TelegramInit] WebApp available:', !!window.Telegram.WebApp);
    
    if (window.Telegram.WebApp) {
      const wa = window.Telegram.WebApp;
      console.log('[TelegramInit] WebApp properties:', {
        version: wa.version,
        platform: wa.platform,
        colorScheme: wa.colorScheme,
        themeParams: wa.themeParams,
        isExpanded: wa.isExpanded,
        viewportHeight: wa.viewportHeight,
        viewportStableHeight: wa.viewportStableHeight,
        headerColor: wa.headerColor,
        backgroundColor: wa.backgroundColor,
        initData: wa.initData ? `Length: ${wa.initData.length}` : 'Not present',
        initDataUnsafe: wa.initDataUnsafe
      });
      
      if (wa.initData) {
        console.log('[TelegramInit] InitData content:', wa.initData);
        try {
          const params = new URLSearchParams(wa.initData);
          console.log('[TelegramInit] Parsed initData params:', Object.fromEntries(params));
        } catch (e) {
          console.warn('[TelegramInit] Failed to parse initData as URLParams');
        }
      }
    }
  }
  
  console.log('[TelegramInit] === END DEBUG INFO ===');
}

// Auto-debug in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Wait a bit for everything to load, then debug
  setTimeout(() => {
    debugTelegramWebApp();
  }, 2000);
}