# Production Deployment Setup - Version 1.0

## PostgreSQL Database Configuration

**Final Production Database Credentials:**
- **Database Host**: `ep-summer-hall-afs3kfw3.c-2.us-west-2.aws.neon.tech`
- **Database Port**: `5432`
- **Database Name**: `neondb`
- **Database Username**: `neondb_owner`
- **Database Password**: `npg_DxS2vaRlW3Js`
- **Database URL**: `postgresql://neondb_owner:npg_DxS2vaRlW3Js@ep-summer-hall-afs3kfw3.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require`

**Environment Variables for Production:**
```bash
DATABASE_URL="postgresql://neondb_owner:npg_DxS2vaRlW3Js@ep-summer-hall-afs3kfw3.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
PGHOST="ep-summer-hall-afs3kfw3.c-2.us-west-2.aws.neon.tech"
PGPORT="5432"
PGDATABASE="neondb"
PGUSER="neondb_owner"
PGPASSWORD="npg_DxS2vaRlW3Js"
```

## QuickBooks OAuth Configuration

**Production OAuth Settings:**
```bash
QBO_CLIENT_ID="ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN"
QBO_CLIENT_SECRET="uJ9v5ppihVcvqeRNlIdgOz1msSLBM0j5TDzrCC0a"
QBO_COMPANY_ID="9130354674010826"
QBO_REDIRECT_URI="https://www.wemakemarin.com/quickbooks/callback"
QBO_WEBHOOK_URI="https://www.wemakemarin.com/quickbooks/webhook"
QBO_ENV="production"
QBO_BASE_URL="https://quickbooks.api.intuit.com/v3/company/"
```

**QuickBooks OpenID Discovery Endpoints:**
- Authorization: `https://appcenter.intuit.com/connect/oauth2`
- Token: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- Revocation: `https://developer.api.intuit.com/v2/oauth2/tokens/revoke`
- UserInfo: `https://accounts.platform.intuit.com/v1/openid_connect/userinfo`

## Replit Auth Configuration

**Production Authentication:**
```bash
SESSION_SECRET="[AUTO-GENERATED]"
REPLIT_DOMAINS="www.wemakemarin.com"
ISSUER_URL="https://replit.com/oidc"
```

## Required Redirect URIs to Add to QuickBooks App

Add these URIs to your QuickBooks app in Intuit Developer Console:
1. `https://www.wemakemarin.com/quickbooks/callback` (Production)
2. `https://054d2a3f-de93-43b0-a8dc-53ade5c1fa79-00-28ngf53nf2i1b.kirk.replit.dev/quickbooks/callback` (Development)

## Production Deployment Checklist

- [ ] Update Replit secrets with PostgreSQL credentials
- [ ] Update Replit secrets with QuickBooks OAuth credentials  
- [ ] Add redirect URIs to QuickBooks app
- [ ] Remove all development shortcuts and test endpoints
- [ ] Enable production error tracking (Sentry)
- [ ] Configure production domain for Replit Auth
- [ ] Test database connectivity
- [ ] Test QuickBooks OAuth flow
- [ ] Deploy to production domain