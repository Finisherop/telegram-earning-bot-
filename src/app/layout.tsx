import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import EnhancedErrorBoundary from '@/components/EnhancedErrorBoundary';
import UserCaptureInitializer from '@/components/UserCaptureInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Telegram Mini App - Earn Coins',
  description: 'High-performance Telegram Mini App with VIP features and rewards',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon and App Icons */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Splash Screen for PWA and Telegram WebApp */}
        <meta name="theme-color" content="#0088cc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Telegram Mini App" />
        
        <script 
          src="https://telegram.org/js/telegram-web-app.js"
          async
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Enhanced Telegram WebApp initialization with WebSocket reliability
              (function() {
                'use strict';
                
                // WebSocket wrapper with auto-reconnect + exponential backoff + HTTP fallback
                function createWS(url, onMessage) {
                  let ws, retry = 0, maxDelay = 30000;
                  function connect() {
                    try {
                      ws = new WebSocket(url);
                      ws.onopen = () => { 
                        retry = 0; 
                        console.log('[WS] Connected successfully'); 
                      };
                      ws.onmessage = e => onMessage && onMessage(e.data);
                      ws.onclose = e => {
                        console.warn('[WS] Connection closed', e.code, e.reason);
                        if (e.code !== 1000 && e.code !== 1001) {
                          const delay = Math.min(maxDelay, 1000 * (2 ** retry++));
                          console.log('[WS] Reconnecting in', delay, 'ms');
                          setTimeout(connect, delay);
                        }
                      };
                      ws.onerror = (err) => { 
                        console.error('[WS] Error:', err); 
                        if (ws.readyState === WebSocket.CONNECTING) {
                          ws.close(); 
                        }
                      };
                    } catch (error) {
                      console.error('[WS] Failed to create WebSocket:', error);
                      const delay = Math.min(maxDelay, 1000 * (2 ** retry++));
                      setTimeout(connect, delay);
                    }
                  }
                  connect();
                  return () => ws && ws.close(1000, 'client closed');
                }
                
                // Store WebSocket helper globally
                window.createReliableWS = createWS;
                
                // Enhanced Telegram WebApp initialization
                function initTelegramWebApp() {
                  try {
                    console.log('[TG-WebApp] Starting initialization...');
                    
                    if (window.Telegram?.WebApp) {
                      const tg = window.Telegram.WebApp;
                      
                      // Initialize WebApp with proper error handling
                      if (typeof tg.ready === 'function') {
                        tg.ready();
                        console.log('[TG-WebApp] ready() called successfully');
                      }
                      
                      if (typeof tg.expand === 'function') {
                        tg.expand();
                        console.log('[TG-WebApp] expand() called successfully');
                      }
                      
                      // Set theme and appearance
                      if (typeof tg.setHeaderColor === 'function') {
                        tg.setHeaderColor('#0088cc');
                      }
                      
                      if (typeof tg.setBackgroundColor === 'function') {
                        tg.setBackgroundColor('#ffffff');
                      }
                      
                      // Enable closing confirmation for better UX
                      if (typeof tg.enableClosingConfirmation === 'function') {
                        tg.enableClosingConfirmation();
                      }
                      
                      // Store minimal user data (privacy-focused)
                      const rawUser = tg.initDataUnsafe?.user || {};
                      const minimalUser = {
                        id: String(rawUser.id || ''),
                        username: rawUser.username || '',
                        first_name: rawUser.first_name || '',
                      };
                      
                      // Store references globally
                      window.__TELEGRAM_WEBAPP__ = tg;
                      window.__TELEGRAM_WEBAPP_AVAILABLE__ = true;
                      window.__TELEGRAM_USER_DATA__ = minimalUser;
                      window.__TELEGRAM_START_PARAM__ = tg.initDataUnsafe?.start_param || null;
                      
                      console.log('[TG-WebApp] Initialization completed successfully');
                      console.log('[TG-WebApp] Version:', tg.version);
                      console.log('[TG-WebApp] Platform:', tg.platform);
                      console.log('[TG-WebApp] User data available:', !!rawUser.id);
                      
                      // Dispatch custom event for components
                      window.dispatchEvent(new CustomEvent('telegramWebAppReady', {
                        detail: { webApp: tg, userData: minimalUser }
                      }));
                      
                    } else {
                      console.log('[TG-WebApp] Not running in Telegram WebApp environment');
                      window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                      window.__TELEGRAM_WEBAPP__ = null;
                      
                      // Dispatch browser mode event
                      window.dispatchEvent(new CustomEvent('telegramWebAppBrowserMode'));
                    }
                    
                    // Remove invalid iframe sandbox attributes
                    document.querySelectorAll("iframe").forEach(f => {
                      if (f.hasAttribute('sandbox')) {
                        f.removeAttribute('sandbox');
                        console.log('[TG-WebApp] Removed invalid sandbox attribute from iframe');
                      }
                    });
                    
                  } catch (error) {
                    console.error('[TG-WebApp] Initialization error:', error);
                    window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                    window.__TELEGRAM_WEBAPP__ = null;
                  }
                }
                
                // Initialize when DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initTelegramWebApp);
                } else {
                  initTelegramWebApp();
                }
                
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <EnhancedErrorBoundary>
          <UserCaptureInitializer />
          {children}
        </EnhancedErrorBoundary>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0088cc',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}