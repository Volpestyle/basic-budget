import { cors as honoCors } from 'hono/cors';
import { config } from '../config';

// Optimized CORS configuration
export const cors = honoCors({
  origin: (origin) => {
    // Allow requests without origin (e.g., mobile apps, Postman)
    if (!origin) return '*';
    
    // Check if origin is in allowed list
    if (config.ALLOWED_ORIGINS.includes(origin)) {
      return origin;
    }
    
    // In development, allow localhost with any port
    if (config.isDev && (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    )) {
      return origin;
    }
    
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Refresh-Token',
    'X-Request-Id',
    'X-Session-Id',
  ],
  exposeHeaders: [
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Response-Time',
  ],
  maxAge: 86400, // 24 hours
});