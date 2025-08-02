import axios from 'axios';
import { storage } from '../storage';

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  realmId: string;
}

interface QuickBooksCustomer {
  Id: string;
  Name: string;
  CompanyName?: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  Active: boolean;
}

interface QuickBooksItem {
  Id: string;
  Name: string;
  Type: string;
  UnitPrice?: number;
  QtyOnHand?: number;
  Description?: string;
  Active: boolean;
}

export class QuickBooksService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private discoveryDocument: any;

  constructor() {
    this.baseUrl = process.env.QUICKBOOKS_SANDBOX_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com';
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID || 'ABHA55nxxxAxGrLFLqQ9eQ1jwZOQi3Bkef7tLKOUEHfDQepUqi';
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || 'JqcQnXW0NC6BVb9FPAv8NG8eZR2UXjQHxvnDd08D';
    
    // Use the sandbox discovery document from the attached file
    this.discoveryDocument = {
      "issuer": "https://oauth.platform.intuit.com/op/v1",
      "authorization_endpoint": "https://appcenter.intuit.com/connect/oauth2",
      "token_endpoint": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      "userinfo_endpoint": "https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo",
      "revocation_endpoint": "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"
    };
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: string, redirectUri: string): string {
    const scope = 'com.intuit.quickbooks.accounting';
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      state
    });

    return `${this.discoveryDocument.authorization_endpoint}?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, redirectUri: string, realmId: string): Promise<QuickBooksTokens> {
    try {
      const response = await axios.post(this.discoveryDocument.token_endpoint, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      return {
        ...response.data,
        realmId
      };
    } catch (error: any) {
      console.error('Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<QuickBooksTokens> {
    try {
      const response = await axios.post(this.discoveryDocument.token_endpoint, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(userId: string): Promise<string> {
    const integration = await storage.getIntegration(userId, 'quickbooks');
    if (!integration) {
      throw new Error('QuickBooks integration not found');
    }

    const { accessToken, refreshToken } = integration;
    if (!accessToken || !refreshToken) {
      throw new Error('Invalid integration tokens');
    }

    // For now, return the access token (token refresh logic can be added later)
    return accessToken;
  }

  // Sync customers from QuickBooks
  async syncCustomers(userId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId);
    const integration = await storage.getIntegration(userId, 'quickbooks');
    const realmId = integration?.realmId;

    if (!realmId) {
      throw new Error('QuickBooks realm ID not found');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/company/${realmId}/query?query=SELECT * FROM Customer MAXRESULTS 1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      const customers: QuickBooksCustomer[] = response.data.QueryResponse?.Customer || [];

      for (const qbCustomer of customers) {
        // Create new customer
        const customer = await storage.createCustomer({
          userId,
          name: qbCustomer.Name,
          companyName: qbCustomer.CompanyName || null,
          email: qbCustomer.PrimaryEmailAddr?.Address || null,
          phone: qbCustomer.PrimaryPhone?.FreeFormNumber || null,
          address: qbCustomer.BillAddr ? 
            [qbCustomer.BillAddr.Line1, qbCustomer.BillAddr.City, qbCustomer.BillAddr.CountrySubDivisionCode, qbCustomer.BillAddr.PostalCode]
              .filter(Boolean).join(', ') : null,
          quickbooksId: qbCustomer.Id
        });
      }

      // Log sync activity
      await storage.createActivityLog({
        userId,
        type: 'quickbooks_sync',
        description: `Synced ${customers.length} customers from QuickBooks`,
        metadata: { customerCount: customers.length }
      });

    } catch (error: any) {
      console.error('Error syncing customers:', error.response?.data || error.message);
      throw new Error('Failed to sync customers from QuickBooks');
    }
  }

  // Sync products/items from QuickBooks
  async syncItems(userId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId);
    const integration = await storage.getIntegration(userId, 'quickbooks');
    const realmId = integration?.realmId;

    if (!realmId) {
      throw new Error('QuickBooks realm ID not found');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/company/${realmId}/query?query=SELECT * FROM Item MAXRESULTS 1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      const items: QuickBooksItem[] = response.data.QueryResponse?.Item || [];

      for (const qbItem of items) {
        // Create new product
        const product = await storage.createProduct({
          userId,
          name: qbItem.Name,
          description: qbItem.Description || null,
          unitPrice: qbItem.UnitPrice?.toString() || '0.00',
          type: qbItem.Type.toLowerCase() === 'service' ? 'service' : 'product',
          quickbooksId: qbItem.Id
        });
      }

      // Log sync activity
      await storage.createActivityLog({
        userId,
        type: 'quickbooks_sync',
        description: `Synced ${items.length} items from QuickBooks`,
        metadata: { itemCount: items.length }
      });

    } catch (error: any) {
      console.error('Error syncing items:', error.response?.data || error.message);
      throw new Error('Failed to sync items from QuickBooks');
    }
  }

  // Full sync (customers and items)
  // Sync recent invoices (last N days)
  async syncRecentInvoices(userId: string, days: number = 30): Promise<{ count: number }> {
    const integration = await storage.getIntegration(userId, 'quickbooks');
    if (!integration || !integration.isActive) {
      throw new Error('QuickBooks integration not found or inactive');
    }

    await this.setCredentials(integration);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    try {
      const response = await this.makeRequest(
        `/v3/companyinfo/${integration.realmId}/query?query=SELECT * FROM Invoice WHERE TxnDate >= '${cutoffDate.toISOString().split('T')[0]}' MAXRESULTS 1000`,
        'GET'
      );

      const invoices = response.QueryResponse?.Invoice || [];
      let syncCount = 0;

      for (const qbInvoice of invoices) {
        await this.processInvoice(qbInvoice, userId);
        syncCount++;
      }

      console.log(`Synced ${syncCount} recent invoices`);
      return { count: syncCount };
    } catch (error) {
      console.error('Error syncing recent invoices:', error);
      throw error;
    }
  }

  async fullSync(userId: string): Promise<void> {
    console.log(`Starting full QuickBooks sync for user ${userId}`);
    
    const startTime = Date.now();
    
    try {
      await this.syncCustomers(userId);
      await this.syncItems(userId);
      await this.syncInvoices(userId);
      
      const duration = Date.now() - startTime;
      console.log(`Full sync completed in ${Math.round(duration / 1000)}s`);
      
      // Update last sync time
      await storage.upsertIntegration({
        userId,
        provider: 'quickbooks',
        lastSyncAt: new Date()
      } as any);
      
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }
}

export const quickbooksService = new QuickBooksService();