/**
 * QuickBooks OAuth Test Script
 * This script helps test and debug QuickBooks OAuth configuration
 */

console.log('🧪 QuickBooks OAuth Configuration Test\n');

// Check environment variables
const requiredEnvVars = [
  'QBO_CLIENT_ID',
  'QBO_CLIENT_SECRET', 
  'QBO_REDIRECT_URI',
  'REPLIT_DOMAINS'
];

console.log('📋 Environment Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '[HIDDEN]' : value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

const replitDomain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : null;
console.log(`\n🌐 Detected Replit Domain: ${replitDomain || 'not available'}`);

// Show OAuth URLs that would be used
const productionUri = 'https://www.wemakemarin.com/quickbooks/callback';
const replitUri = replitDomain ? `https://${replitDomain}/quickbooks/callback` : 'N/A';
const configuredUri = process.env.QBO_REDIRECT_URI || 'not configured';

console.log('\n🔗 OAuth Redirect URIs:');
console.log(`   Production: ${productionUri}`);
console.log(`   Replit Dev: ${replitUri}`);
console.log(`   Configured: ${configuredUri}`);

// Test OAuth configuration
import OAuthClient from 'intuit-oauth';
const clientId = process.env.QBO_CLIENT_ID;
const clientSecret = process.env.QBO_CLIENT_SECRET;

if (clientId && clientSecret) {
  console.log('\n⚙️ Testing OAuth Client Creation...');
  
  try {
    const oauthClient = new OAuthClient({
      clientId: clientId,
      clientSecret: clientSecret,
      environment: 'production',
      redirectUri: configuredUri
    });
    
    console.log('✅ OAuth Client created successfully');
    console.log(`   Client ID (first 10 chars): ${clientId.substring(0, 10)}...`);
    console.log(`   Environment: production`);
    console.log(`   Redirect URI: ${oauthClient.redirectUri}`);
    
    // Generate test authorization URL
    const scope = [OAuthClient.scopes.Accounting];
    const state = Buffer.from(JSON.stringify({ userId: 'test', timestamp: Date.now() })).toString('base64');
    
    const authUrl = oauthClient.authorizeUri({ scope, state });
    console.log(`\n🔗 Test Authorization URL:`);
    console.log(`${authUrl.substring(0, 100)}...`);
    
  } catch (error) {
    console.log('❌ OAuth Client creation failed:', error.message);
  }
} else {
  console.log('\n❌ Cannot test OAuth Client - missing credentials');
}

console.log('\n📝 Notes:');
console.log('1. The QuickBooks app must be configured with the exact redirect URI');
console.log('2. For development testing, you may need to add the Replit domain to the QuickBooks app');
console.log('3. The 400 error typically indicates redirect URI mismatch or invalid client credentials');
console.log('4. For production, use: https://www.wemakemarin.com/quickbooks/callback');
console.log(`5. For Replit dev, you could use: ${replitUri}`);