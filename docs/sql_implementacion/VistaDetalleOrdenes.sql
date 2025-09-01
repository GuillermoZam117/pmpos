/*
Propósito: Vista de detalle de órdenes por ticket.
Una fila por orden con cantidades, precio, porción, tags/estados y flag de cancelación (Void).

Entradas: dbo.Orders, dbo.Tickets.
Salidas:   TicketId, TicketUid, OrderId, MenuItemId, MenuItemName, PortionName,
           Quantity, Price, PriceTag, OrderTags, OrderStates, IsVoid,
           CreatedDateTime, LastUpdateDateTime.

Ejemplo:
-- SELECT TOP 10 * FROM dbo.VistaDetalleOrdenes ORDER BY LastUpdateDateTime DESC;
*/

CREATE OR ALTER VIEW dbo.VistaDetalleOrdenes AS
SELECT
  o.TicketId,
  t.TicketUid,
  o.Id            AS OrderId,
  o.MenuItemId,
  o.MenuItemName,
  o.PortionName,
  o.Quantity,
  o.Price,
  o.PriceTag,
  o.OrderTags,
  o.OrderStates,
  CASE WHEN o.OrderStates LIKE '%"S":"Void"%' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsVoid,
  o.CreatedDateTime,
  o.LastUpdateDateTime
FROM dbo.Orders o
LEFT JOIN dbo.Tickets t ON t.Id = o.TicketId;

