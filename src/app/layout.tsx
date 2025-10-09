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
              console.log('Telegram WebApp script loaded');
              
              // Wait for Telegram WebApp to be available
              function initTelegramWebApp() {
                if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                  console.log('Initializing Telegram WebApp...');
                  window.Telegram.WebApp.ready();
                  window.Telegram.WebApp.expand();
                  
                  // Log WebApp info
                  console.log('WebApp initialized:', {
                    version: window.Telegram.WebApp.version,
                    platform: window.Telegram.WebApp.platform,
                    colorScheme: window.Telegram.WebApp.colorScheme,
                    user: window.Telegram.WebApp.initDataUnsafe?.user
                  });
                } else {
                  console.log('Telegram WebApp not ready, retrying...');
                  setTimeout(initTelegramWebApp, 100);
                }
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