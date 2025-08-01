import {
  users,
  customers,
  products,
  invoices,
  invoiceItems,
  integrations,
  activityLogs,
  timeEntries,
  materialEntries,
  type User,
  type UpsertUser,
  type Customer,
  type InsertCustomer,
  type Product,
  type InsertProduct,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Integration,
  type InsertIntegration,
  type ActivityLog,
  type InsertActivityLog,
  type TimeEntry,
  type InsertTimeEntry,
  type MaterialEntry,
  type InsertMaterialEntry,
  clockEntries,
  timesheetLineItems,
  syncLogs,
  externalMappings,
  type ClockEntry,
  type InsertClockEntry,
  type TimesheetLineItem,
  type InsertTimesheetLineItem,
  type SyncLog,
  type InsertSyncLog,
  type ExternalMapping,
  type InsertExternalMapping,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Customer operations
  getCustomers(userId: string): Promise<Customer[]>;
  searchCustomers(userId: string, query: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  
  // Product operations
  getProducts(userId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Invoice operations
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  
  // Invoice item operations
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem>;
  deleteInvoiceItem(id: string): Promise<void>;
  
  // Integration operations
  getIntegrations(userId: string): Promise<Integration[]>;
  getIntegration(userId: string, provider: string): Promise<Integration | undefined>;
  getIntegrationByRealmId(realmId: string): Promise<Integration | undefined>;
  upsertIntegration(integration: any): Promise<Integration>;
  
  // Activity log operations
  getActivityLogs(userId: string, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Time entry operations
  getTimeEntries(userId: string): Promise<TimeEntry[]>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;

  // Material entry operations
  getMaterialEntries(userId: string): Promise<MaterialEntry[]>;
  getMaterialEntry(id: string): Promise<MaterialEntry | undefined>;
  createMaterialEntry(materialEntry: InsertMaterialEntry): Promise<MaterialEntry>;
  updateMaterialEntry(id: string, materialEntry: Partial<InsertMaterialEntry>): Promise<MaterialEntry>;
  deleteMaterialEntry(id: string): Promise<void>;

  // Clock entry operations
  getClockEntries(userId: string): Promise<ClockEntry[]>;
  getActiveClockEntry(userId: string): Promise<ClockEntry | undefined>;
  createClockEntry(clockEntry: InsertClockEntry): Promise<ClockEntry>;
  updateClockEntry(id: string, clockEntry: Partial<InsertClockEntry>): Promise<ClockEntry>;

  // Timesheet line item operations
  getTimesheetLineItems(timeEntryId: string): Promise<TimesheetLineItem[]>;
  createTimesheetLineItem(lineItem: InsertTimesheetLineItem): Promise<TimesheetLineItem>;
  deleteTimesheetLineItems(timeEntryId: string): Promise<void>;

  // Sync log operations
  getSyncLogs(userId: string, limit?: number): Promise<SyncLog[]>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;

  // External mapping operations
  getExternalMapping(userId: string, provider: string, entityType: string, externalId: string): Promise<ExternalMapping | undefined>;
  createExternalMapping(mapping: InsertExternalMapping): Promise<ExternalMapping>;
  updateExternalMapping(id: string, mapping: Partial<InsertExternalMapping>): Promise<ExternalMapping>;

  // Customer notes operations
  getCustomerNotes(customerId: string): Promise<CustomerNote[]>;
  createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote>;
  updateCustomerNote(id: string, note: Partial<InsertCustomerNote>): Promise<CustomerNote>;

  // Employee schedule operations
  getEmployeeSchedules(userId?: string): Promise<EmployeeSchedule[]>;
  getEmployeeSchedule(id: string): Promise<EmployeeSchedule | undefined>;
  createEmployeeSchedule(schedule: InsertEmployeeSchedule): Promise<EmployeeSchedule>;
  updateEmployeeSchedule(id: string, schedule: Partial<InsertEmployeeSchedule>): Promise<EmployeeSchedule>;
  deleteEmployeeSchedule(id: string): Promise<void>;

  // Task assignment operations
  getTaskAssignments(userId?: string): Promise<TaskAssignment[]>;
  createTaskAssignment(task: InsertTaskAssignment): Promise<TaskAssignment>;
  updateTaskAssignment(id: string, task: Partial<InsertTaskAssignment>): Promise<TaskAssignment>;

  // Employee operations
  getEmployees(): Promise<User[]>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    totalRevenue: number;
    activeCustomers: number;
    pendingInvoices: number;
    lastSyncAt: Date | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Customer operations
  async getCustomers(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async searchCustomers(userId: string, query: string): Promise<Customer[]> {
    const { ilike } = await import("drizzle-orm");
    return await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.userId, userId),
          ilike(customers.name, `%${query}%`)
        )
      )
      .limit(10);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Product operations
  async getProducts(userId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Invoice operations
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Invoice item operations
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem> {
    const [updatedItem] = await db
      .update(invoiceItems)
      .set(item)
      .where(eq(invoiceItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  // Integration operations
  async getIntegrations(userId: string): Promise<Integration[]> {
    return await db.select().from(integrations).where(eq(integrations.userId, userId));
  }

  async getIntegration(userId: string, provider: string): Promise<Integration | undefined> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)));
    return integration;
  }

  async getIntegrationByRealmId(realmId: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.realmId, realmId));
    return integration;
  }

  async upsertIntegration(integration: InsertIntegration): Promise<Integration> {
    const [newIntegration] = await db
      .insert(integrations)
      .values(integration)
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.provider],
        set: {
          ...integration,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newIntegration;
  }

  // Activity log operations
  async getActivityLogs(userId: string, limit = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalRevenue: number;
    activeCustomers: number;
    pendingInvoices: number;
    lastSyncAt: Date | null;
  }> {
    // Get total revenue from paid invoices
    const revenueResult = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.status, 'paid')));
    
    const totalRevenue = revenueResult.reduce((sum, invoice) => 
      sum + parseFloat(invoice.totalAmount || '0'), 0);

    // Get active customers count
    const customersResult = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId));
    const activeCustomers = customersResult.length;

    // Get pending invoices count
    const pendingResult = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.status, 'sent')));
    const pendingInvoices = pendingResult.length;

    // Get last sync time
    const integrationsResult = await db
      .select()
      .from(integrations)
      .where(eq(integrations.userId, userId))
      .orderBy(desc(integrations.lastSyncAt))
      .limit(1);
    
    const lastSyncAt = integrationsResult[0]?.lastSyncAt || null;

    return {
      totalRevenue,
      activeCustomers,
      pendingInvoices,
      lastSyncAt,
    };
  }

  // Time entry operations
  async getTimeEntries(userId: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.userId, userId)).orderBy(desc(timeEntries.createdAt));
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [newEntry] = await db.insert(timeEntries).values(timeEntry).returning();
    return newEntry;
  }

  async updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({ ...timeEntry, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  // Material entry operations
  async getMaterialEntries(userId: string): Promise<MaterialEntry[]> {
    return await db.select().from(materialEntries).where(eq(materialEntries.userId, userId)).orderBy(desc(materialEntries.createdAt));
  }

  async getMaterialEntry(id: string): Promise<MaterialEntry | undefined> {
    const [entry] = await db.select().from(materialEntries).where(eq(materialEntries.id, id));
    return entry;
  }

  async createMaterialEntry(materialEntry: InsertMaterialEntry): Promise<MaterialEntry> {
    const [newEntry] = await db.insert(materialEntries).values(materialEntry).returning();
    return newEntry;
  }

  async updateMaterialEntry(id: string, materialEntry: Partial<InsertMaterialEntry>): Promise<MaterialEntry> {
    const [updatedEntry] = await db
      .update(materialEntries)
      .set({ ...materialEntry, updatedAt: new Date() })
      .where(eq(materialEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteMaterialEntry(id: string): Promise<void> {
    await db.delete(materialEntries).where(eq(materialEntries.id, id));
  }

  // Clock entry operations
  async getClockEntries(userId: string): Promise<ClockEntry[]> {
    return await db.select().from(clockEntries).where(eq(clockEntries.userId, userId)).orderBy(desc(clockEntries.createdAt));
  }

  async getActiveClockEntry(userId: string): Promise<ClockEntry | undefined> {
    const [entry] = await db.select().from(clockEntries).where(and(eq(clockEntries.userId, userId), eq(clockEntries.status, 'active')));
    return entry;
  }

  async createClockEntry(clockEntry: InsertClockEntry): Promise<ClockEntry> {
    const [newEntry] = await db.insert(clockEntries).values(clockEntry).returning();
    return newEntry;
  }

  async updateClockEntry(id: string, clockEntry: Partial<InsertClockEntry>): Promise<ClockEntry> {
    const [updatedEntry] = await db
      .update(clockEntries)
      .set({ ...clockEntry, updatedAt: new Date() })
      .where(eq(clockEntries.id, id))
      .returning();
    return updatedEntry;
  }

  // Timesheet line item operations
  async getTimesheetLineItems(timeEntryId: string): Promise<TimesheetLineItem[]> {
    return await db.select().from(timesheetLineItems).where(eq(timesheetLineItems.timeEntryId, timeEntryId));
  }

  async createTimesheetLineItem(lineItem: InsertTimesheetLineItem): Promise<TimesheetLineItem> {
    const [newItem] = await db.insert(timesheetLineItems).values(lineItem).returning();
    return newItem;
  }

  async deleteTimesheetLineItems(timeEntryId: string): Promise<void> {
    await db.delete(timesheetLineItems).where(eq(timesheetLineItems.timeEntryId, timeEntryId));
  }

  // Sync log operations
  async getSyncLogs(userId: string, limit: number = 50): Promise<SyncLog[]> {
    return await db.select().from(syncLogs).where(eq(syncLogs.userId, userId)).orderBy(desc(syncLogs.createdAt)).limit(limit);
  }

  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const [newLog] = await db.insert(syncLogs).values(log).returning();
    return newLog;
  }

  // External mapping operations
  async getExternalMapping(userId: string, provider: string, entityType: string, externalId: string): Promise<ExternalMapping | undefined> {
    const [mapping] = await db.select().from(externalMappings).where(
      and(
        eq(externalMappings.userId, userId),
        eq(externalMappings.provider, provider),
        eq(externalMappings.entityType, entityType),
        eq(externalMappings.externalId, externalId)
      )
    );
    return mapping;
  }

  async createExternalMapping(mapping: InsertExternalMapping): Promise<ExternalMapping> {
    const [newMapping] = await db.insert(externalMappings).values(mapping).returning();
    return newMapping;
  }

  async updateExternalMapping(id: string, mapping: Partial<InsertExternalMapping>): Promise<ExternalMapping> {
    const [updatedMapping] = await db
      .update(externalMappings)
      .set(mapping)
      .where(eq(externalMappings.id, id))
      .returning();
    return updatedMapping;
  }

  // Customer notes operations
  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    return await db.select().from(customerNotes).where(eq(customerNotes.customerId, customerId)).orderBy(desc(customerNotes.createdAt));
  }

  async createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote> {
    const [newNote] = await db.insert(customerNotes).values(note).returning();
    return newNote;
  }

  async updateCustomerNote(id: string, note: Partial<InsertCustomerNote>): Promise<CustomerNote> {
    const [updatedNote] = await db
      .update(customerNotes)
      .set(note)
      .where(eq(customerNotes.id, id))
      .returning();
    return updatedNote;
  }

  // Employee schedule operations
  async getEmployeeSchedules(userId?: string): Promise<EmployeeSchedule[]> {
    const query = db.select().from(employeeSchedules).orderBy(desc(employeeSchedules.startTime));
    if (userId) {
      return await query.where(eq(employeeSchedules.employeeId, userId));
    }
    return await query;
  }

  async getEmployeeSchedule(id: string): Promise<EmployeeSchedule | undefined> {
    const [schedule] = await db.select().from(employeeSchedules).where(eq(employeeSchedules.id, id));
    return schedule;
  }

  async createEmployeeSchedule(schedule: InsertEmployeeSchedule): Promise<EmployeeSchedule> {
    const [newSchedule] = await db.insert(employeeSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateEmployeeSchedule(id: string, schedule: Partial<InsertEmployeeSchedule>): Promise<EmployeeSchedule> {
    const [updatedSchedule] = await db
      .update(employeeSchedules)
      .set(schedule)
      .where(eq(employeeSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteEmployeeSchedule(id: string): Promise<void> {
    await db.delete(employeeSchedules).where(eq(employeeSchedules.id, id));
  }

  // Task assignment operations
  async getTaskAssignments(userId?: string): Promise<TaskAssignment[]> {
    const query = db.select().from(taskAssignments).orderBy(desc(taskAssignments.createdAt));
    if (userId) {
      return await query.where(eq(taskAssignments.assignedTo, userId));
    }
    return await query;
  }

  async createTaskAssignment(task: InsertTaskAssignment): Promise<TaskAssignment> {
    const [newTask] = await db.insert(taskAssignments).values(task).returning();
    return newTask;
  }

  async updateTaskAssignment(id: string, task: Partial<InsertTaskAssignment>): Promise<TaskAssignment> {
    const [updatedTask] = await db
      .update(taskAssignments)
      .set(task)
      .where(eq(taskAssignments.id, id))
      .returning();
    return updatedTask;
  }

  // Employee operations
  async getEmployees(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
}

export const storage = new DatabaseStorage();
