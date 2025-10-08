const isDevelopment = import.meta.env.DEV;

export const config = {
  API_URL: isDevelopment 
    ? 'http://localhost:10000' 
    : 'https://kuro-auth-backend.onrender.com',
  PROXY_URL: isDevelopment 
    ? 'http://localhost:10001' 
    : 'https://kuro-proxy-server.onrender.com'
};
