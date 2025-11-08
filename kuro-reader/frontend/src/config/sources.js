// Configurazione sources offuscata per anti-scraping
const BASE_URLS = {
  m: atob('aHR0cHM6Ly93d3cubWFuZ2F3b3JsZC5jeA=='),
  ma: atob('aHR0cHM6Ly93d3cubWFuZ2F3b3JsZGFkdWx0Lm5ldA==')
};

const CDN_PATTERN = atob('Y2RuLm1hbmdhd29ybGQ=');

export const getBaseUrl = (sourceCode) => BASE_URLS[sourceCode];
export const getCdnPattern = () => CDN_PATTERN;

export default { getBaseUrl, getCdnPattern };

