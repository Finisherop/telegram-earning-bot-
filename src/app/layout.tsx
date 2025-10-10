import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
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
              // Professional Telegram WebApp initialization with comprehensive error handling
              (function() {
                'use strict';
                
                // Global error handlers to catch all errors
                window.addEventListener('error', function(e) {
                  console.warn('[TG-WebApp] Global error caught:', e.error);
                });
                
                window.addEventListener('unhandledrejection', function(e) {
                  console.warn('[TG-WebApp] Unhandled promise rejection:', e.reason);
                });
                
                // Network error suppression for MTPROTO and Telegram-specific errors
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  
                  // Suppress known Telegram/MTPROTO errors that don't affect functionality
                  if (
                    message.includes('[NET-4-C-0]') ||
                    message.includes('[MP-MTPROTO]') ||
                    message.includes('worker task error') ||
                    message.includes('messages.getAvailableEffects') ||
                    message.includes('updates.getChannelDifference') ||
                    message.includes('allow-storage-access-by-user-activation') ||
                    message.includes('pushResend') ||
                    message.includes('acked message')
                  ) {
                    // Log as debug instead of error
                    console.debug('[TG-Internal]', ...args);
                    return;
                  }
                  
                  // Call original console.error for other errors
                  originalConsoleError.apply(console, args);
                };
                
                // Enhanced Telegram WebApp initialization
                function initTelegramWebApp() {
                  try {
                    console.log('[TG-WebApp] Starting initialization...');
                    
                    // Wait for Telegram WebApp to be available
                    let attempts = 0;
                    const maxAttempts = 50; // 5 seconds max wait
                    
                    function checkTelegramWebApp() {
                      attempts++;
                      
                      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                        console.log('[TG-WebApp] Telegram WebApp found, setting up...');
                        
                        const tg = window.Telegram.WebApp;
                        
                        try {
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
                          
                          // Store WebApp reference and data globally
                          window.__TELEGRAM_WEBAPP__ = tg;
                          window.__TELEGRAM_WEBAPP_AVAILABLE__ = true;
                          window.__TELEGRAM_USER_DATA__ = tg.initDataUnsafe?.user || null;
                          window.__TELEGRAM_START_PARAM__ = tg.initDataUnsafe?.start_param || null;
                          
                          console.log('[TG-WebApp] Initialization completed successfully');
                          console.log('[TG-WebApp] Version:', tg.version);
                          console.log('[TG-WebApp] Platform:', tg.platform);
                          console.log('[TG-WebApp] User data available:', !!tg.initDataUnsafe?.user);
                          
                          // Dispatch custom event for components
                          window.dispatchEvent(new CustomEvent('telegramWebAppReady', {
                            detail: { webApp: tg, userData: tg.initDataUnsafe?.user }
                          }));
                          
                        } catch (setupError) {
                          console.error('[TG-WebApp] Setup error:', setupError);
                          window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                        }
                        
                      } else if (attempts < maxAttempts) {
                        // Continue waiting for Telegram WebApp
                        setTimeout(checkTelegramWebApp, 100);
                      } else {
                        // Timeout reached, switch to browser mode
                        console.log('[TG-WebApp] Timeout reached, switching to browser mode');
                        window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                        window.__TELEGRAM_WEBAPP__ = null;
                        
                        // Dispatch browser mode event
                        window.dispatchEvent(new CustomEvent('telegramWebAppBrowserMode'));
                      }
                    }
                    
                    // Start checking for Telegram WebApp
                    checkTelegramWebApp();
                    
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
        <ErrorBoundary>
          <UserCaptureInitializer />
          {children}
        </ErrorBoundary>
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