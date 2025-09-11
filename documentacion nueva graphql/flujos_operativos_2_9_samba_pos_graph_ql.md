# Flujos Operativos **2–9** (SambaPOS GraphQL)

> Paquete de flujos complementarios a tus playbooks ya listos:
> - **1) Cobro**: listo en tu doc “Flujo Completo: Cobro de Tickets”.
> - **10) Reapertura de tickets**: listo en tu doc “Flujo: Reabrir Ticket Pagado”.
>
> Este archivo cubre **2–9**.
>
> **Convenciones**
> - Usa `terminalId` (hash devuelto por `registerTerminal`) en mutaciones `Terminal...`.
> - `ticketId` se envía como **String**.
> - Ajusta nombres exactos de `paymentTypeName`, `entityTypeName`, `Automation Command`, `tagName/tag` a tu instalación.

---

## 2) **Dividir cuenta / Pagos parciales y mixtos**

### 2.1 Pagar en dos métodos (parcial + parcial)
```graphql
# Efectivo parcial
mutation { payTerminalTicket(terminalId: "<TERMINAL_ID>", paymentTypeName: "Efectivo", amount: 100) { ticketId amount remainingAmount errorMessage } }
# Tarjeta parcial
mutation { payTerminalTicket(terminalId: "<TERMINAL_ID>", paymentTypeName: "Tarjeta de crédito", amount: 55.50) { ticketId amount remainingAmount errorMessage } }
```
**Verifica**
```graphql
query { getTerminalTicket(terminalId: "<TERMINAL_ID>") { totalAmount remainingAmount payments { name amount } } }
```

### 2.2 Pagar “lo que resta” al final
```graphql
mutation { payTerminalTicket(terminalId: "<TERMINAL_ID>", paymentTypeName: "Efectivo") { ticketId amount remainingAmount } }
```

---

## 3) **Cambiar de mesa / Transferir ticket a otra entidad**

### 3.1 Cambiar la entidad “Mesas”
```graphql
mutation {
  changeEntityOfTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    entityTypeName: "Mesas",
    entityName: "12"
  ) { id entities { type name } }
}
```
**Verifica**
```graphql
query { getTerminalTicket(terminalId: "<TERMINAL_ID>") { id entities { type name } } }
```

---

## 4) **Mover pedidos entre tickets (split de órdenes)**
> Requiere tener identificados los `orderUid` a mover. En muchos setups se hace por **Automation Command** mapeado (p. ej. “Move Order To Ticket”).

### 4.1 Cargar origen y destino
```graphql
mutation { loadTerminalTicket(terminalId: "<TERMINAL_ID>", ticketId: "<TICKET_ORIGEN>") { id number } }
mutation { loadTerminalTicket(terminalId: "<TERMINAL_ID_DEST>", ticketId: "<TICKET_DESTINO>") { id number } }
```

### 4.2 Ejecutar Automation Command (ejemplo)
```graphql
mutation {
  executeAutomationCommandForTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    orderUid: "<ORDER_UID_A_MOVER>",
    name: "Move Order To Ticket",
    value: "<TICKET_DESTINO>"
  ) { id }
}
```
**Nota**: El nombre del comando y el valor dependen de tu Rule/Action. Alternativa: comando que abre selector y tú confirmas en POS.

---

## 5) **Descuentos, Propinas y Cargos (Calculations)**
> Usa Automation Commands que apliquen **Calculations**. Los nombres varían: “Agregar Propina 10%”, “Descuento 15%”, etc.

### 5.1 Propina fija o %
```graphql
mutation {
  executeAutomationCommandForTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    name: "Agregar Propina",    # tu comando
    value: "10"                  # 10 ó 10% según tu Rule
  ) { id }
}
```
**Verifica**
```graphql
query { getTerminalTicket(terminalId: "<TERMINAL_ID>") { calculations { name calculationAmount } totalAmount remainingAmount } }
```

### 5.2 Descuento
```graphql
mutation {
  executeAutomationCommandForTerminalTicket(
    terminalId: "<TERMINAL_ID>", name: "Descuento", value: "15"  # ejemplo
  ) { id }
}
```

---

## 6) **Anular / Cancelar pedidos (Void) con trazabilidad**

