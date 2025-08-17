# Internal Dashboard - Comprehensive Business Management Platform

## Overview

The Internal Dashboard is a comprehensive business management platform for Marin Pest Control featuring role-based access control (admin/employee), advanced employee management, time tracking with enhanced punch clock functionality, customer management with trapping program tracking, QuickBooks 2-way synchronization with PostgreSQL database integration, Google Calendar multi-calendar integration for employee scheduling and task assignment, photo upload capability for job documentation, automated workflow triggers, and dual authentication system supporting both password login and Google OAuth. The system includes full employee contact management with pay rate tracking, weekly performance summaries, rodent trapping program management, and intelligent automation that processes business events in real-time.

The system is built as a modern web application with a React frontend, Express.js backend, and PostgreSQL database, specifically designed for internal team use with role-based navigation and comprehensive employee lifecycle management.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Dark mode/purple theme with Marin Pest Control logo integration.
Authentication: Dual system supporting both password login and Google OAuth for employees.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API endpoints with structured error handling

### Database Design
- **Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle migrations
- **Core Tables**: 
  - Users (authentication integration)
  - Sessions (required for Replit Auth)
  - Customers, Products, Invoices, InvoiceItems
  - Integrations (third-party service connections)
  - ActivityLogs (audit trail)
  - WorkflowTriggers, WorkflowExecutions, WorkflowActionTemplates (automation engine)

### Authentication & Authorization
- **Provider**: Replit OpenID Connect authentication
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with secure flags for production
- **User Management**: Automatic user creation and profile management

### Third-Party Integrations
- **QuickBooks**: OAuth 2.0 integration for accounting data synchronization
- **JotForm**: API integration for form submission processing
- **Google Calendar**: OAuth 2.0 for employee scheduling and task management with two-way sync, automatic clock in/out calendar events
- **Google Workspace**: OAuth 2.0 for Sheets, Docs, and Drive access
- **Sync Strategy**: Manual and automated data synchronization with conflict resolution

