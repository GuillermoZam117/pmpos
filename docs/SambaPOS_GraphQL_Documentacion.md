# Documentación completa: **SambaPOS GraphQL (Terminal API + Mesas + Flujo de Venta + Diagnóstico)**

Esta guía consolida todo lo que validamos en tus pruebas, con consultas
y mutaciones **reales** que ya ejecutaste con éxito. Está pensada para
pegarse en tu cliente GraphQL de SambaPOS y como referencia técnica para
tu app web.

------------------------------------------------------------------------

## 1) Conceptos clave (cómo piensa la API)

-   **Terminal API = sesiones de usuario.**\
    Todas las operaciones "Terminal..." (por ej. `getTerminalTicket`,
    `createTerminalTicket`, `addOrderToTerminalTicket`, etc.) están
    **aisladas por usuario**.
    -   `registerTerminal()` crea un **terminalId ligado al usuario**
        que hace la llamada.\
    -   Ese usuario sólo ve y manipula **sus** "Terminal Tickets".\
    -   Para ver **todo** el salón o tickets de **otros** usuarios, usa
        `getTickets()` (no "Terminal...").
-   **Mesas (Entities)**
    -   El tipo real sensible a mayúsculas/minúsculas que vimos es
        **`Mesas`** (no "MESAS").\
    -   Para que una mesa se "asigne" a un ticket, el **Ticket Type**
        del ticket debe incluir el **Entity Type `Mesas`** y la **Entity
        Screen** (p. ej. "MESAS") debe apuntar a ese tipo y ticket type.
-   **Ciclo típico de venta (Terminal API)**
  1)  `registerTerminal(ticketType: "...", terminal: "...", department: "...", user:"…")` → 2)
        `createTerminalTicket(terminalId)` → 3) *(opcional)*
        `changeEntityOfTerminalTicket` (mesa) → 4)
        `addOrderToTerminalTicket` → 5) `getTerminalTicket` → 6)
        `closeTerminalTicket` → 7) *(opcional)* `unregisterTerminal`.
-   **Vista global de ocupación**
    -   Usa `getTickets(isClosed:false)` y filtra por
        `entities{ type:"Mesas", name:"<n>" }`.\
    -   Reglas sugeridas:
        -   **LIBRE** si no hay ticket para esa mesa.
        -   **CUENTA** si `remainingAmount > 0` y hay órdenes.
        -   **OCUPADO** si hay órdenes y `remainingAmount === 0` (o en
            curso sin cuenta).

------------------------------------------------------------------------

## 2) Autenticación

### 2.1 Token (OAuth password grant)

**POST** `/Token` (ejemplo `curl`):

    curl -X POST "http://<HOST>:<PUERTO>/Token"   -H "Content-Type: application/x-www-form-urlencoded"   --data "grant_type=password&username=graphiql&password=graphiql&client_id=graphiql"

Respuesta incluye `access_token`, `refresh_token`, expiración, etc.

### 2.2 Encabezado para GraphQL

En tu cliente GraphQL, usa:

``` json
{
  "Authorization": "Bearer <ACCESS_TOKEN>"
}
```

> **Tip:** Evita solicitar `/Token` en cada render. Cachea el
> `access_token` y renueva con `refresh_token` según expiración.

------------------------------------------------------------------------

## 3) Consultas base del sistema

### 3.1 Usuario por PIN

``` graphql
query {
  getUser(pin: "1111") { name }
}
```

### 3.2 Entity Screen (mesas)

``` graphql
query {
  getEntityScreenItems(name: "MESAS") {
    id
    name
    caption
    color
    labelColor
  }
}
```

### 3.3 Tickets abiertos (global, todos los usuarios)

``` graphql
query {
  getTickets(isClosed: false, orderBy: date) {
    id
    number
    totalAmount
    remainingAmount
    entities { type name }
    orders { id menuItemName quantity price }
    states { stateName state }
  }
}
```

### 3.4 Productos (IDs, porciones, tags)

``` graphql
query {
  getProducts {
    id
    name
    groupCode
    barcode
    portions { id name price }
    tags { name value }
  }
}
```

### 3.5 Menú → categorías → productos (IDs y porciones)

``` graphql
query {
  getMenu(name: "MENU") {
    categories {
      name
      menuItems {
        name
        product {
          id
          name
          portions { name price }
        }
      }
    }
  }
}
```

**IDs reales de tus pruebas:** - **POLLOS** - `CUARTO POLLO` → **1781**
(Normal: 65) - `POLLO` → **1783** (Normal: 210) - **EXTRAS** -
`PAPAS AL AJILLO` → **1790** (ORD: 25 \| MEDIA ORD: 15) - `TORTILLAS` →
**1794** (MEDIO KG: 15 \| CUARTO KG: 8)

------------------------------------------------------------------------

## 4) Flujo completo **Terminal API**

> Usa la **forma simple** de registro (solo `user`) salvo que tu build
> exija más campos.

### 4.1 Registrar Terminal (forma completa)

