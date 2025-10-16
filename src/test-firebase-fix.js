// Simple test script to verify Firebase fixes
// This script can be run in the browser console to test Firebase operations

const testFirebaseOperations = async () => {
  console.log('🧪 Testing Firebase operations...');
  
  const testUserId = '6779644494';
  
  try {
    // Test 1: Confirm referral API
    console.log('📞 Testing /api/confirm-referral...');
    const referralResponse = await fetch('/api/confirm-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId }),
    });
    
    const referralResult = await referralResponse.json();
    console.log('✅ Referral API response:', referralResult);
    
    // Test 2: Check if Firebase utils are working
    if (typeof window !== 'undefined' && window.safeUpdate) {
      console.log('🔧 Testing safeUpdate function...');
      const testPath = `telegram_users/${testUserId}`;
      const testData = {
        testField: 'test_value',
        updatedAt: new Date().toISOString()
      };
      
      const updateResult = await window.safeUpdate(testPath, testData);
      console.log('✅ safeUpdate result:', updateResult);
    }
    
    console.log('🎉 Firebase tests completed!');
    
  } catch (error) {
    console.error('❌ Firebase test error:', error);
  }
};

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testFirebaseOperations = testFirebaseOperations;
  console.log('🔧 Firebase test function loaded. Run testFirebaseOperations() to test.');
}

export default testFirebaseOperations;