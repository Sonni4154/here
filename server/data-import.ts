import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { storage } from './storage';
import path from 'path';

interface CustomerCSVRow {
  'Customer Name': string;
  'Email': string;
  'Phone': string;
  'Address': string;
  'City': string;
  'State': string;
  'ZIP': string;
  'Company': string;
}

interface ProductCSVRow {
  'Product/Service Name': string;
  'Description': string;
  'Unit Price': string;
  'Type': string;
  'Category': string;
}

// Sample user ID for testing (replace with actual user ID in production)
const SAMPLE_USER_ID = 'sample-user-001';

export async function importCustomersFromCSV(userId: string = SAMPLE_USER_ID): Promise<void> {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'customers_1754017513117.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    const records: CustomerCSVRow[] = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    console.log(`Importing ${records.length} customers...`);

    for (const record of records) {
      if (record['Customer Name']?.trim()) {
        const address = [
          record['Address']?.trim(),
          record['City']?.trim(), 
          record['State']?.trim(),
          record['ZIP']?.trim()
        ].filter(Boolean).join(', ');

        await storage.createCustomer({
          userId,
          name: record['Customer Name'].trim(),
          companyName: record['Company']?.trim() || null,
          email: record['Email']?.trim() || null,
          phone: record['Phone']?.trim() || null,
          address: address || null,
          state: record['State']?.trim() || null,
          zipCode: record['ZIP']?.trim() || null,
          city: record['City']?.trim() || null
        });
      }
    }

    console.log(`Successfully imported ${records.length} customers`);
  } catch (error) {
    console.error('Error importing customers:', error);
    throw error;
  }
}

export async function importProductsFromCSV(userId: string = SAMPLE_USER_ID): Promise<void> {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'products_1754017513117.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    const records: ProductCSVRow[] = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    console.log(`Importing ${records.length} products...`);

    for (const record of records) {
      if (record['Product/Service Name']?.trim()) {
        const unitPrice = record['Unit Price']?.replace(/[$,]/g, '') || '0.00';
        const type = record['Type']?.toLowerCase().includes('service') ? 'service' : 'product';

        await storage.createProduct({
          userId,
          name: record['Product/Service Name'].trim(),
          description: record['Description']?.trim() || null,
          unitPrice: parseFloat(unitPrice).toFixed(2),
          type,
          category: record['Category']?.trim() || null
        });
      }
    }

    console.log(`Successfully imported ${records.length} products`);
  } catch (error) {
    console.error('Error importing products:', error);
    throw error;
  }
}

export async function importHoursMatFromCSV(userId: string = SAMPLE_USER_ID): Promise<void> {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'hoursmats_1754017513116.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    const records: any[] = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    console.log(`Processing ${records.length} hours/materials entries...`);

    // This would typically create time entries and material entries
    // For now, we'll log the data structure
    if (records.length > 0) {
      console.log('Sample hours/materials record:', records[0]);
    }

    console.log(`Processed ${records.length} hours/materials entries`);
  } catch (error) {
    console.error('Error importing hours/materials:', error);
    throw error;
  }
}

export async function importAllData(userId?: string): Promise<void> {
  const targetUserId = userId || SAMPLE_USER_ID;
  
  console.log('Starting data import...');
  
  try {
    await importCustomersFromCSV(targetUserId);
    await importProductsFromCSV(targetUserId);
    await importHoursMatFromCSV(targetUserId);
    
    // Log import completion
    await storage.createActivityLog({
      userId: targetUserId,
      type: 'data_import',
      description: 'Imported sample data from CSV files',
      metadata: { 
        source: 'csv_files',
        timestamp: new Date().toISOString()
      }
    });

    console.log('Data import completed successfully');
  } catch (error) {
    console.error('Data import failed:', error);
    throw error;
  }
}

// Auto-run import if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importAllData().catch(console.error);
}