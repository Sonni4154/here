import crypto from 'crypto';

// QuickBooks webhook verification using HMAC-SHA256
// Implements Intuit's official webhook security verification
export class WebhookVerifier {
  private verifierToken: string;

  constructor() {
    this.verifierToken = process.env.QBO_WEBHOOK_VERIFIER || '';
    
    if (!this.verifierToken) {
      console.warn('⚠️ QBO_WEBHOOK_VERIFIER not configured - webhook verification disabled');
    }
  }

  // Verify webhook signature using HMAC-SHA256
  verifySignature(payload: string, signature: string): boolean {
    if (!this.verifierToken) {
      console.warn('⚠️ Webhook verification skipped - no verifier token configured');
      return true; // Allow in development if not configured
    }

    try {
      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.verifierToken)
        .update(payload, 'utf8')
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return this.timingSafeEqual(cleanSignature, expectedSignature);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  // Timing-safe string comparison to prevent timing attacks
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  // Validate webhook payload structure
  validateWebhookPayload(payload: any): boolean {
    try {
      // Check for required QuickBooks webhook structure
      if (!payload.eventNotifications || !Array.isArray(payload.eventNotifications)) {
        console.warn('⚠️ Invalid webhook payload structure - missing eventNotifications array');
        return false;
      }

      // Validate each event notification
      for (const event of payload.eventNotifications) {
        if (!event.realmId || !event.name || !event.id) {
          console.warn('⚠️ Invalid event notification structure:', event);
          return false;
        }

        // Validate dataChangeEvent structure if present
        if (event.dataChangeEvent) {
          const entities = event.dataChangeEvent.entities;
          if (!entities || !Array.isArray(entities)) {
            console.warn('⚠️ Invalid dataChangeEvent structure:', event.dataChangeEvent);
            return false;
          }

          // Validate entity structure
          for (const entity of entities) {
            if (!entity.name || !entity.id || !entity.operation) {
              console.warn('⚠️ Invalid entity structure:', entity);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Webhook payload validation error:', error);
      return false;
    }
  }

  // Extract webhook event information for processing
  extractWebhookEvents(payload: any): Array<{
    realmId: string;
    eventName: string;
    eventId: string;
    entities?: Array<{
      name: string;
      id: string;
      operation: string;
      lastUpdated: string;
    }>;
  }> {
    const events: Array<any> = [];

    try {
      if (!payload.eventNotifications) {
        return events;
      }

      for (const notification of payload.eventNotifications) {
        const event = {
          realmId: notification.realmId,
          eventName: notification.name,
          eventId: notification.id,
          entities: [] as Array<any>
        };

        // Extract entity changes if present
        if (notification.dataChangeEvent && notification.dataChangeEvent.entities) {
          for (const entity of notification.dataChangeEvent.entities) {
            event.entities.push({
              name: entity.name,
              id: entity.id,
              operation: entity.operation,
              lastUpdated: entity.lastUpdated
            });
          }
        }

        events.push(event);
      }
    } catch (error) {
      console.error('❌ Error extracting webhook events:', error);
    }

    return events;
  }

  // Generate idempotency key for webhook processing
  generateIdempotencyKey(realmId: string, eventId: string, entityId?: string): string {
    const components = [realmId, eventId];
    if (entityId) {
      components.push(entityId);
    }
    
    return crypto
      .createHash('sha256')
      .update(components.join(':'))
      .digest('hex');
  }

  // Check if webhook is a test notification from QuickBooks
  isTestWebhook(payload: any): boolean {
    try {
      return payload.eventNotifications?.some((event: any) => 
        event.name === 'Test' || event.id === 'test-event'
      ) || false;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const webhookVerifier = new WebhookVerifier();