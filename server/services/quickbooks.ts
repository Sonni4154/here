import QuickBooks from 'node-quickbooks';
import { storage } from '../storage';
import type { 
  Customer, 
  Product, 
  Invoice, 
  InsertCustomer, 
  InsertProduct, 
  InsertInvoice 
} from '@shared/schema';

export interface QuickBooksConfig {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  realmId: string;
  useSandbox: boolean;
}

export class QuickBooksService {
  private qbo: any;
  private userId: string;
  private integrationId: string;

  constructor(config: QuickBooksConfig, userId: string, integrationId: string) {
    this.userId = userId;
    this.integrationId = integrationId;
    
    this.qbo = new QuickBooks(
      config.consumerKey,
      config.consumerSecret,
      config.accessToken,
      config.accessTokenSecret,
      config.realmId,
      config.useSandbox,
      true, // enable debugging
      null, // minor version
      '2.0', // version
      null // access token
    );
  }

  async syncCustomers(direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'): Promise<void> {
    try {
      await storage.createSyncLog({
        userId: this.userId,
        integrationId: this.integrationId,
        operation: 'sync',
        entityType: 'customer',
        status: 'pending',
        direction,
      });

      if (direction === 'pull' || direction === 'bidirectional') {
        await this.pullCustomersFromQuickBooks();
      }

      if (direction === 'push' || direction === 'bidirectional') {
        await this.pushCustomersToQuickBooks();
      }
    } catch (error) {
      console.error('Error syncing customers:', error);
      await storage.createSyncLog({
        userId: this.userId,
        integrationId: this.integrationId,
        operation: 'sync',
        entityType: 'customer',
        status: 'error',
        direction,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async pullCustomersFromQuickBooks(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.qbo.findCustomers(async (err: any, customers: any) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          for (const qbCustomer of customers.QueryResponse?.Customer || []) {
            const existingMapping = await storage.getExternalMapping(
              this.userId,
              'quickbooks',
              'customer',
              qbCustomer.Id
            );

            const customerData: InsertCustomer = {
              userId: this.userId,
              name: qbCustomer.Name,
              email: qbCustomer.PrimaryEmailAddr?.Address || '',
              phone: qbCustomer.PrimaryPhone?.FreeFormNumber || '',
              address: this.formatAddress(qbCustomer.BillAddr),
              companyName: qbCustomer.CompanyName || qbCustomer.Name,
              website: qbCustomer.WebAddr?.URI || '',
              notes: qbCustomer.Notes || '',
              quickbooksId: qbCustomer.Id,
              syncStatus: 'synced',
            };

            if (existingMapping) {
              // Update existing customer
              await storage.updateCustomer(existingMapping.internalId, customerData);
              await storage.updateExternalMapping(existingMapping.id, {
                lastSyncAt: new Date(),
              });
            } else {
              // Create new customer
              const newCustomer = await storage.createCustomer(customerData);
              await storage.createExternalMapping({
                userId: this.userId,
                provider: 'quickbooks',
                entityType: 'customer',
                internalId: newCustomer.id,
                externalId: qbCustomer.Id,
              });
            }

            await storage.createSyncLog({
              userId: this.userId,
              integrationId: this.integrationId,
              operation: 'pull',
              entityType: 'customer',
              externalId: qbCustomer.Id,
              status: 'success',
              direction: 'inbound',
            });
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async pushCustomersToQuickBooks(): Promise<void> {
    const customers = await storage.getCustomers(this.userId);
    const unsynced = customers.filter(c => !c.quickbooksId || c.syncStatus !== 'synced');

    for (const customer of unsynced) {
      try {
        const qbCustomerData = {
          Name: customer.name,
          CompanyName: customer.companyName || customer.name,
          PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
          PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
          WebAddr: customer.website ? { URI: customer.website } : undefined,
          BillAddr: this.parseAddress(customer.address),
          Notes: customer.notes || '',
        };

        if (customer.quickbooksId) {
          // Update existing QB customer
          await new Promise((resolve, reject) => {
            this.qbo.updateCustomer({ ...qbCustomerData, Id: customer.quickbooksId }, (err: any, updatedCustomer: any) => {
              if (err) reject(err);
              else resolve(updatedCustomer);
            });
          });
        } else {
          // Create new QB customer
          const qbCustomer: any = await new Promise((resolve, reject) => {
            this.qbo.createCustomer(qbCustomerData, (err: any, newCustomer: any) => {
              if (err) reject(err);
              else resolve(newCustomer);
            });
          });

          // Update local customer with QB ID
          await storage.updateCustomer(customer.id, {
            quickbooksId: qbCustomer.Id,
            syncStatus: 'synced',
          });

          // Create mapping
          await storage.createExternalMapping({
            userId: this.userId,
            provider: 'quickbooks',
            entityType: 'customer',
            internalId: customer.id,
            externalId: qbCustomer.Id,
          });
        }

        await storage.createSyncLog({
          userId: this.userId,
          integrationId: this.integrationId,
          operation: 'push',
          entityType: 'customer',
          entityId: customer.id,
          externalId: customer.quickbooksId,
          status: 'success',
          direction: 'outbound',
        });
      } catch (error) {
        await storage.updateCustomer(customer.id, {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        });

        await storage.createSyncLog({
          userId: this.userId,
          integrationId: this.integrationId,
          operation: 'push',
          entityType: 'customer',
          entityId: customer.id,
          status: 'error',
          direction: 'outbound',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  async syncProducts(direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'): Promise<void> {
    try {
      if (direction === 'pull' || direction === 'bidirectional') {
        await this.pullItemsFromQuickBooks();
      }

      if (direction === 'push' || direction === 'bidirectional') {
        await this.pushProductsToQuickBooks();
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      throw error;
    }
  }

  private async pullItemsFromQuickBooks(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.qbo.findItems(async (err: any, items: any) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          for (const qbItem of items.QueryResponse?.Item || []) {
            if (!qbItem.Active) continue; // Skip inactive items

            const productData: InsertProduct = {
              userId: this.userId,
              name: qbItem.Name,
              description: qbItem.Description || '',
              price: parseFloat(qbItem.UnitPrice || '0'),
              type: qbItem.Type === 'Service' ? 'service' : 'product',
              sku: qbItem.QtyOnHand ? qbItem.Sku : '',
              quickbooksId: qbItem.Id,
              syncStatus: 'synced',
            };

            const existingMapping = await storage.getExternalMapping(
              this.userId,
              'quickbooks',
              'product',
              qbItem.Id
            );

            if (existingMapping) {
              await storage.updateProduct(existingMapping.internalId, productData);
            } else {
              const newProduct = await storage.createProduct(productData);
              await storage.createExternalMapping({
                userId: this.userId,
                provider: 'quickbooks',
                entityType: 'product',
                internalId: newProduct.id,
                externalId: qbItem.Id,
              });
            }
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async pushProductsToQuickBooks(): Promise<void> {
    const products = await storage.getProducts(this.userId);
    const unsynced = products.filter(p => !p.quickbooksId || p.syncStatus !== 'synced');

    for (const product of unsynced) {
      try {
        const qbItemData = {
          Name: product.name,
          Description: product.description,
          UnitPrice: product.price,
          Type: product.type === 'service' ? 'Service' : 'Inventory',
          IncomeAccountRef: { value: "1" }, // Default income account
          Active: true,
        };

        if (product.quickbooksId) {
          await new Promise((resolve, reject) => {
            this.qbo.updateItem({ ...qbItemData, Id: product.quickbooksId }, (err: any, updatedItem: any) => {
              if (err) reject(err);
              else resolve(updatedItem);
            });
          });
        } else {
          const qbItem: any = await new Promise((resolve, reject) => {
            this.qbo.createItem(qbItemData, (err: any, newItem: any) => {
              if (err) reject(err);
              else resolve(newItem);
            });
          });

          await storage.updateProduct(product.id, {
            quickbooksId: qbItem.Id,
            syncStatus: 'synced',
          });

          await storage.createExternalMapping({
            userId: this.userId,
            provider: 'quickbooks',
            entityType: 'product',
            internalId: product.id,
            externalId: qbItem.Id,
          });
        }
      } catch (error) {
        await storage.updateProduct(product.id, {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      for (const event of payload.eventNotifications || []) {
        for (const dataChange of event.dataChangeEvent?.entities || []) {
          const { name: entityType, id: entityId, operation } = dataChange;

          await storage.createSyncLog({
            userId: this.userId,
            integrationId: this.integrationId,
            operation: 'webhook',
            entityType: entityType.toLowerCase(),
            externalId: entityId,
            status: 'pending',
            direction: 'inbound',
            metadata: { webhook: payload },
          });

          // Process the webhook based on entity type and operation
          switch (entityType.toLowerCase()) {
            case 'customer':
              if (operation === 'Create' || operation === 'Update') {
                await this.syncSpecificCustomer(entityId);
              } else if (operation === 'Delete') {
                await this.handleCustomerDeletion(entityId);
              }
              break;
            case 'item':
              if (operation === 'Create' || operation === 'Update') {
                await this.syncSpecificItem(entityId);
              }
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error handling QuickBooks webhook:', error);
      throw error;
    }
  }

  private async syncSpecificCustomer(qbCustomerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.qbo.getCustomer(qbCustomerId, async (err: any, customer: any) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const mapping = await storage.getExternalMapping(
            this.userId,
            'quickbooks',
            'customer',
            qbCustomerId
          );

          const customerData: InsertCustomer = {
            userId: this.userId,
            name: customer.Name,
            email: customer.PrimaryEmailAddr?.Address || '',
            phone: customer.PrimaryPhone?.FreeFormNumber || '',
            address: this.formatAddress(customer.BillAddr),
            companyName: customer.CompanyName || customer.Name,
            website: customer.WebAddr?.URI || '',
            notes: customer.Notes || '',
            quickbooksId: customer.Id,
            syncStatus: 'synced',
          };

          if (mapping) {
            await storage.updateCustomer(mapping.internalId, customerData);
          } else {
            const newCustomer = await storage.createCustomer(customerData);
            await storage.createExternalMapping({
              userId: this.userId,
              provider: 'quickbooks',
              entityType: 'customer',
              internalId: newCustomer.id,
              externalId: qbCustomerId,
            });
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async syncSpecificItem(qbItemId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.qbo.getItem(qbItemId, async (err: any, item: any) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const mapping = await storage.getExternalMapping(
            this.userId,
            'quickbooks',
            'product',
            qbItemId
          );

          const productData: InsertProduct = {
            userId: this.userId,
            name: item.Name,
            description: item.Description || '',
            price: parseFloat(item.UnitPrice || '0'),
            type: item.Type === 'Service' ? 'service' : 'product',
            sku: item.Sku || '',
            quickbooksId: item.Id,
            syncStatus: 'synced',
          };

          if (mapping) {
            await storage.updateProduct(mapping.internalId, productData);
          } else {
            const newProduct = await storage.createProduct(productData);
            await storage.createExternalMapping({
              userId: this.userId,
              provider: 'quickbooks',
              entityType: 'product',
              internalId: newProduct.id,
              externalId: qbItemId,
            });
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async handleCustomerDeletion(qbCustomerId: string): Promise<void> {
    const mapping = await storage.getExternalMapping(
      this.userId,
      'quickbooks',
      'customer',
      qbCustomerId
    );

    if (mapping) {
      // Soft delete or mark as inactive rather than hard delete
      await storage.updateCustomer(mapping.internalId, {
        isActive: false,
        syncStatus: 'deleted',
      });
    }
  }

  private formatAddress(addr: any): string {
    if (!addr) return '';
    const parts = [
      addr.Line1,
      addr.City,
      addr.CountrySubDivisionCode,
      addr.PostalCode
    ].filter(Boolean);
    return parts.join(', ');
  }

  private parseAddress(address: string): any {
    if (!address) return undefined;
    const parts = address.split(', ');
    return {
      Line1: parts[0] || '',
      City: parts[1] || '',
      CountrySubDivisionCode: parts[2] || '',
      PostalCode: parts[3] || '',
    };
  }
}

export async function createQuickBooksService(userId: string): Promise<QuickBooksService | null> {
  try {
    const integration = await storage.getIntegration(userId, 'quickbooks');
    if (!integration || !integration.isActive) {
      return null;
    }

    const config: QuickBooksConfig = {
      consumerKey: process.env.QUICKBOOKS_CLIENT_ID!,
      consumerSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
      accessToken: integration.accessToken!,
      accessTokenSecret: integration.refreshToken!,
      realmId: integration.realmId || integration.companyId!,
      useSandbox: process.env.QUICKBOOKS_SANDBOX_BASE_URL?.includes('sandbox') || false,
    };

    return new QuickBooksService(config, userId, integration.id);
  } catch (error) {
    console.error('Error creating QuickBooks service:', error);
    return null;
  }
}