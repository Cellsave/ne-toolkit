# 🚀 Production Deployment Instructions

## ✅ Critical Bugs Fixed

All critical bugs have been resolved:
1. ✅ Merge conflict in docker-compose.prod.yml removed
2. ✅ Missing DB_HOST and DB_PORT environment variables added
3. ✅ Database healthcheck configured
4. ✅ Dockerfile directory creation fixed
5. ✅ .env.prod.example updated with all required variables

---

## 📋 Pre-Deployment Checklist

### System Requirements
- [ ] Ubuntu 24.04 (or compatible Linux)
- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] Git installed
- [ ] Sudo privileges
- [ ] Ports 80, 443, 3000, 5432 available (or configure alternatives)

### Check Docker Installation
```bash
docker --version
docker compose version
```

If not installed:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

---

## 🔧 Step-by-Step Deployment

### Step 1: Clone Repository (if not already done)
```bash
cd /path/to/your/projects
git clone https://github.com/Cellsave/ne-toolkit.git
cd ne-toolkit
```

### Step 2: Create Production Environment File
```bash
# Copy the example file
cp .env.prod.example .env.prod

# Generate secure ENCRYPTION_KEY (must be exactly 32 characters)
echo "ENCRYPTION_KEY=$(openssl rand -base64 32 | head -c 32)"

# Generate secure JWT_SECRET
echo "JWT_SECRET=$(openssl rand -base64 64)"

# Edit the file and replace all CHANGE_ME values
nano .env.prod
```

