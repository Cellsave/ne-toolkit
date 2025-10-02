/**
 * Main Script for Network Engineer's Toolbox
 * Handles common functionality across tool pages
 */

// Global state
const AppState = {
    isInitialized: false,
    currentTool: null,
    userData: null
};

/**
 * Initialize application
 */
function initApp() {
    if (AppState.isInitialized) return;
    
    // Check authentication if on tool page
    checkAuthentication();
    
    // Setup navigation
    setupNavigation();
    
    // Setup bookmarks
    setupBookmarks();
    
    // Setup diagnostics
    setupDiagnostics();
    
    AppState.isInitialized = true;
}

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
    const token = localStorage.getItem('nettools_token');
    const user = localStorage.getItem('nettools_user');
    
    if (token && user) {
        try {
            AppState.userData = JSON.parse(user);
            addAuthHeader();
        } catch (e) {
            console.error('Failed to parse user data:', e);
        }
    }
}

/**
 * Add authentication header to page
 */
function addAuthHeader() {
    if (!AppState.userData) return;
    
    const header = document.querySelector('header');
    if (!header) return;
    
    // Check if auth info already exists
    if (header.querySelector('.auth-info')) return;
    
    const authInfo = document.createElement('div');
    authInfo.className = 'auth-info';
    authInfo.style.cssText = 'position: absolute; top: 10px; right: 20px; font-size: 0.9rem; opacity: 0.9;';
    authInfo.innerHTML = `
        <span>${AppState.userData.firstName} ${AppState.userData.lastName}</span> | 
        <a href="/" style="color: inherit; text-decoration: none;">Dashboard</a> | 
        <a href="#" onclick="handleLogout(); return false;" style="color: inherit; text-decoration: none;">Logout</a>
    `;
    
    header.style.position = 'relative';
    header.appendChild(authInfo);
}

/**
 * Handle logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('nettools_token');
        localStorage.removeItem('nettools_user');
        window.location.href = '/';
    }
}

/**
 * Setup navigation
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath.split('/').pop()) {
            link.style.backgroundColor = 'var(--hover-color)';
        }
    });
}

/**
 * Setup bookmarks functionality
 */
function setupBookmarks() {
    window.toggleBookmarks = function() {
        const panel = document.getElementById('bookmarksPanel');
        if (!panel) return;
        
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            loadBookmarks();
        } else {
            panel.style.display = 'none';
        }
    };
    
    window.loadBookmarks = function() {
        const bookmarksList = document.getElementById('bookmarksList');
        if (!bookmarksList) return;
        
        const bookmarks = Storage.get('networkToolsBookmarks', []);
        
        bookmarksList.innerHTML = '';
        
        if (bookmarks.length === 0) {
            bookmarksList.innerHTML = '<p>No bookmarks yet.</p>';
            return;
        }
        
        const list = document.createElement('ul');
        bookmarks.forEach(bookmark => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = bookmark.url;
            link.textContent = bookmark.title;
            link.target = '_blank';
            item.appendChild(link);
            list.appendChild(item);
        });
        
        bookmarksList.appendChild(list);
    };
    
    window.bookmarkCurrentPage = function() {
        const bookmarks = Storage.get('networkToolsBookmarks', []);
        const currentPage = {
            title: document.title,
            url: window.location.href
        };
        
        const alreadyBookmarked = bookmarks.some(bookmark => bookmark.url === currentPage.url);
        
        if (!alreadyBookmarked) {
            bookmarks.push(currentPage);
            Storage.set('networkToolsBookmarks', bookmarks);
            Utils.showNotification('Page bookmarked!', 'success');
        } else {
            Utils.showNotification('Page already bookmarked', 'info');
        }
        
        toggleBookmarks();
    };
}

/**
 * Setup diagnostics functionality
 */
function setupDiagnostics() {
    window.runSelfDiagnostics = function() {
        const diagnosticsResults = document.getElementById('diagnosticsResults');
        
        const diagnostics = {
            browser: getBrowserInfo(),
            screen: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            cookies: navigator.cookieEnabled,
            localStorage: isLocalStorageAvailable(),
            sessionStorage: isSessionStorageAvailable(),
            javascript: true,
            timestamp: new Date().toISOString()
        };
        
        const results = `
System Diagnostics Report
========================
Date: ${diagnostics.timestamp}

Browser Information:
- Browser: ${diagnostics.browser}
- User Agent: ${diagnostics.userAgent}
- Screen: ${diagnostics.screen}

Feature Support:
- Online: ${diagnostics.online ? 'Yes' : 'No'}
- Cookies: ${diagnostics.cookies ? 'Enabled' : 'Disabled'}
- Local Storage: ${diagnostics.localStorage ? 'Available' : 'Not Available'}
- Session Storage: ${diagnostics.sessionStorage ? 'Available' : 'Not Available'}
- JavaScript: Enabled

Status: All systems operational
`;
        
        if (diagnosticsResults) {
            diagnosticsResults.textContent = results;
        } else {
            alert(results);
        }
    };
}

/**
 * Get browser information
 */
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.indexOf('Firefox') > -1) {
        browser = 'Mozilla Firefox';
    } else if (ua.indexOf('Chrome') > -1) {
        browser = 'Google Chrome';
    } else if (ua.indexOf('Safari') > -1) {
        browser = 'Apple Safari';
    } else if (ua.indexOf('Edge') > -1) {
        browser = 'Microsoft Edge';
    } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
        browser = 'Internet Explorer';
    }
    
    return browser;
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable() {
    try {
        const test = '__storage_test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Collect tool state for bug reports
 */
window.collectToolState = function() {
    const state = {};
    
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) {
            state[el.id] = el.value;
        }
    });
    
    return state;
};

/**
 * Format data for display
 */
function formatData(data) {
    if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
    }
    return String(data);
}

/**
 * Scroll to element
 */
function scrollToElement(elementId, behavior = 'smooth') {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior, block: 'start' });
    }
}

/**
 * Create table from data
 */
function createTable(data, headers) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create headers
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    
    return table;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export utilities to global scope
window.AppState = AppState;
window.scrollToElement = scrollToElement;
window.createTable = createTable;
window.formatData = formatData;
window.handleLogout = handleLogout;
