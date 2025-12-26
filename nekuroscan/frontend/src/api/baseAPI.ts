/**
 * BASE API - Shared API implementation
 * Common methods for all manga source APIs
 */

import { config } from '@/config';

// ========== TYPES ==========

interface ProxyRequest {
  url: string;
  headers: Record<string, string>;
}

interface ProxyResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ========== BASE API CLASS ==========

export abstract class BaseAPI {
  public readonly baseUrl: string;
  protected readonly maxRetries: number = 2;
  protected readonly timeout: number = 15000;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make proxied request with retry logic
   */
  protected async makeRequest<T = any>(url: string, retryCount: number = 0): Promise<T> {
    try {
      // Validate URL
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        throw new Error('Invalid URL');
      }
      
      const proxyRequest: ProxyRequest = {
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Referer': this.baseUrl
        }
      };
      
      // Build proxy URL: use relative path in production (Vercel rewrites), absolute in dev
      const proxyUrl = config.PROXY_URL 
        ? `${config.PROXY_URL}/api/proxy` 
        : '/api/proxy';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyRequest)
      });
      
      // Validate HTTP response
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          throw new Error(`RATE_LIMIT:${retryAfter}`);
        }
        
        if (response.status === 403) {
          throw new Error('BANNED:Access denied');
        }
        
        if (response.status === 502) {
          throw new Error('Source site is temporarily blocking requests. Retry in 1-2 minutes.');
        }
        
        if (response.status === 504) {
          throw new Error('Timeout: source server not responding');
        }
        
        if (response.status === 404) {
          throw new Error('Page not found');
        }
        
        if (response.status >= 500) {
          throw new Error('Server error');
        }
        
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: ProxyResponse<T> = await response.json();
      
      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid proxy response');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }
      
      if (!data.data) {
        throw new Error('Missing data in response');
      }
      
      return data.data;
      
    } catch (error: any) {
      // Retry logic for server errors
      if (retryCount < this.maxRetries && error?.message?.includes('server')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.makeRequest<T>(url, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Build full URL from path
   */
  protected buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}${cleanPath}`;
  }

  /**
   * Parse HTML string to Document
   */
  protected parseHTML(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  /**
   * Validate response data exists
   */
  protected validateData<T>(data: T | null | undefined, errorMessage: string = 'No data'): T {
    if (!data) {
      throw new Error(errorMessage);
    }
    return data;
  }
}

export default BaseAPI;

