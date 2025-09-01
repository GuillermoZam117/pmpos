/*
Propósito: Vista enriquecida de Tickets para ingestión y reporting.
Trae 1 fila por ticket con identificadores, fechas, montos, contexto, cliente y métricas de control.

Entradas: Tablas SambaPOS dbo.Tickets, dbo.Payments, dbo.PaymentTypes, dbo.Users,
          dbo.Calculations, dbo.Orders, dbo.TicketEntities, dbo.Entities, dbo.EntityTypes.
Salidas:   TicketId, TicketUid, TicketNumber, OpenedAt, ClosedAt, IsClosed, LastUpdateTime,
           TotalAmount, TotalAmountPreTax, RemainingAmount, DepartmentId, TerminalId,
           TicketTags, TicketStates, ClienteId, ClienteNombre, ClienteTelefono, ClienteDireccion,
           ClienteCiudad, ClienteRFC, MesaId, MesaNombre, PredominantPaymentTypeId,
           PredominantPaymentTypeName, CobradoPor, Propina, Descuentos, Cortesias,
           TotalOrderTags, VoidCount, VoidAmount.

Notas:
- No trunca TicketUid (usa el completo para idempotencia).
- Extrae Cliente y Mesa desde TicketEntities sin duplicar filas (OUTER APPLY TOP 1 por tipo).
- Separa Propina/Descuentos/Cortesías desde Calculations por nombre; ajusta patrones si aplica.
- Evita expandir TicketTags; se expone como texto JSON para que el middleware lo parsee.

Ejemplo:
-- SELECT TOP 5 * FROM dbo.VistaTicketsEnriquecida ORDER BY ClosedAt DESC;
*/

CREATE OR ALTER VIEW dbo.VistaTicketsEnriquecida AS
SELECT
  t.Id                   AS TicketId,
  t.TicketUid            AS TicketUid,
  t.TicketNumber         AS TicketNumber,
  t.Date                 AS OpenedAt,
  t.LastPaymentDate      AS ClosedAt,
  CAST(t.IsClosed AS bit) AS IsClosed,
  t.LastUpdateTime       AS LastUpdateTime,
  t.TotalAmount          AS TotalAmount,
  t.TotalAmountPreTax    AS TotalAmountPreTax,
  t.RemainingAmount      AS RemainingAmount,
  t.DepartmentId         AS DepartmentId,
  t.TerminalId           AS TerminalId,
  t.TicketTags           AS TicketTags,
  t.TicketStates         AS TicketStates,
  cli_base.ClienteId     AS ClienteId,
  cli_base.ClienteNombre AS ClienteNombre,
  cli.Telefono           AS ClienteTelefono,
  cli.Direccion          AS ClienteDireccion,
  cli.Ciudad             AS ClienteCiudad,
  cli.RFC                AS ClienteRFC,
  mesa_base.MesaId       AS MesaId,
  mesa_base.MesaNombre   AS MesaNombre,
  pay.PaymentTypeId      AS PredominantPaymentTypeId,
  pt.Name                AS PredominantPaymentTypeName,
  cobr.CobradoPor        AS CobradoPor,
  ISNULL(prop.TotalPropina, 0)     AS Propina,
  ISNULL(descs.TotalDescuentos, 0) AS Descuentos,
  ISNULL(corts.TotalCortesias, 0)  AS Cortesias,
  ISNULL(ot.TotalOrderTags, 0)     AS TotalOrderTags,
  ISNULL(voids.VoidCount, 0)       AS VoidCount,
  ISNULL(voids.VoidAmount, 0.0)    AS VoidAmount
