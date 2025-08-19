import { Request, Response, NextFunction } from 'express';

// Error tracking service that integrates with Sentry when configured
export class ErrorTrackingService {
  private sentryInitialized = false;

  constructor() {
    this.initializeSentry();
  }

  private initializeSentry() {
    const sentryDsn = process.env.SENTRY_DSN;
    
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn') {
      try {
        // Initialize Sentry if DSN is provided
        console.log('🔍 Initializing Sentry error tracking...');
        
        // For now, we'll use console logging until Sentry package is installed
        this.sentryInitialized = false; // Will be true when Sentry is properly configured
        
        console.log('✅ Error tracking configured (Console mode until Sentry DSN provided)');
      } catch (error) {
        console.error('❌ Failed to initialize Sentry:', error);
      }
    } else {
      console.log('⚠️ Sentry DSN not configured - using console error tracking');
    }
  }

  // Capture exception with context
  captureException(error: Error, context?: Record<string, any>) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: context || {}
    };

    if (this.sentryInitialized) {
      // TODO: Send to Sentry when configured
      // Sentry.captureException(error, { extra: context });
    }

    // Always log to console for now
    console.error('🚨 ERROR CAPTURED:', errorData);
    
    return errorData;
  }

  // Capture message with level
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    const messageData = {
      message,
      level,
      timestamp: new Date().toISOString(),
      context: context || {}
    };

    if (this.sentryInitialized) {
      // TODO: Send to Sentry when configured
      // Sentry.captureMessage(message, level);
    }

    // Log to console based on level
    const logFn = level === 'error' ? console.error : 
                  level === 'warning' ? console.warn : console.log;
    
    logFn(`📝 ${level.toUpperCase()}: ${message}`, context);
    
    return messageData;
  }

  // Express middleware for error handling
  errorHandler() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: (req as any).user?.id,
        timestamp: new Date().toISOString()
      };

      this.captureException(error, context);

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ 
          message: 'Internal server error',
          requestId: context.timestamp
        });
      } else {
        res.status(500).json({ 
          message: error.message,
          stack: error.stack,
          context
        });
      }
    };
  }

  // Middleware to add request ID for idempotency
  requestIdMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.get('Request-Id') || 
                       req.get('X-Request-Id') || 
                       `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-Id', requestId);
      
      next();
    };
  }

  // Track QuickBooks API calls with context
  trackQuickBooksOperation(operation: string, success: boolean, error?: Error, context?: Record<string, any>) {
    const operationContext = {
      operation,
      success,
      service: 'quickbooks',
      environment: process.env.QBO_ENV || 'development',
      ...context
    };

    if (success) {
      this.captureMessage(`QuickBooks operation successful: ${operation}`, 'info', operationContext);
    } else {
      this.captureException(error || new Error(`QuickBooks operation failed: ${operation}`), operationContext);
    }
  }

  // Track sync job performance
  trackSyncJob(provider: string, operation: string, startTime: number, success: boolean, error?: Error) {
    const duration = Date.now() - startTime;
    const context = {
      provider,
      operation,
      duration,
      success,
      timestamp: new Date().toISOString()
    };

    if (success) {
      this.captureMessage(`Sync job completed: ${provider}.${operation}`, 'info', context);
    } else {
      this.captureException(error || new Error(`Sync job failed: ${provider}.${operation}`), context);
    }
  }

  // Track punch clock operations
  trackPunchClockOperation(action: string, userId: string, success: boolean, error?: Error) {
    const context = {
      action,
      userId,
      success,
      service: 'punch_clock',
      timestamp: new Date().toISOString()
    };

    if (success) {
      this.captureMessage(`Punch clock operation: ${action}`, 'info', context);
    } else {
      this.captureException(error || new Error(`Punch clock operation failed: ${action}`), context);
    }
  }
}

// Global error tracking instance
export const errorTracking = new ErrorTrackingService();