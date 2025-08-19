import { Request, Response } from 'express';
import { webhookVerifier } from './webhook-verifier';
import { errorTracking } from './error-tracking';
import { monitoring } from './monitoring-service';

// Enhanced QuickBooks webhook handler with proper verification and monitoring
export class QuickBooksWebhookHandler {
  // Process incoming webhook from QuickBooks
  async handleWebhook(req: Request, res: Response) {
    const startTime = Date.now();
    let success = false;
    
    try {
      // Get signature from header
      const signature = req.get('intuit-signature') || req.get('x-intuit-signature') || '';
      const payload = JSON.stringify(req.body);
      
      console.log('📥 QuickBooks webhook received');
      
      // Verify webhook signature
      if (!webhookVerifier.verifySignature(payload, signature)) {
        console.error('❌ Webhook signature verification failed');
        errorTracking.captureMessage('QuickBooks webhook signature verification failed', 'error', {
          signature: signature.substring(0, 20) + '...',
          payloadLength: payload.length
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Validate payload structure
      if (!webhookVerifier.validateWebhookPayload(req.body)) {
        console.error('❌ Invalid webhook payload structure');
        errorTracking.captureMessage('QuickBooks webhook invalid payload', 'error', {
          payload: req.body
        });
        return res.status(400).json({ error: 'Invalid payload structure' });
      }
      
      // Check for test webhook
      if (webhookVerifier.isTestWebhook(req.body)) {
        console.log('✅ QuickBooks test webhook received and verified');
        monitoring.recordApiRequest('/quickbooks/webhook', 'POST', 200, Date.now() - startTime);
        return res.status(200).json({ message: 'Test webhook received' });
      }
      
      // Extract and process events
      const events = webhookVerifier.extractWebhookEvents(req.body);
      console.log(`📋 Processing ${events.length} webhook events`);
      
      for (const event of events) {
        await this.processWebhookEvent(event);
      }
      
      success = true;
      monitoring.recordApiRequest('/quickbooks/webhook', 'POST', 200, Date.now() - startTime);
      
      console.log('✅ QuickBooks webhook processed successfully');
      res.status(200).json({ 
        message: 'Webhook processed successfully',
        eventsProcessed: events.length
      });
      
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      
      errorTracking.captureException(error as Error, {
        endpoint: '/quickbooks/webhook',
        method: 'POST',
        payloadSize: req.body ? JSON.stringify(req.body).length : 0
      });
      
      monitoring.recordApiRequest('/quickbooks/webhook', 'POST', 500, Date.now() - startTime);
      
      res.status(500).json({ error: 'Webhook processing failed' });
    }
    
    // Track webhook operation
    errorTracking.trackQuickBooksOperation('webhook_processing', success, success ? undefined : new Error('Webhook processing failed'));
  }
  
  // Process individual webhook event
  private async processWebhookEvent(event: any) {
    const { realmId, eventName, entities } = event;
    
    try {
      console.log(`🔄 Processing event: ${eventName} for realm ${realmId}`);
      
      if (entities && entities.length > 0) {
        for (const entity of entities) {
          await this.processEntityChange(realmId, entity);
        }
      }
      
      // Generate idempotency key for this event
      const idempotencyKey = webhookVerifier.generateIdempotencyKey(
        realmId, 
        event.eventId, 
        entities?.[0]?.id
      );
      
      console.log(`✅ Event processed: ${eventName} (${idempotencyKey})`);
      
    } catch (error) {
      console.error(`❌ Error processing event ${eventName}:`, error);
      throw error;
    }
  }
  
  // Process entity changes from webhook
  private async processEntityChange(realmId: string, entity: any) {
    const { name: entityType, id: entityId, operation } = entity;
    
    try {
      console.log(`🔄 Processing ${operation} operation for ${entityType} ${entityId}`);
      
      switch (entityType.toLowerCase()) {
        case 'customer':
          await this.syncCustomerUpdate(realmId, entityId, operation);
          break;
          
        case 'item':
          await this.syncItemUpdate(realmId, entityId, operation);
          break;
          
        case 'invoice':
          await this.syncInvoiceUpdate(realmId, entityId, operation);
          break;
          
        default:
          console.log(`ℹ️ Ignoring ${entityType} entity - not configured for sync`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${entityType} change:`, error);
      throw error;
    }
  }
  
  // Sync customer updates from QuickBooks webhook
  private async syncCustomerUpdate(realmId: string, customerId: string, operation: string) {
    console.log(`🏢 Syncing customer ${customerId} (${operation})`);
    
    // TODO: Implement customer sync logic
    // This should call the QuickBooks service to fetch and update customer data
    
    monitoring.recordSyncJob('quickbooks_webhook', true, 100); // Mock timing
    errorTracking.trackSyncJob('quickbooks', 'customer_sync', Date.now() - 100, true);
  }
  
  // Sync item/product updates from QuickBooks webhook
  private async syncItemUpdate(realmId: string, itemId: string, operation: string) {
    console.log(`📦 Syncing item ${itemId} (${operation})`);
    
    // TODO: Implement item sync logic
    
    monitoring.recordSyncJob('quickbooks_webhook', true, 150); // Mock timing
    errorTracking.trackSyncJob('quickbooks', 'item_sync', Date.now() - 150, true);
  }
  
  // Sync invoice updates from QuickBooks webhook
  private async syncInvoiceUpdate(realmId: string, invoiceId: string, operation: string) {
    console.log(`🧾 Syncing invoice ${invoiceId} (${operation})`);
    
    // TODO: Implement invoice sync logic
    
    monitoring.recordSyncJob('quickbooks_webhook', true, 200); // Mock timing
    errorTracking.trackSyncJob('quickbooks', 'invoice_sync', Date.now() - 200, true);
  }
}

// Export singleton instance
export const quickBooksWebhookHandler = new QuickBooksWebhookHandler();