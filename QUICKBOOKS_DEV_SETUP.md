# QuickBooks Development Authorization Setup

## Issue Resolution: Redirect URI Configuration

The QuickBooks development authorization is failing because the current development domain is not configured as an approved redirect URI in the QuickBooks app.

### Required Action

**Add the development redirect URI to your QuickBooks app:**

1. Go to [Intuit Developer Console](https://developer.intuit.com/app/developer/myapps)
2. Select your app with Client ID: `ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN`
3. Navigate to the **App Settings** → **Redirect URIs** section
4. Add this new redirect URI:
   ```
   https://054d2a3f-de93-43b0-a8dc-53ade5c1fa79-00-28ngf53nf2i1b.kirk.replit.dev/quickbooks/callback
   ```
5. Save the changes

### Current Redirect URI Status

✅ **Production URIs** (Already configured):
- `https://www.wemakemarin.com/quickbooks/callback`
- `https://wemakemarin.com/quickbooks/callback`

❌ **Development URI** (Needs to be added):
- `https://054d2a3f-de93-43b0-a8dc-53ade5c1fa79-00-28ngf53nf2i1b.kirk.replit.dev/quickbooks/callback`

### After Adding the Redirect URI

Once you've added the development redirect URI to the QuickBooks app configuration:

1. Visit: [Development Authorization Page](https://054d2a3f-de93-43b0-a8dc-53ade5c1fa79-00-28ngf53nf2i1b.kirk.replit.dev/quickbooks/dev-auth)
2. Click "Generate Authorization URL"
3. Click the generated QuickBooks authorization link
4. Complete the OAuth flow - it should now work without errors
5. You'll get the tokens needed for QuickBooks integration

### Technical Details

The development authorization system is working correctly and will:
- Auto-detect the current Replit development domain
- Generate proper authorization URLs
- Handle the OAuth callback and token exchange
- Provide you with the access tokens needed for QuickBooks API calls

The only missing piece is the redirect URI configuration in the QuickBooks app itself.