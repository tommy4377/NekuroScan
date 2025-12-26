// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ HTTP Connection Pooling per Performance
import https from 'https';
import http from 'http';
import axios from 'axios';

export const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
  scheduling: 'lifo',
  rejectUnauthorized: true
});

export const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
  scheduling: 'lifo'
});

export const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 30000,
  maxRedirects: 10,
  maxContentLength: 50 * 1024 * 1024,
  validateStatus: (status) => status < 600,
  decompress: true,
  
  headers: {
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  }
});

export const axiosImageInstance = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 60000,
  maxRedirects: 5,
  maxContentLength: 10 * 1024 * 1024,
  responseType: 'arraybuffer',
  validateStatus: (status) => status < 600,
  decompress: true,
  
  headers: {
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'DNT': '1'
  }
});

export function getPoolStats() {
  return {
    https: {
      sockets: Object.keys(httpsAgent.sockets || {}).length,
      freeSockets: Object.keys(httpsAgent.freeSockets || {}).length,
      requests: Object.keys(httpsAgent.requests || {}).length
    },
    http: {
      sockets: Object.keys(httpAgent.sockets || {}).length,
      freeSockets: Object.keys(httpAgent.freeSockets || {}).length,
      requests: Object.keys(httpAgent.requests || {}).length
    }
  };
}

export function destroyPool() {
  httpsAgent.destroy();
  httpAgent.destroy();
  console.log('🔌 HTTP pool destroyed');
}

process.on('SIGTERM', destroyPool);
process.on('SIGINT', destroyPool);

export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  const { retryDelay = 1000, ...axiosOptions } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axiosInstance({
        url,
        ...axiosOptions
      });
      
      if (response.status < 400) {
        return response;
      }
      
      if ((response.status === 403 || response.status === 429) && attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
      
    } catch (error) {
      if (attempt < maxRetries && 
          (error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND')) {
        
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error(`Max retries (${maxRetries}) reached for ${url}`);
}

export async function fetchImage(url, userAgent, referer) {
  return fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'User-Agent': userAgent,
      'Referer': referer || '',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    },
    responseType: 'arraybuffer',
    httpAgent,
    httpsAgent
  }, 2);
}

export default {
  httpsAgent,
  httpAgent,
  axiosInstance,
  axiosImageInstance,
  getPoolStats,
  destroyPool,
  fetchWithRetry,
  fetchImage
};

