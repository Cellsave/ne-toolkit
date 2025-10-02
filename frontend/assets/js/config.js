/**
 * Network Engineers Toolkit - Configuration
 */

const CONFIG = {
    // API Configuration
    API_BASE_URL: window.location.origin + '/api',
    
    // Authentication
    TOKEN_KEY: 'nettools_token',
    USER_KEY: 'nettools_user',
    
    // API Endpoints
    ENDPOINTS: {
        // Auth
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
        UPDATE_PROFILE: '/auth/profile',
        CHANGE_PASSWORD: '/auth/password',
        
        // Accounts
        ACCOUNT_INFO: '/accounts/info',
        UPDATE_ACCOUNT: '/accounts/info',
        LIST_USERS: '/accounts/users',
        CREATE_USER: '/accounts/users',
        UPDATE_USER: (userId) => `/accounts/users/${userId}`,
        DELETE_USER: (userId) => `/accounts/users/${userId}`,
        RESET_PASSWORD: (userId) => `/accounts/users/${userId}/password`,
        
        // Admin (super admin only)
        ADMIN_ACCOUNTS: '/admin/accounts',
        ADMIN_ACCOUNT: (accountId) => `/admin/accounts/${accountId}`,
        ADMIN_STATS: '/admin/stats',
        ADMIN_KEYS: '/admin/keys',
        ADMIN_CREATE_KEY: '/admin/keys',
        
        // Tools
        TOOLS_LIST: '/tools',
        TOOL_EXECUTE: (toolName) => `/tools/${toolName}/execute`
    },
    
    // UI Configuration
    NOTIFICATION_DURATION: 5000, // 5 seconds
    
    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    
    // Theme
    DEFAULT_THEME: 'dark',
    THEME_KEY: 'nettools_theme',
    
    // Tool Categories
    TOOL_CATEGORIES: {
        NETWORK: 'Network Analysis',
        DIAGNOSTIC: 'Diagnostics',
        CONVERSION: 'Configuration',
        SECURITY: 'Security',
        UTILITIES: 'Utilities'
    },
    
    // Available Tools
    TOOLS: [
        {
            id: 'bgp-tools',
            name: 'BGP Lookup Tools',
            description: 'Analyze BGP routes, AS paths, and community information',
            category: 'NETWORK',
            url: 'bgp-tools.html',
            icon: '🌐'
        },
        {
            id: 'subnet-calculator',
            name: 'IP Subnet Calculator',
            description: 'Calculate subnet masks, network ranges, and host information',
            category: 'NETWORK',
            url: 'subnet-calculator.html',
            icon: '🔢'
        },
        {
            id: 'whois-lookup',
            name: 'WHOIS Lookup',
            description: 'Domain registration and IP ownership information',
            category: 'NETWORK',
            url: 'whois-lookup.html',
            icon: '🔍'
        },
        {
            id: 'junos-convertor',
            name: 'Configuration Convertor',
            description: 'Convert between JUNOS configuration formats',
            category: 'CONVERSION',
            url: 'junos-convertor.html',
            icon: '🔄'
        },
        {
            id: 'password-decrypt',
            name: 'Password Decrypt',
            description: 'Decrypt network device passwords',
            category: 'SECURITY',
            url: 'password-decrypt.html',
            icon: '🔐'
        },
        {
            id: 'troubleshooting',
            name: 'Troubleshooting Tools',
            description: 'Network diagnostic commands database',
            category: 'DIAGNOSTIC',
            url: 'troubleshooting.html',
            icon: '🔧'
        },
        {
            id: 'syslog-analysis',
            name: 'Syslog Analysis',
            description: 'Parse and analyze syslog data',
            category: 'DIAGNOSTIC',
            url: 'syslog-analysis.html',
            icon: '📊'
        },
        {
            id: 'engineer-tools',
            name: 'Engineer Tools',
            description: 'Ping and traceroute utilities',
            category: 'DIAGNOSTIC',
            url: 'engineer-tools.html',
            icon: '🛠️'
        },
        {
            id: 'quick-links',
            name: 'Quick Links',
            description: 'Manage useful bookmarks and resources',
            category: 'UTILITIES',
            url: 'quick-links.html',
            icon: '🔗'
        }
    ],
    
    // Validation Rules
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD_MIN_LENGTH: 8,
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 100
    }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.ENDPOINTS);
Object.freeze(CONFIG.TOOL_CATEGORIES);
Object.freeze(CONFIG.TOOLS);
Object.freeze(CONFIG.VALIDATION);
