/**
 * Network Engineers Toolkit - Authentication Module
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        return !!token;
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        const userStr = localStorage.getItem(CONFIG.USER_KEY);
        if (userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
                return this.currentUser;
            } catch (e) {
                console.error('Failed to parse user data:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Update current user in localStorage
     */
    updateCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }

    /**
     * Check if current user has specific role
     */
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Handle login form submission
     */
    async handleLogin(email, password) {
        try {
            const data = await api.login(email, password);
            return {
                success: true,
                message: 'Login successful',
                user: data.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    }

    /**
     * Handle registration form submission
     */
    async handleRegister(accountName, email, password, firstName, lastName) {
        try {
            const data = await api.register(accountName, email, password, firstName, lastName);
            return {
                success: true,
                message: 'Registration successful',
                user: data.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Registration failed',
                errors: error.errors || []
            };
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local data
            localStorage.removeItem(CONFIG.TOKEN_KEY);
            localStorage.removeItem(CONFIG.USER_KEY);
            this.currentUser = null;
            window.location.href = '/';
        }
    }

    /**
     * Initialize authentication on page load
     */
    async initialize() {
        if (!this.isAuthenticated()) {
            this.showAuthScreen();
            return false;
        }

        try {
            // Verify token by fetching current user
            const userData = await api.getCurrentUser();
            this.updateCurrentUser(userData);
            this.showApp();
            return true;
        } catch (error) {
            console.error('Authentication initialization failed:', error);
            this.showAuthScreen();
            return false;
        }
    }

    /**
     * Show authentication screen
     */
    showAuthScreen() {
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    /**
     * Show main application
     */
    showApp() {
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }

    /**
     * Setup authentication event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form-element');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                const result = await this.handleLogin(email, password);
                if (result.success) {
                    showNotification(result.message, 'success');
                    // Reload page to initialize app
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showNotification(result.message, 'error');
                }
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form-element');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const accountName = document.getElementById('register-account-name').value;
                const firstName = document.getElementById('register-first-name').value;
                const lastName = document.getElementById('register-last-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;

                const result = await this.handleRegister(accountName, email, password, firstName, lastName);
                if (result.success) {
                    showNotification(result.message, 'success');
                    // Reload page to initialize app
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    if (result.errors && result.errors.length > 0) {
                        result.errors.forEach(err => {
                            showNotification(err.msg || err.message, 'error');
                        });
                    } else {
                        showNotification(result.message, 'error');
                    }
                }
            });
        }

        // Toggle between login and register forms
        const showRegisterLink = document.getElementById('show-register');
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';
            });
        }

        const showLoginLink = document.getElementById('show-login');
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    this.handleLogout();
                }
            });
        }
    }
}

// Create global auth manager instance
const authManager = new AuthManager();
