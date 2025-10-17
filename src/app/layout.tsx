import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import EnhancedErrorBoundary from '@/components/EnhancedErrorBoundary';
import TelegramFirebaseDirectSync from '@/components/TelegramFirebaseDirectSync';
import SilentErrorInitializer from '@/components/SilentErrorInitializer';

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
              // Simple Telegram WebApp initialization
              (function() {
                'use strict';
                
                function initTelegramWebApp() {
                  try {
                    if (window.Telegram?.WebApp) {
                      const tg = window.Telegram.WebApp;
                      
                      // Initialize WebApp
                      if (typeof tg.ready === 'function') {
                        tg.ready();
                      }
                      
                      if (typeof tg.expand === 'function') {
                        tg.expand();
                      }
                      
                      // Set theme
                      if (typeof tg.setHeaderColor === 'function') {
                        tg.setHeaderColor('#0088cc');
                      }
                      
                      if (typeof tg.setBackgroundColor === 'function') {
                        tg.setBackgroundColor('#ffffff');
                      }
                      
                      // Store user data globally for easy access
                      window.__TELEGRAM_WEBAPP__ = tg;
                      window.__TELEGRAM_WEBAPP_AVAILABLE__ = true;
                      
                      console.log('[TG-WebApp] Initialized successfully');
                      
                    } else {
                      // Silent fallback for non-Telegram environments (browser testing)
                      window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                      window.__TELEGRAM_WEBAPP__ = null;
                    }
                    
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
        <SilentErrorInitializer />
        <EnhancedErrorBoundary>
          <TelegramFirebaseDirectSync />
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