import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { config } from '../config';

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
  requestId?: string;
}

// Error handling middleware
export const errorHandler = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    // Generate request ID for tracking
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
    c.header('x-request-id', requestId);
    
    // Handle different error types
    if (error instanceof HTTPException) {
      const response: ErrorResponse = {
        error: {
          message: error.message,
          code: `HTTP_${error.status}`,
        },
        timestamp: new Date().toISOString(),
        path: c.req.path,
        requestId,
      };
      
      return c.json(response, error.status);
    }
    
    if (error instanceof ZodError) {
      const response: ErrorResponse = {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        },
        timestamp: new Date().toISOString(),
        path: c.req.path,
        requestId,
      };
      
      return c.json(response, 400);
    }
    
    // Database errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      const response: ErrorResponse = {
        error: {
          message: 'Resource already exists',
          code: 'DUPLICATE_ERROR',
        },
        timestamp: new Date().toISOString(),
        path: c.req.path,
        requestId,
      };
      
      return c.json(response, 409);
    }
    
    // Log unexpected errors
    console.error('[Error]', {
      requestId,
      path: c.req.path,
      method: c.req.method,
      error: error instanceof Error ? {
        message: error.message,
        stack: config.isDev ? error.stack : undefined,
      } : error,
    });
    
    // Generic error response
    const response: ErrorResponse = {
      error: {
        message: config.isDev && error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        details: config.isDev ? error : undefined,
      },
      timestamp: new Date().toISOString(),
      path: c.req.path,
      requestId,
    };
    
    return c.json(response, 500);
  }
});

// Request logging middleware
export const requestLogger = createMiddleware(async (c, next) => {
  const start = performance.now();
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
  
  c.header('x-request-id', requestId);
  
  // Log request
  if (config.isDev) {
    console.log('[Request]', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
      ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
  }
  
  await next();
  
  // Log response
  const duration = performance.now() - start;
  
  c.header('x-response-time', `${duration.toFixed(2)}ms`);
  
  if (config.isDev) {
    console.log('[Response]', {
      requestId,
      status: c.res.status,
      duration: `${duration.toFixed(2)}ms`,
    });
  }
});

// Security headers middleware
export const securityHeaders = createMiddleware(async (c, next) => {
  // Security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (config.isProd) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  await next();
});