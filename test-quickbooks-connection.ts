
import { QuickBooksService } from './server/services/quickbooks-service';
import { storage } from './server/storage';

async function testQuickBooksConnection() {
  console.log('🔧 Testing QuickBooks Connection...');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log(`QBO_CLIENT_ID: ${process.env.QBO_CLIENT_ID ? 'Set ✓' : 'Missing ❌'}`);
  console.log(`QBO_CLIENT_SECRET: ${process.env.QBO_CLIENT_SECRET ? 'Set ✓' : 'Missing ❌'}`);
  console.log(`QBO_REDIRECT_URI: ${process.env.QBO_REDIRECT_URI || 'Not set'}`);
  
  if (!process.env.QBO_CLIENT_ID || !process.env.QBO_CLIENT_SECRET) {
    console.log('❌ Missing required QuickBooks credentials');
    console.log('Please set QBO_CLIENT_ID and QBO_CLIENT_SECRET in your environment');
    return;
  }
  
  // Check database integration
  try {
    const integration = await storage.getIntegration('dev_user_123', 'quickbooks');
    console.log(`Database Integration: ${integration ? 'Found ✓' : 'Not found ❌'}`);
    
    if (integration) {
      console.log(`Integration Active: ${integration.isActive ? 'Yes ✓' : 'No ❌'}`);
      console.log(`Has Access Token: ${integration.accessToken ? 'Yes ✓' : 'No ❌'}`);
      console.log(`Realm ID: ${integration.realmId || 'Not set'}`);
      console.log(`Last Sync: ${integration.lastSyncAt || 'Never'}`);
    }
  } catch (error) {
    console.log('❌ Database connection error:', error);
  }
  
  // Test QuickBooks service initialization
  try {
    const qbService = new QuickBooksService();
    console.log('QuickBooks Service: Initialized ✓');
    
    // Generate auth URL
    const authUrl = qbService.getAuthorizationUrl('dev_user_123', process.env.QBO_REDIRECT_URI || '');
    console.log('\n🔗 To connect QuickBooks:');
    console.log('1. Visit this URL in your browser:');
    console.log(authUrl);
    console.log('2. Complete the authorization');
    console.log('3. You should be redirected back to your app');
    
  } catch (error) {
    console.log('❌ QuickBooks Service error:', error);
  }
}

// Run the test
testQuickBooksConnection()
  .then(() => console.log('\n✅ Connection test completed'))
  .catch(error => console.error('❌ Test failed:', error))
  .finally(() => process.exit(0));
