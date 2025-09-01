# PMPOS Enhanced Logging System

Sistema de logging completo para PMPOS que incluye tanto logging en consola como archivos persistentes. Cada request tiene un ID único que permite rastrear las operaciones de principio a fin.

## 📁 Almacenamiento de Logs

### Frontend (Browser)
Los logs del frontend ahora se **envían automáticamente** al backend para guardar en archivos:

- **Automático**: Se envían cada 30 segundos al backend
- **LocalStorage**: Backup local con máximo 500 logs por día  
- **Archivos**: Se guardan automáticamente en `logs/frontend-api-YYYY-MM-DD.log` y `logs/frontend-graphql-YYYY-MM-DD.log`
- **Exportación**: También disponible exportación manual desde browser

### Backend (Read-Service)
Los logs del backend se guardan en archivos con rotación diaria:

- `logs/api-YYYY-MM-DD.log` - Requests/responses de API REST del backend
- `logs/graphql-YYYY-MM-DD.log` - Operaciones GraphQL del backend  
- `logs/error-YYYY-MM-DD.log` - Solo errores del backend (se mantienen 30 días)
- `logs/frontend-api-YYYY-MM-DD.log` - **NUEVO**: Logs de API del frontend (automático)
- `logs/frontend-graphql-YYYY-MM-DD.log` - **NUEVO**: Logs de GraphQL del frontend (automático)

**Configuración backend:**
- Rotación diaria automática
- Máximo 50MB por archivo (API/GraphQL)
- Máximo 100MB por archivo (errores)
- Se conservan 14 días (30 días para errores)

## Uso Básico

```bash
# Frontend logging (consola + archivos)
set DEBUG=pmpos:frontend:*
npm start

# Backend logging (read-service)
set DEBUG=pmpos:*
cd server && npm run dev

# Todo el logging
set DEBUG=pmpos:*
npm start
```

## Niveles de Debug

```bash
# === FRONTEND ===
# API requests/responses
set DEBUG=pmpos:frontend:requests

# API request/response bodies
set DEBUG=pmpos:frontend:requests:body

# GraphQL operations
set DEBUG=pmpos:frontend:graphql

# GraphQL bodies y variables
set DEBUG=pmpos:frontend:graphql:body

# === BACKEND (Read-Service) ===
# Logging de requests/responses
set DEBUG=pmpos:read-service:requests

# Solo logging de cuerpos de request/response
set DEBUG=pmpos:read-service:requests:body  

# Solo logging de autenticación
set DEBUG=pmpos:read-service:auth

# Logging del servicio principal
set DEBUG=pmpos:read-service

# === TODO EL SISTEMA ===
set DEBUG=pmpos:*
```

## Qué Muestra el Logging

### Frontend API Request Log
```
🟦 [abc123def] POST /api/graphql { contentType: 'application/json', hasAuth: true }
📤 [abc123def] Request body: { "query": "mutation registerTerminal...", "variables": {...} }
🟢 [abc123def] 200 POST /api/graphql - 156ms
📥 [abc123def] Response body: { "data": { "registerTerminal": "uuid-123" } }
```

### GraphQL Operation Log
```
🟦 [abc123def] GraphQL mutation: registerTerminal
📤 [abc123def] Variables: { terminal: "SERVIDOR", department: "MESAS", user: "admin" }
📋 [abc123def] Operation: mutation registerTerminal($terminal: String!) { registerTerminal(...) }
🟢 [abc123def] GraphQL mutation registerTerminal - 156ms
📥 [abc123def] GraphQL Data: { registerTerminal: "uuid-12345" }
```

### Error Log
```
🟡 [abc123def] GraphQL mutation registerTerminal - 2500ms
❌ [abc123def] GraphQL Error 1: Terminal already registered
⚠️  [abc123def] SLOW GraphQL: 2500ms for mutation registerTerminal
🔴 [abc123def] FETCH ERROR POST /api/graphql - 5000ms: Network timeout
```

### Backend Read-Service Log
```
🟦 [xyz789abc] GET /internal-api/active-tickets { query: {limit: 10}, ip: '::1' }
📦 [xyz789abc] Cache hit: returning 25 active tickets
🟢 [xyz789abc] 200 GET /internal-api/active-tickets - 45ms
📥 [xyz789abc] Response body: { "type": "Array", "length": 25, "truncated": true }
```

### Auth Log (Backend)
```
🔓 [xyz789abc] Authorized for GET /internal-api/active-tickets
🔐 [xyz789abc] Unauthorized: got=***-456 expected=***-123 for GET /internal-api/active-tickets
```

## Colores de Status

- 🟢 **2xx** - Éxito
- 🔵 **3xx** - Redirección
- 🟡 **4xx** - Error del cliente
- 🔴 **5xx** - Error del servidor

## Iconos de Operación

- 🟦 **Request entrante**
- 📦 **Cache hit**
- 🔍 **Cache miss/consulta DB**
- 🎫 **Operación específica de tickets**
- 🔓 **Autorización exitosa**
- 🔐 **Autorización fallida**
- ✅ **Operación exitosa**
- ❌ **Error**
- ⚠️ **Advertencia**
- 📥 **Response body**
- 📤 **Request body**

## Beneficios

1. **Trazabilidad**: Cada request tiene un ID único para seguir toda la operación
2. **Performance**: Identifica requests lentos automáticamente
3. **Debugging**: Muestra requests, responses, queries y errores en contexto
4. **Concisión**: Los responses grandes se resumen automáticamente
5. **Seguridad**: Los API keys se enmascaran en los logs

## 📂 Estructura de Archivos de Log

