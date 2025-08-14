declare module 'node-quickbooks' {
  interface QuickBooksCallback<T = any> {
    (error: any, data?: T): void;
  }

  export default class QuickBooks {
    constructor(
      clientId: string,
      clientSecret: string,
      oauthToken: string,
      oauthTokenSecret: boolean,
      realmId: string,
      useSandbox: boolean,
      enableDebugging: boolean,
      minorVersion: number
    );

    getCustomer(id: string, callback: QuickBooksCallback): void;
    getItem(id: string, callback: QuickBooksCallback): void;
    getInvoice(id: string, callback: QuickBooksCallback): void;
    createCustomer(customer: any, callback: QuickBooksCallback): void;
    createItem(item: any, callback: QuickBooksCallback): void;
    createInvoice(invoice: any, callback: QuickBooksCallback): void;
    updateCustomer(customer: any, callback: QuickBooksCallback): void;
    updateItem(item: any, callback: QuickBooksCallback): void;
    updateInvoice(invoice: any, callback: QuickBooksCallback): void;
  }
}