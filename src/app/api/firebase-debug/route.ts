/**
 * Firebase Debug API Route
 * 
 * Diagnostic endpoint to check Firebase Admin SDK configuration
 * Path: /api/firebase-debug
 * Method: GET
 */

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[Firebase Debug] 🔍 === FIREBASE ENVIRONMENT VARIABLES CHECK ===');
  
  // Check all Firebase environment variables
  const envVars = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
    FIREBASE_CLIENT_CERT_URL: process.env.FIREBASE_CLIENT_CERT_URL,
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL
  };

  const results: Record<string, any> = {};
  const missingVars: string[] = [];

  Object.entries(envVars).forEach(([key, value]) => {
    if (value === undefined) {
      console.error(`[Firebase Debug] ❌ ${key} is UNDEFINED`);
      results[key] = 'UNDEFINED';
      missingVars.push(key);
    } else {
      console.log(`[Firebase Debug] ✅ ${key} is defined (length: ${value.length})`);
      results[key] = {
        status: 'DEFINED',
        length: value.length,
        preview: key === 'FIREBASE_PRIVATE_KEY' 
          ? value.substring(0, 50) + '...' 
          : value.length > 50 
            ? value.substring(0, 50) + '...' 
            : value
      };
    }
  });

  console.log('[Firebase Debug] 📊 Summary:', {
    totalVars: Object.keys(envVars).length,
    definedVars: Object.keys(envVars).length - missingVars.length,
    missingVars: missingVars.length,
    missingList: missingVars
  });

  // Test Firebase Admin SDK initialization
  let initTest: { success: boolean; error: any } = { success: false, error: null };
  
  try {
    console.log('[Firebase Debug] 🧪 Testing Firebase Admin SDK initialization...');
    
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    
    if (getApps().length === 0) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "tgfjf-5bbfe",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };

      const app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://tgfjf-5bbfe-default-rtdb.firebaseio.com"
      });

      console.log('[Firebase Debug] ✅ Firebase Admin SDK initialized successfully');
      initTest = { success: true, error: null };
    } else {
      console.log('[Firebase Debug] ✅ Firebase Admin SDK already initialized');
      initTest = { success: true, error: null };
    }
  } catch (error) {
    console.error('[Firebase Debug] ❌ Firebase Admin SDK initialization failed:', error);
    initTest = { 
      success: false, 
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  const response = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    environmentVariables: results,
    missingVariables: missingVars,
    firebaseInitTest: initTest,
    recommendations: [] as string[]
  };

  // Add recommendations based on findings
  if (missingVars.length > 0) {
    response.recommendations.push(`Set missing environment variables: ${missingVars.join(', ')}`);
  }

  if (!initTest.success) {
    response.recommendations.push('Fix Firebase Admin SDK configuration');
  }

  if (missingVars.includes('FIREBASE_PRIVATE_KEY')) {
    response.recommendations.push('Download Firebase service account JSON and extract private_key');
  }

  if (missingVars.includes('FIREBASE_CLIENT_EMAIL')) {
    response.recommendations.push('Set FIREBASE_CLIENT_EMAIL from service account JSON');
  }

  console.log('[Firebase Debug] 🎯 Final diagnosis:', {
    hasAllVars: missingVars.length === 0,
    canInitialize: initTest.success,
    readyForProduction: missingVars.length === 0 && initTest.success
  });

  return NextResponse.json(response, {
    status: initTest.success && missingVars.length === 0 ? 200 : 500
  });
}