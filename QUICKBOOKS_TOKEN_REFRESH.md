# QuickBooks Token Refresh - Production Ready

## Current Status
- ✅ Production OAuth configuration complete  
- ✅ Production company ID: 9130354674010826
- ⚠️ Need fresh access token (have refresh token but it's not working)

## Simple Token Refresh Process

### Option 1: Direct OAuth Link (Easiest)
Copy and paste this URL into your browser:

```
https://appcenter.intuit.com/connect/oauth2?client_id=ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN&redirect_uri=https%3A%2F%2Fwww.wemakemarin.com%2Fquickbooks%2Fcallback&response_type=code&scope=com.intuit.quickbooks.accounting&state=initial_auth_fresh_tokens
```

1. Click this link
2. Log into QuickBooks 
3. Authorize the connection
4. Fresh tokens will be automatically stored
5. Sync will work immediately

### Option 2: Local Development Server
If running locally on localhost:5000:
1. Visit: `http://localhost:5000/get-fresh-tokens`
2. Click "Get Fresh QuickBooks Tokens"
3. Complete OAuth flow

### What Happens Next
- QuickBooks redirects to: `https://www.wemakemarin.com/quickbooks/callback`
- System exchanges code for fresh production tokens
- Tokens automatically stored in database
- Sync system becomes fully operational
- Hourly automatic sync activates

### Verify Success
After completing OAuth:
1. Check sync status: `curl http://localhost:5000/api/integrations`
2. Trigger manual sync: `curl -X POST http://localhost:5000/api/quickbooks/trigger-sync`
3. Should see successful sync in logs

### Production Configuration
- Environment: Production
- Client ID: ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN
- Company ID: 9130354674010826
- Callback URL: https://www.wemakemarin.com/quickbooks/callback
- API Base: https://quickbooks.api.intuit.com

## Troubleshooting
If OAuth fails:
1. Verify company ID matches in QuickBooks
2. Check that redirect URI is exactly: `https://www.wemakemarin.com/quickbooks/callback`
3. Ensure using production QuickBooks account (not sandbox)