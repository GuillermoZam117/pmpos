CREATE VIEW dbo.ticketsAutofactura AS
SELECT
    t.Id AS ID,
    t.TicketNumber AS numTicket,
    t.TotalAmount AS total
FROM Tickets t;
-- Nota: El SQL original puede tener más lógica, este es un ejemplo base.
