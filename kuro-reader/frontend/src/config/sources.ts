/**
 * SOURCES CONFIG - Configurazione sources con offuscamento anti-scraping
 */

// ========== TYPES ==========

export type SourceCode = 'm' | 'ma';

interface BaseUrls {
  readonly m: string;
  readonly ma: string;
}

// ========== CONFIG ==========

const BASE_URLS: BaseUrls = {
  m: atob('aHR0cHM6Ly93d3cubWFuZ2F3b3JsZC5jeA=='),
  ma: atob('aHR0cHM6Ly93d3cubWFuZ2F3b3JsZGFkdWx0Lm5ldA==')
} as const;

const CDN_PATTERN: string = atob('Y2RuLm1hbmdhd29ybGQ=');

// ========== EXPORTS ==========

export const getBaseUrl = (sourceCode: SourceCode): string => BASE_URLS[sourceCode];

export const getCdnPattern = (): string => CDN_PATTERN;

export default { getBaseUrl, getCdnPattern };

