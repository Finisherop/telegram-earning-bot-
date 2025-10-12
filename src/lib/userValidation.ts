import { User } from '@/types';

/**
 * Validates if a user object has a valid telegramId
 */
export const isValidUser = (user: User | null | undefined): user is User => {
  if (!user) {
    console.warn('[UserValidation] User object is null or undefined');
    return false;
  }
  
  if (!user.telegramId) {
    console.warn('[UserValidation] User telegramId is missing');
    return false;
  }
  
  const telegramId = user.telegramId.toString().trim();
  
  if (telegramId === '' || telegramId === 'undefined' || telegramId === 'null') {
    console.warn('[UserValidation] User telegramId is invalid:', telegramId);
    return false;
  }
  
  return true;
};

/**
 * Gets a safe user ID from user object with fallback
 */
export const getSafeUserId = (user: User | null | undefined): string | null => {
  if (!isValidUser(user)) {
    return null;
  }
  
  return user.telegramId.toString().trim();
};

/**
 * Validates user data before performing operations
 */
export const validateUserForOperation = (user: User | null | undefined, operationName: string): boolean => {
  if (!isValidUser(user)) {
    console.error(`[UserValidation] Invalid user data for ${operationName}:`, user);
    return false;
  }
  
  console.log(`[UserValidation] User validation passed for ${operationName}:`, user.telegramId);
  return true;
};

/**
 * Creates a user validation error message
 */
export const getUserValidationError = (user: User | null | undefined): string => {
  if (!user) {
    return 'User not found. Please refresh the app.';
  }
  
  if (!user.telegramId) {
    return 'User ID is missing. Please refresh the app.';
  }
  
  const telegramId = user.telegramId.toString().trim();
  
  if (telegramId === '' || telegramId === 'undefined' || telegramId === 'null') {
    return 'User ID is invalid. Please refresh the app and try again.';
  }
  
  return 'User validation failed. Please refresh the app.';
};