import { Integration, Customer, Product, Invoice, InvoiceItem } from "@shared/schema";

export class QuickBooksService {
  private baseUrl = 'https://sandbox-quickbooks.api.intuit.com';
  private integration?: Integration;

  constructor(integration?: Integration) {
    this.integration = integration;
  }

  getAuthUrl(): string {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID || process.env.QB_CLIENT_ID || 'default_client_id';
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/integrations/quickbooks/callback`;
    const scope = 'com.intuit.quickbooks.accounting';
    const state = Math.random().toString(36).substring(7);

    return `https://appcenter.intuit.com/connect/oauth2?` +
      `client_id=${clientId}&` +
      `scope=${scope}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `state=${state}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID || process.env.QB_CLIENT_ID || 'default_client_id';
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || process.env.QB_CLIENT_SECRET || 'default_client_secret';
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/integrations/quickbooks/callback`;

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async makeRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
    if (!this.integration?.accessToken || !this.integration?.realmId) {
      throw new Error('QuickBooks integration not configured');
    }

    const url = `${this.baseUrl}/v3/company/${this.integration.realmId}/${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.integration.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getCustomers(): Promise<any[]> {
    try {
      const data = await this.makeRequest("query?query=SELECT * FROM Customer");
      return data.QueryResponse?.Customer || [];
    } catch (error) {
      console.error('Error fetching QuickBooks customers:', error);
      return [];
    }
  }

  async createCustomer(customer: Customer): Promise<any> {
    const qbCustomer = {
      Name: customer.name,
      CompanyName: customer.companyName,
      PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
      PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
      BillAddr: customer.address ? {
        Line1: customer.address,
        City: customer.city,
        CountrySubDivisionCode: customer.state,
        PostalCode: customer.zipCode,
        Country: customer.country,
      } : undefined,
    };

    const data = await this.makeRequest('customer', 'POST', qbCustomer);
    return data.QueryResponse?.Customer?.[0];
  }

  async getItems(): Promise<any[]> {
    try {
      const data = await this.makeRequest("query?query=SELECT * FROM Item WHERE Type='Service' OR Type='Inventory'");
      return data.QueryResponse?.Item || [];
    } catch (error) {
      console.error('Error fetching QuickBooks items:', error);
      return [];
    }
  }

  async createItem(product: Product): Promise<any> {
    const qbItem = {
      Name: product.name,
      Description: product.description,
      Type: product.type === 'product' ? 'Inventory' : 'Service',
      UnitPrice: parseFloat(product.unitPrice || '0'),
      IncomeAccountRef: { value: "1" }, // Default income account
    };

    const data = await this.makeRequest('item', 'POST', qbItem);
    return data.QueryResponse?.Item?.[0];
  }

  async createInvoice(invoice: Invoice, items: InvoiceItem[]): Promise<any> {
    const qbInvoice = {
      CustomerRef: { value: invoice.customerId },
      TxnDate: invoice.invoiceDate,
      DueDate: invoice.dueDate,
      DocNumber: invoice.invoiceNumber,
      Line: items.map((item, index) => ({
        Id: (index + 1).toString(),
        LineNum: index + 1,
        Amount: parseFloat(item.amount),
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "1" }, // Default item reference
          Qty: parseFloat(item.quantity),
          UnitPrice: parseFloat(item.unitPrice),
        },
      })),
    };

    const data = await this.makeRequest('invoice', 'POST', qbInvoice);
    return data.QueryResponse?.Invoice?.[0];
  }
}
