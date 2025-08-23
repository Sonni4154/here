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

The interactive deployment script handles complete server setup including system dependencies, database configuration, web server setup, SSL certificates, and security hardening.

### Manual Deployment Steps

#### Prerequisites
- Ubuntu/Debian server with sudo access
- Domain name pointing to server IP
- Firewall access to ports 80, 443, and 22

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common
```

#### 2. Node.js Installation
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.x
npm --version
```

#### 3. PostgreSQL Database Setup
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE timesync_pro;
CREATE USER timesync_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE timesync_pro TO timesync_user;
ALTER USER timesync_user CREATEDB;
\q
EOF
```

#### 4. Application Deployment
```bash
# Create application directory
sudo mkdir -p /var/www/timesync-pro
sudo chown $USER:$USER /var/www/timesync-pro

# Clone repository
git clone https://github.com/your-username/timesync-pro.git /var/www/timesync-pro
cd /var/www/timesync-pro

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your configuration

# Setup database schema
npm run db:push

# Build application
npm run build
```

#### 5. Process Management with PM2
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Configure PM2 startup
pm2 save
pm2 startup
# Follow the generated command to enable startup

# Monitor application
pm2 status
pm2 logs timesync-pro
```

#### 6. Nginx Web Server Configuration
```bash
# Install Nginx
sudo apt install -y nginx

# Create server configuration
sudo tee /etc/nginx/sites-available/timesync-pro << 'EOF'
server {
    listen 80;
    server_name www.wemakemarin.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/timesync-pro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 7. SSL Certificate Installation
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d www.wemakemarin.com

# Setup automatic renewal
sudo systemctl enable certbot.timer
```

#### 8. Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 9. Backup System Setup
```bash
# Create backup script
cat > ~/backup-timesync.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/timesync-pro"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump timesync_pro > "$BACKUP_DIR/db_backup_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" \
    --exclude="node_modules" \
    --exclude=".git" \
    -C "/var/www" timesync-pro

# Clean old backups (30 days)
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x ~/backup-timesync.sh

# Schedule daily backups
(crontab -l; echo "0 2 * * * ~/backup-timesync.sh") | crontab -
```

### Docker Deployment (Alternative)

#### Using Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://timesync_user:password@db:5432/timesync_pro
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=timesync_pro
      - POSTGRES_USER=timesync_user
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app

volumes:
  postgres_data:
```

#### Create Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Cloud Platform Deployment

#### Heroku Deployment
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login and create app
heroku login
heroku create timesync-pro

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your_session_secret
heroku config:set QUICKBOOKS_CLIENT_ID=your_client_id

# Deploy
git push heroku main

# Run database migrations
heroku run npm run db:push
```

#### AWS EC2 Deployment
```bash
# Create EC2 instance (Ubuntu 20.04 LTS)
# SSH to instance and follow manual deployment steps above

# Additional AWS-specific configuration
# Setup AWS RDS for PostgreSQL
# Configure AWS Load Balancer
# Setup AWS CloudFront for static assets
# Use AWS Systems Manager for secrets management
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: timesync-pro
services:
- name: web
  source_dir: /
  github:
    repo: your-username/timesync-pro
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
databases:
- engine: PG
  name: timesync-db
  num_nodes: 1
  size: db-s-dev-database
  version: "13"
```

## 🔧 External Features & Manual Operations

### API Integration Management

#### QuickBooks Integration Setup
```bash
# Manual QuickBooks connection (outside dashboard)
curl -X GET "https://www.wemakemarin.com/api/integrations/quickbooks/connect" \
  -H "Authorization: Bearer your_session_token"

# Manual sync trigger
curl -X POST "https://www.wemakemarin.com/api/integrations/quickbooks/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_session_token"

# Check sync status
curl -X GET "https://www.wemakemarin.com/api/sync/status" \
  -H "Authorization: Bearer your_session_token"
```

#### Bulk Data Operations
```bash
# Import customer data from CSV
curl -X POST "https://www.wemakemarin.com/api/customers/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@customers.csv" \
  -H "Authorization: Bearer your_session_token"

# Export all customer data
curl -X GET "https://www.wemakemarin.com/api/customers/export?format=csv" \
  -H "Authorization: Bearer your_session_token" \
  -o customers_export.csv

# Bulk invoice creation
curl -X POST "https://www.wemakemarin.com/api/invoices/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_session_token" \
  -d @bulk_invoices.json
```

### Database Administration

#### Direct Database Access
```bash
# Connect to production database
psql postgresql://username:password@host:port/timesync_pro

# Common administrative queries
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM invoices WHERE status = 'paid';
SELECT provider, is_active, last_sync_at FROM integrations;

# Performance monitoring
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;
```

#### Database Maintenance
```bash
# Manual backup
pg_dump timesync_pro > backup_$(date +%Y%m%d).sql

# Restore from backup
psql timesync_pro < backup_20240101.sql

# Database optimization
psql timesync_pro -c "VACUUM ANALYZE;"
psql timesync_pro -c "REINDEX DATABASE timesync_pro;"
```

### System Monitoring & Maintenance

#### Log Analysis
```bash
# Application logs
pm2 logs timesync-pro --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# System performance
htop
iotop
netstat -tulpn

# Database performance
psql timesync_pro -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

#### Performance Monitoring
```bash
# Real-time application monitoring
pm2 monit

