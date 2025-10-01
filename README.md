# Network Engineers Toolkit v2.6

A comprehensive web-based toolkit for network engineers featuring password decryption, subnet calculation, WHOIS lookup, BGP tools, and more.

## 🆕 What's New in v2.6

- **Password Decryption Tool**: Decrypt Cisco Type 7, Juniper Type 9, Base64, and MD5 hashes
- **Removed Shodan.io**: All Shodan references have been removed from the codebase
- **Enhanced Security**: Improved password handling and encryption
- **Better API Management**: Streamlined API provider configuration

## 🛠️ Features

### Security Tools
- **Password Decrypt**: Decrypt common network device password types
  - Cisco Type 7 (XOR-based encryption)
  - Juniper Type 9 (MD5-based encryption)
  - Base64 encoding/decoding
  - MD5 hash lookup
- **SSL Certificate Checker**: Verify SSL/TLS certificates
- **Port Scanner**: Identify open ports and services
- **IP Reputation Check**: Validate IP addresses and domains

### Diagnostic Tools
- **Ping Test**: Test network connectivity and latency
- **Traceroute**: Trace network paths
- **DNS Lookup**: Query DNS records (A, AAAA, MX, TXT, etc.)

### Analysis Tools
- **Syslog Analyzer**: Parse and analyze syslog files
- **Configuration Diff**: Compare network device configurations
- **JUNOS Converter**: Convert JUNOS configuration formats

### Calculation Tools
- **Subnet Calculator**: Calculate IP subnets and CIDR ranges
- **Bandwidth Calculator**: Calculate bandwidth requirements

### Lookup Tools
- **WHOIS Lookup**: Domain and IP ownership information
- **BGP Tools**: BGP route and ASN information
- **IP Geolocation**: Locate IP addresses geographically

## 📋 Prerequisites

- Node.js 16+ or 18+
- PostgreSQL 14+
- npm or yarn

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/network-engineers-toolkit.git
cd network-engineers-toolkit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a PostgreSQL database and run the schema:

```bash
# Create database
createdb nettools

# Import schema
psql nettools < database/schema.sql
```

### 4. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

**Critical Security Settings** - Generate these keys:

```bash
# Generate JWT Secret (64-byte)
openssl rand -base64 64

# Generate Encryption Key (32-byte)
openssl rand -base64 32

# Generate Session Secret (32-byte)
openssl rand -base64 32
```

Edit `.env` and add these values to:
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SESSION_SECRET`

### 5. Configure Database Connection

In your `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nettools
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
```

### 6. Optional: Configure External APIs

For enhanced functionality, add API keys:

```env
# WhoisXML API - Get from https://whoisxmlapi.com/
WHOISXML_API_KEY=your_key_here

# PeeringDB API - Get from https://peeringdb.com/
PEERINGDB_API_KEY=your_key_here

# IP Geolocation API - Get from https://ipgeolocation.io/
IPGEOLOCATION_API_KEY=your_key_here

# VirusTotal API - Get from https://www.virustotal.com/
VIRUSTOTAL_API_KEY=your_key_here
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🐳 Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
# Build image
docker build -t network-toolkit .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_NAME=nettools \
  --name network-toolkit \
  network-toolkit
```

## 🌐 Hostinger Deployment

### Setting Environment Variables in Hostinger

1. Log into your Hostinger panel
2. Navigate to your hosting/VPS section
3. Find **Environment Variables** or **Application Settings**
4. Add the following variables:

```
NODE_ENV=production
PORT=3000
DB_HOST=your_db_host
DB_NAME=nettools
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_generated_jwt_secret
ENCRYPTION_KEY=your_generated_encryption_key
SESSION_SECRET=your_generated_session_secret
```

### SSH Deployment

```bash
# SSH into your server
ssh user@yourserver.com

# Clone repository
git clone https://github.com/yourusername/network-engineers-toolkit.git
cd network-engineers-toolkit

# Install dependencies
npm install --production

# Set up database
psql -h localhost -U your_user -d nettools -f database/schema.sql

# Start with PM2
pm2 start server.js --name network-toolkit
pm2 save
pm2 startup
```

## 🔒 Security Best Practices

1. **Always use HTTPS in production**
2. **Change default admin password immediately** (admin/admin123)
3. **Use strong, unique secrets** for JWT, encryption, and sessions
4. **Enable rate limiting** in production
5. **Regular security updates**: Keep dependencies up to date
6. **Database backups**: Schedule regular backups
7. **Never commit** `.env` file to version control

## 📚 API Documentation

### Password Decrypt API

```bash
POST /api/password-decrypt/decrypt
Content-Type: application/json

{
  "encryptedPassword": "094F471A1A0A",
  "vendorType": "cisco-type7"
}

Response:
{
  "success": true,
  "vendorType": "cisco-type7",
  "decrypted": "cisco",
  "message": "Decryption successful"
}
```

Supported vendor types:
- `cisco-type7`: Cisco Type 7 passwords
- `juniper-type9`: Juniper Type 9 passwords
- `base64`: Base64 encoded strings
- `generic-md5`: MD5 hashes

### Get Supported Types

```bash
GET /api/password-decrypt/supported-types

Response:
{
  "supportedTypes": [
    {
      "value": "cisco-type7",
      "label": "Cisco Type 7",
      "description": "Simple XOR encryption used by Cisco devices"
    },
    ...
  ]
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Configuration Files

- `database/schema.sql` - Database schema (without Shodan)
- `.env.example` - Environment variables template
- `config/tools.js` - Tool configuration
- `routes/password-decrypt.js` - Password decryption API

## 🗑️ What Was Removed

- **Shodan.io API integration**: All references removed
- **Shodan API key**: Removed from environment configuration
- **Shodan provider**: Removed from database schema

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Copyright

Network Engineer's Interactive Toolbox © 2025 Cellsave UK Ltd

## 📧 Support

For support, email: support@network-engineers-toolbox.com

## 🔗 Quick Links

- [WHOIS XML API](https://whoisxmlapi.com/)
- [PeeringDB](https://peeringdb.com/)
- [IP Geolocation](https://ipgeolocation.io/)
- [VirusTotal](https://www.virustotal.com/)

---

**Note**: This toolkit is designed for legitimate network engineering and security research purposes only. Always obtain proper authorization before performing any network scans or security assessments.