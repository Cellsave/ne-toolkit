-- Network Engineers Toolkit Database Schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tool usage logs
CREATE TABLE tool_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_name VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    client_ip INET,
    user_agent TEXT,
    request_data JSONB,
    response_data JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    api_provider VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Network scan results cache
CREATE TABLE scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target VARCHAR(255) NOT NULL,
    scan_type VARCHAR(50) NOT NULL,
    results JSONB NOT NULL,
    user_id UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WHOIS lookup cache
CREATE TABLE whois_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL,
    whois_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BGP analysis cache
CREATE TABLE bgp_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asn INTEGER,
    query VARCHAR(255),
    bgp_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Application settings
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tool_usage_logs_tool_name ON tool_usage_logs(tool_name);
CREATE INDEX idx_tool_usage_logs_created_at ON tool_usage_logs(created_at);
CREATE INDEX idx_tool_usage_logs_user_id ON tool_usage_logs(user_id);
CREATE INDEX idx_scan_results_target ON scan_results(target);
CREATE INDEX idx_scan_results_expires_at ON scan_results(expires_at);
CREATE INDEX idx_whois_cache_domain ON whois_cache(domain);
CREATE INDEX idx_whois_cache_expires_at ON whois_cache(expires_at);
CREATE INDEX idx_bgp_cache_asn ON bgp_cache(asn);
CREATE INDEX idx_bgp_cache_expires_at ON bgp_cache(expires_at);

-- Default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@nettools.local', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Default settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('app_name', 'Network Engineers Toolkit', 'Application name'),
('app_version', '1.0.0', 'Application version'),
('max_scan_threads', '10', 'Maximum concurrent scan threads'),
('cache_expiry_hours', '24', 'Default cache expiry in hours'),
('rate_limit_per_minute', '60', 'API rate limit per minute per user');

-- Default API key placeholders
INSERT INTO api_keys (service_name, api_key_encrypted, description, created_by) VALUES
('whoisxml', 'ENCRYPTED_KEY_PLACEHOLDER', 'WhoisXML API for domain lookups', (SELECT id FROM users WHERE username = 'admin')),
('peeringdb', 'ENCRYPTED_KEY_PLACEHOLDER', 'PeeringDB API for BGP data', (SELECT id FROM users WHERE username = 'admin'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();