### Design & Branding
- **Theme**: Dark purple color scheme (HSL 263, 50%, 6% background)
- **Logo**: Marin Pest Control logo integrated throughout the application
- **Brand Colors**: Red (#FF6B6B), Blue (#74C0FC), Cream (#F5F3E0) from company logo
- **Layout**: Sidebar navigation with company branding and comprehensive menu structure

### Photo Upload System
- **Job Photos**: Before, after, and material/receipt photo uploads
- **Integration**: Photos linked to time entries, material entries, and clock entries
- **Metadata**: GPS coordinates, descriptions, and file metadata tracking
- **UI**: Tabbed interface in time tracking with drag-and-drop file upload
- **Storage**: Database schema ready for cloud storage integration (AWS S3, Google Cloud Storage)

### Business Data Integration
- **Customer Database**: Real customer data from Marin Pest Control CSV files (466 customers)
- **Service Catalog**: Complete product/service catalog with 89 items including pest control services, materials, and hardware
- **Technician Management**: Employee records for Spencer Reiser, Boden Haines, Jorge Sisneros, and Tristan Ford
- **Business Form**: Comprehensive job entry form matching actual business operations and JotForm structure
- **Service Types**: Full range of services including Insect Spraying, Wasp/Hornet Removal, Exclusion, Remediation, Trapping
- **Materials Tracking**: Hardware cloth, silicone, traps, disinfectants, and specialized pest control materials

### Automated Workflow System
- **Workflow Engine**: Event-driven automation that responds to form submissions, time tracking, and status changes
- **Default Triggers**: Pre-configured workflows for job processing, material approval, clock events, and QuickBooks sync
- **Action Types**: Notifications, integrations, data processing, scheduling, and analytics updates
- **Execution Tracking**: Complete audit trail of workflow runs with success/failure tracking and retry logic
- **Smart Conditions**: Time windows, data validation, and user-specific trigger conditions
- **Real-time Processing**: Immediate workflow execution on business events with comprehensive error handling

### Automated Data Synchronization
- **Scheduled QuickBooks Sync**: Automated hourly sync of customers, products, and invoices
- **Initial Data Pull**: One-click import of existing QuickBooks data for immediate content population
- **Background Processing**: Non-blocking sync operations with detailed logging and error handling
- **Sync Status Monitoring**: Real-time sync status display with manual trigger capabilities
- **User-Controlled Automation**: Enable/disable automated sync with one-click toggle controls

## Production Configuration

### Domain Setup
- **Production Domain**: www.wemakemarin.com
- **QuickBooks Callback URL**: https://www.wemakemarin.com/quickbooks/callback
- **Environment Detection**: Automatic production/development URL switching
- **SSL Configuration**: HTTPS enforced for production QuickBooks integration

### Enhanced OAuth-Intuit Integration (January 2025)
- **Official Intuit OAuth Library**: Upgraded to `intuit-oauth` package for robust OAuth 2.0 handling
- **Node-QuickBooks Integration**: Added `node-quickbooks` for enhanced API interactions and callback-based methods
- **Comprehensive Webhook System**: Full webhook handler with signature verification using HMAC-SHA256
- **Real-time Data Sync**: Webhook processing for Customer, Item, and Invoice entity changes (Create/Update/Delete)
- **Enhanced Token Management**: Automatic token refresh with proper credential storage and validation
- **Production Webhook URL**: https://www.wemakemarin.com/quickbooks/webhook
- **API Documentation**: Complete endpoint documentation with 25+ routes covering all integrations

### QuickBooks Integration Settings
- **Production Client ID**: ABcxWWL62bJFQd43vWFkko728BJLReocAxJKfeeemZtXfVAO1S
- **Development Client ID**: ABsZIbsFlA... (configured in Replit Secrets)
- **Callback Route**: `/quickbooks/callback` (production) and `/api/integrations/quickbooks/callback` (development)
- **OAuth Scope**: com.intuit.quickbooks.accounting
- **Integration Features**: Customer sync, product catalog, invoice management, real-time webhooks
- **Environment Detection**: Automatic production/development mode switching based on NODE_ENV
- **API URLs**: Production (https://quickbooks.api.intuit.com) vs Sandbox (https://sandbox-quickbooks.api.intuit.com)
- **Status**: Fully configured with credentials (QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_WEBHOOK_VERIFIER)
- **Sync Functionality**: Ready for OAuth connection and automated data synchronization

### GitHub Integration Preparation
- **Repository Structure**: Complete project organization for version control
- **Deployment Scripts**: Automated deployment with interactive configuration
- **Environment Management**: Comprehensive .env configuration with examples
- **Production Ready**: PM2 process management, Nginx configuration, SSL setup
- **Documentation**: Complete README.md with setup instructions and API documentation

### Google Calendar Integration
- **Clock Events**: Automatic calendar event creation for employee clock in/out activities
- **Company Calendar**: Centralized calendar for all employee time tracking events
- **Real-time Updates**: Calendar events updated when employees clock out with actual duration
- **Event Details**: Events include employee name, customer information, location, and notes
- **Color Coding**: Green for clock in, red for clock out, blue for scheduled events
- **OAuth Integration**: Secure Google OAuth 2.0 authentication for calendar access

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Database operations and migrations
- **connect-pg-simple**: PostgreSQL session store

### Authentication Services
- **Replit Auth**: Primary authentication provider
- **OpenID Connect**: Authentication protocol implementation

### Third-Party APIs
- **QuickBooks Online API**: Accounting data integration
- **JotForm API**: Form management and submission handling
- **Google APIs**: Workspace integration (Sheets, Docs, Drive)

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide Icons**: Icon library
- **React Icons**: Additional icon sets (Google, QuickBooks)

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and development experience
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Deployment
- **Replit**: Primary hosting platform
- **Environment Variables**: Configuration management for API keys and database URLs