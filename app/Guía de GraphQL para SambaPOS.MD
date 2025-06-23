# Guía de GraphQL para SambaPOS

## Introducción

Este documento proporciona una guía completa de las operaciones GraphQL disponibles en SambaPOS, incluyendo mutaciones (para modificar datos) y consultas (para obtener datos). Esta documentación se basa en el análisis del código fuente del sistema SambaPOS v5.

## Esquema de GraphQL

El esquema GraphQL de SambaPOS está organizado en dos secciones principales:
- **Queries**: Para obtener información (lectura)
- **Mutations**: Para realizar cambios (escritura)

## Consultas (Queries)

### Consultas de Tickets

```graphql
# Obtener un ticket específico por ID
query GetTicket($id: ID!) {
  getTicket(id: $id) {
    id
    uid
    ticketNumber
    totalAmount
    remainingAmount
    orders {
      id
      menuItemName
      quantity
      price
    }
    entities {
      name
      type
    }
  }
}

# Obtener el ticket activo en un terminal
query GetTerminalTicket($terminalId: String) {
  getTerminalTicket(terminalId: $terminalId) {
    id
    uid
    type
    ticketNumber
    totalAmount
    remainingAmount
    orders {
      id
      menuItemName
      quantity
    }
  }
}

# Obtener tickets con filtros
query GetTickets($start: Date, $end: Date, $isClosed: Boolean) {
  getTickets(start: $start, end: $end, isClosed: $isClosed) {
    id
    ticketNumber
    date
    totalAmount
  }
}

# Obtener todos los tickets de un terminal
query GetTerminalTickets($terminalId: String) {
  getTerminalTickets(terminalId: $terminalId) {
    id
    ticketNumber
  }
}
```

### Consultas de Entidades

```graphql
# Verificar si una entidad existe
query IsEntityExists($type: String!, $name: String!) {
  isEntityExists(type: $type, name: $name)
}

# Obtener una entidad específica
query GetEntity($type: String!, $name: String!) {
  getEntity(type: $type, name: $name) {
    id
    name
    customData
    states {
      stateName
      state
      stateValue
    }
  }
}

# Obtener entidades por tipo
query GetEntities($type: String!, $search: String, $state: String) {
  getEntities(type: $type, search: $search, state: $state) {
    id
    name
    customData
  }
}

# Obtener elementos de pantalla de entidad
query GetEntityScreenItems($name: String!, $state: String) {
  getEntityScreenItems(name: $name, state: $state) {
    id
    name
    color
    header
  }
}
```

### Consultas de Productos y Menús

```graphql
# Obtener un producto específico
query GetProduct($name: String, $id: Int) {
  getProduct(name: $name, id: $id) {
    id
    name
    groupCode
    barcode
    portions {
      id
      name
      price
    }
  }
}

# Obtener productos filtrados
query GetProducts($itemTag: MenuItemTagInputType, $groupCode: String, $barcode: String) {
  getProducts(itemTag: $itemTag, groupCode: $groupCode, barcode: $barcode) {
    id
    name
    groupCode
  }
}

# Obtener porciones de un producto
query GetProductPortions($productName: String, $productId: Int) {
  getProductPortions(productName: $productName, productId: $productId) {
    id
    name
    price
  }
}

# Obtener grupos de etiquetas de orden
query GetOrderTagGroups($productName: String, $portion: String) {
  getOrderTagGroups(productName: $productName, portion: $portion) {
    id
    name
    tags {
      id
      name
      price
    }
  }
}
```

### Consultas de Configuración

```graphql
# Obtener configuración global
query GetGlobalSettings {
  getGlobalSettings {
    name
    value
  }
}

# Obtener configuración local específica
query GetLocalSetting($name: String!) {
  getLocalSetting(name: $name) {
    name
    value
  }
}

# Obtener tipos de pago
query GetPaymentTypes($userRoleId: Int) {
  getPaymentTypes(userRoleId: $userRoleId) {
    id
    name
  }
}

# Obtener grupos de etiquetas de ticket
query GetTicketTagsGroups($userRoleId: Int) {
  getTicketTagsGroups(userRoleId: $userRoleId) {
    id
    name
    tags {
      id
      name
    }
  }
}
```

## Mutaciones (Mutations)

### Terminal y Tickets

