const isDevelopment = import.meta.env.DEV;

export const config = {
  API_URL: isDevelopment 
    ? 'http://localhost:10000' 
    : 'https://nekuro-auth-backend.onrender.com',
  PROXY_URL: isDevelopment 
    ? 'http://localhost:10001' 
    : 'https://nekuro-proxy-server.onrender.com'
};
