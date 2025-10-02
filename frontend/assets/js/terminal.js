// Network Engineers Toolkit - Terminal Manager

class TerminalManager {
    constructor() {
        this.terminal = null;
        this.fitAddon = null;
        this.websocket = null;
        this.isConnected = false;
    }

    /**
     * Initialize terminal
     */
    init(containerId) {
        if (typeof Terminal === 'undefined') {
            console.error('XTerm.js not loaded');
            return false;
        }

        try {
            // Create terminal instance
            this.terminal = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: 'Monaco, Courier New, monospace',
                theme: {
                    background: '#000000',
                    foreground: '#ffffff',
                    cursor: '#ffffff',
                    selection: '#ffffff33',
                    black: '#000000',
                    red: '#e06c75',
                    green: '#98c379',
                    yellow: '#d19a66',
                    blue: '#61afef',
                    magenta: '#c678dd',
                    cyan: '#56b6c2',
                    white: '#abb2bf',
                    brightBlack: '#5c6370',
                    brightRed: '#e06c75',
                    brightGreen: '#98c379',
                    brightYellow: '#d19a66',
                    brightBlue: '#61afef',
                    brightMagenta: '#c678dd',
                    brightCyan: '#56b6c2',
                    brightWhite: '#ffffff'
                },
                allowProposedApi: true
            });

            // Load fit addon if available
            if (typeof FitAddon !== 'undefined') {
                this.fitAddon = new FitAddon.FitAddon();
                this.terminal.loadAddon(this.fitAddon);
            }

