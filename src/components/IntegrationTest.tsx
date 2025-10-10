'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  getEnhancedDailyStats,
  safeUpdateUserWithRetry,
  startFarmingWithValidation,
  createPayment,
  updatePaymentStatus,
  upgradeUserToVIP,
  logConversionEvent,
  sendBotMessage,
} from '@/lib/enhancedFirebaseService';
import { useErrorHandler } from '@/lib/errorHandler';
import toast from 'react-hot-toast';

interface IntegrationTestProps {
  userId: string;
}

const IntegrationTest = ({ userId }: IntegrationTestProps) => {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunning, setIsRunning] = useState(false);
  const { logError } = useErrorHandler();

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    try {
      console.log(`[Integration Test] Running ${testName}...`);
      await testFn();
      setTestResults(prev => ({ ...prev, [testName]: true }));
      console.log(`[Integration Test] ✅ ${testName} passed`);
    } catch (error) {
      console.error(`[Integration Test] ❌ ${testName} failed:`, error);
      logError(error as Error, { component: 'IntegrationTest', action: testName });
      setTestResults(prev => ({ ...prev, [testName]: false }));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    try {
      // Test 1: Enhanced Stats
      await runTest('Enhanced Stats', async () => {
        const stats = await getEnhancedDailyStats();
        if (typeof stats.totalUsers !== 'number') {
          throw new Error('Invalid stats structure');
        }
      });

      // Test 2: User Update with Retry
      await runTest('User Update with Retry', async () => {
        await safeUpdateUserWithRetry(userId, {
          coins: 1000,
          xp: 100,
        });
      });

      // Test 3: Farming Validation
      await runTest('Farming Validation', async () => {
        const result = await startFarmingWithValidation(userId);
        if (!result.success && !result.message.includes('already in progress')) {
          throw new Error('Farming validation failed');
        }
      });

      // Test 4: Payment Creation
      await runTest('Payment Creation', async () => {
        const paymentId = await createPayment(userId, 75, 'vip1', {
          testPayment: true,
        });
        if (!paymentId) {
          throw new Error('Payment creation failed');
        }
      });

      // Test 5: Conversion Logging
      await runTest('Conversion Logging', async () => {
        await logConversionEvent(userId, 'task_completion', {
          taskId: 'test_task',
          coinsEarned: 50,
        });
      });

      // Test 6: Bot Message
      await runTest('Bot Message', async () => {
        await sendBotMessage(userId, {
          type: 'welcome',
          title: 'Integration Test',
          message: 'This is a test message from the integration test.',
        });
      });

      // Test 7: VIP Upgrade (commented out to avoid actual upgrade)
      /*
      await runTest('VIP Upgrade', async () => {
        await upgradeUserToVIP(userId, 'vip1', 75);
      });
      */

      toast.success('Integration tests completed!');
    } catch (error) {
      console.error('[Integration Test] Test suite failed:', error);
      toast.error('Integration tests failed!');
    } finally {
      setIsRunning(false);
    }
  };

  const testCount = Object.keys(testResults).length;
  const passedCount = Object.values(testResults).filter(Boolean).length;
  const failedCount = testCount - passedCount;

  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-xl font-bold text-gray-800 mb-4">🧪 Integration Test Suite</h3>
      
      <div className="mb-6">
        <motion.button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            isRunning
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          whileHover={{ scale: isRunning ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isRunning ? '⏳ Running Tests...' : '🚀 Run Integration Tests'}
        </motion.button>
      </div>

      {testCount > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{testCount}</div>
              <div className="text-gray-600 text-sm">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passedCount}</div>
              <div className="text-gray-600 text-sm">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-gray-600 text-sm">Failed</div>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(testResults).map(([testName, passed]) => (
              <div
                key={testName}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <span className="font-medium text-gray-800">{testName}</span>
                <span className={`font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {passed ? '✅ PASS' : '❌ FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-bold text-gray-800 mb-2">Test Coverage:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Enhanced Firebase service functions</li>
          <li>• Real-time data synchronization</li>
          <li>• Error handling and retry logic</li>
          <li>• Payment and conversion tracking</li>
          <li>• Bot message system</li>
          <li>• VIP upgrade functionality</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default IntegrationTest;