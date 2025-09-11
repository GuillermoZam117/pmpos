# Auditoría de GraphQL y Detección de Duplicados

Este documento planifica un análisis completo del repositorio para identificar y consolidar lógica GraphQL fragmentada, duplicaciones (textuales y semánticas) y servicios redundantes, incluso cuando no comparten el mismo nombre pero exponen métodos equivalentes.

## Objetivo y Alcance
- Unificar el acceso GraphQL alrededor de un único servicio estable.
- Detectar duplicados de funciones/utilidades y rutas de código paralelas.
- Reducir ruido de archivos `*-disabled.js`, `*-backup*.js` y módulos vacíos.
- Alcance: `app/` (componentes, services, utils), `tests/` (patrones de consumo y mocks).

## Estructura Relevante (puntos de atención)
- Núcleo actual: `app/services/graphqlService.js` (executor `gql`, `graphqlRequest`, `gqlEscape`, token).
- Heredados/duplicados: `app/graphql-simple.js`, `app/services/graphql-helper.js`.
- Orquestación: `app/queries.js` (fetch interno + fallback a GraphQL, ya delega a graphqlService).
- Endpoint: `app/utils/gqlEndpoint.js` (+ interceptor opcional).
- Dev helpers: `app/utils/graphqlBasics.js` (expuestos en `window.*`).
- Consumidores: `app/services/*Service.js` (ej. `paymentService.js`, `ticketService.js`).
- Ruido: `*-apollo-*.js`, `*-disabled.js`, `*-backup*.js`, archivos vacíos (`graphqlFlowService.js`, `hooks/useGraphQLFlow.js`).

## Criterios de Duplicación
- API equivalente: funciones con mismo propósito/contrato (p. ej., `graphqlSimple` vs `gql`).
- Utilidades repetidas: `gqlEscape`, `graphqlRequest` con lógica similar.
- Queries/mutations idénticas o equivalentes (mismo campo/shape, distinta sintaxis).
- Manejo de token/endpoint/timeouts replicado en múltiples archivos.

## Metodología (3 pasadas)
1) Inventario y Mapa de Importaciones
- Listar todas las referencias a GraphQL: `gql`, `graphqlRequest`, `graphqlSimple`, `@apollo/client`, `graphql-request`, `GraphQL`.
- Construir un grafo (archivo → dependencias GraphQL) para ver concentraciones y rutas paralelas.

2) Detección de Duplicados
- Textual: normalizar y comparar cuerpos de funciones utilitarias (hash por AST/espacios) y queries (minificado, sin variables, sin whitespace).
- Semántica: agrupar por nombre/signatura/props devueltas (p. ej., `getTerminalTicket`, `payTerminalTicket`, `getEntityScreenItems`, `getMenu`, `getProducts`, `getOpenTickets`).
- Importaciones dobles: detectar módulos que exportan lo mismo con distinta ruta.

3) Validación y Agrupación
- Revisar falsos positivos, decidir “fuente de verdad”, preparar propuesta de consolidación por paquete (services, utils, queries compartidas).

## Comandos y Scripts (no PowerShell)
- Búsqueda rápida (ripgrep):
  - `rg -n "gql\(|graphqlRequest|graphqlSimple|@apollo/client|graphql-request|GraphQL" app tests`
  - `rg -n "getTerminalTicket|payTerminalTicket|getEntityScreenItems|getMenu|getProducts|getTickets" app`
- Duplicados de utilidades por nombre:
  - `rg -n "gqlEscape|graphqlRequest" app`
- Normalización de queries (Node, ejemplo mínimo):
```js
// scripts/scan-graphql-duplicates.js
const fs = require('fs');
const path = require('path');
const files = [];
(function walk(dir){
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(jsx?|ts)$/.test(e)) files.push(p);
  }
})(path.resolve('app'));

const normQuery = q => q
  .replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, 'VAR')      // variables → marcador
  .replace(/\([^)]*VAR[^)]*\)\s*\{/g, ' {')       // def. variables → fuera
  .replace(/\s+/g, ' ')                             // colapsar espacios
  .trim();

const seen = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const matches = src.match(/`[\s\S]*?`/g) || [];
  for (const m of matches) {
    if (m.includes('query') || m.includes('mutation')) {
      const nq = normQuery(m.slice(1, -1));
      const arr = seen.get(nq) || [];
      arr.push(f);
      seen.set(nq, arr);
    }
  }
}
for (const [q, locs] of seen) {
  if (locs.length > 1) {
    console.log('DUP QUERY x' + locs.length + ':', locs.join(' | '));
  }
}
```

