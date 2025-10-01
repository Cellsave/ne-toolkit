// Network Tools API Routes - COMPLETE WITH PASSWORD DECRYPT
const express = require('express');
const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const ping = require('ping');
const whois = require('whois');
const winston = require('winston');

const { query, getCacheEntry, setCacheEntry } = require('../database/connection');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Logger
const toolsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/tools.log' }),
  ],
});

// Utility function to log tool usage
async function logToolUsage(toolName, clientIp, userAgent, requestData, success, executionTime, errorMessage = null, apiProvider = null) {
  try {
    await query(`
      INSERT INTO tool_usage_logs (tool_name, client_ip, user_agent, request_data, success, execution_time_ms, error_message, api_provider)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [toolName, clientIp, userAgent, JSON.stringify(requestData), success, executionTime, errorMessage, apiProvider]);
  } catch (error) {
    toolsLogger.error('Failed to log tool usage:', error);
  }
}

// Get API key for service
async function getApiKey(serviceName) {
  try {
    const result = await query(
      'SELECT api_key_encrypted FROM api_keys WHERE service_name = $1 AND is_active = true',
      [serviceName]
    );
    
    if (result.rows.length === 0) return null;
    return result.rows[0].api_key_encrypted;
  } catch (error) {
    toolsLogger.error(`Failed to get API key for ${serviceName}:`, error);
    return null;
  }
}

router.use(optionalAuth);

// BGP Analysis Tool
router.post('/bgp-analysis', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { query: inputQuery, asn } = req.body;
    
    if (!inputQuery && !asn) {
      await logToolUsage('bgp-analysis', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing query or ASN');
      return res.status(400).json({ error: 'Query or ASN number is required' });
    }

    const cacheKey = asn || inputQuery;
    const cached = await getCacheEntry('bgp_cache', 'query', cacheKey);
    
    if (cached) {
      await logToolUsage('bgp-analysis', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime, null, 'Cache');
      return res.json({
        success: true,
        data: { ...cached.bgp_data, source: 'Cache' }
      });
    }

    const apiKey = await getApiKey('peeringdb');
    let bgpData = {};
    
    if (apiKey && apiKey !== 'ENCRYPTED_KEY_PLACEHOLDER') {
      try {
        const response = await axios.get('https://peeringdb.com/api/net', {
          params: { asn: asn || inputQuery },
          headers: { 'Authorization': `Api-Key ${apiKey}` },
          timeout: 10000
        });
        
        bgpData = {
          source: 'PeeringDB API',
          networks: response.data.data || [],
          query: asn || inputQuery
        };
        
        await setCacheEntry('bgp_cache', { query: cacheKey, bgp_data: bgpData });
        await logToolUsage('bgp-analysis', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime, null, 'PeeringDB');
        
      } catch (apiError) {
        toolsLogger.warn('PeeringDB API error:', apiError.message);
        bgpData = {
          source: 'Simulated Data',
          message: 'PeeringDB API unavailable',
          error: apiError.message
        };
      }
    } else {
      bgpData = {
        source: 'Educational Information',
        message: 'No PeeringDB API configured',
        query: inputQuery,
        educational: {
          bgpBasics: {
            description: 'Border Gateway Protocol (BGP) is the routing protocol for the Internet.',
            asnRanges: {
              '16bit': '1-65535',
              '32bit': '65536-4294967295',
              'private': '64512-65534, 4200000000-4294967294'
            }
          }
        }
      };
    }
    
    await logToolUsage('bgp-analysis', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime);
    res.json({ success: true, data: bgpData });

  } catch (error) {
    toolsLogger.error('BGP analysis error:', error);
    await logToolUsage('bgp-analysis', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'BGP analysis failed', message: error.message });
  }
});

// WHOIS Lookup Tool
router.post('/whois', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { domain } = req.body;
    
    if (!domain) {
      await logToolUsage('whois', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing domain');
      return res.status(400).json({ error: 'Domain is required' });
    }

    const cached = await getCacheEntry('whois_cache', 'domain', domain);
    
    if (cached) {
      await logToolUsage('whois', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime, null, 'Cache');
      return res.json({ success: true, data: { ...cached.whois_data, source: 'Cache' } });
    }

    const apiKey = await getApiKey('whoisxml');
    let whoisData = {};

    if (apiKey && apiKey !== 'ENCRYPTED_KEY_PLACEHOLDER') {
      try {
        const response = await axios.get('https://whoisxml.com/whoisserver/WhoisService', {
          params: { apiKey: apiKey, domainName: domain, outputFormat: 'json' },
          timeout: 10000
        });
        
        whoisData = { source: 'WhoisXML API', domain: domain, data: response.data };
        await setCacheEntry('whois_cache', { domain: domain, whois_data: whoisData });
        await logToolUsage('whois', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime, null, 'WhoisXML');
        
      } catch (apiError) {
        const whoisLookup = promisify(whois.lookup);
        const result = await whoisLookup(domain);
        whoisData = { source: 'System WHOIS', domain: domain, raw: result };
        await logToolUsage('whois', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime, null, 'System');
      }
    } else {
      const whoisLookup = promisify(whois.lookup);
      const result = await whoisLookup(domain);
      whoisData = { source: 'System WHOIS', domain: domain, raw: result };
      await logToolUsage('whois', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime, null, 'System');
    }
    
    res.json({ success: true, data: whoisData });

  } catch (error) {
    toolsLogger.error('WHOIS lookup error:', error);
    await logToolUsage('whois', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'WHOIS lookup failed', message: error.message });
  }
});

// Network Scanner Tool
router.post('/network-scan', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { target, ports, scanType } = req.body;
    
    if (!target) {
      await logToolUsage('network-scan', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing target');
      return res.status(400).json({ error: 'Target is required' });
    }

    const portsToScan = ports || [22, 23, 25, 53, 80, 110, 143, 443, 993, 995];
    const scanResults = {
      target: target,
      timestamp: new Date().toISOString(),
      scanType: scanType || 'tcp',
      results: []
    };

    try {
      const pingResult = await ping.promise.probe(target, { timeout: 5, extra: ['-c', '3'] });
      scanResults.ping = { alive: pingResult.alive, time: pingResult.time, packetLoss: pingResult.packetLoss };
    } catch (pingError) {
      scanResults.ping = { alive: false, error: 'Ping failed' };
    }

    const portPromises = portsToScan.map(port => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        
        socket.on('connect', () => {
          socket.destroy();
          resolve({ port: port, status: 'open', service: getServiceName(port) });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ port: port, status: 'filtered', service: getServiceName(port) });
        });
        
        socket.on('error', () => {
          resolve({ port: port, status: 'closed', service: getServiceName(port) });
        });
        
        socket.connect(port, target);
      });
    });

    const portResults = await Promise.all(portPromises);
    scanResults.results = portResults;

    await setCacheEntry('scan_results', {
      target: target,
      scan_type: scanType || 'tcp',
      results: scanResults,
      user_id: req.user ? req.user.id : null
    }, 1);

    await logToolUsage('network-scan', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime);
    res.json({ success: true, data: scanResults });

  } catch (error) {
    toolsLogger.error('Network scan error:', error);
    await logToolUsage('network-scan', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'Network scan failed', message: error.message });
  }
});

// Subnet Calculator Tool
router.post('/subnet-calculator', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { network, cidr } = req.body;
    
    if (!network || !cidr) {
      await logToolUsage('subnet-calculator', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing network or CIDR');
      return res.status(400).json({ error: 'Network and CIDR required' });
    }

    const subnetInfo = calculateSubnet(network, parseInt(cidr));
    await logToolUsage('subnet-calculator', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime);
    res.json({ success: true, data: subnetInfo });

  } catch (error) {
    toolsLogger.error('Subnet calculation error:', error);
    await logToolUsage('subnet-calculator', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'Subnet calculation failed', message: error.message });
  }
});

// DNS Lookup Tool
router.post('/dns-lookup', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { hostname, recordType } = req.body;
    
    if (!hostname) {
      await logToolUsage('dns-lookup', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing hostname');
      return res.status(400).json({ error: 'Hostname is required' });
    }

    const dnsResults = {};
    const type = recordType || 'A';

    try {
      switch (type.toUpperCase()) {
        case 'A':
          dnsResults.A = await dns.resolve4(hostname);
          break;
        case 'AAAA':
          dnsResults.AAAA = await dns.resolve6(hostname);
          break;
        case 'MX':
          dnsResults.MX = await dns.resolveMx(hostname);
          break;
        case 'TXT':
          dnsResults.TXT = await dns.resolveTxt(hostname);
          break;
        case 'CNAME':
          dnsResults.CNAME = await dns.resolveCname(hostname);
          break;
        case 'NS':
          dnsResults.NS = await dns.resolveNs(hostname);
          break;
        default:
          dnsResults.A = await dns.resolve4(hostname);
      }
    } catch (dnsError) {
      dnsResults.error = dnsError.message;
    }

    await logToolUsage('dns-lookup', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime);
    res.json({
      success: true,
      data: {
        hostname: hostname,
        recordType: type,
        results: dnsResults,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    toolsLogger.error('DNS lookup error:', error);
    await logToolUsage('dns-lookup', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'DNS lookup failed', message: error.message });
  }
});

// Password Analysis Tool
router.post('/password-analysis', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { password, hash, hashType } = req.body;
    
    if (!password && !hash) {
      await logToolUsage('password-analysis', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing password or hash');
      return res.status(400).json({ error: 'Password or hash is required' });
    }

    const analysis = {};

    if (password) {
      analysis.strength = analyzePasswordStrength(password);
      analysis.hashes = {
        md5: crypto.createHash('md5').update(password).digest('hex'),
        sha1: crypto.createHash('sha1').update(password).digest('hex'),
        sha256: crypto.createHash('sha256').update(password).digest('hex'),
        bcrypt: await bcrypt.hash(password, 10)
      };
    }

    if (hash) {
      analysis.hashAnalysis = analyzeHashType(hash, hashType);
    }

    await logToolUsage('password-analysis', clientIp, req.get('User-Agent'), req.body, true, Date.now() - startTime);
    res.json({ success: true, data: analysis });

  } catch (error) {
    toolsLogger.error('Password analysis error:', error);
    await logToolUsage('password-analysis', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'Password analysis failed', message: error.message });
  }
});

// Password Decrypt Tool
router.post('/password-decrypt', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { encryptedPassword, vendorType } = req.body;
    
    if (!encryptedPassword) {
      await logToolUsage('password-decrypt', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing encrypted password');
      return res.status(400).json({ error: 'Encrypted password is required' });
    }

    if (!vendorType) {
      await logToolUsage('password-decrypt', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, 'Missing vendor type');
      return res.status(400).json({ error: 'Vendor/encryption type is required' });
    }

    let result;
    
    switch(vendorType) {
      case 'cisco-type7':
        result = decryptCiscoType7(encryptedPassword);
        break;
      case 'juniper-type9':
        result = decryptJuniperType9(encryptedPassword);
        break;
      case 'base64':
        result = decodeBase64(encryptedPassword);
        break;
      case 'generic-md5':
        result = checkMD5Hash(encryptedPassword);
        break;
      default:
        result = { success: false, message: 'Unsupported encryption type' };
    }

    await logToolUsage('password-decrypt', clientIp, req.get('User-Agent'), req.body, result.success, Date.now() - startTime, result.success ? null : result.message);
    
    res.json({
      success: result.success,
      data: {
        encryptedPassword: encryptedPassword,
        decryptedPassword: result.decrypted || null,
        vendorType: vendorType,
        message: result.message || 'Decryption successful'
      }
    });

  } catch (error) {
    toolsLogger.error('Password decrypt error:', error);
    await logToolUsage('password-decrypt', clientIp, req.get('User-Agent'), req.body, false, Date.now() - startTime, error.message);
    res.status(500).json({ error: 'Password decryption failed', message: error.message });
  }
});

// Utility Functions

function getServiceName(port) {
  const services = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
    993: 'IMAPS', 995: 'POP3S', 3389: 'RDP', 5432: 'PostgreSQL', 3306: 'MySQL'
  };
  return services[port] || 'Unknown';
}

function calculateSubnet(ip, cidr) {
  const ipParts = ip.split('.').map(Number);
  const subnetMask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
  
  const networkAddress = ipParts.reduce((acc, part, i) => {
    return acc | (part << (8 * (3 - i)));
  }, 0) & subnetMask;
  
  const broadcastAddress = networkAddress | ((1 << (32 - cidr)) - 1);
  
  const networkIp = [
    (networkAddress >>> 24) & 0xFF,
    (networkAddress >>> 16) & 0xFF,
    (networkAddress >>> 8) & 0xFF,
    networkAddress & 0xFF
  ].join('.');
  
  const broadcastIp = [
    (broadcastAddress >>> 24) & 0xFF,
    (broadcastAddress >>> 16) & 0xFF,
    (broadcastAddress >>> 8) & 0xFF,
    broadcastAddress & 0xFF
  ].join('.');
  
  const subnetMaskIp = [
    (subnetMask >>> 24) & 0xFF,
    (subnetMask >>> 16) & 0xFF,
    (subnetMask >>> 8) & 0xFF,
    subnetMask & 0xFF
  ].join('.');
  
  return {
    network: networkIp,
    broadcast: broadcastIp,
    subnetMask: subnetMaskIp,
    cidr: cidr,
    hosts: Math.pow(2, 32 - cidr) - 2,
    class: getNetworkClass(ipParts[0])
  };
}

function getNetworkClass(firstOctet) {
  if (firstOctet >= 1 && firstOctet <= 126) return 'A';
  if (firstOctet >= 128 && firstOctet <= 191) return 'B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'D (Multicast)';
  if (firstOctet >= 240 && firstOctet <= 255) return 'E (Reserved)';
  return 'Unknown';
}

function analyzePasswordStrength(password) {
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  let score = 0;
  let feedback = [];
  
  if (length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (length >= 12) score += 1;
  if (hasLower) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (hasUpper) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (hasNumbers) score += 1;
  else feedback.push('Add numbers');
  
  if (hasSpecial) score += 1;
  else feedback.push('Add special characters');
  
  const strength = score <= 2 ? 'Weak' : score <= 4 ? 'Medium' : 'Strong';
  
  return {
    score: score,
    maxScore: 6,
    strength: strength,
    feedback: feedback,
    length: length,
    hasLowercase: hasLower,
    hasUppercase: hasUpper,
    hasNumbers: hasNumbers,
    hasSpecialChars: hasSpecial
  };
}

function analyzeHashType(hash, providedType) {
  const hashLength = hash.length;
  const possibleTypes = [];
  
  switch (hashLength) {
    case 32:
      possibleTypes.push('MD5', 'NTLM');
      break;
    case 40:
      possibleTypes.push('SHA-1');
      break;
    case 56:
      possibleTypes.push('SHA-224');
      break;
    case 64:
      possibleTypes.push('SHA-256');
      break;
    case 96:
      possibleTypes.push('SHA-384');
      break;
    case 128:
      possibleTypes.push('SHA-512');
      break;
    case 60:
      if (hash.startsWith('$2')) {
        possibleTypes.push('bcrypt');
      }
      break;
  }
  
  return {
    length: hashLength,
    possibleTypes: possibleTypes,
    providedType: providedType,
    isHex: /^[a-fA-F0-9]+$/.test(hash)
  };
}

// Cisco Type 7 decryption
function decryptCiscoType7(encrypted) {
  const key = "dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87";
  let decrypted = "";
  
  if (!/^[0-9A-Fa-f]+$/.test(encrypted)) {
    return { success: false, message: "Invalid Cisco Type 7 format" };
  }
  
  try {
    const salt = parseInt(encrypted.substring(0, 2), 10);
    
    for (let i = 2; i < encrypted.length; i += 2) {
      const hexPair = encrypted.substring(i, i + 2);
      const decimal = parseInt(hexPair, 16);
      const keyIndex = (i / 2 - 1 + salt) % key.length;
      const keyChar = key.charCodeAt(keyIndex);
      const decryptedChar = String.fromCharCode(decimal ^ keyChar);
      decrypted += decryptedChar;
    }
    
    return { success: true, decrypted };
  } catch (error) {
    return { success: false, message: "Decryption failed: " + error.message };
  }
}

// Juniper Type 9 decryption
function decryptJuniperType9(encryptedPassword) {
  if (!encryptedPassword.startsWith('$9$')) {
    return { success: false, message: "Not a valid Juniper Type 9 password" };
  }
  
  try {
    const JUNIPER_ENCODING = [
      [1, 4, 32],
      [1, 16, 32],
      [1, 8, 32],
      [1, 64],
      [1, 32],
      [1, 4, 16, 128],
      [1, 32, 64],
    ];
    
    const JUNIPER_KEYS = ["QzF3n6/9CAtpu0O", "B1IREhcSyrleKvMW8LXx", "7N-dVbwsY2g4oaJZGUDj", "iHkq.mPf5T"];
    const JUNIPER_KEYS_STRING = JUNIPER_KEYS.join("");
    const JUNIPER_KEYS_LENGTH = JUNIPER_KEYS_STRING.length;
    
    const JUNIPER_CHARACTER_KEYS = {};
    for (let idx = 0; idx < JUNIPER_KEYS.length; idx++) {
      const junKey = JUNIPER_KEYS[idx];
      for (let j = 0; j < junKey.length; j++) {
        const character = junKey.charAt(j);
        JUNIPER_CHARACTER_KEYS[character] = 3 - idx;
      }
    }
    
    const passwordCharacters = encryptedPassword.split("$9$")[1];
    const firstCharacter = passwordCharacters.charAt(0);
    const skipChars = JUNIPER_CHARACTER_KEYS[firstCharacter] + 1;
    
    let strippedPasswordCharacters = passwordCharacters.substring(skipChars);
    let previousChar = firstCharacter;
    let decryptedPassword = "";
    
    while (strippedPasswordCharacters.length > 0) {
      const decode = JUNIPER_ENCODING[decryptedPassword.length % JUNIPER_ENCODING.length];
      const nibble = strippedPasswordCharacters.substring(0, decode.length);
      strippedPasswordCharacters = strippedPasswordCharacters.substring(decode.length);
      
      let value = 0;
      for (let index = 0; index < nibble.length; index++) {
        const char = nibble.charAt(index);
        const prevCharIndex = JUNIPER_KEYS_STRING.indexOf(previousChar);
        const charIndex = JUNIPER_KEYS_STRING.indexOf(char);
        
        let gap = charIndex - prevCharIndex;
        gap = ((gap % JUNIPER_KEYS_LENGTH) + JUNIPER_KEYS_LENGTH) % JUNIPER_KEYS_LENGTH;
        gap = gap - 1;
        
        value += gap * decode[index];
        previousChar = char;
      }
      decryptedPassword += String.fromCharCode(value);
    }
    
    return { success: true, decrypted: decryptedPassword };
  } catch (error) {
    return { success: false, message: "Decryption failed: " + error.message };
  }
}

// Base64 decoding
function decodeBase64(encoded) {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    return { success: true, decrypted: decoded };
  } catch (error) {
    return { success: false, message: "Invalid Base64 format" };
  }
}

// MD5 hash comparison
function checkMD5Hash(hash) {
  const knownHashes = {
    "5f4dcc3b5aa765d61d8327deb882cf99": "password",
    "e10adc3949ba59abbe56e057f20f883e": "123456",
    "25d55ad283aa400af464c76d713c07ad": "12345678",
    "5eb63bbbe01eeed093cb22bb8f5acdc3": "hello",
    "098f6bcd4621d373cade4e832627b4f6": "test",
    "827ccb0eea8a706c4c34a16891f84e7b": "12345"
  };
  
  if (knownHashes[hash.toLowerCase()]) {
    return { success: true, decrypted: knownHashes[hash.toLowerCase()] };
  } else {
    return { success: false, message: "Hash not found in known passwords database" };
  }
}

module.exports = router;