import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Prometheus metrics for comprehensive monitoring
export class PrometheusMetrics {
  private metricsInitialized = false;

  // HTTP metrics
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestsInProgress: Gauge<string>;

  // Sync job metrics
  public syncJobsTotal: Counter<string>;
  public syncJobDuration: Histogram<string>;
  public syncJobsFailures: Counter<string>;

  // Database metrics
  public databaseConnectionsActive: Gauge<string>;
  public databaseQueryDuration: Histogram<string>;

  // Punch clock metrics
  public punchClockOperations: Counter<string>;
  public punchClockEntriesTotal: Gauge<string>;

  // System metrics
  public memoryUsage: Gauge<string>;
  public cpuUsage: Gauge<string>;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    try {
      // Collect default Node.js metrics (memory, CPU, etc.)
      collectDefaultMetrics({ register });

      // HTTP request metrics
      this.httpRequestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code']
      });

      this.httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
      });

      this.httpRequestsInProgress = new Gauge({
        name: 'http_requests_in_progress',
        help: 'Current number of HTTP requests being processed',
        labelNames: ['method', 'route']
      });

      // Sync job metrics
      this.syncJobsTotal = new Counter({
        name: 'sync_jobs_total',
        help: 'Total number of sync jobs executed',
        labelNames: ['provider', 'operation', 'status']
      });

      this.syncJobDuration = new Histogram({
        name: 'sync_job_duration_seconds',
        help: 'Duration of sync jobs in seconds',
        labelNames: ['provider', 'operation'],
        buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300]
      });

      this.syncJobsFailures = new Counter({
        name: 'sync_job_failures_total',
        help: 'Total number of sync job failures',
        labelNames: ['provider', 'operation', 'error_type']
      });

      // Database metrics
      this.databaseConnectionsActive = new Gauge({
        name: 'database_connections_active',
        help: 'Number of active database connections'
      });

      this.databaseQueryDuration = new Histogram({
        name: 'database_query_duration_seconds',
        help: 'Duration of database queries in seconds',
        labelNames: ['operation', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
      });

      // Punch clock metrics
      this.punchClockOperations = new Counter({
        name: 'punch_clock_operations_total',
        help: 'Total number of punch clock operations',
        labelNames: ['operation', 'user_id']
      });

      this.punchClockEntriesTotal = new Gauge({
        name: 'punch_clock_entries_total',
        help: 'Total number of punch clock entries'
      });

      // System resource metrics
      this.memoryUsage = new Gauge({
        name: 'nodejs_memory_usage_bytes',
        help: 'Node.js memory usage in bytes',
        labelNames: ['type']
      });

      this.cpuUsage = new Gauge({
        name: 'nodejs_cpu_usage_percent',
        help: 'Node.js CPU usage percentage'
      });

      // Register all metrics
      register.registerMetric(this.httpRequestsTotal);
      register.registerMetric(this.httpRequestDuration);
      register.registerMetric(this.httpRequestsInProgress);
      register.registerMetric(this.syncJobsTotal);
      register.registerMetric(this.syncJobDuration);
      register.registerMetric(this.syncJobsFailures);
      register.registerMetric(this.databaseConnectionsActive);
      register.registerMetric(this.databaseQueryDuration);
      register.registerMetric(this.punchClockOperations);
      register.registerMetric(this.punchClockEntriesTotal);
      register.registerMetric(this.memoryUsage);
      register.registerMetric(this.cpuUsage);

      this.metricsInitialized = true;
      console.log('✅ Prometheus metrics initialized successfully');

      // Start updating system metrics periodically
      this.startSystemMetricsCollection();

    } catch (error) {
      console.error('❌ Failed to initialize Prometheus metrics:', error);
      this.metricsInitialized = false;
    }
  }

  // Record HTTP request
  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    if (!this.metricsInitialized) return;

    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);
  }

  // Record sync job
  recordSyncJob(provider: string, operation: string, success: boolean, durationMs: number, errorType?: string) {
    if (!this.metricsInitialized) return;

    const status = success ? 'success' : 'failure';
    
    this.syncJobsTotal.inc({ provider, operation, status });
    this.syncJobDuration.observe({ provider, operation }, durationMs / 1000);
    
    if (!success && errorType) {
      this.syncJobsFailures.inc({ provider, operation, error_type: errorType });
    }
  }

  // Record database query
  recordDatabaseQuery(operation: string, table: string, durationMs: number) {
    if (!this.metricsInitialized) return;

    this.databaseQueryDuration.observe({ operation, table }, durationMs / 1000);
  }

  // Record punch clock operation
  recordPunchClockOperation(operation: string, userId: string) {
    if (!this.metricsInitialized) return;

    this.punchClockOperations.inc({ operation, user_id: userId });
  }

  // Update punch clock entries count
  updatePunchClockEntriesCount(count: number) {
    if (!this.metricsInitialized) return;

    this.punchClockEntriesTotal.set(count);
  }

  // Update database connections count
  updateDatabaseConnections(count: number) {
    if (!this.metricsInitialized) return;

    this.databaseConnectionsActive.set(count);
  }

  // Get metrics in Prometheus format
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Start collecting system metrics
  private startSystemMetricsCollection() {
    setInterval(() => {
      if (!this.metricsInitialized) return;

      // Update memory usage
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

      // CPU usage is collected by default metrics
    }, 10000); // Update every 10 seconds
  }

  // Express middleware for request tracking
  requestTrackingMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.metricsInitialized) return next();

      const startTime = Date.now();
      const route = req.route?.path || req.path || 'unknown';
      
      // Track request in progress
      this.httpRequestsInProgress.inc({ method: req.method, route });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Record completed request
        this.recordHttpRequest(req.method, route, res.statusCode, duration);
        
        // Decrease in-progress counter
        this.httpRequestsInProgress.dec({ method: req.method, route });
      });

      next();
    };
  }

  // Health check for metrics system
  isHealthy(): boolean {
    return this.metricsInitialized;
  }
}

// Export singleton instance
export const prometheusMetrics = new PrometheusMetrics();