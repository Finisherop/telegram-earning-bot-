/**
 * Firebase Configuration Validator
 * 
 * Validates Firebase configuration and provides detailed diagnostics
 * Helps identify configuration issues that prevent writes
 */

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: FirebaseConfig;
  projectInfo?: {
    projectId: string;
    databaseRegion: string;
    expectedDatabaseURL: string;
  };
}

export class FirebaseConfigValidator {
  private static instance: FirebaseConfigValidator;

  private constructor() {}

  public static getInstance(): FirebaseConfigValidator {
    if (!FirebaseConfigValidator.instance) {
      FirebaseConfigValidator.instance = new FirebaseConfigValidator();
    }
    return FirebaseConfigValidator.instance;
  }

  /**
   * Validate Firebase configuration
   */
  public validateConfig(): ValidationResult {
    console.log('[Enhanced Firebase Debug] 🔍 Validating Firebase configuration...');

    const config: FirebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.apiKey) {
      errors.push('Missing NEXT_PUBLIC_FIREBASE_API_KEY');
    }

    if (!config.projectId) {
      errors.push('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }

    if (!config.databaseURL) {
      errors.push('Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL - This is critical for Realtime Database!');
    }

    if (!config.appId) {
      errors.push('Missing NEXT_PUBLIC_FIREBASE_APP_ID');
    }

    // Check optional but recommended fields
    if (!config.authDomain) {
      warnings.push('Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (optional but recommended)');
    }

    if (!config.storageBucket) {
      warnings.push('Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (optional)');
    }

    if (!config.messagingSenderId) {
      warnings.push('Missing NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (optional)');
    }

    // Validate databaseURL format
    if (config.databaseURL) {
      const databaseURLPattern = /^https:\/\/[\w-]+-default-rtdb\.(firebaseio\.com|asia-southeast1\.firebasedatabase\.app|europe-west1\.firebasedatabase\.app)\/$/;
      
      if (!databaseURLPattern.test(config.databaseURL)) {
        errors.push(`Invalid databaseURL format: ${config.databaseURL}. Expected format: https://PROJECT_ID-default-rtdb.firebaseio.com/ or regional variant`);
      }
    }

    // Validate projectId format
    if (config.projectId) {
      const projectIdPattern = /^[a-z0-9-]+$/;
      if (!projectIdPattern.test(config.projectId)) {
        errors.push(`Invalid projectId format: ${config.projectId}. Should contain only lowercase letters, numbers, and hyphens`);
      }
    }

    // Extract project info from databaseURL
    let projectInfo;
    if (config.databaseURL && config.projectId) {
      const urlMatch = config.databaseURL.match(/https:\/\/([\w-]+)-default-rtdb\.([\w.-]+)\//);
      if (urlMatch) {
        const [, urlProjectId, domain] = urlMatch;
        const region = domain === 'firebaseio.com' ? 'us-central1' : domain.split('.')[0];
        
        projectInfo = {
          projectId: config.projectId,
          databaseRegion: region,
          expectedDatabaseURL: config.databaseURL
        };

        if (urlProjectId !== config.projectId) {
          errors.push(`Project ID mismatch: databaseURL contains '${urlProjectId}' but projectId is '${config.projectId}'`);
        }
      }
    }

    const isValid = errors.length === 0;

    // Log results
    console.log('[Enhanced Firebase Debug] 📊 Configuration validation results:');
    console.log('[Enhanced Firebase Debug] ✅ Valid:', isValid);
    
    if (errors.length > 0) {
      console.error('[Enhanced Firebase Debug] ❌ Errors:', errors);
    }
    
    if (warnings.length > 0) {
      console.warn('[Enhanced Firebase Debug] ⚠️ Warnings:', warnings);
    }

    console.log('[Enhanced Firebase Debug] 📋 Current config:', {
      projectId: config.projectId,
      databaseURL: config.databaseURL,
      hasApiKey: !!config.apiKey,
      hasAppId: !!config.appId
    });

    return {
      isValid,
      errors,
      warnings,
      config,
      projectInfo
    };
  }

  /**
   * Generate configuration suggestions
   */
  public generateConfigSuggestions(projectId: string, region: string = 'us-central1'): FirebaseConfig {
    const regionSuffix = region === 'us-central1' ? 'firebaseio.com' : `${region}.firebasedatabase.app`;
    
    return {
      apiKey: 'YOUR_API_KEY_HERE',
      authDomain: `${projectId}.firebaseapp.com`,
      databaseURL: `https://${projectId}-default-rtdb.${regionSuffix}/`,
      projectId: projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
      messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
      appId: 'YOUR_APP_ID_HERE'
    };
  }

  /**
   * Test database connectivity
   */
  public async testDatabaseConnectivity(): Promise<boolean> {
    try {
      console.log('[Enhanced Firebase Debug] 🔗 Testing database connectivity...');

      const validation = this.validateConfig();
      if (!validation.isValid) {
        console.error('[Enhanced Firebase Debug] ❌ Cannot test connectivity: Invalid configuration');
        return false;
      }

      // Try to import Firebase modules
      const { initializeApp, getApps } = await import('firebase/app');
      const { getDatabase, ref, get } = await import('firebase/database');

      // Initialize app if needed
      let app;
      if (getApps().length === 0) {
        app = initializeApp(validation.config);
      } else {
        app = getApps()[0];
      }

      // Test database connection
      const database = getDatabase(app);
      const testRef = ref(database, '.info/connected');
      
      // This will throw if there's a connection issue
      await get(testRef);
      
      console.log('[Enhanced Firebase Debug] ✅ Database connectivity test passed');
      return true;
    } catch (error) {
      console.error('[Enhanced Firebase Debug] ❌ Database connectivity test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const firebaseConfigValidator = FirebaseConfigValidator.getInstance();

/**
 * Quick validation function
 */
export const validateFirebaseConfig = (): ValidationResult => {
  return firebaseConfigValidator.validateConfig();
};

/**
 * Test database connectivity
 */
export const testFirebaseConnectivity = (): Promise<boolean> => {
  return firebaseConfigValidator.testDatabaseConnectivity();
};

export default firebaseConfigValidator;