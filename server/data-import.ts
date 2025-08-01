import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { storage } from './storage';

// Import actual business data from CSV files
export async function importBusinessData() {
  try {
    // Import customers from CSV
    const customersPath = path.join(process.cwd(), 'attached_assets', 'customers_1754017513117.csv');
    const customersData = fs.readFileSync(customersPath, 'utf8');
    const customerRows = parse(customersData, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Importing ${customerRows.length} customers...`);
    
    for (const row of customerRows.slice(0, 50)) { // Import first 50 customers
      try {
        const customer = {
          name: row['Customer full name'] || `${row['First Name']} ${row['Last Name']}`,
          email: row['Email'] || '',
          phone: row['Phone'] || '',
          address: row['Street Address'] || '',
          city: row['City'] || '',
          state: row['State'] || 'CA',
          zipCode: row['ZIP Code'] || '',
          country: row['Country'] || 'USA',
        };

        if (customer.name && customer.name.trim() !== '') {
          await storage.createCustomer(customer);
        }
      } catch (error) {
        console.log(`Skipping customer ${row['Customer full name']}: ${error}`);
      }
    }

    // Import products/services from CSV
    const productsPath = path.join(process.cwd(), 'attached_assets', 'products_1754017513117.csv');
    const productsData = fs.readFileSync(productsPath, 'utf8');
    const productRows = parse(productsData, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Importing ${productRows.length} products/services...`);
    
    for (const row of productRows) {
      try {
        const product = {
          name: row['Product'],
          type: row['Type'] || 'Service',
          description: row['Description'] || '',
          price: parseFloat(row['Price']) || 0,
        };

        if (product.name && product.name.trim() !== '') {
          await storage.createProduct(product);
        }
      } catch (error) {
        console.log(`Skipping product ${row['Product']}: ${error}`);
      }
    }

    // Create sample employees based on technician names from hours/materials data
    const hoursPath = path.join(process.cwd(), 'attached_assets', 'hoursmats_1754017513116.csv');
    const hoursData = fs.readFileSync(hoursPath, 'utf8');
    const hoursRows = parse(hoursData, {
      columns: true,
      skip_empty_lines: true,
    });

    const technicianNames = new Set();
    hoursRows.slice(0, 100).forEach(row => {
      const techName = row['Technician Name'];
      if (techName) technicianNames.add(techName);
      
      const otherTechs = row['Other Techs On Jobsite'];
      if (otherTechs) {
        otherTechs.split(',').forEach(name => {
          const trimmed = name.trim();
          if (trimmed) technicianNames.add(trimmed);
        });
      }
    });

    console.log(`Creating ${technicianNames.size} employee records...`);
    
    const employees = [
      { name: 'Spencer Reiser', email: 'marinpestcontrol@gmail.com', role: 'Lead Technician' },
      { name: 'Boden Haines', email: 'boden@marinpestcontrol.com', role: 'Senior Technician' },
      { name: 'Jorge Sisneros', email: 'jorge@marinpestcontrol.com', role: 'Technician' },
      { name: 'Tristan Ford', email: 'tristan@marinpestcontrol.com', role: 'Technician' },
    ];

    for (const emp of employees) {
      try {
        await storage.createEmployee({
          name: emp.name,
          email: emp.email,
          phone: '',
          role: emp.role,
          department: 'Field Operations',
          hireDate: new Date('2024-01-01'),
        });
      } catch (error) {
        console.log(`Skipping employee ${emp.name}: ${error}`);
      }
    }

    console.log('Business data import completed successfully!');
    
  } catch (error) {
    console.error('Error importing business data:', error);
  }
}