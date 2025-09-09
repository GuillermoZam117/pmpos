// Emergency Terminal Fix Debug Script
// Run this in browser console to diagnose and fix terminal issues

window.debugTerminalEmergency = function () {
    console.log('🆘 EMERGENCY TERMINAL DEBUG');
    console.log('==========================');

    // Check current terminal status
    const currentUser = tokenService?.getCurrentUser();
    const terminalId = terminalService?.getTerminalId();

    console.log('1. Current User:', currentUser);
    console.log('2. Current Terminal ID:', terminalId);

    // Check localStorage
    const storedTerminalId = localStorage.getItem('pmpos_terminal_id');
    const currentTerminalId = localStorage.getItem('currentTerminalId');

    console.log('3. Stored Terminal ID (pmpos):', storedTerminalId);
    console.log('4. Stored Terminal ID (current):', currentTerminalId);
    console.log('5. Window Terminal ID:', window.currentTerminalId);

    // Check if terminal exists on server
    console.log('6. Testing terminal existence on server...');

    return {
        user: currentUser,
        terminalId,
        storedIds: { pmpos: storedTerminalId, current: currentTerminalId },
        windowId: window.currentTerminalId
    };
};

window.forceTerminalReset = async function () {
    console.log('🔄 FORCING TERMINAL RESET');
    console.log('=========================');

    const currentUser = tokenService?.getCurrentUser();
    if (!currentUser?.name) {
        console.error('❌ No current user found');
        return false;
    }

    console.log('1. Clearing all terminal data...');

    // Clear from terminalService
    terminalService?.clearTerminal(currentUser.name);

    // Clear localStorage completely
    localStorage.removeItem('pmpos_terminal_id');
    localStorage.removeItem('currentTerminalId');
    delete window.currentTerminalId;

    console.log('2. Waiting 1 second...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('3. Forcing new terminal registration...');
    try {
        const newTerminalId = await terminalService?.ensureTerminalRegistered(currentUser.name);
        console.log('✅ New Terminal ID:', newTerminalId);
        return newTerminalId;
    } catch (error) {
        console.error('❌ Failed to register new terminal:', error);
        return false;
    }
};

window.testTerminalOperations = async function () {
    console.log('🧪 TESTING TERMINAL OPERATIONS');
    console.log('==============================');

    const terminalId = terminalService?.getTerminalId();
    if (!terminalId) {
        console.error('❌ No terminal ID available');
        return false;
    }

    console.log('Testing with Terminal ID:', terminalId);

    // Test 1: Try to get terminal ticket (this should fail with current stale terminal)
    console.log('Test 1: Getting terminal ticket...');
    try {
        const ticket = await getTerminalTicket();
        console.log('✅ Terminal ticket retrieved:', ticket);
        return true;
    } catch (error) {
        console.log('❌ Terminal ticket failed:', error?.message);

        // If it's a "Terminal not found" error, the auto-recovery should kick in
        if (error?.message?.includes('Terminal not found')) {
            console.log('🔄 This should trigger automatic terminal re-registration...');
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('Test 2: Retrying after auto-recovery...');
            try {
                const ticket2 = await getTerminalTicket();
                console.log('✅ Terminal ticket retrieved after recovery:', ticket2);
                return true;
            } catch (error2) {
                console.log('❌ Still failing after recovery:', error2?.message);
                return false;
            }
        }
        return false;
    }
};

console.log('🛠️ Emergency Terminal Debug Functions Loaded');
console.log('Available functions:');
console.log('  - window.debugTerminalEmergency() - Check terminal status');
console.log('  - window.forceTerminalReset() - Force complete terminal reset');
console.log('  - window.testTerminalOperations() - Test terminal functionality');
