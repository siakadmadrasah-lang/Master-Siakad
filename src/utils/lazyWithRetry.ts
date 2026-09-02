import { lazy, ComponentType } from 'react';

/**
 * Robust lazy loading wrapper with automatic retry and cache busting on version updates.
 * Prevents "Failed to fetch dynamically imported module" errors when app updates.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const sessionKey = 'app_chunk_reload_attempt';
    
    try {
      const component = await componentImport();
      // Reset reload flag on successful load
      sessionStorage.removeItem(sessionKey);
      return component;
    } catch (error: any) {
      console.warn('Lazy chunk load failed, attempting retry...', error);
      
      // Attempt 1: Retry once after a brief 300ms delay
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const retryResult = await componentImport();
        sessionStorage.removeItem(sessionKey);
        return retryResult;
      } catch (secondError) {
        console.warn('Second attempt failed:', secondError);
      }

      // Attempt 2: Auto reload page once if chunk is stale
      const hasReloaded = sessionStorage.getItem(sessionKey);
      if (!hasReloaded) {
        sessionStorage.setItem(sessionKey, 'true');
        // Clear caches if available
        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch {
          // ignore cache clearing failure
        }
        window.location.reload();
        // Return a pending promise to prevent throwing while page is reloading
        return new Promise<{ default: T }>(() => {});
      }

      // If already reloaded and still failed, reset flag and throw to ErrorBoundary
      sessionStorage.removeItem(sessionKey);
      throw error;
    }
  });
}
