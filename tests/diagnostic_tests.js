/**
 * TESTS DIAGNÓSTICOS - PMPOS
 * Identifica problemas específicos en la aplicación
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TESTS DIAGNÓSTICOS PMPOS - BÚSQUEDA DE PROBLEMAS\n');

// ============================================
// TEST 1: VERIFICAR IMPORTS/EXPORTS
// ============================================
console.log('📋 TEST 1: Verificación de Imports/Exports');

function checkImportsExports() {
    let issuesFound = 0;
    
    // Verificar POSView.jsx
    try {
        const posViewContent = fs.readFileSync('app/components/POS/POSView.jsx', 'utf8');
        
        // Verificar imports problemáticos
        const imports = posViewContent.match(/import.*from ['"]([^'"]+)['"]/g) || [];
        
        imports.forEach(importLine => {
            if (importLine.includes('../services/')) {
                console.log('❌ Import problemático encontrado:', importLine);
                issuesFound++;
            }
            if (importLine.includes('../../services/')) {
                console.log('✅ Import correcto encontrado:', importLine);
            }
        });
        
        // Verificar que las funciones existen
        const hasFunctionCalls = [
            'addOrderToTicketModern',
            'paymentService',
            'automationService'
        ];
        
        hasFunctionCalls.forEach(func => {
            if (posViewContent.includes(func)) {
                console.log(`✅ Función ${func} referenciada`);
            } else {
                console.log(`❌ Función ${func} NO encontrada`);
                issuesFound++;
            }
        });
        
    } catch (error) {
        console.log('❌ Error leyendo POSView.jsx:', error.message);
        issuesFound++;
    }
    
    console.log(`   📊 Problemas de imports: ${issuesFound}`);
    return issuesFound === 0;
}

// ============================================
// TEST 2: VERIFICAR DUPLICADOS EN QUERIES
// ============================================
console.log('\n📋 TEST 2: Verificación de Duplicados en Queries');

function checkQueryDuplicates() {
    let duplicatesFound = 0;
    
    try {
        const queriesContent = fs.readFileSync('app/queries.js', 'utf8');
        
        // Buscar funciones duplicadas
        const functionMatches = queriesContent.match(/(?:export\s+)?(?:const|function)\s+(\w+)/g) || [];
        const functionNames = functionMatches.map(match => {
            const name = match.match(/(?:export\s+)?(?:const|function)\s+(\w+)/);
            return name ? name[1] : '';
        }).filter(Boolean);
        
        // Detectar duplicados
        const nameCount = {};
        functionNames.forEach(name => {
            nameCount[name] = (nameCount[name] || 0) + 1;
        });
        
        Object.entries(nameCount).forEach(([name, count]) => {
            if (count > 1) {
                console.log(`❌ Función duplicada: ${name} (${count} veces)`);
                duplicatesFound++;
            }
        });
        
        if (duplicatesFound === 0) {
            console.log('✅ Sin funciones duplicadas');
        }
        
    } catch (error) {
        console.log('❌ Error verificando queries.js:', error.message);
        duplicatesFound++;
    }
    
    console.log(`   📊 Duplicados encontrados: ${duplicatesFound}`);
    return duplicatesFound === 0;
}

// ============================================
// TEST 3: VERIFICAR SERVICIOS
// ============================================
console.log('\n📋 TEST 3: Verificación de Servicios');

function checkServices() {
    let serviceIssues = 0;
    
    const servicesToCheck = [
        'app/services/paymentService.js',
        'app/services/automationService.js',
        'app/services/tokenService.js'
    ];
    
    servicesToCheck.forEach(servicePath => {
        try {
            const serviceContent = fs.readFileSync(servicePath, 'utf8');
            
            // Verificar que exporta funciones
            if (serviceContent.includes('export ') || serviceContent.includes('module.exports')) {
                console.log(`✅ ${servicePath} - Exporta correctamente`);
                
                // Verificar funciones específicas
                if (servicePath.includes('paymentService')) {
                    if (serviceContent.includes('processPayment') && serviceContent.includes('calculateTotal')) {
                        console.log('   ✅ PaymentService tiene funciones principales');
                    } else {
                        console.log('   ❌ PaymentService falta funciones principales');
                        serviceIssues++;
                    }
                }
                
                if (servicePath.includes('tokenService')) {
                    if (serviceContent.includes('getValidAccessToken')) {
                        console.log('   ✅ TokenService tiene getValidAccessToken');
                    } else {
                        console.log('   ❌ TokenService falta getValidAccessToken');
                        serviceIssues++;
                    }
                }
                
            } else {
                console.log(`❌ ${servicePath} - No exporta funciones`);
                serviceIssues++;
            }
            
        } catch (error) {
            console.log(`❌ ${servicePath} - Error: ${error.message}`);
            serviceIssues++;
        }
    });
    
    console.log(`   📊 Problemas en servicios: ${serviceIssues}`);
    return serviceIssues === 0;
}

// ============================================
// TEST 4: VERIFICAR APOLLO SETUP
// ============================================
console.log('\n📋 TEST 4: Verificación de Apollo Setup');

function checkApolloSetup() {
    let apolloIssues = 0;
    
    try {
        const apolloContent = fs.readFileSync('app/apollo.js', 'utf8');
        
        // Verificar que usa getValidAccessToken
        if (apolloContent.includes('getValidAccessToken')) {
            console.log('✅ Apollo usa getValidAccessToken');
        } else if (apolloContent.includes('getToken')) {
            console.log('❌ Apollo usa getToken obsoleto');
            apolloIssues++;
        } else {
            console.log('❌ Apollo no tiene configuración de token');
            apolloIssues++;
        }
        
        // Verificar que el authLink es async
        if (apolloContent.includes('async (_, { headers })') || apolloContent.includes('async function')) {
            console.log('✅ AuthLink es async');
        } else {
            console.log('❌ AuthLink no es async');
            apolloIssues++;
        }
        
    } catch (error) {
        console.log('❌ Error verificando apollo.js:', error.message);
        apolloIssues++;
    }
    
    console.log(`   📊 Problemas en Apollo: ${apolloIssues}`);
    return apolloIssues === 0;
}

// ============================================
// TEST 5: VERIFICAR PACKAGE.JSON DEPENDENCIES
// ============================================
console.log('\n📋 TEST 5: Verificación de Dependencies');

function checkDependencies() {
    let dependencyIssues = 0;
    
    try {
        const packageContent = fs.readFileSync('package.json', 'utf8');
        const packageData = JSON.parse(packageContent);
        
        const requiredDeps = [
            '@apollo/client',
            'graphql',
            'react',
            'react-dom',
            '@mui/material'
        ];
        
        requiredDeps.forEach(dep => {
            if (packageData.dependencies && packageData.dependencies[dep]) {
                console.log(`✅ Dependency encontrada: ${dep}`);
            } else if (packageData.devDependencies && packageData.devDependencies[dep]) {
                console.log(`✅ DevDependency encontrada: ${dep}`);
            } else {
                console.log(`❌ Dependency faltante: ${dep}`);
                dependencyIssues++;
            }
        });
        
    } catch (error) {
        console.log('❌ Error verificando package.json:', error.message);
        dependencyIssues++;
    }
    
    console.log(`   📊 Problemas en dependencies: ${dependencyIssues}`);
    return dependencyIssues === 0;
}

// ============================================
// TEST 6: VERIFICAR WEBPACK CONFIG
// ============================================
console.log('\n📋 TEST 6: Verificación de Webpack Config');

function checkWebpackConfig() {
    let webpackIssues = 0;
    
    try {
        const webpackContent = fs.readFileSync('webpack.config.js', 'utf8');
        
        // Verificar configuración de proxy
        if (webpackContent.includes('/api') && webpackContent.includes('9000')) {
            console.log('✅ Proxy API configurado correctamente');
        } else {
            console.log('❌ Proxy API mal configurado');
            webpackIssues++;
        }
        
        // Verificar que el puerto es 8081
        if (webpackContent.includes('8081')) {
            console.log('✅ Puerto 8081 configurado');
        } else {
            console.log('❌ Puerto 8081 no configurado');
            webpackIssues++;
        }
        
    } catch (error) {
        console.log('❌ Error verificando webpack.config.js:', error.message);
        webpackIssues++;
    }
    
    console.log(`   📊 Problemas en webpack: ${webpackIssues}`);
    return webpackIssues === 0;
}

// ============================================
// EJECUTAR TODOS LOS TESTS DIAGNÓSTICOS
// ============================================
async function runDiagnosticTests() {
    console.log('🚀 EJECUTANDO TESTS DIAGNÓSTICOS...\n');
    
    const results = [
        checkImportsExports(),
        checkQueryDuplicates(),
        checkServices(),
        checkApolloSetup(),
        checkDependencies(),
        checkWebpackConfig()
    ];
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n📊 RESUMEN DE TESTS DIAGNÓSTICOS');
    console.log('===============================================');
    console.log(`✅ Tests pasados: ${passedTests}`);
    console.log(`❌ Tests fallidos: ${failedTests}`);
    console.log(`📈 Porcentaje éxito: ${Math.round((passedTests/totalTests)*100)}%`);
    console.log('===============================================');
    
    if (failedTests === 0) {
        console.log('🎉 DIAGNÓSTICO: CÓDIGO PARECE ESTAR BIEN CONFIGURADO');
        console.log('💡 Problema puede estar en:');
        console.log('   • Conexión con SambaPOS (puerto 9000)');
        console.log('   • Autenticación/Token');
        console.log('   • Variables de entorno');
        console.log('   • CORS o proxy issues');
    } else {
        console.log('🔧 PROBLEMAS ENCONTRADOS QUE NECESITAN CORRECCIÓN:');
        console.log('   • Revisar imports/exports');
        console.log('   • Eliminar duplicados');
        console.log('   • Verificar configuración de servicios');
    }
    
    console.log('\n🔍 PRÓXIMA ACCIÓN RECOMENDADA:');
    if (failedTests > 0) {
        console.log('   • Corregir problemas de código identificados');
    } else {
        console.log('   • Verificar logs del navegador en DevTools');
        console.log('   • Verificar que SambaPOS esté corriendo');
        console.log('   • Probar autenticación manualmente');
    }
}

// Ejecutar tests
runDiagnosticTests(); 