**Required Variables to Set:**
- `DB_PASSWORD` - Strong database password (min 16 chars)
- `ENCRYPTION_KEY` - Exactly 32 characters (use generated value above)
- `JWT_SECRET` - Long random string (use generated value above)
- `APP_URL` - Your domain (e.g., https://nettools.yourdomain.com)
- `SMTP_*` - Email settings (optional, for notifications)

### Step 3: Verify Configuration
```bash
# Check that all CHANGE_ME placeholders are replaced
grep CHANGE_ME .env.prod
# Should return nothing if all values are set

# Verify environment variables are loaded
source .env.prod
echo $DB_HOST  # Should output: db
echo $DB_PORT  # Should output: 5432
```

### Step 4: Create Required Directories
```bash
mkdir -p logs ssl backups
chmod 755 logs ssl backups
```

### Step 5: Deploy Application
```bash
# Make deployment script executable
chmod +x deploy.prod.sh

# Run deployment
./deploy.prod.sh
```

The script will:
1. Load environment variables
2. Validate required variables
3. Check Docker is running
4. Create necessary directories
5. Stop existing containers
6. Build new images
7. Start all services
8. Wait for database to be ready
9. Wait for backend to be ready
10. Create admin user
11. Display deployment status

### Step 6: Verify Deployment
```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# All services should show "Up" status
# Expected output:
# NAME                IMAGE               STATUS
# ne-toolkit-backend  ...                 Up (healthy)
# ne-toolkit-db       postgres:15-alpine  Up (healthy)
# ne-toolkit-nginx    nginx:alpine        Up

# Test database connection
docker compose -f docker-compose.prod.yml exec db pg_isready -U nettools_user -d nettools_prod
# Should output: accepting connections

# Test backend health
curl http://localhost:3000/health
# Should return JSON with status: "healthy"

# Test frontend (adjust port if using 8080)
curl http://localhost:80
# Should return HTML content
```

### Step 7: Save Admin Credentials
The deployment script will display admin credentials. **SAVE THESE SECURELY!**

Example output:
```
✅ Admin user created successfully!

📋 Admin Credentials:
   Username: admin
   Email: admin@nettools.local
   Password: [randomly generated password]

⚠️  IMPORTANT: Save these credentials securely and change the password after first login!
```

---

## 🔒 SSL Certificate Setup (Production)

### Option A: Let's Encrypt (Recommended)
```bash
# Make SSL setup script executable
chmod +x setup_ssl.sh

# Run SSL setup with your domain
./setup_ssl.sh your-domain.com admin@your-domain.com
```

This will:
- Install certbot
- Generate SSL certificates
- Configure nginx
- Set up automatic renewal

### Option B: Manual Certificate
```bash
# Copy your certificates to ssl directory
cp /path/to/your/cert.pem ssl/cert.pem
cp /path/to/your/key.pem ssl/key.pem

# Set proper permissions
chmod 644 ssl/cert.pem
chmod 600 ssl/key.pem

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 🔍 Troubleshooting

### Issue: Port Already in Use
**Error**: "Bind for 0.0.0.0:80 failed: port is already allocated"

**Solution 1**: Stop conflicting service
```bash
# Check what's using the port
sudo netstat -tuln | grep :80

# If it's system nginx
sudo systemctl stop nginx
sudo systemctl disable nginx
```

**Solution 2**: Use different ports
Edit `docker-compose.prod.yml`:
```yaml
nginx:
  ports:
    - "8080:80"
    - "8443:443"
```

### Issue: Database Connection Failed
**Error**: Backend logs show "database connection failed"

**Solution**:
```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Verify database is running
docker compose -f docker-compose.prod.yml exec db pg_isready

# Check environment variables
docker compose -f docker-compose.prod.yml exec backend env | grep DB_

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### Issue: Backend Won't Start
**Error**: Backend container exits immediately

**Solution**:
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Common issues:
# 1. Missing environment variables - check .env.prod
# 2. Database not ready - wait for healthcheck
# 3. Port conflict - check if 3000 is available

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d
```

### Issue: Admin User Creation Failed
**Error**: "Admin user already exists" or creation fails

**Solution**:
```bash
# Check if admin exists
docker compose -f docker-compose.prod.yml exec db psql -U nettools_user -d nettools_prod -c "SELECT username, email FROM users WHERE role='admin';"

# If admin exists and you need to reset password
docker compose -f docker-compose.prod.yml exec backend node -e "
const bcrypt = require('bcryptjs');
const password = 'YourNewPassword123!';
bcrypt.hash(password, 12).then(hash => console.log('Password hash:', hash));
"

# Then update in database
docker compose -f docker-compose.prod.yml exec db psql -U nettools_user -d nettools_prod -c "UPDATE users SET password_hash='[hash from above]' WHERE username='admin';"
```

---

## 📊 Monitoring and Maintenance

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f db
docker compose -f docker-compose.prod.yml logs -f nginx

# Application logs (in logs directory)
tail -f logs/error.log
tail -f logs/combined.log
```

### Check Service Status
```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats

# Health checks
curl http://localhost:3000/health
```

### Database Backup
```bash
# Manual backup
./scripts/backup_db.sh

# View backups
ls -lh backups/

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T db psql -U nettools_user -d nettools_prod < backups/backup_YYYYMMDD_HHMMSS.sql
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
```

---

## 🔄 Rollback Procedure

If deployment fails or issues occur:

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Revert to previous version
git log --oneline -5  # Find previous commit
git checkout [previous-commit-hash]

# Or restore from backup
cp docker-compose.prod.yml.backup docker-compose.prod.yml

# Redeploy
./deploy.prod.sh
```

---

## 🔐 Security Hardening (Post-Deployment)

### 1. Change Admin Password
- Login to application
- Navigate to admin panel
- Change password immediately

### 2. Configure Firewall
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Setup Fail2Ban
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Enable Automatic Updates
```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5. Regular Backups
```bash
# Add to crontab for daily backups at 2 AM
crontab -e
# Add line:
0 2 * * * /path/to/ne-toolkit/scripts/backup_db.sh
```

---

## 📞 Support and Documentation

### Additional Resources
- **Full Analysis Report**: See `analysis_report.md` for complete technical details
- **Bug Summary**: See `fixes/BUGS_SUMMARY.md` for all identified issues
- **Main README**: See `README.md` for application features
- **Production Guide**: See `README.prod.md` for detailed production setup

### Common Commands Reference
```bash
# Start services
docker compose -f docker-compose.prod.yml up -d

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart service
docker compose -f docker-compose.prod.yml restart [service]

# View logs
docker compose -f docker-compose.prod.yml logs -f [service]

# Execute command in container
docker compose -f docker-compose.prod.yml exec [service] [command]

# Rebuild service
docker compose -f docker-compose.prod.yml build --no-cache [service]
```

---

## ✅ Post-Deployment Checklist

- [ ] All services running (docker compose ps)
- [ ] Database accepting connections
- [ ] Backend health check passing
- [ ] Frontend accessible
- [ ] Admin user created and credentials saved
- [ ] Admin password changed
- [ ] SSL certificates configured (if domain ready)
- [ ] Firewall rules configured
- [ ] Backups scheduled
- [ ] Monitoring configured
- [ ] Documentation reviewed

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2025-10-06
**Status**: Ready for Production Deployment