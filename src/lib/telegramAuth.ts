import { useState, useEffect, useCallback } from 'react';
import { signInWithCustomToken, Auth } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Telegram Authentication Helper
 * 
 * Provides seamless authentication for Telegram users using Firebase custom tokens.
 * No manual login required - uses Telegram WebApp user data automatically.
 */

export interface TelegramAuthResult {
  success: boolean;
  user?: any;
  uid?: string;
  error?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Authenticates a Telegram user with Firebase using custom tokens
 * 
 * @param telegramUser - Telegram user object from WebApp
 * @returns Promise with authentication result
 */
export async function authenticateTelegramUser(telegramUser: TelegramUser): Promise<TelegramAuthResult> {
  try {
    console.log('[TelegramAuth] Starting authentication for user:', telegramUser.id);

    // Validate Telegram user data
    if (!telegramUser || !telegramUser.id) {
      throw new Error('Invalid Telegram user data');
    }

    // Request custom token from our API
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegramId: telegramUser.id,
        userData: telegramUser
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get authentication token');
    }

    // Sign in with the custom token
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    const userCredential = await signInWithCustomToken(auth, data.token);
    const user = userCredential.user;

    console.log('[TelegramAuth] Authentication successful:', user.uid);

    return {
      success: true,
      user,
      uid: user.uid
    };

  } catch (error: any) {
    console.error('[TelegramAuth] Authentication failed:', error);
    
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
}

/**
 * Auto-authenticates current Telegram user if available
 * 
 * @returns Promise with authentication result
 */
export async function autoAuthenticateTelegramUser(): Promise<TelegramAuthResult> {
  try {
    // Check if running in Telegram WebApp
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'Not running in browser environment'
      };
    }

    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.initDataUnsafe?.user) {
      return {
        success: false,
        error: 'Not running in Telegram WebApp or user not available'
      };
    }

    const telegramUser = tg.initDataUnsafe.user;
    return await authenticateTelegramUser(telegramUser);

  } catch (error: any) {
    console.error('[TelegramAuth] Auto-authentication failed:', error);
    
    return {
      success: false,
      error: error.message || 'Auto-authentication failed'
    };
  }
}

/**
 * Checks if user is currently authenticated with Firebase
 * 
 * @returns Promise that resolves to true if authenticated
 */
export function isUserAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!auth) {
      resolve(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
}

/**
 * Gets current authenticated user
 * 
 * @returns Promise with current user or null
 */
export function getCurrentUser(): Promise<any> {
  return new Promise((resolve) => {
    if (!auth) {
      resolve(null);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Signs out current user
 * 
 * @returns Promise that resolves when sign out is complete
 */
export async function signOutUser(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  await auth.signOut();
  console.log('[TelegramAuth] User signed out successfully');
}

/**
 * Hook for React components to use Telegram authentication
 * 
 * Usage:
 * ```typescript
 * import { useTelegramAuth } from '@/lib/telegramAuth';
 * 
 * function MyComponent() {
 *   const { user, loading, error, authenticate } = useTelegramAuth();
 *   
 *   useEffect(() => {
 *     if (!user && !loading) {
 *       authenticate();
 *     }
 *   }, [user, loading, authenticate]);
 *   
 *   if (loading) return <div>Authenticating...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!user) return <div>Not authenticated</div>;
 *   
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 * ```
 */
export function useTelegramAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await autoAuthenticateTelegramUser();
      
      if (result.success) {
        setUser(result.user);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    error,
    authenticate,
    signOut: signOutUser,
    isAuthenticated: !!user
  };
}

// Note: You'll need to add these imports at the top of files using the hook:
// import { useState, useEffect, useCallback } from 'react';