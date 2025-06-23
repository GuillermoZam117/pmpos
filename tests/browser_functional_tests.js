/**
 * TESTS FUNCIONALES DE NAVEGADOR - PMPOS
 * Usa Playwright para probar la aplicación web real
 */

const { chromium } = require('playwright');

console.log('🌐 TESTS FUNCIONALES DE NAVEGADOR - PMPOS\n');

const WEB_APP_URL = 'http://localhost:8081';
let browser;
let page;

// ============================================
// CONFIGURACIÓN
// ============================================
async function setupBrowser() {
    try {
        browser = await chromium.launch({ 
            headless: true,
            timeout: 30000
        });
        page = await browser.newPage();
        
        // Configurar timeout
        page.setDefaultTimeout(10000);
        
        console.log('✅ Navegador iniciado correctamente');
        return true;
    } catch (error) {
        console.log('❌ Error iniciando navegador:', error.message);
        console.log('💡 Sugerencia: Ejecuta "npm install playwright" o "npx playwright install"');
        return false;
    }
}

async function closeBrowser() {
    if (browser) {
        await browser.close();
        console.log('✅ Navegador cerrado');
    }
}

// ============================================
// TEST 1: CARGAR PÁGINA PRINCIPAL
// ============================================
async function testPageLoad() {
    console.log('📋 TEST 1: Carga de Página Principal');
    
    try {
        const response = await page.goto(WEB_APP_URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        
        if (response && response.ok()) {
            console.log('✅ Página cargada correctamente');
            
            // Verificar título
            const title = await page.title();
            console.log(`   📄 Título: ${title}`);
            
            return true;
        } else {
            console.log('❌ Error cargando página');
            return false;
        }
    } catch (error) {
        console.log('❌ Error en carga de página:', error.message);
        return false;
    }
}

// ============================================
// TEST 2: VERIFICAR ERRORES DE CONSOLA
// ============================================
async function testConsoleErrors() {
    console.log('\n📋 TEST 2: Errores de Consola');
    
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        } else if (msg.type() === 'warning') {
            warnings.push(msg.text());
        }
    });
    
    // Esperar un momento para capturar errores
    await page.waitForTimeout(3000);
    
    console.log(`   🚨 Errores encontrados: ${errors.length}`);
    if (errors.length > 0) {
        errors.slice(0, 3).forEach(error => {
            console.log(`      ❌ ${error}`);
        });
        if (errors.length > 3) {
            console.log(`      ... y ${errors.length - 3} errores más`);
        }
    }
    
    console.log(`   ⚠️ Warnings encontrados: ${warnings.length}`);
    if (warnings.length > 0 && warnings.length <= 3) {
        warnings.forEach(warning => {
            console.log(`      ⚠️ ${warning}`);
        });
    }
    
    // Errores críticos que indican problemas serios
    const criticalErrors = errors.filter(error => 
        error.includes('Failed to fetch') ||
        error.includes('404') ||
        error.includes('500') ||
        error.includes('TypeError') ||
        error.includes('ReferenceError')
    );
    
    if (criticalErrors.length === 0) {
        console.log('✅ Sin errores críticos');
        return true;
    } else {
        console.log(`❌ ${criticalErrors.length} errores críticos encontrados`);
        return false;
    }
}

// ============================================
// TEST 3: VERIFICAR ELEMENTOS REACT
// ============================================
async function testReactElements() {
    console.log('\n📋 TEST 3: Elementos React');
    
    try {
        // Esperar que React se monte
        await page.waitForTimeout(2000);
        
        // Verificar que el div root existe
        const rootElement = await page.$('#root');
        if (rootElement) {
            console.log('✅ Elemento root encontrado');
        } else {
            console.log('❌ Elemento root no encontrado');
            return false;
        }
        
        // Verificar que hay contenido React
        const hasReactContent = await page.evaluate(() => {
            const root = document.getElementById('root');
            return root && root.children.length > 0;
        });
        
        if (hasReactContent) {
            console.log('✅ Contenido React renderizado');
            return true;
        } else {
            console.log('❌ Sin contenido React');
            return false;
        }
    } catch (error) {
        console.log('❌ Error verificando React:', error.message);
        return false;
    }
}

// ============================================
// TEST 4: VERIFICAR NAVEGACIÓN
// ============================================
async function testNavigation() {
    console.log('\n📋 TEST 4: Navegación de Rutas');
    
    const routes = [
        { path: '/#/tables', name: 'Tables' },
        { path: '/#/pinpad', name: 'PinPad' },
        { path: '/#/pos', name: 'POS' }
    ];
    
    let successCount = 0;
    
    for (const route of routes) {
        try {
            await page.goto(WEB_APP_URL + route.path, { 
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            
            // Verificar que la URL cambió
            const currentUrl = page.url();
            if (currentUrl.includes(route.path.replace('/#', ''))) {
                console.log(`✅ Ruta ${route.name} accesible`);
                successCount++;
            } else {
                console.log(`❌ Ruta ${route.name} no accesible`);
            }
            
            await page.waitForTimeout(1000);
        } catch (error) {
            console.log(`❌ Error en ruta ${route.name}: ${error.message}`);
        }
    }
    
    console.log(`   📊 Rutas funcionando: ${successCount}/${routes.length}`);
    return successCount > 0;
}

// ============================================
// TEST 5: VERIFICAR REQUESTS DE RED
// ============================================
async function testNetworkRequests() {
    console.log('\n📋 TEST 5: Requests de Red');
    
    const requests = [];
    const failedRequests = [];
    
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method()
        });
    });
    
    page.on('requestfailed', request => {
        failedRequests.push({
            url: request.url(),
            failure: request.failure()
        });
    });
    
    // Recargar página para capturar requests
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log(`   📡 Total requests: ${requests.length}`);
    console.log(`   ❌ Requests fallidos: ${failedRequests.length}`);
    
    // Verificar requests importantes
    const hasJavaScript = requests.some(req => req.url.includes('.js'));
    const hasAPI = requests.some(req => req.url.includes('/api') || req.url.includes('/Token'));
    
    if (hasJavaScript) {
        console.log('✅ Archivos JavaScript cargados');
    }
    
    if (hasAPI) {
        console.log('✅ Requests API detectados');
    }
    
    if (failedRequests.length > 0) {
        console.log('   ⚠️ Requests fallidos:');
        failedRequests.slice(0, 3).forEach(req => {
            console.log(`      ❌ ${req.url}`);
        });
    }
    
    return failedRequests.length < requests.length / 2; // Menos del 50% de fallos
}

