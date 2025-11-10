/**
 * DIAGNOSTICS - System Health Check
 * Verifica connettività ai servizi backend e proxy
 * 
 * CREATED: 2025-11-10
 * Utility per diagnosticare problemi di connessione
 */

import { config } from '@/config';

// ========== TYPES ==========

export interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface DiagnosticReport {
  timestamp: number;
  services: ServiceStatus[];
  browser: {
    online: boolean;
    userAgent: string;
  };
  environment: {
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

// ========== DIAGNOSTICS ==========

/**
 * Test proxy connectivity
 */
export async function testProxyConnection(): Promise<ServiceStatus> {
  const startTime = Date.now();
  console.log('[Diagnostics] 🔍 Testing proxy connection...');
  
  try {
    const response = await fetch(`${config.PROXY_URL}/health`, {
      method: 'GET',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      console.log('[Diagnostics] ✅ Proxy online:', responseTime, 'ms');
      return {
        name: 'Proxy Server',
        url: config.PROXY_URL,
        status: 'online',
        responseTime,
        details: { statusCode: response.status }
      };
    } else {
      console.log('[Diagnostics] ⚠️ Proxy returned error:', response.status);
      return {
        name: 'Proxy Server',
        url: config.PROXY_URL,
        status: 'error',
        responseTime,
        error: `HTTP ${response.status}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('[Diagnostics] ❌ Proxy error:', error.message);
    
    return {
      name: 'Proxy Server',
      url: config.PROXY_URL,
      status: 'offline',
      responseTime,
      error: error.message || 'Connection failed'
    };
  }
}

/**
 * Test backend API connectivity
 */
export async function testBackendConnection(): Promise<ServiceStatus> {
  const startTime = Date.now();
  console.log('[Diagnostics] 🔍 Testing backend connection...');
  
  try {
    // ✅ FIX: Backend has /health endpoint (verified in auth-server.ts)
    const response = await fetch(`${config.API_URL}/health`, {
      method: 'GET',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    });
    
    const responseTime = Date.now() - startTime;
    
    // ✅ Health endpoint should return 200 if backend is online
    if (response.ok) {
      console.log('[Diagnostics] ✅ Backend online:', responseTime, 'ms');
      return {
        name: 'Backend API',
        url: config.API_URL,
        status: 'online',
        responseTime,
        details: { statusCode: response.status }
      };
    } else {
      console.log('[Diagnostics] ⚠️ Backend returned error:', response.status);
      return {
        name: 'Backend API',
        url: config.API_URL,
        status: 'error',
        responseTime,
        error: `HTTP ${response.status}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('[Diagnostics] ❌ Backend error:', error.message);
    
    return {
      name: 'Backend API',
      url: config.API_URL,
      status: 'offline',
      responseTime,
      error: error.message || 'Connection failed'
    };
  }
}

/**
 * Test manga API (через proxy)
 */
export async function testMangaAPI(): Promise<ServiceStatus> {
  const startTime = Date.now();
  console.log('[Diagnostics] 🔍 Testing manga API...');
  
  try {
    const response = await fetch(`${config.PROXY_URL}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.mangaworld.cx/',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Diagnostics] ✅ Manga API online:', responseTime, 'ms');
      
      return {
        name: 'Manga Source',
        url: 'https://www.mangaworld.cx/',
        status: 'online',
        responseTime,
        details: { 
          success: data.success,
          dataLength: data.data?.length || 0
        }
      };
    } else {
      console.log('[Diagnostics] ⚠️ Manga API returned error:', response.status);
      return {
        name: 'Manga Source',
        url: 'https://www.mangaworld.cx/',
        status: 'error',
        responseTime,
        error: `HTTP ${response.status}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('[Diagnostics] ❌ Manga API error:', error.message);
    
    return {
      name: 'Manga Source',
      url: 'https://www.mangaworld.cx/',
      status: 'offline',
      responseTime,
      error: error.message || 'Connection failed'
    };
  }
}

/**
 * Run full diagnostic report
 */
export async function runFullDiagnostics(): Promise<DiagnosticReport> {
  console.log('[Diagnostics] 🚀 Starting full diagnostics...');
  console.log('[Diagnostics] Environment:', config.isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION');
  console.log('[Diagnostics] API URL:', config.API_URL);
  console.log('[Diagnostics] Proxy URL:', config.PROXY_URL);
  console.log('[Diagnostics] Browser online:', navigator.onLine);
  
  const services = await Promise.all([
    testProxyConnection(),
    testBackendConnection(),
    testMangaAPI()
  ]);
  
  const report: DiagnosticReport = {
    timestamp: Date.now(),
    services,
    browser: {
      online: navigator.onLine,
      userAgent: navigator.userAgent
    },
    environment: {
      isDevelopment: config.isDevelopment,
      isProduction: config.isProduction
    }
  };
  
  console.log('[Diagnostics] 📊 Report:', report);
  
  // Print summary
  console.log('\n========== DIAGNOSTICS SUMMARY ==========');
  services.forEach(service => {
    const emoji = service.status === 'online' ? '✅' : service.status === 'error' ? '⚠️' : '❌';
    const time = service.responseTime ? `(${service.responseTime}ms)` : '';
    console.log(`${emoji} ${service.name}: ${service.status} ${time}`);
    if (service.error) {
      console.log(`   Error: ${service.error}`);
    }
  });
  console.log('=========================================\n');
  
  return report;
}

/**
 * Auto-run diagnostics on import (only in development)
 */
if (config.isDevelopment) {
  // Run diagnostics after 2 seconds in development
  setTimeout(() => {
    runFullDiagnostics().catch(err => {
      console.error('[Diagnostics] Failed to run diagnostics:', err);
    });
  }, 2000);
}

export default {
  testProxyConnection,
  testBackendConnection,
  testMangaAPI,
  runFullDiagnostics
};