### 6.1 Cancelar por `orderUid`
```graphql
mutation {
  executeAutomationCommandForTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    orderUid: "<ORDER_UID>",
    name: "Void",                   # o "Predeterminado Cancelar los pedidos"
    value: "Motivo desde GraphQL"   # opcional, para logging
  ) { id }
}
```
**Verifica**
```graphql
query {
  getTerminalTicket(terminalId: "<TERMINAL_ID>") {
    orders {
      uid name quantity price
      states { stateName state stateValue }
    }
  }
}
```

---

## 7) **Reimprimir / imprimir selectivo (cocina, factura, cierre)**

### 7.1 Ticket abierto (en terminal)
```graphql
mutation {
  executeAutomationCommandForTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    name: "Imprimir factura",
    value: ""
  ) { id }
}
```

### 7.2 Ticket cerrado
```graphql
mutation {
  executePrintJob(
    name: "Imprimir factura CAJA",
    ticketId: <TICKET_ID_NUM>,
    copies: 1,
    terminal: "SERVIDOR",
    department: "MESAS",
    user: "<USUARIO>"
  ) { name }
}
```

---

## 8) **Etiquetas avanzadas de orden** (agregar, quitar, reemplazar)

### 8.1 Agregar múltiples tags
```graphql
mutation {
  updateOrderOfTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    orderUid: "<ORDER_UID>",
    orderTags: [
      { tagName: "SABORES SALSAS POLLO", tag: "ADOBADO",  quantity: 1, price: 0 },
      { tagName: "PARA LLEVAR",          tag: "PARA LLEVAR", quantity: 1, price: 0 }
    ]
  ) { orders { uid name tags { tagName tag quantity price } } }
}
```

### 8.2 Quitar tag (quantity = 0)
```graphql
mutation {
  updateOrderOfTerminalTicket(
    terminalId: "<TERMINAL_ID>", orderUid: "<ORDER_UID>",
    orderTags: [ { tagName: "PARA LLEVAR", tag: "PARA LLEVAR", quantity: 0, price: 0 } ]
  ) { orders { uid name tags { tagName tag quantity } } }
}
```

### 8.3 Reemplazo dentro del mismo grupo
```graphql
mutation {
  updateOrderOfTerminalTicket(
    terminalId: "<TERMINAL_ID>", orderUid: "<ORDER_UID>",
    orderTags: [
      { tagName: "SABORES SALSAS POLLO", tag: "ADOBADO",  quantity: 0, price: 0 },  # limpiar
      { tagName: "SABORES SALSAS POLLO", tag: "JALAPEÑO", quantity: 1, price: 0 }
    ]
  ) { orders { uid name tags { tagName tag quantity } } }
}
```

---

## 9) **Ticket Tags / Notas a nivel ticket**
> Si tu build no trae mutación nativa (p. ej. `updateTicketTags`), utiliza **Automation Command** que setee `Ticket Tag`.

### 9.1 Vía Automation Command
```graphql
mutation {
  executeAutomationCommandForTerminalTicket(
    terminalId: "<TERMINAL_ID>",
    name: "Set Ticket Note",   # tu comando
    value: "Nota desde GraphQL"
  ) { id }
}
```
**Verifica**
```graphql
query { getTerminalTicket(terminalId: "<TERMINAL_ID>") { tags { tagName tag } } }
```

### 9.2 (Si existe) Mutación directa
```graphql
mutation {
  updateTicketTags(
    terminalId: "<TERMINAL_ID>",
    tags: [{ tagName: "Nota", value: "Cliente fiel" }]
  ) { id tags { tagName tag } }
}
```

---

### Extras útiles
- **Health-check de menú/producto** antes de agregar:
```graphql
query { getProduct(name: "POLLO") { id name portions { name price } } }
```
- **Descubrir tags disponibles por producto/terminal**:
```graphql
query { getOrderTagGroups(productName: "POLLO", terminal: "SERVIDOR") { name tags { name price } } }
```
- **Descubrir tags válidos por orden (si tu build lo expone)**:
```graphql
mutation { getOrderTagsForTerminalTicketOrder(terminalId: "<TERMINAL_ID>", orderUid: "<ORDER_UID>") { name groupName price isSelected } }
```

---

> Con esto cubres los flujos 2–9. Si quieres, armamos playbooks separados por cada flujo con tus nombres reales de comandos/tags para pegarlos directo en Postman/Insomnia o en tu UI.

