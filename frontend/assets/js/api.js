/**
 * Network Engineers Toolkit - API Service
 */

class APIService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
    }

    /**
     * Get authentication token
     */
    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
    }

    /**
     * Remove authentication token
     */
    removeToken() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header if token exists
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: data.error || data.message || 'Request failed',
                    errors: data.errors || []
                };
            }

            return data;
        } catch (error) {
            if (error.status === 401) {
                // Unauthorized - clear token and redirect to login
                this.removeToken();
                localStorage.removeItem(CONFIG.USER_KEY);
                window.location.reload();
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // ===== Authentication APIs =====

    async login(email, password) {
        const data = await this.post(CONFIG.ENDPOINTS.LOGIN, { email, password });
        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
        }
        return data;
    }

    async register(accountName, email, password, firstName, lastName) {
        const data = await this.post(CONFIG.ENDPOINTS.REGISTER, {
            accountName,
            email,
            password,
            firstName,
            lastName
        });
        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
        }
        return data;
    }

    async logout() {
        try {
            await this.post(CONFIG.ENDPOINTS.LOGOUT);
        } finally {
            this.removeToken();
            localStorage.removeItem(CONFIG.USER_KEY);
        }
    }

    async getCurrentUser() {
        return this.get(CONFIG.ENDPOINTS.ME);
    }

    async updateProfile(firstName, lastName, email) {
        const data = { firstName, lastName, email };
        // Remove undefined values
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        return this.put(CONFIG.ENDPOINTS.UPDATE_PROFILE, data);
    }

    async changePassword(currentPassword, newPassword) {
        return this.put(CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
            currentPassword,
            newPassword
        });
    }

    // ===== Account APIs =====

    async getAccountInfo() {
        return this.get(CONFIG.ENDPOINTS.ACCOUNT_INFO);
    }

    async updateAccount(name) {
        return this.put(CONFIG.ENDPOINTS.UPDATE_ACCOUNT, { name });
    }

    async listUsers() {
        return this.get(CONFIG.ENDPOINTS.LIST_USERS);
    }

    async createUser(email, password, firstName, lastName, role) {
        return this.post(CONFIG.ENDPOINTS.CREATE_USER, {
            email,
            password,
            firstName,
            lastName,
            role
        });
    }

    async updateUser(userId, updates) {
        return this.put(CONFIG.ENDPOINTS.UPDATE_USER(userId), updates);
    }

    async deleteUser(userId) {
        return this.delete(CONFIG.ENDPOINTS.DELETE_USER(userId));
    }

    async resetUserPassword(userId, newPassword) {
        return this.put(CONFIG.ENDPOINTS.RESET_PASSWORD(userId), { newPassword });
    }

    // ===== Admin APIs =====

    async getAdminStats() {
        return this.get(CONFIG.ENDPOINTS.ADMIN_STATS);
    }

    async listAllAccounts() {
        return this.get(CONFIG.ENDPOINTS.ADMIN_ACCOUNTS);
    }

    async getAccount(accountId) {
        return this.get(CONFIG.ENDPOINTS.ADMIN_ACCOUNT(accountId));
    }

    async updateAccountStatus(accountId, status) {
        return this.put(CONFIG.ENDPOINTS.ADMIN_ACCOUNT(accountId), { status });
    }

    async updateAccountLimit(accountId, maxUsers) {
        return this.put(CONFIG.ENDPOINTS.ADMIN_ACCOUNT(accountId), { maxUsers });
    }

    async listAPIKeys() {
        return this.get(CONFIG.ENDPOINTS.ADMIN_KEYS);
    }

    async createAPIKey(name, permissions) {
        return this.post(CONFIG.ENDPOINTS.ADMIN_CREATE_KEY, { name, permissions });
    }

    // ===== Tools APIs =====

    async listTools() {
        return this.get(CONFIG.ENDPOINTS.TOOLS_LIST);
    }

    async executeTool(toolName, params) {
        return this.post(CONFIG.ENDPOINTS.TOOL_EXECUTE(toolName), params);
    }
}

// Create global API service instance
const api = new APIService();