// ============================================
// TEST 6: VERIFICAR ELEMENTOS UI
// ============================================
async function testUIElements() {
    console.log('\n📋 TEST 6: Elementos de UI');
    
    try {
        // Ir a página principal
        await page.goto(WEB_APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        // Verificar elementos comunes
        const elements = await page.evaluate(() => {
            return {
                hasButtons: document.querySelectorAll('button').length > 0,
                hasInputs: document.querySelectorAll('input').length > 0,
                hasDivs: document.querySelectorAll('div').length > 0,
                hasHeader: document.querySelectorAll('header, .header').length > 0,
                hasNavigation: document.querySelectorAll('nav, .nav').length > 0
            };
        });
        
        let elementsFound = 0;
        
        if (elements.hasButtons) {
            console.log('✅ Botones encontrados');
            elementsFound++;
        }
        if (elements.hasInputs) {
            console.log('✅ Inputs encontrados');
            elementsFound++;
        }
        if (elements.hasDivs) {
            console.log('✅ Divs encontrados');
            elementsFound++;
        }
        if (elements.hasHeader) {
            console.log('✅ Header encontrado');
            elementsFound++;
        }
        if (elements.hasNavigation) {
            console.log('✅ Navegación encontrada');
            elementsFound++;
        }
        
        console.log(`   📊 Elementos UI: ${elementsFound}/5`);
        return elementsFound >= 3;
    } catch (error) {
        console.log('❌ Error verificando UI:', error.message);
        return false;
    }
}

// ============================================
// EJECUTAR TODOS LOS TESTS
// ============================================
async function runAllBrowserTests() {
    console.log('🚀 EJECUTANDO TESTS FUNCIONALES DE NAVEGADOR...\n');
    
    // Configurar navegador
    const browserReady = await setupBrowser();
    if (!browserReady) {
        console.log('❌ No se puede ejecutar tests de navegador sin Playwright');
        return;
    }
    
    const results = [];
    
    try {
        // Ejecutar tests secuencialmente
        results.push(await testPageLoad());
        results.push(await testConsoleErrors());
        results.push(await testReactElements());
        results.push(await testNavigation());
        results.push(await testNetworkRequests());
        results.push(await testUIElements());
        
    } catch (error) {
        console.log('❌ Error durante tests:', error.message);
    } finally {
        await closeBrowser();
    }
    
    // Calcular resultados
    const totalTests = results.length;
    const passedTests = results.filter(r => r).length;
    const failedTests = totalTests - passedTests;
    
    // Mostrar resumen
    console.log('\n📊 RESUMEN DE TESTS FUNCIONALES DE NAVEGADOR');
    console.log('===============================================');
    console.log(`✅ Tests pasados: ${passedTests}`);
    console.log(`❌ Tests fallidos: ${failedTests}`);
    console.log(`📈 Porcentaje éxito: ${Math.round((passedTests/totalTests)*100)}%`);
    console.log('===============================================');
    
    if (passedTests === totalTests) {
        console.log('🎉 RESULTADO: APLICACIÓN FUNCIONA PERFECTAMENTE EN NAVEGADOR');
    } else if (passedTests > totalTests / 2) {
        console.log('⚠️ RESULTADO: APLICACIÓN PARCIALMENTE FUNCIONAL EN NAVEGADOR');
    } else {
        console.log('❌ RESULTADO: APLICACIÓN CON PROBLEMAS SERIOS EN NAVEGADOR');
    }
    
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('• Revisar errores de consola en DevTools');
    console.log('• Verificar red de requests en DevTools');  
    console.log('• Probar funcionalidad específica manualmente');
    console.log('• Verificar autenticación con SambaPOS');
}

// Verificar si Playwright está disponible
async function checkPlaywright() {
    try {
        require('playwright');
        return true;
    } catch (error) {
        console.log('⚠️ Playwright no está instalado');
        console.log('💡 Para instalar: npm install playwright');
        console.log('💡 Ejecutando tests alternativos...\n');
        return false;
    }
}

// Ejecutar tests
checkPlaywright().then(hasPlaywright => {
    if (hasPlaywright) {
        runAllBrowserTests().catch(error => {
            console.error('❌ Error fatal en tests de navegador:', error);
        });
    } else {
        console.log('🔄 Ejecutando tests de integración web en su lugar...\n');
        // Ejecutar tests de integración web como alternativa
        require('./web_integration_tests.js');
    }
}); 