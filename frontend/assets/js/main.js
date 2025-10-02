/**
 * Network Engineers Toolkit - Main Application
 */

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

/**
 * Initialize application
 */
async function initApp() {
    try {
        // Initialize authentication
        const isAuthenticated = await authManager.initialize();
        
        if (isAuthenticated) {
            // Setup authentication event listeners
            authManager.setupEventListeners();
            
            // Initialize UI components
            initializeUI();
            
            // Load initial data
            await loadInitialData();
        } else {
            // Setup auth screen event listeners
            authManager.setupEventListeners();
        }
    } catch (error) {
        console.error('Application initialization failed:', error);
        showNotification('Failed to initialize application', 'error');
    }
}

/**
 * Load initial application data
 */
async function loadInitialData() {
    try {
        // Load account info for dashboard
        const accountData = await api.getAccountInfo();
        
        // Update dashboard stats
        const userCountElement = document.getElementById('user-count');
        if (userCountElement) {
            userCountElement.textContent = accountData.currentUsers;
        }
        
        const accountStatusElement = document.getElementById('account-status');
        if (accountStatusElement) {
            accountStatusElement.textContent = accountData.status;
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

/**
 * Setup theme toggle
 */
function setupThemeToggle() {
    const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || CONFIG.DEFAULT_THEME;
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    // Add theme toggle button if needed
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const newTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            localStorage.setItem(CONFIG.THEME_KEY, newTheme);
        });
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for quick search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            // Focus search if it exists
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
}

/**
 * Setup service worker for PWA functionality
 */
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

/**
 * Check for application updates
 */
function checkForUpdates() {
    // This can be implemented to check for new versions
    console.log('Checking for updates...');
}

/**
 * Setup periodic data refresh
 */
function setupPeriodicRefresh() {
    // Refresh data every 5 minutes
    setInterval(() => {
        if (authManager.isAuthenticated()) {
            loadInitialData();
        }
    }, 5 * 60 * 1000);
}

/**
 * Handle online/offline status
 */
function setupOnlineStatusHandling() {
    window.addEventListener('online', () => {
        showNotification('Connection restored', 'success');
        loadInitialData();
    });
    
    window.addEventListener('offline', () => {
        showNotification('Connection lost - working offline', 'warning');
    });
}

/**
 * Setup analytics (placeholder for future implementation)
 */
function setupAnalytics() {
    // This can be implemented to track usage analytics
    console.log('Analytics initialized');
}

/**
 * Main entry point
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Network Engineers Toolkit - Initializing...');
    
    // Setup theme
    setupThemeToggle();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Setup service worker
    setupServiceWorker();
    
    // Setup online/offline handling
    setupOnlineStatusHandling();
    
    // Setup periodic refresh
    setupPeriodicRefresh();
    
    // Setup analytics
    setupAnalytics();
    
    // Initialize application
    await initApp();
    
    console.log('Network Engineers Toolkit - Ready');
});

// Export for use in other modules
window.app = {
    init: initApp,
    loadInitialData,
    showNotification,
    toggleModal
};
