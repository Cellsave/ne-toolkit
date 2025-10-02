# Network Engineers Toolkit

Professional network analysis and diagnostic tools for network engineers with multi-tenant account management.

## Features

- **Multi-Tenant Architecture**: Separate accounts with isolated data
- **User Management**: Multiple users per account with role-based access
- **Authentication**: Secure JWT-based authentication
- **Network Tools**: BGP analysis, subnet calculator, WHOIS lookup, and more
- **Admin Panel**: Site-wide administration for super admins
- **Extensible**: Easy to add new tools and features

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 15
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Reverse Proxy**: Nginx
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/network-engineers-toolkit.git
cd network-engineers-toolkit
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` and set secure values:

```bash
# Database
DB_PASSWORD=your_secure_db_password_here

# JWT
JWT_SECRET=your_very_long_random_secret_key_here
JWT_EXPIRY=24h

# Environment
NODE_ENV=production
PORT=3000

# Application
APP_NAME=Network Engineers Toolkit
```

### 3. Start the Application

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 3000
- Nginx reverse proxy on port 80

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost
```

### 5. Create Your Account

Click "Register" and create your account. The first user will be the account admin.

## Development

### Local Development Setup

1. **Install Dependencies**

```bash
cd backend
npm install
```

2. **Start PostgreSQL**

```bash
docker-compose up -d postgres
```

3. **Run Database Migrations**

```bash
docker exec -i nettools_db psql -U nettools_user -d nettools < database/init.sql
```

4. **Start Backend**

```bash
cd backend
npm run dev
```

5. **Serve Frontend**

Use any static file server:

```bash
cd frontend
python -m http.server 8000
```

### Project Structure

```
network-engineers-toolkit/
├── docker-compose.yml          # Docker orchestration
├── .env.example               # Environment template
├── manifest.json              # PWA manifest
├── README.md                  # This file
│
├── database/
│   └── init.sql              # Database schema
│
├── nginx/
│   └── nginx.conf            # Nginx configuration
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js         # Main server file
│       ├── database/
│       │   └── connection.js # Database connection
│       ├── middleware/
│       │   └── auth.js       # Authentication middleware
│       └── routes/
│           ├── auth.js       # Auth routes
│           ├── accounts.js   # Account management
│           ├── admin.js      # Admin routes
│           └── tools.js      # Tools routes
│
└── frontend/
    ├── Dockerfile
    ├── index.html            # Main application
    ├── assets/
    │   ├── css/
    │   │   ├── main.css
    │   │   ├── components.css
    │   │   └── responsive.css
    │   └── js/
    │       ├── config.js     # Configuration
    │       ├── api.js        # API service
    │       ├── auth.js       # Authentication
    │       ├── ui.js         # UI components
    │       ├── tools.js      # Tools manager
    │       └── main.js       # Main app
    └── [tool-pages].html     # Individual tool pages
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register new account and user
```json
{
  "accountName": "My Company",
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST /api/auth/login
Login user
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### GET /api/auth/me
Get current user profile (requires authentication)

#### PUT /api/auth/profile
Update user profile (requires authentication)

#### PUT /api/auth/password
Change password (requires authentication)

### Account Management Endpoints

#### GET /api/accounts/info
Get account information (requires authentication)

#### PUT /api/accounts/info
Update account (requires admin role)

#### GET /api/accounts/users
List account users (requires admin role)

#### POST /api/accounts/users
Create new user (requires admin role)

#### PUT /api/accounts/users/:userId
Update user (requires admin role)

#### DELETE /api/accounts/users/:userId
Delete user (requires admin role)

## Database Schema

### Tables

**accounts**
- id (UUID, PK)
- name (VARCHAR)
- status (VARCHAR)
- max_users (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**users**
- id (UUID, PK)
- account_id (UUID, FK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- first_name (VARCHAR)
- last_name (VARCHAR)
- role (VARCHAR)
- status (VARCHAR)
- last_login (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**admin_users**
- id (UUID, PK)
- username (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- email (VARCHAR)
- created_at (TIMESTAMP)
- last_login (TIMESTAMP)

**api_keys**
- id (UUID, PK)
- name (VARCHAR)
- key_hash (VARCHAR)
- permissions (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
- last_used (TIMESTAMP)
- expires_at (TIMESTAMP)

## Security Best Practices

1. **Change Default Passwords**: Always use strong, unique passwords
2. **JWT Secret**: Use a long, random string for JWT_SECRET
3. **HTTPS**: Use HTTPS in production with valid SSL certificates
4. **Database**: Restrict database access to backend only
5. **Rate Limiting**: Nginx includes rate limiting for API endpoints
6. **Input Validation**: All inputs are validated on backend
7. **Password Hashing**: Passwords are hashed using bcrypt

## Backup and Restore

### Backup Database

```bash
docker exec nettools_db pg_dump -U nettools_user nettools > backup.sql
```

### Restore Database

```bash
docker exec -i nettools_db psql -U nettools_user -d nettools < backup.sql
```

## Troubleshooting

### Container Issues

View logs:
```bash
docker-compose logs -f [service_name]
```

Restart services:
```bash
docker-compose restart
```

Rebuild containers:
```bash
docker-compose up -d --build
```

### Database Connection

Check database status:
```bash
docker exec nettools_db pg_isready -U nettools_user
```

Connect to database:
```bash
docker exec -it nettools_db psql -U nettools_user -d nettools
```

### Port Conflicts

If port 80 is already in use, modify `docker-compose.yml`:
```yaml
nginx:
  ports:
    - "8080:80"  # Change 80 to 8080 or another port
```

## Production Deployment

### Using SSL/TLS

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Update nginx configuration to handle HTTPS
3. Update docker-compose to mount certificates

### Environment Variables

Set appropriate environment variables for production:
- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Secure `DB_PASSWORD`

### Monitoring

Consider adding:
- Application monitoring (e.g., PM2, New Relic)
- Log aggregation (e.g., ELK stack)
- Database monitoring
- Uptime monitoring

## Adding New Tools

1. Create tool HTML file in `frontend/`
2. Add tool configuration to `frontend/assets/js/config.js`
3. Implement tool-specific logic
4. Add authentication check using `ToolIntegration.requireAuth()`

Example tool integration:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    if (ToolIntegration.requireAuth()) {
        ToolIntegration.addAuthHeader();
        // Your tool logic here
    }
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Copyright © 2025 Network Engineers Toolkit Team

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@example.com

## Version History

### v1.0.0 (2025-01-01)
- Initial release
- Multi-tenant architecture
- User management
- Core networking tools
- JWT authentication
- Docker containerization
