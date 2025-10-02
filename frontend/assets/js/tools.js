/**
 * Network Engineers Toolkit - Tools Module
 * Utilities for integrating existing tools with the new framework
 */

class ToolsManager {
    constructor() {
        this.tools = CONFIG.TOOLS;
    }

    /**
     * Get all tools
     */
    getAllTools() {
        return this.tools;
    }

    /**
     * Get tools by category
     */
    getToolsByCategory(category) {
        return this.tools.filter(tool => tool.category === category);
    }

    /**
     * Get tool by ID
     */
    getToolById(id) {
        return this.tools.find(tool => tool.id === id);
    }

    /**
     * Render tools grid
     */
    renderToolsGrid(containerId, tools = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const toolsToRender = tools || this.tools;
        container.innerHTML = '';

        toolsToRender.forEach(tool => {
            const toolCard = document.createElement('a');
            toolCard.href = tool.url;
            toolCard.className = 'tool-card';
            toolCard.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${tool.icon}</div>
                <h4>${tool.name}</h4>
                <p>${tool.description}</p>
            `;
            container.appendChild(toolCard);
        });
    }

    /**
     * Render tools list
     */
    renderToolsList(containerId, tools = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const toolsToRender = tools || this.tools;
        container.innerHTML = '';

        toolsToRender.forEach(tool => {
            const toolItem = document.createElement('div');
            toolItem.className = 'tool-item';
            toolItem.innerHTML = `
                <div>
                    <h3>${tool.icon} ${tool.name}</h3>
                    <p>${tool.description}</p>
                    <span class="badge badge-info">${CONFIG.TOOL_CATEGORIES[tool.category]}</span>
                </div>
                <a href="${tool.url}" class="btn btn-primary">Open Tool</a>
            `;
            container.appendChild(toolItem);
        });
    }

    /**
     * Filter tools by search query
     */
    searchTools(query) {
        const lowerQuery = query.toLowerCase();
        return this.tools.filter(tool => 
            tool.name.toLowerCase().includes(lowerQuery) ||
            tool.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Setup tool search functionality
     */
    setupToolSearch(searchInputId, resultsContainerId) {
        const searchInput = document.getElementById(searchInputId);
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                this.renderToolsList(resultsContainerId);
            } else {
                const results = this.searchTools(query);
                this.renderToolsList(resultsContainerId, results);
            }
        });
    }
}

/**
 * Tool Integration Helper
 * Provides utilities for existing tools to integrate with the auth system
 */
class ToolIntegration {
    /**
     * Check if user is authenticated before accessing tool
     */
    static requireAuth() {
        if (!authManager.isAuthenticated()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    /**
     * Add authentication header to tool page
     */
    static addAuthHeader() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        // Find header element or create one
        let header = document.querySelector('header');
        if (header) {
            const authInfo = document.createElement('div');
            authInfo.style.cssText = 'position: absolute; top: 10px; right: 20px; font-size: 0.9rem;';
            authInfo.innerHTML = `
                <span>Logged in as: ${user.firstName} ${user.lastName}</span> | 
                <a href="/" style="color: inherit;">Dashboard</a> | 
                <a href="#" onclick="authManager.handleLogout(); return false;" style="color: inherit;">Logout</a>
            `;
            header.appendChild(authInfo);
        }
    }

    /**
     * Log tool usage (for future analytics)
     */
    static async logToolUsage(toolId, action = 'view') {
        try {
            // This can be implemented later with a dedicated endpoint
            console.log(`Tool usage: ${toolId} - ${action}`);
        } catch (error) {
            console.error('Failed to log tool usage:', error);
        }
    }

    /**
     * Get API token for tool API calls
     */
    static getAuthToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    /**
     * Make authenticated API call from tool
     */
    static async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        };

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Save tool preferences
     */
    static saveToolPreference(toolId, key, value) {
        const prefKey = `tool_pref_${toolId}_${key}`;
        localStorage.setItem(prefKey, JSON.stringify(value));
    }

    /**
     * Load tool preferences
     */
    static loadToolPreference(toolId, key, defaultValue = null) {
        const prefKey = `tool_pref_${toolId}_${key}`;
        const stored = localStorage.getItem(prefKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }
}

// Create global tools manager instance
const toolsManager = new ToolsManager();

// Auto-initialize tool integration on tool pages
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check auth for tool pages
        if (ToolIntegration.requireAuth()) {
            ToolIntegration.addAuthHeader();
            // Log tool usage
            const toolName = window.location.pathname.replace(/^\//, '').replace('.html', '');
            ToolIntegration.logToolUsage(toolName);
        }
    });
}
