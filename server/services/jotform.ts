import { Customer, Invoice } from "@shared/schema";

export class JotFormService {
  private apiKey: string;
  private baseUrl = 'https://api.jotform.com';

  constructor() {
    this.apiKey = process.env.JOTFORM_API_KEY || process.env.JF_API_KEY;
  }

  private async makeRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'APIKEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`JotForm API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getForms(): Promise<any[]> {
    try {
      const data = await this.makeRequest('/forms');
      return data.content || [];
    } catch (error) {
      console.error('Error fetching JotForm forms:', error);
      return [];
    }
  }

  async getFormSubmissions(formId: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/form/${formId}/submissions`);
      return data.content || [];
    } catch (error) {
      console.error('Error fetching JotForm submissions:', error);
      return [];
    }
  }

  parseSubmissionToCustomer(submission: any): Partial<Customer> {
    const answers = submission.answers || {};
    
    // Map common field names to customer properties
    const customer: Partial<Customer> = {
      name: answers.name?.answer || answers.fullName?.answer || answers.customerName?.answer,
      email: answers.email?.answer || answers.emailAddress?.answer,
      phone: answers.phone?.answer || answers.phoneNumber?.answer,
      companyName: answers.company?.answer || answers.companyName?.answer,
      address: answers.address?.answer,
    };

    return customer;
  }

  parseSubmissionToInvoice(submission: any): Partial<Invoice> {
    const answers = submission.answers || {};
    
    const invoice: Partial<Invoice> = {
      invoiceDate: new Date(),
      dueDate: answers.dueDate?.answer ? new Date(answers.dueDate.answer) : undefined,
      subtotal: answers.amount?.answer || answers.total?.answer || '0',
      totalAmount: answers.amount?.answer || answers.total?.answer || '0',
      notes: answers.notes?.answer || answers.description?.answer,
    };

    return invoice;
  }
}
