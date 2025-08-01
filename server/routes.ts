import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { quickbooksService } from "./services/quickbooks-service";
import { importAllData } from "./data-import";
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
import { workflowEngine } from "./services/workflow-engine";
import { workflowTriggerService } from "./services/workflow-triggers";

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

  // Employee schedule routes
  app.get('/api/schedules', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const userRole = req.user!.claims.role;
      
      // Admin/managers can see all schedules, employees see only their own
      const schedules = userRole === 'admin' || userRole === 'manager' 
        ? await storage.getEmployeeSchedules()
        : await storage.getEmployeeSchedules(userId);
      
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { employeeId, title, description, startTime, endTime, location, customerId, projectName } = req.body;

      const schedule = await storage.createEmployeeSchedule({
        employeeId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        customerId,
        projectName,
        createdBy: userId,
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'schedule_created',
        description: `Created schedule: ${title}`,
        metadata: { scheduleId: schedule.id },
      });

      res.json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // Task assignment routes
  app.get('/api/tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const userRole = req.user!.claims.role;
      
      // Admin/managers can see all tasks, employees see only their own
      const tasks = userRole === 'admin' || userRole === 'manager' 
        ? await storage.getTaskAssignments()
        : await storage.getTaskAssignments(userId);
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { assignedTo, customerId, title, description, priority, dueDate, estimatedHours, scheduleId } = req.body;

      const task = await storage.createTaskAssignment({
        assignedTo,
        assignedBy: userId,
        customerId,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours,
        scheduleId,
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'task_assigned',
        description: `Assigned task: ${title}`,
        metadata: { taskId: task.id, assignedTo },
      });

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Employee routes
  app.get('/api/employees', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Password authentication routes
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { passwordAuthService } = await import('./auth/password');
      const user = await passwordAuthService.authenticateUser({ email, password });
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session manually for password auth
      req.session.user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          role: user.role,
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

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, phone, address, role, department, employeeId } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const { passwordAuthService } = await import('./auth/password');
      const user = await passwordAuthService.registerEmployee({
        email,
        password,
        firstName,
        lastName,
        phone,
        address,
        role,
        department,
        employeeId,
      });

      // Log activity
      await storage.createActivityLog({
        userId: user.id,
        type: 'user_registered',
        description: `New employee registered: ${firstName} ${lastName}`,
      });

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Registration failed" });
      }
    }
  });

  app.post('/api/auth/password/change', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      const { passwordAuthService } = await import('./auth/password');
      await passwordAuthService.updateUserPassword(userId, currentPassword, newPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      if (error instanceof Error && error.message.includes('incorrect')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Password change failed" });
      }
    }
  });

  // Google Calendar sync routes
  app.post('/api/sync/google-calendar', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Import Google Calendar service here to avoid circular dependencies
      const { createGoogleCalendarService } = await import('./services/google-calendar');
      const calendarService = await createGoogleCalendarService(userId);
      
      if (!calendarService) {
        return res.status(400).json({ message: "Google Calendar integration not configured" });
      }

      await calendarService.syncEmployeeSchedules();
      
      // Log sync activity
      await storage.createActivityLog({
        userId,
        type: 'calendar_sync',
        description: 'Synchronized with Google Calendar',
      });

      res.json({ message: "Google Calendar sync completed successfully" });
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error);
      res.status(500).json({ message: "Failed to sync with Google Calendar" });
    }
  });

  // Customer notes routes
  app.get('/api/customers/:customerId/notes', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { customerId } = req.params;

      // Verify customer belongs to user
      const customer = await storage.getCustomer(customerId);
      if (!customer || customer.userId !== userId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const notes = await storage.getCustomerNotes(customerId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching customer notes:", error);
      res.status(500).json({ message: "Failed to fetch customer notes" });
    }
  });

  app.post('/api/customers/:customerId/notes', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { customerId } = req.params;
      const { content, isPrivate } = req.body;

      // Verify customer belongs to user
      const customer = await storage.getCustomer(customerId);
      if (!customer || customer.userId !== userId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const note = await storage.createCustomerNote({
        customerId,
        userId,
        content,
        isPrivate: isPrivate || false,
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        type: 'customer_note_created',
        description: `Added ${isPrivate ? 'private' : 'public'} note to customer: ${customer.name}`,
        metadata: { customerId, noteId: note.id },
      });

      res.json(note);
    } catch (error) {
      console.error("Error creating customer note:", error);
      res.status(500).json({ message: "Failed to create customer note" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { search } = req.query;
      
      if (search && typeof search === 'string') {
        const customers = await storage.searchCustomers(userId, search);
        res.json(customers);
      } else {
        const customers = await storage.getCustomers(userId);
        res.json(customers);
      }
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

  // Time entry routes
  app.get('/api/time-entries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await storage.getTimeEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post('/api/time-entries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const entryData = { ...req.body, userId };
      
      const entry = await storage.createTimeEntry(entryData);
      
      // Trigger workflow automation for time entry creation
      await workflowTriggerService.triggerFormSubmission('time_entry', entry, userId);
      
      await storage.createActivityLog({
        userId,
        type: 'time_entry_created',
        description: `Time entry created: ${entry.description}`,
        metadata: { timeEntryId: entry.id },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.post('/api/time-entries/:id/submit', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { id } = req.params;
      
      const entry = await storage.updateTimeEntry(id, {
        status: 'submitted',
        submittedAt: new Date(),
      });

      // Trigger workflow automation for time entry submission
      await workflowTriggerService.triggerStatusChange('time_entry', 'submitted', entry, userId);

      await storage.createActivityLog({
        userId,
        type: 'time_entry_submitted',
        description: `Time entry submitted: ${entry.description}`,
        metadata: { timeEntryId: entry.id },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error submitting time entry:", error);
      res.status(500).json({ message: "Failed to submit time entry" });
    }
  });

  // Material entry routes
  app.get('/api/material-entries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await storage.getMaterialEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching material entries:", error);
      res.status(500).json({ message: "Failed to fetch material entries" });
    }
  });

  app.post('/api/material-entries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const entryData = { ...req.body, userId };
      
      const entry = await storage.createMaterialEntry(entryData);
      
      // Trigger workflow automation for material entry creation
      await workflowTriggerService.triggerFormSubmission('material_form', entry, userId);
      
      await storage.createActivityLog({
        userId,
        type: 'material_entry_created',
        description: `Material entry created: ${entry.itemName}`,
        metadata: { materialEntryId: entry.id },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating material entry:", error);
      res.status(500).json({ message: "Failed to create material entry" });
    }
  });

  app.post('/api/material-entries/:id/submit', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { id } = req.params;
      
      const entry = await storage.updateMaterialEntry(id, {
        status: 'submitted',
        submittedAt: new Date(),
      });

      await storage.createActivityLog({
        userId,
        type: 'material_entry_submitted',
        description: `Material entry submitted: ${entry.itemName}`,
        metadata: { materialEntryId: entry.id },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error submitting material entry:", error);
      res.status(500).json({ message: "Failed to submit material entry" });
    }
  });

  // Sync and integration routes
  app.post('/api/sync/quickbooks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { createQuickBooksService } = await import('./services/quickbooks');
      
      const qbService = await createQuickBooksService(userId);
      if (!qbService) {
        return res.status(400).json({ message: "QuickBooks integration not configured" });
      }

      // Update integration sync status
      const integration = await storage.getIntegration(userId, 'quickbooks');
      if (integration) {
        await storage.upsertIntegration({
          ...integration,
          syncStatus: 'syncing',
          lastSyncAt: new Date(),
        });
      }

      // Perform sync operations
      await Promise.all([
        qbService.syncCustomers(),
        qbService.syncProducts(),
      ]);

      // Update sync status to success
      if (integration) {
        await storage.upsertIntegration({
          ...integration,
          syncStatus: 'success',
          lastSyncAt: new Date(),
        });
      }

      await storage.createActivityLog({
        userId,
        type: 'quickbooks_sync',
        description: 'QuickBooks synchronization completed successfully',
        metadata: { syncAt: new Date().toISOString() },
      });

      res.json({ message: "QuickBooks sync completed successfully" });
    } catch (error) {
      console.error("Error syncing with QuickBooks:", error);
      
      // Update sync status to error
      const userId = req.user!.claims.sub;
      const integration = await storage.getIntegration(userId, 'quickbooks');
      if (integration) {
        await storage.upsertIntegration({
          ...integration,
          syncStatus: 'error',
        });
      }

      res.status(500).json({ message: "Failed to sync with QuickBooks" });
    }
  });

  app.post('/api/webhooks/quickbooks', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      console.log('QuickBooks webhook received:', payload);

      // Verify webhook signature if needed
      const signature = req.headers['intuit-signature'];
      // TODO: Implement signature verification

      // Process each notification
      for (const event of payload.eventNotifications || []) {
        const realmId = event.realmId;
        
        // Find user by QuickBooks realm ID
        const integration = await storage.getIntegrationByRealmId(realmId);
        if (!integration) {
          console.warn(`No integration found for realm ID: ${realmId}`);
          continue;
        }

        const { createQuickBooksService } = await import('./services/quickbooks');
        const qbService = await createQuickBooksService(integration.userId);
        
        if (qbService) {
          await qbService.handleWebhook(payload);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error("Error handling QuickBooks webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  app.get('/api/sync/status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const [integrations, syncLogs] = await Promise.all([
        storage.getIntegrations(userId),
        storage.getSyncLogs(userId, 10)
      ]);

      const syncStatus = {
        integrations: integrations.map(integration => ({
          provider: integration.provider,
          isActive: integration.isActive,
          lastSyncAt: integration.lastSyncAt,
          syncStatus: integration.syncStatus || 'pending',
        })),
        recentLogs: syncLogs,
      };

      res.json(syncStatus);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Clock entry routes
  app.get('/api/clock-entries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await storage.getClockEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching clock entries:", error);
      res.status(500).json({ message: "Failed to fetch clock entries" });
    }
  });

  app.post('/api/clock-entries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user already has an active clock entry
      const activeEntry = await storage.getActiveClockEntry(userId);
      if (activeEntry) {
        return res.status(400).json({ message: "You are already clocked in" });
      }

      const entryData = { ...req.body, userId };
      const entry = await storage.createClockEntry(entryData);
      
      // Trigger workflow automation for clock in
      await workflowTriggerService.triggerTimeTracking('clock_in', entry, userId);
      
      await storage.createActivityLog({
        userId,
        type: 'clock_in',
        description: 'Clocked in',
        metadata: { clockEntryId: entry.id },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating clock entry:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post('/api/clock-entries/:id/clock-out', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { id } = req.params;
      
      const clockOutTime = new Date();
      const entry = await storage.updateClockEntry(id, {
        clockOutTime,
        status: 'completed',
      });

      // Calculate total hours
      const totalHours = (clockOutTime.getTime() - new Date(entry.clockInTime).getTime()) / (1000 * 60 * 60);
      await storage.updateClockEntry(id, {
        totalHours: totalHours.toFixed(2),
      });

      // Trigger workflow automation for clock out
      await workflowTriggerService.triggerTimeTracking('clock_out', { ...entry, totalHours }, userId);

      await storage.createActivityLog({
        userId,
        type: 'clock_out',
        description: `Clocked out after ${totalHours.toFixed(2)} hours`,
        metadata: { clockEntryId: entry.id },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Workflow management routes
  app.get('/api/workflows/triggers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const triggers = await workflowEngine.getTriggers();
      res.json(triggers);
    } catch (error) {
      console.error("Error fetching workflow triggers:", error);
      res.status(500).json({ message: "Failed to fetch workflow triggers" });
    }
  });

  app.post('/api/workflows/triggers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const triggerData = { ...req.body, createdBy: userId };
      
      const trigger = await workflowEngine.createTrigger(triggerData);
      
      await storage.createActivityLog({
        userId,
        type: 'workflow_trigger_created',
        description: `Created workflow trigger: ${trigger.name}`,
        metadata: { triggerId: trigger.id },
      });

      res.json(trigger);
    } catch (error) {
      console.error("Error creating workflow trigger:", error);
      res.status(500).json({ message: "Failed to create workflow trigger" });
    }
  });

  app.get('/api/workflows/executions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { triggerId } = req.query;
      const executions = await workflowEngine.getExecutions(triggerId as string);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching workflow executions:", error);
      res.status(500).json({ message: "Failed to fetch workflow executions" });
    }
  });

  app.get('/api/workflows/action-templates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const templates = await workflowEngine.getActionTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching action templates:", error);
      res.status(500).json({ message: "Failed to fetch action templates" });
    }
  });

  app.post('/api/workflows/initialize-defaults', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      await workflowTriggerService.initializeDefaultTriggers(userId);
      
      await storage.createActivityLog({
        userId,
        type: 'workflow_initialization',
        description: 'Initialized default workflow triggers',
      });

      res.json({ message: "Default workflow triggers initialized successfully" });
    } catch (error) {
      console.error("Error initializing default triggers:", error);
      res.status(500).json({ message: "Failed to initialize default triggers" });
    }
  });

  app.post('/api/workflows/trigger-manual', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const { event, data, metadata } = req.body;
      
      await workflowEngine.trigger(event, data, userId, metadata);
      
      await storage.createActivityLog({
        userId,
        type: 'workflow_manual_trigger',
        description: `Manually triggered workflow event: ${event}`,
        metadata: { event, triggeredAt: new Date().toISOString() },
      });

      res.json({ message: "Workflow triggered successfully" });
    } catch (error) {
      console.error("Error triggering workflow:", error);
      res.status(500).json({ message: "Failed to trigger workflow" });
    }
  });

  // QuickBooks Integration routes
  app.get('/api/integrations/quickbooks/connect', isAuthenticated, (req: Request, res: Response) => {
    const userId = req.user!.claims.sub;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/quickbooks/callback`;
    const authUrl = quickbooksService.getAuthorizationUrl(userId, redirectUri);
    res.redirect(authUrl);
  });

  app.get('/api/integrations/quickbooks/callback', isAuthenticated, async (req: Request, res: Response) => {
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

  app.post('/api/integrations/quickbooks/sync', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      await quickbooksService.fullSync(userId);
      
      await storage.createActivityLog({
        userId,
        type: 'manual_sync',
        description: 'Manual QuickBooks sync completed',
        metadata: { timestamp: new Date() }
      });

      res.json({ message: 'Sync completed successfully' });
    } catch (error) {
      console.error('QuickBooks sync error:', error);
      res.status(500).json({ message: 'Failed to sync with QuickBooks' });
    }
  });

  // Sample data import route (for development)
  app.post('/api/import-sample-data', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      await importAllData(userId);
      
      res.json({ message: 'Sample data imported successfully' });
    } catch (error) {
      console.error('Sample data import error:', error);
      res.status(500).json({ message: 'Failed to import sample data' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
