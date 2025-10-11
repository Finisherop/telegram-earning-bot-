import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getTimeAgo = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(d);
};

export const isValidUPI = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return upiRegex.test(upiId);
};

export const generateReferralCode = (userId: string): string => {
  return btoa(userId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
};

export const calculateLevel = (xp: number): number => {
  return Math.floor(xp / 100) + 1;
};

export const calculateXPForNextLevel = (xp: number): number => {
  const currentLevel = calculateLevel(xp);
  return currentLevel * 100;
};

export const calculateXPProgress = (xp: number): number => {
  return (xp % 100);
};

export const isVIPActive = (vipEndTime?: Date): boolean => {
  if (!vipEndTime) return false;
  return new Date() < new Date(vipEndTime);
};

export const getRemainingVIPDays = (vipEndTime?: Date): number => {
  if (!vipEndTime) return 0;
  const now = new Date();
  const endTime = new Date(vipEndTime);
  if (now >= endTime) return 0;
  
  const diffInMs = endTime.getTime() - now.getTime();
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Simple sound utility for UI feedback
export const playSound = (type: 'click' | 'success' | 'error') => {
  try {
    // Use Web Audio API for simple sound feedback
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different sound types
    switch (type) {
      case 'click':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        break;
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + (type === 'success' ? 0.3 : 0.2));
  } catch (error) {
    // Silently fail if audio is not supported
    console.debug('Audio not supported:', error);
  }
};