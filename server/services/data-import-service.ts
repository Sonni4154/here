import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { join } from 'path';
import { storage } from '../storage';
import type { InsertCustomer, InsertProduct } from '@shared/schema';

export class DataImportService {
  
  /**
   * Import products/services from CSV file
   */
  async importProducts(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const csvPath = join(process.cwd(), 'attached_assets', 'products_1754017513117.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const records = await new Promise<any[]>((resolve, reject) => {
        parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        }, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });

      console.log(`Processing ${records.length} product records...`);

      for (const record of records) {
        try {
          // Skip empty or invalid records
          if (!record.Product || record.Product.trim() === '') {
            continue;
          }

          const product: InsertProduct = {
            name: record.Product.trim(),
            type: record.Type?.trim() || 'Service',
            description: record.Description?.trim() || '',
            price: this.parsePrice(record.Price),
            isActive: true,
            quickbooksId: null,
            quickbooksListId: null,
            lastSyncDate: new Date()
          };

          // Check if product already exists
          const existingProducts = await storage.getProducts();
          const exists = existingProducts.find(p => 
            p.name.toLowerCase() === product.name.toLowerCase()
          );

          if (!exists) {
            await storage.createProduct(product);
            imported++;
            console.log(`✓ Imported product: ${product.name}`);
          } else {
            console.log(`- Skipped existing product: ${product.name}`);
          }

        } catch (error) {
          const errorMsg = `Failed to import product "${record.Product}": ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

    } catch (error) {
      const errorMsg = `Failed to read or parse products CSV: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    return { imported, errors };
  }

  /**
   * Import customers from CSV file
   */
  async importCustomers(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const csvPath = join(process.cwd(), 'attached_assets', 'customers_1754017513117.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const records = await new Promise<any[]>((resolve, reject) => {
        parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        }, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });

      console.log(`Processing ${records.length} customer records...`);

      for (const record of records) {
        try {
          // Skip empty or invalid records
          if (!record['Customer full name'] || record['Customer full name'].trim() === '') {
            continue;
          }

          const customer: InsertCustomer = {
            name: record['Customer full name'].trim(),
            firstName: record['First Name']?.trim() || '',
            lastName: record['Last Name']?.trim() || '',
            email: record['Email']?.trim() || null,
            phone: this.formatPhone(record['Phone']),
            address: record['Street Address']?.trim() || '',
            city: record['City']?.trim() || '',
            state: record['State']?.trim() || '',
            zipCode: record['ZIP Code']?.trim() || '',
            country: record['Country']?.trim() || 'USA',
            isActive: true,
            quickbooksId: null,
            quickbooksListId: null,
            lastSyncDate: new Date()
          };

          // Check if customer already exists (by name or email)
          const existingCustomers = await storage.getCustomers();
          const exists = existingCustomers.find(c => 
            c.name.toLowerCase() === customer.name.toLowerCase() ||
            (c.email && customer.email && c.email.toLowerCase() === customer.email.toLowerCase())
          );

          if (!exists) {
            await storage.createCustomer(customer);
            imported++;
            console.log(`✓ Imported customer: ${customer.name}`);
          } else {
            console.log(`- Skipped existing customer: ${customer.name}`);
          }

        } catch (error) {
          const errorMsg = `Failed to import customer "${record['Customer full name']}": ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

    } catch (error) {
      const errorMsg = `Failed to read or parse customers CSV: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    return { imported, errors };
  }

  /**
   * Import all data (products and customers)
   */
  async importAllData(): Promise<{
    products: { imported: number; errors: string[] };
    customers: { imported: number; errors: string[] };
  }> {
    console.log('🚀 Starting data import process...');
    
    const products = await this.importProducts();
    const customers = await this.importCustomers();

    console.log(`📊 Import Summary:`);
    console.log(`   Products: ${products.imported} imported, ${products.errors.length} errors`);
    console.log(`   Customers: ${customers.imported} imported, ${customers.errors.length} errors`);

    return { products, customers };
  }

  /**
   * Parse price from string, handling various formats
   */
  private parsePrice(priceStr: string): number {
    if (!priceStr || priceStr.trim() === '') return 0;
    
    // Remove currency symbols and whitespace
    const cleaned = priceStr.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Format phone number to a consistent format
   */
  private formatPhone(phone: string): string | null {
    if (!phone || phone.trim() === '') return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for 10 digit numbers
    if (digits.length === 10) {
      return `(${digits.substr(0, 3)}) ${digits.substr(3, 3)}-${digits.substr(6, 4)}`;
    }
    
    // Return original if not standard format
    return phone.trim();
  }
}

export const dataImportService = new DataImportService();