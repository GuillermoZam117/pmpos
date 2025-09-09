/**
 * Debug Commands for PMPOS - Simplified Version
 * Comandos de debugging simplificados para evitar errores durante desarrollo
 */

class DebugCommands {
    constructor() {
        this.setupWindowCommands();
    }

    setupWindowCommands() {
        if (typeof window === 'undefined') return;

        console.log('🔧 Loading simplified debug commands...');

        // Terminal debugging - versión simplificada
        window.debugTerminal = async () => {
            console.group('🖥️ Terminal Debug Info (Simplified)');
            console.log('Terminal debugging is available - check localStorage and network');
            console.log('LocalStorage tokens:', {
                accessToken: !!localStorage.getItem('sambapos_access_token'),
                refreshToken: !!localStorage.getItem('sambapos_refresh_token'),
                expiry: localStorage.getItem('sambapos_token_expiry')
            });

            // Check network connectivity
            try {
                const response = await fetch('/api/health', { method: 'HEAD' });
                console.log('Network status:', response.ok ? '✅ Connected' : '❌ Disconnected');
            } catch (error) {
                console.log('Network status:', '❌ Error -', error.message);
            }

            console.groupEnd();
        };

        window.fixTerminal = async () => {
            console.log('🔧 Terminal fix command available - checking network and tokens...');

            // Clear tokens to force refresh
            localStorage.removeItem('sambapos_access_token');
            localStorage.removeItem('sambapos_refresh_token');
            localStorage.removeItem('sambapos_token_expiry');
            console.log('✅ Cleared cached tokens - app will request new ones');
        };

        window.testTerminal = async () => {
            console.log('🧪 Terminal test command - simplified version');
            console.log('Available localStorage:', Object.keys(localStorage));
        };

        // Connection status helper
        window.checkConnection = async () => {
            console.group('🌐 Connection Status');

            try {
                const config = { sambaposUrl: 'http://192.168.1.125:9000' }; // Default
                const response = await fetch(`${config.sambaposUrl}/api/health`, {
                    method: 'HEAD',
                    timeout: 5000
                });
                console.log('SambaPOS connectivity:', response.ok ? '✅ OK' : '❌ Failed');
            } catch (error) {
                console.log('SambaPOS connectivity:', '❌ Error -', error.message);
            }

            console.groupEnd();
        };

        // Token debugging
        window.debugTokens = () => {
            console.group('🔐 Token Debug');

            const tokens = {
                accessToken: localStorage.getItem('sambapos_access_token'),
                refreshToken: localStorage.getItem('sambapos_refresh_token'),
                expiry: localStorage.getItem('sambapos_token_expiry')
            };

            console.log('Stored tokens:', {
                accessToken: tokens.accessToken ? `${tokens.accessToken.substr(0, 20)}...` : 'None',
                refreshToken: tokens.refreshToken ? `${tokens.refreshToken.substr(0, 20)}...` : 'None',
                expiry: tokens.expiry
            });

            if (tokens.expiry) {
                const expiryDate = new Date(tokens.expiry);
                const now = new Date();
                const isExpired = expiryDate < now;
                console.log(`Token expiry: ${expiryDate.toLocaleString()} (${isExpired ? '❌ Expired' : '✅ Valid'})`);
            }

            console.groupEnd();
        };

        // Clear all debug data
        window.clearDebugData = () => {
            console.log('🧹 Clearing all debug data...');
            ['sambapos_access_token', 'sambapos_refresh_token', 'sambapos_token_expiry'].forEach(key => {
                localStorage.removeItem(key);
            });
            console.log('✅ Debug data cleared');
        };

        console.log('🔧 Debug commands available:');
        console.log('  - window.debugTerminal() - Show terminal and token status');
        console.log('  - window.fixTerminal() - Clear tokens to force refresh');
        console.log('  - window.testTerminal() - Show basic terminal info');
        console.log('  - window.checkConnection() - Test SambaPOS connectivity');
        console.log('  - window.debugTokens() - Show token details');
        console.log('  - window.clearDebugData() - Clear all tokens and cache');
    }
}

// Initialize debug commands
const debugCommands = new DebugCommands();

export default debugCommands;
