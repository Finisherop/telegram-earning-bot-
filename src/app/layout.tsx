import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

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
              // Telegram WebApp initialization
              console.log('Telegram WebApp script loading...');
              
              // Global flag to track initialization
              window.telegramWebAppInitialized = false;
              
              // Wait for Telegram WebApp to be available
              function initTelegramWebApp() {
                let retryCount = 0;
                const maxRetries = 100; // 10 seconds total
                
                function checkAndInit() {
                  console.log('Checking for Telegram WebApp... (attempt ' + (retryCount + 1) + '/' + maxRetries + ')');
                  
                  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                    console.log('Telegram WebApp found! Initializing...');
                    
                    try {
                      window.Telegram.WebApp.ready();
                      window.Telegram.WebApp.expand();
                      window.telegramWebAppInitialized = true;
                      
                      // Log WebApp info
                      console.log('WebApp initialized successfully:', {
                        version: window.Telegram.WebApp.version,
                        platform: window.Telegram.WebApp.platform,
                        colorScheme: window.Telegram.WebApp.colorScheme,
                        user: window.Telegram.WebApp.initDataUnsafe?.user,
                        initData: window.Telegram.WebApp.initData,
                        isExpanded: window.Telegram.WebApp.isExpanded
                      });
                      
                      // Dispatch custom event to notify React components
                      window.dispatchEvent(new CustomEvent('telegramWebAppReady', {
                        detail: { webApp: window.Telegram.WebApp }
                      }));
                      
                    } catch (error) {
                      console.error('Error initializing Telegram WebApp:', error);
                    }
                  } else if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(checkAndInit, 100);
                  } else {
                    console.warn('Telegram WebApp not available after ' + maxRetries + ' attempts');
                    console.log('Current environment:', {
                      userAgent: navigator.userAgent,
                      hostname: window.location.hostname,
                      href: window.location.href,
                      telegramAvailable: !!window.Telegram,
                      webAppAvailable: !!(window.Telegram && window.Telegram.WebApp)
                    });
                  }
                }
                
                checkAndInit();
              }
              
              // Start initialization when DOM is ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initTelegramWebApp);
              } else {
                initTelegramWebApp();
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
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