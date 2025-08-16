import { Router } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { QuickBooksService } from "./services/quickbooks-service";
import bcrypt from "bcrypt";

// Initialize services
const quickbooksService = new QuickBooksService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Sample data import
  app.post('/api/import-sample-data', isAuthenticated, async (req, res) => {
    try {
      const { importSampleData } = await import('./data-import');
      await importSampleData();
      res.json({ message: "Sample data imported successfully" });
    } catch (error) {
      console.error("Error importing sample data:", error);
      res.status(500).json({ message: "Failed to import sample data" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customerData = req.body;
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.delete('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req, res) => {
    try {
      const productData = req.body;
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const invoiceData = req.body;
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Time entry routes
  app.get('/api/time-entries', isAuthenticated, async (req, res) => {
    try {
      const timeEntries = await storage.getTimeEntries();
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // Integration routes
  app.get('/api/integrations', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const integrations = await storage.getIntegrations(userId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  // QuickBooks Integration routes
  // Production QuickBooks connect endpoint
  app.get('/quickbooks/connect', isAuthenticated, (req, res) => {
    const userId = req.user!.claims.sub;
    const redirectUri = 'https://www.wemakemarin.com/quickbooks/callback';
    const authUrl = quickbooksService.getAuthorizationUrl(userId, redirectUri);
    res.redirect(authUrl);
  });

  // Development QuickBooks connect endpoint (keep for dev)
  app.get('/api/integrations/quickbooks/connect', isAuthenticated, (req, res) => {
    const userId = req.user!.claims.sub;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'https://www.wemakemarin.com/quickbooks/callback'
      : `${req.protocol}://${req.get('host')}/api/integrations/quickbooks/callback`;
    const authUrl = quickbooksService.getAuthorizationUrl(userId, redirectUri);
    res.redirect(authUrl);
  });

  // Production callback route for www.wemakemarin.com
  app.get('/quickbooks/callback', isAuthenticated, async (req, res) => {
    try {
      const { code, realmId } = req.query;
      
      if (!code || !realmId) {
        return res.redirect('/integrations?error=missing_params');
      }

      const userId = req.user!.claims.sub;
      const redirectUri = 'https://www.wemakemarin.com/quickbooks/callback';
      
      const tokens = await quickbooksService.exchangeCodeForTokens(
        code as string, 
        redirectUri, 
        realmId as string
      );

      // Store integration
      await storage.upsertIntegration({
        userId,
        provider: 'quickbooks',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId: tokens.realmId,
        isActive: true,
        lastSyncAt: new Date()
      });

      // Start initial sync
      await quickbooksService.fullSync(userId);

      await storage.createActivityLog({
        userId,
        type: 'integration_connected',
        description: 'QuickBooks integration connected successfully',
        metadata: { realmId: tokens.realmId }
      });

      res.redirect('/integrations?success=quickbooks');
    } catch (error) {
      console.error('QuickBooks callback error:', error);
      res.redirect('/integrations?error=quickbooks');
    }
  });

  // Development callback route (keep for local testing)
  app.get('/api/integrations/quickbooks/callback', isAuthenticated, async (req, res) => {
    try {
      const { code, realmId } = req.query;
      
      if (!code || !realmId) {
        return res.status(400).json({ message: 'Missing authorization code or realm ID' });
      }

      const userId = req.user!.claims.sub;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/quickbooks/callback`;
      
      const tokens = await quickbooksService.exchangeCodeForTokens(
        code as string, 
        redirectUri, 
        realmId as string
      );

      // Store integration
      await storage.upsertIntegration({
        userId,
        provider: 'quickbooks',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId: tokens.realmId,
        isActive: true,
        lastSyncAt: new Date()
      });

      // Start initial sync
      await quickbooksService.fullSync(userId);

      await storage.createActivityLog({
        userId,
        type: 'integration_connected',
        description: 'QuickBooks integration connected successfully',
        metadata: { realmId: tokens.realmId }
      });

      res.redirect('/integrations?success=quickbooks');
    } catch (error) {
      console.error('QuickBooks callback error:', error);
      res.redirect('/integrations?error=quickbooks');
    }
  });

  // Initial data pull from QuickBooks
  app.post('/api/integrations/quickbooks/initial-sync', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Pull customers
      console.log('Pulling QuickBooks customers...');
      await quickbooksService.syncCustomers(userId);
      
      // Pull products/services
      console.log('Pulling QuickBooks items...');
      await quickbooksService.syncItems(userId);
      
      // Pull recent invoices
      console.log('Pulling QuickBooks invoices...');
      await quickbooksService.syncInvoices(userId);
      
      await storage.createActivityLog({
        userId,
        type: 'initial_sync',
        description: 'Initial QuickBooks data pull completed - customers, items, and invoices',
        metadata: { timestamp: new Date() }
      });

      res.json({ message: "Initial QuickBooks data pull completed successfully" });
    } catch (error) {
      console.error("Error pulling initial QuickBooks data:", error);
      res.status(500).json({ 
        message: "Failed to pull initial QuickBooks data", 
        error: error.message 
      });
    }
  });

  app.post('/api/integrations/quickbooks/sync', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      await quickbooksService.fullSync(userId);
      
      await storage.createActivityLog({
        userId,
        type: 'manual_sync',
        description: 'Manual QuickBooks sync completed',
        metadata: { timestamp: new Date() }
      });

      res.json({ message: "QuickBooks sync completed successfully" });
    } catch (error) {
      console.error("Error syncing with QuickBooks:", error);
      res.status(500).json({ message: "Failed to sync with QuickBooks" });
    }
  });

  // Production QuickBooks webhook endpoint  
  app.post('/quickbooks/webhook', async (req, res) => {
    try {
      const signature = req.headers['intuit-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      // Verify webhook signature
      if (!quickbooksService.verifyWebhookSignature(payload, signature)) {
        console.error('Invalid QuickBooks webhook signature');
        return res.status(401).json({ message: 'Invalid signature' });
      }

      // Process webhook payload
      await quickbooksService.processWebhook(req.body);
      
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Error processing QuickBooks webhook:', error);
      res.status(500).json({ message: 'Failed to process webhook' });
    }
  });

  // Development QuickBooks webhook endpoint (keep for dev)
  app.post('/api/webhooks/quickbooks', async (req, res) => {
    try {
      const signature = req.headers['intuit-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      // Verify webhook signature
      if (!quickbooksService.verifyWebhookSignature(payload, signature)) {
        console.error('Invalid QuickBooks webhook signature');
        return res.status(401).json({ message: 'Invalid signature' });
      }

      // Process webhook payload
      await quickbooksService.processWebhook(req.body);
      
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Error processing QuickBooks webhook:', error);
      res.status(500).json({ message: 'Failed to process webhook' });
    }
  });

  // Production QuickBooks disconnect endpoint
  app.post('/quickbooks/disconnect', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      await quickbooksService.revokeIntegration(userId);
      
      res.json({ message: "QuickBooks integration disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting QuickBooks:", error);
      res.status(500).json({ message: "Failed to disconnect QuickBooks integration" });
    }
  });

  // Development QuickBooks disconnect endpoint (keep for dev)
  app.post('/api/integrations/quickbooks/disconnect', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      await quickbooksService.revokeIntegration(userId);
      
      res.json({ message: "QuickBooks integration disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting QuickBooks:", error);
      res.status(500).json({ message: "Failed to disconnect QuickBooks integration" });
    }
  });

  // QuickBooks connection status endpoint
  app.get('/api/integrations/quickbooks/status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const integration = await storage.getIntegration(userId, 'quickbooks');
      
      res.json({
        connected: !!integration?.isActive,
        lastSync: integration?.lastSyncAt,
        realmId: integration?.realmId
      });
    } catch (error) {
      console.error("Error getting QuickBooks status:", error);
      res.status(500).json({ message: "Failed to get QuickBooks status" });
    }
  });

  // Test webhook endpoint for development
  app.post('/api/webhooks/quickbooks/test', isAuthenticated, async (req, res) => {
    try {
      const testPayload = {
        eventNotifications: [{
          realmId: req.body.realmId || 'test-realm',
          dataChangeEvent: {
            entities: [{
              name: req.body.entityType || 'Customer',
              id: req.body.entityId || 'test-123',
              operation: req.body.operation || 'Create',
              lastUpdated: new Date().toISOString()
            }]
          }
        }]
      };

      await quickbooksService.processWebhook(testPayload);
      res.json({ message: 'Test webhook processed successfully', payload: testPayload });
    } catch (error) {
      console.error('Error processing test webhook:', error);
      res.status(500).json({ message: 'Failed to process test webhook' });
    }
  });

  // Google Calendar Integration routes
  app.get('/api/integrations/google-calendar/connect', isAuthenticated, async (req, res) => {
    try {
      const { GoogleCalendarService } = await import('./services/google-calendar-service');
      const calendarService = new GoogleCalendarService();
      
      const userId = req.user!.claims.sub;
      const authUrl = calendarService.getAuthorizationUrl(userId);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      res.status(500).json({ message: "Failed to connect to Google Calendar" });
    }
  });

  app.get('/api/integrations/google/callback', isAuthenticated, async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.redirect('/integrations?error=missing_params');
      }

      const { GoogleCalendarService } = await import('./services/google-calendar-service');
      const calendarService = new GoogleCalendarService();
      
      const { userId } = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const tokens = await calendarService.exchangeCodeForTokens(code as string);

      // Store integration
      await storage.upsertIntegration({
        userId,
        provider: 'google_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        isActive: true,
        lastSyncAt: new Date()
      });

      await storage.createActivityLog({
        userId,
        type: 'integration_connected',
        description: 'Google Calendar integration connected successfully',
        metadata: { provider: 'google_calendar' }
      });

      res.redirect('/integrations?success=google_calendar');
    } catch (error) {
      console.error('Google Calendar callback error:', error);
      res.redirect('/integrations?error=google_calendar');
    }
  });

  app.post('/api/integrations/google-calendar/sync', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { GoogleCalendarService } = await import('./services/google-calendar-service');
      const calendarService = new GoogleCalendarService();
      
      await calendarService.syncEmployeeSchedules(userId);
      
      await storage.createActivityLog({
        userId,
        type: 'manual_sync',
        description: 'Manual Google Calendar sync completed',
        metadata: { timestamp: new Date() }
      });

      res.json({ message: "Google Calendar sync completed successfully" });
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error);
      res.status(500).json({ message: "Failed to sync with Google Calendar" });
    }
  });

  // Clock in/out with calendar integration
  app.post('/api/clock/in', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { customerId, location, notes } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create clock entry
      const clockEntry = await storage.createClockEntry({
        userId,
        customerId,
        clockIn: new Date(),
        location: location ? JSON.stringify(location) : undefined,
        notes,
      });

      // Create calendar event
      try {
        const { GoogleCalendarService } = await import('./services/google-calendar-service');
        const calendarService = new GoogleCalendarService();
        
        if (await calendarService.setCredentials(userId)) {
          const customer = customerId ? await storage.getCustomer(customerId) : null;
          
          const calendarEventId = await calendarService.createClockEvent({
            employeeId: userId,
            employeeName: `${user.firstName} ${user.lastName}`,
            employeeEmail: user.email || '',
            customerId,
            customerName: customer?.name,
            action: 'clock_in',
            timestamp: clockEntry.clockIn!,
            location,
            notes,
          });

          // Store calendar event ID for later updates
          if (calendarEventId) {
            await storage.updateClockEntry(clockEntry.id, {
              calendarEventId,
            });
          }
        }
      } catch (calendarError) {
        console.error('Calendar integration error (non-blocking):', calendarError);
      }

      await storage.createActivityLog({
        userId,
        type: 'clock_in',
        description: `Clocked in${customerId ? ` for customer work` : ''}`,
        metadata: { clockEntryId: clockEntry.id, customerId },
      });

      res.json(clockEntry);
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post('/api/clock/out', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { clockEntryId, notes } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get clock entry
      const clockEntry = await storage.getClockEntry(clockEntryId);
      if (!clockEntry || clockEntry.userId !== userId) {
        return res.status(404).json({ message: "Clock entry not found" });
      }

      if (clockEntry.clockOut) {
        return res.status(400).json({ message: "Already clocked out" });
      }

      // Update clock entry
      const updatedEntry = await storage.updateClockEntry(clockEntryId, {
        clockOut: new Date(),
        notes: notes || clockEntry.notes,
      });

      // Update calendar event
      try {
        const { GoogleCalendarService } = await import('./services/google-calendar-service');
        const calendarService = new GoogleCalendarService();
        
        if (await calendarService.setCredentials(userId) && clockEntry.calendarEventId) {
          const customer = clockEntry.customerId ? await storage.getCustomer(clockEntry.customerId) : null;
          
          await calendarService.updateClockEvent(clockEntry.calendarEventId, {
            employeeId: userId,
            employeeName: `${user.firstName} ${user.lastName}`,
            employeeEmail: user.email || '',
            customerId: clockEntry.customerId,
            customerName: customer?.name,
            action: 'clock_out',
            timestamp: updatedEntry.clockOut!,
            notes: updatedEntry.notes,
          });
        }
      } catch (calendarError) {
        console.error('Calendar integration error (non-blocking):', calendarError);
      }

      await storage.createActivityLog({
        userId,
        type: 'clock_out',
        description: 'Clocked out',
        metadata: { clockEntryId: clockEntry.id },
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Get current clock status
  app.get('/api/clock/status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const activeClockEntry = await storage.getActiveClockEntry(userId);
      
      res.json({
        isClockedIn: !!activeClockEntry,
        clockEntry: activeClockEntry,
      });
    } catch (error) {
      console.error("Error getting clock status:", error);
      res.status(500).json({ message: "Failed to get clock status" });
    }
  });

  // Sync status route
  app.get('/api/sync/status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const integrations = await storage.getIntegrations(userId);

      const syncStatus = {
        integrations: integrations.map(integration => ({
          provider: integration.provider,
          isActive: integration.isActive,
          lastSyncAt: integration.lastSyncAt,
          syncStatus: integration.syncStatus || 'pending',
        })),
        recentLogs: [],
      };

      res.json(syncStatus);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Password authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email
      const users = await storage.getUsers();
      const user = users.find((u: any) => u.email === email);
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session manually for password auth
      req.session.user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
      };

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Password login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      // Check if user already exists
      const users = await storage.getUsers();
      const existingUser = users.find((u: any) => u.email === email);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.upsertUser({
        email,
        firstName,
        lastName,
        phone,
        passwordHash,
        profileImageUrl: null,
      });

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Sync scheduler routes
  app.get('/api/sync/status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { syncScheduler } = await import('./services/sync-scheduler');
      
      const syncStatus = syncScheduler.getSyncStatus(userId);
      const recentLogs = await storage.getActivityLogs(userId, 10);
      
      res.json({
        syncStatus,
        recentLogs: recentLogs.filter(log => 
          log.type?.includes('sync') || log.type?.includes('integration')
        )
      });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  app.post('/api/sync/start-automated', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { intervalMinutes = 60 } = req.body;
      const { syncScheduler } = await import('./services/sync-scheduler');
      
      await syncScheduler.startAutomatedSync(userId, intervalMinutes);
      
      res.json({ 
        message: `Automated sync started (every ${intervalMinutes} minutes)`,
        intervalMinutes 
      });
    } catch (error) {
      console.error("Error starting automated sync:", error);
      res.status(500).json({ message: "Failed to start automated sync" });
    }
  });

  app.post('/api/sync/stop-automated', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { syncScheduler } = await import('./services/sync-scheduler');
      
      syncScheduler.stopAutomatedSync(userId);
      
      res.json({ message: "Automated sync stopped" });
    } catch (error) {
      console.error("Error stopping automated sync:", error);
      res.status(500).json({ message: "Failed to stop automated sync" });
    }
  });

  app.post('/api/sync/trigger-immediate', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { syncScheduler } = await import('./services/sync-scheduler');
      
      await syncScheduler.triggerImmediateSync(userId);
      
      res.json({ message: "Immediate sync completed" });
    } catch (error) {
      console.error("Error triggering immediate sync:", error);
      res.status(500).json({ message: "Failed to trigger immediate sync" });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        quickbooks: 'configured',
        oauth: 'enabled'
      }
    });
  });

  // Version endpoint
  app.get('/api/version', (req, res) => {
    res.json({
      version: '2.1.0',
      features: [
        'Enhanced QuickBooks OAuth with intuit-oauth',
        'Comprehensive webhook handling',
        'Real-time data synchronization',
        'Production-ready authentication',
        'Automated sync scheduling'
      ],
      environment: process.env.NODE_ENV || 'development',
      lastUpdate: '2025-01-01T12:00:00Z'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}