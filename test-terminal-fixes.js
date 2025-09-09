/**
 * Terminal Fixes Validation Script
 * Tests the implemented solutions for "Terminal not found" errors
 */

const DEBUG_ENABLED = true;

function log(message, type = 'info') {
    if (!DEBUG_ENABLED) return;

    const timestamp = new Date().toISOString().slice(11, -1);
    const prefix = {
        'info': '🔧',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'test': '🧪'
    }[type] || '📝';

    console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function testTerminalFixes() {
    log('Starting Terminal Fixes Validation', 'test');

    try {
        // Test 1: Check if services are available
        log('Test 1: Checking service availability...', 'test');

        if (typeof window === 'undefined') {
            log('Running in Node.js environment, importing services...', 'info');

            // In Node.js, we need to mock some browser-specific APIs
            global.localStorage = {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { }
            };
            global.window = global;

            // Import services
            const { tokenService } = await import('./app/services/tokenService.js');
            const networkHealthService = (await import('./app/services/networkHealthService.js')).default;

            log('Services imported successfully', 'success');

            // Test token service
            log('Testing token service...', 'test');
            const hasValidToken = await tokenService.hasValidToken();
            log(`Token validity: ${hasValidToken}`, hasValidToken ? 'success' : 'warning');

            // Test network health service
            log('Testing network health service...', 'test');
            const connectivity = await networkHealthService.checkSambaPOSConnectivity();
            log(`Network connectivity: ${connectivity}`, connectivity ? 'success' : 'warning');

        } else {
            log('Running in browser environment...', 'info');

            // Test browser-specific functionality
            log('Testing browser debug commands...', 'test');

            if (typeof window.debugTerminal === 'function') {
                log('debugTerminal() command available', 'success');
                window.debugTerminal();
            } else {
                log('debugTerminal() command not available', 'warning');
            }

            if (typeof window.fixTerminal === 'function') {
                log('fixTerminal() command available', 'success');
            } else {
                log('fixTerminal() command not available', 'warning');
            }

            if (typeof window.testTerminal === 'function') {
                log('testTerminal() command available', 'success');
            } else {
                log('testTerminal() command not available', 'warning');
            }
        }

        // Test 2: Configuration validation
        log('Test 2: Validating configuration...', 'test');

        // Check if all required environment variables are set
        const requiredConfigs = [
            'REACT_APP_SAMBAPOS_URL',
            'REACT_APP_TERMINAL_NAME'
        ];

        let configValid = true;
        for (const config of requiredConfigs) {
            const value = process.env[config];
            if (!value) {
                log(`Missing configuration: ${config}`, 'error');
                configValid = false;
            } else {
                log(`Configuration found: ${config} = ${value}`, 'success');
            }
        }

        if (configValid) {
            log('All required configurations are present', 'success');
        } else {
            log('Some configurations are missing', 'warning');
        }

        // Test 3: File existence check
        log('Test 3: Checking service file existence...', 'test');

        const requiredFiles = [
            './app/services/tokenService.js',
            './app/services/networkHealthService.js',
            './app/services/terminalFixService.js',
            './app/services/terminalHealthService.js',
            './app/components/ConnectionStatus.jsx'
        ];

        const fs = await import('fs');
        const path = await import('path');

        for (const file of requiredFiles) {
            const fullPath = path.resolve(process.cwd(), file);
            try {
                const exists = fs.existsSync(fullPath);
                if (exists) {
                    log(`File exists: ${file}`, 'success');
                } else {
                    log(`File missing: ${file}`, 'error');
                }
            } catch (error) {
                log(`Error checking file ${file}: ${error.message}`, 'error');
            }
        }

        log('Terminal Fixes Validation completed', 'success');

    } catch (error) {
        log(`Validation failed: ${error.message}`, 'error');
        throw error;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testTerminalFixes };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testTerminalFixes().catch(console.error);
}

// Browser export
if (typeof window !== 'undefined') {
    window.testTerminalFixes = testTerminalFixes;
    console.log('🧪 Terminal fixes test available as window.testTerminalFixes()');
}
