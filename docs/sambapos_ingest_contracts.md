# Contratos de Ingesta (Normalizados) — SambaPOS → Central

Este documento complementa `sambapos_payload_examples.md` (datos raw del POS) con los contratos esperados por la API central (`apps/ingest-api`). Incluye mapeos clave, headers requeridos y ejemplos de payload por endpoint.

## Headers requeridos
- `Authorization: Bearer <token>`
- `x-branch-id: <uuid>`

## Reglas generales
- Fechas: ISO8601 en UTC.
- Decimales: enviar como `number`; el backend usa tipos Decimal.
- Campos JSON (tags/states): enviar ya parseados como objetos/arrays (no strings JSON).
- Idempotencia: `branchId` (header) + `sourceType='sambapos'` + `sourceId` (estable) + `sourceHash` (si no se envía, el servidor lo calcula como SHA1 del objeto).

## Mapeos principales

### Ticket (SambaPOS → central)
- `TicketUid` → `posTicketUid`
- `TicketNumber` → `number`
- `Date` → `openedAt`
- `LastPaymentDate` → `closedAt` (si `IsClosed=1`)
- `IsClosed` → `isClosed`
- `TotalAmount` → `total`
- `TotalAmountPreTax` → `totalPretax`
- `RemainingAmount` → `remaining`
- `DepartmentId` → `departmentId`
- `TerminalId` → `terminalId`
- `TicketTags` (json string) → `tags` (Json)
- `TicketStates` (json string) → `states` (Json)
- `Note` → `note`
- `sourceId` sugerido: `TicketUid`

### Order (SambaPOS → central)
- Enlace: `ticketPosUid = Tickets.TicketUid`
- `MenuItemId` → `menuItemId`
- `MenuItemName` → `name`
- `PortionName` → `portion`
- `Quantity` → `qty`
- `Price` → `price`
- `PriceTag` → `priceTag`
- `OrderTags` (json string) → `tags` (Json)
- `OrderStates` (json string) → `states` (Json)
- `sourceId` sugerido: `OrderUid` (si no existe, usar `Orders.Id`)

### Payment (SambaPOS → central)
- Enlace: `ticketPosUid = Tickets.TicketUid`
- Tipo: `paymentTypeName = PaymentTypes.Name` → se resuelve a `paymentTypeId` usando catálogo o `PaymentTypeMapping` por sucursal.
- `Amount` → `amount`
- `TenderedAmount` → `tenderedAmount`
- `Date` → `paidAt`
- `PaymentData` (json string) → `data` (Json)
- `sourceId` sugerido: `Payments.Id`

---

## Endpoints de Ingesta

### POST `/api/ingest/tickets`
Body:
```json
{
  "items": [
    {
      "posTicketUid": "vesSxNL13kSMWAPhJGaKtg",
      "number": "2",
      "openedAt": "2025-02-05T10:54:20.023Z",
      "closedAt": "2025-02-05T10:54:34.570Z",
      "isClosed": true,
      "total": 243.0,
      "totalPretax": 243.0,
      "remaining": 0.0,
      "departmentId": 9,
      "terminalId": 1,
      "tags": { "TICKET NO": "2", "FACTURAS": "PUBLICO GENERAL" },
      "states": [ { "SN": "Estado", "S": "Pagado" } ],
      "note": null,
      "sourceId": "vesSxNL13kSMWAPhJGaKtg"
    }
  ]
}
```

### POST `/api/ingest/orders`
Body:
```json
{
  "items": [
    {
      "ticketPosUid": "vesSxNL13kSMWAPhJGaKtg",
      "menuItemId": 1783,
      "name": "POLLO",
      "portion": "Normal",
      "qty": 1.0,
      "price": 210.0,
      "priceTag": null,
      "tags": [
        { "TN": "SABORES SALSAS POLLO", "TV": "ADOBADO" },
        { "TN": "SABORES SALSAS POLLO", "TV": "JALAPEÑO" }
      ],
      "states": [ { "SN": "Status", "S": "Enviado" } ],
      "sourceId": "aVePR0sv5Ee0e2QGuzLX4Q"
    }
  ]
}
```

### POST `/api/ingest/payments`
Body:
```json
{
  "items": [
    {
      "ticketPosUid": "vesSxNL13kSMWAPhJGaKtg",
      "paymentTypeName": "Tarjeta de crédito",
      "amount": 243.0,
      "tenderedAmount": 243.0,
      "paidAt": "2025-02-05T10:54:34.570Z",
      "data": null,
      "sourceId": "25583"
    }
  ]
}
```

---

## Notas de coherencia con el código
- Los esquemas Zod actuales (`apps/ingest-api/src/schemas.ts`) ya contemplan los campos mostrados.
- En el servidor (`apps/ingest-api/src/server.ts`) falta implementar la resolución de:
  - `ticketPosUid → ticketId` en Orders/Payments.
  - `paymentTypeName → paymentTypeId` en Payments.
- Este documento define los contratos que esos mapeos deben consumir.

