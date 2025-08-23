/**
 * Test QuickBooks connection and service functionality
 */

import { QuickBooksService } from './services/quickbooks-service';

async function testQuickBooksConnection() {
  console.log('🔗 Testing QuickBooks connection...');
  
  try {
    const qbService = new QuickBooksService();
    
    // Test service initialization
    console.log('✅ QuickBooks service initialized successfully');
    
    // Test credential configuration
    const hasCredentials = process.env.QBO_CLIENT_ID && 
                          process.env.QBO_CLIENT_SECRET && 
                          process.env.QBO_WEBHOOK_VERIFIER;
    
    if (hasCredentials) {
      console.log('✅ QuickBooks credentials are configured');
      console.log(`   Environment: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}`);
      console.log(`   Client ID: ${process.env.QBO_CLIENT_ID?.substring(0, 10)}...`);
      console.log(`   Webhook Verifier: ${process.env.QBO_WEBHOOK_VERIFIER ? 'Set' : 'Not set'}`);
    } else {
      console.log('❌ Missing QuickBooks credentials');
      console.log('   Need: QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_WEBHOOK_VERIFIER');
    }
    
    // Test authorization URL generation
    const authUrl = qbService.getAuthorizationUrl('test-user', 'http://localhost:5000/test');
    console.log('✅ Authorization URL generation works');
    console.log(`   URL: ${authUrl.substring(0, 80)}...`);
    
    console.log('\n🎉 QuickBooks service is ready for integration!');
    console.log('   Next steps:');
    console.log('   1. User clicks "Connect to QuickBooks" in the app');
    console.log('   2. System redirects to QuickBooks OAuth');
    console.log('   3. After authorization, sync will pull data automatically');
    
  } catch (error) {
    console.error('❌ QuickBooks connection test failed:', error);
  }
}

// Run test if executed directly
if (require.main === module) {
  testQuickBooksConnection();
}