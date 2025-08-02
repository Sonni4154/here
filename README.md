# TimeSync Pro - Employee Time & Material Tracking System

A comprehensive internal employee dashboard for Marin Pest Control featuring time tracking with clock in/out functionality, customer management, QuickBooks 2-way synchronization, Google Calendar integration, and automated workflow triggers.

## 🌟 Features

### Core Functionality
- **Time Tracking**: Clock in/out functionality with detailed time entry management
- **Customer Management**: Complete CRM with search, notes, and service history
- **Multi-dimensional Data Views**: Access data by customer, invoice, or product/service
- **QuickBooks Integration**: 2-way synchronization for customers, products, and invoices
- **Google Calendar Integration**: Employee scheduling and task assignment
- **Photo Upload**: Before/after job photos with metadata tracking
- **Automated Workflows**: Business process automation based on form submissions
- **Dual Authentication**: Password login and Google OAuth for employees

### Business Intelligence
- **Real-time Analytics**: Track employee performance and customer metrics
- **Invoice Management**: Create, track, and manage customer invoices
- **Product Catalog**: Complete service and material catalog with pricing
- **Material Tracking**: Hardware, chemicals, and specialized pest control materials
- **Customer Autocomplete**: Smart customer search across all forms

### Integration Capabilities
- **QuickBooks Online**: Customer sync, product catalog, invoice management
- **JotForm**: API integration for form submission processing
- **Google Workspace**: Sheets, Docs, and Drive access
- **Real-time Sync**: Manual and automated data synchronization with conflict resolution

## 🏗 Architecture

### Frontend
- **React 18** with TypeScript
- **Shadcn/UI** components built on Radix UI primitives
- **Tailwind CSS** with dark purple theme
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express.js framework
- **TypeScript** with ES modules
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** via Neon serverless
- **Replit Auth** with OpenID Connect integration

### Database Schema
- Users, Sessions (authentication integration)
- Customers, Products, Invoices, InvoiceItems
- Integrations (third-party service connections)
- ActivityLogs (audit trail)
- WorkflowTriggers, WorkflowExecutions (automation engine)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- QuickBooks Developer Account (optional)
- Google Workspace API access (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timesync-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication (Replit)
SESSION_SECRET="your-session-secret"
REPLIT_DOMAINS="localhost:5000,www.wemakemarin.com"
ISSUER_URL="https://replit.com/oidc"

# QuickBooks Integration (Optional)
QUICKBOOKS_CLIENT_ID="your-production-client-id"
QUICKBOOKS_CLIENT_SECRET="your-client-secret"
QUICKBOOKS_SANDBOX_BASE_URL="https://sandbox-quickbooks.api.intuit.com"

# Google APIs (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Production Settings
NODE_ENV="production"
```

### Production Configuration

For production deployment on **www.wemakemarin.com**:

- **QuickBooks Callback URL**: `https://www.wemakemarin.com/quickbooks/callback`
- **Production Client ID**: `ABcxWWL62bJFQd43vWFkko728BJLReocAxJKfeeemZtXfVAO1S`
- **SSL Required**: HTTPS enforced for OAuth integrations

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   └── main.tsx        # Application entry point
│   └── index.html
├── server/                 # Express backend
│   ├── auth/               # Authentication modules
│   ├── services/           # Business logic services
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── db.ts               # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema definitions
├── attached_assets/        # Sample data files
│   ├── customers.csv       # 466 real customer records
│   ├── products.csv        # 89 products/services catalog
│   └── ...                 # Additional sample data
├── package.json
├── drizzle.config.ts       # Database configuration
├── tailwind.config.ts      # Styling configuration
└── vite.config.ts          # Build configuration
```

## 🗄 Database Management

### Migrations
```bash
# Push schema changes to database
npm run db:push

# Generate migration files
npm run db:generate

# View database studio
npm run db:studio
```

### Sample Data Import
The system includes real business data from Marin Pest Control:
- 466 customer records
- 89 products and services
- Employee data for Spencer Reiser, Boden Haines, Jorge Sisneros, Tristan Ford

Import via the Integrations page or API endpoint.

## 🔌 API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user
- `POST /api/auth/login` - Password login
- `POST /api/auth/register` - Register new employee
- `POST /api/auth/logout` - Logout

### Data Management
- `GET|POST|DELETE /api/customers` - Customer CRUD
- `GET|POST|DELETE /api/products` - Product CRUD  
- `GET|POST|DELETE /api/invoices` - Invoice CRUD
- `GET /api/time-entries` - Time tracking data

### Integrations
- `GET /api/integrations/quickbooks/connect` - Start QuickBooks OAuth
- `GET /quickbooks/callback` - Production OAuth callback
- `POST /api/integrations/quickbooks/sync` - Manual sync
- `GET /api/sync/status` - Integration status

### Utilities
- `POST /api/import-sample-data` - Load sample business data

## 🎨 Theming & Branding

The application uses Marin Pest Control's brand colors:
- **Primary**: Dark purple theme (HSL 263, 50%, 6%)
- **Accent Colors**: Red (#FF6B6B), Blue (#74C0FC), Cream (#F5F3E0)
- **Logo Integration**: Company branding throughout the application

Customize theming in `client/src/index.css` and `tailwind.config.ts`.

## 🔄 Workflow Automation

### Default Workflows
- Job processing automation
- Material approval workflows  
- Clock event triggers
- QuickBooks sync automation
- Real-time notification system

### Custom Triggers
Configure automated responses to:
- Form submissions
- Time tracking events
- Status changes
- Integration updates

## 📱 Multi-dimensional Data Access

### Invoice Views
- **All Invoices**: Complete list with search and filters
- **By Customer**: Invoices grouped by customer with totals
- **By Product/Service**: Organized by products/services sold

### Customer Views
- Complete contact information
- Service history and notes
- Related invoices and time entries
- Account summaries and metrics

## 🚢 Deployment

### Quick Deployment Script
```bash
./deploy.sh
```

### Manual Deployment Steps

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   # Clone and build
   git clone <repository-url> /var/www/timesync-pro
   cd /var/www/timesync-pro
   npm install
   npm run build
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name www.wemakemarin.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **SSL Setup**
   ```bash
   sudo certbot --nginx -d www.wemakemarin.com
   ```

## 🛠 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open database studio
- `npm test` - Run tests

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Zod for runtime validation

## 📊 Monitoring & Logging

### Activity Logging
All system activities are logged:
- User authentication events
- Integration synchronizations
- Workflow executions
- Data modifications

### Error Handling
- Comprehensive error boundaries
- API error responses
- User-friendly error messages
- Automatic retry logic for integrations

## 🔐 Security

### Authentication
- Replit OpenID Connect integration
- Session-based authentication
- Password hashing with bcrypt
- Role-based access control

### Data Protection
- SQL injection prevention via Drizzle ORM
- Input validation with Zod schemas
- HTTPS enforcement in production
- Secure session management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For technical support or questions:
- Email: support@wemakemarin.com
- Documentation: [Project Wiki](wiki-url)
- Issues: [GitHub Issues](issues-url)

## 📄 License

This project is proprietary software developed for Marin Pest Control. All rights reserved.

---

**Built with ❤️ for Marin Pest Control**  
*Comprehensive business management platform with advanced API integrations*