import { EventEmitter } from 'events';

// Monitoring service for sync jobs and system health
export class MonitoringService extends EventEmitter {
  private metrics: Map<string, any> = new Map();
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private alertThresholds: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeDefaultMetrics();
    this.setupHealthChecks();
  }

  private initializeDefaultMetrics() {
    this.metrics.set('sync_jobs_total', 0);
    this.metrics.set('sync_jobs_successful', 0);
    this.metrics.set('sync_jobs_failed', 0);
    this.metrics.set('sync_job_duration_avg', 0);
    this.metrics.set('database_connections', 0);
    this.metrics.set('api_requests_total', 0);
    this.metrics.set('api_errors_total', 0);
    this.metrics.set('punch_clock_entries_today', 0);
    this.metrics.set('last_sync_timestamp', new Date());
  }

  private setupHealthChecks() {
    // Database health check
    this.healthChecks.set('database', async () => {
      try {
        // Simple database connectivity check
        return true; // Placeholder - should check actual DB connection
      } catch (error) {
        console.error('Database health check failed:', error);
        return false;
      }
    });

    // QuickBooks integration health check
    this.healthChecks.set('quickbooks', async () => {
      try {
        const hasCredentials = !!(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET);
        return hasCredentials;
      } catch (error) {
        console.error('QuickBooks health check failed:', error);
        return false;
      }
    });

    // Sync scheduler health check
    this.healthChecks.set('sync_scheduler', async () => {
      try {
        // Check if sync scheduler is responding
        return true; // Should check actual scheduler status
      } catch (error) {
        console.error('Sync scheduler health check failed:', error);
        return false;
      }
    });
  }

  // Record metrics for sync jobs
  recordSyncJob(provider: string, success: boolean, duration: number, error?: string) {
    this.metrics.set('sync_jobs_total', (this.metrics.get('sync_jobs_total') || 0) + 1);
    
    if (success) {
      this.metrics.set('sync_jobs_successful', (this.metrics.get('sync_jobs_successful') || 0) + 1);
    } else {
      this.metrics.set('sync_jobs_failed', (this.metrics.get('sync_jobs_failed') || 0) + 1);
      this.emit('sync_job_failed', { provider, error, timestamp: new Date() });
    }

    // Update average duration
    const currentAvg = this.metrics.get('sync_job_duration_avg') || 0;
    const totalJobs = this.metrics.get('sync_jobs_total');
    const newAvg = ((currentAvg * (totalJobs - 1)) + duration) / totalJobs;
    this.metrics.set('sync_job_duration_avg', newAvg);

    this.metrics.set('last_sync_timestamp', new Date());

    // Emit alerts if thresholds exceeded
    this.checkAlertThresholds();

    console.log(`📊 Sync Job Recorded: ${provider} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
  }

  // Record API request metrics
  recordApiRequest(endpoint: string, method: string, statusCode: number, duration: number) {
    this.metrics.set('api_requests_total', (this.metrics.get('api_requests_total') || 0) + 1);
    
    if (statusCode >= 400) {
      this.metrics.set('api_errors_total', (this.metrics.get('api_errors_total') || 0) + 1);
      this.emit('api_error', { endpoint, method, statusCode, timestamp: new Date() });
    }
  }

  // Record punch clock activities
  recordPunchClockActivity(action: string, userId: string) {
    if (action === 'clock_in' || action === 'clock_out') {
      const today = new Date().toDateString();
      const key = `punch_clock_${today}`;
      this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
      this.metrics.set('punch_clock_entries_today', this.metrics.get(key));
    }
  }

  // Get current metrics
  getMetrics(): Record<string, any> {
    const metricsObj: Record<string, any> = {};
    for (const [key, value] of this.metrics) {
      metricsObj[key] = value;
    }
    return metricsObj;
  }

  // Perform comprehensive health check
  async performHealthCheck(): Promise<{ status: string; checks: Record<string, boolean>; timestamp: string }> {
    const checks: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, checkFn] of this.healthChecks) {
      try {
        checks[name] = await checkFn();
        if (!checks[name]) allHealthy = false;
      } catch (error) {
        checks[name] = false;
        allHealthy = false;
        console.error(`Health check failed for ${name}:`, error);
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    };
  }

  // Setup alert thresholds
  setAlertThreshold(metric: string, threshold: any) {
    this.alertThresholds.set(metric, threshold);
  }

  private checkAlertThresholds() {
    // Check sync job failure rate
    const totalJobs = this.metrics.get('sync_jobs_total') || 0;
    const failedJobs = this.metrics.get('sync_jobs_failed') || 0;
    const failureRate = totalJobs > 0 ? failedJobs / totalJobs : 0;

    if (failureRate > 0.2 && totalJobs > 5) { // 20% failure rate with minimum 5 jobs
      this.emit('high_failure_rate', { 
        rate: failureRate, 
        failed: failedJobs, 
        total: totalJobs,
        timestamp: new Date()
      });
    }

    // Check if no sync in last hour
    const lastSync = this.metrics.get('last_sync_timestamp');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastSync < oneHourAgo) {
      this.emit('sync_stalled', { 
        lastSync, 
        timestamp: new Date()
      });
    }
  }

  // Generate monitoring report
  generateReport(): string {
    const metrics = this.getMetrics();
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return `
📊 SYSTEM MONITORING REPORT
=========================
Generated: ${new Date().toISOString()}
Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m

🔄 SYNC JOBS
Total: ${metrics.sync_jobs_total || 0}
Successful: ${metrics.sync_jobs_successful || 0}  
Failed: ${metrics.sync_jobs_failed || 0}
Avg Duration: ${Math.round(metrics.sync_job_duration_avg || 0)}ms
Last Sync: ${metrics.last_sync_timestamp}

🌐 API PERFORMANCE  
Total Requests: ${metrics.api_requests_total || 0}
Total Errors: ${metrics.api_errors_total || 0}
Error Rate: ${((metrics.api_errors_total || 0) / (metrics.api_requests_total || 1) * 100).toFixed(2)}%

⏰ PUNCH CLOCK
Entries Today: ${metrics.punch_clock_entries_today || 0}

💾 SYSTEM RESOURCES
Memory Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB
Memory Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB
    `.trim();
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// Setup alert handlers
monitoring.on('sync_job_failed', (data) => {
  console.error(`🚨 ALERT: Sync job failed for ${data.provider} - ${data.error}`);
});

monitoring.on('high_failure_rate', (data) => {
  console.error(`🚨 ALERT: High sync failure rate detected: ${(data.rate * 100).toFixed(1)}% (${data.failed}/${data.total})`);
});

monitoring.on('sync_stalled', (data) => {
  console.error(`🚨 ALERT: No sync activity detected since ${data.lastSync}`);
});

monitoring.on('api_error', (data) => {
  console.error(`🚨 ALERT: API error - ${data.method} ${data.endpoint} returned ${data.statusCode}`);
});

// Setup default alert thresholds
monitoring.setAlertThreshold('sync_failure_rate', 0.2);
monitoring.setAlertThreshold('sync_max_duration', 30000); // 30 seconds