/**
 * Connection Monitor
 * 
 * Silent background monitoring of network and Firebase connection status.
 * Handles reconnection logic without user-facing notifications.
 */

import firebaseReliable from './firebaseReliable';

interface ConnectionMetrics {
  isOnline: boolean;
  isFirebaseConnected: boolean;
  lastSuccessfulSync: number;
  reconnectAttempts: number;
  connectionMode: 'websocket' | 'longpoll' | 'offline';
  latency: number;
}

class ConnectionMonitor {
  private metrics: ConnectionMetrics = {
    isOnline: navigator.onLine,
    isFirebaseConnected: false,
    lastSuccessfulSync: 0,
    reconnectAttempts: 0,
    connectionMode: 'offline',
    latency: 0
  };

  private monitorInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private latencyTestInterval: NodeJS.Timeout | null = null;

  private callbacks: Array<(metrics: ConnectionMetrics) => void> = [];

  constructor() {
    this.setupNetworkListeners();
    this.startMonitoring();
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.metrics.isOnline = true;
      this.handleNetworkRestore();
    });

    window.addEventListener('offline', () => {
      this.metrics.isOnline = false;
      this.metrics.isFirebaseConnected = false;
      this.metrics.connectionMode = 'offline';
      this.notifyCallbacks();
    });

    // Listen for visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.metrics.isOnline) {
        this.checkConnection();
      }
    });
  }

  /**
   * Start connection monitoring
   */
  private startMonitoring(): void {
    if (this.monitorInterval) return;

    // Check connection every 15 seconds
    this.monitorInterval = setInterval(() => {
      this.checkConnection();
    }, 15000);

    // Test latency every 30 seconds
    this.latencyTestInterval = setInterval(() => {
      this.testLatency();
    }, 30000);

    // Initial check
    this.checkConnection();
  }

  /**
   * Check Firebase connection status
   */
  private async checkConnection(): Promise<void> {
    if (!this.metrics.isOnline) return;

    try {
      const startTime = Date.now();
      const status = firebaseReliable.getConnectionStatus();
      const endTime = Date.now();

      this.metrics.latency = endTime - startTime;
      this.metrics.isFirebaseConnected = status.isConnected;
      this.metrics.connectionMode = status.mode;

      if (status.isConnected) {
        this.metrics.lastSuccessfulSync = Date.now();
        this.metrics.reconnectAttempts = 0;
      }

      this.notifyCallbacks();
    } catch (error) {
      this.metrics.isFirebaseConnected = false;
      this.metrics.connectionMode = 'offline';
      this.notifyCallbacks();
    }
  }

  /**
   * Test connection latency
   */
  private async testLatency(): Promise<void> {
    if (!this.metrics.isFirebaseConnected) return;

    try {
      const startTime = performance.now();
      
      // Simple ping test using a lightweight Firebase read
      await firebaseReliable.safeRead('.info/serverTimeOffset');
      
      const endTime = performance.now();
      this.metrics.latency = Math.round(endTime - startTime);
    } catch (error) {
      // Silent fail
      this.metrics.latency = -1;
    }
  }

  /**
   * Handle network restoration
   */
  private async handleNetworkRestore(): Promise<void> {
    console.log('[ConnectionMonitor] Network restored, attempting reconnection...');
    
    this.metrics.reconnectAttempts++;
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Attempt to reinitialize Firebase
    try {
      await firebaseReliable.initialize();
      this.checkConnection();
    } catch (error) {
      // Schedule retry with exponential backoff
      const delay = Math.min(30000, 1000 * Math.pow(2, this.metrics.reconnectAttempts));
      
      this.reconnectTimeout = setTimeout(() => {
        this.handleNetworkRestore();
      }, delay);
    }
  }

  /**
   * Subscribe to connection status updates
   */
  public subscribe(callback: (metrics: ConnectionMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Immediately call with current metrics
    callback({ ...this.metrics });
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Force connection check
   */
  public async forceCheck(): Promise<void> {
    await this.checkConnection();
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(): void {
    const metrics = { ...this.metrics };
    this.callbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        // Silent fail - don't let callback errors break monitoring
      }
    });
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    if (this.latencyTestInterval) {
      clearInterval(this.latencyTestInterval);
      this.latencyTestInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.callbacks = [];
  }

  /**
   * Get connection quality assessment
   */
  public getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this.metrics.isOnline || !this.metrics.isFirebaseConnected) {
      return 'offline';
    }

    if (this.metrics.latency < 100) return 'excellent';
    if (this.metrics.latency < 500) return 'good';
    return 'poor';
  }

  /**
   * Check if we should use offline mode
   */
  public shouldUseOfflineMode(): boolean {
    const timeSinceLastSync = Date.now() - this.metrics.lastSuccessfulSync;
    const hasRecentConnection = timeSinceLastSync < 60000; // 1 minute
    
    return !this.metrics.isFirebaseConnected && !hasRecentConnection;
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    connectionMonitor.cleanup();
  });
}

export default connectionMonitor;