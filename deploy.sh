#!/bin/bash

# Network Engineers Toolkit - Automated Deployment Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

# Check root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

print_header "Network Engineers Toolkit - Deployment"

# Step 1: Check Docker
print_header "Step 1: Checking System Requirements"

if ! command -v docker &> /dev/null; then
    print_warning "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

if ! command -v docker-compose &> /dev/null; then
    print_warning "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

systemctl start docker
systemctl enable docker
print_success "Docker service running"

# Step 2: Generate secrets
print_header "Step 2: Generating Secure Secrets"

if [ ! -f .env ]; then
    print_warning "Creating .env file..."
    cp .env.example .env
    
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
    
    print_success "Generated secure secrets"
    print_warning "Review .env file for API keys"
else
    print_success ".env file exists"
fi

# Step 3: Create directories
print_header "Step 3: Creating Directories"

mkdir -p logs uploads ssl database/backups
chmod 755 logs uploads ssl database/backups
print_success "Created directories"

# Step 4: Build images
print_header "Step 4: Building Docker Images"

docker-compose build --no-cache
print_success "Images built"

# Step 5: Start services
print_header "Step 5: Starting Services"

docker-compose down
docker-compose up -d

print_warning "Waiting for services (30 seconds)..."
sleep 30

if docker-compose ps | grep -q "Up"; then
    print_success "All services running"
else
    print_error "Services failed to start"
    docker-compose logs
    exit 1
fi

# Step 6: Database check
print_header "Step 6: Verifying Database"

max_attempts=30
attempt=0
until docker-compose exec -T postgres pg_isready -U nettools_user -d nettools > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        print_error "Database failed to start"
        exit 1
    fi
    echo "Waiting for database... ($attempt/$max_attempts)"
    sleep 2
done

print_success "Database ready"

# Step 7: Firewall
print_header "Step 7: Configuring Firewall"

if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    print_success "Firewall configured"
else
    print_warning "UFW not found"
fi

# Step 8: SSL (optional)
print_header "Step 8: SSL Configuration"

read -p "Setup SSL with Let's Encrypt? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Domain name: " DOMAIN
    read -p "Email: " EMAIL
    
    if ! command -v certbot &> /dev/null; then
        apt-get update
        apt-get install -y certbot
    fi
    
    docker-compose stop frontend
    certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email
    
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/
    
    sed -i "s|DOMAIN_NAME=.*|DOMAIN_NAME=$DOMAIN|" .env
    sed -i "s|LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=$EMAIL|" .env
    
    docker-compose up -d
    print_success "SSL installed"
else
    print_warning "Skipping SSL"
fi

# Complete
print_header "Deployment Complete!"

echo ""
print_success "Network Engineers Toolkit deployed!"
echo ""
echo "Access: http://$(hostname -I | awk '{print $1}')"
if [ -f ssl/fullchain.pem ]; then
    echo "        https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)"
fi
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
print_warning "CHANGE THE DEFAULT PASSWORD IMMEDIATELY!"
echo ""
echo "Commands:"
echo "  docker-compose logs -f    # View logs"
echo "  docker-compose down       # Stop"
echo "  docker-compose up -d      # Start"
echo "  docker-compose restart    # Restart"
echo ""
print_success "Deployment successful!"