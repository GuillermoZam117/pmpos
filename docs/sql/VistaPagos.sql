CREATE VIEW dbo.VistaPagos AS
SELECT
    p.Id AS PagoId,
    p.TicketId,
    p.Date,
    p.Amount,
    pt.Name AS MetodoPago,
    p.Name AS Usuario,
    p.Description
FROM Payments p
LEFT JOIN PaymentTypes pt ON p.PaymentTypeId = pt.Id;
