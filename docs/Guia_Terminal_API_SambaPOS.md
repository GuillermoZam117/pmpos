# Guía completa: Ciclo Terminal API en SambaPOS (con tus datos reales)

Esta guía reproduce exactamente lo que probaste: **registrar terminal → crear ticket → añadir órdenes → verificar → cerrar ticket → (opcional) desregistrar**. Incluye los IDs y porciones reales de tu menú.

> **Resumen de tu entorno**
>
> - Terminal: `SERVIDOR`
> - Department: `MESAS`
> - Ticket Type: `COMEDOR`
> - User: `graphiql`
> - `terminalId` obtenido: `grXZzqACJ0izZ3eLqo5ByQ`

---

## 0) (Opcional) Consultar el Menú con IDs y porciones

Usa esto para listar categorías, ítems y porciones (tú usaste `name: "MENU"`):

```graphql
query GetMenu {
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

IDs reales que usaste después:

- **POLLOS**
  - `CUARTO POLLO` → **1781** (Normal: 65)
  - `POLLO` → **1783** (Normal: 210)
- **EXTRAS**
  - `PAPAS AL AJILLO` → **1790** (ORD: 25, MEDIA ORD: 15)
  - `TORTILLAS` → **1794** (MEDIO KG: 15, CUARTO KG: 8)

---

## 1) Registrar el Terminal

```graphql
mutation RegisterTerminal {
  registerTerminal(
    ticketType: "COMEDOR"
    terminal: "SERVIDOR"
    department: "MESAS"
    user: "graphiql"
  )
}
```

**Respuesta real:**

```json
{ "data": { "registerTerminal": "grXZzqACJ0izZ3eLqo5ByQ" }, "errors": null }
```

---

## 2) Crear el Ticket del Terminal

> En tu prueba **no** ligaste mesa; si tu versión acepta `table`, añade el argumento `table: "1"`.

```graphql
mutation CreateTerminalTicket {
  createTerminalTicket(terminalId: "grXZzqACJ0izZ3eLqo5ByQ") {
    uid
    totalAmount
  }
}
```

**Respuesta real:**
```json
{ "data": { "createTerminalTicket": { "uid": "Bg8FvavLAEWM0w0asRZzRw", "totalAmount": 0 }}, "errors": null }
```

---

## 3) Añadir Órdenes (4 ejemplos reales)

```graphql
mutation AddPOLLO {
  addOrderToTerminalTicket(
    terminalId: "grXZzqACJ0izZ3eLqo5ByQ"
    productName: "POLLO"
    portion: "Normal"
    quantity: 1
  ) { totalAmount }
}

mutation AddPAPAS {
  addOrderToTerminalTicket(
    terminalId: "grXZzqACJ0izZ3eLqo5ByQ"
    productName: "PAPAS AL AJILLO"
    portion: "ORD"
    quantity: 1
  ) { totalAmount }
}

mutation AddTORTILLAS {
  addOrderToTerminalTicket(
    terminalId: "grXZzqACJ0izZ3eLqo5ByQ"
    productName: "TORTILLAS"
    portion: "MEDIO KG"
    quantity: 1
  ) { totalAmount }
}

mutation AddCUARTO_POLLO {
  addOrderToTerminalTicket(
    terminalId: "grXZzqACJ0izZ3eLqo5ByQ"
    productName: "CUARTO POLLO"
    portion: "Normal"
    quantity: 1
  ) { totalAmount }
}
```

**Respuesta tras las 4 órdenes (tu caso):**
```json
{ "data": { "addOrderToTerminalTicket": { "totalAmount": 315 }}, "errors": null }
```

---

## 4) Verificar el Ticket del Terminal

```graphql
query GetTerminalTicket {
  getTerminalTicket(terminalId: "grXZzqACJ0izZ3eLqo5ByQ") {
    uid
    number
    totalAmount
    remainingAmount
    orders {
      uid
      productId
      quantity
      price
      portion
    }
  }
}
```

**Tu respuesta real (resumen):**
```json
{
  "data": {
    "getTerminalTicket": {
      "uid": "Bg8FvavLAEWM0w0asRZzRw",
      "totalAmount": 315,
      "remainingAmount": 315,
      "orders": [
        { "productId": "1783", "portion": "Normal",   "price": 210 },
        { "productId": "1790", "portion": "ORD",      "price": 25  },
        { "productId": "1794", "portion": "MEDIO KG", "price": 15  },
        { "productId": "1781", "portion": "Normal",   "price": 65  }
      ]
    }
  }
}
```

---

## 5) Cerrar el Ticket

```graphql
mutation CloseTerminalTicket {
  closeTerminalTicket(terminalId: "grXZzqACJ0izZ3eLqo5ByQ")
}
```

**Tu respuesta real:**
```json
{ "data": { "closeTerminalTicket": null }, "errors": null }
```

---

## 6) (Opcional) Desregistrar el Terminal

```graphql
mutation UnregisterTerminal {
  unregisterTerminal(terminalId: "grXZzqACJ0izZ3eLqo5ByQ")
}
```

---

## One-liners útiles

- POLLO:  
  `mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"POLLO",portion:"Normal",quantity:1){totalAmount}}`
- PAPAS AL AJILLO (ORD):  
  `mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"PAPAS AL AJILLO",portion:"ORD",quantity:1){totalAmount}}`
- TORTILLAS (MEDIO KG):  
  `mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"TORTILLAS",portion:"MEDIO KG",quantity:1){totalAmount}}`
- CUARTO POLLO:  
  `mutation{addOrderToTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ",productName:"CUARTO POLLO",portion:"Normal",quantity:1){totalAmount}}`
- Cerrar:  
  `mutation{closeTerminalTicket(terminalId:"grXZzqACJ0izZ3eLqo5ByQ")}`

---

### Notas
- Si cambia el **nombre del menú** o de un **producto/porción**, vuelve a consultar `getMenu` para usar los valores exactos.
- Si tu versión no admite `table` en `createTerminalTicket`, deja el ticket sin mesa o usa las mutaciones de entidad específicas de tu build.
