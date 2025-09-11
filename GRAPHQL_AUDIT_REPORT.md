# Reporte de Auditoría GraphQL

## Resumen
- Archivos escaneados: 126
- Archivos con referencias GraphQL: 30
- Grupos de queries duplicadas: 5
- Duplicados de utilidades (por cuerpo): 0
- Archivos con múltiples clientes GraphQL: 0

## Archivos con GraphQL (top 30)
- C:\PMPOS\pmpos\app\queries.js (peso:2)
- C:\PMPOS\pmpos\app\actions\auth.js (peso:0)
- C:\PMPOS\pmpos\app\components\App.jsx (peso:0)
- C:\PMPOS\pmpos\app\components\OrderTagSelector.jsx (peso:0)
- C:\PMPOS\pmpos\app\components\POS\POSViewMobile.jsx (peso:0)
- C:\PMPOS\pmpos\app\graphql\queries.js (peso:0)
- C:\PMPOS\pmpos\app\services\automationService.js (peso:0)
- C:\PMPOS\pmpos\app\services\dataManager.js (peso:0)
- C:\PMPOS\pmpos\app\services\graphqlService.js (peso:0)
- C:\PMPOS\pmpos\app\services\legacyFallbackOff.js (peso:0)
- C:\PMPOS\pmpos\app\services\menuService.js (peso:0)
- C:\PMPOS\pmpos\app\services\networkHealthService.js (peso:0)
- C:\PMPOS\pmpos\app\services\optimizedQueries.js (peso:0)
- C:\PMPOS\pmpos\app\services\orderService.js (peso:0)
- C:\PMPOS\pmpos\app\services\paymentService.js (peso:0)
- C:\PMPOS\pmpos\app\services\terminalService.js (peso:0)
- C:\PMPOS\pmpos\app\services\ticketService.js (peso:0)
- C:\PMPOS\pmpos\app\services\tokenService.js (peso:0)
- C:\PMPOS\pmpos\app\services\userService.js (peso:0)
- C:\PMPOS\pmpos\app\utils\debug.js (peso:0)
- C:\PMPOS\pmpos\app\utils\fileLogger.js (peso:0)
- C:\PMPOS\pmpos\app\utils\gqlEndpoint.js (peso:0)
- C:\PMPOS\pmpos\app\utils\graphqlBasics.js (peso:0)
- C:\PMPOS\pmpos\app\utils\logExporter.js (peso:0)
- C:\PMPOS\pmpos\app\utils\requestLogger.js (peso:0)
- C:\PMPOS\pmpos\tests\diagnostic_tests.js (peso:0)
- C:\PMPOS\pmpos\tests\integration_test.js (peso:0)
- C:\PMPOS\pmpos\tests\pos_system_test.js (peso:0)
- C:\PMPOS\pmpos\tests\unit_tests_real.js (peso:0)
- C:\PMPOS\pmpos\tests\web_integration_tests.js (peso:0)

## Queries Duplicadas (agrupadas)
- x3: C:\PMPOS\pmpos\app\graphql\queries.js | C:\PMPOS\pmpos\app\services\graphqlService.js | C:\PMPOS\pmpos\app\utils\graphqlBasics.js
- x2: C:\PMPOS\pmpos\app\services\graphqlService.js | C:\PMPOS\pmpos\app\utils\graphqlBasics.js
- x2: C:\PMPOS\pmpos\app\services\graphqlService.js | C:\PMPOS\pmpos\app\utils\graphqlBasics.js
- x2: C:\PMPOS\pmpos\app\services\graphqlService.js | C:\PMPOS\pmpos\app\utils\graphqlBasics.js
- x2: C:\PMPOS\pmpos\app\services\terminalFixService.js | C:\PMPOS\pmpos\app\services\terminalHealthService.js

## Utilidades Duplicadas (por nombre → cuerpo igual)
- No se hallaron utilidades duplicadas por cuerpo.

## Archivos con Múltiples Clientes GraphQL
- No se detectaron importaciones múltiples en el mismo archivo.
