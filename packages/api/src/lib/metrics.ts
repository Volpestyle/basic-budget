import { Context } from 'hono';

interface Metrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  responseTimes: number[];
  endpoints: Map<string, EndpointMetrics>;
}

interface EndpointMetrics {
  count: number;
  errors: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
}

class MetricsCollector {
  private metrics: Metrics = {
    requestCount: 0,
    errorCount: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    responseTimes: [],
    endpoints: new Map(),
  };
  
  private readonly maxSamples = 10000;
  
  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number
  ) {
    this.metrics.requestCount++;
    
    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }
    
    // Update response times
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > this.maxSamples) {
      this.metrics.responseTimes.shift();
    }
    
    // Update endpoint metrics
    const key = `${method} ${path}`;
    const endpoint = this.metrics.endpoints.get(key) || {
      count: 0,
      errors: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
    };
    
    endpoint.count++;
    if (statusCode >= 400) endpoint.errors++;
    endpoint.totalTime += responseTime;
    endpoint.avgTime = endpoint.totalTime / endpoint.count;
    endpoint.minTime = Math.min(endpoint.minTime, responseTime);
    endpoint.maxTime = Math.max(endpoint.maxTime, responseTime);
    
    this.metrics.endpoints.set(key, endpoint);
    
    // Update percentiles
    this.updatePercentiles();
  }
  
  private updatePercentiles() {
    if (this.metrics.responseTimes.length === 0) return;
    
    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.metrics.avgResponseTime = 
      sorted.reduce((sum, time) => sum + time, 0) / len;
    
    this.metrics.p95ResponseTime = sorted[Math.floor(len * 0.95)];
    this.metrics.p99ResponseTime = sorted[Math.floor(len * 0.99)];
  }
  
  getMetrics() {
    return {
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.requestCount > 0 
        ? (this.metrics.errorCount / this.metrics.requestCount) * 100 
        : 0,
      avgResponseTime: Math.round(this.metrics.avgResponseTime * 100) / 100,
      p95ResponseTime: Math.round(this.metrics.p95ResponseTime * 100) / 100,
      p99ResponseTime: Math.round(this.metrics.p99ResponseTime * 100) / 100,
      topEndpoints: this.getTopEndpoints(),
    };
  }
  
  private getTopEndpoints(limit = 10) {
    return Array.from(this.metrics.endpoints.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([endpoint, metrics]) => ({
        endpoint,
        count: metrics.count,
        avgTime: Math.round(metrics.avgTime * 100) / 100,
        minTime: Math.round(metrics.minTime * 100) / 100,
        maxTime: Math.round(metrics.maxTime * 100) / 100,
        errorRate: metrics.count > 0 
          ? Math.round((metrics.errors / metrics.count) * 10000) / 100
          : 0,
      }));
  }
  
  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      responseTimes: [],
      endpoints: new Map(),
    };
  }
}

export const metrics = new MetricsCollector();

// Middleware to collect metrics
export function metricsMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const start = performance.now();
    
    await next();
    
    const responseTime = performance.now() - start;
    const method = c.req.method;
    const path = c.req.routePath || c.req.path;
    const statusCode = c.res.status;
    
    metrics.recordRequest(method, path, statusCode, responseTime);
    
    // Add timing header
    c.header('X-Response-Time', `${responseTime.toFixed(2)}ms`);
  };
}

// Endpoint to expose metrics
export function createMetricsEndpoint() {
  return (c: Context) => {
    return c.json(metrics.getMetrics());
  };
}