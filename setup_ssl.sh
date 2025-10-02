#!/bin/bash

# SSL Certificate Setup Script for Network Engineers Toolkit
# This script sets up SSL certificates using Let's Encrypt

set -e

echo "🔒 Setting up SSL certificates..."

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <domain-name>"
    echo "Example: $0 nettools.example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Stop nginx temporarily
echo "🛑 Stopping nginx temporarily..."
docker-compose -f docker-compose.prod.yml stop nginx

# Generate SSL certificate
echo "🔐 Generating SSL certificate..."
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# Create SSL directory
echo "📁 Setting up SSL directory..."
sudo mkdir -p ./ssl

# Copy certificates
echo "📋 Copying certificates..."
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ./ssl/cert.pem
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ./ssl/key.pem

# Set proper permissions
sudo chown -R $USER:$USER ./ssl
chmod 600 ./ssl/key.pem
chmod 644 ./ssl/cert.pem

# Update nginx configuration with the correct domain
echo "⚙️  Updating nginx configuration..."
sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx/nginx.prod.conf

# Restart nginx
echo "🔄 Restarting nginx..."
docker-compose -f docker-compose.prod.yml start nginx

# Set up certificate renewal
echo "🔄 Setting up automatic certificate renewal..."
(sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'cd $(pwd) && ./ssl_renew_hook.sh'") | sudo crontab -

# Create renewal hook script
cat > ssl_renew_hook.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Hook

DOMAIN=$(basename /etc/letsencrypt/live/*)
cd "$(dirname "$0")"

echo "🔄 Updating SSL certificates after renewal..."

# Copy new certificates
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ./ssl/cert.pem
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ./ssl/key.pem

# Set permissions
sudo chown -R $USER:$USER ./ssl
chmod 600 ./ssl/key.pem
chmod 644 ./ssl/cert.pem

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "✅ SSL certificates updated successfully!"
EOF

chmod +x ssl_renew_hook.sh

echo ""
echo "✅ SSL setup completed successfully!"
echo ""
echo "📋 Certificate Information:"
echo "   Domain: $DOMAIN"
echo "   Certificate: ./ssl/cert.pem"
echo "   Private Key: ./ssl/key.pem"
echo "   Expires: $(sudo openssl x509 -enddate -noout -in ./ssl/cert.pem | cut -d= -f2)"
echo ""
echo "🔄 Automatic renewal is configured to run daily at 12:00 PM"
echo "🌐 Your site should now be accessible at: https://$DOMAIN"