La mutación `registerTerminal` normalmente requiere los parámetros completos: `ticketType`, `terminal`, `department` y `user`.

``` graphql
mutation {
  registerTerminal(
    ticketType: "Ticket",
    terminal: "POS-01",
    department: "Restaurant",
    user: "graphiql"
  )
}
```

**Ejemplo de respuesta:**\
`"grXZzqACJ0izZ3eLqo5ByQ"` ← **terminalId** (guárdalo)

### 4.2 Crear Ticket del Terminal

``` graphql
mutation {
  createTerminalTicket(terminalId: "grXZzqACJ0izZ3eLqo5ByQ") {
    uid
    totalAmount
  }
}
```

### 4.3 Asignar Mesa (entidad)

``` graphql
mutation {
  changeEntityOfTerminalTicket(
    terminalId: "grXZzqACJ0izZ3eLqo5ByQ"
    entityTypeName: "Mesas"
    entityName: "4"
  )
}
```

### 4.4 Agregar Órdenes

``` graphql
mutation {
  addOrderToTerminalTicket(
    terminalId: "grXZzqACJ0izZ3eLqo5ByQ"
    productId: 1781
    portion: "Normal"
    quantity: 1
  ) { totalAmount }
}
```

### 4.5 Verificar Ticket del Terminal

``` graphql
query {
  getTerminalTicket(terminalId: "grXZzqACJ0izZ3eLqo5ByQ") {
    uid
    number
    totalAmount
    remainingAmount
    entities { type name }
    orders { uid productId quantity price portion }
  }
}
```

### 4.6 Cerrar Ticket

``` graphql
mutation {
  closeTerminalTicket(terminalId: "grXZzqACJ0izZ3eLqo5ByQ")
}
```

### 4.7 (Opcional) Desregistrar Terminal

``` graphql
mutation {
  unregisterTerminal(terminalId: "grXZzqACJ0izZ3eLqo5ByQ")
}
```

------------------------------------------------------------------------

## 5) Ocupación de Mesas (implementación recomendada)

-   **LIBRE** si no hay ticket para esa mesa.\
-   **CUENTA** si hay órdenes y `remainingAmount > 0`.\
-   **OCUPADO** si hay órdenes y `remainingAmount === 0`.

``` graphql
query {
  getTickets(isClosed:false) {
    id
    remainingAmount
    totalAmount
    entities { type name }
    orders { id }
  }
}
```

------------------------------------------------------------------------

## 6) Reportes personalizados

``` graphql
query GetProductSalesReport {
  getCustomReport(
    name: "REPORTE DE VENTA DE PRODUCTOS"
    startDate: "2025-02-10"
    endDate: "2025-02-10"
  ) {
    name
    tables {
      name
      rows { cells }
    }
  }
}
```

------------------------------------------------------------------------

## 7) Eventos / Automatizaciones

Ejemplo disparar un **Automation Command** con parámetros:

``` graphql
mutation {
  notifyEvent(
    event: "AutomationCommandExecuted"
    parameters: [
      { name: "AutomationCommandName", value: "Change Customer Address" }
      { name: "EntityName", value: "Emre Eren" }
      { name: "Address", value: "Test 1234" }
    ]
    user: "Administrator"
    ticketType: "Ticket"
    terminal: "Server"
    department: "Restaurant"
    state: { ticket: { id: 0 } }
  ) { ticket { id } }
}
```

------------------------------------------------------------------------

## 8) One-liners útiles (para pruebas rápidas)

-   POLLO (Normal):

``` graphql
mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"POLLO",portion:"Normal",quantity:1){totalAmount}}
```

-   PAPAS AL AJILLO (ORD):

``` graphql
mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"PAPAS AL AJILLO",portion:"ORD",quantity:1){totalAmount}}
```

-   TORTILLAS (MEDIO KG):

``` graphql
mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"TORTILLAS",portion:"MEDIO KG",quantity:1){totalAmount}}
```

-   Cerrar ticket:

``` graphql
mutation{closeTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ")}
```

------------------------------------------------------------------------

# Fin de la Documentación

## 9) Ejemplos de payloads de todos los flujos (copy/paste)

Aquí tienes payloads listos (GraphQL en cuerpo JSON) y ejemplos de respuesta para los flujos de terminal/ticket.

Nota: sustituye <HOST>, <PORT> y <ACCESS_TOKEN> por tus valores y ejecuta POST a `http://<HOST>:<PORT>/api/graphql` con header `Authorization: Bearer <ACCESS_TOKEN>` y `Content-Type: application/json`.

9.1 Registrar terminal (mutación)

HTTP JSON body (GraphQL) - forma completa con variables:

```json
{
  "query": "mutation RegisterTerminal($ticketType: String!, $terminal: String!, $department: String!, $user: String!) { registerTerminal(ticketType: $ticketType, terminal: $terminal, department: $department, user: $user) }",
  "variables": {
    "ticketType": "Ticket",
    "terminal": "POS-01",
    "department": "Restaurant",
    "user": "graphiql"
  }
}
```

