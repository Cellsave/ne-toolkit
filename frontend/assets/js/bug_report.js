/**
 * Bug Report Module for Network Engineer's Toolbox
 * Handles bug reporting and diagnostic information collection
 */

/**
 * Main bug report function
 */
function reportBug() {
    const bugReport = generateBugReport();
    displayBugReport(bugReport);
}

/**
 * Generate comprehensive bug report
 */
function generateBugReport() {
    return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        page: document.title,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth
        },
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        browser: getBrowserDetails(),
        features: getFeatureSupport(),
        performance: getPerformanceInfo(),
        toolState: collectToolState(),
        errors: getRecentErrors(),
        network: getNetworkInfo()
    };
}

/**
 * Get detailed browser information
 */
function getBrowserDetails() {
    const ua = navigator.userAgent;
    const browser = {
        name: 'Unknown',
        version: 'Unknown',
        engine: 'Unknown'
    };
    
    // Detect browser
    if (ua.indexOf('Firefox') > -1) {
        browser.name = 'Firefox';
        browser.version = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
        browser.engine = 'Gecko';
    } else if (ua.indexOf('Edg') > -1) {
        browser.name = 'Edge';
        browser.version = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
        browser.engine = 'Chromium';
    } else if (ua.indexOf('Chrome') > -1) {
        browser.name = 'Chrome';
        browser.version = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
        browser.engine = 'Blink';
    } else if (ua.indexOf('Safari') > -1) {
        browser.name = 'Safari';
        browser.version = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
        browser.engine = 'WebKit';
    }
    
    return browser;
}

/**
 * Get feature support information
 */
function getFeatureSupport() {
    return {
        cookies: navigator.cookieEnabled,
        localStorage: isStorageAvailable('localStorage'),
        sessionStorage: isStorageAvailable('sessionStorage'),
        serviceWorker: 'serviceWorker' in navigator,
        webWorker: typeof Worker !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        promise: typeof Promise !== 'undefined',
        webGL: detectWebGL(),
        touch: 'ontouchstart' in window,
        geolocation: 'geolocation' in navigator,
        notifications: 'Notification' in window,
        online: navigator.onLine
    };
}

/**
 * Check if storage is available
 */
function isStorageAvailable(type) {
    try {
        const storage = window[type];
        const test = '__storage_test__';
        storage.setItem(test, test);
        storage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Detect WebGL support
 */
function detectWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
        return false;
    }
}

/**
 * Get performance information
 */
function getPerformanceInfo() {
    if (!window.performance) {
        return { available: false };
    }
    
    const timing = performance.timing;
    const navigation = performance.navigation;
    
    return {
        available: true,
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        connectTime: timing.connectEnd - timing.connectStart,
        renderTime: timing.domComplete - timing.domLoading,
        navigationType: navigation.type,
        redirectCount: navigation.redirectCount,
        memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null
    };
}

/**
 * Collect current tool state
 */
function collectToolState() {
    const state = {};
    
    // Collect form inputs
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) {
            state[el.id] = {
                value: el.value,
                type: el.type || el.tagName.toLowerCase()
            };
        }
    });
    
    return state;
}

/**
 * Get recent JavaScript errors
 */
function getRecentErrors() {
    if (!window.errorLog) {
        return [];
    }
    
    return window.errorLog.slice(-5); // Last 5 errors
}

/**
 * Setup error logging
 */
(function setupErrorLogging() {
    window.errorLog = window.errorLog || [];
    
    window.addEventListener('error', function(event) {
        window.errorLog.push({
            timestamp: new Date().toISOString(),
            message: event.message,
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error ? event.error.toString() : null
        });
        
        // Keep only last 20 errors
        if (window.errorLog.length > 20) {
            window.errorLog = window.errorLog.slice(-20);
        }
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        window.errorLog.push({
            timestamp: new Date().toISOString(),
            type: 'unhandledRejection',
            reason: event.reason ? event.reason.toString() : 'Unknown',
            promise: 'Promise rejection'
        });
        
        if (window.errorLog.length > 20) {
            window.errorLog = window.errorLog.slice(-20);
        }
    });
})();

/**
 * Get network information
 */
function getNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
        return { available: false };
    }
    
    return {
        available: true,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
    };
}

/**
 * Display bug report to user
 */
function displayBugReport(bugReport) {
    const reportText = formatBugReport(bugReport);
    
    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(reportText)
            .then(() => {
                alert('Bug report copied to clipboard!\n\nPlease paste this information in your email to:\n2net-eng@onwave.com\n\nInclude a description of the issue you encountered.');
            })
            .catch(() => {
                showBugReportModal(reportText);
            });
    } else {
        showBugReportModal(reportText);
    }
}

