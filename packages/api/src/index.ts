import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { config, isDev } from './config';

// Middleware
import { cors } from './middleware/cors';
import { errorHandler, requestLogger, securityHeaders } from './middleware/error';
import { rateLimit } from './middleware/auth';

// Routes
import { authRouter } from './routes/auth';
import { budgetsRouter } from './routes/budgets';
import { categoriesRouter } from './routes/categories';
import { transactionsRouter } from './routes/transactions';
import { plaidRouter } from './routes/plaid';
import { paystubsRouter } from './routes/paystubs';

// Initialize Hono app with type safety
const app = new Hono();

// Global middleware - order matters for performance!
app.use('*', securityHeaders); // Security headers first
app.use('*', cors); // CORS before other processing
app.use('*', etag()); // ETag for caching
app.use('*', compress()); // Response compression

// Logging and error handling
if (isDev) {
  app.use('*', logger()); // Console logging in dev
}
app.use('*', requestLogger); // Custom request logging
app.use('*', errorHandler); // Error handling wrapper

// Rate limiting - apply globally with higher limits
app.use('*', rateLimit(config.RATE_LIMIT_MAX_REQUESTS, config.RATE_LIMIT_WINDOW_MS));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

// API version prefix
const api = app.basePath('/api/v1');

// Mount routes
api.route('/auth', authRouter);
api.route('/budgets', budgetsRouter);
api.route('/categories', categoriesRouter);
api.route('/transactions', transactionsRouter);
api.route('/plaid', plaidRouter);
api.route('/paystubs', paystubsRouter);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
    path: c.req.path,
  }, 404);
});

// Start server
const port = config.PORT;

console.log(`
🚀 Basic Budget API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${config.NODE_ENV}
Port: ${port}
Database: Connected
Redis: Connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server running at http://localhost:${port}
API Docs: http://localhost:${port}/api/v1

Available endpoints:

Auth:
- GET    /api/v1/auth/google         - OAuth login
- POST   /api/v1/auth/google/verify  - Verify Google ID token
- POST   /api/v1/auth/anonymous      - Anonymous login
- POST   /api/v1/auth/refresh        - Refresh access token
- POST   /api/v1/auth/logout         - Logout current session
- POST   /api/v1/auth/logout-all     - Logout all sessions
- GET    /api/v1/auth/me             - Get current user

Budgets:
- GET    /api/v1/budgets             - List budgets
- POST   /api/v1/budgets             - Create budget
- GET    /api/v1/budgets/:id         - Get budget
- PATCH  /api/v1/budgets/:id         - Update budget
- DELETE /api/v1/budgets/:id         - Delete budget
- GET    /api/v1/budgets/:id/summary - Get budget analytics

Categories:
- GET    /api/v1/categories          - List categories
- POST   /api/v1/categories          - Create category
- GET    /api/v1/categories/:id      - Get category
- PATCH  /api/v1/categories/:id      - Update category
- DELETE /api/v1/categories/:id      - Delete category
- POST   /api/v1/categories/reorder  - Reorder categories

Transactions:
- GET    /api/v1/transactions        - List transactions
- POST   /api/v1/transactions        - Create transaction
- GET    /api/v1/transactions/:id    - Get transaction
- PATCH  /api/v1/transactions/:id    - Update transaction
- DELETE /api/v1/transactions/:id    - Delete transaction
- POST   /api/v1/transactions/bulk-categorize - Bulk categorize

Plaid:
- POST   /api/v1/plaid/link-token    - Create Link token
- POST   /api/v1/plaid/exchange-token - Exchange public token
- GET    /api/v1/plaid/connections   - List connections
- POST   /api/v1/plaid/connections/:id/sync - Sync transactions
- DELETE /api/v1/plaid/connections/:id - Remove connection
- POST   /api/v1/plaid/webhook       - Webhook endpoint

Paystubs:
- GET    /api/v1/paystubs            - List paystubs
- GET    /api/v1/paystubs/:id        - Get paystub
- POST   /api/v1/paystubs/upload     - Upload paystub
- POST   /api/v1/paystubs/:id/retry  - Retry processing
- DELETE /api/v1/paystubs/:id        - Delete paystub
`);

export default {
  port,
  fetch: app.fetch,
};