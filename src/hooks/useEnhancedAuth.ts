'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/types';
import { TelegramService } from '@/lib/telegram';
import { 
  enhancedDataPersistence,
  initializeUserData,
  updateUserData,
  subscribeToUserData,
  getCurrentUserData
} from '@/lib/enhancedDataPersistence';
import { initializeUser } from '@/lib/firebaseService';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasError: boolean;
  isInitialized: boolean;
}

export const useEnhancedAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    hasError: false,
    isInitialized: false
  });

  const initializationRef = useRef<boolean>(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAuth = async () => {
      console.log('[EnhancedAuth] Starting authentication initialization...');
      
      try {
        // Check for immediate cached data
        const cachedUser = getCurrentUserData();
        if (cachedUser) {
          console.log('[EnhancedAuth] Found cached user, showing immediately');
          setAuthState(prev => ({
            ...prev,
            user: cachedUser,
            isLoading: false,
            isInitialized: true
          }));
        }

        // Subscribe to data persistence updates
        const unsubscribe = subscribeToUserData(({ user, isLoading, hasError }) => {
          setAuthState(prev => ({
            ...prev,
            user,
            isLoading,
            hasError,
            isInitialized: true
          }));
        });
        
        unsubscribeRef.current = unsubscribe;

        // Wait for Telegram service to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const telegram = TelegramService.getInstance();
        const telegramUser = telegram.getUser();

        console.log('[EnhancedAuth] Telegram user data:', telegramUser);

        let userId: string;
        let userData: Partial<User>;

        if (telegramUser && telegramUser.id && telegramUser.id > 0) {
          // Real Telegram user
          userId = telegramUser.id.toString();
          userData = {
            telegramId: userId,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            profilePic: telegramUser.photo_url,
            referrerId: telegram.getStartParam() || undefined,
          };
          console.log('[EnhancedAuth] Using Telegram user:', userData);
        } else {
          console.warn('[EnhancedAuth] No valid Telegram user, cannot proceed');
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            hasError: true,
            isInitialized: true
          }));
          return;
        }

        // Initialize user data through enhanced persistence
        const initializedUser = await initializeUserData(userId);
        
        if (initializedUser) {
          // Update with latest Telegram data if needed
          const needsUpdate = 
            initializedUser.username !== userData.username ||
            initializedUser.firstName !== userData.firstName ||
            initializedUser.lastName !== userData.lastName ||
            initializedUser.profilePic !== userData.profilePic;

          if (needsUpdate) {
            console.log('[EnhancedAuth] Updating user profile data');
            await updateUserData(userId, {
              username: userData.username,
              firstName: userData.firstName,
              lastName: userData.lastName,
              profilePic: userData.profilePic,
            });
          }

          // Handle referral for new users
          const startParam = telegram.getStartParam();
          if (startParam && startParam !== userId && initializedUser.createdAt) {
            const createdTime = new Date(initializedUser.createdAt).getTime();
            const now = new Date().getTime();
            const isNewUser = (now - createdTime) < 300000; // Created within last 5 minutes
            
            if (isNewUser && !initializedUser.referrerId) {
              console.log('[EnhancedAuth] Processing referral for new user:', startParam);
              try {
                // Process referral logic here if needed
                await updateUserData(userId, {
                  referrerId: startParam,
                });
              } catch (referralError) {
                console.error('[EnhancedAuth] Error processing referral:', referralError);
              }
            }
          }
        } else {
          // Create new user if initialization failed
          console.log('[EnhancedAuth] Creating new user');
          try {
            const newUser = await initializeUser(userId);
            if (newUser) {
              await updateUserData(userId, userData);
            }
          } catch (createError) {
            console.error('[EnhancedAuth] Error creating user:', createError);
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              hasError: true,
              isInitialized: true
            }));
          }
        }

      } catch (error) {
        console.error('[EnhancedAuth] Authentication initialization error:', error);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          hasError: true,
          isInitialized: true
        }));
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Update user function
  const updateUser = async (updateData: Partial<User>): Promise<User | null> => {
    if (!authState.user?.telegramId) {
      console.error('[EnhancedAuth] Cannot update user: no telegramId');
      return null;
    }

    try {
      return await updateUserData(authState.user.telegramId, updateData);
    } catch (error) {
      console.error('[EnhancedAuth] Error updating user:', error);
      throw error;
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<User | null> => {
    if (!authState.user?.telegramId) {
      console.error('[EnhancedAuth] Cannot refresh user: no telegramId');
      return null;
    }

    try {
      return await enhancedDataPersistence.refreshFromFirebase(authState.user.telegramId);
    } catch (error) {
      console.error('[EnhancedAuth] Error refreshing user:', error);
      return null;
    }
  };

  // Clear user data and logout
  const logout = (): void => {
    enhancedDataPersistence.clearCache();
    setAuthState({
      user: null,
      isLoading: false,
      hasError: false,
      isInitialized: false
    });
  };

  return {
    ...authState,
    updateUser,
    refreshUser,
    logout,
    // Additional helpers
    isAuthenticated: !!authState.user && authState.isInitialized,
    syncState: enhancedDataPersistence.getSyncState(),
  };
};