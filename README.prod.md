# Network Engineers Toolkit - Production Deployment Guide

This guide provides step-by-step instructions for deploying the Network Engineers Toolkit to a production environment.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured to point to your server
- SSL certificate (Let's Encrypt recommended)
- SMTP server for email notifications (optional)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Cellsave/ne-toolkit.git
   cd ne-toolkit
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with your production settings
   ```

3. **Deploy the application:**
   ```bash
   ./deploy.prod.sh
   ```

4. **Set up SSL certificates:**
   ```bash
   ./setup_ssl.sh your-domain.com
   ```

## Detailed Configuration

### Environment Variables

Copy `.env.prod.example` to `.env.prod` and configure the following:

#### Database Configuration
```bash
DB_USER=nettools_user
DB_PASSWORD=your_secure_database_password_here
DB_NAME=nettools_prod
```

#### Security Keys
Generate secure random keys:
```bash
# Generate encryption key (32 characters)
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64
```

#### Email Configuration (Optional)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@your-domain.com
```

#### Application Settings
```bash
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com
```

### SSL Certificate Setup

The `setup_ssl.sh` script automatically configures Let's Encrypt SSL certificates:

```bash
./setup_ssl.sh your-domain.com admin@your-domain.com
```

This script will:
- Install certbot if not present
- Generate SSL certificates
- Configure automatic renewal
- Update nginx configuration

### Database Backups

Set up automated database backups:

```bash
# Make backup script executable
chmod +x scripts/backup_db.sh

# Add to crontab for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/ne-toolkit/scripts/backup_db.sh") | crontab -
```

## Security Checklist

Before going live, ensure:

- [ ] Default admin user is removed from database
- [ ] Strong encryption keys are generated
- [ ] SSL certificates are configured
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] Database backups are automated
- [ ] Monitoring is set up
- [ ] Firewall rules are configured

## Post-Deployment

### Create Admin User

After deployment, create the initial admin user:

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run setup:admin
```

**Important:** Save the generated admin credentials securely and change the password after first login.

### Verify Deployment

1. **Check service status:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Test health endpoints:**
   ```bash
   curl https://your-domain.com/health
   curl https://your-domain.com/api/health
   ```

3. **Check logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## Monitoring and Maintenance

### Log Management

Application logs are stored in the `logs/` directory:
- `logs/error.log` - Error logs
- `logs/combined.log` - All application logs

### Database Maintenance

Regular maintenance tasks:

```bash
# Create manual backup
./scripts/backup_db.sh

# View recent backups
ls -la backups/

# Monitor database size
docker-compose -f docker-compose.prod.yml exec db psql -U $DB_USER -d $DB_NAME -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));"
```

### Performance Monitoring

Monitor key metrics:
- Response times
- Database connections
- Memory usage
- Disk space
- SSL certificate expiry

## Troubleshooting

### Common Issues

1. **Services won't start:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Verify environment variables
   docker-compose -f docker-compose.prod.yml config
   ```

2. **Database connection issues:**
   ```bash
   # Test database connectivity
   docker-compose -f docker-compose.prod.yml exec db pg_isready -U $DB_USER
   ```

3. **SSL certificate issues:**
   ```bash
   # Check certificate validity
   openssl x509 -in ssl/cert.pem -text -noout
   
   # Test SSL configuration
   curl -I https://your-domain.com
   ```

### Log Analysis

```bash
# View recent errors
tail -f logs/error.log

# Search for specific issues
grep "ERROR" logs/combined.log

# Monitor real-time logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Scaling and Performance

### Horizontal Scaling

To scale the backend service:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Database Optimization

Monitor and optimize database performance:

```bash
# Check slow queries
docker-compose -f docker-compose.prod.yml exec db psql -U $DB_USER -d $DB_NAME -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Analyze table sizes
docker-compose -f docker-compose.prod.yml exec db psql -U $DB_USER -d $DB_NAME -c "SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;"
```

## Updates and Maintenance

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Database Migrations

```bash
# Run database migrations (if available)
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## Support

For issues and support:
- Check the troubleshooting section above
- Review application logs
- Consult the main README.md for development information
- Submit issues to the GitHub repository

## Security Updates

Regularly update:
- Docker images
- SSL certificates
- Application dependencies
- Operating system packages

```bash
# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update system packages
sudo apt update && sudo apt upgrade -y
```
