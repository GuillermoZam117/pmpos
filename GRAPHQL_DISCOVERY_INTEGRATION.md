# Integración del Discovery GraphQL como Fuente Única de Verdad

Este documento describe el plan para consolidar todo el uso de GraphQL en un solo
servicio y set de queries canónicas, basado en el discovery ubicado en
"documentacion nueva graphql". Incluye pasos, alcance, criterios de aceptación y
categorías de cambios iniciales en código.

## Objetivo
- Centralizar ejecución y definición de queries/mutations.
- Eliminar duplicación de lógica y clientes alternos.
- Facilitar mantenimiento, pruebas y observabilidad.

## Fuente de Verdad
- Executor: `app/services/graphqlService.js` exporta `gql`, `graphqlRequest`, `gqlEscape`, `getToken`.
- Queries canónicas: `app/graphql/queries.js` (constantes importables).
- Endpoint: `app/utils/gqlEndpoint.js`.
- Auth: `app/services/tokenService.js`.

## Alcance y Lineamientos
- Consumidores (servicios): `paymentService.js`, `ticketService.js`, `orderService.js`, `menuService.js`.
- Orquestador: `app/queries.js` (read-service + fallback), delegando a `graphqlService` para GraphQL.
- Estándar de uso: `graphqlRequest(query, variables)`; evitar concatenación manual.
- Deprecados: `app/graphql-simple.js`, `app/services/graphql-helper.js` (se eliminarán tras migración completa).

## Plan por Fases
1) Definir queries canónicas
- Crear `app/graphql/queries.js` con constantes: tickets, pagos, menú, productos, entidades.
- Basado en discovery: QUERIES BASICOS, COBRO DE TICKETS, flujos de órdenes, reapertura.

2) Migración de servicios prioritarios
- `paymentService.js`: usar constantes y `graphqlRequest` (pago, cierre de ticket, recálculo/lectura).
- `ticketService.js`: usar constantes para obtener/cargar/cambiar entidad y leer detalles de ticket.

3) Orquestación
- `queries.js`: asegurar que llamadas GraphQL internas usen `gql`/`graphqlRequest` y/o importen constantes comunes.

4) Limpieza
- Borrar `*-backup*`, `*-disabled*`, `*-old*`, `*-apollo-*`, `*new*/*clean*` sin uso, y módulos vacíos.
- Condición: 0 importaciones activas y tests verdes.

## Criterios de Aceptación
- Un solo executor y un solo set de queries compartidas en código activo.
- 0 referencias a `graphql-simple` / `graphql-helper`.
- Flujos críticos (pagos y tickets) funcionando con `graphqlRequest`.
- Sin concatenación manual de variables.

## Notas de Implementación
- `graphqlRequest` normaliza variables insertándolas inline y elimina el bloque `(vars) {`.
- Mantener nombres y shapes del discovery para minimizar regresiones.