FROM dbo.Tickets t
-- Pago predominante por monto
OUTER APPLY (
  SELECT TOP 1 p.PaymentTypeId
  FROM dbo.Payments p
  WHERE p.TicketId = t.Id
  GROUP BY p.PaymentTypeId
  ORDER BY SUM(p.Amount) DESC
) pay
LEFT JOIN dbo.PaymentTypes pt ON pt.Id = pay.PaymentTypeId
-- Usuario que cobró (primer pago del tipo predominante o último pago si se prefiere)
OUTER APPLY (
  SELECT TOP 1 u.Name AS CobradoPor
  FROM dbo.Payments p
  LEFT JOIN dbo.Users u ON u.Id = p.UserId
  WHERE p.TicketId = t.Id AND (pay.PaymentTypeId IS NULL OR p.PaymentTypeId = pay.PaymentTypeId)
  ORDER BY p.Date DESC
) cobr
-- Propina total
LEFT JOIN (
  SELECT c.TicketId, SUM(c.Amount) AS TotalPropina
  FROM dbo.Calculations c
  WHERE UPPER(c.Name) LIKE '%PROPINA%'
  GROUP BY c.TicketId
) prop ON prop.TicketId = t.Id
-- Descuentos totales
LEFT JOIN (
  SELECT c.TicketId, SUM(c.Amount) AS TotalDescuentos
  FROM dbo.Calculations c
  WHERE UPPER(c.Name) LIKE '%DESC%'
  GROUP BY c.TicketId
) descs ON descs.TicketId = t.Id
-- Cortesías totales
LEFT JOIN (
  SELECT c.TicketId, SUM(c.Amount) AS TotalCortesias
  FROM dbo.Calculations c
  WHERE UPPER(c.Name) LIKE '%CORTES%'
  GROUP BY c.TicketId
) corts ON corts.TicketId = t.Id
-- Total de OrderTags valuados
LEFT JOIN (
  SELECT oi.TicketId,
         SUM(
           CASE WHEN oi.OrderTags IS NOT NULL AND oi.OrderTags <> ''
                THEN TRY_CAST(JSON_VALUE(j.value, '$.PR') AS DECIMAL(10,2)) * TRY_CAST(JSON_VALUE(j.value, '$.Q') AS INT)
                ELSE 0 END
         ) AS TotalOrderTags
  FROM dbo.Orders oi
  CROSS APPLY OPENJSON(oi.OrderTags) j
  WHERE oi.OrderTags IS NOT NULL AND oi.OrderTags <> '' AND JSON_VALUE(j.value, '$.PR') IS NOT NULL
  GROUP BY oi.TicketId
) ot ON ot.TicketId = t.Id
-- Voids de órdenes
LEFT JOIN (
  SELECT o.TicketId,
         SUM(CASE WHEN o.OrderStates LIKE '%"S":"Void"%' THEN o.Price * o.Quantity ELSE 0 END) AS VoidAmount,
         SUM(CASE WHEN o.OrderStates LIKE '%"S":"Void"%' THEN 1 ELSE 0 END) AS VoidCount
  FROM dbo.Orders o
  GROUP BY o.TicketId
) voids ON voids.TicketId = t.Id
-- Cliente desde entidades (2 pasos para evitar ORDER BY con GROUP BY)
OUTER APPLY (
  SELECT TOP 1 e.Id AS ClienteId, e.Name AS ClienteNombre, e.CustomData AS ClienteCustom
  FROM dbo.TicketEntities te
  JOIN dbo.Entities      e  ON e.Id = te.EntityId
  JOIN dbo.EntityTypes   et ON et.Id = e.EntityTypeId
  WHERE te.Ticket_Id = t.Id AND (UPPER(et.Name) IN ('CLIENTES','CLIENTE'))
  ORDER BY te.Id DESC
) cli_base
OUTER APPLY (
  SELECT
    MAX(CASE WHEN JSON_VALUE(j.value,'$.Name') = 'Telefono'  THEN JSON_VALUE(j.value,'$.Value') END) AS Telefono,
    MAX(CASE WHEN JSON_VALUE(j.value,'$.Name') = 'Direccion' THEN JSON_VALUE(j.value,'$.Value') END) AS Direccion,
    MAX(CASE WHEN JSON_VALUE(j.value,'$.Name') = 'Ciudad'    THEN JSON_VALUE(j.value,'$.Value') END) AS Ciudad,
    MAX(CASE WHEN JSON_VALUE(j.value,'$.Name') = 'RFC'       THEN JSON_VALUE(j.value,'$.Value') END) AS RFC
  FROM OPENJSON(cli_base.ClienteCustom) AS j
) cli
-- Mesa desde entidades (TOP 1 por orden de asignación)
OUTER APPLY (
  SELECT TOP 1 e.Id AS MesaId, e.Name AS MesaNombre
  FROM dbo.TicketEntities te
  JOIN dbo.Entities      e  ON e.Id = te.EntityId
  JOIN dbo.EntityTypes   et ON et.Id = e.EntityTypeId
  WHERE te.Ticket_Id = t.Id AND (UPPER(et.Name) IN ('MESAS','MESA'))
  ORDER BY te.Id DESC
) mesa_base
WHERE
  t.TotalAmount > 0;
