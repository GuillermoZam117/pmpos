# Guía: Flujo de Ticket de Terminal (GraphQL)

Esta guía resume el flujo que funcionó correctamente para registrar el terminal, abrir un ticket de terminal, agregar una orden, asignar la mesa y cerrar/desregistrar el terminal, incluyendo los queries exactos usados y sus respuestas reales de tu entorno.

## 0) Registrar Terminal (inicio de sesión de terminal)
Query (inline, sin variables). Todos los parámetros son obligatorios y deben existir en SambaPOS. Importante: `user` DEBE ser el usuario autenticado por PIN en la app (no un usuario fijo):
```graphql
mutation {
  registerTerminal(
    ticketType: "COMEDOR",
    terminal: "SERVIDOR",
    department: "MESAS",
    user: "<USUARIO_LOGUEADO>"
  )
}
```
Respuesta típica (devuelve el terminalId):
```json
{
  "data": {
    "registerTerminal": "DeV8q7epFUGWL-dKKurTmw"
  }
}
```

Nota en la app: el código pasa el usuario logueado (PIN) a `registerTerminal` automáticamente (ver `auth.js` → `terminalService.ensureTerminalRegistered(result.user.name)` y `queries.js` → `registerTerminalAsync(userOverride)`). No es necesario fijarlo por `.env` salvo pruebas.

## 1) Crear Ticket de Terminal
Query (inline, sin variables):
```graphql
mutation CreateTerminalTicket {
  createTerminalTicket(terminalId: "DeV8q7epFUGWL-dKKurTmw") {
    uid
    totalAmount
  }
}
```
Respuesta observada:
```json
{
  "data": {
    "createTerminalTicket": {
      "uid": "v2QE_wQj30WypfVf2haPAA",
      "totalAmount": 0
    }
  },
  "errors": null
}
```

## 2) Agregar Orden al Ticket del Terminal
Query:
```graphql
mutation {
  addOrderToTerminalTicket(
    terminalId: "DeV8q7epFUGWL-dKKurTmw",
    productName: "CUARTO POLLO",
    quantity: 1,
    portion: "Normal"
  ) {
    totalAmount
    remainingAmount
  }
}
```
Respuesta observada:
```json
{
  "data": {
    "addOrderToTerminalTicket": {
      "totalAmount": 65,
      "remainingAmount": 65
    }
  },
  "errors": null
}
```

## 3) Asignar Mesa al Ticket del Terminal
Importante: el tipo de entidad es sensible a mayúsculas y en tu server es `Mesas` (no `MESAS`).

Query:
```graphql
mutation {
  changeEntityOfTerminalTicket(
    terminalId: "DeV8q7epFUGWL-dKKurTmw",
    type: "Mesas",
    name: "2"
  ) {
    id
    entities { name type }
  }
}
```
Respuesta observada:
```json
{
  "data": {
    "changeEntityOfTerminalTicket": {
      "id": 0,
      "entities": [ { "name": "2", "type": "Mesas" } ]
    }
  },
  "errors": null
}
```
Verificación del ticket del terminal:
```graphql
query {
  getTerminalTicket(terminalId: "DeV8q7epFUGWL-dKKurTmw") {
    id
    entities { name type }
  }
}
```
Respuesta observada:
```json
{
  "data": {
    "getTerminalTicket": {
      "id": 0,
      "entities": [ { "name": "2", "type": "Mesas" } ]
    }
  },
  "errors": null
}
```

## 4) Cerrar Ticket del Terminal
Query:
```graphql
mutation {
  closeTerminalTicket(terminalId: "DeV8q7epFUGWL-dKKurTmw")
}
```

## 6) Desregistrar Terminal (fin de sesión)
Ejecutar al finalizar la sesión del terminal:
```graphql
mutation {
  unregisterTerminal(terminalId: "DeV8q7epFUGWL-dKKurTmw")
}
```

## 5) Ver Estado de Mesas
Para validar el cambio visual en TableView (por polling):
```graphql
query {
  getEntityScreenItems(name: "MESAS") {
    name
    color
  }
}
```

## Notas y buenas prácticas
- Siempre incluye `terminalId` en mutaciones de terminal (si falta, el server lanza errores NRE/ArgumentNull).
- Usa argumentos inline (sin variables) para mejor compatibilidad.
- Respeta mayúsculas: `type` = `Mesas`, `screen` = `MESAS`.
- Si aparece “No ticket open on terminal”, ejecuta primero `createTerminalTicket` y reintenta.
