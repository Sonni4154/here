import { Customer, Invoice } from "@shared/schema";

export class GoogleService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.GG_CLIENT_ID || 'default_client_id';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GG_CLIENT_SECRET || 'default_client_secret';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/integrations/google/callback`;
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ].join(' ');

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google OAuth token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async createSpreadsheet(accessToken: string, title: string, data: any[]): Promise<string> {
    // Create new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create spreadsheet: ${createResponse.statusText}`);
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Add data to spreadsheet
    if (data.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: data,
        }),
      });
    }

    return spreadsheetId;
  }

  async exportCustomersToSheets(accessToken: string, customers: Customer[]): Promise<string> {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Address', 'Created Date'];
    const rows = customers.map(customer => [
      customer.name,
      customer.email || '',
      customer.phone || '',
      customer.companyName || '',
      customer.address || '',
      customer.createdAt?.toISOString().split('T')[0] || '',
    ]);

    return await this.createSpreadsheet(accessToken, 'Customer Export', [headers, ...rows]);
  }

  async exportInvoicesToSheets(accessToken: string, invoices: Invoice[]): Promise<string> {
    const headers = ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Amount', 'Status'];
    const rows = invoices.map(invoice => [
      invoice.invoiceNumber,
      invoice.customerId, // You might want to resolve this to customer name
      invoice.invoiceDate?.toISOString().split('T')[0] || '',
      invoice.dueDate?.toISOString().split('T')[0] || '',
      invoice.totalAmount,
      invoice.status,
    ]);

    return await this.createSpreadsheet(accessToken, 'Invoice Export', [headers, ...rows]);
  }
}
