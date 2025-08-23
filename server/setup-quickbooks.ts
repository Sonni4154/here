import { QuickBooksService } from './services/quickbooks-service';

async function setupQuickBooks() {
  console.log('🚀 Setting up QuickBooks integration...');
  
  const qbService = new QuickBooksService();
  
  console.log('📋 Configuration:');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Client ID: ${process.env.QBO_CLIENT_ID ? 'Set ✓' : 'Missing ❌'}`);
  console.log(`   Client Secret: ${process.env.QBO_CLIENT_SECRET ? 'Set ✓' : 'Missing ❌'}`);
  console.log(`   Webhook Verifier: ${process.env.QBO_WEBHOOK_VERIFIER ? 'Set ✓' : 'Missing ❌'}`);
  
  const authUrl = qbService.getAuthorizationUrl('dev_user_123');
  
  console.log('\n🔗 To connect QuickBooks:');
  console.log(`   1. Visit: ${authUrl}`);
  console.log('   2. Authorize the application');
  console.log('   3. You will be redirected to the callback URL');
  console.log('   4. Run the customer sync again');
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupQuickBooks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { setupQuickBooks };