# TimeSync Pro - API Endpoints & Webhooks Documentation

## Overview
Complete documentation of all API endpoints and webhook handlers for the TimeSync Pro employee dashboard system.

## Authentication
All endpoints marked with 🔐 require authentication via Replit Auth session.

## QuickBooks Integration Endpoints

### OAuth & Connection
- `GET /api/integrations/quickbooks/connect` 🔐 - Initiate QuickBooks OAuth flow
- `GET /quickbooks/callback` 🔐 - Production OAuth callback (www.wemakemarin.com)
- `GET /api/integrations/quickbooks/callback` 🔐 - Development OAuth callback
- `GET /api/integrations/quickbooks/status` 🔐 - Get connection status
- `POST /api/integrations/quickbooks/disconnect` 🔐 - Revoke integration

### Data Synchronization
- `POST /api/integrations/quickbooks/initial-sync` 🔐 - One-time data pull
- `POST /api/integrations/quickbooks/sync` 🔐 - Manual sync trigger
- `POST /api/sync/start-automated` 🔐 - Enable automated hourly sync
- `POST /api/sync/stop-automated` 🔐 - Disable automated sync
- `POST /api/sync/trigger-immediate` 🔐 - Trigger immediate sync for all users
- `GET /api/sync/status` 🔐 - Get automated sync status

### Webhooks
- `POST /api/webhooks/quickbooks` - Process QuickBooks data change notifications
  - Signature verification using HMAC-SHA256
  - Handles Customer, Item, and Invoice entity changes
  - Operations: Create, Update, Delete
- `POST /api/webhooks/quickbooks/test` 🔐 - Test webhook processing (development)

## Google Calendar Integration Endpoints

### OAuth & Connection
- `GET /api/integrations/google-calendar/connect` 🔐 - Initiate Google OAuth flow
- `GET /api/integrations/google/callback` 🔐 - Google OAuth callback
- `POST /api/integrations/google-calendar/sync` 🔐 - Manual calendar sync

## User Authentication Endpoints

### Replit Auth
- `GET /api/login` - Start login flow
- `GET /api/callback` - Auth callback handler
- `GET /api/logout` - Logout and session cleanup
- `GET /api/auth/user` 🔐 - Get current user information

## Data Management Endpoints

### Customers
- `GET /api/customers` 🔐 - List all customers
- `POST /api/customers` 🔐 - Create new customer
- `PUT /api/customers/:id` 🔐 - Update customer
- `DELETE /api/customers/:id` 🔐 - Delete customer

### Products/Services
- `GET /api/products` 🔐 - List all products/services
- `POST /api/products` 🔐 - Create new product/service
- `PUT /api/products/:id` 🔐 - Update product/service
- `DELETE /api/products/:id` 🔐 - Delete product/service

### Invoices
- `GET /api/invoices` 🔐 - List all invoices
- `POST /api/invoices` 🔐 - Create new invoice
- `PUT /api/invoices/:id` 🔐 - Update invoice
- `DELETE /api/invoices/:id` 🔐 - Delete invoice

### Time Tracking
- `GET /api/time-entries` 🔐 - List time entries
- `POST /api/time-entries` 🔐 - Create time entry
- `PUT /api/time-entries/:id` 🔐 - Update time entry
- `DELETE /api/time-entries/:id` 🔐 - Delete time entry

### Clock In/Out
- `POST /api/clock/in` 🔐 - Clock in with GPS location
- `POST /api/clock/out` 🔐 - Clock out with duration calculation
- `GET /api/clock/status` 🔐 - Get current clock status
- `GET /api/clock/entries` 🔐 - List clock entries

## Integration Management

### General Integration Endpoints
- `GET /api/integrations` 🔐 - List all user integrations
- `PUT /api/integrations/:provider` 🔐 - Update integration settings

### Activity Logs
- `GET /api/activity-logs` 🔐 - Get user activity history
- `POST /api/activity-logs` 🔐 - Create activity log entry

## Dashboard & Analytics

### Dashboard Stats
- `GET /api/dashboard/stats` 🔐 - Get dashboard metrics
  - Total revenue
  - Active customers
  - Pending invoices
  - Last sync timestamp

### Reports
- `GET /api/reports/time` 🔐 - Time tracking reports
- `GET /api/reports/revenue` 🔐 - Revenue reports
- `GET /api/reports/customers` 🔐 - Customer activity reports

## Webhook Security

### Signature Verification
All webhooks use HMAC-SHA256 signature verification:
```javascript
const signature = crypto
  .createHmac('sha256', webhookVerifierToken)
  .update(payload)
  .digest('base64');
```

### QuickBooks Webhook Events
Supported entity types:
- **Customer**: Create, Update, Delete
- **Item**: Create, Update, Delete
- **Invoice**: Create, Update, Delete

### Webhook Payload Format
```json
{
  "eventNotifications": [{
    "realmId": "company-realm-id",
    "dataChangeEvent": {
      "entities": [{
        "name": "Customer",
        "id": "123456",
        "operation": "Create",
        "lastUpdated": "2025-01-01T12:00:00Z"
      }]
    }
  }]
}
```

## Environment Configuration

### Production URLs
- **Base URL**: https://www.wemakemarin.com
- **QuickBooks Callback**: https://www.wemakemarin.com/quickbooks/callback
- **Webhook URL**: https://www.wemakemarin.com/quickbooks/webhook

### Development URLs
- **Base URL**: http://localhost:5000
- **QuickBooks Callback**: http://localhost:5000/api/integrations/quickbooks/callback
- **Webhook URL**: http://localhost:5000/api/webhooks/quickbooks

## Error Handling

### Standard Error Responses
```json
{
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting
- QuickBooks API: 500 requests per minute per app
- Google Calendar API: 1,000,000 requests per day
- Internal endpoints: No rate limiting (authenticated users only)

## Monitoring & Logging

### Activity Log Types
- `integration_connected` - OAuth integration established
- `integration_revoked` - Integration disconnected
- `manual_sync` - User-triggered sync
- `automated_sync` - Scheduled sync
- `webhook_processed` - Webhook event processed
- `clock_in` / `clock_out` - Time tracking events
- `data_sync` - Data synchronization events

### Sync Status Tracking
- Last sync timestamp per integration
- Sync success/failure logging
- Entity count tracking
- Performance metrics

## Development Tools

### Test Endpoints
- `POST /api/webhooks/quickbooks/test` 🔐 - Test webhook processing
- `GET /api/health` - Health check endpoint
- `GET /api/version` - Application version info

### Debug Logging
- QuickBooks API calls with request/response logging
- OAuth token refresh logging
- Webhook signature verification logging
- Sync operation performance metrics