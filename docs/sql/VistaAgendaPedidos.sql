CREATE VIEW dbo.VistaAgendaPedidos AS
SELECT
    t.Id AS TicketId,
    t.TicketNumber,
    t.Date AS FechaTicket,
    t.TotalAmount,
    e.Name AS Cliente,
    t.TicketTags AS EtiquetasAgenda,
    e.CustomData AS ClienteCustomData
FROM Tickets t
LEFT JOIN TicketEntities te ON t.Id = te.Ticket_Id
LEFT JOIN Entities e ON te.EntityId = e.Id;
