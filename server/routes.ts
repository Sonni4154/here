import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import {
  insertCustomerSchema,
  insertProductSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertIntegrationSchema,
  insertActivityLogSchema,
} from "@shared/schema";
import { QuickBooksService } from "./services/quickbooks";
import { JotFormService } from "./services/jotform";
import { GoogleService } from "./services/google";

declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      };
      access_token: string;
      refresh_token?: string;
      expires_at: number;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const customers = await storage.getCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const customerData = insertCustomerSchema.parse({ ...req.body, userId });
      
      const customer = await storage.createCustomer(customerData);
      
      // Sync to QuickBooks if integration is active
      try {
        const qbIntegration = await storage.getIntegration(userId, 'quickbooks');
        if (qbIntegration?.isActive) {
          const qbService = new QuickBooksService(qbIntegration);
          const qbCustomer = await qbService.createCustomer(customer);
          await storage.updateCustomer(customer.id, { quickbooksId: qbCustomer.Id });
        }
      } catch (syncError) {
        console.error("QuickBooks sync error:", syncError);
      }

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'customer_created',
        description: `New customer added: ${customer.name}`,
        metadata: { customerId: customer.id },
      });

      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const customerData = insertCustomerSchema.partial().parse(req.body);
      
      const customer = await storage.updateCustomer(id, customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete('/api/customers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCustomer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const productData = insertProductSchema.parse({ ...req.body, userId });
      
      const product = await storage.createProduct(productData);
      
      // Sync to QuickBooks if integration is active
      try {
        const qbIntegration = await storage.getIntegration(userId, 'quickbooks');
        if (qbIntegration?.isActive) {
          const qbService = new QuickBooksService(qbIntegration);
          const qbItem = await qbService.createItem(product);
          await storage.updateProduct(product.id, { quickbooksId: qbItem.Id });
        }
      } catch (syncError) {
        console.error("QuickBooks sync error:", syncError);
      }

      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { items, ...invoiceData } = req.body;
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      const invoice = await storage.createInvoice(insertInvoiceSchema.parse({
        ...invoiceData,
        userId,
        invoiceNumber,
      }));

      // Create invoice items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createInvoiceItem(insertInvoiceItemSchema.parse({
            ...item,
            invoiceId: invoice.id,
          }));
        }
      }

      // Sync to QuickBooks if integration is active
      try {
        const qbIntegration = await storage.getIntegration(userId, 'quickbooks');
        if (qbIntegration?.isActive) {
          const qbService = new QuickBooksService(qbIntegration);
          const invoiceItems = await storage.getInvoiceItems(invoice.id);
          const qbInvoice = await qbService.createInvoice(invoice, invoiceItems);
          await storage.updateInvoice(invoice.id, { 
            quickbooksId: qbInvoice.Id,
            syncStatus: 'synced'
          });
        }
      } catch (syncError) {
        console.error("QuickBooks sync error:", syncError);
        await storage.updateInvoice(invoice.id, { 
          syncStatus: 'error',
          syncError: syncError instanceof Error ? syncError.message : 'Unknown error'
        });
      }

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'invoice_created',
        description: `New invoice created: ${invoice.invoiceNumber}`,
        metadata: { invoiceId: invoice.id },
      });

      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.get('/api/invoices/:id/items', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const items = await storage.getInvoiceItems(id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
    }
  });

  // Integration routes
  app.get('/api/integrations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const integrations = await storage.getIntegrations(userId);
      // Remove sensitive tokens from response
      const safeIntegrations = integrations.map(({ accessToken, refreshToken, ...integration }) => integration);
      res.json(safeIntegrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  // QuickBooks OAuth routes
  app.get('/api/integrations/quickbooks/connect', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const qbService = new QuickBooksService();
      const authUrl = qbService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Error getting QuickBooks auth URL:", error);
      res.status(500).json({ message: "Failed to get auth URL" });
    }
  });

  app.get('/api/integrations/quickbooks/callback', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { code, realmId } = req.query as { code: string; realmId: string };
      
      const qbService = new QuickBooksService();
      const tokens = await qbService.exchangeCodeForTokens(code);
      
      await storage.upsertIntegration({
        userId,
        provider: 'quickbooks',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId,
        isActive: true,
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'integration_connected',
        description: 'QuickBooks integration connected',
        metadata: { provider: 'quickbooks' },
      });

      res.redirect('/integrations?connected=quickbooks');
    } catch (error) {
      console.error("Error handling QuickBooks callback:", error);
      res.status(500).json({ message: "Failed to connect QuickBooks" });
    }
  });

  // Sync routes
  app.post('/api/sync/quickbooks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const qbIntegration = await storage.getIntegration(userId, 'quickbooks');
      
      if (!qbIntegration?.isActive) {
        return res.status(400).json({ message: "QuickBooks integration not found or inactive" });
      }

      const qbService = new QuickBooksService(qbIntegration);
      
      // Sync customers
      const qbCustomers = await qbService.getCustomers();
      for (const qbCustomer of qbCustomers) {
        // Check if customer already exists
        const existingCustomers = await storage.getCustomers(userId);
        const existingCustomer = existingCustomers.find(c => c.quickbooksId === qbCustomer.Id);
        
        if (!existingCustomer) {
          await storage.createCustomer({
            userId,
            quickbooksId: qbCustomer.Id,
            name: qbCustomer.Name,
            email: qbCustomer.PrimaryEmailAddr?.Address,
            companyName: qbCustomer.CompanyName,
          });
        }
      }

      // Update last sync time
      await storage.upsertIntegration({
        ...qbIntegration,
        lastSyncAt: new Date(),
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'sync_completed',
        description: 'QuickBooks sync completed successfully',
        metadata: { provider: 'quickbooks' },
      });

      res.json({ success: true, message: "Sync completed successfully" });
    } catch (error) {
      console.error("Error syncing with QuickBooks:", error);
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // Activity logs
  app.get('/api/activity', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const logs = await storage.getActivityLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
