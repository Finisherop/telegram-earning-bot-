# Enhanced API Route Logging - /api/sync-user

## 🔍 **What Was Enhanced**

The `/api/sync-user` route has been completely enhanced with detailed console logging and comprehensive error handling to help identify Firebase sync issues.

## 📋 **Enhanced Logging Features**

### 1. **Request Body Logging**
```typescript
console.log('[Sync User API] 📦 Raw request body:', JSON.stringify(body, null, 2));
console.log('[Sync User API] 🔍 Body type:', typeof body);
console.log('[Sync User API] 📊 Body keys:', Object.keys(body || {}));
console.log('[Sync User API] 👤 Extracted telegramUser:', JSON.stringify(telegramUser, null, 2));
```

### 2. **Firebase Environment Variables Check**
```typescript
const requiredEnvVars = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
  FIREBASE_CLIENT_CERT_URL: process.env.FIREBASE_CLIENT_CERT_URL,
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL
};

// Logs each variable as SET or UNDEFINED
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (value === undefined) {
    console.error(`[Firebase Admin] ❌ ${key} is UNDEFINED`);
  } else {
    console.log(`[Firebase Admin] ✅ ${key} is defined (length: ${value.length})`);
  }
});
```

### 3. **Firebase Config Initialization Logging**
```typescript
console.log('[Firebase Admin] 🔑 Service account config created:', {
  project_id: serviceAccount.project_id,
  client_email: serviceAccount.client_email ? 'SET' : 'MISSING',
  private_key: serviceAccount.private_key ? 'SET' : 'MISSING',
  private_key_id: serviceAccount.private_key_id ? 'SET' : 'MISSING'
});
```

### 4. **Database Reference Creation Logging**
```typescript
console.log('[Sync User API] 🔗 Creating database reference...');
userRef = database.ref(userPath);
console.log('[Sync User API] ✅ Database reference created successfully');
console.log('[Sync User API] 📋 Reference details:', {
  key: userRef.key,
  toString: userRef.toString()
});
```

### 5. **Wrapped Firebase Write Operation**
```typescript
try {
  console.log('[Sync User API] 📤 Executing userRef.set()...');
  await userRef.set(userData);
  console.log('[Sync User API] ✅ Firebase write operation completed successfully');
} catch (writeError) {
  console.error('[Sync User API] ❌ === FIREBASE WRITE OPERATION FAILED ===');
  console.error('[Sync User API] 🚨 Internal Firebase sync error:', writeError);
  console.error('[Sync User API] 🔍 Write error details:', {
    name: writeError instanceof Error ? writeError.name : 'Unknown',
    message: writeError instanceof Error ? writeError.message : 'Unknown error',
    code: (writeError as any)?.code || 'No error code',
    stack: writeError instanceof Error ? writeError.stack : 'No stack trace'
  });
}
```

### 6. **Response Status and Message Logging**
```typescript
console.log('[Sync User API] 🎉 === REQUEST COMPLETED SUCCESSFULLY ===');
return NextResponse.json({
  success: true,
  operation,
  user: savedData,
  path: userPath,
  timestamp: new Date().toISOString()
});
```

## 🔧 **Error Identification Features**

### **Environment Variables Check**
- Logs each required Firebase environment variable
- Shows which variables are UNDEFINED
- Displays variable lengths for defined variables

### **Firebase Initialization Errors**
- Detailed service account configuration logging
- Firebase app initialization error details
- Database instance creation verification

### **Database Operation Errors**
- Reference creation error handling
- Read operation error details
- Write operation error with Firebase error codes
- Write verification error handling

### **User Data Validation**
- Telegram user data structure validation
- User ID format validation
- Type checking for all fields

## 📊 **Expected Console Output**

### **Successful Request:**
```
[Sync User API] 🚀 === NEW REQUEST RECEIVED ===
[Sync User API] 📦 Raw request body: {"telegramUser":{"id":123456789,"first_name":"John"}}
[Firebase Admin] ✅ FIREBASE_PROJECT_ID is defined (length: 12)
[Firebase Admin] ✅ FIREBASE_DATABASE_URL is defined (length: 58)
[Sync User API] ✅ Valid Telegram user ID: 123456789
[Sync User API] 📍 Target Firebase path: telegram_users/123456789
[Sync User API] 📤 Executing userRef.set()...
[Sync User API] ✅ Firebase write operation completed successfully
[Sync User API] ✅ Write verification successful!
[Sync User API] 🎉 === REQUEST COMPLETED SUCCESSFULLY ===
```

### **Failed Request (Missing Env Vars):**
```
[Sync User API] 🚀 === NEW REQUEST RECEIVED ===
[Firebase Admin] ❌ FIREBASE_PRIVATE_KEY is UNDEFINED
[Firebase Admin] ❌ FIREBASE_CLIENT_EMAIL is UNDEFINED
[Firebase Admin] 🚨 Missing environment variables: ['FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL']
[Firebase Admin] ❌ Initialization failed with error: Error: Invalid service account
[Sync User API] ❌ Firebase initialization failed: Error: Invalid service account
```

### **Failed Request (Write Error):**
```
[Sync User API] 📤 Executing userRef.set()...
[Sync User API] ❌ === FIREBASE WRITE OPERATION FAILED ===
[Sync User API] 🚨 Internal Firebase sync error: Error: Permission denied
[Sync User API] 🔍 Write error details: {
  name: "Error",
  message: "Permission denied",
  code: "PERMISSION_DENIED"
}
```

## 🚀 **How to Use**

1. **Deploy the enhanced API route**
2. **Open Telegram Mini WebApp**
3. **Check console logs** in:
   - **Vercel Function Logs** (if deployed)
   - **Local terminal** (if running locally)
   - **Browser Network tab** for response details

4. **Look for specific error patterns**:
   - `❌ [ENV_VAR] is UNDEFINED` - Missing environment variables
   - `❌ Firebase initialization failed` - Service account issues
   - `❌ FIREBASE WRITE OPERATION FAILED` - Permission or database issues
   - `❌ Write verification failed` - Data not saved properly

## 🔍 **Troubleshooting Guide**

### **If you see "UNDEFINED" environment variables:**
1. Set up Firebase Admin SDK environment variables
2. Check `.env` file or deployment environment settings
3. Verify service account JSON file values

### **If you see "Firebase initialization failed":**
1. Check Firebase service account credentials
2. Verify project ID matches Firebase console
3. Ensure private key format is correct

### **If you see "FIREBASE WRITE OPERATION FAILED":**
1. Check Firebase Realtime Database rules
2. Verify database URL is correct
3. Check for permission denied errors

### **If you see "Write verification failed":**
1. Data was written but couldn't be read back
2. Check database rules for read permissions
3. Verify database path is correct

This enhanced logging will help identify exactly where the Firebase sync is failing and provide clear error messages for debugging.