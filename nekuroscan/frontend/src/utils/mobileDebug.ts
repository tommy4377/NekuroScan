/**
 * MOBILE DEBUG - Utility per debug su mobile
 * Logga informazioni utili per diagnosticare problemi su dispositivi mobili
 */

export const mobileDebug = {
  logDeviceInfo: () => {
    if (typeof window === 'undefined') return;
    
    console.log('📱 [Mobile Debug] Device Info:');
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - Platform:', navigator.platform);
    console.log('  - Screen:', `${window.screen.width}x${window.screen.height}`);
    console.log('  - Viewport:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('  - Pixel Ratio:', window.devicePixelRatio);
    console.log('  - Touch Support:', 'ontouchstart' in window);
    console.log('  - Online:', navigator.onLine);
    console.log('  - Service Worker:', 'serviceWorker' in navigator);
    console.log('  - LocalStorage:', typeof Storage !== 'undefined');
    console.log('  - IndexedDB:', 'indexedDB' in window);
  },
  
  logReactRoot: () => {
    const root = document.getElementById('root');
    if (root) {
      console.log('✅ [Mobile Debug] Root element found:', root);
      console.log('  - Children:', root.children.length);
      console.log('  - InnerHTML length:', root.innerHTML.length);
    } else {
      console.error('❌ [Mobile Debug] Root element NOT found!');
    }
  },
  
  logErrors: () => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args: any[]) => {
      console.log('🚨 [Mobile Debug] ERROR:', ...args);
      originalError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      console.log('⚠️ [Mobile Debug] WARN:', ...args);
      originalWarn.apply(console, args);
    };
  },
  
  checkInitialization: () => {
    setTimeout(() => {
      console.log('🔍 [Mobile Debug] Initialization Check:');
      const root = document.getElementById('root');
      
      if (!root) {
        console.error('❌ Root element not found!');
        return;
      }
      
      if (root.children.length === 0) {
        console.error('❌ Root has no children! App might not be rendering.');
        console.log('  - Root innerHTML:', root.innerHTML.substring(0, 200));
      } else {
        console.log('✅ Root has children:', root.children.length);
      }
      
      // Check for React errors in the DOM
      const errorElements = document.querySelectorAll('[data-react-error]');
      if (errorElements.length > 0) {
        console.error('❌ React errors detected in DOM:', errorElements.length);
      }
    }, 2000);
  }
};

// Auto-log on import (only in development)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.addEventListener('DOMContentLoaded', () => {
    mobileDebug.logDeviceInfo();
    mobileDebug.logReactRoot();
    mobileDebug.logErrors();
    mobileDebug.checkInitialization();
  });
}

