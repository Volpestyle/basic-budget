import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { env } from '@/config/env';
import { metricsMiddleware, createMetricsEndpoint } from '@/lib/metrics';

// Import routes
import authRoutes from '@/routes/auth';
import budgetRoutes from '@/routes/budgets';
import transactionRoutes from '@/routes/transactions';
import plaidRoutes from '@/routes/plaid';
import paystubRoutes from '@/routes/paystubs';

// Create main app
const app = new Hono();

// Global middleware - Order matters for performance
app.use('*', timing()); // Track request timing
app.use('*', metricsMiddleware()); // Collect performance metrics

// Security headers
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", env.FRONTEND_URL],
  },
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// CORS configuration
app.use('*', cors({
  origin: [env.FRONTEND_URL],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Anonymous-Id'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Compression
app.use('*', compress({
  encoding: 'gzip',
}));

// Request logging (only in development)
if (env.NODE_ENV === 'development') {
  app.use('*', logger());
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Metrics endpoint (protected in production)
app.get('/metrics', (c) => {
  // In production, add authentication
  if (env.NODE_ENV === 'production') {
    const token = c.req.header('X-Metrics-Token');
    if (token !== env.METRICS_TOKEN) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  return createMetricsEndpoint()(c);
});

// API routes
app.route('/auth', authRoutes);
app.route('/budgets', budgetRoutes);
app.route('/transactions', transactionRoutes);
app.route('/plaid', plaidRoutes);
app.route('/paystubs', paystubRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource does not exist',
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  
  // Don't expose internal errors in production
  if (env.NODE_ENV === 'production') {
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
  
  return c.json(
    {
      error: err.name || 'Error',
      message: err.message,
      stack: err.stack,
    },
    500
  );
});

// Export for different deployment targets
export default app;

// Lambda handler for AWS
export const handler = app.fetch;

// Start server if running directly with Bun
if (import.meta.main) {
  const port = env.PORT || 3001;
  
  console.log(`🚀 API server starting...`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 URL: http://localhost:${port}`);
  console.log(`⚡ Runtime: Bun ${Bun.version}`);
  
  Bun.serve({
    port,
    fetch: app.fetch,
    // Enable HTTP/2
    development: env.NODE_ENV === 'development',
    // Optimize for production
    ...(env.NODE_ENV === 'production' && {
      maxRequestBodySize: 10 * 1024 * 1024, // 10MB
      lowMemoryMode: false,
    }),
  });
  
  console.log(`✅ Server is running!`);
}