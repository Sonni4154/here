#!/bin/bash

# TimeSync Pro - Production Deployment Script
# For deployment on www.wemakemarin.com

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Auto-detect or prompt for values
AUTO_DETECT_REPO=$(git config --get remote.origin.url 2>/dev/null || echo "")
DEFAULT_APP_NAME=$(basename "$(pwd)")
DEFAULT_DOMAIN=$(hostname -f 2>/dev/null || echo "your-domain.com")

# Prompt for configuration
echo -e "${BLUE}📋 Configuration Setup${NC}"
echo "----------------------------------------"

read -p "App name (default: $DEFAULT_APP_NAME): " APP_NAME
APP_NAME=${APP_NAME:-$DEFAULT_APP_NAME}

read -p "Repository URL (default: $AUTO_DETECT_REPO): " REPO_URL
REPO_URL=${REPO_URL:-$AUTO_DETECT_REPO}

read -p "Domain name (default: $DEFAULT_DOMAIN): " DOMAIN
DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}

read -p "Node.js version (default: 18): " NODE_VERSION
NODE_VERSION=${NODE_VERSION:-18}

# Derived configuration
APP_DIR="/var/www/$APP_NAME"
DB_NAME=$(echo "$APP_NAME" | tr '-' '_')
DB_USER="${APP_NAME}_user"

echo -e "\n${GREEN}Configuration Summary:${NC}"
echo "App Name: $APP_NAME"
echo "App Directory: $APP_DIR"
echo "Repository: $REPO_URL"
echo "Domain: $DOMAIN"
echo "Database: $DB_NAME"
echo "Database User: $DB_USER"

echo -e "${BLUE}🚀 TimeSync Pro - Production Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${YELLOW}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for user input
prompt_user() {
    while true; do
        read -p "$1 (y/n): " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root for security reasons${NC}"
        echo "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

# System requirements check
check_system() {
    print_step "Checking System Requirements"
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        echo -e "${RED}❌ This script is designed for Linux systems${NC}"
        exit 1
    fi
    
    # Check if sudo is available
    if ! command_exists sudo; then
        echo -e "${RED}❌ sudo is required but not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ System requirements check passed${NC}"
}

# Install Node.js
install_nodejs() {
    print_step "Installing Node.js $NODE_VERSION"
    
    if command_exists node; then
        NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
            echo -e "${GREEN}✅ Node.js $NODE_CURRENT is already installed${NC}"
            return
        fi
    fi
    
    echo "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo -e "${GREEN}✅ Node.js installed successfully${NC}"
}

# Install system dependencies
install_dependencies() {
    print_step "Installing System Dependencies"
    
    echo "Updating package lists..."
    sudo apt-get update
    
    echo "Installing required packages..."
    sudo apt-get install -y \
        git \
        nginx \
        postgresql \
        postgresql-contrib \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        htop \
        curl \
        unzip
    
    echo -e "${GREEN}✅ System dependencies installed${NC}"
}

# Install PM2
install_pm2() {
    print_step "Installing PM2 Process Manager"
    
    if command_exists pm2; then
        echo -e "${GREEN}✅ PM2 is already installed${NC}"
        return
    fi
    
    sudo npm install -g pm2
    
    # Setup PM2 startup script
    pm2 startup | grep -E '^sudo' | bash
    
    echo -e "${GREEN}✅ PM2 installed and configured${NC}"
}

# Setup PostgreSQL
setup_database() {
    print_step "Setting up PostgreSQL Database"
    
    # Start PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    echo "Creating database and user..."
    read -s -p "Enter database password for $DB_USER: " DB_PASS
    echo
    
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    echo -e "${GREEN}✅ Database setup completed${NC}"
    echo "Database URL: postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
}

# Clone and setup application
setup_application() {
    print_step "Setting up Application"
    
    # Create application directory
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # Clone repository
    if [[ -d "$APP_DIR/.git" ]]; then
        echo "Updating existing repository..."
        cd $APP_DIR
        git pull origin main
    else
        echo "Cloning repository..."
        git clone $REPO_URL $APP_DIR
        cd $APP_DIR
    fi
    
    # Install dependencies
    echo "Installing application dependencies..."
    npm install
    
    # Build application
    echo "Building application..."
    npm run build
    
    echo -e "${GREEN}✅ Application setup completed${NC}"
}

# Configure environment
configure_environment() {
    print_step "Configuring Environment"
    
    cd $APP_DIR
    
    if [[ ! -f ".env" ]]; then
        echo "Creating environment configuration..."
        cp .env.example .env
        
        # Update database URL in .env file
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|g" .env
        
        echo "Environment file created with database configuration."
        echo "Please edit the .env file to add:"
        echo "- Session secret"
        echo "- QuickBooks credentials"
        echo "- Other API keys"
        
        if prompt_user "Open .env file for editing now?"; then
            ${EDITOR:-nano} .env
        fi
    else
        echo -e "${YELLOW}⚠️  .env file already exists${NC}"
        if prompt_user "Update database URL in .env file?"; then
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|g" .env
            echo "Database URL updated in .env file."
        fi
        if prompt_user "Open .env file for editing?"; then
            ${EDITOR:-nano} .env
        fi
    fi
    
    echo -e "${GREEN}✅ Environment configured${NC}"
}

# Setup database schema
setup_schema() {
    print_step "Setting up Database Schema"
    
    cd $APP_DIR
    
    echo "Pushing database schema..."
    npm run db:push
    
    if prompt_user "Import sample data?"; then
        echo "Starting application temporarily to import data..."
        npm start &
        APP_PID=$!
        sleep 10
        
        # Import sample data via API
        curl -X POST http://localhost:5000/api/import-sample-data \
             -H "Content-Type: application/json"
        
        kill $APP_PID
        wait $APP_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Database schema setup completed${NC}"
}

# Configure Nginx
configure_nginx() {
    print_step "Configuring Nginx"
    
    # Backup existing configuration
    if [[ -f "/etc/nginx/sites-available/$DOMAIN" ]]; then
        sudo cp "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-available/$DOMAIN.bak"
    fi
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo -e "${GREEN}✅ Nginx configured successfully${NC}"
}

# Setup SSL certificate
setup_ssl() {
    print_step "Setting up SSL Certificate"
    
    echo "Obtaining SSL certificate from Let's Encrypt..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    
    echo -e "${GREEN}✅ SSL certificate installed${NC}"
}

# Configure firewall
configure_firewall() {
    print_step "Configuring Firewall"
    
    # Reset UFW
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow necessary ports
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw allow 5432  # PostgreSQL (if needed for remote access)
    
    # Enable firewall
    sudo ufw --force enable
    
    echo -e "${GREEN}✅ Firewall configured${NC}"
}

# Start application
start_application() {
    print_step "Starting Application"
    
    cd $APP_DIR
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'dist/index.js',
    interpreter: 'node',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME'
    },
    log_file: '/var/log/$APP_NAME.log',
    error_file: '/var/log/$APP_NAME-error.log',
    out_file: '/var/log/$APP_NAME-out.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    restart_delay: 1000
  }]
};
EOF
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    pm2 save
    
    echo -e "${GREEN}✅ Application started successfully${NC}"
}

# Setup monitoring and logs
setup_monitoring() {
    print_step "Setting up Monitoring and Logs"
    
    # Create log directories
    sudo mkdir -p /var/log/$APP_NAME
    sudo chown $USER:$USER /var/log/$APP_NAME
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/$APP_NAME > /dev/null << EOF
/var/log/$APP_NAME*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    # Install PM2 log rotate module
    pm2 install pm2-logrotate
    
    echo -e "${GREEN}✅ Monitoring and logging configured${NC}"
}

# Setup backup system
setup_backup() {
    print_step "Setting up Backup System"
    
    # Create backup directory
    sudo mkdir -p /var/backups/$APP_NAME
    sudo chown $USER:$USER /var/backups/$APP_NAME
    
    # Create backup script
    cat > /home/$USER/backup-$APP_NAME.sh << EOF
#!/bin/bash

BACKUP_DIR="/var/backups/$APP_NAME"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_DIR="$APP_DIR"

# Database backup
pg_dump $DB_NAME > "\$BACKUP_DIR/db_backup_\$DATE.sql"

# Application backup (excluding node_modules)
tar -czf "\$BACKUP_DIR/app_backup_\$DATE.tar.gz" \\
    --exclude="node_modules" \\
    --exclude=".git" \\
    --exclude="logs" \\
    -C "/var/www" $APP_NAME

# Clean old backups (keep 30 days)
find "\$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "\$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: \$DATE"
EOF
    
    chmod +x /home/$USER/backup-$APP_NAME.sh
    
    # Setup cron job for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-$APP_NAME.sh") | crontab -
    
    echo -e "${GREEN}✅ Backup system configured${NC}"
}

# Final status check
final_status() {
    print_step "Final Status Check"
    
    echo "Checking application status..."
    pm2 status
    
    echo "Checking Nginx status..."
    sudo systemctl status nginx --no-pager -l
    
    echo "Checking database connection..."
    cd $APP_DIR
    npm run db:studio &
    STUDIO_PID=$!
    sleep 3
    kill $STUDIO_PID 2>/dev/null || true
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}Application URL: https://$DOMAIN${NC}"
    echo -e "${BLUE}Database: postgresql://$DB_USER@localhost:5432/$DB_NAME${NC}"
    echo -e "${BLUE}PM2 Dashboard: pm2 monit${NC}"
    echo -e "${BLUE}Logs: pm2 logs $APP_NAME${NC}"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Configure your QuickBooks integration in .env"
    echo "2. Set up Google OAuth credentials in .env"
    echo "3. Import your business data"
    echo "4. Test the application functionality"
    
    echo -e "\n${YELLOW}Useful Commands:${NC}"
    echo "- Restart app: pm2 restart $APP_NAME"
    echo "- View logs: pm2 logs $APP_NAME"
    echo "- Monitor: pm2 monit"
    echo "- Database backup: /home/$USER/backup-$APP_NAME.sh"
    echo "- SSL renewal: sudo certbot renew"
    echo "- Database access: psql -U $DB_USER -d $DB_NAME"
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_root
    check_system
    
    if prompt_user "Install system dependencies?"; then
        install_dependencies
        install_nodejs
        install_pm2
    fi
    
    if prompt_user "Setup database?"; then
        setup_database
    fi
    
    if prompt_user "Setup application?"; then
        setup_application
        configure_environment
        setup_schema
    fi
    
    if prompt_user "Configure web server (Nginx)?"; then
        configure_nginx
    fi
    
    if prompt_user "Setup SSL certificate?"; then
        setup_ssl
    fi
    
    if prompt_user "Configure firewall?"; then
        configure_firewall
    fi
    
    if prompt_user "Start application?"; then
        start_application
    fi
    
    if prompt_user "Setup monitoring and backups?"; then
        setup_monitoring
        setup_backup
    fi
    
    final_status
}

# Run main function
main "$@"