# System resource usage
free -h
df -h
iostat 1 5

# Network monitoring
netstat -i
ss -tuln

# Database connections
psql timesync_pro -c "SELECT count(*) FROM pg_stat_activity;"
```

### Workflow Automation Management

#### Manual Workflow Triggers
```bash
# Trigger specific workflow
curl -X POST "https://www.wemakemarin.com/api/workflows/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_session_token" \
  -d '{
    "event": "job_completed",
    "data": {
      "customerId": "cust_123",
      "jobId": "job_456"
    }
  }'

# List all workflow executions
curl -X GET "https://www.wemakemarin.com/api/workflows/executions?limit=50" \
  -H "Authorization: Bearer your_session_token"

# Retry failed workflow
curl -X POST "https://www.wemakemarin.com/api/workflows/retry/execution_id" \
  -H "Authorization: Bearer your_session_token"
```

#### Workflow Configuration
```bash
# Export workflow configuration
curl -X GET "https://www.wemakemarin.com/api/workflows/config/export" \
  -H "Authorization: Bearer your_session_token" \
  -o workflow_config.json

# Import workflow configuration
curl -X POST "https://www.wemakemarin.com/api/workflows/config/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_session_token" \
  -d @workflow_config.json
```

### Security & Access Management

#### User Management via CLI
```bash
# Create new employee account
curl -X POST "https://www.wemakemarin.com/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.employee@marinpest.com",
    "password": "secure_password",
    "firstName": "John",
    "lastName": "Doe",
    "role": "technician",
    "department": "field_operations"
  }'

# Update user permissions
curl -X PATCH "https://www.wemakemarin.com/api/users/user_id/permissions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{
    "permissions": ["read_customers", "write_time_entries", "read_invoices"]
  }'

# Disable user account
curl -X PATCH "https://www.wemakemarin.com/api/users/user_id/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{"status": "disabled"}'
```

#### Security Auditing
```bash
# Review login attempts
psql timesync_pro -c "SELECT * FROM activity_logs WHERE type = 'login_attempt' ORDER BY created_at DESC LIMIT 50;"

# Check active sessions
psql timesync_pro -c "SELECT sess, expire FROM sessions WHERE expire > NOW();"

# Review integration access
psql timesync_pro -c "SELECT user_id, provider, last_sync_at, is_active FROM integrations;"
```

### Mobile & External Access

#### Mobile API Usage
```bash
# Mobile-optimized customer search
curl -X GET "https://www.wemakemarin.com/api/customers/search?q=smith&mobile=true" \
  -H "Authorization: Bearer mobile_token"

# Quick time entry for mobile
curl -X POST "https://www.wemakemarin.com/api/time-entries/quick" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_token" \
  -d '{
    "customerId": "cust_123",
    "serviceType": "inspection",
    "duration": 30,
    "notes": "Routine inspection completed",
    "location": {"lat": 37.7749, "lng": -122.4194}
  }'
```

#### Third-Party Integration Webhooks
```bash
# Setup JotForm webhook
curl -X POST "https://api.jotform.com/form/form_id/webhooks" \
  -H "APIKEY: your_jotform_api_key" \
  -d "webhookURL=https://www.wemakemarin.com/api/webhooks/jotform"

# Setup QuickBooks webhook (via Intuit Developer Console)
# Configure webhook URL: https://www.wemakemarin.com/api/webhooks/quickbooks

# Test webhook delivery
curl -X POST "https://www.wemakemarin.com/api/webhooks/test" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "jotform",
    "event": "form_submission",
    "test": true
  }'
```

### Backup & Recovery Operations

#### Manual Backup Procedures
```bash
# Complete system backup
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/timesync-complete-$BACKUP_DATE"

mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump timesync_pro > "$BACKUP_DIR/database.sql"

# Application files backup
tar -czf "$BACKUP_DIR/application.tar.gz" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="logs" \
  /var/www/timesync-pro

# Configuration backup
cp /etc/nginx/sites-available/timesync-pro "$BACKUP_DIR/nginx.conf"
cp /var/www/timesync-pro/.env "$BACKUP_DIR/environment.env"

# SSL certificates backup
cp -r /etc/letsencrypt "$BACKUP_DIR/ssl-certificates"

echo "Backup completed: $BACKUP_DIR"
```

#### Disaster Recovery
```bash
# Emergency database restore
pg_dump timesync_pro > emergency_backup.sql  # Current state backup
dropdb timesync_pro
createdb timesync_pro
psql timesync_pro < backup_file.sql

# Application rollback
pm2 stop timesync-pro
cd /var/www/timesync-pro
git checkout previous_stable_tag
npm install
npm run build
pm2 start timesync-pro

# Configuration restore
sudo cp backup_nginx.conf /etc/nginx/sites-available/timesync-pro
sudo nginx -t && sudo systemctl reload nginx
```

## 🛠 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open database studio
- `npm run db:generate` - Generate migration files
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Zod for runtime validation

### Development Environment Setup
```bash
# Clone repository
git clone https://github.com/your-username/timesync-pro.git
cd timesync-pro

# Install dependencies
npm install

# Setup development database
cp .env.example .env
# Edit .env with local database configuration

# Initialize database
npm run db:push

# Start development server
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm run test -- --grep "Customer API"
```

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