/**
 * Format bug report as text
 */
function formatBugReport(report) {
    return `
=====================================
BUG REPORT
=====================================
Date: ${report.timestamp}
Page: ${report.page}
URL: ${report.url}

BROWSER INFORMATION
-----------------------------------
Name: ${report.browser.name} ${report.browser.version}
Engine: ${report.browser.engine}
User Agent: ${report.userAgent}
Platform: ${report.platform}
Language: ${report.language}

SCREEN & VIEWPORT
-----------------------------------
Screen: ${report.screen.width}x${report.screen.height}
Available: ${report.screen.availWidth}x${report.screen.availHeight}
Viewport: ${report.viewport.width}x${report.viewport.height}
Color Depth: ${report.screen.colorDepth}

FEATURE SUPPORT
-----------------------------------
Cookies: ${report.features.cookies ? 'Enabled' : 'Disabled'}
Local Storage: ${report.features.localStorage ? 'Available' : 'Not Available'}
Session Storage: ${report.features.sessionStorage ? 'Available' : 'Not Available'}
Service Worker: ${report.features.serviceWorker ? 'Supported' : 'Not Supported'}
Fetch API: ${report.features.fetch ? 'Supported' : 'Not Supported'}
WebGL: ${report.features.webGL ? 'Supported' : 'Not Supported'}
Touch: ${report.features.touch ? 'Supported' : 'Not Supported'}
Online: ${report.features.online ? 'Yes' : 'No'}

PERFORMANCE
-----------------------------------
${report.performance.available ? `
Load Time: ${report.performance.loadTime}ms
DOM Ready: ${report.performance.domReady}ms
Connect Time: ${report.performance.connectTime}ms
Render Time: ${report.performance.renderTime}ms
${report.performance.memory ? `
Memory Usage: ${(report.performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB
Memory Limit: ${(report.performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB` : ''}
` : 'Performance data not available'}

NETWORK
-----------------------------------
${report.network.available ? `
Connection Type: ${report.network.effectiveType}
Downlink: ${report.network.downlink} Mbps
RTT: ${report.network.rtt} ms
Save Data: ${report.network.saveData ? 'Enabled' : 'Disabled'}
` : 'Network information not available'}

TOOL STATE
-----------------------------------
${formatToolState(report.toolState)}

RECENT ERRORS
-----------------------------------
${formatErrors(report.errors)}

=====================================
Please describe the issue you encountered:
[Your description here]

Steps to reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected behavior:
[What you expected to happen]

Actual behavior:
[What actually happened]
=====================================
`;
}

/**
 * Format tool state for display
 */
function formatToolState(state) {
    if (Object.keys(state).length === 0) {
        return 'No form data';
    }
    
    return Object.entries(state)
        .map(([key, value]) => `${key}: ${value.value || '(empty)'}`)
        .join('\n');
}

/**
 * Format errors for display
 */
function formatErrors(errors) {
    if (!errors || errors.length === 0) {
        return 'No recent errors';
    }
    
    return errors.map((error, index) => `
Error ${index + 1}:
  Time: ${error.timestamp}
  Message: ${error.message || error.reason}
  ${error.filename ? `File: ${error.filename}:${error.line}:${error.column}` : ''}
`).join('\n');
}

/**
 * Show bug report in modal
 */
function showBugReportModal(reportText) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background-color: var(--card-bg, #16213e);
        padding: 2rem;
        border-radius: 10px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Bug Report Generated';
    title.style.marginBottom = '1rem';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Please copy this information and send it to 2net-eng@onwave.com along with a description of the issue.';
    instructions.style.marginBottom = '1rem';
    
    const textarea = document.createElement('textarea');
    textarea.value = reportText;
    textarea.style.cssText = `
        width: 100%;
        height: 400px;
        font-family: monospace;
        font-size: 0.9rem;
        padding: 1rem;
        background-color: var(--code-bg, #0d1b2a);
        color: var(--text-color, #f1f1f1);
        border: 1px solid var(--border-color, #2d3748);
        border-radius: 5px;
    `;
    textarea.readOnly = true;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 1rem; margin-top: 1rem;';
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.className = 'btn';
    copyBtn.onclick = () => {
        textarea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(closeBtn);
    
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(textarea);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    textarea.select();
}

// Export to global scope
window.reportBug = reportBug;
window.generateBugReport = generateBugReport;
