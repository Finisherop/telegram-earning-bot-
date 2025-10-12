'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { initializeTelegramWebApp, debugTelegramWebApp } from '@/lib/telegramInit';
import { TelegramService } from '@/lib/telegram';

interface DiagnosticInfo {
  telegramAvailable: boolean;
  webAppAvailable: boolean;
  userDataAvailable: boolean;
  initDataAvailable: boolean;
  version?: string;
  platform?: string;
  userId?: number;
  userName?: string;
  error?: string;
}

const TelegramDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const runDiagnostics = async () => {
      console.log('[TelegramDiagnostics] Running diagnostics...');
      
      try {
        // Run debug function
        debugTelegramWebApp();
        
        // Initialize Telegram WebApp
        const initResult = await initializeTelegramWebApp();
        
        // Get user data from service
        const telegram = TelegramService.getInstance();
        const user = telegram.getUser();
        
        const diagnosticInfo: DiagnosticInfo = {
          telegramAvailable: typeof window !== 'undefined' && !!window.Telegram,
          webAppAvailable: initResult.isReady,
          userDataAvailable: initResult.hasUser,
          initDataAvailable: !!initResult.webApp?.initData,
          version: initResult.webApp?.version,
          platform: initResult.webApp?.platform,
          userId: user?.id,
          userName: user?.first_name,
          error: initResult.error
        };
        
        console.log('[TelegramDiagnostics] Diagnostic results:', diagnosticInfo);
        setDiagnostics(diagnosticInfo);
        
      } catch (error) {
        console.error('[TelegramDiagnostics] Error running diagnostics:', error);
        setDiagnostics({
          telegramAvailable: false,
          webAppAvailable: false,
          userDataAvailable: false,
          initDataAvailable: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    runDiagnostics();
  }, []);

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? '✅' : '❌';
  };

  if (isLoading) {
    return (
      <motion.div 
        className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-blue-800 font-medium">Checking Telegram connection...</span>
        </div>
      </motion.div>
    );
  }

  if (!diagnostics) {
    return null;
  }

  const hasIssues = !diagnostics.telegramAvailable || !diagnostics.webAppAvailable || !diagnostics.userDataAvailable;

  return (
    <motion.div 
      className={`border rounded-xl p-4 mb-4 ${
        hasIssues 
          ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-green-50 border-green-200'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">
            {hasIssues ? '⚠️' : '✅'}
          </span>
          <h3 className={`font-bold ${hasIssues ? 'text-yellow-800' : 'text-green-800'}`}>
            Telegram Connection Status
          </h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="mt-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(diagnostics.telegramAvailable)}</span>
            <span className={getStatusColor(diagnostics.telegramAvailable)}>
              Telegram Available
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(diagnostics.webAppAvailable)}</span>
            <span className={getStatusColor(diagnostics.webAppAvailable)}>
              WebApp Ready
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(diagnostics.userDataAvailable)}</span>
            <span className={getStatusColor(diagnostics.userDataAvailable)}>
              User Data Found
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(diagnostics.initDataAvailable)}</span>
            <span className={getStatusColor(diagnostics.initDataAvailable)}>
              Init Data Present
            </span>
          </div>
        </div>

        {diagnostics.userId && (
          <div className="mt-2 p-2 bg-white/50 rounded-lg">
            <div className="text-sm">
              <strong>User ID:</strong> {diagnostics.userId}
            </div>
            {diagnostics.userName && (
              <div className="text-sm">
                <strong>Name:</strong> {diagnostics.userName}
              </div>
            )}
          </div>
        )}

        {showDetails && (
          <motion.div 
            className="mt-3 p-3 bg-white/50 rounded-lg text-xs space-y-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div><strong>Version:</strong> {diagnostics.version || 'Not available'}</div>
            <div><strong>Platform:</strong> {diagnostics.platform || 'Not available'}</div>
            {diagnostics.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {diagnostics.error}
              </div>
            )}
          </motion.div>
        )}

        {hasIssues && (
          <div className="mt-3 p-2 bg-yellow-100 rounded-lg text-sm text-yellow-800">
            <strong>सुझाव:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {!diagnostics.telegramAvailable && (
                <li>Telegram app में bot को खोलें</li>
              )}
              {!diagnostics.webAppAvailable && (
                <li>App को refresh करें</li>
              )}
              {!diagnostics.userDataAvailable && (
                <li>Telegram से logout करके फिर login करें</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TelegramDiagnostics;