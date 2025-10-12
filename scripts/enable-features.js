#!/usr/bin/env node

/**
 * Feature Enable Script for Firebase
 * 
 * Sets configuration in Firebase to enable all bot features
 * and enforce minimal data capture policy.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || 'tgfjf-5bbfe',
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
  credential: cert(serviceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://tgfjf-5bbfe-default-rtdb.firebaseio.com'
});

const db = getDatabase(app);

async function enableFeatures() {
  try {
    console.log('🔧 Enabling Telegram bot features...');

    // Feature configuration
    const features = {
      tasks: true,
      withdrawals: true,
      adminPanel: true,
      referrals: true,
      minimalCapture: true,
      restoredAt: new Date().toISOString(),
      version: '2.0.0'
    };

    // Admin settings
    const adminSettings = {
      minWithdrawal: 200,
      maxWithdrawal: 10000,
      dailyWithdrawalLimit: 5000,
      taskRewardMultiplier: 1.0,
      referralBonus: 100,
      vipEnabled: true,
      maintenanceMode: false,
      updatedAt: new Date().toISOString()
    };

    // Default tasks
    const defaultTasks = {
      'daily_checkin': {
        id: 'daily_checkin',
        title: 'Daily Check-in',
        description: 'Check in daily to earn coins',
        reward: 50,
        type: 'daily',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      'invite_friend': {
        id: 'invite_friend',
        title: 'Invite a Friend',
        description: 'Invite friends to earn bonus coins',
        reward: 100,
        type: 'referral',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      'watch_ad': {
        id: 'watch_ad',
        title: 'Watch Advertisement',
        description: 'Watch an ad to earn coins',
        reward: 25,
        type: 'ad',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    };

    // Write to Firebase
    await db.ref('config/features').set(features);
    console.log('✅ Features enabled');

    await db.ref('config/admin_settings').set(adminSettings);
    console.log('✅ Admin settings configured');

    await db.ref('tasks').set(defaultTasks);
    console.log('✅ Default tasks created');

    // Set minimal data capture rules
    const dataPolicy = {
      allowedUserFields: ['id', 'username', 'first_name'],
      forbiddenFields: ['last_name', 'photo_url', 'is_premium', 'language_code'],
      storeInitData: false,
      storeDeviceInfo: false,
      updatedAt: new Date().toISOString()
    };

    await db.ref('config/data_policy').set(dataPolicy);
    console.log('✅ Minimal data capture policy set');

    console.log('🎉 All features enabled successfully!');
    console.log('📊 Feature status:', features);
    
  } catch (error) {
    console.error('❌ Failed to enable features:', error);
    process.exit(1);
  }
}

// Run the script
enableFeatures().then(() => {
  console.log('✨ Script completed successfully');
  process.exit(0);
});