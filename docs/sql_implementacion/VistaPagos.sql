/*
Propósito: Vista de pagos por ticket.
Una fila por pago con tipo, montos, fecha y usuario que cobró.

Entradas: dbo.Payments, dbo.PaymentTypes, dbo.Tickets, dbo.Users.
Salidas:   TicketId, TicketUid, PaymentId, PaymentTypeId, PaymentTypeName,
           Amount, TenderedAmount, Date, UserId, UserName, DepartmentId, TerminalId.

Ejemplo:
-- SELECT TOP 10 * FROM dbo.VistaPagos ORDER BY Date DESC;
*/

CREATE OR ALTER VIEW dbo.VistaPagos AS
SELECT
  p.TicketId,
  t.TicketUid,
  p.Id            AS PaymentId,
  p.PaymentTypeId,
  pt.Name         AS PaymentTypeName,
  p.Amount,
  p.TenderedAmount,
  p.Date,
  p.UserId,
  u.Name          AS UserName,
  p.DepartmentId,
  p.TerminalId
FROM dbo.Payments p
LEFT JOIN dbo.Tickets      t  ON t.Id = p.TicketId
LEFT JOIN dbo.PaymentTypes pt ON pt.Id = p.PaymentTypeId
LEFT JOIN dbo.Users        u  ON u.Id = p.UserId;

