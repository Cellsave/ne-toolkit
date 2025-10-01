// Network Engineers Toolkit - Authentication Manager

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loginModal = null;
        this.init();
    }

    /**
     * Initialize authentication manager
     */
    init() {
        this.setupEventListeners();
        this.loadUserFromStorage();
        this.checkAuthStatus();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login button
        document.getElementById('login-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginModal();
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Login form submission
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });

        // Login modal close button
        document.getElementById('login-modal-close')?.addEventListener('click', () => {
            this.hideLoginModal();
        });

        // Click outside modal to close
        document.getElementById('login-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'login-modal') {
                this.hideLoginModal();
            }
        });
    }

    /**
     * Load user data from local storage
     */
    loadUserFromStorage() {
        try {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            const userDataStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);

            if (token && userDataStr) {
                this.currentUser = JSON.parse(userDataStr);
                this.isAuthenticated = true;
                this.updateUI();
            }
        } catch (error) {
            console.error('Failed to load user from storage:', error);
            this.clearAuth();
        }
    }

    /**
     * Check authentication status with server
     */
    async checkAuthStatus() {
        if (!this.isAuthenticated) return;

        try {
            const response = await api.validateToken();
            if (!response.valid) {
                this.clearAuth();
                ui.showNotification('Session expired. Please login again.', 'warning');
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            // Don't clear auth on network errors, only on explicit validation failures
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        const submitButton = e.target.querySelector('button[type="submit"]');

        // Clear previous errors
        errorElement.style.display = 'none';
        errorElement.textContent = '';

        // Disable submit button
        submitButton.disabled = true;
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        try {
            const response = await api.login(username, password);

            if (response.success && response.token) {
                // Store token and user data
                localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, response.token);
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

                // Update internal state
                this.currentUser = response.user;
                this.isAuthenticated = true;

                // Update UI
                this.updateUI();
                this.hideLoginModal();

                // Show success message
                ui.showNotification('Login successful!', 'success');

                // Reset form
                document.getElementById('login-form').reset();

            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            console.error('Login failed:', error);
            errorElement.textContent = error.message || 'Login failed. Please try again.';
            errorElement.style.display = 'block';

        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout request failed:', error);
        }

        this.clearAuth();
        ui.showNotification('Logged out successfully', 'info');
    }

    /**
     * Clear authentication state
     */
    clearAuth() {
        // Clear storage
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);

        // Clear internal state
        this.currentUser = null;
        this.isAuthenticated = false;

        // Update UI
        this.updateUI();
    }

    /**
     * Update UI based on authentication state
     */
    updateUI() {
        const usernameElement = document.getElementById('username');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const adminPanelLink = document.getElementById('admin-panel-link');

        if (this.isAuthenticated && this.currentUser) {
            // Update username display
            if (usernameElement) {
                usernameElement.textContent = this.currentUser.username;
            }

            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';

            // Show admin panel link for admin users
            if (adminPanelLink && this.currentUser.role === 'admin') {
                adminPanelLink.style.display = 'flex';
            }

        } else {
            // Update username display
            if (usernameElement) {
                usernameElement.textContent = 'Guest';
            }

            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminPanelLink) adminPanelLink.style.display = 'none';
        }
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        this.loginModal = document.getElementById('login-modal');
        if (this.loginModal) {
            this.loginModal.style.display = 'flex';
            setTimeout(() => {
                this.loginModal.classList.add('active');
            }, 10);

            // Focus on username field
            document.getElementById('login-username')?.focus();
        }
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.remove('active');
            setTimeout(() => {
                this.loginModal.style.display = 'none';
            }, 250);

            // Clear form and errors
            document.getElementById('login-form')?.reset();
            const errorElement = document.getElementById('login-error');
            if (errorElement) {
                errorElement.style.display = 'none';
                errorElement.textContent = '';
            }
        }
    }

    /**
     * Check if user is authenticated
     */
    isLoggedIn() {
        return this.isAuthenticated;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.isAuthenticated && this.currentUser && this.currentUser.role === 'admin';
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get auth token
     */
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    }
}

// Create and export auth manager instance
const auth = new AuthManager();