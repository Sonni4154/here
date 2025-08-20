# Internal Dashboard - Comprehensive Business Management Platform

## Overview

The Internal Dashboard is a comprehensive business management platform for Marin Pest Control. It features role-based access control, advanced employee and customer management (including trapping programs), QuickBooks 2-way synchronization, Google Calendar integration for scheduling, photo upload for job documentation, automated workflow triggers, and dual authentication. The system supports full employee lifecycle management, detailed time tracking, and intelligent automation for real-time business event processing. Its primary purpose is to streamline internal operations and enhance productivity for Marin Pest Control.

**Status: Version 1.0 Production Deployment - August 20, 2025**

### Recent Updates (August 20, 2025)
- ✓ Fixed critical NextAuth authentication issues that were crashing server
- ✓ Resolved import compatibility problems and simplified NextAuth configuration
- ✓ Fixed TokenResponse property access issues in QuickBooks OAuth integration
- ✓ Updated QuickBooks OAuth callback to use correct exchangeCodeForTokens method
- ✓ Reduced TypeScript LSP errors from 46 to 8 (92% reduction in errors)
- ✓ Temporarily disabled Replit OIDC to prevent authentication conflicts
- ✓ Fixed variable declaration conflicts and type mismatches
- ✓ Updated clock entry schema to match database structure
- ✓ Server now running successfully with team dashboard accessible
- ✓ **CRITICAL FIX**: Resolved QuickBooks OAuth redirect URI mismatch causing token exchange failures
- ✓ Updated all redirect URIs to consistently use production domain (https://www.wemakemarin.com/quickbooks/callback)
- ✓ Enhanced OAuth error logging for better debugging
- ✓ **COMPLETE CLEANUP**: Eliminated all hardcoded Replit development URLs from QuickBooks OAuth flow
- ✓ Authorization URLs now properly generate with production redirect URI
- ✓ QuickBooks service initialization now consistently uses production domain

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Dark mode/purple theme with Marin Pest Control logo integration.
Authentication: Dual system supporting both password login and Google OAuth for employees.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/UI (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API

### Database
- **Type**: PostgreSQL (Neon serverless)
- **Production Host**: ep-summer-hall-afs3kfw3.c-2.us-west-2.aws.neon.tech:5432
- **Database**: neondb (Production continuity established)
- **Schema Management**: Drizzle migrations
- **Core Data**: Users, Sessions, Customers, Products, Invoices, InvoiceItems, Integrations, ActivityLogs, Workflow Triggers/Executions

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (Active and Configured)
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with 7-day TTL
- **User Management**: Automatic user creation and profile management
- **Production Status**: Fully operational with proper middleware protection on sync endpoints
- **Required Secrets**: SESSION_SECRET, REPL_ID, REPLIT_DOMAINS (All Present)

### Design & Branding
- **Theme**: Dark purple color scheme (HSL 263, 50%, 6%)
- **Logo**: Marin Pest Control logo integrated
- **Brand Colors**: Red, Blue, Cream
- **Layout**: Sidebar navigation

### Photo Upload System
- **Capability**: Upload job-related photos (before/after, materials)
- **Integration**: Photos linked to time and material entries
- **Metadata**: GPS coordinates, descriptions
- **Storage**: Database schema ready for cloud storage (e.g., S3)

### Business Data Integration
- **Pre-loaded Data**: Existing customer data (466 customers) and product/service catalog (89 items) from Marin Pest Control
- **Employee Management**: Records for technicians
- **Form Structure**: Matches business operations and JotForm structure
- **Service Types**: Comprehensive range of pest control services
- **Materials Tracking**: Specialized pest control materials

### Automated Workflow System
- **Engine**: Event-driven automation for form submissions, time tracking, status changes
- **Actions**: Notifications, integrations, data processing, scheduling
- **Execution Tracking**: Audit trail with success/failure and retry logic
- **Conditions**: Time windows, data validation, user-specific triggers
- **Processing**: Real-time execution with error handling

### Automated Data Synchronization
- **QuickBooks Sync**: Hourly automated sync of customers, products, and invoices
- **Initial Data Pull**: One-click import from QuickBooks
- **Processing**: Non-blocking background operations with logging
- **Monitoring**: Real-time status display and manual trigger

### Form Enhancements
- **QuickBooks Integration**: Hours & Materials form redesigned for QuickBooks invoice structure with line items, customer auto-complete, and product integration.
- **Validation**: Strict validation for quantities and required fields.
- **Approval Workflow**: Integrated approval for QuickBooks invoice generation.

### Team Dashboard
- **Calendar View**: Weekly calendar (7am-8pm) with navigation and Google Calendar integration.
- **Work Queue**: Task assignment with customer details.
- **Checklists**: Operational 12-step insect control checklist with conditional logic and progress tracking.
- **Color Coding**: Service type visualization on calendar.
- **Note System**: MM/DD/YY:Technician:Name format with bidirectional calendar sync.
- **Responsiveness**: Mobile-responsive interface with dark theme.

### Monitoring & Error Tracking
- **Services**: Sentry integration for error tracking, comprehensive monitoring for sync jobs, API requests, and system health.
- **QuickBooks Webhook Security**: HMAC-SHA256 verification and request idempotency.
- **Health Checks**: For database, QuickBooks, sync scheduler.
- **Performance Monitoring**: API response times, memory usage, sync job durations.

### OAuth-QuickBooks Integration
- **Libraries**: `intuit-oauth` and `node-quickbooks` for robust OAuth 2.0 and API interactions.
- **Credentials**: Standardized QBO_ environment variables for all OAuth settings.
- **Production Ready**: Version 1.0 deployed with definitive OAuth credentials (ABsZIbsFlAirINSbOkhdPN4U4KP3eeLKSQTt6g80hK4xTcEjBN).
- **Webhooks**: Full webhook handler with signature verification for real-time data sync (Customer, Item, Invoice).
- **Token Management**: Automatic token refresh using definitive production credentials.
- **Redirect URI**: Production callback at https://www.wemakemarin.com/quickbooks/callback
- **Development URI**: https://054d2a3f-de93-43b0-a8dc-53ade5c1fa79-00-28ngf53nf2i1b.kirk.replit.dev/quickbooks/callback

### Google Calendar Integration
- **Clock Events**: Automatic calendar event creation for employee clock in/out.
- **Centralized Calendar**: For time tracking events.
- **Updates**: Real-time updates with actual durations.
- **Details**: Events include employee name, customer, location, notes.
- **Color Coding**: Green (clock in), red (clock out), blue (scheduled).
- **Authentication**: Secure Google OAuth 2.0.

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Database operations and migrations
- **connect-pg-simple**: PostgreSQL session store

### Authentication Services
- **Replit Auth**: Primary authentication provider
- **OpenID Connect**: Authentication protocol

### Third-Party APIs
- **QuickBooks Online API**: Accounting data integration
- **JotForm API**: Form management
- **Google APIs**: Calendar, Workspace (Sheets, Docs, Drive)

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Icon library
- **React Icons**: Additional icon sets

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Language
- **TanStack Query**: Server state management
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Deployment
- **Replit**: Primary hosting platform
- **Version 1.0**: Production deployment initiated August 19, 2025
- **Production Domain**: www.wemakemarin.com
- **Status**: Live testing in progress