```graphql
# Registrar un terminal
mutation RegisterTerminal($terminal: String, $department: String, $user: String, $ticketType: String) {
  terminalId: registerTerminal(
    terminal: $terminal, 
    department: $department, 
    user: $user, 
    ticketType: $ticketType
  )
}

# Desregistrar un terminal
mutation UnregisterTerminal($terminalId: String) {
  unregisterTerminal(terminalId: $terminalId) {
    success
    message
  }
}

# Crear un nuevo ticket en el terminal
mutation CreateTerminalTicket($terminalId: String) {
  createTerminalTicket(terminalId: $terminalId) {
    id
    uid
    type
    remainingAmount
    totalAmount
  }
}

# Cargar un ticket existente en el terminal
mutation LoadTerminalTicket($terminalId: String, $ticketId: String) {
  loadTerminalTicket(terminalId: $terminalId, ticketId: $ticketId) {
    id
    uid
  }
}

# Actualizar ticket del terminal
mutation UpdateTerminalTicket($terminalId: String, $note: String, $tags: [TagInput], $states: [StateInput]) {
  updateTerminalTicket(
    terminalId: $terminalId,
    note: $note,
    tags: $tags,
    states: $states
  ) {
    id
    note
  }
}

# Cerrar ticket del terminal
mutation CloseTerminalTicket($terminalId: String) {
  closeTerminalTicket(terminalId: $terminalId) {
    id
    isClosed
    ticketNumber
  }
}
```

### Gestión de Órdenes

```graphql
# Añadir una orden al ticket actual del terminal
mutation AddOrderToTerminalTicket($terminalId: String, $productName: String, $quantity: Decimal, $portion: String) {
  addOrderToTerminalTicket(
    terminalId: $terminalId,
    productName: $productName,
    quantity: $quantity,
    portion: $portion
  ) {
    id
    menuItemName
    quantity
    price
  }
}

# Actualizar una orden existente
mutation UpdateOrderOfTerminalTicket($terminalId: String!, $orderUid: String!, $quantity: Decimal, $price: Decimal) {
  updateOrderOfTerminalTicket(
    terminalId: $terminalId,
    orderUid: $orderUid,
    quantity: $quantity,
    price: $price
  ) {
    id
    quantity
    price
  }
}

# Cancelar una orden
mutation CancelOrderOnTerminalTicket($terminalId: String, $orderUid: String) {
  cancelOrderOnTerminalTicket(
    terminalId: $terminalId,
    orderUid: $orderUid
  ) {
    success
  }
}

# Limpiar todas las órdenes del ticket
mutation ClearTerminalTicketOrders($terminalId: String) {
  clearTerminalTicketOrders(terminalId: $terminalId) {
    id
    orders {
      id
    }
  }
}
```

### Entidades y Pagos

```graphql
# Cambiar la entidad asociada al ticket
mutation ChangeEntityOfTerminalTicket($terminalId: String, $type: String, $name: String) {
  changeEntityOfTerminalTicket(
    terminalId: $terminalId,
    type: $type,
    name: $name
  ) {
    id
    entities {
      name
      type
    }
  }
}

# Realizar un pago en el ticket
mutation PayTerminalTicket($terminalId: String, $paymentTypeName: String!, $amount: Decimal) {
  payTerminalTicket(
    terminalId: $terminalId,
    paymentTypeName: $paymentTypeName,
    amount: $amount
  ) {
    id
    remainingAmount
  }
}

# Añadir un cálculo al ticket (descuentos, propinas, etc.)
mutation AddCalculationToTerminalTicket($terminalId: String, $calculationName: String, $amount: Decimal) {
  addCalculationToTerminalTicket(
    terminalId: $terminalId,
    calculationName: $calculationName,
    amount: $amount
  ) {
    id
    totalAmount
    remainingAmount
  }
}

# Recalcular el ticket
mutation RecalculateTicket($terminalId: String, $forceRecalculation: Boolean) {
  recalculateTicket(
    terminalId: $terminalId,
    forceRecalculation: $forceRecalculation
  ) {
    id
    totalAmount
    remainingAmount
  }
}
```

### Otras Operaciones

```graphql
# Notificar un evento de ticket
mutation NotifyTerminalTicketEvent($terminalId: String, $name: String!, $parameters: [ParameterInput]) {
  notifyTerminalTicketEvent(
    terminalId: $terminalId,
    name: $name,
    parameters: $parameters
  ) {
    success
  }
}

# Ejecutar un comando de automatización
mutation ExecuteAutomationCommandForTerminalTicket($terminalId: String!, $name: String, $value: String) {
  executeAutomationCommandForTerminalTicket(
    terminalId: $terminalId,
    name: $name,
    value: $value
  ) {
    success
  }
}

# Actualizar un estado de entidad
mutation UpdateEntityState($entityTypeName: String!, $entityName: String!, $stateName: String!, $state: String) {
  updateEntityState(
    entityTypeName: $entityTypeName,
    entityName: $entityName,
    stateName: $stateName,
    state: $state
  ) {
    success
  }
}
```

