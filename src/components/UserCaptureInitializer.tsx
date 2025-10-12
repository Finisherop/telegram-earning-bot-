'use client';

import { useEffect } from 'react';

/**
 * User Capture Initializer Component
 * 
 * Simplified version - user capture is now handled by AppInitializer.
 */
const UserCaptureInitializer = () => {
  useEffect(() => {
    console.log('[UserCaptureInitializer] Simplified version - user capture handled by AppInitializer');
  }, []);

  // This component doesn't render anything
  return null;
};

export default UserCaptureInitializer;