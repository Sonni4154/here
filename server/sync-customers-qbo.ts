import { db } from './db';
import { customers } from '../shared/schema';
import { QuickBooksService } from './services/quickbooks-service';
import { storage } from './storage';
import { eq, isNull } from 'drizzle-orm';

interface QBOCustomer {
  Id: string;
  Name: string;
  CompanyName?: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  Active: boolean;
}

async function syncCustomersWithQBO() {
  console.log('🔄 Starting QuickBooks customer sync...');
  
  const qbService = new QuickBooksService();
  
  try {
    // Use a default user ID for admin operations
    const adminUserId = 'dev_user_123';
    
    // Check if QuickBooks tokens are available
    const integration = await storage.getIntegration(adminUserId, 'quickbooks');
    if (!integration || !integration.accessToken) {
      console.log('❌ QuickBooks not connected. Please connect to QBO first.');
      console.log('   Visit /api/integrations/quickbooks/connect to authorize QuickBooks access');
      return;
    }

    console.log('✅ QuickBooks integration found');

    // Get all customers from our database that don't have QBO IDs
    const localCustomers = await db
      .select()
      .from(customers)
      .where(isNull(customers.quickbooksId))
      .limit(100); // Start with first 100 for testing

    console.log(`📊 Found ${localCustomers.length} customers without QBO IDs`);

    // Get all customers from QuickBooks using the service's existing method
    console.log('🔍 Fetching customers from QuickBooks...');
    const qboCustomers = await fetchCustomersFromQBO(adminUserId, integration);
    
    console.log(`📊 Found ${qboCustomers.length} customers in QuickBooks`);

    let matchedCount = 0;
    let updatedCount = 0;

    // Match customers by name, email, or phone
    for (const localCustomer of localCustomers) {
      const qboMatch = findBestMatch(localCustomer, qboCustomers);
      
      if (qboMatch) {
        try {
          // Update the local customer with QBO ID
          await db
            .update(customers)
            .set({ 
              quickbooksId: qboMatch.Id,
              updatedAt: new Date()
            })
            .where(eq(customers.id, localCustomer.id));

          console.log(`✓ Matched "${localCustomer.name}" with QBO ID: ${qboMatch.Id}`);
          matchedCount++;
          updatedCount++;
        } catch (error) {
          console.error(`❌ Error updating customer ${localCustomer.name}:`, error);
        }
      }
    }

    console.log('\n📈 Sync Summary:');
    console.log(`   Total local customers: ${localCustomers.length}`);
    console.log(`   QBO customers found: ${qboCustomers.length}`);
    console.log(`   Customers matched: ${matchedCount}`);
    console.log(`   Database updates: ${updatedCount}`);
    console.log('✅ Customer sync completed!');

  } catch (error) {
    console.error('❌ Error during customer sync:', error);
    throw error;
  }
}

function findBestMatch(localCustomer: any, qboCustomers: QBOCustomer[]): QBOCustomer | null {
  // Helper function to normalize strings for comparison
  const normalize = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/[^\w\s]/g, '');
  };

  // Helper function to extract phone digits
  const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  for (const qboCustomer of qboCustomers) {
    // Skip inactive customers
    if (!qboCustomer.Active) continue;

    // Match by exact name
    if (normalize(localCustomer.name) === normalize(qboCustomer.Name) ||
        normalize(localCustomer.name) === normalize(qboCustomer.CompanyName)) {
      return qboCustomer;
    }

    // Match by email
    if (localCustomer.email && qboCustomer.PrimaryEmailAddr?.Address) {
      if (normalize(localCustomer.email) === normalize(qboCustomer.PrimaryEmailAddr.Address)) {
        return qboCustomer;
      }
    }

    // Match by phone (extract digits only)
    if (localCustomer.phone && qboCustomer.PrimaryPhone?.FreeFormNumber) {
      const localPhone = normalizePhone(localCustomer.phone);
      const qboPhone = normalizePhone(qboCustomer.PrimaryPhone.FreeFormNumber);
      
      if (localPhone && qboPhone && localPhone === qboPhone) {
        return qboCustomer;
      }
    }
  }

  return null;
}

// Run the sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncCustomersWithQBO()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}

// Helper function to fetch customers from QuickBooks
async function fetchCustomersFromQBO(userId: string, integration: any): Promise<QBOCustomer[]> {
  const qbService = new QuickBooksService();
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://quickbooks.api.intuit.com' 
    : 'https://sandbox-quickbooks.api.intuit.com';

  try {
    const accessToken = await qbService.getValidAccessToken(userId);
    
    const response = await fetch(
      `${baseUrl}/v3/company/${integration.realmId}/query?query=SELECT * FROM Customer MAXRESULTS 1000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`QBO API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.QueryResponse?.Customer || [];
  } catch (error) {
    console.error('Error fetching customers from QuickBooks:', error);
    throw error;
  }
}

export { syncCustomersWithQBO };