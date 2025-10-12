'use client';

import { useEffect } from 'react';

/**
 * Background Data Loader Component
 * 
 * Simplified version that doesn't perform any background tasks.
 * In the refactored version, all data loading is handled by AppInitializer.
 */
const BackgroundDataLoader = () => {
  useEffect(() => {
    console.log('[BackgroundDataLoader] Simplified version - no background tasks needed');
  }, []);

  // This component doesn't render anything
  return null;
};

export default BackgroundDataLoader;