## Tipos de Entrada (Input Types)

### TagInput
```graphql
input TagInput {
  name: String!
  value: String
}
```

### StateInput
```graphql
input StateInput {
  name: String!
  state: String
  value: String
}
```

### ParameterInput
```graphql
input ParameterInput {
  name: String!
  value: String
}
```

### MenuItemTagInputType
```graphql
input MenuItemTagInputType {
  tagName: String!
  tagValue: String
}
```

### TicketInputType
```graphql
input TicketInputType {
  id: Int
  uid: String
  ticketNumber: String
  note: String
  departmentId: Int
  ticketTypeId: Int
  terminalId: Int
  createdUserName: String
  lastModifiedUserName: String
}
```

## Flujo de Trabajo Completo

A continuación se muestra un flujo de trabajo completo para la creación y procesamiento de un ticket:

```graphql
# 1. Registrar terminal
mutation RegisterTerminal {
  terminalId: registerTerminal(
    terminal: "TERMINAL1",
    department: "PRINCIPAL",
    user: "admin",
    ticketType: "RESTAURANTE"
  )
}

# 2. Crear ticket
mutation CreateTicket {
  createTerminalTicket(terminalId: "ID_DEL_TERMINAL") {
    id
    uid
  }
}

# 3. Asociar entidad (mesa)
mutation AssociateEntity {
  changeEntityOfTerminalTicket(
    terminalId: "ID_DEL_TERMINAL",
    type: "Tables",
    name: "Mesa 1"
  ) {
    id
  }
}

# 4. Añadir órdenes
mutation AddOrder {
  addOrderToTerminalTicket(
    terminalId: "ID_DEL_TERMINAL",
    productName: "Hamburguesa",
    quantity: 2,
    portion: "Normal"
  ) {
    id
  }
}

# 5. Recalcular ticket
mutation RecalculateTicket {
  recalculateTicket(
    terminalId: "ID_DEL_TERMINAL",
    forceRecalculation: true
  ) {
    totalAmount
  }
}

# 6. Realizar pago
mutation PayTicket {
  payTerminalTicket(
    terminalId: "ID_DEL_TERMINAL",
    paymentTypeName: "Efectivo",
    amount: 100.00
  ) {
    remainingAmount
  }
}

# 7. Cerrar ticket
mutation CloseTicket {
  closeTerminalTicket(terminalId: "ID_DEL_TERMINAL") {
    id
    isClosed
    ticketNumber
  }
}

# 8. Desregistrar terminal
mutation UnregisterTerminal {
  unregisterTerminal(terminalId: "ID_DEL_TERMINAL") {
    success
  }
}
```

## Mejoras Necesarias para un Esquema Completo

Para tener un esquema GraphQL más completo y robusto para SambaPOS, se podrían implementar las siguientes mejoras:

1. **Documentación integrada**: Agregar descripciones detalladas a cada campo y tipo utilizando la directiva `@description` de GraphQL.

2. **Manejo de errores mejorado**: Implementar un sistema de errores estandarizado con códigos de error específicos y mensajes descriptivos.

3. **Validación de entrada**: Agregar restricciones y validaciones en los tipos de entrada para evitar datos incorrectos.

4. **Paginación**: Implementar paginación estándar para consultas que pueden devolver grandes conjuntos de datos.

5. **Suscripciones**: Agregar soporte para suscripciones GraphQL para obtener actualizaciones en tiempo real.

6. **Directives personalizadas**: Implementar directivas personalizadas para el control de acceso y auditoría.

7. **Introspección limitada**: Limitar la introspección para mejorar la seguridad en entornos de producción.

## Modificaciones necesarias en el código

Para implementar estas mejoras, se requerirían cambios en los siguientes archivos:

1. **GraphqlSchema.cs**: Definir tipos adicionales y mejorar las descripciones.

2. **TerminalStateManager.cs**: Mejorar la gestión de errores y la validación.

3. **TicketMutation.cs**: Agregar validaciones adicionales para las mutaciones de tickets.

4. **GraphqlController.cs**: Implementar manejo de errores mejorado y limitación de introspección.

5. **IGraphqlService.cs**: Extender la interfaz para soportar suscripciones.

## Conclusión

Esta guía proporciona una visión completa de las operaciones GraphQL disponibles en SambaPOS para la gestión de tickets, entidades, productos y otras funcionalidades del sistema. Siguiendo los ejemplos proporcionados, puedes interactuar con el sistema SambaPOS a través de su API GraphQL de manera efectiva.

Para cualquier operación no documentada o personalización adicional, se recomienda utilizar la introspección de GraphQL para descubrir todas las capacidades disponibles en la implementación específica de SambaPOS.