### Archivo API (`logs/api-2025-08-29.log`)
```
2025-08-29 14:30:15.123 [INFO] 🟦 [abc123def] GET /internal-api/active-tickets {"requestId":"abc123def","method":"GET","url":"/internal-api/active-tickets"}
2025-08-29 14:30:15.180 [INFO] 🟢 [abc123def] 200 GET /internal-api/active-tickets - 57ms {"requestId":"abc123def","status":200,"duration":57}
2025-08-29 14:30:15.182 [DEBUG] 📥 [abc123def] API Response {"requestId":"abc123def","body":{"type":"Array","length":15}}
```

### Archivo GraphQL (`logs/graphql-2025-08-29.log`)
```
2025-08-29 14:30:20.450 [INFO] 🟦 [xyz789def] GraphQL mutation: registerTerminal {"requestId":"xyz789def","operationType":"mutation","operationName":"registerTerminal"}
2025-08-29 14:30:20.451 [DEBUG] 📤 [xyz789def] GraphQL Variables {"requestId":"xyz789def","variables":{"terminal":"SERVIDOR","department":"MESAS"}}
2025-08-29 14:30:20.680 [INFO] 🟢 [xyz789def] GraphQL mutation registerTerminal - 230ms {"requestId":"xyz789def","duration":230,"hasErrors":false}
```

### Archivo Error (`logs/error-2025-08-29.log`)
```
2025-08-29 14:30:25.100 [ERROR] 🔴 [def456ghi] GraphQL ERROR - 5000ms {"requestId":"def456ghi","error":"Network timeout","duration":5000}
2025-08-29 14:30:25.101 [ERROR] ❌ [def456ghi] GraphQL Error 1: Connection refused {"requestId":"def456ghi","errorMessage":"Connection refused"}
```

## Ejemplo de Flujo Completo

### Frontend GraphQL + Backend API
```
# Frontend
🟦 [x8k9m2n4] GraphQL mutation: createTerminalTicket
📤 [x8k9m2n4] Variables: { terminalId: "POS-01" }
🟢 [x8k9m2n4] GraphQL mutation createTerminalTicket - 156ms
📥 [x8k9m2n4] GraphQL Data: { createTerminalTicket: { id: "12345", uid: "TKT-001" } }

# Backend API
🟦 [y7j8k5l2] GET /internal-api/tickets/12345/details
🔓 [y7j8k5l2] Authorized for GET /internal-api/tickets/12345/details  
🎫 [y7j8k5l2] Fetching details for ticket 12345
✅ [y7j8k5l2] Ticket 12345 details: 3 orders, 1 payments
🟢 [y7j8k5l2] 200 GET /internal-api/tickets/12345/details - 89ms
📥 [y7j8k5l2] Response body: { "header": {...}, "orders": [...] }
```

## 💾 Exportar Logs del Frontend

Desde la consola del browser puedes usar estos comandos:

```javascript
// Ver estadísticas de logs (localStorage)
getPMPOSLogStats()

// Ver todas las fechas con logs (localStorage)
getAllPMPOSLogDates() 

// Exportar logs de hoy a archivo (desde localStorage)
exportPMPOSLogs()

// Exportar logs de fecha específica (desde localStorage)
exportPMPOSLogs('2025-08-29')

// Limpiar logs de una fecha (localStorage)
clearPMPOSLogs('2025-08-29')

// Ver estado del uploader automático
getLogUploadStats()

// Forzar upload de logs pendientes
forceLogUpload()
```

**Ejemplo de estadísticas:**
```javascript
getPMPOSLogStats()
// {
//   "totalDates": 3,
//   "dates": {
//     "2025-08-29": {
//       "count": 245,
//       "errors": 5,
//       "warnings": 12,
//       "apiRequests": 89,
//       "graphqlRequests": 67
//     }
//   }
// }
```

## ⚡ Funcionamiento Automático

### ✅ Lo que ya NO necesitas hacer:
- **NO** abrir DevTools para exportar logs manualmente
- **NO** recordar hacer backup de logs
- **NO** preocuparte por perder logs del frontend

### 🤖 Lo que pasa automáticamente:
1. **Cada request/GraphQL** se logea en consola Y se guarda para upload
2. **Cada 30 segundos** se envían los logs al backend
3. **El backend** los guarda automáticamente en archivos diarios
4. **Los archivos** se crean automáticamente en `C:\PMPOS\pmpos\logs\`
5. **localStorage** mantiene backup local como respaldo

### 📂 Archivos que se crean automáticamente:
```
C:\PMPOS\pmpos\logs\
├── frontend-api-2025-08-29.log      ← Requests de API del browser
├── frontend-graphql-2025-08-29.log  ← GraphQL del browser  
├── api-2025-08-29.log               ← Backend API requests
├── graphql-2025-08-29.log           ← Backend GraphQL
└── error-2025-08-29.log             ← Solo errores
```

## 🎯 Beneficios del Sistema

1. **Triple Logging**: Consola + localStorage + archivos automáticos
2. **Trazabilidad Completa**: ID único por request en frontend y backend
3. **Performance Monitoring**: Detecta requests lentos automáticamente
4. **Browser Compatible**: No requiere Node.js polyfills para el frontend
5. **Completamente Automático**: Los logs se guardan solos en archivos
6. **Backup Redundante**: localStorage + archivos físicos  
7. **Structured Data**: JSON con metadata para análisis programático
8. **Error Tracking**: Separación clara entre logs normales y errores
9. **GraphQL Específico**: Logging optimizado para operaciones GraphQL
10. **Auto-cleanup**: Previene saturación automáticamente

**🚀 Resultado**: Debugging mucho más efectivo con **logging automático a archivos físicos** sin intervención manual.