            // Open terminal in container
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Terminal container not found');
                return false;
            }

            this.terminal.open(container);

            // Fit terminal to container
            if (this.fitAddon) {
                this.fitAddon.fit();
                window.addEventListener('resize', () => {
                    this.fitAddon.fit();
                });
            }

            // Setup terminal event handlers
            this.setupEventHandlers();

            // Welcome message
            this.writeLine('Network Engineers Toolkit - Terminal');
            this.writeLine('Type "help" for available commands');
            this.writeLine('');
            this.prompt();

            return true;

        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            return false;
        }
    }

    /**
     * Setup terminal event handlers
     */
    setupEventHandlers() {
        if (!this.terminal) return;

        let currentLine = '';

        this.terminal.onData(data => {
            // Handle special keys
            const code = data.charCodeAt(0);

            if (code === 13) { // Enter
                this.terminal.write('\r\n');
                this.processCommand(currentLine.trim());
                currentLine = '';
                this.prompt();
            } else if (code === 127) { // Backspace
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    this.terminal.write('\b \b');
                }
            } else if (code === 3) { // Ctrl+C
                this.terminal.write('^C\r\n');
                currentLine = '';
                this.prompt();
            } else if (code >= 32 && code <= 126) { // Printable characters
                currentLine += data;
                this.terminal.write(data);
            }
        });
    }

    /**
     * Process terminal command
     */
    async processCommand(command) {
        if (!command) return;

        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'help':
                this.showHelp();
                break;

            case 'clear':
                this.terminal.clear();
                break;

            case 'ping':
                if (args.length === 0) {
                    this.writeLine('Usage: ping <host>');
                } else {
                    await this.executePing(args[0]);
                }
                break;

            case 'traceroute':
            case 'tracert':
                if (args.length === 0) {
                    this.writeLine('Usage: traceroute <host>');
                } else {
                    this.writeLine(`Traceroute to ${args[0]}...`);
                    this.writeLine('This feature requires server-side implementation');
                }
                break;

            case 'nslookup':
                if (args.length === 0) {
                    this.writeLine('Usage: nslookup <domain>');
                } else {
                    await this.executeDNSLookup(args[0]);
                }
                break;

            case 'whois':
                if (args.length === 0) {
                    this.writeLine('Usage: whois <domain>');
                } else {
                    await this.executeWhois(args[0]);
                }
                break;

            case 'echo':
                this.writeLine(args.join(' '));
                break;

            case 'date':
                this.writeLine(new Date().toString());
                break;

            case 'exit':
            case 'quit':
                this.writeLine('Use the tool navigation to switch tools');
                break;

            default:
                this.writeLine(`Command not found: ${cmd}`);
                this.writeLine('Type "help" for available commands');
        }
    }

    /**
     * Show help text
     */
    showHelp() {
        this.writeLine('Available commands:');
        this.writeLine('  help              - Show this help message');
        this.writeLine('  clear             - Clear the terminal screen');
        this.writeLine('  ping <host>       - Ping a host');
        this.writeLine('  traceroute <host> - Trace route to host');
        this.writeLine('  nslookup <domain> - DNS lookup');
        this.writeLine('  whois <domain>    - WHOIS lookup');
        this.writeLine('  echo <text>       - Echo text');
        this.writeLine('  date              - Show current date/time');
        this.writeLine('  exit              - Exit terminal');
        this.writeLine('');
    }

    /**
     * Execute ping command
     */
    async executePing(host) {
        this.writeLine(`PING ${host}...`);
        
        try {
            // Note: Browser cannot do real ICMP ping, this simulates the output
            const startTime = Date.now();
            const response = await fetch(`https://${host}`, { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-cache'
            });
            const endTime = Date.now();
            const time = endTime - startTime;

            this.writeLine(`Reply from ${host}: time=${time}ms`);
            this.writeLine('');
            this.writeLine('Note: This is a simulated ping using HTTP HEAD request');
            this.writeLine('For accurate ICMP ping, use the Network Scanner tool');

        } catch (error) {
            this.writeLine(`Request timeout for ${host}`);
        }
    }

    /**
     * Execute DNS lookup
     */
    async executeDNSLookup(domain) {
        this.writeLine(`Looking up ${domain}...`);

        try {
            const result = await api.dnsLookup(domain, 'A');
            
            if (result.success && result.data.results) {
                this.writeLine(`Server: API DNS Resolver`);
                this.writeLine('');
                this.writeLine(`Name: ${domain}`);
                
                if (result.data.results.A) {
                    result.data.results.A.forEach(ip => {
                        this.writeLine(`Address: ${ip}`);
                    });
                } else if (result.data.results.error) {
                    this.writeLine(`Error: ${result.data.results.error}`);
                }
            }

        } catch (error) {
            this.writeLine(`Error: ${error.message}`);
        }
    }

    /**
     * Execute WHOIS lookup
     */
    async executeWhois(domain) {
        this.writeLine(`WHOIS lookup for ${domain}...`);
        this.writeLine('Please wait...');

        try {
            const result = await api.whoisLookup(domain);
            
            if (result.success && result.data) {
                this.writeLine('');
                if (result.data.raw) {
                    // Display raw WHOIS data
                    const lines = result.data.raw.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            this.writeLine(line);
                        }
                    });
                } else {
                    this.writeLine(JSON.stringify(result.data, null, 2));
                }
            }

        } catch (error) {
            this.writeLine(`Error: ${error.message}`);
        }
    }

    /**
     * Write a line to terminal
     */
    writeLine(text) {
        if (this.terminal) {
            this.terminal.writeln(text);
        }
    }

    /**
     * Write text to terminal without newline
     */
    write(text) {
        if (this.terminal) {
            this.terminal.write(text);
        }
    }

    /**
     * Show prompt
     */
    prompt() {
        const user = auth.getCurrentUser();
        const username = user ? user.username : 'guest';
        this.write(`\x1b[32m${username}@nettools\x1b[0m:\x1b[34m~\x1b[0m$ `);
    }

    /**
     * Connect to SSH (WebSocket implementation)
     */
    async connectSSH(host, port, username, password) {
        this.writeLine(`Connecting to ${username}@${host}:${port}...`);
        this.writeLine('');
        this.writeLine('Note: SSH functionality requires WebSocket backend implementation');
        this.writeLine('This is a placeholder for future SSH terminal support');
        this.writeLine('');

        // TODO: Implement WebSocket connection for real SSH
        // const wsUrl = `ws://${window.location.host}/ssh`;
        // this.websocket = new WebSocket(wsUrl);
        // 
        // this.websocket.onopen = () => {
        //     this.isConnected = true;
        //     this.websocket.send(JSON.stringify({
        //         type: 'connect',
        //         host, port, username, password
        //     }));
        // };
        //
        // this.websocket.onmessage = (event) => {
        //     this.write(event.data);
        // };
        //
        // this.websocket.onerror = (error) => {
        //     this.writeLine(`Connection error: ${error}`);
        // };
        //
        // this.websocket.onclose = () => {
        //     this.isConnected = false;
        //     this.writeLine('Connection closed');
        // };
    }

    /**
     * Disconnect SSH
     */
    disconnectSSH() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
            this.isConnected = false;
        }
    }

    /**
     * Resize terminal
     */
    resize() {
        if (this.fitAddon) {
            this.fitAddon.fit();
        }
    }

    /**
     * Clear terminal
     */
    clear() {
        if (this.terminal) {
            this.terminal.clear();
        }
    }

    /**
     * Dispose terminal
     */
    dispose() {
        this.disconnectSSH();
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
    }
}

// Create and export terminal manager instance
const terminal = new TerminalManager();