'use client';

import { useState, useEffect } from 'react';
import { TelegramService } from '@/lib/telegram';

const TelegramDebug = () => {
  const [telegramData, setTelegramData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const telegram = TelegramService.getInstance();
    
    // Get Telegram WebApp data
    const updateTelegramData = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        setTelegramData({
          isAvailable: true,
          version: window.Telegram.WebApp.version,
          platform: window.Telegram.WebApp.platform,
          colorScheme: window.Telegram.WebApp.colorScheme,
          user: window.Telegram.WebApp.initDataUnsafe?.user,
          startParam: window.Telegram.WebApp.initDataUnsafe?.start_param,
          initData: window.Telegram.WebApp.initData,
          isExpanded: window.Telegram.WebApp.isExpanded,
          viewportHeight: window.Telegram.WebApp.viewportHeight,
          themeParams: window.Telegram.WebApp.themeParams,
        });
      } else {
        setTelegramData({
          isAvailable: false,
          error: 'Telegram WebApp not available'
        });
      }
    };

    updateTelegramData();
    
    // Update every 2 seconds
    const interval = setInterval(updateTelegramData, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' && !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg"
      >
        🐛 Debug
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-black text-white p-4 rounded-lg shadow-xl max-w-sm max-h-96 overflow-auto text-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Telegram WebApp Debug</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
          
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(telegramData, null, 2)}
          </pre>
          
          <div className="mt-4 space-y-2">
            <button
              onClick={() => {
                const telegram = TelegramService.getInstance();
                telegram.hapticFeedback('medium');
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Test Haptic
            </button>
            
            <button
              onClick={() => {
                const telegram = TelegramService.getInstance();
                telegram.showAlert('Test Alert from Debug Panel');
              }}
              className="bg-green-500 text-white px-2 py-1 rounded text-xs ml-2"
            >
              Test Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramDebug;