
#!/bin/bash

# TimeSync Pro - Docker Compose One-Click Deployment
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 TimeSync Pro - Docker Compose Deployment${NC}"
echo "=============================================="

# Check if Docker and Docker Compose are installed
check_dependencies() {
    echo -e "\n${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Create necessary directories
create_directories() {
    echo -e "\n${YELLOW}📁 Creating directories...${NC}"
    
    mkdir -p logs uploads nginx/ssl
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Generate environment configuration
setup_environment() {
    echo -e "\n${YELLOW}⚙️  Setting up environment...${NC}"
    
    if [[ ! -f ".env.docker" ]]; then
        cat > .env.docker << EOF
# TimeSync Pro Docker Environment Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://timesync_user:timesync_secure_password@db:5432/timesync_pro

# Session Configuration
SESSION_SECRET=$(openssl rand -hex 32)

# QuickBooks Integration (Update with your credentials)
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:5000/api/integrations/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox

# Google Integration (Update with your credentials)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback

# Application Configuration
REPLIT_APP_URL=http://localhost:5000
WEBHOOK_SECRET=$(openssl rand -hex 32)

# Redis Configuration
REDIS_URL=redis://:redis_secure_password@redis:6379
EOF
        echo -e "${GREEN}✅ Environment file created (.env.docker)${NC}"
        echo -e "${YELLOW}⚠️  Please update the QuickBooks and Google credentials in .env.docker${NC}"
    else
        echo -e "${GREEN}✅ Environment file already exists${NC}"
    fi
}

# Pull and build images
build_images() {
    echo -e "\n${YELLOW}🏗️  Building application images...${NC}"
    
    docker-compose build --no-cache
    echo -e "${GREEN}✅ Images built successfully${NC}"
}

# Start services
start_services() {
    echo -e "\n${YELLOW}🚀 Starting services...${NC}"
    
    # Load environment variables
    export $(cat .env.docker | grep -v '^#' | xargs)
    
    # Start services in detached mode
    docker-compose up -d
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Wait for services to be ready
wait_for_services() {
    echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
    
    # Wait for database
    echo "Waiting for database..."
    timeout 60 bash -c 'until docker-compose exec -T db pg_isready -U timesync_user -d timesync_pro; do sleep 2; done'
    
    # Wait for application
    echo "Waiting for application..."
    timeout 60 bash -c 'until curl -f http://localhost:5000/api/health; do sleep 2; done'
    
    echo -e "${GREEN}✅ All services are ready${NC}"
}

# Setup database schema
setup_database() {
    echo -e "\n${YELLOW}🗄️  Setting up database schema...${NC}"
    
    # Run database migrations
    docker-compose exec app npm run db:push
    
    echo -e "${GREEN}✅ Database schema setup completed${NC}"
}

# Display deployment information
show_deployment_info() {
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "\n${BLUE}📋 Deployment Information:${NC}"
    echo "================================"
    echo -e "Application URL: ${GREEN}http://localhost:5000${NC}"
    echo -e "Database URL: ${GREEN}postgresql://timesync_user:timesync_secure_password@localhost:5432/timesync_pro${NC}"
    echo -e "Redis URL: ${GREEN}redis://:redis_secure_password@localhost:6379${NC}"
    
    echo -e "\n${BLUE}🛠️  Useful Commands:${NC}"
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
    echo "Restart services: docker-compose restart"
    echo "View status: docker-compose ps"
    echo "Access database: docker-compose exec db psql -U timesync_user -d timesync_pro"
    echo "Access app shell: docker-compose exec app /bin/sh"
    
    echo -e "\n${YELLOW}⚠️  Important Notes:${NC}"
    echo "1. Update your QuickBooks and Google OAuth credentials in .env.docker"
    echo "2. For production use, configure SSL certificates in nginx/ssl/"
    echo "3. Change default passwords in docker-compose.yml for production"
    echo "4. Consider using Docker secrets for sensitive information"
    
    echo -e "\n${BLUE}🔧 Configuration Files:${NC}"
    echo "- docker-compose.yml: Main orchestration file"
    echo "- .env.docker: Environment configuration"
    echo "- nginx/nginx.conf: Reverse proxy configuration"
    echo "- Dockerfile: Application container definition"
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        echo -e "\n${RED}❌ Deployment failed. Cleaning up...${NC}"
        docker-compose down --remove-orphans
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment flow
main() {
    check_dependencies
    create_directories
    setup_environment
    build_images
    start_services
    wait_for_services
    setup_database
    show_deployment_info
}

# Run deployment
main "$@"
