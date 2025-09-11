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

        // Order debugging commands
        window.debugOrder = async (productName = 'CAFE AMERICANO') => {
            console.group('🛒 Order Debug Info');
            try {
                const { terminalService } = await import('../services/terminalService');
                const { orderService } = await import('../services/orderService');

                const terminalId = terminalService.getTerminalId();
                console.log('Current terminal ID:', terminalId);

                if (terminalId) {
                    console.log('Testing addOrderToTerminalTicket...');
                    await orderService.debugAddOrder(terminalId, productName);
                } else {
                    console.error('❌ No terminal ID available');
                }
            } catch (error) {
                console.error('❌ Order debug failed:', error);
            }
            console.groupEnd();
        };

        window.testAddOrder = async (terminalId, productName = 'CAFE AMERICANO', quantity = 1, portion = 'Normal') => {
            console.group('🧪 Test Add Order');
            try {
                const { orderService } = await import('../services/orderService');
                console.log('Testing with:', { terminalId, productName, quantity, portion });

                const result = await orderService.debugAddOrder(terminalId, productName, quantity, portion);
                console.log('✅ Test result:', result);
                return result;
            } catch (error) {
                console.error('❌ Test failed:', error);
                throw error;
            }
            console.groupEnd();
        };

        window.diagnoseOrder = async (productName = 'CAFE AMERICANO', productId = 910) => {
            console.group('🔬 Diagnose Order Problem');
            try {
                const { terminalService } = await import('../services/terminalService');
                const { orderService } = await import('../services/orderService');

                const terminalId = terminalService.getTerminalId();
                console.log('Using terminal ID:', terminalId);

                if (terminalId) {
                    const result = await orderService.diagnoseAddOrderProblem(terminalId, productName, productId);
                    console.log('✅ Diagnosis completed:', result);
                    return result;
                } else {
                    console.error('❌ No terminal ID available');
                    throw new Error('No terminal ID available');
                }
            } catch (error) {
                console.error('❌ Diagnosis failed:', error);
                throw error;
            }
            console.groupEnd();
        }; console.log('🔧 Debug commands available:');
        console.log('  - window.debugTerminal() - Show terminal and token status');
        console.log('  - window.fixTerminal() - Clear tokens to force refresh');
        console.log('  - window.testTerminal() - Show basic terminal info');
        console.log('  - window.checkConnection() - Test SambaPOS connectivity');
        console.log('  - window.debugTokens() - Show token details');
        console.log('  - window.clearDebugData() - Clear all tokens and cache');
        console.log('  - window.debugOrder(productName) - Debug order addition');
        console.log('  - window.testAddOrder(terminalId, productName, quantity, portion) - Test add order');
        console.log('  - window.diagnoseOrder(productName, productId) - Complete order diagnosis');
    }
}

// Initialize debug commands
const debugCommands = new DebugCommands();

export default debugCommands;
