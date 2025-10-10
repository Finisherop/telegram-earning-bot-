import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

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
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Enhanced Telegram WebApp initialization with comprehensive error handling
              (function() {
                try {
                  // Wait for DOM to be ready
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initTelegram);
                  } else {
                    initTelegram();
                  }
                  
                  function initTelegram() {
                    try {
                      console.log('Checking for Telegram WebApp...');
                      
                      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                        console.log('Telegram WebApp found, initializing...');
                        
                        // Safely call WebApp methods
                        if (typeof window.Telegram.WebApp.ready === 'function') {
                          window.Telegram.WebApp.ready();
                          console.log('Telegram WebApp ready() called');
                        }
                        
                        if (typeof window.Telegram.WebApp.expand === 'function') {
                          window.Telegram.WebApp.expand();
                          console.log('Telegram WebApp expand() called');
                        }
                        
                        // Store WebApp availability for components
                        window.__TELEGRAM_WEBAPP_AVAILABLE__ = true;
                        console.log('Telegram WebApp initialized successfully');
                      } else {
                        console.log('Telegram WebApp not available - running in browser mode');
                        window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                      }
                    } catch (innerError) {
                      console.error('Error in initTelegram:', innerError);
                      window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                    }
                  }
                } catch (error) {
                  console.error('Error initializing Telegram WebApp:', error);
                  if (typeof window !== 'undefined') {
                    window.__TELEGRAM_WEBAPP_AVAILABLE__ = false;
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
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