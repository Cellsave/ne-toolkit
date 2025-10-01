// Network Engineers Toolkit - Main Application

class App {
    constructor() {
        this.initialized = false;
        this.connectionCheckInterval = null;
    }

    /**
     * Initialize application
     */
    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing Network Engineers Toolkit...');

            // Show loading screen
            ui.showLoading();

            // Initialize components
            this.setupGlobalErrorHandlers();
            this.checkConnection();
            this.startConnectionMonitoring();

            // Check authentication status
            if (auth.isLoggedIn()) {
                await auth.checkAuthStatus();
            }

            // Hide loading screen
            setTimeout(() => {
                ui.hideLoading();
                this.initialized = true;
                console.log('Application initialized successfully');
            }, 500);

        } catch (error) {
            console.error('Application initialization failed:', error);
            ui.showNotification('Failed to initialize application', 'error');
            ui.hideLoading();
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            
            // Don't show notification for resource loading errors
            if (event.error && event.error.message) {
                ui.showNotification('An unexpected error occurred', 'error');
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            if (event.reason && event.reason.message) {
                ui.showNotification('An error occurred: ' + event.reason.message, 'error');
            }
        });

        // Handle offline/online events
        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
            ui.showNotification('You are offline', 'warning');
        });

        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
            ui.showNotification('Connection restored', 'success');
        });
    }

    /**
     * Check connection to API
     */
    async checkConnection() {
        try {
            const isHealthy = await api.healthCheck();
            this.updateConnectionStatus(isHealthy);
            return isHealthy;
        } catch (error) {
            console.error('Connection check failed:', error);
            this.updateConnectionStatus(false);
            return false;
        }
    }

    /**
     * Start connection monitoring
     */
    startConnectionMonitoring() {
        // Check connection every 30 seconds
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, CONFIG.CONNECTION_CHECK_INTERVAL);
    }

    /**
     * Stop connection monitoring
     */
    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatus(isConnected) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        if (isConnected) {
            statusElement.classList.remove('disconnected');
            statusElement.querySelector('span').textContent = 'Connected';
        } else {
            statusElement.classList.add('disconnected');
            statusElement.querySelector('span').textContent = 'Disconnected';
        }
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('Application hidden');
            this.stopConnectionMonitoring();
        } else {
            console.log('Application visible');
            this.checkConnection();
            this.startConnectionMonitoring();
        }
    }

    /**
     * Get application version
     */
    getVersion() {
        return CONFIG.APP_VERSION;
    }

    /**
     * Get application info
     */
    getInfo() {
        return {
            name: CONFIG.APP_NAME,
            version: CONFIG.APP_VERSION,
            initialized: this.initialized,
            authenticated: auth.isLoggedIn(),
            currentTool: ui.currentTool
        };
    }
}

// Create application instance
const app = new App();

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    app.init();
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    app.handleVisibilityChange();
});

// Expose app to global scope for debugging
window.NetToolsApp = {
    app,
    api,
    auth,
    ui,
    terminal,
    config: CONFIG,
    version: CONFIG.APP_VERSION
};

// Log initialization
console.log(`%c${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}`, 'color: #0f62fe; font-size: 16px; font-weight: bold;');
console.log('%cApplication loaded. Access via window.NetToolsApp', 'color: #98c379;');