## Entregables
- Inventario: lista de puntos GraphQL (archivos, funciones, llamadas).
- Matriz de duplicación: utilidades, queries y métodos equivalentes por grupo.
- Recomendaciones de consolidación: archivo destino, APIs a mantener, deprecaciones.
- Plan de PRs: lotes pequeños y seguros con validación por tests.

## Sospechosos a Priorizar (repo actual)
- `graphqlService.js` vs `graphql-simple.js` vs `services/graphql-helper.js` (duplicación de executor/escape/request).
- `queries.js` con fallback a GraphQL: asegurar que delega 100% en `graphqlService` para llamadas GQL.
- `paymentService.js` y `ticketService.js`: uso de `graphqlSimple` y concatenación de strings → migrar a `graphqlRequest`.
- `utils/graphqlBasics.js`: helpers dev; revisar si duplican lógica de servicios.
- Archivos `*-apollo-*`, `*-disabled.js`, `*-backup*.js`, y vacíos: candidatos a eliminar o mover a `archive/`.

## Remediación y Unificación
- Fuente de verdad: `app/services/graphqlService.js` (exporta `gql`, `graphqlRequest`, `gqlEscape`, `getToken`).
- Migración de imports: reemplazar todos los `from '../graphql-simple'` y `from './graphql-helper'` por `from './graphqlService'`.
- Queries compartidas: opcional crear `app/graphql/` para strings comunes (importadas por servicios/queries).
- Errores/timeout: estandarizar manejo en `graphqlService` (mensajes concisos, `AbortController`).

## Política de Limpieza y Eliminación
- Criterio: borrar archivos `*-backup*`, `*-disabled*`, `*-old*`, `*-apollo-*`, variantes `*new*`/`*clean*` sin referencias, y módulos vacíos.
- Momento: ejecutar tras migrar a `graphqlService` y validar tests.
- Seguridad: confirmar 0 importaciones activas antes de borrar; si hay dudas, mover a `archive/` temporal.

### Lista inicial de candidatos a eliminar
- `app/apollo-disabled.js`
- `app/hooks/useGraphQLFlow-disabled.js`
- `app/services/automationService-apollo-backup.js`
- `app/services/paymentService-apollo-backup.js`
- `app/services/ticketService-apollo-backup.js`
- `app/services/graphqlFlowService-disabled.js`
- `app/utils/graphqlClient-disabled.js`
- `app/components/PaymentFlow-disabled.jsx`
- `app/components/TicketFlow-disabled.jsx`
- `app/components/POS/POSViewMobile-backup-old.jsx`
- `app/services/graphqlFlowService.js` (vacío)
- `app/hooks/useGraphQLFlow.js` (vacío)
- `app/components/POS/POSViewMobile-clean.jsx` (borrar solo si no hay imports)
- `app/graphql-simple.js` y `app/services/graphql-helper.js` (borrar tras migración a `graphqlService` y verificación de no‑uso)

## Cronograma Sugerido
- Día 1: Inventario + script de queries duplicadas; reporte inicial.
- Día 2: Migrar consumidores prioritarios (`paymentService`, `ticketService`, `queries.js` interno) a `graphqlService`.
- Día 3: Limpiar archivos legacy/disabled/backup; consolidar `gqlEscape`/`graphqlRequest` únicos.
- Día 4: Tests mínimos de integración en `tests/` para tickets/pagos usando el servicio unificado.

## Criterios de Aceptación
- Un solo executor y helper de variables/escape en código activo.
- 0 referencias a `graphql-simple` y `graphql-helper` en `app/`.
- Script de duplicados sin hallazgos críticos (queries/utilidades) o con justificación documentada.
- Tests de servicios críticos pasando y cobertura estable en `coverage/`.

## Notas
- Evitar concatenación manual de variables en queries; preferir `graphqlRequest(query, variables)`.
- Mantener `resolveGqlUrl` como única fuente para endpoint; interceptor opcional documentado.
- Registrar cambios relevantes en `AGENTS.md`/changelog interno y en PRs con evidencia (capturas/logs/tests).
