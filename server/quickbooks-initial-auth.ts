import express from 'express';
const OAuthClient = require('intuit-oauth');

const app = express();

// QuickBooks OAuth configuration
const oauthClient = new OAuthClient({
  clientId: process.env.QBO_CLIENT_ID!,
  clientSecret: process.env.QBO_CLIENT_SECRET!,
  environment: process.env.QBO_ENV as 'sandbox' | 'production' || 'production',
  redirectUri: process.env.QBO_REDIRECT_URI!,
});

console.log('🔧 QuickBooks Initial Authorization Setup');
console.log('Environment:', process.env.QBO_ENV);
console.log('Client ID:', process.env.QBO_CLIENT_ID?.substring(0, 10) + '...');
console.log('Redirect URI:', process.env.QBO_REDIRECT_URI);

// Step 1: Generate authorization URL
app.get('/auth/quickbooks', (req, res) => {
  try {
    const authUrl = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'initial_auth_' + Date.now(),
    });
    
    console.log('\n🚀 Authorization URL Generated:');
    console.log(authUrl);
    console.log('\n📝 Instructions:');
    console.log('1. Copy the URL above and paste it in your browser');
    console.log('2. Complete the QuickBooks authorization');
    console.log('3. You will be redirected back with the authorization code');
    
    res.json({
      authUrl,
      instructions: [
        'Copy the URL above and paste it in your browser',
        'Complete the QuickBooks authorization',
        'You will be redirected back with the authorization code'
      ]
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Step 2: Handle the callback and exchange code for tokens
app.get('/quickbooks/callback', async (req, res) => {
  try {
    const { code, realmId, state } = req.query;
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    console.log('\n✅ Authorization callback received');
    console.log('Code:', String(code).substring(0, 20) + '...');
    console.log('Realm ID (Company ID):', realmId);
    console.log('State:', state);
    
    // Exchange code for tokens
    const authResponse = await oauthClient.createToken(String(code));
    
    console.log('\n🎉 SUCCESS! Tokens obtained:');
    console.log('Access Token:', authResponse.access_token?.substring(0, 20) + '...');
    console.log('Refresh Token:', authResponse.refresh_token?.substring(0, 20) + '...');
    console.log('Token Type:', authResponse.token_type);
    console.log('Expires In:', authResponse.expires_in);
    console.log('Refresh Token Expires In:', authResponse.x_refresh_token_expires_in);
    
    // Store the tokens (you'll need to add these to your secrets)
    console.log('\n📋 Add these to your Replit secrets:');
    console.log('QBO_ACCESS_TOKEN=' + authResponse.access_token);
    console.log('QBO_REFRESH_TOKEN=' + authResponse.refresh_token);
    console.log('QBO_COMPANY_ID=' + realmId);
    
    res.json({
      success: true,
      message: 'Authorization successful! Check console for tokens to add to secrets.',
      tokens: {
        access_token: authResponse.access_token?.substring(0, 20) + '...',
        refresh_token: authResponse.refresh_token?.substring(0, 20) + '...',
        company_id: realmId,
        expires_in: authResponse.expires_in,
        refresh_expires_in: authResponse.x_refresh_token_expires_in
      }
    });
    
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ 
      error: 'Authorization failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌐 Initial Auth Server running on port ${PORT}`);
  console.log(`\n🔗 To start authorization, visit:`);
  console.log(`http://localhost:${PORT}/auth/quickbooks`);
  console.log(`\nOr if running on Replit:`);
  console.log(`https://054d2a3f-de93-43b0-a8dc-53ade5c1fa79-00-28ngf53nf2i1b.kirk.replit.dev:${PORT}/auth/quickbooks`);
});