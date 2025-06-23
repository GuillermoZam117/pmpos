// Test script para verificar funcionalidades del PMPOS
console.log('🧪 INICIANDO PRUEBAS DE FUNCIONALIDAD PMPOS');

// Test 1: Verificar que el servidor esté corriendo
async function testServer() {
    try {
        const response = await fetch('http://localhost:8081');
        console.log('✅ Servidor funcionando en puerto 8081');
        return true;
    } catch (error) {
        console.log('❌ Servidor no responde:', error.message);
        return false;
    }
}

// Test 2: Verificar autenticación
async function testAuth() {
    try {
        const response = await fetch('http://localhost:8081/Token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: '1234' })
        });
        console.log('✅ Endpoint de autenticación responde');
        return true;
    } catch (error) {
        console.log('❌ Error en autenticación:', error.message);
        return false;
    }
}

// Test 3: Verificar GraphQL
async function testGraphQL() {
    try {
        const response = await fetch('http://localhost:9000/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: '{ __typename }' 
            })
        });
        console.log('✅ GraphQL endpoint accesible');
        return true;
    } catch (error) {
        console.log('❌ GraphQL no responde:', error.message);
        return false;
    }
}

// Ejecutar pruebas
async function runTests() {
    console.log('\n🔍 EJECUTANDO PRUEBAS...\n');
    
    const serverOk = await testServer();
    const authOk = await testAuth();
    const graphqlOk = await testGraphQL();
    
    console.log('\n📊 RESULTADOS:');
    console.log(`Servidor Web: ${serverOk ? '✅' : '❌'}`);
    console.log(`Autenticación: ${authOk ? '✅' : '❌'}`);
    console.log(`GraphQL: ${graphqlOk ? '✅' : '❌'}`);
    
    if (serverOk && authOk) {
        console.log('\n🎉 SISTEMA LISTO PARA USAR');
        console.log('👉 Ve a: http://localhost:8081');
    } else {
        console.log('\n⚠️ HAY PROBLEMAS EN EL SISTEMA');
    }
}

// Solo ejecutar si estamos en un navegador
if (typeof window !== 'undefined') {
    runTests();
} else {
    module.exports = { testServer, testAuth, testGraphQL, runTests };
} 