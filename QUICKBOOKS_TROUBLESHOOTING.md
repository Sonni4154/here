# QuickBooks OAuth 400 Error Troubleshooting

## Current Status
- ✅ Production OAuth configuration set up
- ✅ Client ID: ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN  
- ✅ Company ID: 9130354674010826
- ❌ **400 Error during token exchange**

## Common Causes of 400 Error

### 1. Redirect URI Mismatch
**Most Common Issue**: The redirect URI used in token exchange doesn't match exactly what's configured in QuickBooks Developer dashboard.

**Check**: Go to https://developer.intuit.com/app/developer/myapps
- Find your app (ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN)
- Verify redirect URI is EXACTLY: `https://www.wemakemarin.com/quickbooks/callback`
- No trailing slash, no extra parameters

### 2. Authorization Code Issues
- **Expiration**: Codes expire in ~10 minutes
- **Single Use**: Each code can only be used once
- **URL Encoding**: Code might be malformed

### 3. Client Secret Issues
- Incorrect client secret in environment variables
- Client secret changed in QuickBooks Developer dashboard

## Diagnostic Steps

### Step 1: Check OAuth Configuration
```bash
curl http://localhost:5000/quickbooks/debug
```

### Step 2: Verify QuickBooks App Settings
1. Go to https://developer.intuit.com/app/developer/myapps
2. Find app: ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN
3. Check these settings:
   - **Redirect URI**: Must be exactly `https://www.wemakemarin.com/quickbooks/callback`
   - **Scopes**: Must include `com.intuit.quickbooks.accounting`
   - **Environment**: Must be Production (not Sandbox)

### Step 3: Test Fresh OAuth Flow
1. Use this URL: `http://localhost:5000/quickbooks/connect`
2. Complete authorization QUICKLY (within 2-3 minutes)
3. Check server logs for detailed error information

### Step 4: Manual OAuth Test
If automatic fails, try manual process:

1. **Get Authorization Code**:
   ```
   https://appcenter.intuit.com/connect/oauth2?client_id=ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN&redirect_uri=https%3A%2F%2Fwww.wemakemarin.com%2Fquickbooks%2Fcallback&response_type=code&scope=com.intuit.quickbooks.accounting&state=manual_test
   ```

2. **Extract code and realmId** from callback URL

3. **Test token exchange** with curl:
   ```bash
   curl -X POST 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer' \
   -H 'Accept: application/json' \
   -H 'Content-Type: application/x-www-form-urlencoded' \
   -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=https%3A%2F%2Fwww.wemakemarin.com%2Fquickbooks%2Fcallback" \
   -u "CLIENT_ID:CLIENT_SECRET"
   ```

## Quick Fixes to Try

### Fix 1: Update Redirect URI in QuickBooks
Ensure the QuickBooks app redirect URI is exactly:
`https://www.wemakemarin.com/quickbooks/callback`

### Fix 2: Speed Up OAuth Flow
The authorization code expires quickly. Complete the entire flow within 2-3 minutes.

### Fix 3: Check Domain Verification
Make sure `www.wemakemarin.com` is verified in your QuickBooks Developer account.

## Expected Behavior After Fix
1. Authorization redirects to QuickBooks ✅
2. User logs in and authorizes ✅  
3. Redirect to callback with code and realmId ✅
4. Token exchange succeeds ✅
5. Fresh tokens stored in database ✅
6. QuickBooks sync works immediately ✅