/**
 * Debug utility for monitoring mesa status polling
 * Use in browser console to monitor real-time updates
 */

// Enable debug logging for mesa status
window.enableMesaDebug = () => {
    localStorage.debug = 'pmpos:mesa-status,pmpos:tables';
    console.log('🔍 Mesa polling debug enabled');
    console.log('Refresh page to see debug output');
};

// Disable debug logging
window.disableMesaDebug = () => {
    localStorage.debug = '';
    console.log('🔇 Debug disabled');
};

// Monitor polling status
window.getMesaPollingStatus = () => {
    const mesa1Status = localStorage.getItem('pmpos_mesa_1_status');
    const mesa17Status = localStorage.getItem('pmpos_mesa_17_status');
    
    console.log('📊 Current Mesa Status:');
    console.log('Mesa 1:', mesa1Status || 'LIBRE');
    console.log('Mesa 17:', mesa17Status || 'LIBRE');
    
    return {
        mesa1: mesa1Status || 'LIBRE',
        mesa17: mesa17Status || 'LIBRE'
    };
};

// Test polling by simulating status changes
window.testMesaPolling = () => {
    console.log('🧪 Testing mesa polling...');
    console.log('Watch the mesa cards for real-time updates');
    console.log('Status should update automatically every 2 seconds');
};

console.log('🔧 Mesa debugging utilities loaded:');
console.log('  window.enableMesaDebug() - Enable debug output');
console.log('  window.disableMesaDebug() - Disable debug output');
console.log('  window.getMesaPollingStatus() - Check current status');
console.log('  window.testMesaPolling() - Test polling system');