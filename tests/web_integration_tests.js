/**
 * TESTS DE INTEGRACIÓN REALES - Aplicación Web PMPOS
 * Prueba la aplicación web real corriendo en localhost:8081
 */

const http = require('http');
const https = require('https');

console.log('🌐 TESTS DE INTEGRACIÓN REALES - APLICACIÓN WEB\n');

// ============================================
// CONFIGURACIÓN
// ============================================
const WEB_APP_URL = 'http://localhost:8081';
const GRAPHQL_URL = 'http://localhost:9000/api/graphql';
const TOKEN_URL = 'http://localhost:9000/Token';

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 10000
        };
        
        const req = client.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testRequest(name, url, expectedStatus = 200) {
    try {
        const response = await makeRequest(url);
        if (response.statusCode === expectedStatus) {
            console.log(`✅ ${name} - Status: ${response.statusCode}`);
            return { success: true, response };
        } else {
            console.log(`❌ ${name} - Expected: ${expectedStatus}, Got: ${response.statusCode}`);
            return { success: false, response };
        }
    } catch (error) {
        console.log(`❌ ${name} - Error: ${error.message}`);
        return { success: false, error };
    }
}

// ============================================
// TEST 1: VERIFICAR QUE LA APLICACIÓN WEB ESTÉ CORRIENDO
// ============================================
console.log('📋 TEST 1: Verificación de Aplicación Web');

async function testWebApp() {
    const result = await testRequest(
        'Aplicación Web Principal',
        WEB_APP_URL
    );
    
    if (result.success) {
        // Verificar que contiene React
        if (result.response.body.includes('react') || result.response.body.includes('webpack')) {
            console.log('   ✅ Aplicación React detectada');
        }
        
        // Verificar que no hay errores evidentes
        if (!result.response.body.includes('500') && !result.response.body.includes('Error')) {
            console.log('   ✅ Sin errores evidentes en HTML');
        }
    }
    
    return result.success;
}

// ============================================
// TEST 2: VERIFICAR ARCHIVOS ESTÁTICOS
// ============================================
console.log('\n📋 TEST 2: Verificación de Archivos Estáticos');

async function testStaticFiles() {
    const staticFiles = [
        '/favicon.ico',
        '/manifest.json'
    ];
    
    let successCount = 0;
    
    for (const file of staticFiles) {
        const result = await testRequest(
            `Archivo estático: ${file}`,
            WEB_APP_URL + file
        );
        if (result.success) successCount++;
    }
    
    console.log(`   📊 Archivos estáticos: ${successCount}/${staticFiles.length}`);
    return successCount > 0;
}

// ============================================
// TEST 3: VERIFICAR BACKEND SAMBAPOS
// ============================================
console.log('\n📋 TEST 3: Verificación de Backend SambaPOS');

async function testBackend() {
    let backendOk = false;
    
    // Test GraphQL endpoint
    try {
        const graphqlResult = await testRequest(
            'GraphQL Endpoint',
            GRAPHQL_URL,
            405 // POST expected, GET returns 405
        );
        if (graphqlResult.success) {
            console.log('   ✅ GraphQL endpoint respondiendo');
            backendOk = true;
        }
    } catch (error) {
        console.log('   ⚠️ GraphQL endpoint no disponible');
    }
    
    // Test Token endpoint
    try {
        const tokenResult = await testRequest(
            'Token Endpoint',
            TOKEN_URL,
            405 // POST expected, GET returns 405
        );
        if (tokenResult.success) {
            console.log('   ✅ Token endpoint respondiendo');
            backendOk = true;
        }
    } catch (error) {
        console.log('   ⚠️ Token endpoint no disponible');
    }
    
    return backendOk;
}

// ============================================
// TEST 4: VERIFICAR RUTAS DE LA APLICACIÓN
// ============================================
console.log('\n📋 TEST 4: Verificación de Rutas');

