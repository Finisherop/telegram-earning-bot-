import { realtimeDb } from './firebase';
import { ref, set, update, get } from 'firebase/database';

/**
 * Simple Firebase utilities to replace the complex firebaseGlobal functions
 */

// Simple logger
export const FirebaseLogger = {
  info: (operation: string, path: string, data?: any) => {
    console.log(`[Firebase] ${operation} at ${path}`, data);
  },
  error: (operation: string, path: string, error: any) => {
    console.error(`[Firebase] ${operation} failed at ${path}:`, error);
  },
  warn: (operation: string, path: string, message: string) => {
    console.warn(`[Firebase] ${operation} at ${path}: ${message}`);
  }
};

// Simple safe set function
export async function safeSet(path: string, data: any): Promise<boolean> {
  try {
    if (!realtimeDb) {
      FirebaseLogger.error('safeSet', path, 'Database not initialized');
      return false;
    }

    // Remove undefined values
    const cleanData = JSON.parse(JSON.stringify(data));
    
    const dbRef = ref(realtimeDb, path);
    await set(dbRef, cleanData);
    
    FirebaseLogger.info('safeSet', path, 'Success');
    return true;
  } catch (error) {
    FirebaseLogger.error('safeSet', path, error);
    return false;
  }
}

// Simple safe update function
export async function safeUpdate(path: string, updates: any): Promise<boolean> {
  try {
    if (!path || !updates) {
      FirebaseLogger.warn('safeUpdate', path || 'undefined', 'Missing path or data');
      console.warn('[Firebase] ⚠️ Skipped safeUpdate (missing path/data)', { path, updates });
      return false;
    }

    if (!realtimeDb) {
      FirebaseLogger.error('safeUpdate', path, 'Database not initialized');
      console.error('[Firebase] ❌ Database not initialized for safeUpdate at', path);
      return false;
    }

    // Remove undefined values and validate data
    const cleanUpdates = JSON.parse(JSON.stringify(updates));
    
    if (Object.keys(cleanUpdates).length === 0) {
      FirebaseLogger.warn('safeUpdate', path, 'No valid data to update');
      console.warn('[Firebase] ⚠️ No valid data to update at', path);
      return false;
    }
    
    console.log('[Firebase] 🔄 Attempting safeUpdate at', path, 'with data:', cleanUpdates);
    
    const dbRef = ref(realtimeDb, path);
    await update(dbRef, cleanUpdates);
    
    FirebaseLogger.info('safeUpdate', path, 'Success');
    console.log('[Firebase] ✅ safeUpdate success at', path, cleanUpdates);
    return true;
  } catch (error) {
    FirebaseLogger.error('safeUpdate', path, error);
    console.error('[Firebase] ❌ safeUpdate failed at', path, 'Error:', error);
    return false;
  }
}

// Simple safe get function
export async function safeGet(path: string): Promise<any> {
  try {
    if (!realtimeDb) {
      FirebaseLogger.error('safeGet', path, 'Database not initialized');
      return null;
    }

    const dbRef = ref(realtimeDb, path);
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      FirebaseLogger.info('safeGet', path, 'Data found');
      return snapshot.val();
    } else {
      FirebaseLogger.info('safeGet', path, 'No data found');
      return null;
    }
  } catch (error) {
    FirebaseLogger.error('safeGet', path, error);
    return null;
  }
}

// Simple utility functions
export function sanitizeUserId(userId: any): string | null {
  if (!userId) return null;
  const str = String(userId).trim();
  if (!str || str === 'undefined' || str === 'null') return null;
  return str;
}

export function buildUserPath(userId: any): string | null {
  const cleanId = sanitizeUserId(userId);
  return cleanId ? `telegram_users/${cleanId}` : null;
}

export function buildTaskPath(taskId: any): string | null {
  const cleanId = sanitizeUserId(taskId);
  return cleanId ? `tasks/${cleanId}` : null;
}

export function buildUserTaskPath(userId: any, taskId: any): string | null {
  const cleanUserId = sanitizeUserId(userId);
  const cleanTaskId = sanitizeUserId(taskId);
  return (cleanUserId && cleanTaskId) ? `userTasks/${cleanUserId}/${cleanTaskId}` : null;
}

export function extractUserId(path: string): string | null {
  const match = path.match(/users\/([^\/]+)/);
  return match ? match[1] : null;
}

// Simple safe listen function (placeholder)
export function safeListen(path: string, callback: (data: any) => void): () => void {
  // This is a simplified version - in a real app you'd implement proper listeners
  return () => {};
}