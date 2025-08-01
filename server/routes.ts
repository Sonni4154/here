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

  const httpServer = createServer(app);
  return httpServer;
}