async function testRoutes() {
    const routes = [
        '/#/',
        '/#/pinpad',
        '/#/tables',
        '/#/pos'
    ];
    
    let successCount = 0;
    
    for (const route of routes) {
        const result = await testRequest(
            `Ruta: ${route}`,
            WEB_APP_URL + route
        );
        if (result.success) successCount++;
    }
    
    console.log(`   📊 Rutas accesibles: ${successCount}/${routes.length}`);
    return successCount > 0;
}

// ============================================
// TEST 5: VERIFICAR WEBPACK DEV SERVER
// ============================================
console.log('\n📋 TEST 5: Verificación de Webpack Dev Server');

async function testWebpack() {
    try {
        const result = await makeRequest(WEB_APP_URL);
        
        if (result.body.includes('webpack') || result.body.includes('__webpack')) {
            console.log('✅ Webpack Dev Server activo');
            return true;
        } else {
            console.log('❌ Webpack Dev Server no detectado');
            return false;
        }
    } catch (error) {
        console.log('❌ Error verificando Webpack:', error.message);
        return false;
    }
}

// ============================================
// TEST 6: VERIFICAR RECURSOS DE APLICACIÓN
// ============================================
console.log('\n📋 TEST 6: Verificación de Recursos');

async function testResources() {
    try {
        const result = await makeRequest(WEB_APP_URL);
        const body = result.body;
        
        // Verificar que se cargan los bundles de JavaScript
        const hasJavaScript = body.includes('.js') || body.includes('script');
        if (hasJavaScript) {
            console.log('✅ Archivos JavaScript referenciados');
        }
        
        // Verificar que no hay errores 404 evidentes
        const hasNoErrors = !body.includes('404') && !body.includes('Not Found');
        if (hasNoErrors) {
            console.log('✅ Sin errores 404 evidentes');
        }
        
        return hasJavaScript && hasNoErrors;
    } catch (error) {
        console.log('❌ Error verificando recursos:', error.message);
        return false;
    }
}

// ============================================
// EJECUTAR TODOS LOS TESTS
// ============================================
async function runAllTests() {
    console.log('🚀 EJECUTANDO TESTS DE INTEGRACIÓN WEB...\n');
    
    const results = [];
    
    // Ejecutar tests secuencialmente
    results.push(await testWebApp());
    results.push(await testStaticFiles());
    results.push(await testBackend());
    results.push(await testRoutes());
    results.push(await testWebpack());
    results.push(await testResources());
    
    // Calcular resultados
    const totalTests = results.length;
    const passedTests = results.filter(r => r).length;
    const failedTests = totalTests - passedTests;
    
    // Mostrar resumen
    console.log('\n📊 RESUMEN DE TESTS DE INTEGRACIÓN WEB');
    console.log('===============================================');
    console.log(`✅ Tests pasados: ${passedTests}`);
    console.log(`❌ Tests fallidos: ${failedTests}`);
    console.log(`📈 Porcentaje éxito: ${Math.round((passedTests/totalTests)*100)}%`);
    console.log('===============================================');
    
    if (passedTests === totalTests) {
        console.log('🎉 RESULTADO: APLICACIÓN WEB FUNCIONANDO CORRECTAMENTE');
    } else if (passedTests > totalTests / 2) {
        console.log('⚠️ RESULTADO: APLICACIÓN PARCIALMENTE FUNCIONAL');
    } else {
        console.log('❌ RESULTADO: APLICACIÓN CON PROBLEMAS SERIOS');
    }
    
    console.log('\n💡 RECOMENDACIONES:');
    if (failedTests > 0) {
        console.log('• Verificar que SambaPOS esté corriendo en puerto 9000');
        console.log('• Verificar que webpack-dev-server esté en puerto 8081');
        console.log('• Revisar logs de consola del navegador');
        console.log('• Verificar conexión de red');
    } else {
        console.log('• Aplicación web está funcionando correctamente');
        console.log('• Puedes acceder en: http://localhost:8081');
    }
}

// Ejecutar tests
runAllTests().catch(error => {
    console.error('❌ Error fatal ejecutando tests:', error);
}); 