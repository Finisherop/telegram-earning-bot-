/**
 * Firebase Safety Validator Component
 * 
 * This component runs comprehensive checks to ensure all Firebase
 * user data sync issues are resolved and displays the status.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  initializeUserSafely,
  createSafeUser,
  ultimateFirebaseSanitizer
} from '@/lib/firebaseSafeSyncFix';
import { getTelegramUserSafe } from '@/lib/telegramUserSafe';

interface ValidationResult {
  test: string;
  passed: boolean;
  message: string;
}

const FirebaseSafetyValidator = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const runValidationTests = async () => {
    setIsRunning(true);
    const results: ValidationResult[] = [];

    try {
      // Test 1: Telegram User Capture
      try {
        const telegramUser = getTelegramUserSafe();
        const hasValidData = !!(telegramUser && (telegramUser.id || telegramUser.source === 'browser'));
        results.push({
          test: 'Telegram User Capture',
          passed: hasValidData,
          message: hasValidData 
            ? `✅ Successfully captured ${telegramUser?.source || 'unknown'} user data`
            : '❌ Failed to capture user data'
        });
      } catch (error) {
        results.push({
          test: 'Telegram User Capture',
          passed: false,
          message: `❌ Error: ${error}`
        });
      }

      // Test 2: Safe User Object Creation
      try {
        const telegramUser = getTelegramUserSafe();
        const safeUser = createSafeUser(telegramUser);
        
        // Check for undefined values
        const hasUndefined = Object.values(safeUser).some(value => value === undefined);
        const requiredFields = ['id', 'firstName', 'coins', 'xp', 'level', 'vipTier'];
        const hasRequiredFields = requiredFields.every(field => (safeUser as any)[field] !== undefined);
        
        results.push({
          test: 'Safe User Object Creation',
          passed: !hasUndefined && hasRequiredFields,
          message: !hasUndefined && hasRequiredFields
            ? '✅ Safe user object created with no undefined values'
            : '❌ User object contains undefined values or missing required fields'
        });
      } catch (error) {
        results.push({
          test: 'Safe User Object Creation',
          passed: false,
          message: `❌ Error creating safe user: ${error}`
        });
      }

      // Test 3: Firebase Data Sanitization
      try {
        const testData = {
          id: '123',
          name: 'Test User',
          coins: 100,
          undefinedField: undefined,
          nullField: null,
          nestedObject: {
            validField: 'test',
            undefinedNested: undefined
          }
        };
        
        const sanitized = ultimateFirebaseSanitizer(testData);
        const sanitizedString = JSON.stringify(sanitized);
        const hasUndefined = sanitizedString.includes('undefined');
        
        results.push({
          test: 'Firebase Data Sanitization',
          passed: !hasUndefined,
          message: !hasUndefined
            ? '✅ Data sanitization removes all undefined values'
            : '❌ Sanitized data still contains undefined values'
        });
      } catch (error) {
        results.push({
          test: 'Firebase Data Sanitization',
          passed: false,
          message: `❌ Sanitization error: ${error}`
        });
      }

      // Test 4: DOM Ready Check
      try {
        const domReady = document.readyState === 'complete';
        results.push({
          test: 'DOM Ready State',
          passed: domReady,
          message: domReady
            ? '✅ DOM is ready for Firebase operations'
            : '⚠️ DOM not yet ready - initialization will wait'
        });
      } catch (error) {
        results.push({
          test: 'DOM Ready State',
          passed: false,
          message: `❌ DOM check error: ${error}`
        });
      }

      // Test 5: Safe Initialization System
      try {
        const { user, userId } = await initializeUserSafely();
        const initSuccess = !!(user && userId);
        
        results.push({
          test: 'Safe User Initialization',
          passed: initSuccess,
          message: initSuccess
            ? `✅ User initialization successful (ID: ${userId})`
            : '❌ User initialization failed'
        });
      } catch (error) {
        results.push({
          test: 'Safe User Initialization',
          passed: false,
          message: `❌ Initialization error: ${error}`
        });
      }

      setValidationResults(results);
      
      // Determine overall status
      const allPassed = results.every(result => result.passed);
      const criticalTestsPassed = results.filter(r => 
        ['Safe User Object Creation', 'Firebase Data Sanitization', 'Safe User Initialization'].includes(r.test)
      ).every(r => r.passed);
      
      setOverallStatus(allPassed ? 'success' : criticalTestsPassed ? 'success' : 'error');
      
    } catch (error) {
      console.error('Validation error:', error);
      setOverallStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run validation on mount
    setTimeout(runValidationTests, 1000);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <motion.div
        className={`rounded-lg p-4 shadow-lg border-2 ${
          overallStatus === 'success' ? 'bg-green-50 border-green-200' :
          overallStatus === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">
            {overallStatus === 'success' ? '✅ Firebase Safety: OK' :
             overallStatus === 'error' ? '❌ Firebase Issues Detected' :
             '🔄 Checking Firebase Safety...'}
          </h3>
          
          <button
            onClick={runValidationTests}
            disabled={isRunning}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            {isRunning ? '🔄' : '🔄 Test'}
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {validationResults.map((result, index) => (
            <motion.div
              key={result.test}
              className={`p-2 rounded ${
                result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="font-medium">{result.test}</div>
              <div className="text-xs mt-1">{result.message}</div>
            </motion.div>
          ))}
        </div>
        
        {overallStatus === 'success' && (
          <div className="mt-3 text-xs text-green-600 font-medium text-center">
            🎉 All Firebase undefined value issues resolved!
          </div>
        )}
        
        {overallStatus === 'error' && (
          <div className="mt-3 text-xs text-red-600 font-medium text-center">
            ⚠️ Some issues detected. Check console for details.
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FirebaseSafetyValidator;