Ejemplo de respuesta (200):

```json
{
  "data": { "registerTerminal": "grXZzqACJ0izZ3eLqo5ByQ" }
}
```

9.2 Crear ticket del terminal

Request:

```json
{
  "query": "mutation CreateTerminalTicket($terminalId: String!) { createTerminalTicket(terminalId: $terminalId) { uid totalAmount } }",
  "variables": { "terminalId": "grXZzqACJ0izZ3eLqo5ByQ" }
}
```

Response ejemplo:

```json
{
  "data": {
    "createTerminalTicket": { "uid": "TKT-0001", "totalAmount": 0 }
  }
}
```

9.3 Asignar mesa (changeEntityOfTerminalTicket)

Request:

```json
{
  "query": "mutation ChangeEntity($terminalId: String!, $entityTypeName: String!, $entityName: String!) { changeEntityOfTerminalTicket(terminalId: $terminalId, entityTypeName: $entityTypeName, entityName: $entityName) }",
  "variables": {
    "terminalId": "grXZzqACJ0izZ3eLqo5ByQ",
    "entityTypeName": "Mesas",
    "entityName": "4"
  }
}
```

Response OK (puede devolver true o el ticket asignado según implementación):

```json
{ "data": { "changeEntityOfTerminalTicket": true } }
```

9.4 Agregar orden al ticket

Request (por productoId):

```json
{
  "query": "mutation AddOrder($terminalId: String!, $productId: Int!, $portion: String, $quantity: Int!) { addOrderToTerminalTicket(terminalId: $terminalId, productId: $productId, portion: $portion, quantity: $quantity) { totalAmount } }",
  "variables": { "terminalId": "grXZzqACJ0izZ3eLqo5ByQ", "productId": 1781, "portion": "Normal", "quantity": 1 }
}
```

Response ejemplo:

```json
{ "data": { "addOrderToTerminalTicket": { "totalAmount": 120.00 } } }
```

9.5 Obtener estado del ticket del terminal

Request:

```json
{
  "query": "query GetTerminalTicket($terminalId: String!) { getTerminalTicket(terminalId: $terminalId) { uid number totalAmount remainingAmount entities { type name } orders { uid productId quantity price portion } } }",
  "variables": { "terminalId": "grXZzqACJ0izZ3eLqo5ByQ" }
}
```

Response ejemplo:

```json
{
  "data": {
    "getTerminalTicket": {
      "uid": "TKT-0001",
      "number": 45,
      "totalAmount": 120.0,
      "remainingAmount": 120.0,
      "entities": [{ "type": "Mesas", "name": "4" }],
      "orders": [{ "uid": "ORD-1", "productId": 1781, "quantity": 1, "price": 120.0, "portion": "Normal" }]
    }
  }
}
```

9.6 Cerrar ticket

Request:

```json
{
  "query": "mutation CloseTerminal($terminalId: String!) { closeTerminalTicket(terminalId: $terminalId) }",
  "variables": { "terminalId": "grXZzqACJ0izZ3eLqo5ByQ" }
}
```

Response ejemplo:

```json
{ "data": { "closeTerminalTicket": true } }
```

9.7 Desregistrar terminal (opcional)

Request:

```json
{
  "query": "mutation Unregister($terminalId: String!) { unregisterTerminal(terminalId: $terminalId) }",
  "variables": { "terminalId": "grXZzqACJ0izZ3eLqo5ByQ" }
}
```

Response ejemplo:

```json
{ "data": { "unregisterTerminal": true } }
```

9.8 Cargar/traer ticket existente y traerlo al terminal (legacy)

Request (legacy createTicket via input):

```json
{
  "query": "mutation CreateTicket($input: CreateTicketInput!) { createTicket(input: $input) { id number totalAmount tableId } }",
  "variables": { "input": { "type": "TABLE", "tableId": "4", "terminalId": "SERVIDOR" } }
}
```

Response ejemplo:

```json
{
  "data": { "createTicket": { "id": "ABC123", "number": 999, "totalAmount": 0, "tableId": "4" } }
}
```

9.9 One-liners HTTP curl (ejemplo rápido)

Registrar terminal (curl):

```bash
curl -X POST "http://<HOST>:<PORT>/api/graphql" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{registerTerminal(ticketType:\"Ticket\",terminal:\"POS-01\",department:\"Restaurant\",user:\"graphiql\")}"}'
```

Agregar orden (curl):

```bash
curl -X POST "http://<HOST>:<PORT>/api/graphql" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{addOrderToTerminalTicket(terminalId:\"grXZzqACJ0izZ3eLqo5ByQ\",productId:1781,portion:\"Normal\",quantity:1){totalAmount}}"}'
```

---

He añadido estos payloads al final del documento. Si quieres que además:

- los guarde en archivos separados `docs/payloads/*.json` (útiles para Postman/Insomnia), o
- los convierta a una colección Postman/Insomnia y la agregue al repo,

dime cuál opción prefieres y la agrego.
