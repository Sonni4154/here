# BusinessSync Pro - CRM Integration Platform

## Overview

BusinessSync Pro is a full-stack web application that serves as a centralized business management platform integrating QuickBooks, JotForm, and Google Workspace services. The application provides a unified dashboard for managing customers, products, invoices, and business analytics while synchronizing data across multiple third-party platforms.

The system is built as a modern web application with a React frontend, Express.js backend, and PostgreSQL database, designed to streamline business operations through seamless API integrations and real-time data synchronization.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Authentication & Authorization
- **Provider**: Replit OpenID Connect authentication
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with secure flags for production
- **User Management**: Automatic user creation and profile management

### Third-Party Integrations
- **QuickBooks**: OAuth 2.0 integration for accounting data synchronization
- **JotForm**: API integration for form submission processing
- **Google Workspace**: OAuth 2.0 for Sheets, Docs, and Drive access
- **Sync Strategy**: Manual and automated data synchronization with conflict resolution

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